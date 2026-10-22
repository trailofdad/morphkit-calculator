/**
 * Framework-free calculator state: two parents and their selected traits.
 *
 * `calculatorReducer` is a plain `(state, action) => state` function, so it can
 * drive React's `useReducer`, a store, or a test directly. `calculate` turns a
 * state into results.
 */

import type { MorphkitCalculationOutput, MorphkitDictionary } from '@trailofdad/morphkit';
import type { AlleleSuggestion } from './alleles';
import { foldAndSortOutcomes, runPairing } from './pairing';
import type { FoldedOutcome, ParentState, SelectionTrait, SexLinkage, Zygosity } from './types';
import { defaultZygosity } from './zygosity';

export type ParentRole = 'sire' | 'dam';

export interface CalculatorState {
  sire: ParentState;
  dam: ParentState;
  /** Locus/allele ids that could not be loaded into each parent (see `fromLocusInputs`). */
  unresolved: Record<ParentRole, string[]>;
}

export type CalculatorAction =
  | { type: 'addTrait'; parent: ParentRole; trait: SelectionTrait }
  | { type: 'removeTrait'; parent: ParentRole; index: number }
  | { type: 'setZygosity'; parent: ParentRole; index: number; zygosity: Zygosity }
  | { type: 'setCarrierProbability'; parent: ParentRole; index: number; probability: number }
  | { type: 'setSexLinkage'; parent: ParentRole; index: number; sexLinkage: SexLinkage }
  | { type: 'loadParent'; parent: ParentRole; traits: SelectionTrait[]; unresolved?: string[] }
  | { type: 'clearParent'; parent: ParentRole }
  | { type: 'swapParents' }
  | { type: 'reset' };

export function createCalculatorState(
  initial: { sire?: SelectionTrait[]; dam?: SelectionTrait[] } = {},
): CalculatorState {
  return {
    sire: { sex: 'Male', traits: initial.sire ?? [] },
    dam: { sex: 'Female', traits: initial.dam ?? [] },
    unresolved: { sire: [], dam: [] },
  };
}

/** A new selection for a picked allele, at its inheritance's default zygosity. */
export function traitFromSuggestion(s: AlleleSuggestion): SelectionTrait {
  return {
    name: s.name,
    locusId: s.locusId,
    alleleId: s.alleleId,
    zygosity: defaultZygosity(s.inheritance),
  };
}

/** True when the trait at `index` shares its locus with another selected allele. */
export function isCompoundTrait(traits: readonly SelectionTrait[], index: number): boolean {
  const t = traits[index];
  return !!t && traits.some((o, i) => i !== index && o.locusId === t.locusId);
}

/**
 * Add a trait. A duplicate allele is ignored. A second allele on an occupied
 * locus forms a compound (e.g. Yellowbelly + Asphalt): both become single
 * definite copies. A third allele on one locus is ignored — an animal carries
 * at most two.
 */
function addTrait(traits: SelectionTrait[], trait: SelectionTrait): SelectionTrait[] {
  const sameLocus = traits.filter((t) => t.locusId === trait.locusId);
  if (sameLocus.some((t) => t.alleleId === trait.alleleId)) return traits;
  if (sameLocus.length >= 2) return traits;
  if (sameLocus.length === 1) {
    const single = (t: SelectionTrait): SelectionTrait => ({
      name: t.name,
      locusId: t.locusId,
      alleleId: t.alleleId,
      zygosity: 'het100',
    });
    return [...traits.map((t) => (t.locusId === trait.locusId ? single(t) : t)), single(trait)];
  }
  return [...traits, trait];
}

function updateAt(
  traits: SelectionTrait[],
  index: number,
  fn: (t: SelectionTrait) => SelectionTrait,
): SelectionTrait[] {
  if (!traits[index]) return traits;
  return traits.map((t, i) => (i === index ? fn(t) : t));
}

function withParent(
  state: CalculatorState,
  role: ParentRole,
  traits: SelectionTrait[],
  unresolved: string[] = [],
): CalculatorState {
  const prev = state.unresolved[role];
  if (
    traits === state[role].traits &&
    prev.length === unresolved.length &&
    prev.every((id, i) => id === unresolved[i])
  ) {
    return state;
  }
  return {
    ...state,
    [role]: { ...state[role], traits },
    unresolved: { ...state.unresolved, [role]: unresolved },
  };
}

export function calculatorReducer(
  state: CalculatorState,
  action: CalculatorAction,
): CalculatorState {
  switch (action.type) {
    case 'addTrait':
      return withParent(state, action.parent, addTrait(state[action.parent].traits, action.trait));
    case 'removeTrait':
      return withParent(
        state,
        action.parent,
        state[action.parent].traits.filter((_, i) => i !== action.index),
      );
    case 'setZygosity': {
      const traits = state[action.parent].traits;
      // A compound member is always a single copy; its zygosity is not editable.
      if (isCompoundTrait(traits, action.index)) return state;
      return withParent(
        state,
        action.parent,
        updateAt(traits, action.index, (t) => ({ ...t, zygosity: action.zygosity })),
        state.unresolved[action.parent],
      );
    }
    case 'setCarrierProbability': {
      const p = Math.min(1, Math.max(0, action.probability));
      return withParent(
        state,
        action.parent,
        updateAt(state[action.parent].traits, action.index, (t) => ({
          ...t,
          carrierProbability: p,
        })),
        state.unresolved[action.parent],
      );
    }
    case 'setSexLinkage':
      return withParent(
        state,
        action.parent,
        updateAt(state[action.parent].traits, action.index, (t) => ({
          ...t,
          sexLinkage: action.sexLinkage,
        })),
        state.unresolved[action.parent],
      );
    case 'loadParent':
      return withParent(state, action.parent, action.traits, action.unresolved ?? []);
    case 'clearParent':
      return withParent(state, action.parent, []);
    case 'swapParents':
      return {
        sire: { ...state.sire, traits: state.dam.traits },
        dam: { ...state.dam, traits: state.sire.traits },
        unresolved: { sire: state.unresolved.dam, dam: state.unresolved.sire },
      };
    case 'reset':
      return createCalculatorState();
  }
}

export type CalculationResult =
  | { status: 'idle' }
  | { status: 'ok'; output: MorphkitCalculationOutput; outcomes: FoldedOutcome[] }
  | { status: 'error'; error: Error };

/**
 * Results for a calculator state. `idle` when neither parent has a trait;
 * `error` (never a throw) when the engine rejects the input.
 */
export function calculate(state: CalculatorState, dict: MorphkitDictionary): CalculationResult {
  if (state.sire.traits.length === 0 && state.dam.traits.length === 0) return { status: 'idle' };
  try {
    const output = runPairing(state.sire, state.dam, dict);
    return { status: 'ok', output, outcomes: foldAndSortOutcomes(output) };
  } catch (e) {
    return { status: 'error', error: e instanceof Error ? e : new Error(String(e)) };
  }
}
