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
const CHROME_WEB_STORE_URL = 'https://chromewebstore.google.com/detail/focustrace/efmfklamjafbknbmadpfmlbhobnoffnn';

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
    const checklistPath = resolve(process.cwd(), 'docs/RELEASE_CHECKLIST.md');
    const storeSubmissionPath = resolve(process.cwd(), 'docs/STORE_SUBMISSION.md');

    expect(existsSync(releaseNotesPath)).toBe(true);
    expect(existsSync(changelogPath)).toBe(true);
    expect(existsSync(checklistPath)).toBe(true);
    expect(existsSync(storeSubmissionPath)).toBe(true);

    const releaseNotes = readFileSync(releaseNotesPath, 'utf8');
    const changelog = readFileSync(changelogPath, 'utf8');
    const checklist = readFileSync(checklistPath, 'utf8');
    const storeSubmission = readFileSync(storeSubmissionPath, 'utf8');

    expect(releaseNotes).toContain(`# FocusTrace ${packageJson.version}`);
    expect(changelog).toContain(`## ${packageJson.version}`);
    expect(checklist).toContain(`Current release candidate: **${packageJson.version}**.`);
    expect(checklist).toContain(`the release version is **${packageJson.version}**`);
    expect(checklist).toContain(`**\`v${packageJson.version}\`**`);
    expect(storeSubmission).toContain(`Current release candidate: **${packageJson.version}**.`);
    expect(storeSubmission).toContain(`- Version: ${packageJson.version}`);
    expect(storeSubmission).toContain(`production ZIP for ${packageJson.version}`);
    expect(storeSubmission).toContain(`\`v${packageJson.version}\``);
  });

  it('keeps the official Chrome Web Store link aligned across both READMEs', () => {
    const readme = readFileSync(resolve(process.cwd(), 'README.md'), 'utf8');
    const readmeEs = readFileSync(resolve(process.cwd(), 'README.es.md'), 'utf8');

    expect(readme).toContain(`](${CHROME_WEB_STORE_URL})`);
    expect(readmeEs).toContain(`](${CHROME_WEB_STORE_URL})`);
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
