export type {
  FoldedOutcome,
  ParentSex,
  ParentState,
  SelectionTrait,
  SexLinkage,
  Zygosity,
} from './core/types';

export {
  DEFAULT_DICTIONARY_VERSION,
  DictionaryLoadError,
  dictionaryUrl,
  getInheritanceById,
  loadDictionary,
} from './core/dictionary';
export type { LoadDictionaryOptions } from './core/dictionary';

export { defaultZygosity, getZygOptions, getZygosity } from './core/zygosity';
export type { ZygosityOption } from './core/zygosity';

export {
  comboParts,
  describeCombo,
  formatProbability,
  inheritanceClass,
  isHetTrait,
  morphTag,
  possHetPercent,
  resolveShortName,
  resolveShortNameForLocus,
  traitLabel,
} from './core/labels';
export type { InheritanceClass, MorphTag, ShortName } from './core/labels';

export { buildAlleleList, searchAlleles } from './core/alleles';
export type { AlleleSuggestion, SearchAllelesOptions } from './core/alleles';

export {
  DEFAULT_POS_HET_PROBABILITY,
  fromLocusInputs,
  selectionToLocusInput,
  selectionsToGenotype,
} from './core/selection';

export {
  calcPairing,
  foldAndSortOutcomes,
  foldKey,
  foldOutcomes,
  resolveTargetGenotype,
  runPairing,
} from './core/pairing';
export type { PairingParent } from './core/pairing';

export {
  calculate,
  calculatorReducer,
  createCalculatorState,
  isCompoundTrait,
  traitFromSuggestion,
} from './core/state';
export type {
  CalculationResult,
  CalculatorAction,
  CalculatorState,
  ParentRole,
} from './core/state';
