import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const executable = join(
  process.cwd(),
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'wxt.cmd' : 'wxt',
);

const result = spawnSync(executable, ['build'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    FOCUSTRACE_E2E: '1',
  },
  stdio: 'inherit',
});

if (result.error) throw result.error;
process.exit(result.status ?? 1);
