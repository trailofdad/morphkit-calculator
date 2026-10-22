import type { MorphkitDictionary } from '@trailofdad/morphkit';
import { useId, useMemo, useState, type KeyboardEvent, type ReactNode } from 'react';
import {
  DEFAULT_POS_HET_PROBABILITY,
  getInheritanceById,
  getZygOptions,
  inheritanceClass,
  isCompoundTrait,
  possHetPercent,
  searchAlleles,
  type AlleleSuggestion,
  type ParentSex,
  type SelectionTrait,
  type SexLinkage,
  type Zygosity,
  type ZygosityOption,
} from '../../index';
import { cx, type ClassNames } from '../cx';
import { CloseIcon } from './icons';

export type TraitPickerSlot =
  | 'label'
  | 'search'
  | 'input'
  | 'listbox'
  | 'option'
  | 'empty'
  | 'list'
  | 'item'
  | 'itemName'
  | 'itemControls'
  | 'segmented'
  | 'select'
  | 'note'
  | 'remove';

/** Props handed to a custom zygosity control (`renderZygosity`). */
export interface ZygosityControlProps {
  trait: SelectionTrait;
  options: readonly ZygosityOption[];
  value: Zygosity;
  onChange: (zygosity: Zygosity) => void;
  /** Accessible name for the control, e.g. "Pied zygosity". */
  label: string;
}

export interface TraitPickerProps {
  traits: readonly SelectionTrait[];
  /** Every pickable allele (see `buildAlleleList`); matches are filtered from it. */
  suggestions: readonly AlleleSuggestion[];
  /** Resolves each trait's inheritance; may be null while loading. */
  dictionary: MorphkitDictionary | null;
  onAdd: (suggestion: AlleleSuggestion) => void;
  onRemove: (index: number) => void;
  onSetZygosity: (index: number, zygosity: Zygosity) => void;
  /** The parent's sex. On a male, sex-linked traits (Banana) get a male-/female-maker choice. */
  sex?: ParentSex;
  onSetSexLinkage?: (index: number, sexLinkage: SexLinkage) => void;
  /** When given, a possible het offers these carrier probabilities. */
  carrierProbabilities?: readonly number[];
  onSetCarrierProbability?: (index: number, probability: number) => void;
  label?: ReactNode;
  placeholder?: string;
  emptyMessage?: ReactNode;
  maxMatches?: number;
  /** Controlled search text; omit to let the picker manage it. */
  query?: string;
  onQueryChange?: (query: string) => void;
  /** Replace the default radio-group zygosity control (e.g. with your own segmented control). */
  renderZygosity?: (props: ZygosityControlProps) => ReactNode;
  className?: string;
  classNames?: ClassNames<TraitPickerSlot>;
}

const traitKey = (t: { locusId: string; alleleId: string }): string => `${t.locusId}:${t.alleleId}`;

/**
 * Trait search plus the selected-trait list: a combobox of matching alleles,
 * then one row per trait with its zygosity control and a remove button.
 * Context-free, so it also suits non-calculator forms (e.g. editing an animal).
 */
export function TraitPicker({
  traits,
  suggestions,
  dictionary,
  onAdd,
  onRemove,
  onSetZygosity,
  sex,
  onSetSexLinkage,
  carrierProbabilities,
  onSetCarrierProbability,
  label = 'Traits',
  placeholder = 'Type to filter traits…',
  emptyMessage = 'No traits yet — search above to add some.',
  maxMatches = 8,
  query: controlledQuery,
  onQueryChange,
  renderZygosity,
  className,
  classNames,
}: TraitPickerProps): ReactNode {
  const id = useId();
  const [ownQuery, setOwnQuery] = useState('');
  const query = controlledQuery ?? ownQuery;
  const setQuery = (q: string): void => {
    setOwnQuery(q);
    onQueryChange?.(q);
  };
  const [active, setActive] = useState(0);

  const matches = useMemo(() => {
    const chosen = new Set(traits.map(traitKey));
    const perLocus = new Map<string, number>();
    for (const t of traits) perLocus.set(t.locusId, (perLocus.get(t.locusId) ?? 0) + 1);
    // Hide what is already picked, and every allele of a locus that already holds two.
    return searchAlleles(suggestions, query, {
      exclude: (s) => chosen.has(traitKey(s)) || (perLocus.get(s.locusId) ?? 0) >= 2,
      limit: maxMatches,
    });
  }, [query, suggestions, traits, maxMatches]);

  const open = query.trim() !== '' && matches.length > 0;
  const activeIndex = Math.min(active, Math.max(0, matches.length - 1));
  const listboxId = `${id}-listbox`;
  const optionId = (i: number): string => `${id}-option-${i}`;

  const add = (s: AlleleSuggestion): void => {
    onAdd(s);
    setQuery('');
    setActive(0);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'ArrowDown' && open) {
      e.preventDefault();
      setActive((activeIndex + 1) % matches.length);
    } else if (e.key === 'ArrowUp' && open) {
      e.preventDefault();
      setActive((activeIndex - 1 + matches.length) % matches.length);
    } else if (e.key === 'Enter' && open) {
      e.preventDefault();
      const pick = matches[activeIndex];
      if (pick) add(pick);
    } else if (e.key === 'Escape' && query) {
      e.preventDefault();
      setQuery('');
    }
  };

  return (
    <div className={cx('mkc-picker', className)}>
      <label className={cx('mkc-picker-label', classNames?.label)} htmlFor={`${id}-input`}>
        <span>{label}</span>
        <span className="mkc-picker-count">{traits.length} added</span>
      </label>

      <div className={cx('mkc-picker-search', classNames?.search)}>
        <input
          id={`${id}-input`}
          className={cx('mkc-picker-input', classNames?.input)}
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={open ? optionId(activeIndex) : undefined}
          autoComplete="off"
          value={query}
          placeholder={placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
        />
        {open && (
          <ul
            id={listboxId}
            role="listbox"
            aria-label="Matching traits"
            className={cx('mkc-picker-listbox', classNames?.listbox)}
          >
            {matches.map((m, i) => (
              <li
                key={traitKey(m)}
                id={optionId(i)}
                role="option"
                aria-selected={i === activeIndex}
                className={cx('mkc-picker-option', classNames?.option)}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActive(i)}
                onClick={() => add(m)}
              >
                <span>{m.name}</span>
                {m.locusName !== m.name && <span className="mkc-muted">{m.locusName}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>

      {traits.length === 0 ? (
        <div className={cx('mkc-empty', classNames?.empty)}>{emptyMessage}</div>
      ) : (
        <ul className={cx('mkc-picker-list', classNames?.list)} aria-label={`Selected traits`}>
          {traits.map((t, i) => {
            const inheritance = dictionary ? getInheritanceById(t.locusId, dictionary) : undefined;
            const compound = isCompoundTrait(traits, i);
            const zygOptions = compound ? null : getZygOptions(inheritance);
            const sexLinked = !!dictionary?.loci[t.locusId]?.isSexLinked;
            const showLinkage =
              sexLinked &&
              sex === 'Male' &&
              t.zygosity === 'het100' &&
              !compound &&
              onSetSexLinkage;
            const showCarrier =
              t.zygosity === 'het50' && carrierProbabilities?.length && onSetCarrierProbability;
            const zygLabel = `${t.name} zygosity`;

            return (
              <li
                key={traitKey(t)}
                className={cx('mkc-picker-item', classNames?.item)}
                data-inheritance={inheritanceClass(inheritance)}
              >
                <div className={cx('mkc-picker-item-body', classNames?.itemControls)}>
                  <span className={cx('mkc-picker-item-name', classNames?.itemName)}>{t.name}</span>
                  {zygOptions &&
                    (renderZygosity ? (
                      renderZygosity({
                        trait: t,
                        options: zygOptions,
                        value: t.zygosity,
                        onChange: (z) => onSetZygosity(i, z),
                        label: zygLabel,
                      })
                    ) : (
                      <SegmentedRadio
                        name={`${id}-zyg-${i}`}
                        label={zygLabel}
                        options={zygOptions}
                        value={t.zygosity}
                        onChange={(z) => onSetZygosity(i, z)}
                        className={classNames?.segmented}
                      />
                    ))}
                  {compound && (
                    <span className={cx('mkc-note', classNames?.note)}>
                      Single copy (paired on this locus)
                    </span>
                  )}
                  {showCarrier && (
                    <select
                      aria-label={`${t.name} carrier probability`}
                      className={cx('mkc-select', classNames?.select)}
                      value={t.carrierProbability ?? DEFAULT_POS_HET_PROBABILITY}
                      onChange={(e) => onSetCarrierProbability(i, Number(e.target.value))}
                    >
                      {carrierProbabilities.map((p) => (
                        <option key={p} value={p}>
                          {possHetPercent(p)}% possible het
                        </option>
                      ))}
                    </select>
                  )}
                  {showLinkage && (
                    <SegmentedRadio
                      name={`${id}-link-${i}`}
                      label={`${t.name} sex linkage`}
                      options={LINKAGE_OPTIONS}
                      value={t.sexLinkage ?? 'male-maker'}
                      onChange={(l) => onSetSexLinkage(i, l)}
                      className={classNames?.segmented}
                    />
                  )}
                </div>
                <button
                  type="button"
                  className={cx('mkc-icon-button', classNames?.remove)}
                  aria-label={`Remove ${t.name}`}
                  onClick={() => onRemove(i)}
                >
                  <CloseIcon />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

const LINKAGE_OPTIONS: readonly { value: SexLinkage; label: string }[] = [
  { value: 'male-maker', label: 'Male maker' },
  { value: 'female-maker', label: 'Female maker' },
];

/** Native radio inputs styled as a segmented control: keyboard and screen-reader support for free. */
function SegmentedRadio<T extends string>({
  name,
  label,
  options,
  value,
  onChange,
  className,
}: {
  name: string;
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string | undefined;
}): ReactNode {
  return (
    <div role="radiogroup" aria-label={label} className={cx('mkc-segmented', className)}>
      {options.map((o) => (
        <label key={o.value} className="mkc-segment" data-checked={o.value === value || undefined}>
          <input
            type="radio"
            className="mkc-visually-hidden"
            name={name}
            value={o.value}
            checked={o.value === value}
            onChange={() => onChange(o.value)}
          />
          {o.label}
        </label>
      ))}
    </div>
  );
}
