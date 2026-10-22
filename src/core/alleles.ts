import type { MorphkitDictionary } from '@trailofdad/morphkit';

/** One pickable mutant allele, flattened out of the dictionary for search. */
export interface AlleleSuggestion {
  name: string;
  locusName: string;
  inheritance: string;
  /** Dictionary locus key (e.g. "pastel_locus"), the engine's `LocusInput.locusId`. */
  locusId: string;
  /** Dictionary allele key (e.g. "pastel"), the engine's allele token. */
  alleleId: string;
  isSexLinked: boolean;
}

/** Every non-normal allele in the dictionary, in dictionary order. */
export function buildAlleleList(dict: MorphkitDictionary): AlleleSuggestion[] {
  return Object.entries(dict.loci).flatMap(([locusId, locus]) =>
    Object.entries(locus.alleles)
      .filter(([id]) => id !== 'normal')
      .map(([alleleId, allele]) => ({
        name: allele.name,
        locusName: locus.name,
        inheritance: locus.inheritance,
        locusId,
        alleleId,
        isSexLinked: locus.isSexLinked,
      })),
  );
}
