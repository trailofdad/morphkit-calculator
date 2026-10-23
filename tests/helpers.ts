import type { MorphkitDictionary } from '@trailofdad/morphkit';
import type { ParentState, SelectionTrait } from '../src';
import realDictionary from './fixtures/dictionary.v4.1.0.json';

/**
 * The real morphkit-dictionary v4.1.0, pinned so results never change under the
 * tests. Refresh deliberately alongside DEFAULT_DICTIONARY_VERSION.
 */
export const REAL_DICT = realDictionary as unknown as MorphkitDictionary;

/**
 * Minimal dictionary: one incomplete-dominant locus (Pastel) and two recessives
 * (Piebald, Albino). Enough to pin the maths without the full dictionary.
 */
export const MINI_DICT = {
  version: 'test',
  lastUpdated: '',
  loci: {
    pastel_locus: {
      id: 'pastel_locus',
      name: 'Pastel',
      inheritance: 'incomplete_dominant',
      isSexLinked: false,
      alleles: {
        normal: { id: 'normal', name: 'Normal' },
        pastel: { id: 'pastel', name: 'Pastel' },
      },
    },
    pied_locus: {
      id: 'pied_locus',
      name: 'Piebald',
      inheritance: 'recessive',
      isSexLinked: false,
      alleles: {
        normal: { id: 'normal', name: 'Normal' },
        pied: { id: 'pied', name: 'Pied' },
      },
    },
    albino_locus: {
      id: 'albino_locus',
      name: 'Albino',
      inheritance: 'recessive',
      isSexLinked: false,
      alleles: {
        normal: { id: 'normal', name: 'Normal' },
        albino: { id: 'albino', name: 'Albino' },
      },
    },
  },
  combos: [],
  lethalCombos: [],
  polygenicTags: [],
} as unknown as MorphkitDictionary;

export const sel = (
  name: string,
  locusId: string,
  alleleId: string,
  zygosity: SelectionTrait['zygosity'],
  extra: Partial<SelectionTrait> = {},
): SelectionTrait => ({ name, locusId, alleleId, zygosity, ...extra });

export const male = (traits: SelectionTrait[]): ParentState => ({ sex: 'Male', traits });
export const female = (traits: SelectionTrait[]): ParentState => ({ sex: 'Female', traits });

/** "Name[/sex] NN%" per folded row, for compact assertions. */
export const rows = (
  outcomes: readonly {
    phenotypeNames: readonly string[];
    sex?: string;
    percentageProbability: string;
  }[],
): string[] =>
  outcomes.map(
    (o) =>
      `${o.phenotypeNames.join(' + ') || 'Normal'}${o.sex ? `/${o.sex}` : ''} ${o.percentageProbability}`,
  );
