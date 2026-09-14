import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));

export default {
  build: {
    emptyOutDir: true,
    outDir: resolve(root, 'dist/cli'),
    target: 'es2022',
    sourcemap: false,
    minify: false,
    lib: {
      entry: resolve(root, 'cli/browser-entry.ts'),
      name: 'FocusTraceCliBrowser',
      formats: ['iife'],
      fileName: () => 'browser-scanner.js',
    },
  },
};
