import type { ReactNode } from 'react';
import type { ParentRole } from '../../index';
import { useCalculator } from '../context';
import { cx, type ClassNames } from '../cx';
import { TraitPicker, type TraitPickerProps } from './trait-picker';

export type ParentPanelSlot = 'header' | 'title' | 'symbol' | 'actions' | 'warning' | 'clear';

export interface ParentPanelProps extends Pick<
  TraitPickerProps,
  | 'label'
  | 'placeholder'
  | 'emptyMessage'
  | 'maxMatches'
  | 'renderZygosity'
  | 'carrierProbabilities'
> {
  parent: ParentRole;
  /** Defaults to "Sire" / "Dam". */
  title?: ReactNode;
  /** Header controls, e.g. a "load from collection" button. */
  actions?: ReactNode;
  className?: string;
  classNames?: ClassNames<ParentPanelSlot>;
  pickerClassNames?: TraitPickerProps['classNames'];
}

/** One parent's genotype input, bound to the nearest `CalculatorProvider`. */
export function ParentPanel({
  parent,
  title,
  actions,
  className,
  classNames,
  pickerClassNames,
  ...pickerProps
}: ParentPanelProps): ReactNode {
  const calc = useCalculator();
  const { sex, traits } = calc.state[parent];
  const unresolved = calc.state.unresolved[parent];
  const heading = title ?? (parent === 'sire' ? 'Sire' : 'Dam');

  return (
    <section className={cx('mkc-panel', className)} data-parent={parent}>
      <header className={cx('mkc-panel-header', classNames?.header)}>
        <h2 className={cx('mkc-panel-title', classNames?.title)}>
          <span className={cx('mkc-panel-symbol', classNames?.symbol)} aria-hidden="true">
            {sex === 'Male' ? '♂' : '♀'}
          </span>
          {heading}
        </h2>
        {actions && <div className={cx('mkc-panel-actions', classNames?.actions)}>{actions}</div>}
      </header>

      <TraitPicker
        {...pickerProps}
        traits={traits}
        sex={sex}
        suggestions={calc.alleles}
        dictionary={calc.dictionary}
        onAdd={(s) => calc.addTrait(parent, s)}
        onRemove={(i) => calc.removeTrait(parent, i)}
        onSetZygosity={(i, z) => calc.setZygosity(parent, i, z)}
        onSetSexLinkage={(i, l) => calc.setSexLinkage(parent, i, l)}
        onSetCarrierProbability={(i, p) => calc.setCarrierProbability(parent, i, p)}
        classNames={pickerClassNames}
      />

      {unresolved.length > 0 && (
        <p className={cx('mkc-warning', classNames?.warning)} role="status">
          Skipped {unresolved.length} trait{unresolved.length > 1 ? 's' : ''} not in the dictionary:{' '}
          {unresolved.join(', ')}
        </p>
      )}

      {traits.length > 0 && (
        <button
          type="button"
          className={cx('mkc-text-button', classNames?.clear)}
          onClick={() => calc.clearParent(parent)}
        >
          Clear all
        </button>
      )}
    </section>
  );
}
