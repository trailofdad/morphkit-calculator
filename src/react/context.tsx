import type { MorphkitDictionary } from '@trailofdad/morphkit';
import { createContext, useContext, type ReactNode } from 'react';
import {
  useCalculatorController,
  type CalculatorController,
  type UseCalculatorOptions,
} from './use-calculator';

const CalculatorContext = createContext<CalculatorController | null>(null);

export interface CalculatorProviderProps extends UseCalculatorOptions {
  dictionary: MorphkitDictionary;
  children?: ReactNode;
}

/** Holds one pairing's state for `ParentPanel`, `Results` and `useCalculator` below it. */
export function CalculatorProvider({
  dictionary,
  children,
  ...options
}: CalculatorProviderProps): ReactNode {
  const controller = useCalculatorController(dictionary, options);
  return <CalculatorContext.Provider value={controller}>{children}</CalculatorContext.Provider>;
}

/** The nearest `CalculatorProvider`'s state, results and actions. */
export function useCalculator(): CalculatorController {
  const controller = useContext(CalculatorContext);
  if (!controller) {
    throw new Error('useCalculator must be used inside <CalculatorProvider> or <Calculator>.');
  }
  return controller;
}
