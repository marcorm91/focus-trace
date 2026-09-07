// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { runFocusTraceScan } from '../lib/audit/scan';

function render(body: string) {
  document.open();
  document.write(`<!doctype html><html lang="en"><head><title>Test</title></head><body>${body}</body></html>`);
  document.close();
}

describe('integrated Language of Parts scan', () => {
  it('adds a deterministic WCAG 3.1.2 failure as its own rule family', () => {
    render('<main><h1>Page</h1><p id="foreign" lang="English">Hello world</p></main>');
    const result = runFocusTraceScan();
    const issue = result.issues.find((candidate) => candidate.ruleId === 'FT-WCAG-013' && candidate.targets.includes('#foreign'));

    expect(issue).toMatchObject({
      outcome: 'fail',
      severity: 'serious',
      title: 'Declared content language has a known primary language tag',
    });
    expect(issue?.references).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'WCAG', id: '3.1.2', level: 'AA' }),
      expect.objectContaining({ type: 'ACT', id: 'de46e4' }),
    ]));

    expect(result.ruleResults?.find((entry) => entry.ruleId === 'FT-WCAG-009')).toMatchObject({
      applicable: 1,
      passed: 1,
      failures: 0,
    });
    expect(result.ruleResults?.find((entry) => entry.ruleId === 'FT-WCAG-013')).toMatchObject({
      applicable: 1,
      passed: 0,
      failures: 1,
    });
  });

  it('records valid declared passage languages as passes in the 3.1.2 family', () => {
    render('<main><h1>Page</h1><p lang="fr-CH">Bonjour</p><p lang="es">Hola</p></main>');
    const result = runFocusTraceScan();
    const coverage = result.ruleResults?.find((entry) => entry.ruleId === 'FT-WCAG-013');

    expect(result.issues.filter((issue) => issue.ruleId === 'FT-WCAG-013')).toEqual([]);
    expect(coverage).toMatchObject({ applicable: 2, passed: 2, failures: 0 });
  });

  it('does not report programming-language labels as WCAG 3.1.2 failures', () => {
    render('<main><h1>Code</h1><pre lang="python"><code>print("hello")</code></pre></main>');
    const result = runFocusTraceScan();
    expect(result.issues.some((issue) => issue.targets.includes('pre') && issue.ruleId === 'FT-WCAG-013')).toBe(false);
    expect(result.ruleResults?.find((entry) => entry.ruleId === 'FT-WCAG-013')).toMatchObject({ applicable: 0 });
  });
});
