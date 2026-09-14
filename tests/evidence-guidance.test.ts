import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { evidenceBasedGuidanceForIssue } from '../lib/report/evidence-guidance';
import type { ScanIssue } from '../shared/types';

function issue(ruleId: string, outcome: ScanIssue['outcome'] = 'review'): ScanIssue {
  return {
    id: `${ruleId}-finding`,
    ruleId,
    title: 'Recorded accessibility condition',
    description: 'FocusTrace recorded evidence that requires remediation or review.',
    severity: 'moderate',
    outcome,
    targets: ['main > button:nth-of-type(1)'],
    references: [{
      type: 'WCAG',
      id: '4.1.2',
      level: 'A',
      label: 'Name, Role, Value',
      url: 'https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html',
    }],
    evidence: 'role=button; name=""',
  };
}

function sourceRuleIds(): string[] {
  const ids = new Set<string>();
  const roots = ['lib', 'shared', 'entrypoints'];
  const pattern = /FT-(?:WCAG|REVIEW|WARN|RUNTIME|APG)-\d+/g;

  const visit = (path: string) => {
    for (const entry of readdirSync(path)) {
      const current = join(path, entry);
      if (statSync(current).isDirectory()) {
        visit(current);
        continue;
      }
      if (!/\.(?:ts|tsx)$/.test(entry)) continue;
      const source = readFileSync(current, 'utf8');
      for (const match of source.matchAll(pattern)) ids.add(match[0]);
    }
  };

  roots.forEach(visit);
  return [...ids].sort();
}

describe('evidence-based remediation guidance', () => {
  it('provides complete EN/ES guidance for every production rule id present in source', () => {
    const ruleIds = sourceRuleIds();
    expect(ruleIds.length).toBeGreaterThan(100);

    for (const ruleId of ruleIds) {
      for (const language of ['en', 'es'] as const) {
        const guidance = evidenceBasedGuidanceForIssue(issue(ruleId), language);
        expect(guidance.observedProblem, ruleId).not.toHaveLength(0);
        expect(guidance.impact, ruleId).not.toHaveLength(0);
        expect(guidance.reproduction, ruleId).not.toHaveLength(0);
        expect(guidance.remediation, ruleId).not.toHaveLength(0);
        expect(guidance.validation, ruleId).not.toHaveLength(0);
        expect(guidance.limitation, ruleId).not.toHaveLength(0);
        expect(guidance.manualReview, ruleId).toBe(true);
      }
    }
  });

  it('keeps REVIEW and WARNING explicitly non-deterministic while FAIL remains evidence-based', () => {
    expect(evidenceBasedGuidanceForIssue(issue('FT-REVIEW-001', 'review'), 'en').limitation)
      .toContain('manual review');
    expect(evidenceBasedGuidanceForIssue(issue('FT-WARN-004', 'warning'), 'en').limitation)
      .toContain('does not prove');
    expect(evidenceBasedGuidanceForIssue(issue('FT-WCAG-003', 'fail'), 'en').manualReview)
      .toBe(false);
  });

  it('preserves selectors and technical examples canonically across languages', () => {
    const en = evidenceBasedGuidanceForIssue(issue('FT-WCAG-003', 'fail'), 'en');
    const es = evidenceBasedGuidanceForIssue(issue('FT-WCAG-003', 'fail'), 'es');

    expect(en.reproduction).toContain('main > button:nth-of-type(1)');
    expect(es.reproduction).toContain('main > button:nth-of-type(1)');
    expect(en.example).toEqual(es.example);
    expect(en.example?.good).toContain('aria-label="Close"');
  });

  it('uses runtime-specific reproduction guidance for interaction findings', () => {
    const guidance = evidenceBasedGuidanceForIssue(issue('FT-RUNTIME-007', 'review'), 'es');
    expect(guidance.reproduction).toContain('recorrido de teclado, puntero o navegación');
  });
});
