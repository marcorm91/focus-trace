import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { expect, test } from '@playwright/test';

const execFileAsync = promisify(execFile);
const cli = resolve('dist/cli/focustrace.mjs');
const fixture = pathToFileURL(resolve('tests/fixtures/cli-accessibility.html')).href;

async function runCli(args: string[]): Promise<{ stdout: string; stderr: string }> {
  return execFileAsync(process.execPath, [cli, fixture, ...args], {
    cwd: resolve('.'),
    maxBuffer: 10 * 1024 * 1024,
  });
}

test('local CLI executes the production FocusTrace scanner and emits v1 JSON', async () => {
  const { stdout, stderr } = await runCli(['--format', 'json', '--exit-zero']);
  const envelope = JSON.parse(stdout) as {
    schemaVersion: string;
    producer: { name: string };
    findings: Array<{ ruleId: string; outcome: string }>;
  };

  expect(envelope.schemaVersion).toBe('1.0.0');
  expect(envelope.producer.name).toBe('FocusTrace');
  expect(envelope.findings).toContainEqual(expect.objectContaining({ ruleId: 'FT-WCAG-003', outcome: 'fail' }));
  expect(stderr).toContain('FAIL');
});

test('local CLI persists and reuses a compatible baseline without inventing resolution', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'focustrace-cli-'));
  const baselinePath = join(directory, 'baseline.json');
  try {
    await runCli(['--format', 'json', '--save-baseline', baselinePath, '--exit-zero']);
    const baseline = JSON.parse(await readFile(baselinePath, 'utf8')) as { version: number; scan: { url: string } };
    expect(baseline.version).toBe(1);
    expect(baseline.scan.url).not.toContain('?');

    const { stdout } = await runCli(['--format', 'json', '--baseline', baselinePath, '--exit-zero']);
    const envelope = JSON.parse(stdout) as {
      metadata?: { baselineCompatible?: boolean };
      findings: Array<{ ruleId: string; lifecycleState?: string }>;
    };
    expect(envelope.metadata?.baselineCompatible).toBe(true);
    expect(envelope.findings).toContainEqual(expect.objectContaining({
      ruleId: 'FT-WCAG-003',
      lifecycleState: 'persistent',
    }));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
