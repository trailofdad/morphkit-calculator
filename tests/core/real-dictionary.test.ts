// End-to-end pairings against the pinned real dictionary: allelic groups,
// combos, sex linkage and lethals.
import { describe, expect, it } from 'vitest';
import {
  foldAndSortOutcomes,
  fromLocusInputs,
  runPairing,
  selectionsToGenotype,
  traitLabel,
} from '../../src';
import { REAL_DICT as DICT, female, male, rows, sel } from '../helpers';

const yb = sel('Yellowbelly', 'yellowbelly_complex', 'yellowbelly', 'het100');
const asphalt = sel('Asphalt', 'yellowbelly_complex', 'asphalt', 'het100');

describe('allelic groups (one locus, several alleles)', () => {
  it('merges two picks on one locus into a single compound genotype', () => {
    expect(selectionsToGenotype([yb, asphalt])).toEqual([
      { locusId: 'yellowbelly_complex', alleles: ['yellowbelly', 'asphalt'] },
    ]);
  });

  it('rejects a third allele on one locus', () => {
    const spark = sel('Spark', 'yellowbelly_complex', 'spark', 'het100');
    expect(() => selectionsToGenotype([yb, asphalt, spark])).toThrow(RangeError);
  });

  it('Freeway × Yellowbelly → Ivory, Freeway, Yellowbelly, Asphalt at 25% each', () => {
    const outcomes = foldAndSortOutcomes(runPairing(male([yb, asphalt]), female([yb]), DICT));
    expect(rows(outcomes).sort()).toEqual(
      ['Asphalt 25%', 'Freeway 25%', 'Ivory 25%', 'Yellowbelly 25%'].sort(),
    );
  });

  it('a stored Freeway animal loads and pairs as a compound', () => {
    const { selections } = fromLocusInputs(
      [{ locusId: 'yellowbelly_complex', alleles: ['yellowbelly', 'asphalt'] }],
      DICT,
    );
    const outcomes = foldAndSortOutcomes(runPairing(male(selections), female([]), DICT));
    expect(rows(outcomes).sort()).toEqual(['Asphalt 50%', 'Yellowbelly 50%']);
  });

  it('Lesser × Mojave → 25% Blue-Eyed Leucistic', () => {
    const outcomes = foldAndSortOutcomes(
      runPairing(
        male([sel('Lesser', 'blue_eyed_lucy_complex', 'lesser', 'het100')]),
        female([sel('Mojave', 'blue_eyed_lucy_complex', 'mojave', 'het100')]),
        DICT,
      ),
    );
    expect(rows(outcomes)).toContain('Blue-Eyed Leucistic 25%');
  });

  it('labels a compound locus by its combo name', () => {
    expect(
      traitLabel({ locusId: 'yellowbelly_complex', alleles: ['yellowbelly', 'asphalt'] }, DICT),
    ).toBe('Freeway');
  });
});

describe('multi-locus combos', () => {
  it('Pastel × Spider → 25% Bumblebee', () => {
    const outcomes = foldAndSortOutcomes(
      runPairing(
        male([sel('Pastel', 'pastel_locus', 'pastel', 'het100')]),
        female([sel('Spider', 'spider_complex', 'spider', 'het100')]),
        DICT,
      ),
    );
    expect(rows(outcomes).sort()).toEqual(
      ['Bumblebee 25%', 'Normal 25%', 'Pastel 25%', 'Spider 25%'].sort(),
    );
  });
});

describe('lethal combos', () => {
  it('Spider × Spider flags the 25% Super Spider as lethal', () => {
    const output = runPairing(
      male([sel('Spider', 'spider_complex', 'spider', 'het100')]),
      female([sel('Spider', 'spider_complex', 'spider', 'het100')]),
      DICT,
    );
    const lethal = foldAndSortOutcomes(output).filter((o) => o.isLethal);
    expect(lethal).toHaveLength(1);
    expect(lethal[0]!.percentageProbability).toBe('25%');
  });
});

describe('sex-linked Banana', () => {
  const banana = sel('Banana', 'banana_locus', 'banana', 'het100');

  it('a male defaults to male-maker: Banana sons, Normal daughters', () => {
    const outcomes = foldAndSortOutcomes(runPairing(male([banana]), female([]), DICT));
    expect(rows(outcomes)).toEqual(
      expect.arrayContaining([expect.stringMatching(/^Banana.*\/male 50%$/), 'Normal/female 50%']),
    );
  });

  it('a female-maker male gives Banana daughters, Normal sons', () => {
    const outcomes = foldAndSortOutcomes(
      runPairing(male([{ ...banana, sexLinkage: 'female-maker' }]), female([]), DICT),
    );
    expect(rows(outcomes)).toEqual(
      expect.arrayContaining([expect.stringMatching(/^Banana.*\/female 50%$/), 'Normal/male 50%']),
    );
  });

  it('round-trips the sex linkage through stored genetics', () => {
    const { selections } = fromLocusInputs(
      [{ locusId: 'banana_locus', alleles: ['normal', 'banana'], sexChromosomes: ['Y', 'X'] }],
      DICT,
    );
    expect(selections).toEqual([
      { ...banana, name: selections[0]!.name, sexLinkage: 'female-maker' },
    ]);
  });
});
