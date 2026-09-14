import type { SiteAuditResult } from '../site-audit/model';
import { remediationForIssue } from '../site-audit/remediation';
import { sanitizeRuntimeUrl } from '../runtime/url-privacy';
import type { RuntimeEvent, ScanIssue, ScanResult, Severity, StandardReference } from '../../shared/types';

export const FOCUSTRACE_EXPORT_SCHEMA_VERSION = '1.0.0' as const;
export const FOCUSTRACE_EXPORT_SCHEMA_ID = 'https://focus-mode.app/schemas/focustrace-export-v1.schema.json';

export type FocusTraceExportKind = 'session' | 'site-audit';
export type FocusTraceExportOutcome = 'fail' | 'review' | 'warning';
export type FocusTraceExportSource = 'scan' | 'runtime' | 'site-audit';

export interface FocusTraceExportReference {
  type: StandardReference['type'];
  id: string;
  label: string;
  url: string;
  level?: StandardReference['level'];
  status?: StandardReference['status'];
}

export interface FocusTraceExportFinding {
  id: string;
  ruleId: string;
  title: string;
  description: string;
  outcome: FocusTraceExportOutcome;
  severity: Severity;
  source: FocusTraceExportSource;
  target?: string;
  pageUrl?: string;
  template?: string;
  evidence?: string;
  remediation?: string;
  references: FocusTraceExportReference[];
  reviewState?: ScanIssue['reviewState'];
  lifecycleState?: 'new' | 'persistent' | 'changed';
  occurrenceCount?: number;
}

export interface FocusTraceExportSummary {
  findings: number;
  failures: number;
  reviews: number;
  warnings: number;
}

export interface FocusTraceExportContext {
  scope: Record<string, unknown>;
  coverage: Record<string, unknown>;
}

export interface FocusTraceExportEnvelopeV1 {
  $schema: typeof FOCUSTRACE_EXPORT_SCHEMA_ID;
  schemaVersion: typeof FOCUSTRACE_EXPORT_SCHEMA_VERSION;
  kind: FocusTraceExportKind;
  generatedAt: number;
  producer: {
    name: 'FocusTrace';
    standard: 'WCAG 2.2';
  };
  subject: {
    url?: string;
    origin?: string;
    title?: string;
  };
  context: FocusTraceExportContext;
  summary: FocusTraceExportSummary;
  findings: FocusTraceExportFinding[];
  metadata?: Record<string, unknown>;
}

interface LifecycleIssue extends ScanIssue {
  lifecycleState?: 'new' | 'persistent' | 'changed';
  occurrenceCount?: number;
}

export function sanitizeExportUrl(value: string | undefined): string | undefined {
  return value ? sanitizeRuntimeUrl(value) : undefined;
}

function runtimeRuleId(event: RuntimeEvent): string {
  return event.ruleId?.trim() || `FT-RUNTIME-${event.kind.toUpperCase().replace(/[^A-Z0-9]+/g, '-')}`;
}

function issueFinding(
  issue: LifecycleIssue,
  source: FocusTraceExportSource,
  pageUrl?: string,
  template?: string,
): FocusTraceExportFinding {
  const target = issue.targets[0] || issue.element?.selector;
  return {
    id: issue.id,
    ruleId: issue.ruleId,
    title: issue.title,
    description: issue.description,
    outcome: issue.outcome,
    severity: issue.severity,
    source,
    ...(target ? { target } : {}),
    ...(pageUrl ? { pageUrl: sanitizeExportUrl(pageUrl) } : {}),
    ...(template ? { template } : {}),
    ...(issue.evidence ? { evidence: issue.evidence } : {}),
    remediation: remediationForIssue(issue, 'en'),
    references: issue.references.map((reference) => ({ ...reference })),
    ...(issue.reviewState ? { reviewState: issue.reviewState } : {}),
    ...(issue.lifecycleState ? { lifecycleState: issue.lifecycleState } : {}),
    ...(issue.occurrenceCount != null ? { occurrenceCount: issue.occurrenceCount } : {}),
  };
}

function runtimeFinding(event: RuntimeEvent, pageUrl?: string): FocusTraceExportFinding | undefined {
  if (!event.outcome) return undefined;
  const ruleId = runtimeRuleId(event);
  const references = event.references ?? [];
  const target = event.element?.selector;
  const issue: ScanIssue = {
    id: event.id,
    ruleId,
    title: event.title,
    description: event.detail ?? event.title,
    severity: event.severity,
    outcome: event.outcome,
    targets: target ? [target] : [],
    ...(event.element ? { element: event.element } : {}),
    ...(event.detail ? { evidence: event.detail } : {}),
    references,
  };
  return {
    id: event.id,
    ruleId,
    title: event.title,
    description: event.detail ?? event.title,
    outcome: event.outcome,
    severity: event.severity,
    source: 'runtime',
    ...(target ? { target } : {}),
    ...(pageUrl ? { pageUrl: sanitizeExportUrl(pageUrl) } : {}),
    ...(event.detail ? { evidence: event.detail } : {}),
    remediation: remediationForIssue(issue, 'en'),
    references: references.map((reference) => ({ ...reference })),
  };
}

function scanFindings(scan: ScanResult, source: FocusTraceExportSource, template?: string): FocusTraceExportFinding[] {
  return [
    ...scan.issues.map((issue) => issueFinding(issue, source, scan.url, template)),
    ...scan.review.map((issue) => issueFinding(issue, source, scan.url, template)),
    ...(scan.warnings ?? []).map((issue) => issueFinding(issue, source, scan.url, template)),
  ];
}

function exportSummary(findings: FocusTraceExportFinding[]): FocusTraceExportSummary {
  let failures = 0;
  let reviews = 0;
  let warnings = 0;
  for (const finding of findings) {
    if (finding.outcome === 'fail') failures += 1;
    else if (finding.outcome === 'review') reviews += 1;
    else warnings += 1;
  }
  return { findings: findings.length, failures, reviews, warnings };
}

export function buildSessionExport({
  scan,
  events = [],
  generatedAt = Date.now(),
}: {
  scan: ScanResult;
  events?: RuntimeEvent[];
  generatedAt?: number;
}): FocusTraceExportEnvelopeV1 {
  const staticFindings = scanFindings(scan, 'scan');
  const runtimeFindings = events
    .map((event) => runtimeFinding(event, scan.url))
    .filter((finding): finding is FocusTraceExportFinding => Boolean(finding));
  const findings = [...staticFindings, ...runtimeFindings];
  return {
    $schema: FOCUSTRACE_EXPORT_SCHEMA_ID,
    schemaVersion: FOCUSTRACE_EXPORT_SCHEMA_VERSION,
    kind: 'session',
    generatedAt,
    producer: { name: 'FocusTrace', standard: 'WCAG 2.2' },
    subject: {
      url: sanitizeExportUrl(scan.url),
      title: scan.title,
    },
    context: {
      scope: { ...(scan.scope ?? { type: 'page' }) },
      coverage: {
        passes: scan.passes,
        rulesRun: scan.rulesRun,
        staticFindings: staticFindings.length,
        runtimeFindings: runtimeFindings.length,
      },
    },
    summary: exportSummary(findings),
    findings,
    metadata: { scannedAt: scan.scannedAt },
  };
}

function templateForPage(result: SiteAuditResult, pageUrl: string): string | undefined {
  return result.templates.find((template) => template.sampledPages.some((page) => page.url === pageUrl))?.label;
}

export function buildSiteAuditExport(
  result: SiteAuditResult,
  generatedAt = result.generatedAt,
): FocusTraceExportEnvelopeV1 {
  const findings = result.pages.flatMap((page) => page.scan
    ? scanFindings(page.scan, 'site-audit', templateForPage(result, page.url))
    : []);
  return {
    $schema: FOCUSTRACE_EXPORT_SCHEMA_ID,
    schemaVersion: FOCUSTRACE_EXPORT_SCHEMA_VERSION,
    kind: 'site-audit',
    generatedAt,
    producer: { name: 'FocusTrace', standard: 'WCAG 2.2' },
    subject: { origin: sanitizeExportUrl(result.origin) },
    context: {
      scope: result.discovery.scope
        ? { ...result.discovery.scope, exclusionPrefixes: [...result.discovery.scope.exclusionPrefixes] }
        : { mode: result.discovery.source },
      coverage: {
        discoveredUrls: result.discovery.urls.length,
        discoveryTruncated: result.discovery.truncated,
        routeFamilies: result.routeFamilies.length,
        sampledPages: result.pages.length,
        scannedPages: result.scannedPages,
        failedPages: result.failedPages,
      },
    },
    summary: exportSummary(findings),
    findings,
    metadata: {
      discoverySource: result.discovery.source,
      routeFamilies: result.routeFamilies.map((family) => ({
        id: family.id,
        pattern: family.pattern,
        discovered: family.urls.length,
        sampled: family.sampleUrls.length,
      })),
      ...(result.comparison ? { comparison: result.comparison } : {}),
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function parseVersionedJson(content: string): FocusTraceExportEnvelopeV1 {
  const parsed: unknown = JSON.parse(content);
  if (!isRecord(parsed)
    || parsed.$schema !== FOCUSTRACE_EXPORT_SCHEMA_ID
    || parsed.schemaVersion !== FOCUSTRACE_EXPORT_SCHEMA_VERSION
    || (parsed.kind !== 'session' && parsed.kind !== 'site-audit')
    || !isRecord(parsed.producer)
    || parsed.producer.name !== 'FocusTrace'
    || parsed.producer.standard !== 'WCAG 2.2'
    || !isRecord(parsed.subject)
    || !isRecord(parsed.context)
    || !isRecord(parsed.context.scope)
    || !isRecord(parsed.context.coverage)
    || !isRecord(parsed.summary)
    || !Array.isArray(parsed.findings)) {
    throw new Error('Unsupported or invalid FocusTrace export schema.');
  }
  return parsed as unknown as FocusTraceExportEnvelopeV1;
}

export function renderVersionedJson(envelope: FocusTraceExportEnvelopeV1): string {
  return `${JSON.stringify(envelope, null, 2)}\n`;
}

function csvCell(value: unknown): string {
  const text = value == null ? '' : String(value);
  const formulaSafe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${formulaSafe.replace(/"/g, '""')}"`;
}

function referenceList(references: FocusTraceExportReference[]): string {
  return references.map((reference) => `${reference.type} ${reference.id}`).join('; ');
}

function contextValue(value: Record<string, unknown>): string {
  return JSON.stringify(value);
}

export function renderVersionedCsv(envelope: FocusTraceExportEnvelopeV1): string {
  const header = [
    'recordType', 'schemaVersion', 'kind', 'standard', 'scope', 'coverage', 'failures', 'reviews', 'warnings',
    'outcome', 'severity', 'source', 'ruleId', 'title', 'description', 'pageUrl', 'template', 'target',
    'evidence', 'remediation', 'standards', 'reviewState', 'lifecycleState', 'occurrenceCount',
  ];
  const summaryRow = [
    'summary',
    envelope.schemaVersion,
    envelope.kind,
    envelope.producer.standard,
    contextValue(envelope.context.scope),
    contextValue(envelope.context.coverage),
    envelope.summary.failures,
    envelope.summary.reviews,
    envelope.summary.warnings,
    '',
    '',
    '',
    '',
    '',
    '',
    envelope.subject.url ?? envelope.subject.origin ?? '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
  ];
  const rows = envelope.findings.map((finding) => [
    'finding', envelope.schemaVersion, envelope.kind, envelope.producer.standard,
    contextValue(envelope.context.scope), contextValue(envelope.context.coverage),
    '', '', '',
    finding.outcome,
    finding.severity,
    finding.source,
    finding.ruleId,
    finding.title,
    finding.description,
    finding.pageUrl ?? envelope.subject.url ?? envelope.subject.origin ?? '',
    finding.template ?? '',
    finding.target ?? '',
    finding.evidence ?? '',
    finding.remediation ?? '',
    referenceList(finding.references),
    finding.reviewState ?? '',
    finding.lifecycleState ?? '',
    finding.occurrenceCount ?? '',
  ]);
  return `\uFEFF${[header, summaryRow, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')}\r\n`;
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function humanOutcome(outcome: FocusTraceExportOutcome): string {
  return outcome === 'fail' ? 'FAIL' : outcome === 'review' ? 'REVIEW' : 'WARNING';
}

export function renderVersionedHtml(envelope: FocusTraceExportEnvelopeV1): string {
  const subject = envelope.subject.title ?? envelope.subject.url ?? envelope.subject.origin ?? 'FocusTrace export';
  const rows = envelope.findings.map((finding) => `
      <tr data-outcome="${finding.outcome}">
        <td>${escapeHtml(humanOutcome(finding.outcome))}</td>
        <td>${escapeHtml(finding.severity)}</td>
        <td><code>${escapeHtml(finding.ruleId)}</code></td>
        <td>${escapeHtml(finding.title)}</td>
        <td>${escapeHtml(finding.description)}</td>
        <td>${escapeHtml(finding.pageUrl ?? '')}</td>
        <td>${escapeHtml(finding.template ?? '')}</td>
        <td>${escapeHtml(finding.target ?? '')}</td>
        <td>${escapeHtml(finding.evidence ?? '')}</td>
        <td>${escapeHtml(finding.remediation ?? '')}</td>
        <td>${escapeHtml(referenceList(finding.references))}</td>
      </tr>`).join('');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(subject)} · FocusTrace</title>
  <style>body{font:16px/1.5 system-ui,sans-serif;margin:2rem;color:#171717}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:.5rem;text-align:left;vertical-align:top}th{background:#f4f4f4}code{font-size:.9em}caption{text-align:left;font-weight:700;margin-bottom:.75rem}dt{font-weight:700}dd{margin:0 0 .75rem}pre{white-space:pre-wrap;overflow-wrap:anywhere}</style>
</head>
<body>
  <main>
    <h1>FocusTrace accessibility export</h1>
    <p><strong>${escapeHtml(subject)}</strong></p>
    <p>Schema ${escapeHtml(envelope.schemaVersion)} · ${envelope.summary.failures} FAIL · ${envelope.summary.reviews} REVIEW · ${envelope.summary.warnings} WARNING</p>
    <h2>Audit context</h2>
    <dl>
      <dt>Standard</dt><dd>${escapeHtml(envelope.producer.standard)}</dd>
      <dt>Scope</dt><dd><pre>${escapeHtml(contextValue(envelope.context.scope))}</pre></dd>
      <dt>Coverage</dt><dd><pre>${escapeHtml(contextValue(envelope.context.coverage))}</pre></dd>
    </dl>
    <table>
      <caption>${envelope.summary.findings} findings</caption>
      <thead><tr><th>Outcome</th><th>Severity</th><th>Rule</th><th>Finding</th><th>Description</th><th>Page</th><th>Template</th><th>Target</th><th>Evidence</th><th>Remediation</th><th>Standards</th></tr></thead>
      <tbody>${rows}
      </tbody>
    </table>
  </main>
</body>
</html>\n`;
}

function sarifLevel(finding: FocusTraceExportFinding): 'error' | 'warning' | 'note' {
  if (finding.outcome !== 'fail') return 'note';
  return finding.severity === 'critical' || finding.severity === 'serious' ? 'error' : 'warning';
}

function sarifArtifactUri(pageUrl: string | undefined, index: number): string {
  if (!pageUrl) return `focustrace/session/finding-${index + 1}.html`;
  try {
    const url = new URL(pageUrl);
    const path = url.pathname.replace(/^\/+/, '').replace(/[^A-Za-z0-9._/-]+/g, '-') || 'index';
    return `focustrace/web/${url.hostname}/${path}${path.endsWith('.html') ? '' : '.html'}`;
  } catch {
    return `focustrace/session/finding-${index + 1}.html`;
  }
}

export function renderVersionedSarif(envelope: FocusTraceExportEnvelopeV1): string {
  const firstFindingByRule = new Map<string, FocusTraceExportFinding>();
  for (const finding of envelope.findings) {
    if (!firstFindingByRule.has(finding.ruleId)) firstFindingByRule.set(finding.ruleId, finding);
  }
  const ruleIds = [...firstFindingByRule.keys()];
  const ruleIndex = new Map(ruleIds.map((ruleId, index) => [ruleId, index]));
  const rules = ruleIds.map((ruleId) => {
    const sample = firstFindingByRule.get(ruleId)!;
    return {
      id: ruleId,
      name: ruleId.replace(/[^A-Za-z0-9_]+/g, '_').slice(0, 255),
      shortDescription: { text: sample.title.slice(0, 1024) },
      fullDescription: { text: sample.description.slice(0, 1024) },
      defaultConfiguration: { level: sarifLevel(sample) },
      helpUri: sample.references[0]?.url,
      properties: {
        standards: sample.references.map((reference) => `${reference.type} ${reference.id}`),
        focusTraceOutcome: sample.outcome,
      },
    };
  });
  const results = envelope.findings.map((finding, index) => ({
    ruleId: finding.ruleId,
    ruleIndex: ruleIndex.get(finding.ruleId),
    level: sarifLevel(finding),
    message: { text: `${humanOutcome(finding.outcome)}: ${finding.title}` },
    locations: [{
      physicalLocation: {
        artifactLocation: { uri: sarifArtifactUri(finding.pageUrl ?? envelope.subject.url, index) },
        region: { startLine: 1 },
      },
      message: { text: finding.pageUrl ? `Web page: ${finding.pageUrl}` : 'FocusTrace accessibility finding' },
    }],
    partialFingerprints: {
      focusTraceFinding: `${finding.ruleId}|${finding.pageUrl ?? ''}|${finding.target ?? ''}`,
    },
    properties: {
      focusTraceOutcome: finding.outcome,
      focusTraceSeverity: finding.severity,
      source: finding.source,
      ...(finding.target ? { target: finding.target } : {}),
      ...(finding.evidence ? { evidence: finding.evidence } : {}),
      ...(finding.remediation ? { remediation: finding.remediation } : {}),
      standards: finding.references.map((reference) => `${reference.type} ${reference.id}`),
    },
  }));
  return `${JSON.stringify({
    $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
    version: '2.1.0',
    runs: [{
      tool: { driver: { name: 'FocusTrace', informationUri: 'https://focus-mode.app', rules } },
      properties: {
        focusTraceSchemaVersion: envelope.schemaVersion,
        focusTraceKind: envelope.kind,
        standard: envelope.producer.standard,
        subject: envelope.subject.url ?? envelope.subject.origin ?? envelope.subject.title ?? '',
        scope: contextValue(envelope.context.scope),
        coverage: contextValue(envelope.context.coverage),
        summary: JSON.stringify(envelope.summary),
      },
      results,
    }],
  }, null, 2)}\n`;
}

function escapeXml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function renderVersionedJUnit(envelope: FocusTraceExportEnvelopeV1): string {
  const failures = envelope.summary.failures;
  const skipped = envelope.summary.reviews + envelope.summary.warnings;
  const suiteProperties = [
    ['schemaVersion', envelope.schemaVersion],
    ['kind', envelope.kind],
    ['standard', envelope.producer.standard],
    ['scope', contextValue(envelope.context.scope)],
    ['coverage', contextValue(envelope.context.coverage)],
    ['failures', envelope.summary.failures],
    ['reviews', envelope.summary.reviews],
    ['warnings', envelope.summary.warnings],
  ].map(([name, value]) => `<property name="${escapeXml(name)}" value="${escapeXml(value)}"/>`).join('');
  const cases = envelope.findings.map((finding) => {
    const name = `${finding.ruleId}: ${finding.title}`;
    const classname = `FocusTrace.${finding.source}`;
    const testcaseProperties = [
      ['outcome', finding.outcome],
      ['severity', finding.severity],
      ['standards', referenceList(finding.references)],
      ['remediation', finding.remediation ?? ''],
    ].map(([propertyName, value]) => `<property name="${escapeXml(propertyName)}" value="${escapeXml(value)}"/>`).join('');
    const properties = `<properties>${testcaseProperties}</properties>`;
    if (finding.outcome === 'fail') {
      return `  <testcase classname="${escapeXml(classname)}" name="${escapeXml(name)}">${properties}<failure message="${escapeXml(finding.title)}">${escapeXml(finding.evidence ?? finding.description)}</failure></testcase>`;
    }
    return `  <testcase classname="${escapeXml(classname)}" name="${escapeXml(name)}">${properties}<skipped message="${finding.outcome === 'review' ? 'REVIEW' : 'WARNING'}"/><system-out>${escapeXml(finding.evidence ?? finding.description)}</system-out></testcase>`;
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="FocusTrace" tests="${envelope.summary.findings}" failures="${failures}" errors="0" skipped="${skipped}">\n  <properties>${suiteProperties}</properties>\n${cases}\n</testsuite>\n`;
}

export type FocusTraceExportFormat = 'json' | 'html' | 'csv' | 'sarif' | 'junit';

export function renderVersionedExport(
  envelope: FocusTraceExportEnvelopeV1,
  format: FocusTraceExportFormat,
): string {
  if (format === 'json') return renderVersionedJson(envelope);
  if (format === 'html') return renderVersionedHtml(envelope);
  if (format === 'csv') return renderVersionedCsv(envelope);
  if (format === 'sarif') return renderVersionedSarif(envelope);
  return renderVersionedJUnit(envelope);
}

export function exportFileExtension(format: FocusTraceExportFormat): string {
  if (format === 'sarif') return 'sarif.json';
  if (format === 'junit') return 'junit.xml';
  return format;
}
