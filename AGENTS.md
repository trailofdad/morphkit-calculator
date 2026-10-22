# morphkit-calculator: agent notes

The calculator layer between `@trailofdad/morphkit` (the genetics engine) and apps such as Morph Ranch.

## Rules

- **No genetics math here.** Punnett squares, sex linkage, combos, lethals and masking rules belong to morphkit. This package only builds engine inputs and presents engine outputs. If the maths looks wrong, fix it in morphkit.
- **IDs, never names.** Traits are carried as dictionary `locusId` + `alleleId`. Some names are ambiguous across loci, so never resolve morph names to build a genotype.
- **One `LocusInput` per locus.** Two alleles on one locus form a compound `[a, b]` (`selectionsToGenotype`). Never send two entries for the same locus to morphkit; the engine then computes the wrong pairing.
- **The core stays framework-free.** `src/core` and `src/index.ts` must not import React or touch the DOM. The planned React layer goes under `src/react` with its own entry point.
- **Keep morphkit as a peer dependency** and external in `tsup.config.ts`. Never bundle it.
- **The dictionary is pinned.** Bump `DEFAULT_DICTIONARY_VERSION` and `tests/fixtures/dictionary.v*.json` together, deliberately.

## Commands

```bash
npm test && npm run typecheck && npm run lint && npm run build
```
