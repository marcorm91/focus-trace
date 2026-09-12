import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('ElementInternals bridge registration contract', () => {
  it('keeps the bridge runtime-only, MAIN-world and document-start', () => {
    const entrypoint = source('entrypoints/element-internals-bridge.content.ts');
    const registration = source('lib/extension/element-internals-registration.ts');

    expect(entrypoint).toContain("registration: 'runtime'");
    expect(entrypoint).toContain("runAt: 'document_start'");
    expect(entrypoint).toContain("world: 'MAIN'");
    expect(registration).toContain("runAt: 'document_start'");
    expect(registration).toContain("world: 'MAIN'");
    expect(registration).toContain('registerContentScripts');
  });

  it('registers only after the existing page-access request succeeds', () => {
    const contents = source('lib/extension/page-access.ts');
    const request = contents.indexOf('browser.permissions.request');
    const denied = contents.indexOf('if (!granted) return false');
    const registration = contents.indexOf('ensureElementInternalsBridgeRegistered');

    expect(request).toBeGreaterThanOrEqual(0);
    expect(denied).toBeGreaterThan(request);
    expect(registration).toBeGreaterThan(denied);
  });

  it('does not add any new manifest permission for ElementInternals support', () => {
    const manifest = source('wxt.config.ts');
    expect(manifest).not.toContain('ElementInternals');
    expect(manifest).toContain("['activeTab', 'scripting', 'storage']");
    expect(manifest).toContain("['activeTab', 'scripting', 'storage', 'sidePanel']");
  });

  it('degrades to no bridge data when MAIN-world scripting is unsupported', () => {
    const registration = source('lib/extension/element-internals-registration.ts');
    expect(registration).toContain('return false;');
    expect(registration).toContain('Firefox versions before 128');
  });
});
