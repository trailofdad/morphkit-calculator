import type { ReactNode } from 'react';
import { useCalculator } from '../context';
import { cx, type ClassNames } from '../cx';
import { OutcomeList, type OutcomeListProps } from './outcome-list';

export type ResultsSlot = 'header' | 'title' | 'count' | 'idle' | 'error';

export interface ResultsProps extends Pick<OutcomeListProps, 'renderActions' | 'renderCombo'> {
  title?: ReactNode;
  idleMessage?: ReactNode;
  className?: string;
  classNames?: ClassNames<ResultsSlot>;
  outcomeClassNames?: OutcomeListProps['classNames'];
}

/** The nearest `CalculatorProvider`'s results: idle prompt, engine error, or outcomes. */
export function Results({
  title = 'Outcomes',
  idleMessage = 'Add traits to a parent to see the pairing outcomes.',
  renderActions,
  renderCombo,
  className,
  classNames,
  outcomeClassNames,
}: ResultsProps): ReactNode {
  const { result, dictionary } = useCalculator();

  if (result.status === 'idle') {
    return (
      <div className={cx('mkc-empty', 'mkc-results-idle', classNames?.idle, className)}>
        {idleMessage}
      </div>
    );
  }
  if (result.status === 'error') {
    return (
      <div className={cx('mkc-error', classNames?.error, className)} role="alert">
        {result.error.message}
      </div>
    );
  }
  return (
    <section className={cx('mkc-results', className)} aria-live="polite">
      <header className={cx('mkc-results-header', classNames?.header)}>
        <h2 className={cx('mkc-results-title', classNames?.title)}>{title}</h2>
        <span className={cx('mkc-results-count', classNames?.count)}>
          {result.outcomes.length} possible
        </span>
      </header>
      <OutcomeList
        outcomes={result.outcomes}
        dictionary={dictionary}
        classNames={outcomeClassNames}
        {...(renderActions ? { renderActions } : {})}
        {...(renderCombo ? { renderCombo } : {})}
      />
    </section>
  );
}
