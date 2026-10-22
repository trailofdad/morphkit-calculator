import type { LocusInput, MorphkitDictionary } from '@trailofdad/morphkit';
import type { ReactNode } from 'react';
import { getInheritanceById, inheritanceClass, morphTag, traitLabel } from '../../index';
import { cx } from '../cx';
import { MorphChip } from './morph-chip';

export interface GeneticsChipsProps {
  genetics: readonly LocusInput[];
  /** Null while loading: chips show raw locus ids, untinted. */
  dictionary: MorphkitDictionary | null;
  /** Show at most this many chips, then "+N". */
  max?: number;
  className?: string;
}

/** An animal's stored genetics as chips, each labelled, tagged and tinted by inheritance. */
export function GeneticsChips({
  genetics,
  dictionary,
  max,
  className,
}: GeneticsChipsProps): ReactNode {
  if (genetics.length === 0) return null;
  const visible = max ? genetics.slice(0, max) : genetics;
  const overflow = genetics.length - visible.length;

  return (
    <div className={cx('mkc-chips', className)} aria-label="Genetic traits">
      {visible.map((locus) => {
        const inheritance = dictionary ? getInheritanceById(locus.locusId, dictionary) : undefined;
        return (
          <MorphChip
            key={locus.locusId}
            label={dictionary ? traitLabel(locus, dictionary) : locus.locusId}
            tag={morphTag(locus, inheritance)}
            inheritance={inheritanceClass(inheritance)}
          />
        );
      })}
      {overflow > 0 && <span className="mkc-chip mkc-chip-overflow">+{overflow}</span>}
    </div>
  );
}
