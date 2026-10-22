import type { ReactNode } from 'react';
import type { InheritanceClass, MorphTag } from '../../index';
import { cx, type ClassNames } from '../cx';

export type MorphChipSlot = 'tag';

export interface MorphChipProps {
  label: ReactNode;
  /** Zygosity tag ("HET", "66%", "SUPER"); see `morphTag`. */
  tag?: MorphTag | string | null;
  /**
   * The gene's inheritance (see `inheritanceClass`), exposed as
   * `data-inheritance` so styles can colour by whether a gene needs two copies.
   * Defaults to `unknown` (neutral).
   */
  inheritance?: InheritanceClass;
  title?: string;
  className?: string;
  classNames?: ClassNames<MorphChipSlot>;
}

/** One trait chip: a label plus an optional zygosity tag. */
export function MorphChip({
  label,
  tag,
  inheritance = 'unknown',
  title,
  className,
  classNames,
}: MorphChipProps): ReactNode {
  return (
    <span className={cx('mkc-chip', className)} data-inheritance={inheritance} title={title}>
      {label}
      {tag && <span className={cx('mkc-chip-tag', classNames?.tag)}>{tag}</span>}
    </span>
  );
}
