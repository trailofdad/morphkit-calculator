import type { MorphkitDictionary } from '@trailofdad/morphkit';
import type { ReactNode } from 'react';
import type { ParentRole } from '../../index';
import { CalculatorProvider, useCalculator } from '../context';
import { cx, type ClassNames } from '../cx';
import type { UseCalculatorOptions } from '../use-calculator';
import { useDictionary, type UseDictionaryOptions } from '../use-dictionary';
import { ParentPanel, type ParentPanelProps } from './parent-panel';
import { Results, type ResultsProps } from './results';

export type CalculatorSlot =
  'header' | 'title' | 'description' | 'parents' | 'swap' | 'loading' | 'error';

export interface CalculatorProps extends UseCalculatorOptions {
  /** A dictionary you already hold. Omit to load the pinned release (see `dictionaryOptions`). */
  dictionary?: MorphkitDictionary;
  dictionaryOptions?: UseDictionaryOptions;
  title?: ReactNode;
  description?: ReactNode;
  /** Header controls per parent panel, e.g. "load from collection". */
  parentActions?: (parent: ParentRole) => ReactNode;
  /** Props shared by both parent panels. */
  parentProps?: Omit<ParentPanelProps, 'parent' | 'actions'>;
  resultsProps?: ResultsProps;
  /** Rendered inside the provider, after the results; `useCalculator()` works here. */
  children?: ReactNode;
  className?: string;
  classNames?: ClassNames<CalculatorSlot>;
}

/**
 * The complete calculator: both parent panels, a swap button and the results.
 * Loads the dictionary itself unless one is passed, with loading and retryable
 * error states. Import `@trailofdad/morphkit-calculator/styles.css` for the
 * default look, or style the `mkc-*` classes / `classNames` slots yourself.
 */
export function Calculator({
  dictionary,
  dictionaryOptions,
  ...props
}: CalculatorProps): ReactNode {
  if (dictionary) return <LoadedCalculator dictionary={dictionary} {...props} />;
  return <LoadingCalculator options={dictionaryOptions} {...props} />;
}

function LoadingCalculator({
  options,
  ...props
}: Omit<CalculatorProps, 'dictionary' | 'dictionaryOptions'> & {
  options: UseDictionaryOptions | undefined;
}): ReactNode {
  const dict = useDictionary(options);
  if (dict.status === 'ready') return <LoadedCalculator dictionary={dict.dictionary} {...props} />;
  return (
    <div className={cx('mkc-root', 'mkc-calculator', props.className)}>
      <CalculatorHeader {...props} />
      {dict.status === 'loading' ? (
        <div
          className={cx('mkc-loading', props.classNames?.loading)}
          role="status"
          aria-busy="true"
        >
          Loading morph dictionary…
        </div>
      ) : (
        <div className={cx('mkc-error', props.classNames?.error)} role="alert">
          <span>Couldn’t load the morph dictionary: {dict.error.message}</span>
          <button type="button" className="mkc-button" onClick={dict.retry}>
            Try again
          </button>
        </div>
      )}
    </div>
  );
}

function LoadedCalculator({
  dictionary,
  initialState,
  onChange,
  ...props
}: Omit<CalculatorProps, 'dictionaryOptions'> & { dictionary: MorphkitDictionary }): ReactNode {
  return (
    <CalculatorProvider
      dictionary={dictionary}
      {...(initialState ? { initialState } : {})}
      {...(onChange ? { onChange } : {})}
    >
      <CalculatorBody {...props} />
    </CalculatorProvider>
  );
}

function CalculatorBody({
  parentActions,
  parentProps,
  resultsProps,
  children,
  className,
  classNames,
  ...header
}: Omit<
  CalculatorProps,
  'dictionary' | 'dictionaryOptions' | 'initialState' | 'onChange'
>): ReactNode {
  const { swapParents, state } = useCalculator();
  const empty = state.sire.traits.length === 0 && state.dam.traits.length === 0;
  return (
    <div className={cx('mkc-root', 'mkc-calculator', className)}>
      <CalculatorHeader {...header} classNames={classNames} />
      <div className={cx('mkc-parents', classNames?.parents)}>
        <ParentPanel parent="sire" actions={parentActions?.('sire')} {...parentProps} />
        <button
          type="button"
          className={cx('mkc-button', 'mkc-swap', classNames?.swap)}
          onClick={swapParents}
          disabled={empty}
          aria-label="Swap sire and dam traits"
        >
          <span aria-hidden="true">⇄</span>
        </button>
        <ParentPanel parent="dam" actions={parentActions?.('dam')} {...parentProps} />
      </div>
      <Results {...resultsProps} />
      {children}
    </div>
  );
}

function CalculatorHeader({
  title = 'Calculator',
  description = 'Pair two animals and see the possible offspring.',
  classNames,
}: Pick<CalculatorProps, 'title' | 'description' | 'classNames'>): ReactNode {
  if (!title && !description) return null;
  return (
    <header className={cx('mkc-header', classNames?.header)}>
      {title && <h1 className={cx('mkc-title', classNames?.title)}>{title}</h1>}
      {description && (
        <p className={cx('mkc-description', classNames?.description)}>{description}</p>
      )}
    </header>
  );
}
