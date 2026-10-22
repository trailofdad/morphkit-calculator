import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const src = (path: string): string => fileURLToPath(new URL(`../src/${path}`, import.meta.url));

// Runs against the source, not dist, so edits show up instantly.
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [react()],
  resolve: {
    alias: [
      { find: '@trailofdad/morphkit-calculator/react', replacement: src('react/index.ts') },
      { find: '@trailofdad/morphkit-calculator/styles.css', replacement: src('styles.css') },
      { find: '@trailofdad/morphkit-calculator', replacement: src('index.ts') },
    ],
  },
  server: { port: 5199 },
});
