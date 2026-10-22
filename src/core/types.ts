import type { PhenotypeOutcome } from '@trailofdad/morphkit';

/**
 * How many copies of an allele a selected trait carries.
 *  - `visual`: two copies (a visual recessive, or an incomplete-dominant Super).
 *  - `het100`: one definite (proven) copy.
 *  - `het50`: a possible (unproven) carrier. Named for history; the carrier
 *    probability defaults to 66% and can be set per trait.
 */
export type Zygosity = 'visual' | 'het100' | 'het50';

/** Parent sex as the calculator presents it. */
export type ParentSex = 'Male' | 'Female';

/**
 * Which sex chromosome a male's single sex-linked mutant rides (Banana / Coral
 * Glow). A male-maker carries it on the Y, a female-maker on the X. Ignored for
 * females and for autosomal loci.
 */
export type SexLinkage = 'male-maker' | 'female-maker';

/** One trait selected for a parent, carrying the dictionary identity. */
export interface SelectionTrait {
  /** Allele display name, for the UI only. */
  name: string;
  /** Dictionary locus key (`LocusInput.locusId`). */
  locusId: string;
  /** Dictionary allele key. */
  alleleId: string;
  zygosity: Zygosity;
  /**
   * Carrier probability for a `het50` trait, 0–1. Defaults to
   * {@link DEFAULT_POS_HET_PROBABILITY}.
   */
  carrierProbability?: number;
  /** Sex-linked loci on a male only. Omitted means male-maker (morphkit's default). */
  sexLinkage?: SexLinkage;
}

/** A calculator parent: a fixed sex plus its selected traits. */
export interface ParentState {
  sex: ParentSex;
  traits: SelectionTrait[];
}

/**
 * One visual phenotype, with every genotype that produces it collapsed in. This
 * is morphkit's {@link PhenotypeOutcome} plus a stable `key` (see `foldKey`) so a
 * flagged outcome can be persisted and re-matched after recalculation.
 */
export type FoldedOutcome = PhenotypeOutcome & {
  key: string;
};
