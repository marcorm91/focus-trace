import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { manifestForBrowser } from '../wxt.config';

type PackageManifest = {
  version: string;
  private: boolean;
  license: string;
  scripts?: Record<string, string>;
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

const chromeManifest = manifestForBrowser('chrome');
const edgeManifest = manifestForBrowser('edge');
const firefoxManifest = manifestForBrowser('firefox');
const OPTIONAL_HOSTS = ['http://*/*', 'https://*/*', '<all_urls>'];

describe('v0.2.1 release contract', () => {
  it('keeps package, lockfile and browser manifests on the same version', () => {
    expect(chromeManifest.version).toBe(packageJson.version);
    expect(edgeManifest.version).toBe(packageJson.version);
    expect(firefoxManifest.version).toBe(packageJson.version);
    expect(packageLock.version).toBe(packageJson.version);
    expect(packageLock.packages?.['']?.version).toBe(packageJson.version);
    expect(packageJson.version).toBe('0.2.1');
  });

  it('keeps the committed dependency lock aligned with package.json', () => {
    expect(packageLock.lockfileVersion).toBe(3);
    expect(packageLock.packages?.['']?.dependencies).toEqual(packageJson.dependencies);
    expect(packageLock.packages?.['']?.devDependencies).toEqual(packageJson.devDependencies);
  });

  it('ships release documentation for the exact package version', () => {
    const releaseNotesPath = resolve(process.cwd(), `docs/RELEASE_NOTES_${packageJson.version}.md`);
    const changelogPath = resolve(process.cwd(), 'CHANGELOG.md');

    expect(existsSync(releaseNotesPath)).toBe(true);
    expect(existsSync(changelogPath)).toBe(true);
    expect(readFileSync(releaseNotesPath, 'utf8')).toContain(`# FocusTrace ${packageJson.version}`);
    expect(readFileSync(changelogPath, 'utf8')).toContain(`## ${packageJson.version}`);
  });

  it('keeps Chromium production permissions minimal and page/screenshot access optional', () => {
    for (const manifest of [chromeManifest, edgeManifest]) {
      expect(manifest.permissions).toEqual([
        'activeTab',
        'scripting',
        'storage',
        'sidePanel',
      ]);
      expect(manifest.host_permissions).toBeUndefined();
      expect(manifest.optional_host_permissions).toEqual(OPTIONAL_HOSTS);
      expect(manifest.minimum_chrome_version).toBe('114');
      expect(manifest.browser_specific_settings).toBeUndefined();
    }
  });

  it('keeps Firefox MV3 permissions, optional hosts and Gecko metadata explicit', () => {
    expect(firefoxManifest.permissions).toEqual([
      'activeTab',
      'scripting',
      'storage',
    ]);
    expect(firefoxManifest.permissions).not.toContain('sidePanel');
    expect(firefoxManifest.host_permissions).toBeUndefined();
    expect(firefoxManifest.optional_permissions).toEqual(OPTIONAL_HOSTS);
    expect(firefoxManifest.minimum_chrome_version).toBeUndefined();
    expect(firefoxManifest.browser_specific_settings?.gecko).toMatchObject({
      id: 'focustrace@focus-mode.app',
      strict_min_version: '115.0',
      data_collection_permissions: {
        required: ['none'],
      },
    });
  });

  it('pins Firefox development, build and packaging commands to Manifest V3', () => {
    expect(packageJson.scripts?.['dev:firefox']).toContain('--mv3');
    expect(packageJson.scripts?.['build:firefox']).toContain('--mv3');
    expect(packageJson.scripts?.['zip:firefox']).toContain('--mv3');
    expect(packageJson.scripts?.['release:check']).toContain('build:firefox');
  });

  it('keeps the release package private and GPL-3.0-only', () => {
    expect(packageJson.private).toBe(true);
    expect(packageJson.license).toBe('GPL-3.0-only');
  });
});
