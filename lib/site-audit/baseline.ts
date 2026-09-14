import {
  SITE_AUDIT_BASELINE_VERSION,
  SITE_AUDIT_MAX_BASELINES,
  type SiteAuditBaseline,
  type SiteAuditBaselineFinding,
  type SiteAuditBaselineStore,
  type SiteAuditComparison,
  type SiteAuditComparisonFinding,
  type SiteAuditResult,
} from './model';

function stableFingerprint(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `S${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function scopeSignature(result: SiteAuditResult): string {
  const scope = result.discovery.scope;
  const mode = scope?.mode ?? (result.discovery.source === 'session'
    ? 'session'
    : result.discovery.source === 'manual' ? 'manual' : 'automatic');
  const routePatterns = mode === 'automatic'
    ? []
    : result.routeFamilies.map((family) => family.pattern).sort();
  const input = JSON.stringify({
    mode,
    maxDiscoveredUrls: scope?.maxDiscoveredUrls ?? null,
    maxScannedPages: scope?.maxScannedPages ?? null,
    samplesPerFamily: scope?.samplesPerFamily ?? null,
    exclusionPrefixes: [...(scope?.exclusionPrefixes ?? [])].sort(),
    routePatterns,
  });
  return stableFingerprint(input);
}

function baselineFindingKey(routePattern: string, ruleId: string, targetShape: string): string {
  return `${routePattern}::${ruleId}::${targetShape}`;
}

export function siteAuditBaselineFromResult(result: SiteAuditResult): SiteAuditBaseline {
  const findings: SiteAuditBaselineFinding[] = result.templates
    .flatMap((template) => {
      const routePattern = [...template.routePatterns].sort().join(' | ');
      return template.findings.map((finding) => ({
        key: baselineFindingKey(routePattern, finding.ruleId, finding.targetShape),
        ruleId: finding.ruleId,
        title: finding.title.slice(0, 180),
        routePattern: routePattern.slice(0, 240),
        targetShape: finding.targetShape.slice(0, 240),
        outcome: finding.outcome,
        severity: finding.exampleIssue.severity,
        sampleCount: finding.sampleCount,
        totalSamples: finding.totalSamples,
      }));
    })
    .sort((left, right) => left.key.localeCompare(right.key));

  return {
    version: SITE_AUDIT_BASELINE_VERSION,
    origin: new URL(result.origin).origin,
    generatedAt: result.generatedAt,
    scopeSignature: scopeSignature(result),
    findings,
  };
}

function findingEvidenceSignature(finding: SiteAuditBaselineFinding): string {
  return [finding.outcome, finding.severity, finding.sampleCount, finding.totalSamples].join('|');
}

export function compareSiteAuditBaselines(
  current: SiteAuditBaseline,
  previous: SiteAuditBaseline | undefined,
): SiteAuditComparison | undefined {
  if (!previous) return undefined;
  if (current.scopeSignature !== previous.scopeSignature) {
    return {
      previousGeneratedAt: previous.generatedAt,
      compatible: false,
      reason: 'scope-changed',
      newCount: 0,
      persistentCount: 0,
      changedCount: 0,
      resolvedCount: 0,
      findings: [],
    };
  }

  const previousByKey = new Map(previous.findings.map((finding) => [finding.key, finding]));
  const currentByKey = new Map(current.findings.map((finding) => [finding.key, finding]));
  const findings: SiteAuditComparisonFinding[] = [];

  for (const finding of current.findings) {
    const before = previousByKey.get(finding.key);
    if (!before) {
      findings.push({ ...finding, state: 'new' });
      continue;
    }
    if (findingEvidenceSignature(finding) === findingEvidenceSignature(before)) {
      findings.push({ ...finding, state: 'persistent' });
      continue;
    }
    findings.push({
      ...finding,
      state: 'changed',
      previousOutcome: before.outcome,
      previousSeverity: before.severity,
    });
  }

  for (const finding of previous.findings) {
    if (currentByKey.has(finding.key)) continue;
    findings.push({ ...finding, state: 'resolved' });
  }

  findings.sort((left, right) => left.state.localeCompare(right.state) || left.key.localeCompare(right.key));
  return {
    previousGeneratedAt: previous.generatedAt,
    compatible: true,
    newCount: findings.filter((finding) => finding.state === 'new').length,
    persistentCount: findings.filter((finding) => finding.state === 'persistent').length,
    changedCount: findings.filter((finding) => finding.state === 'changed').length,
    resolvedCount: findings.filter((finding) => finding.state === 'resolved').length,
    findings,
  };
}

function validBaseline(value: unknown): value is SiteAuditBaseline {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<SiteAuditBaseline>;
  if (candidate.version !== SITE_AUDIT_BASELINE_VERSION) return false;
  if (typeof candidate.origin !== 'string' || typeof candidate.scopeSignature !== 'string') return false;
  if (!Number.isFinite(candidate.generatedAt) || !Array.isArray(candidate.findings)) return false;
  try {
    return new URL(candidate.origin).origin === candidate.origin;
  } catch {
    return false;
  }
}

export function normalizeSiteAuditBaselineStore(value: unknown): SiteAuditBaselineStore {
  if (!value || typeof value !== 'object') {
    return { version: SITE_AUDIT_BASELINE_VERSION, baselines: [] };
  }
  const candidate = value as Partial<SiteAuditBaselineStore>;
  const baselines = Array.isArray(candidate.baselines)
    ? candidate.baselines
      .filter(validBaseline)
      .sort((left, right) => left.generatedAt - right.generatedAt)
      .slice(-SITE_AUDIT_MAX_BASELINES)
    : [];
  return { version: SITE_AUDIT_BASELINE_VERSION, baselines };
}

export function latestSiteAuditBaseline(
  store: SiteAuditBaselineStore,
  origin: string,
): SiteAuditBaseline | undefined {
  const normalizedOrigin = new URL(origin).origin;
  return [...store.baselines]
    .reverse()
    .find((baseline) => baseline.origin === normalizedOrigin);
}

export function appendSiteAuditBaseline(
  store: SiteAuditBaselineStore,
  baseline: SiteAuditBaseline,
): SiteAuditBaselineStore {
  return normalizeSiteAuditBaselineStore({
    version: SITE_AUDIT_BASELINE_VERSION,
    baselines: [...store.baselines, baseline],
  });
}
