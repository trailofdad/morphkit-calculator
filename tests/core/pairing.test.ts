// Ported from morph-ranch src/lib/genetics-calc.test.ts.
import { describe, expect, it } from 'vitest';
import {
  foldKey,
  foldOutcomes,
  fromLocusInputs,
  possHetPercent,
  resolveTargetGenotype,
  runPairing,
  selectionToLocusInput,
  type SelectionTrait,
} from '../../src';
import { MINI_DICT as DICT, female, male, sel } from '../helpers';

describe('selectionToLocusInput', () => {
  it('maps visual → homozygous, het100 → definite het, het50 → pos_het', () => {
    expect(selectionToLocusInput(sel('Pastel', 'pastel_locus', 'pastel', 'visual'))).toEqual({
      locusId: 'pastel_locus',
      alleles: ['pastel', 'pastel'],
    });
    expect(selectionToLocusInput(sel('Pastel', 'pastel_locus', 'pastel', 'het100'))).toEqual({
      locusId: 'pastel_locus',
      alleles: ['pastel', 'normal'],
    });
    expect(selectionToLocusInput(sel('Pied', 'pied_locus', 'pied', 'het50'))).toEqual({
      locusId: 'pied_locus',
      alleles: ['pied'],
      zygosity: 'pos_het',
      carrierProbability: 0.66,
    });
  });
});

describe('fromLocusInputs', () => {
  it('reads canonical genetics into selections with zygosity + display name', () => {
    const { selections, unresolved } = fromLocusInputs(
      [
        { locusId: 'pastel_locus', alleles: ['pastel', 'normal'] },
        { locusId: 'pied_locus', alleles: ['pied', 'pied'] },
      ],
      DICT,
    );
    expect(selections).toEqual([
      { name: 'Pastel', locusId: 'pastel_locus', alleleId: 'pastel', zygosity: 'het100' },
      { name: 'Pied', locusId: 'pied_locus', alleleId: 'pied', zygosity: 'visual' },
    ]);
    expect(unresolved).toEqual([]);
  });

  it('loads a stored 66% poss-het as a het50 selection', () => {
    const { selections } = fromLocusInputs(
      [{ locusId: 'pied_locus', alleles: ['pied'], zygosity: 'pos_het', carrierProbability: 0.66 }],
      DICT,
    );
    expect(selections).toEqual([
      { name: 'Pied', locusId: 'pied_locus', alleleId: 'pied', zygosity: 'het50' },
    ]);
  });

  it('reports ids not present in the dictionary', () => {
    const { selections, unresolved } = fromLocusInputs(
      [{ locusId: 'Clown', alleles: ['Clown', 'Clown'] }],
      DICT,
    );
    expect(selections).toEqual([]);
    expect(unresolved).toEqual(['Clown']);
  });
});

describe('runPairing', () => {
  it('Super Pastel × Normal → 100% Pastel', () => {
    const output = runPairing(
      male([sel('Pastel', 'pastel_locus', 'pastel', 'visual')]),
      female([]),
      DICT,
    );
    expect(output.outcomes).toHaveLength(1);
    expect(output.outcomes[0]!.phenotypeNames).toContain('Pastel');
    expect(output.outcomes[0]!.percentageProbability).toBe('100%');
  });

  it('Het Pied × Het Pied → visual 25% and a 66% (not 67%) poss-het', () => {
    const output = runPairing(
      male([sel('Pied', 'pied_locus', 'pied', 'het100')]),
      female([sel('Pied', 'pied_locus', 'pied', 'het100')]),
      DICT,
    );
    const visualPied = output.outcomes.find((o) => o.phenotypeNames.includes('Pied'));
    expect(visualPied?.percentageProbability).toBe('25%');

    const possHet = output.outcomes.find((o) => o.possibleHets.length > 0);
    expect(possHet?.percentageProbability).toBe('50%');
    expect(possHetPercent(possHet?.possibleHets[0]?.probability ?? 0)).toBe(66);
  });

  it('Het Pied × Normal → single het reads as 50% poss-het', () => {
    const output = runPairing(
      male([sel('Pied', 'pied_locus', 'pied', 'het100')]),
      female([]),
      DICT,
    );
    const possHet = output.outcomes.find((o) => o.possibleHets.length > 0);
    expect(possHetPercent(possHet?.possibleHets[0]?.probability ?? 0)).toBe(50);
  });

  it('66% (pos_het) Pied × Normal → reduced ~33% offspring poss-het (not 50%)', () => {
    const output = runPairing(male([sel('Pied', 'pied_locus', 'pied', 'het50')]), female([]), DICT);
    const possHet = output.outcomes.find((o) => o.possibleHets.length > 0);
    expect(possHetPercent(possHet?.possibleHets[0]?.probability ?? 0)).toBe(33);
  });

  it('honours a custom carrier probability (50% poss-het × Normal → 25%)', () => {
    const output = runPairing(
      male([sel('Pied', 'pied_locus', 'pied', 'het50', { carrierProbability: 0.5 })]),
      female([]),
      DICT,
    );
    const possHet = output.outcomes.find((o) => o.possibleHets.length > 0);
    expect(possHetPercent(possHet?.possibleHets[0]?.probability ?? 0)).toBe(25);
  });
});

describe('foldOutcomes', () => {
  it('collapses a het × het cross to one Normal row with a single 66% het', () => {
    const output = runPairing(
      male([sel('Pied', 'pied_locus', 'pied', 'het100')]),
      female([sel('Pied', 'pied_locus', 'pied', 'het100')]),
      DICT,
    );
    const folded = foldOutcomes(output.outcomes);
    expect(folded).toHaveLength(2);

    const visualPied = folded.find((f) => f.phenotypeNames.includes('Pied'))!;
    expect(visualPied.percentageProbability).toBe('25%');

    const normal = folded.find((f) => f.phenotypeNames.length === 0)!;
    expect(normal.percentageProbability).toBe('75%');
    expect(normal.possibleHets).toHaveLength(1);
    expect(possHetPercent(normal.possibleHets[0]!.probability)).toBe(66);
  });

  it('folds a two-recessive cross to 4 visual rows, each het once at 66%', () => {
    const dihet: SelectionTrait[] = [
      sel('Pied', 'pied_locus', 'pied', 'het100'),
      sel('Albino', 'albino_locus', 'albino', 'het100'),
    ];
    const output = runPairing(male(dihet), female(dihet), DICT);
    const folded = foldOutcomes(output.outcomes);

    expect(folded.length).toBeLessThan(output.outcomes.length);
    expect(folded).toHaveLength(4);

    const normal = folded.find((f) => f.phenotypeNames.length === 0)!;
    expect(normal.possibleHets).toHaveLength(2);
    expect(normal.possibleHets.map((h) => possHetPercent(h.probability))).toEqual([66, 66]);
  });
});

describe('possHetPercent', () => {
  it('truncates rather than rounds', () => {
    expect(possHetPercent(2 / 3)).toBe(66);
    expect(possHetPercent(0.5)).toBe(50);
    expect(possHetPercent(1)).toBe(100);
  });
});

describe('foldKey', () => {
  it('is order-independent on phenotype names and distinguishes sex', () => {
    expect(foldKey({ phenotypeNames: ['Pastel', 'Clown'] })).toBe(
      foldKey({ phenotypeNames: ['Clown', 'Pastel'] }),
    );
    expect(foldKey({ phenotypeNames: ['Pastel'], sex: 'male' })).not.toBe(
      foldKey({ phenotypeNames: ['Pastel'], sex: 'female' }),
    );
  });

  it('matches the key foldOutcomes assigns to each row', () => {
    const output = runPairing(
      male([sel('Pastel', 'pastel_locus', 'pastel', 'visual')]),
      female([]),
      DICT,
    );
    for (const f of foldOutcomes(output.outcomes)) {
      expect(f.key).toBe(foldKey({ phenotypeNames: f.phenotypeNames }));
    }
  });
});

describe('resolveTargetGenotype', () => {
  it('returns null when no outcome matches the key (stale flag)', () => {
    const output = runPairing(male([]), female([]), DICT);
    expect(resolveTargetGenotype(output, 'Nope~')).toBeNull();
  });

  it('carries every possible-het forward (optimistic) for a folded group', () => {
    const dihet: SelectionTrait[] = [
      sel('Pied', 'pied_locus', 'pied', 'het100'),
      sel('Albino', 'albino_locus', 'albino', 'het100'),
    ];
    const output = runPairing(male(dihet), female(dihet), DICT);
    const normal = foldOutcomes(output.outcomes).find((f) => f.phenotypeNames.length === 0)!;

    const genotype = resolveTargetGenotype(output, normal.key);
    expect(genotype).not.toBeNull();
    const mutant = genotype!
      .flatMap((l) => l.alleles)
      .filter((a) => a.toLowerCase() !== 'normal')
      .sort();
    expect(mutant).toEqual(['albino', 'pied']);
  });
});
