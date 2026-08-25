import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import config from '../wxt.config';

const packageJson = JSON.parse(
  readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'),
) as { version: string; private: boolean };

const configuredManifest = config.manifest;
if (!configuredManifest || typeof configuredManifest === 'function' || configuredManifest instanceof Promise) {
  throw new Error('Release contract expects a static production manifest configuration.');
}
const manifest = configuredManifest;

describe('v0.1.0 release contract', () => {
  it('keeps package and extension manifest versions synchronized', () => {
    expect(manifest.version).toBe(packageJson.version);
    expect(packageJson.version).toBe('0.1.0');
  });

  it('keeps production permissions minimal and explicit', () => {
    expect(manifest.permissions).toEqual([
      'activeTab',
      'scripting',
      'storage',
      'sidePanel',
    ]);
    expect(manifest.host_permissions).toBeUndefined();
  });

  it('keeps npm publishing disabled for the extension package', () => {
    expect(packageJson.private).toBe(true);
  });
});
