# @trailofdad/morphkit-calculator

A ball python breeding calculator built on [morphkit](https://github.com/trailofdad/morphkit) and the [morphkit-dictionary](https://github.com/trailofdad/morphkit-dictionary).

morphkit does the genetics: Punnett squares, sex linkage, combos, lethals. This package is the calculator layer on top of it:

- parent and trait selection, including allelic-group compounds (Yellowbelly + Asphalt) and Banana male-maker / female-maker
- zygosity options per inheritance type
- outcomes grouped one row per visual phenotype
- the "66% Het" convention
- labels, combo descriptions and short names
- a framework-free state reducer

The core has no React or DOM dependency. An optional React layer lives at `/react`.

## Install

```bash
npm install @trailofdad/morphkit-calculator @trailofdad/morphkit
```

`@trailofdad/morphkit` is a peer dependency. So is `react` (18.2+), but only if you use `/react`.

## React

```tsx
import { Calculator } from '@trailofdad/morphkit-calculator/react';
import '@trailofdad/morphkit-calculator/styles.css'; // optional default theme

export function Page() {
  return <Calculator />; // loads the pinned dictionary, with loading and retry states
}
```

Pass `dictionary` if you already hold one. `parentActions={(parent) => …}` adds header controls to each parent panel (e.g. "load from collection"). Children render inside the calculator's provider, so `useCalculator()` works there, e.g. to `loadGenetics('sire', animal.genetics)` from a deep link.

The pieces can also be used on their own:

| Export                                   | What it is                                                                       |
| ---------------------------------------- | -------------------------------------------------------------------------------- |
| `CalculatorProvider` / `useCalculator()` | Pairing state, results and actions for the components below it                   |
| `useCalculatorController(dictionary)`    | The same, as a plain hook                                                        |
| `useDictionary(options?)`                | `loading` / `ready` / `error` with `retry()`; one request per URL per page       |
| `ParentPanel`, `Results`                 | One parent's trait input, and the results, bound to the provider                 |
| `TraitPicker`                            | Context-free trait search + selected list; also suits an "edit animal" form      |
| `OutcomeList`                            | Context-free list of folded outcomes, with `renderActions` / `renderCombo` hooks |
| `MorphChip`, `GeneticsChips`             | A trait chip, and an animal's stored genetics as chips                           |

### Styling

Components ship unstyled. Each element carries a stable `mkc-*` class, and state appears as attributes (`data-inheritance`, `data-parent`, `data-lethal`, `data-sex`, `aria-selected`). Then either:

- import `styles.css` and theme it by overriding the `--mkc-*` variables (light and dark included), or
- skip it and pass your own classes through each component's `className` and `classNames` slots, e.g. `<TraitPicker classNames={{ input: 'h-11 rounded-xl border' }} />`.

`renderZygosity` on `TraitPicker` / `ParentPanel` swaps the default radio group for your own segmented control. `renderCombo` on `OutcomeList` / `Results` wraps a combo chip, for example in your own tooltip.

### Playground

```bash
npm run playground   # Vite on http://localhost:5199, running against src/
```

## Core usage

```ts
import {
  buildAlleleList,
  calculate,
  calculatorReducer,
  createCalculatorState,
  loadDictionary,
  possHetPercent,
  traitFromSuggestion,
} from '@trailofdad/morphkit-calculator';

const dict = await loadDictionary(); // pinned morphkit-dictionary release
const alleles = buildAlleleList(dict);
const pick = (id: string) => traitFromSuggestion(alleles.find((a) => a.alleleId === id)!);

let state = createCalculatorState();
state = calculatorReducer(state, { type: 'addTrait', parent: 'sire', trait: pick('pastel') });
state = calculatorReducer(state, { type: 'addTrait', parent: 'dam', trait: pick('spider') });

const result = calculate(state, dict);
if (result.status === 'ok') {
  for (const o of result.outcomes) {
    console.log(o.comboName ?? o.phenotypeNames.join(' '), o.percentageProbability, o.isLethal);
    for (const h of o.possibleHets) console.log(`  ${possHetPercent(h.probability)}% het`, h);
  }
}
```

Lower-level pieces are exported too:

- `runPairing` / `calcPairing` take parent states or raw `LocusInput[]` genotypes.
- `fromLocusInputs` loads stored genetics into selections.
- `resolveTargetGenotype` carries a grouped outcome forward as a new parent.
- `morphTag`, `traitLabel`, `describeCombo` and `comboParts` produce labels.
- `searchAlleles` ranks alleles for a query by name, then alias, then gene name (so "piebald" finds Pied).

### Loading the dictionary

`loadDictionary()` fetches a pinned morphkit-dictionary release from jsDelivr (`DEFAULT_DICTIONARY_VERSION`). Pass `{ version }`, `{ url }` or `{ fetch }` to override it. Every failure (network, HTTP status, a payload that isn't a dictionary) throws a `DictionaryLoadError`, so the caller can show an error state. You can also pass in any `MorphkitDictionary` you already hold.

## Development

```bash
npm install
npm test           # vitest
npm run typecheck
npm run lint
npm run build      # tsup → dist/ (ESM + CJS + .d.ts, plus styles.css)
```

Tests run offline against a pinned copy of the dictionary in `tests/fixtures/`. React tests run in jsdom.

Releases are tag-driven. Bump `version` with `npm version`, then push the commit and the `v*` tag. CI stages the release on npm via trusted publishing, and a maintainer approves it with `npm stage approve <stage-id>`.

## License

MIT
