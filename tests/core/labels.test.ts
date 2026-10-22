// morphTag / describeCombo ported from morph-ranch src/components/morph-badge.test.ts.
import type { LocusInput, MorphkitDictionary } from '@trailofdad/morphkit';
import { describe, expect, it } from 'vitest';
import {
  comboParts,
  describeCombo,
  inheritanceClass,
  isHetTrait,
  morphTag,
  resolveShortName,
  traitLabel,
} from '../../src';
import { MINI_DICT, REAL_DICT } from '../helpers';

const single = (name: string): LocusInput => ({ locusId: name, alleles: [name, 'Normal'] });
const homozygous = (name: string): LocusInput => ({ locusId: name, alleles: [name, name] });
const possibleHet = (name: string): LocusInput => ({
  locusId: name,
  alleles: ['Normal', 'Normal'],
});

describe('morphTag', () => {
  describe('incomplete_dominant', () => {
    it('never tags a single copy as HET — it is visually expressed', () => {
      expect(morphTag(single('Pastel'), 'incomplete_dominant')).toBeNull();
    });

    it('tags the homozygous form as SUPER', () => {
      expect(morphTag(homozygous('Pastel'), 'incomplete_dominant')).toBe('SUPER');
    });

    it('never tags a compound of two different alleles as SUPER', () => {
      const freeway: LocusInput = {
        locusId: 'yellowbelly_complex',
        alleles: ['yellowbelly', 'asphalt'],
      };
      expect(morphTag(freeway, 'incomplete_dominant')).toBeNull();
    });
  });

  describe('dominant / polygenic', () => {
    it('never tags a dominant trait', () => {
      expect(morphTag(single('Spider'), 'dominant')).toBeNull();
      expect(morphTag(homozygous('Spider'), 'dominant')).toBeNull();
    });

    it('never tags a polygenic trait', () => {
      expect(morphTag(single('Tiger'), 'polygenic')).toBeNull();
    });
  });

  describe('recessive', () => {
    it('tags a carrier as HET', () => {
      expect(morphTag(single('Clown'), 'recessive')).toBe('HET');
    });

    it('tags a possible het as 66%', () => {
      expect(morphTag(possibleHet('Clown'), 'recessive')).toBe('66%');
    });

    it('leaves a visual recessive untagged', () => {
      expect(morphTag(homozygous('Clown'), 'recessive')).toBeNull();
    });
  });

  it('falls back to recessive-style tagging for unknown inheritance', () => {
    expect(morphTag(single('Mystery'), undefined)).toBe('HET');
    expect(morphTag(homozygous('Mystery'), undefined)).toBeNull();
  });
});

describe('isHetTrait', () => {
  it('resolves inheritance by locus key', () => {
    expect(isHetTrait({ locusId: 'pied_locus', alleles: ['pied', 'normal'] }, MINI_DICT)).toBe(
      true,
    );
    expect(isHetTrait({ locusId: 'pastel_locus', alleles: ['pastel', 'normal'] }, MINI_DICT)).toBe(
      false,
    );
  });
});

describe('describeCombo', () => {
  const DICT = {
    version: 'test',
    lastUpdated: '',
    loci: {
      yellowbelly_complex: {
        id: 'yellowbelly_complex',
        name: 'Yellowbelly Complex',
        inheritance: 'incomplete_dominant',
        isSexLinked: false,
        alleles: {
          normal: { id: 'normal', name: 'Normal' },
          yellowbelly: { id: 'yellowbelly', name: 'Yellowbelly' },
          asphalt: { id: 'asphalt', name: 'Asphalt' },
        },
      },
      clown_locus: {
        id: 'clown_locus',
        name: 'Clown',
        inheritance: 'recessive',
        isSexLinked: false,
        alleles: {
          normal: { id: 'normal', name: 'Normal' },
          clown: { id: 'clown', name: 'Clown' },
        },
      },
    },
    combos: [
      {
        marketName: 'Freeway',
        requiredGenotype: { yellowbelly_complex: ['yellowbelly', 'asphalt'] },
      },
      {
        marketName: 'Ivory',
        requiredGenotype: { yellowbelly_complex: ['yellowbelly', 'yellowbelly'] },
      },
      {
        marketName: 'Grail',
        aliases: ['Grail Combo'],
        requiredGenotype: {
          yellowbelly_complex: ['yellowbelly', 'asphalt'],
          clown_locus: ['clown', 'clown'],
        },
      },
    ],
    lethalCombos: [],
    polygenicTags: [],
  } as unknown as MorphkitDictionary;

  it('describes a compound combo as its two component morphs', () => {
    expect(describeCombo('Freeway', DICT)).toBe('Yellowbelly + Asphalt');
  });

  it('describes a homozygous incomplete-dominant combo as the Super form', () => {
    expect(describeCombo('Ivory', DICT)).toBe('Super Yellowbelly');
  });

  it('joins components across loci and matches by alias, case-insensitively', () => {
    expect(describeCombo('grail combo', DICT)).toBe('Yellowbelly + Asphalt + Clown');
  });

  it('returns null for a plain trait name', () => {
    expect(describeCombo('Clown', DICT)).toBeNull();
  });

  it('decomposes a real multi-locus combo', () => {
    expect(comboParts('Bumblebee', REAL_DICT)).toEqual(['Pastel', 'Spider']);
  });
});

describe('traitLabel', () => {
  it('names a single mutant, and "Normal" when there is none', () => {
    expect(traitLabel({ locusId: 'pied_locus', alleles: ['pied', 'normal'] }, MINI_DICT)).toBe(
      'Pied',
    );
    expect(traitLabel({ locusId: 'pied_locus', alleles: ['normal', 'normal'] }, MINI_DICT)).toBe(
      'Normal',
    );
  });
});

describe('resolveShortName', () => {
  it('derives a fallback when the dictionary has no short name', () => {
    expect(resolveShortName('Orange Dream', null)).toEqual({ short: 'OD', isFallback: true });
    expect(resolveShortName('Clown', null)).toEqual({ short: 'CLO', isFallback: true });
  });
});

describe('inheritanceClass', () => {
  it('groups dominant with polygenic and keeps unknown separate', () => {
    expect(inheritanceClass('polygenic')).toBe('dominant');
    expect(inheritanceClass('recessive')).toBe('recessive');
    expect(inheritanceClass(undefined)).toBe('unknown');
  });
});
