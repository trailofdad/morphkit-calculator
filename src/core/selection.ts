/**
 * Selections ↔ morphkit genotypes.
 *
 * The calculator carries each trait's dictionary **locus + allele IDs** and
 * feeds morphkit explicit `LocusInput`s. We never round-trip through morph
 * names: the dictionary registers some names as an alias of one locus *and*
 * the canonical name of another (e.g. "Genetic Stripe"), so name resolution is
 * ambiguous. IDs are unambiguous by construction.
 */

import type { LocusInput, MorphkitDictionary } from '@trailofdad/morphkit';
import { isNormalAllele } from './dictionary';
import type { SelectionTrait, SexLinkage } from './types';
import { getZygosity } from './zygosity';

/**
 * Carrier probability for a possible het when none is given: the 2/3 carrier
 * chance of a het × het pairing, which the hobby writes as "66%".
 */
export const DEFAULT_POS_HET_PROBABILITY = 0.66;

function sexChromosomesFor(linkage: SexLinkage | undefined): LocusInput['sexChromosomes'] {
  // Alleles are emitted as [mutant, normal]; chromosomes follow the same order.
  if (linkage === 'female-maker') return ['X', 'Y'];
  if (linkage === 'male-maker') return ['Y', 'X'];
  return undefined;
}

/**
 * One selection's explicit genotype:
 *  - `visual` → homozygous (recessive visual or incomplete-dominant Super).
 *  - `het50` → an unproven carrier: morphkit `pos_het` + `carrierProbability`,
 *    which propagates reduced carrier odds to the offspring.
 *  - `het100` → one definite mutant copy.
 */
export function selectionToLocusInput(sel: SelectionTrait): LocusInput {
  if (sel.zygosity === 'visual') {
    return { locusId: sel.locusId, alleles: [sel.alleleId, sel.alleleId] };
  }
  if (sel.zygosity === 'het50') {
    return {
      locusId: sel.locusId,
      alleles: [sel.alleleId],
      zygosity: 'pos_het',
      carrierProbability: sel.carrierProbability ?? DEFAULT_POS_HET_PROBABILITY,
    };
  }
  const sexChromosomes = sexChromosomesFor(sel.sexLinkage);
  return sexChromosomes
    ? { locusId: sel.locusId, alleles: [sel.alleleId, 'normal'], sexChromosomes }
    : { locusId: sel.locusId, alleles: [sel.alleleId, 'normal'] };
}

/**
 * A parent's selections as an engine genotype, one `LocusInput` per locus.
 *
 * Two distinct alleles picked on the same locus (Yellowbelly + Asphalt, Lesser +
 * Mojave) are one compound genotype `[a, b]`. Sending them as two separate
 * entries for the same locus makes morphkit compute the wrong pairing, so they
 * must be merged here.
 */
export function selectionsToGenotype(traits: readonly SelectionTrait[]): LocusInput[] {
  const byLocus = new Map<string, SelectionTrait[]>();
  for (const t of traits) {
    const group = byLocus.get(t.locusId);
    if (group) group.push(t);
    else byLocus.set(t.locusId, [t]);
  }
  const genotype: LocusInput[] = [];
  for (const [locusId, group] of byLocus) {
    const alleles = [...new Set(group.map((t) => t.alleleId))];
    if (alleles.length === 1) {
      genotype.push(selectionToLocusInput(group[0]!));
    } else if (alleles.length === 2) {
      genotype.push({ locusId, alleles });
    } else {
      throw new RangeError(
        `Locus "${locusId}" has ${alleles.length} alleles selected; an animal carries at most two.`,
      );
    }
  }
  return genotype;
}

/**
 * Adapt canonical genetics (morphkit `LocusInput[]`, as stored on an animal)
 * into editable selections. A compound locus (two mutants) yields one `het100`
 * selection per allele. Returns the selections plus any locus or allele ids
 * missing from the dictionary.
 */
export function fromLocusInputs(
  genetics: readonly LocusInput[],
  dict: MorphkitDictionary,
): { selections: SelectionTrait[]; unresolved: string[] } {
  const selections: SelectionTrait[] = [];
  const unresolved: string[] = [];

  for (const locus of genetics) {
    const locusDef = dict.loci[locus.locusId];
    if (!locusDef) {
      unresolved.push(locus.locusId);
      continue;
    }
    const mutants = [...new Set(locus.alleles.filter((a) => !isNormalAllele(a)))];
    if (mutants.length === 0) continue;

    const zygosity = getZygosity(locus);
    const linkage = sexLinkageOf(locus);

    for (const alleleId of mutants) {
      const allele = locusDef.alleles[alleleId];
      if (!allele) {
        unresolved.push(alleleId);
        continue;
      }
      const sel: SelectionTrait = {
        name: allele.name ?? alleleId,
        locusId: locus.locusId,
        alleleId,
        zygosity: mutants.length > 1 ? 'het100' : zygosity,
      };
      if (
        sel.zygosity === 'het50' &&
        locus.carrierProbability !== undefined &&
        locus.carrierProbability !== DEFAULT_POS_HET_PROBABILITY
      ) {
        sel.carrierProbability = locus.carrierProbability;
      }
      if (linkage && mutants.length === 1) sel.sexLinkage = linkage;
      selections.push(sel);
    }
  }

  return { selections, unresolved };
}

/** Read an explicit male-maker / female-maker annotation back off a locus. */
function sexLinkageOf(locus: LocusInput): SexLinkage | undefined {
  const chromosomes = locus.sexChromosomes;
  if (!chromosomes) return undefined;
  const i = locus.alleles.findIndex((a) => !isNormalAllele(a));
  if (i < 0) return undefined;
  return chromosomes[i] === 'X' ? 'female-maker' : 'male-maker';
}
