import type {
  AggregatedOutcome,
  GenotypeOutcome,
  LocusInput,
  MorphkitCalculationOutput,
  MorphkitDictionary,
} from '@trailofdad/morphkit';
import { aggregateByPhenotype, calculateMorphs } from '@trailofdad/morphkit';
import { selectionsToGenotype } from './selection';
import type { FoldedOutcome, ParentSex, ParentState } from './types';

/** A pairing parent reduced to the engine's inputs: a sex and explicit loci. */
export interface PairingParent {
  sex: ParentSex;
  genotype: readonly LocusInput[];
}

const SEX_TO_ENGINE = { Male: 'male', Female: 'female' } as const;

/**
 * Run a pairing through morphkit with explicit, unambiguous genotypes. Throws
 * morphkit's typed errors on invalid input. Use this directly when you already
 * hold `LocusInput[]` (e.g. a genotype carried forward from a planned outcome).
 */
export function calcPairing(
  sire: PairingParent,
  dam: PairingParent,
  dict: MorphkitDictionary,
): MorphkitCalculationOutput {
  return calculateMorphs(
    {
      sire: { id: 'sire', sex: SEX_TO_ENGINE[sire.sex], polygenics: [], genotype: sire.genotype },
      dam: { id: 'dam', sex: SEX_TO_ENGINE[dam.sex], polygenics: [], genotype: dam.genotype },
    },
    dict,
  );
}

/** Run a pairing from calculator parent state (sex + selected traits). */
export function runPairing(
  sire: ParentState,
  dam: ParentState,
  dict: MorphkitDictionary,
): MorphkitCalculationOutput {
  return calcPairing(
    { sex: sire.sex, genotype: selectionsToGenotype(sire.traits) },
    { sex: dam.sex, genotype: selectionsToGenotype(dam.traits) },
    dict,
  );
}

/**
 * Stable key for a folded outcome: its sorted visual phenotype names plus sex.
 * Persist it to flag an outcome (a project goal, a branch target) and re-match
 * it after the pairing is recomputed.
 */
export function foldKey(o: { phenotypeNames: readonly string[]; sex?: string }): string {
  return `${[...o.phenotypeNames].sort().join('|')}~${o.sex ?? ''}`;
}

/**
 * Collapse per-genotype outcomes into one row per visual phenotype, each tagged
 * with its {@link foldKey}. Grouping and conditional possible-het maths are
 * morphkit's `aggregateByPhenotype`; rows arrive most-visual first, then by
 * descending probability.
 */
export function foldOutcomes(outcomes: readonly AggregatedOutcome[]): FoldedOutcome[] {
  return aggregateByPhenotype(outcomes).map((o) => ({ ...o, key: foldKey(o) }));
}

/** Fold an engine result into per-phenotype rows, sorted for display. */
export function foldAndSortOutcomes(output: MorphkitCalculationOutput): FoldedOutcome[] {
  return foldOutcomes(output.outcomes);
}

function mutantAlleleCount(genotype: GenotypeOutcome): number {
  let n = 0;
  for (const locus of genotype.loci) {
    for (const allele of locus.alleles) {
      if (allele.toLowerCase() !== 'normal') n++;
    }
  }
  return n;
}

/**
 * Resolve a folded outcome back to one explicit genotype, so it can become a
 * parent in a follow-on pairing. A folded row groups genotypes that differ only
 * in hidden carrier state; we pick the one carrying the most mutant alleles —
 * every possible het present, the best case a breeder plans toward.
 *
 * Returns `null` if the key no longer matches any outcome (e.g. a parent's
 * genetics changed), so the caller can surface a stale flag.
 */
export function resolveTargetGenotype(
  output: MorphkitCalculationOutput,
  key: string,
): LocusInput[] | null {
  const members = output.outcomes.filter((o) => foldKey(o) === key);
  if (members.length === 0) return null;
  const best = members.reduce((a, b) =>
    mutantAlleleCount(b.genotype) > mutantAlleleCount(a.genotype) ? b : a,
  );
  return best.genotype.loci.map((l) => ({ locusId: l.locusId, alleles: [...l.alleles] }));
}
