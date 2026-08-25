import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import config from '../wxt.config';

type PackageManifest = {
  version: string;
  private: boolean;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

type PackageLock = {
  version: string;
  lockfileVersion: number;
  packages?: Record<string, {
    version?: string;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  }>;
};

const packageJson = JSON.parse(
  readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'),
) as PackageManifest;

const packageLock = JSON.parse(
  readFileSync(resolve(process.cwd(), 'package-lock.json'), 'utf8'),
) as PackageLock;

const configuredManifest = config.manifest;
if (!configuredManifest || typeof configuredManifest === 'function' || configuredManifest instanceof Promise) {
  throw new Error('Release contract expects a static production manifest configuration.');
}
const manifest = configuredManifest;

describe('v0.1.0 release contract', () => {
  it('keeps package, lockfile and extension manifest versions synchronized', () => {
    expect(manifest.version).toBe(packageJson.version);
    expect(packageLock.version).toBe(packageJson.version);
    expect(packageLock.packages?.['']?.version).toBe(packageJson.version);
    expect(packageJson.version).toBe('0.1.0');
  });

  it('keeps the committed dependency lock aligned with package.json', () => {
    expect(packageLock.lockfileVersion).toBe(3);
    expect(packageLock.packages?.['']?.dependencies).toEqual(packageJson.dependencies);
    expect(packageLock.packages?.['']?.devDependencies).toEqual(packageJson.devDependencies);
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
