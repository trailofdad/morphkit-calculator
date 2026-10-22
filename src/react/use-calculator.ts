import type { LocusInput, MorphkitDictionary } from '@trailofdad/morphkit';
import { useEffect, useMemo, useReducer, useRef, type Dispatch } from 'react';
import {
  buildAlleleList,
  calculate,
  calculatorReducer,
  createCalculatorState,
  fromLocusInputs,
  traitFromSuggestion,
  type AlleleSuggestion,
  type CalculationResult,
  type CalculatorAction,
  type CalculatorState,
  type ParentRole,
  type SelectionTrait,
  type SexLinkage,
  type Zygosity,
} from '../index';

export interface CalculatorActions {
  /** Add a picked allele (at its default zygosity) or a ready-made trait. */
  addTrait: (parent: ParentRole, trait: AlleleSuggestion | SelectionTrait) => void;
  removeTrait: (parent: ParentRole, index: number) => void;
  setZygosity: (parent: ParentRole, index: number, zygosity: Zygosity) => void;
  setCarrierProbability: (parent: ParentRole, index: number, probability: number) => void;
  setSexLinkage: (parent: ParentRole, index: number, sexLinkage: SexLinkage) => void;
  /** Replace a parent with stored genetics; ids missing from the dictionary land in `state.unresolved`. */
  loadGenetics: (parent: ParentRole, genetics: readonly LocusInput[]) => void;
  clearParent: (parent: ParentRole) => void;
  swapParents: () => void;
  reset: () => void;
}

export interface CalculatorController extends CalculatorActions {
  dictionary: MorphkitDictionary;
  state: CalculatorState;
  dispatch: Dispatch<CalculatorAction>;
  /** Results for the current state: `idle`, `ok` (with folded outcomes) or `error`. */
  result: CalculationResult;
  /** Every pickable allele, for search. */
  alleles: AlleleSuggestion[];
}

export interface UseCalculatorOptions {
  initialState?: CalculatorState;
  /** Called after every state change (not on mount). */
  onChange?: (state: CalculatorState) => void;
}

const isSuggestion = (t: AlleleSuggestion | SelectionTrait): t is AlleleSuggestion =>
  'inheritance' in t;

/**
 * Calculator state for one pairing: a reducer, memoised results and bound
 * actions. Use it directly, or through `CalculatorProvider` + `useCalculator`.
 */
export function useCalculatorController(
  dictionary: MorphkitDictionary,
  options: UseCalculatorOptions = {},
): CalculatorController {
  const [state, dispatch] = useReducer(
    calculatorReducer,
    options.initialState,
    (initial) => initial ?? createCalculatorState(),
  );

  const result = useMemo(() => calculate(state, dictionary), [state, dictionary]);
  const alleles = useMemo(() => buildAlleleList(dictionary), [dictionary]);

  const onChange = useRef(options.onChange);
  useEffect(() => {
    onChange.current = options.onChange;
  });
  const initial = useRef(state);
  useEffect(() => {
    if (state !== initial.current) onChange.current?.(state);
  }, [state]);

  const actions = useMemo<CalculatorActions>(
    () => ({
      addTrait: (parent, trait) =>
        dispatch({
          type: 'addTrait',
          parent,
          trait: isSuggestion(trait) ? traitFromSuggestion(trait) : trait,
        }),
      removeTrait: (parent, index) => dispatch({ type: 'removeTrait', parent, index }),
      setZygosity: (parent, index, zygosity) =>
        dispatch({ type: 'setZygosity', parent, index, zygosity }),
      setCarrierProbability: (parent, index, probability) =>
        dispatch({ type: 'setCarrierProbability', parent, index, probability }),
      setSexLinkage: (parent, index, sexLinkage) =>
        dispatch({ type: 'setSexLinkage', parent, index, sexLinkage }),
      loadGenetics: (parent, genetics) => {
        const { selections, unresolved } = fromLocusInputs(genetics, dictionary);
        dispatch({ type: 'loadParent', parent, traits: selections, unresolved });
      },
      clearParent: (parent) => dispatch({ type: 'clearParent', parent }),
      swapParents: () => dispatch({ type: 'swapParents' }),
      reset: () => dispatch({ type: 'reset' }),
    }),
    [dictionary],
  );

  return { dictionary, state, dispatch, result, alleles, ...actions };
}
