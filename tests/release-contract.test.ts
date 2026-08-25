import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import config from '../wxt.config';

const packageJson = JSON.parse(
  readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'),
) as { version: string; private: boolean };

describe('v0.1.0 release contract', () => {
  it('keeps package and extension manifest versions synchronized', () => {
    expect(config.manifest?.version).toBe(packageJson.version);
    expect(packageJson.version).toBe('0.1.0');
  });

  it('keeps production permissions minimal and explicit', () => {
    expect(config.manifest?.permissions).toEqual([
      'activeTab',
      'scripting',
      'storage',
      'sidePanel',
    ]);
    expect(config.manifest?.host_permissions).toBeUndefined();
  });

  it('keeps npm publishing disabled for the extension package', () => {
    expect(packageJson.private).toBe(true);
  });
});
