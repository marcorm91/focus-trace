import { basename, dirname, resolve } from 'node:path';
import { rmSync } from 'node:fs';

const workspaceRoot = resolve(process.cwd());
const outputRoot = resolve(workspaceRoot, '.output');

if (basename(outputRoot) !== '.output' || dirname(outputRoot) !== workspaceRoot) {
  throw new Error(`Refusing to clean unexpected build path: ${outputRoot}`);
}

rmSync(outputRoot, { recursive: true, force: true });
console.log(`Removed build output: ${outputRoot}`);
