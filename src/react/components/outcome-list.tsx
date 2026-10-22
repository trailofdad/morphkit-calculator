import type { MorphkitDictionary } from '@trailofdad/morphkit';
import type { ReactNode } from 'react';
import { comboParts, possHetPercent, type FoldedOutcome } from '../../index';
import { cx, type ClassNames } from '../cx';
import { MorphChip } from './morph-chip';

export type OutcomeListSlot =
  | 'empty'
  | 'item'
  | 'header'
  | 'group'
  | 'groupLabel'
  | 'chips'
  | 'probability'
  | 'sex'
  | 'badges'
  | 'het'
  | 'lethal'
  | 'warning'
  | 'actions';

/** Props handed to a custom combo renderer (`renderCombo`), e.g. to wrap the chip in a tooltip. */
export interface ComboRenderProps {
  name: string;
  /** What the combo is made of, e.g. "Yellowbelly + Asphalt". */
  description: string;
  /** The default chip, to wrap or replace. */
  chip: ReactNode;
}

export interface OutcomeListProps {
  outcomes: readonly FoldedOutcome[];
  dictionary: MorphkitDictionary;
  /** Extra per-row controls, e.g. "set as goal". */
  renderActions?: (outcome: FoldedOutcome) => ReactNode;
  /** Defaults to the chip with its description as a native `title` tooltip. */
  renderCombo?: (props: ComboRenderProps) => ReactNode;
  emptyLabel?: ReactNode;
  className?: string;
  classNames?: ClassNames<OutcomeListSlot>;
}

/** Split phenotype names into market combos and the plain traits they (and the rest) show. */
function splitPhenotype(
  names: readonly string[],
  dict: MorphkitDictionary,
): { traits: string[]; combos: { name: string; description: string }[] } {
  const traits: string[] = [];
  const seen = new Set<string>();
  const combos: { name: string; description: string }[] = [];
  const addTrait = (name: string): void => {
    if (seen.has(name)) return;
    seen.add(name);
    traits.push(name);
  };
  for (const name of names) {
    const parts = comboParts(name, dict);
    if (parts) {
      // A combo also lists its constituent traits: "Grail" adds Lavender Albino and Clown.
      combos.push({ name, description: parts.join(' + ') });
      parts.forEach(addTrait);
    } else {
      addTrait(name);
    }
  }
  return { traits, combos };
}

const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;

/**
 * Folded pairing outcomes: per row the traits and market combos it shows, its
 * probability, possible hets, and lethal / birth-defect warnings.
 */
export function OutcomeList({
  outcomes,
  dictionary,
  renderActions,
  renderCombo,
  emptyLabel = 'No outcomes.',
  className,
  classNames,
}: OutcomeListProps): ReactNode {
  if (outcomes.length === 0) {
    return <div className={cx('mkc-empty', classNames?.empty, className)}>{emptyLabel}</div>;
  }

  return (
    <ul className={cx('mkc-outcomes', className)} aria-label="Outcomes">
      {outcomes.map((o) => {
        const { traits, combos } = splitPhenotype(o.phenotypeNames, dictionary);
        const hasBadges =
          o.possibleHets.length > 0 || o.isLethal || o.congenitalWarnings.length > 0;
        return (
          <li
            key={o.key}
            className={cx('mkc-outcome', classNames?.item)}
            data-lethal={o.isLethal || undefined}
          >
            <div className={cx('mkc-outcome-header', classNames?.header)}>
              <div className="mkc-outcome-groups">
                {o.phenotypeNames.length === 0 && (
                  <span className="mkc-outcome-normal">Normal</span>
                )}
                {traits.length > 0 && (
                  <div className={cx('mkc-outcome-group', classNames?.group)}>
                    <span className={cx('mkc-outcome-group-label', classNames?.groupLabel)}>
                      {plural(traits.length, 'trait', 'traits')}
                    </span>
                    <div className={cx('mkc-chips', classNames?.chips)}>
                      {traits.map((name) => (
                        <MorphChip key={name} label={name} />
                      ))}
                    </div>
                  </div>
                )}
                {combos.length > 0 && (
                  <div className={cx('mkc-outcome-group', classNames?.group)}>
                    <span className={cx('mkc-outcome-group-label', classNames?.groupLabel)}>
                      {plural(combos.length, 'combo', 'combos')}
                    </span>
                    <div className={cx('mkc-chips', classNames?.chips)}>
                      {combos.map(({ name, description }) => {
                        const chip = <MorphChip label={name} title={description} />;
                        return (
                          <span key={name} className="mkc-combo">
                            {renderCombo ? renderCombo({ name, description, chip }) : chip}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              <div className="mkc-outcome-meta">
                {/* Sex-linked pairings split rows by sex; autosomal rows have none. */}
                {o.sex && (
                  <span className={cx('mkc-outcome-sex', classNames?.sex)} data-sex={o.sex}>
                    {o.sex === 'male' ? '♂ Male' : '♀ Female'}
                  </span>
                )}
                <span className={cx('mkc-probability', classNames?.probability)}>
                  {o.percentageProbability}
                </span>
              </div>
            </div>

            {hasBadges && (
              <div className={cx('mkc-badges', classNames?.badges)}>
                {o.possibleHets.map((h) => (
                  <span
                    key={h.locusId}
                    className={cx('mkc-badge', 'mkc-badge-het', classNames?.het)}
                  >
                    {possHetPercent(h.probability)}% Het{' '}
                    {dictionary.loci[h.locusId]?.name ?? h.locusId}
                  </span>
                ))}
                {o.isLethal && (
                  <span className={cx('mkc-badge', 'mkc-badge-lethal', classNames?.lethal)}>
                    Lethal
                  </span>
                )}
                {o.congenitalWarnings.map((w) => (
                  <span
                    key={w}
                    className={cx('mkc-badge', 'mkc-badge-warning', classNames?.warning)}
                  >
                    {w}
                  </span>
                ))}
              </div>
            )}

            {renderActions && (
              <div className={cx('mkc-outcome-actions', classNames?.actions)}>
                {renderActions(o)}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
