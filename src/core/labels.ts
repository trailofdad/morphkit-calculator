import type { LocusInput, MorphkitDictionary } from '@trailofdad/morphkit';
import { dictIndex, getInheritanceById, isNormalAllele } from './dictionary';
import { getZygosity } from './zygosity';

/**
 * Possible-het percentage for display, using the hobby convention of
 * **truncating** rather than rounding: het × het gives a 2/3 carrier chance that
 * everyone writes as "66% Het", never 67%.
 */
export function possHetPercent(probability: number): number {
  return Math.floor(probability * 100);
}

/** The short tag shown on a morph chip. */
export type MorphTag = 'HET' | '66%' | 'SUPER';

/**
 * The short tag for a locus ("HET", "66%", "SUPER"), or `null` for none. What a
 * single mutant copy means depends on inheritance:
 *
 * - **recessive** (or unknown): one copy is a non-expressed carrier → `HET`;
 *   a possible carrier → `66%`.
 * - **incomplete_dominant**: one copy already shows (no tag); two is `SUPER`.
 * - **dominant / polygenic**: one copy shows and there is no super → no tag.
 *
 * A compound (two *different* mutants, e.g. Yellowbelly + Asphalt) is never
 * tagged: it is one copy of each, not a Super.
 */
export function morphTag(locus: LocusInput, inheritance: string | undefined): MorphTag | null {
  const distinctMutants = new Set(locus.alleles.filter((a) => !isNormalAllele(a)));
  if (distinctMutants.size > 1) return null;
  const zyg = getZygosity(locus);
  switch (inheritance) {
    case 'incomplete_dominant':
      return zyg === 'visual' ? 'SUPER' : null;
    case 'dominant':
    case 'polygenic':
      return null;
    default:
      return zyg === 'het100' ? 'HET' : zyg === 'het50' ? '66%' : null;
  }
}

/**
 * Whether a locus is a non-expressed het carrier rather than a visual trait —
 * exactly the cases {@link morphTag} tags "HET" or "66%".
 */
export function isHetTrait(locus: LocusInput, dict: MorphkitDictionary | null): boolean {
  const inheritance = dict ? getInheritanceById(locus.locusId, dict) : undefined;
  const tag = morphTag(locus, inheritance);
  return tag === 'HET' || tag === '66%';
}

/**
 * Display label for a locus: the mutant allele's name, or for a compound (two
 * distinct mutants at one locus) the single-locus market combo name when one
 * matches (e.g. "Freeway"), else the mutant names joined. "Normal" when the
 * locus carries no mutant.
 */
export function traitLabel(locus: LocusInput, dict: MorphkitDictionary): string {
  const index = dictIndex(dict);
  const mutants = [...new Set(locus.alleles.filter((a) => !isNormalAllele(a)))];
  if (mutants.length === 0) return 'Normal';
  const names = mutants.map((id) => index.getAlleleName(locus.locusId, id) ?? id);
  if (names.length === 1) return names[0]!;
  for (const combo of dict.combos) {
    const req = combo.requiredGenotype[locus.locusId];
    if (
      req &&
      Object.keys(combo.requiredGenotype).length === 1 &&
      req.every((a) => mutants.includes(a)) &&
      mutants.every((m) => req.includes(m))
    ) {
      return combo.marketName;
    }
  }
  return names.join(' ');
}

/**
 * If `name` is a registered market combo, a short description of what it is
 * made of: "Ivory" → "Super Yellowbelly", "Freeway" → "Yellowbelly + Asphalt".
 * `null` for a plain trait name. Matches marketName, aliases and shortNames.
 */
export function describeCombo(name: string, dict: MorphkitDictionary): string | null {
  const parts = comboParts(name, dict);
  if (!parts) return null;
  return parts.join(' + ') || null;
}

/**
 * If `name` is a registered market combo, the trait names it decomposes into:
 * "Grail" → ["Lavender Albino", "Clown"], "Ivory" → ["Super Yellowbelly"].
 * `null` for a plain trait name. Matches marketName, aliases and shortNames.
 */
export function comboParts(name: string, dict: MorphkitDictionary): string[] | null {
  const n = name.toLowerCase();
  const combo = dict.combos.find(
    (c) =>
      c.marketName.toLowerCase() === n ||
      (c.aliases ?? []).some((a) => a.toLowerCase() === n) ||
      (c.shortNames ?? []).some((s) => s.toLowerCase() === n),
  );
  if (!combo) return null;

  const parts: string[] = [];
  for (const [locusId, [a, b]] of Object.entries(combo.requiredGenotype)) {
    const nameOf = (x: string): string => dict.loci[locusId]?.alleles[x]?.name ?? x;
    if (!isNormalAllele(a) && a === b) {
      // Homozygous mutant: the incomplete-dominant "Super", else the visual.
      const inheritance = dict.loci[locusId]?.inheritance;
      parts.push(inheritance === 'incomplete_dominant' ? `Super ${nameOf(a)}` : nameOf(a));
    } else if (!isNormalAllele(a) && !isNormalAllele(b)) {
      parts.push(`${nameOf(a)} + ${nameOf(b)}`);
    } else {
      parts.push(isNormalAllele(a) ? nameOf(b) : nameOf(a));
    }
  }
  return parts;
}

export interface ShortName {
  short: string;
  /** True when the dictionary has no short name and one was derived. */
  isFallback: boolean;
}

/** Short tub-tag label for a locus (resolves the allele name first). */
export function resolveShortNameForLocus(
  locus: LocusInput,
  dict: MorphkitDictionary | null,
): ShortName {
  return resolveShortName(dict ? traitLabel(locus, dict) : locus.locusId, dict);
}

/**
 * A morph's short name for a generated ID. Prefers the dictionary's
 * `shortNames[0]`; otherwise derives one and flags it via `isFallback`.
 */
export function resolveShortName(alleleName: string, dict: MorphkitDictionary | null): ShortName {
  const allele = dict ? findAllele(alleleName, dict) : undefined;
  const dictShort = allele?.shortNames?.[0];
  if (dictShort) return { short: dictShort, isFallback: false };
  return { short: fallbackShortName(alleleName), isFallback: true };
}

function findAllele(name: string, dict: MorphkitDictionary): ReturnType<typeof getAllele> {
  const hit = dictIndex(dict).resolveNameUnique(name);
  return hit ? getAllele(dict, hit.locusId, hit.alleleId) : undefined;
}

function getAllele(
  dict: MorphkitDictionary,
  locusId: string,
  alleleId: string,
): MorphkitDictionary['loci'][string]['alleles'][string] | undefined {
  return dict.loci[locusId]?.alleles[alleleId];
}

/**
 * Derive a tub-tag abbreviation when the dictionary ships none: multi-word
 * names → initials ("Orange Dream" → "OD"); one word → first three letters
 * ("Clown" → "CLO").
 */
function fallbackShortName(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  if (words.length > 1) return words.map((w) => w[0]!.toUpperCase()).join('');
  return words[0]!.slice(0, 3).toUpperCase();
}

/** Presentation class for a trait, used to colour chips by inheritance. */
export type InheritanceClass = 'recessive' | 'incomplete_dominant' | 'dominant' | 'unknown';

/**
 * Collapse morphkit's inheritance into a presentation class. `dominant` and
 * `polygenic` share one (one copy shows, nothing to double up). `undefined`
 * (not in the dictionary) is `unknown`, deliberately not folded into recessive.
 */
export function inheritanceClass(inheritance: string | undefined): InheritanceClass {
  switch (inheritance) {
    case 'recessive':
      return 'recessive';
    case 'incomplete_dominant':
      return 'incomplete_dominant';
    case 'dominant':
    case 'polygenic':
      return 'dominant';
    default:
      return 'unknown';
  }
}
