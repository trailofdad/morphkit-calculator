import { describe, expect, it } from 'vitest';
import {
  buildAlleleList,
  calculate,
  calculatorReducer,
  createCalculatorState,
  traitFromSuggestion,
  type CalculatorAction,
  type CalculatorState,
} from '../../src';
import { MINI_DICT, REAL_DICT, sel } from '../helpers';

const run = (actions: CalculatorAction[], state = createCalculatorState()): CalculatorState =>
  actions.reduce(calculatorReducer, state);

const pied = sel('Pied', 'pied_locus', 'pied', 'visual');
const yb = sel('Yellowbelly', 'yellowbelly_complex', 'yellowbelly', 'visual');
const asphalt = sel('Asphalt', 'yellowbelly_complex', 'asphalt', 'het100');

describe('calculatorReducer', () => {
  it('starts with a male sire and female dam', () => {
    const s = createCalculatorState();
    expect(s.sire.sex).toBe('Male');
    expect(s.dam.sex).toBe('Female');
  });

  it('adds a trait and ignores a duplicate', () => {
    const s = run([
      { type: 'addTrait', parent: 'sire', trait: pied },
      { type: 'addTrait', parent: 'sire', trait: pied },
    ]);
    expect(s.sire.traits).toEqual([pied]);
  });

  it('turns two alleles on one locus into a compound of single copies', () => {
    const s = run([
      { type: 'addTrait', parent: 'sire', trait: yb },
      { type: 'addTrait', parent: 'sire', trait: asphalt },
    ]);
    expect(s.sire.traits.map((t) => [t.alleleId, t.zygosity])).toEqual([
      ['yellowbelly', 'het100'],
      ['asphalt', 'het100'],
    ]);
    // A compound member's zygosity is locked.
    const after = calculatorReducer(s, {
      type: 'setZygosity',
      parent: 'sire',
      index: 0,
      zygosity: 'visual',
    });
    expect(after).toBe(s);
  });

  it('ignores a third allele on one locus', () => {
    const s = run([
      { type: 'addTrait', parent: 'sire', trait: yb },
      { type: 'addTrait', parent: 'sire', trait: asphalt },
      {
        type: 'addTrait',
        parent: 'sire',
        trait: sel('Spark', 'yellowbelly_complex', 'spark', 'het100'),
      },
    ]);
    expect(s.sire.traits).toHaveLength(2);
  });

  it('edits zygosity, carrier probability and sex linkage by index', () => {
    const s = run([
      { type: 'addTrait', parent: 'dam', trait: pied },
      { type: 'setZygosity', parent: 'dam', index: 0, zygosity: 'het50' },
      { type: 'setCarrierProbability', parent: 'dam', index: 0, probability: 1.5 },
    ]);
    expect(s.dam.traits[0]).toMatchObject({ zygosity: 'het50', carrierProbability: 1 });

    const b = run([
      {
        type: 'addTrait',
        parent: 'sire',
        trait: sel('Banana', 'banana_locus', 'banana', 'het100'),
      },
      { type: 'setSexLinkage', parent: 'sire', index: 0, sexLinkage: 'female-maker' },
    ]);
    expect(b.sire.traits[0]!.sexLinkage).toBe('female-maker');
  });

  it('loads a parent with unresolved ids, and clears them on the next edit', () => {
    const loaded = run([{ type: 'loadParent', parent: 'sire', traits: [pied], unresolved: ['x'] }]);
    expect(loaded.unresolved.sire).toEqual(['x']);
    const edited = calculatorReducer(loaded, { type: 'removeTrait', parent: 'sire', index: 0 });
    expect(edited.sire.traits).toEqual([]);
    expect(edited.unresolved.sire).toEqual([]);
  });

  it('swaps traits between parents but keeps each sex', () => {
    const s = run([{ type: 'addTrait', parent: 'sire', trait: pied }, { type: 'swapParents' }]);
    expect(s.sire).toEqual({ sex: 'Male', traits: [] });
    expect(s.dam).toEqual({ sex: 'Female', traits: [pied] });
  });

  it('reset and clearParent empty the state', () => {
    const s = run([{ type: 'addTrait', parent: 'sire', trait: pied }]);
    expect(calculatorReducer(s, { type: 'clearParent', parent: 'sire' }).sire.traits).toEqual([]);
    expect(calculatorReducer(s, { type: 'reset' })).toEqual(createCalculatorState());
  });

  it('builds a trait from a suggestion at its default zygosity', () => {
    const pastel = buildAlleleList(MINI_DICT).find((s) => s.alleleId === 'pastel')!;
    expect(traitFromSuggestion(pastel)).toEqual({
      name: 'Pastel',
      locusId: 'pastel_locus',
      alleleId: 'pastel',
      zygosity: 'het100',
    });
  });
});

describe('calculate', () => {
  it('is idle with no traits', () => {
    expect(calculate(createCalculatorState(), MINI_DICT)).toEqual({ status: 'idle' });
  });

  it('returns folded outcomes', () => {
    const result = calculate(createCalculatorState({ sire: [pied] }), MINI_DICT);
    expect(result.status).toBe('ok');
    if (result.status === 'ok') expect(result.outcomes).toHaveLength(1);
  });

  it('returns an error instead of throwing on bad input', () => {
    const result = calculate(
      createCalculatorState({ sire: [sel('Ghost', 'no_such_locus', 'ghost', 'visual')] }),
      REAL_DICT,
    );
    expect(result.status).toBe('error');
  });
});
