import { builtinModules } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const nodeBuiltins = new Set([...builtinModules, ...builtinModules.map((name) => `node:${name}`)]);

export default {
  build: {
    emptyOutDir: false,
    outDir: resolve(root, 'dist/cli'),
    target: 'node22',
    sourcemap: false,
    minify: false,
    lib: {
      entry: resolve(root, 'cli/index.ts'),
      formats: ['es'],
      fileName: () => 'focustrace.mjs',
    },
    rollupOptions: {
      external: (id: string) => id === '@playwright/test' || nodeBuiltins.has(id),
    },
  },
};
