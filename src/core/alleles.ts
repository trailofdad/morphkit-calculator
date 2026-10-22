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
  /** Other names breeders use for this allele. */
  aliases: readonly string[];
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
        aliases: allele.aliases ?? [],
      })),
  );
}

/**
 * Rank how well an allele matches a lower-cased query, lower is better, or
 * `null` for no match: name prefix, then name substring, then an alias, then
 * the locus name (so "piebald" finds Pied and "yellowbelly" lists the whole
 * Yellowbelly complex after Yellowbelly itself).
 */
function matchRank(s: AlleleSuggestion, q: string): number | null {
  const name = s.name.toLowerCase();
  if (name.startsWith(q)) return 0;
  if (name.includes(q)) return 1;
  if (s.aliases.some((a) => a.toLowerCase().includes(q))) return 2;
  if (s.locusName.toLowerCase().includes(q)) return 3;
  return null;
}

export interface SearchAllelesOptions {
  /** Leave out alleles this returns true for (e.g. already selected). */
  exclude?: (s: AlleleSuggestion) => boolean;
  limit?: number;
}

/** Alleles matching `query`, best first; dictionary order breaks ties. Empty query → none. */
export function searchAlleles(
  suggestions: readonly AlleleSuggestion[],
  query: string,
  { exclude, limit = Infinity }: SearchAllelesOptions = {},
): AlleleSuggestion[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const ranked: { s: AlleleSuggestion; rank: number; i: number }[] = [];
  suggestions.forEach((s, i) => {
    if (exclude?.(s)) return;
    const rank = matchRank(s, q);
    if (rank !== null) ranked.push({ s, rank, i });
  });
  ranked.sort((a, b) => a.rank - b.rank || a.i - b.i);
  return ranked.slice(0, limit).map((r) => r.s);
}
