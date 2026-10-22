# @trailofdad/morphkit-calculator

A ball python breeding calculator built on [morphkit](https://github.com/trailofdad/morphkit) and the [morphkit-dictionary](https://github.com/trailofdad/morphkit-dictionary).

morphkit does the genetics: Punnett squares, sex linkage, combos, lethals. This package is the calculator layer on top of it:

- parent and trait selection, including allelic-group compounds (Yellowbelly + Asphalt) and Banana male-maker / female-maker
- zygosity options per inheritance type
- outcomes grouped one row per visual phenotype
- the "66% Het" convention
- labels, combo descriptions and short names
- a framework-free state reducer

The core has no React or DOM dependency. A React layer (`/react`) is planned.

## Install

```bash
npm install @trailofdad/morphkit-calculator @trailofdad/morphkit
```

`@trailofdad/morphkit` is a peer dependency.

## Usage

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

### Loading the dictionary

`loadDictionary()` fetches a pinned morphkit-dictionary release from jsDelivr (`DEFAULT_DICTIONARY_VERSION`). Pass `{ version }`, `{ url }` or `{ fetch }` to override it. Every failure (network, HTTP status, a payload that isn't a dictionary) throws a `DictionaryLoadError`, so the caller can show an error state. You can also pass in any `MorphkitDictionary` you already hold.

## Development

```bash
npm install
npm test           # vitest
npm run typecheck
npm run lint
npm run build      # tsup → dist/ (ESM + CJS + .d.ts)
```

Tests run offline against a pinned copy of the dictionary in `tests/fixtures/`.

Releases are tag-driven: bump `version`, commit, then push a `v*` tag. CI publishes to npm via OIDC.

## License

MIT
