import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const viteBin = resolve(root, 'node_modules/vite/bin/vite.js');
const configs = ['vite.cli.browser.config.ts', 'vite.cli.node.config.ts'];

for (const config of configs) {
  const result = spawnSync(process.execPath, [viteBin, 'build', '--config', config], {
    cwd: root,
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
