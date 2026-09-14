import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import type { Page } from '@playwright/test';
import type { AuditProfile } from '../lib/audit/audit-profiles';
import {
  parseFocusTraceCliBaseline,
  renderFocusTraceCliBaseline,
  type FocusTraceCliBaseline,
} from '../lib/core/baseline';
import {
  renderVersionedExport,
  type FocusTraceExportFormat,
} from '../lib/report/versioned-export';
import type {
  CliBrowserRunInput,
  CliBrowserRunOutput,
  FocusTraceCliBridge,
} from '../cli/protocol';

export interface FocusTracePlaywrightScanOptions {
  scope?: 'page' | 'component';
  selector?: string;
  profile?: Partial<AuditProfile>;
  baseline?: FocusTraceCliBaseline;
  baselinePath?: string;
  scannerPath?: string;
  format?: FocusTraceExportFormat;
}

export interface FocusTraceThresholds {
  maxFailures?: number;
  maxNewFailures?: number;
  maxReviews?: number;
  maxWarnings?: number;
}

export interface FocusTraceArtifactOptions {
  directory: string;
  formats?: Array<'sarif' | 'junit'>;
  generatedAt?: number;
  basename?: string;
}

export interface FocusTraceCheckpointOptions extends FocusTracePlaywrightScanOptions {
  thresholds?: FocusTraceThresholds;
  artifacts?: FocusTraceArtifactOptions;
  saveBaselinePath?: string;
}

export interface FocusTraceThresholdSummary {
  failures: number;
  newFailures: number;
  reviews: number;
  warnings: number;
}

const DEFAULT_SCANNER_PATH = resolve('dist/cli/browser-scanner.js');

function normalizeThreshold(value: number | undefined, label: string): number | undefined {
  if (value == null) return undefined;
  if (!Number.isFinite(value) || value < 0 || !Number.isInteger(value)) {
    throw new Error(`${label} must be a non-negative integer.`);
  }
  return value;
}

async function baselineForOptions(options: FocusTracePlaywrightScanOptions): Promise<FocusTraceCliBaseline | undefined> {
  if (options.baseline && options.baselinePath) {
    throw new Error('Provide either baseline or baselinePath, not both.');
  }
  if (options.baseline) return options.baseline;
  if (!options.baselinePath) return undefined;
  const source = await readFile(resolve(options.baselinePath), 'utf8');
  return parseFocusTraceCliBaseline(source);
}

async function ensureFocusTraceBridge(page: Page, scannerPath: string): Promise<void> {
  const present = await page.evaluate(() => Boolean(
    (globalThis as typeof globalThis & { __FOCUSTRACE_CLI__?: unknown }).__FOCUSTRACE_CLI__,
  ));
  if (present) return;
  const source = await readFile(resolve(scannerPath), 'utf8');
  await page.evaluate(source);
  const installed = await page.evaluate(() => Boolean(
    (globalThis as typeof globalThis & { __FOCUSTRACE_CLI__?: unknown }).__FOCUSTRACE_CLI__,
  ));
  if (!installed) throw new Error('FocusTrace browser scanner could not be installed in the Playwright page.');
}

export async function scanFocusTrace(
  page: Page,
  options: FocusTracePlaywrightScanOptions = {},
): Promise<CliBrowserRunOutput> {
  const scope = options.scope ?? 'page';
  if (scope === 'component' && !options.selector) {
    throw new Error('Component checkpoints require a selector.');
  }
  const baseline = await baselineForOptions(options);
  await ensureFocusTraceBridge(page, options.scannerPath ?? DEFAULT_SCANNER_PATH);
  const input: CliBrowserRunInput = {
    scope,
    ...(options.selector ? { selector: options.selector } : {}),
    ...(options.profile ? { profile: options.profile } : {}),
    ...(baseline ? { baseline } : {}),
    format: options.format ?? 'json',
  };
  return page.evaluate(async (browserInput) => {
    const bridge = (globalThis as typeof globalThis & { __FOCUSTRACE_CLI__?: FocusTraceCliBridge }).__FOCUSTRACE_CLI__;
    if (!bridge) throw new Error('FocusTrace browser scanner is unavailable.');
    return bridge.run(browserInput);
  }, input);
}

export function summarizeFocusTraceThresholds(result: CliBrowserRunOutput): FocusTraceThresholdSummary {
  const failures = result.envelope.findings.filter((finding) => finding.outcome === 'fail');
  return {
    failures: failures.length,
    newFailures: failures.filter((finding) => finding.lifecycleState === 'new').length,
    reviews: result.envelope.summary.reviews,
    warnings: result.envelope.summary.warnings,
  };
}

export function assertFocusTrace(
  result: CliBrowserRunOutput,
  thresholds?: FocusTraceThresholds,
): void {
  const summary = summarizeFocusTraceThresholds(result);
  const configured: FocusTraceThresholds = thresholds ?? { maxFailures: 0 };
  const limits = {
    maxFailures: normalizeThreshold(configured.maxFailures, 'maxFailures'),
    maxNewFailures: normalizeThreshold(configured.maxNewFailures, 'maxNewFailures'),
    maxReviews: normalizeThreshold(configured.maxReviews, 'maxReviews'),
    maxWarnings: normalizeThreshold(configured.maxWarnings, 'maxWarnings'),
  };
  const violations: string[] = [];
  if (limits.maxFailures != null && summary.failures > limits.maxFailures) {
    violations.push(`FAIL ${summary.failures} exceeds maxFailures ${limits.maxFailures}`);
  }
  if (limits.maxNewFailures != null && summary.newFailures > limits.maxNewFailures) {
    violations.push(`new FAIL ${summary.newFailures} exceeds maxNewFailures ${limits.maxNewFailures}`);
  }
  if (limits.maxReviews != null && summary.reviews > limits.maxReviews) {
    violations.push(`REVIEW ${summary.reviews} exceeds maxReviews ${limits.maxReviews}`);
  }
  if (limits.maxWarnings != null && summary.warnings > limits.maxWarnings) {
    violations.push(`WARNING ${summary.warnings} exceeds maxWarnings ${limits.maxWarnings}`);
  }
  if (violations.length) {
    throw new Error(`FocusTrace threshold exceeded:\n${violations.map((violation) => `- ${violation}`).join('\n')}`);
  }
}

function artifactName(format: 'sarif' | 'junit', basename: string): string {
  return format === 'sarif' ? `${basename}.sarif.json` : `${basename}.junit.xml`;
}

export async function writeFocusTraceArtifacts(
  result: CliBrowserRunOutput,
  options: FocusTraceArtifactOptions,
): Promise<string[]> {
  const formats = options.formats ?? ['sarif', 'junit'];
  const basename = options.basename?.trim() || 'focustrace';
  const directory = resolve(options.directory);
  await mkdir(directory, { recursive: true });
  const envelope = {
    ...result.envelope,
    generatedAt: options.generatedAt ?? result.envelope.generatedAt,
  };
  const paths: string[] = [];
  for (const format of formats) {
    const path = resolve(directory, artifactName(format, basename));
    await writeFile(path, renderVersionedExport(envelope, format), 'utf8');
    paths.push(path);
  }
  return paths;
}

export async function writeFocusTraceBaseline(
  path: string,
  baseline: FocusTraceCliBaseline,
): Promise<void> {
  const resolved = resolve(path);
  await mkdir(dirname(resolved), { recursive: true });
  await writeFile(resolved, renderFocusTraceCliBaseline(baseline), 'utf8');
}

export async function focusTraceCheckpoint(
  page: Page,
  options: FocusTraceCheckpointOptions = {},
): Promise<CliBrowserRunOutput> {
  const result = await scanFocusTrace(page, options);
  if (options.artifacts) await writeFocusTraceArtifacts(result, options.artifacts);
  if (options.saveBaselinePath) await writeFocusTraceBaseline(options.saveBaselinePath, result.baseline);
  assertFocusTrace(result, options.thresholds);
  return result;
}
