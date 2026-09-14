import { describe, expect, it } from 'vitest';
import { CliUsageError, parseCliArgs } from '../cli/args';

describe('FocusTrace CLI arguments', () => {
  it('parses URL, component scope, profile, output and baseline options', () => {
    expect(parseCliArgs([
      'https://example.test',
      '--scope', 'component',
      '--selector', '#dialog',
      '--profile', 'profile.json',
      '--format', 'sarif',
      '--output', 'audit.sarif.json',
      '--baseline', 'before.json',
      '--save-baseline', 'after.json',
      '--timeout', '45000',
      '--headed',
      '--exit-zero',
    ])).toMatchObject({
      target: 'https://example.test',
      scope: 'component',
      selector: '#dialog',
      profilePath: 'profile.json',
      format: 'sarif',
      outputPath: 'audit.sarif.json',
      baselinePath: 'before.json',
      saveBaselinePath: 'after.json',
      timeoutMs: 45_000,
      headed: true,
      exitZero: true,
    });
  });

  it('requires an explicit selector for component scope', () => {
    expect(() => parseCliArgs(['page.html', '--scope', 'component'])).toThrow(CliUsageError);
  });

  it('rejects unsupported output formats and protocols before browser work', () => {
    expect(() => parseCliArgs(['page.html', '--format', 'pdf'])).toThrow(/format/);
    expect(() => parseCliArgs(['page.html', '--timeout', '10'])).toThrow(/timeout/);
  });
});
