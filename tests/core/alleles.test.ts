import { describe, expect, it } from 'vitest';
import { buildAlleleList, searchAlleles } from '../../src';
import { REAL_DICT } from '../helpers';

const alleles = buildAlleleList(REAL_DICT);
const names = (query: string, limit?: number): string[] =>
  searchAlleles(alleles, query, limit === undefined ? {} : { limit }).map((s) => s.name);

describe('searchAlleles', () => {
  it('returns nothing for an empty query', () => {
    expect(names('   ')).toEqual([]);
  });

  it('finds an allele by its gene name ("piebald" → Pied)', () => {
    expect(names('piebald')).toContain('Pied');
  });

  it('ranks a name prefix above a gene-name match', () => {
    const results = names('yellowbelly');
    expect(results[0]).toBe('Yellowbelly');
    // The rest of the Yellowbelly complex follows via the gene name.
    expect(results).toEqual(expect.arrayContaining(['Asphalt', 'Gravel', 'Spark']));
  });

  it('matches aliases', () => {
    const withAlias = alleles.find((a) => a.aliases.length > 0)!;
    const alias = withAlias.aliases[0]!;
    expect(searchAlleles(alleles, alias).map((s) => s.alleleId)).toContain(withAlias.alleleId);
  });

  it('honours exclude and limit', () => {
    expect(names('pastel', 2)).toHaveLength(2);
    const noPastel = searchAlleles(alleles, 'pastel', { exclude: (s) => s.alleleId === 'pastel' });
    expect(noPastel.map((s) => s.alleleId)).not.toContain('pastel');
  });
});
