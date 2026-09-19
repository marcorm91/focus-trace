import { describe, expect, it } from 'vitest';
import type { SiteAuditResult } from '../lib/site-audit/model';
import {
  FOCUSTRACE_EXPORT_SCHEMA_VERSION,
  buildSessionExport,
  buildSiteAuditExport,
  parseVersionedJson,
  renderVersionedCsv,
  renderVersionedHtml,
  renderVersionedJson,
  renderVersionedJUnit,
  renderVersionedSarif,
  sanitizeExportUrl,
} from '../lib/report/versioned-export';
import type { RuntimeEvent, ScanIssue, ScanResult } from '../shared/types';

function finding(overrides: Partial<ScanIssue> = {}): ScanIssue {
  return {
    id: 'finding-1',
    ruleId: 'FT-WCAG-003',
    title: 'Botón “Guardar” sin nombre <visible>',
    description: 'Provide an accessible name & keep it meaningful.',
    severity: 'serious',
    outcome: 'fail',
    targets: ['button[data-action="save"]'],
    evidence: 'Computed name = ""; texto: áéíóú 日本語',
    references: [{
      type: 'WCAG',
      id: '4.1.2',
      label: 'Name, Role, Value',
      url: 'https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html',
      level: 'A',
      status: 'normative',
    }],
    ...overrides,
  };
}

function scan(issues: ScanIssue[] = [finding()]): ScanResult {
  return {
    engine: 'FocusTrace Rules',
    standard: 'WCAG 2.2',
    url: 'https://example.test/account?token=secret&utm_source=test&view=compact#private-account',
    title: 'Cuenta “José”',
    scannedAt: 100,
    scope: { type: 'page' },
    issues,
    review: [finding({ id: 'review-1', ruleId: 'FT-WCAG-REVIEW', outcome: 'review', severity: 'moderate', title: '=Needs human review' })],
    warnings: [finding({ id: 'warning-1', ruleId: 'FT-WARNING', outcome: 'warning', severity: 'minor', title: 'Warning' })],
    headings: [],
    passes: 8,
    rulesRun: 11,
  };
}

const runtimeReview: RuntimeEvent = {
  id: 'runtime-1',
  timestamp: 200,
  kind: 'focus-lost',
  severity: 'serious',
  title: 'Focus moved unexpectedly',
  detail: 'Focus fell back to body.',
  outcome: 'review',
  ruleId: 'FT-RUNTIME-FOCUS',
  pageUrl: 'https://other.example.test/checkout?token=runtime-secret#payment',
  element: { tag: 'button', selector: '#save', name: 'Guardar' },
  references: [{
    type: 'WCAG',
    id: '2.4.3',
    label: 'Focus Order',
    url: 'https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html',
  }],
};

function siteAudit(): SiteAuditResult {
  const pageScan = scan();
  return {
    origin: 'https://example.test/',
    generatedAt: 300,
    discovery: {
      origin: 'https://example.test',
      source: 'mixed',
      urls: ['https://example.test/account'],
      sitemapUrls: ['https://example.test/sitemap.xml'],
      truncated: false,
      scope: {
        mode: 'automatic',
        maxDiscoveredUrls: 500,
        maxScannedPages: 30,
        samplesPerFamily: 3,
        exclusionPrefixes: ['/admin'],
      },
    },
    routeFamilies: [{ id: 'family-1', pattern: '/account', urls: ['https://example.test/account'], sampleUrls: ['https://example.test/account'] }],
    pages: [{ url: pageScan.url, routeFamilyId: 'family-1', scan: pageScan }],
    templates: [{
      id: 'template-1',
      label: 'Account',
      routePatterns: ['/account'],
      discoveredUrls: ['https://example.test/account'],
      sampledPages: [{ url: pageScan.url, routeFamilyId: 'family-1', scan: pageScan }],
      findings: [],
      failures: 1,
      reviews: 1,
      warnings: 1,
    }],
    scannedPages: 1,
    failedPages: 0,
  };
}

function csvColumnCount(row: string): number {
  let columns = 1;
  let quoted = false;
  for (let index = 0; index < row.length; index += 1) {
    if (row[index] === '"') {
      if (quoted && row[index + 1] === '"') {
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (row[index] === ',' && !quoted) {
      columns += 1;
    }
  }
  return columns;
}

describe('versioned exports', () => {
  it('round-trips a schema-versioned session envelope and redacts query/fragment values', () => {
    const envelope = buildSessionExport({ scan: scan(), events: [runtimeReview], generatedAt: 500 });
    expect(envelope.schemaVersion).toBe(FOCUSTRACE_EXPORT_SCHEMA_VERSION);
    expect(envelope.kind).toBe('session');
    expect(envelope.generatedAt).toBe(500);
    expect(envelope.subject.url).toBe('https://example.test/account?[redacted]#[redacted]');
    expect(envelope.context).toEqual({
      scope: { type: 'page' },
      coverage: { passes: 8, rulesRun: 11, staticFindings: 3, runtimeFindings: 1 },
    });
    expect(envelope.summary).toEqual({ findings: 4, failures: 1, reviews: 2, warnings: 1 });
    expect(envelope.findings[0]?.remediation).toContain('Give the button an accessible name');
    expect(envelope.findings.at(-1)).toMatchObject({ source: 'runtime', outcome: 'review', ruleId: 'FT-RUNTIME-FOCUS' });
    expect(envelope.findings.at(-1)?.pageUrl).toBe('https://other.example.test/checkout?[redacted]#[redacted]');
    expect(envelope.findings.at(-1)?.remediation).toContain('WCAG 2.4.3');

    const jsonText = renderVersionedJson(envelope);
    const roundTrip = parseVersionedJson(jsonText);
    expect(roundTrip).toEqual(envelope);
    expect(roundTrip.findings[0]?.references[0]).toMatchObject({ type: 'WCAG', id: '4.1.2' });
    expect(jsonText).not.toContain('token=secret');
    expect(jsonText).not.toContain('view=compact');
    expect(jsonText).not.toContain('private-account');
    expect(jsonText).not.toContain('runtime-secret');
    expect(() => parseVersionedJson('{"schemaVersion":"2.0.0"}')).toThrow(/schema/i);
  });

  it('exports UTF-8 CSV with context, aligned records, BOM, CRLF, quoting and formula protection', () => {
    const csv = renderVersionedCsv(buildSessionExport({ scan: scan(), events: [] }));
    expect(csv.charCodeAt(0)).toBe(0xFEFF);
    expect(csv).toContain('\r\n');
    expect(csv).toContain('"summary","1.0.0","session","WCAG 2.2"');
    expect(csv).toContain('"{""type"":""page""}"');
    expect(csv).toContain('"Botón “Guardar” sin nombre <visible>"');
    expect(csv).toContain('"Computed name = """"; texto: áéíóú 日本語"');
    expect(csv).toContain('"Give the button an accessible name');
    expect(csv).toContain('"\'=Needs human review"');
    expect(csv).not.toContain('token=secret');
    expect(csv).not.toContain('private-account');

    const rows = csv.slice(1).trimEnd().split('\r\n');
    expect(rows).toHaveLength(5);
    expect(rows.every((row) => csvColumnCount(row) === 24)).toBe(true);
  });

  it('escapes standalone HTML without losing context, remediation or Unicode', () => {
    const html = renderVersionedHtml(buildSessionExport({ scan: scan(), events: [] }));
    expect(html).toContain('<!doctype html>');
    expect(html).toContain('Cuenta “José”');
    expect(html).toContain('WCAG 2.2');
    expect(html).toContain('&quot;type&quot;:&quot;page&quot;');
    expect(html).toContain('&lt;visible&gt;');
    expect(html).toContain('accessible name &amp; keep it meaningful');
    expect(html).toContain('Give the button an accessible name');
    expect(html).toContain('WCAG 4.1.2');
    expect(html).not.toContain('<visible>');
    expect(html).not.toContain('private-account');
  });

  it('emits GitHub-compatible SARIF 2.1.0 while keeping review and warning results non-failing', () => {
    const sarif = JSON.parse(renderVersionedSarif(buildSessionExport({ scan: scan(), events: [runtimeReview] })));
    expect(sarif.version).toBe('2.1.0');
    expect(sarif.$schema).toContain('sarif-2.1.0');
    expect(sarif.runs[0].tool.driver.name).toBe('FocusTrace');
    expect(sarif.runs[0].tool.driver.rules.length).toBeGreaterThan(0);
    expect(sarif.runs[0].properties).toMatchObject({
      focusTraceSchemaVersion: '1.0.0',
      focusTraceKind: 'session',
      standard: 'WCAG 2.2',
    });
    expect(sarif.runs[0].properties.scope).toContain('"type":"page"');
    expect(typeof sarif.runs[0].properties.summary).toBe('string');
    expect(sarif.runs[0].results.every((result: { locations?: unknown[] }) => result.locations?.length)).toBe(true);

    const failure = sarif.runs[0].results.find((result: { properties: { focusTraceOutcome: string } }) => result.properties.focusTraceOutcome === 'fail');
    const review = sarif.runs[0].results.find((result: { properties: { focusTraceOutcome: string } }) => result.properties.focusTraceOutcome === 'review');
    const warning = sarif.runs[0].results.find((result: { properties: { focusTraceOutcome: string } }) => result.properties.focusTraceOutcome === 'warning');
    expect(failure.level).toBe('error');
    expect(failure.properties.remediation).toContain('Give the button an accessible name');
    expect(review.level).toBe('note');
    expect(warning.level).toBe('note');
    expect(JSON.stringify(sarif)).not.toContain('private-account');
  });

  it('uses JUnit failures only for deterministic FAIL and preserves REVIEW/WARNING plus provenance', () => {
    const junit = renderVersionedJUnit(buildSessionExport({ scan: scan(), events: [runtimeReview] }));
    expect(junit).toContain('tests="4" failures="1" errors="0" skipped="3"');
    expect(junit).toContain('<property name="standard" value="WCAG 2.2"/>');
    expect(junit).toContain('<property name="scope" value="{&quot;type&quot;:&quot;page&quot;}"/>');
    expect(junit).toContain('name="standards" value="WCAG 4.1.2"');
    expect(junit).toContain('name="remediation" value="Give the button an accessible name');
    expect(junit.match(/<failure /g)).toHaveLength(1);
    expect(junit.match(/<skipped message="REVIEW"\/>/g)).toHaveLength(2);
    expect(junit.match(/<skipped message="WARNING"\/>/g)).toHaveLength(1);
    expect(junit).toContain('Botón “Guardar” sin nombre &lt;visible&gt;');
    expect(junit).not.toContain('private-account');
  });

  it('normalizes Site Audit pages into the same v1 contract with template, limits and coverage metadata', () => {
    const envelope = buildSiteAuditExport(siteAudit());
    expect(envelope.kind).toBe('site-audit');
    expect(envelope.summary).toEqual({ findings: 3, failures: 1, reviews: 1, warnings: 1 });
    expect(envelope.findings[0]).toMatchObject({ source: 'site-audit', template: 'Account' });
    expect(envelope.findings[0]?.remediation).toContain('Give the button an accessible name');
    expect(envelope.context.scope).toMatchObject({
      mode: 'automatic',
      maxDiscoveredUrls: 500,
      maxScannedPages: 30,
      samplesPerFamily: 3,
    });
    expect(envelope.context.coverage).toMatchObject({
      discoveredUrls: 1,
      routeFamilies: 1,
      sampledPages: 1,
      scannedPages: 1,
      failedPages: 0,
    });
    expect(envelope.metadata).toMatchObject({ discoverySource: 'mixed' });
  });

  it('stays linear and bounded for large result sets', () => {
    const many = Array.from({ length: 5000 }, (_, index) => finding({ id: `finding-${index}`, title: `Finding ${index}` }));
    const envelope = buildSessionExport({ scan: { ...scan([]), issues: many, review: [], warnings: [] }, events: [] });
    expect(envelope.summary.findings).toBe(5000);
    const csv = renderVersionedCsv(envelope);
    const sarif = JSON.parse(renderVersionedSarif(envelope));
    expect(csv.split('\r\n')).toHaveLength(5003);
    expect(sarif.runs[0].results).toHaveLength(5000);
    expect(sarif.runs[0].tool.driver.rules).toHaveLength(1);
  });

  it('uses the shared privacy fallback for invalid URL-like strings', () => {
    expect(sanitizeExportUrl('https://user:pass@example.test/path?session=abc&ok=1#private')).toBe('https://example.test/path?[redacted]#[redacted]');
    expect(sanitizeExportUrl('http://[invalid-secret')).toBe('[redacted-url]');
  });
});
