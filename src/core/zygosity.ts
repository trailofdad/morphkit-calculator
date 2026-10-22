import type { LocusInput } from '@trailofdad/morphkit';
import { isNormalAllele } from './dictionary';
import type { Zygosity } from './types';

/**
 * Classify a locus's carrier state.
 *
 * An explicit morphkit `zygosity` wins: `'het'` (proven) → het100 and
 * `'pos_het'` (possible) → het50. Without it we fall back to the `Normal`-allele
 * count: 0 normals with two copies → visual; 1 normal (or a lone mutant) →
 * het100; 2 normals (the legacy `["Normal","Normal"]` possible-het encoding) →
 * het50.
 */
export function getZygosity(locus: LocusInput): Zygosity {
  if (locus.zygosity === 'pos_het') return 'het50';
  if (locus.zygosity === 'het') return 'het100';
  const mutants = locus.alleles.filter((a) => !isNormalAllele(a)).length;
  const normals = locus.alleles.length - mutants;
  if (normals === 0) return mutants >= 2 ? 'visual' : 'het100';
  if (normals === 1) return 'het100';
  return 'het50';
}

export interface ZygosityOption {
  value: Zygosity;
  label: string;
}

const RECESSIVE_OPTIONS: readonly ZygosityOption[] = [
  { value: 'visual', label: 'Visual' },
  { value: 'het100', label: 'Het' },
  { value: 'het50', label: '66%' },
];

const INCOMPLETE_DOMINANT_OPTIONS: readonly ZygosityOption[] = [
  { value: 'het100', label: 'Single' },
  { value: 'visual', label: 'Super' },
];

/**
 * The zygosity choices offered for a trait, by inheritance. Returns `null` when
 * zygosity is not selectable (dominant / polygenic — always expressed).
 * Incomplete-dominant swaps the labels to Single / Super.
 */
export function getZygOptions(inheritance: string | undefined): readonly ZygosityOption[] | null {
  switch (inheritance) {
    case 'incomplete_dominant':
      return INCOMPLETE_DOMINANT_OPTIONS;
    case 'dominant':
    case 'polygenic':
      return null;
    default:
      return RECESSIVE_OPTIONS;
  }
}

/** The zygosity a freshly added trait starts at, by inheritance. */
export function defaultZygosity(inheritance: string | undefined): Zygosity {
  if (
    inheritance === 'incomplete_dominant' ||
    inheritance === 'dominant' ||
    inheritance === 'polygenic'
  ) {
    return 'het100';
  }
  return 'visual';
}
