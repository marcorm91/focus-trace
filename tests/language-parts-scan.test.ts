// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { runFocusTraceScan } from '../lib/audit/scan';

function render(body: string) {
  document.open();
  document.write(`<!doctype html><html lang="en"><head><title>Test</title></head><body>${body}</body></html>`);
  document.close();
}

describe('integrated Language of Parts scan', () => {
  it('adds a deterministic 3.1.2 failure to the existing declared-language rule family', () => {
    render('<main><h1>Page</h1><p id="foreign" lang="English">Hello world</p></main>');
    const result = runFocusTraceScan();
    const issue = result.issues.find((candidate) => candidate.ruleId === 'FT-WCAG-009' && candidate.targets.includes('#foreign'));

    expect(issue).toMatchObject({
      outcome: 'fail',
      severity: 'serious',
      title: 'Declared content language has a known primary language tag',
    });
    expect(issue?.references).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'WCAG', id: '3.1.2', level: 'AA' }),
      expect.objectContaining({ type: 'ACT', id: 'de46e4' }),
    ]));

    const coverage = result.ruleResults?.find((entry) => entry.ruleId === 'FT-WCAG-009');
    expect(coverage).toMatchObject({ applicable: 2, passed: 1, failures: 1 });
    expect(result.ruleResults?.filter((entry) => entry.ruleId === 'FT-WCAG-009')).toHaveLength(1);
  });

  it('records valid declared passage languages as passes without adding another rule family', () => {
    render('<main><h1>Page</h1><p lang="fr-CH">Bonjour</p><p lang="es">Hola</p></main>');
    const result = runFocusTraceScan();
    const coverage = result.ruleResults?.find((entry) => entry.ruleId === 'FT-WCAG-009');

    expect(result.issues.filter((issue) => issue.ruleId === 'FT-WCAG-009')).toEqual([]);
    expect(coverage).toMatchObject({ applicable: 3, passed: 3, failures: 0 });
  });

  it('does not report programming-language labels as WCAG 3.1.2 failures', () => {
    render('<main><h1>Code</h1><pre lang="python"><code>print("hello")</code></pre></main>');
    const result = runFocusTraceScan();
    expect(result.issues.some((issue) => issue.targets.includes('pre') && issue.ruleId === 'FT-WCAG-009')).toBe(false);
  });
});
