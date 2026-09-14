#!/usr/bin/env node

import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';
import { renderFocusTraceCliBaseline } from '../lib/core/baseline';
import { CliUsageError, cliHelp, parseCliArgs } from './args';
import type { CliBrowserRunInput, CliBrowserRunOutput, FocusTraceCliBridge } from './protocol';

class CliRuntimeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CliRuntimeError';
  }
}

const ABSOLUTE_SCHEME = /^[a-zA-Z][a-zA-Z\d+.-]*:/;

function resolveTarget(value: string): string {
  if (isAbsolute(value) || !ABSOLUTE_SCHEME.test(value)) return pathToFileURL(resolve(value)).href;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new CliUsageError('The audit target is not a valid URL or local path.');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:' && url.protocol !== 'file:') {
    throw new CliUsageError('Only http, https and file audit targets are supported.');
  }
  return url.href;
}

async function readJson(path: string, kind: 'profile' | 'baseline'): Promise<unknown> {
  try {
    return JSON.parse(await readFile(resolve(path), 'utf8')) as unknown;
  } catch {
    throw new CliRuntimeError(`Unable to read the requested ${kind} file.`);
  }
}

async function writeText(path: string, content: string, kind: 'output' | 'baseline'): Promise<void> {
  try {
    const resolved = resolve(path);
    await mkdir(dirname(resolved), { recursive: true });
    await writeFile(resolved, content, 'utf8');
  } catch {
    throw new CliRuntimeError(`Unable to write the requested ${kind} file.`);
  }
}

function browserScannerPath(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), 'browser-scanner.js');
}

function knownBrowserError(error: unknown): string {
  if (!(error instanceof Error)) return 'Unable to audit the requested target.';
  const message = error.message;
  if (/Component scope requires|Invalid component selector|Component selector did not match|Invalid audit profile|Unsupported or invalid FocusTrace CLI baseline|browser scanner is unavailable/.test(message)) {
    return message;
  }
  return 'Unable to audit the requested target.';
}

async function execute(): Promise<number> {
  let options;
  try {
    options = parseCliArgs(process.argv.slice(2));
  } catch (error) {
    if (error instanceof CliUsageError) {
      process.stderr.write(`${error.message}\n\n${cliHelp()}`);
      return 2;
    }
    throw error;
  }

  if (options.help) {
    process.stdout.write(cliHelp());
    return 0;
  }

  const target = resolveTarget(options.target!);
  const profile = options.profilePath ? await readJson(options.profilePath, 'profile') : undefined;
  const baseline = options.baselinePath ? await readJson(options.baselinePath, 'baseline') : undefined;
  const scannerPath = browserScannerPath();
  try {
    await access(scannerPath);
  } catch {
    throw new CliRuntimeError('The FocusTrace CLI browser scanner is unavailable. Run npm run cli:build first.');
  }

  const browser = await chromium.launch({ headless: !options.headed });
  let result: CliBrowserRunOutput;
  try {
    const page = await browser.newPage();
    await page.addInitScript({ path: scannerPath });
    try {
      await page.goto(target, { waitUntil: 'load', timeout: options.timeoutMs });
    } catch {
      throw new CliRuntimeError('Unable to load the requested audit target.');
    }
    const input: CliBrowserRunInput = {
      scope: options.scope,
      ...(options.selector ? { selector: options.selector } : {}),
      ...(profile ? { profile: profile as CliBrowserRunInput['profile'] } : {}),
      ...(baseline ? { baseline } : {}),
      format: options.format,
    };
    try {
      result = await page.evaluate(async (browserInput) => {
        const bridge = (globalThis as typeof globalThis & { __FOCUSTRACE_CLI__?: FocusTraceCliBridge }).__FOCUSTRACE_CLI__;
        if (!bridge) throw new Error('FocusTrace CLI browser scanner is unavailable.');
        return bridge.run(browserInput);
      }, input);
    } catch (error) {
      throw new CliRuntimeError(knownBrowserError(error));
    }
  } finally {
    await browser.close();
  }

  if (options.outputPath) await writeText(options.outputPath, result.rendered, 'output');
  else process.stdout.write(result.rendered);

  if (options.saveBaselinePath) {
    await writeText(options.saveBaselinePath, renderFocusTraceCliBaseline(result.baseline), 'baseline');
  }

  const subject = result.envelope.subject.url ?? result.envelope.subject.origin ?? 'audited target';
  const summary = result.envelope.summary;
  process.stderr.write(`FocusTrace ${subject}: ${summary.failures} FAIL · ${summary.reviews} REVIEW · ${summary.warnings} WARNING\n`);
  return summary.failures > 0 && !options.exitZero ? 1 : 0;
}

execute()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error: unknown) => {
    const message = error instanceof CliRuntimeError || error instanceof CliUsageError
      ? error.message
      : 'FocusTrace CLI failed.';
    process.stderr.write(`${message}\n`);
    process.exitCode = 2;
  });
