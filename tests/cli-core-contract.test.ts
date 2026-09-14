import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  RULES as CORE_RULES,
  renderVersionedExport,
  runAuditCore,
} from '../lib/core';
import { RULES } from '../shared/rule-catalog';

describe('reusable core architecture contract', () => {
  it('exposes the exact shared rule catalog and serialization contracts', () => {
    expect(CORE_RULES).toBe(RULES);
    expect(typeof runAuditCore).toBe('function');
    expect(typeof renderVersionedExport).toBe('function');
  });

  it('makes extension and CLI execute the same scanner implementation', () => {
    const cliSource = readFileSync(new URL('../cli/browser-entry.ts', import.meta.url), 'utf8');
    const extensionSource = readFileSync(new URL('../entrypoints/runtime.content.ts', import.meta.url), 'utf8');

    expect(cliSource).toContain("import { runFocusTraceScan } from '../lib/audit/scan';");
    expect(extensionSource).toContain('runFocusTraceScan');
    expect(cliSource).not.toMatch(/function\s+runFocusTraceScan\s*\(/);
  });
});
