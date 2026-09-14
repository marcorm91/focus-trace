import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('expanded Site Audit UI contracts', () => {
  it('exposes bounded discovery, sampling and exclusion controls', () => {
    const app = source('entrypoints/site-audit/main.tsx');
    expect(app).toContain('Discovery limit');
    expect(app).toContain('Pages to scan');
    expect(app).toContain('Samples / family');
    expect(app).toContain('Exclude path prefixes, one per line');
    expect(app).toContain('normalizeSiteAuditExclusionPrefixes');
    expect(app).toContain('maxDiscoveredUrls: discoveryLimit');
  });

  it('provides a current-session mode without credential fields', () => {
    const app = source('entrypoints/site-audit/main.tsx');
    expect(app).toContain("scopeTabProps('session')");
    expect(app).toContain('id="site-scope-panel-session"');
    expect(app).toContain("hidden={mode !== 'session'}");
    expect(app).toContain('never asks for or stores a password, cookie or session token');
    expect(app).not.toMatch(/type=["']password["']/i);
  });

  it('surfaces discovery reasons, sample reasons and baseline comparison', () => {
    const report = source('entrypoints/site-audit/SiteAuditReport.tsx');
    expect(report).toContain('Why pages were included or excluded');
    expect(report).toContain('first representative for this route family');
    expect(report).toContain('Changes since the previous Site Audit');
    expect(report).toContain('Observed canonical aliases');
    expect(report).toContain('starts a new comparison baseline instead of claiming missing findings were resolved');
  });
});
