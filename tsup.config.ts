import type { Plugin } from 'esbuild';
import { defineConfig } from 'tsup';

const PACKAGE = '@trailofdad/morphkit-calculator';

/**
 * The React entry imports the core via relative `../index`. Rewrite that to the
 * package's own name and keep it external, so `dist/react.*` reuses the core
 * build instead of bundling a second copy (which would duplicate the dictionary
 * index cache and break `instanceof DictionaryLoadError`).
 */
const coreAsSelfReference: Plugin = {
  name: 'core-as-self-reference',
  setup(build) {
    build.onResolve({ filter: /^(\.\.\/)+index$/ }, () => ({ path: PACKAGE, external: true }));
  },
};

export default defineConfig([
  {
    entry: { index: 'src/index.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    clean: true,
    target: 'es2022',
    // morphkit is a peer: consumers supply it, so it must never be bundled in.
    external: ['@trailofdad/morphkit'],
  },
  {
    entry: { react: 'src/react/index.ts' },
    format: ['esm', 'cjs'],
    dts: { compilerOptions: { paths: { [PACKAGE]: ['./src/index.ts'] } } },
    sourcemap: true,
    target: 'es2022',
    external: ['@trailofdad/morphkit', 'react', 'react/jsx-runtime', PACKAGE],
    esbuildPlugins: [coreAsSelfReference],
    // Next.js App Router: these components hold state, so mark them client-only.
    banner: { js: '"use client";' },
  },
]);
