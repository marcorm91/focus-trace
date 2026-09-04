import { describe, expect, it } from 'vitest';
import {
  actionableRemediationForRule,
  actionableRemediationText,
} from '../lib/report/actionable-remediation';
import { remediationForIssue } from '../lib/site-audit/remediation';
import type { ScanIssue } from '../shared/types';

const TARGET_RULES = ['FT-RUNTIME-002', 'FT-RUNTIME-006', 'FT-REVIEW-011'] as const;

describe('actionable remediation', () => {
  it('provides three concrete options plus validation in English and Spanish', () => {
    for (const ruleId of TARGET_RULES) {
      for (const language of ['en', 'es'] as const) {
        const guidance = actionableRemediationForRule(ruleId, language);
        expect(guidance, `${ruleId} ${language}`).toBeDefined();
        expect(guidance?.options).toHaveLength(3);
        expect(guidance?.options.every((option) => option.trim().length > 40)).toBe(true);
        expect(guidance?.validation.trim().length).toBeGreaterThan(40);
      }
    }
  });

  it('keeps the remediation specific to each accessibility requirement', () => {
    expect(actionableRemediationText('FT-RUNTIME-002', 'en')).toContain('scroll-padding');
    expect(actionableRemediationText('FT-RUNTIME-002', 'es')).toContain('scroll-margin');
    expect(actionableRemediationText('FT-RUNTIME-006', 'en')).toContain('single pointer');
    expect(actionableRemediationText('FT-RUNTIME-006', 'es')).toContain('puntero sencillo');
    expect(actionableRemediationText('FT-REVIEW-011', 'en')).toContain('relative order');
    expect(actionableRemediationText('FT-REVIEW-011', 'es')).toContain('orden relativo');
  });

  it('does not manufacture guidance for unrelated rules', () => {
    expect(actionableRemediationForRule('FT-WCAG-001', 'es')).toBeUndefined();
    expect(actionableRemediationForRule(undefined, 'en')).toBeUndefined();
  });

  it('reuses the same Spanish 3.2.6 guidance in Site Audit', () => {
    const issue: ScanIssue = {
      id: 'help-order',
      ruleId: 'FT-REVIEW-011',
      title: 'Repeated help mechanisms may change order across pages',
      description: 'Review the observed order.',
      severity: 'moderate',
      outcome: 'review',
      targets: ['page:help-mechanisms'],
      references: [{
        type: 'WCAG',
        id: '3.2.6',
        label: 'Consistent Help',
        url: 'https://www.w3.org/TR/WCAG22/#consistent-help',
        level: 'A',
      }],
    };

    const remediation = remediationForIssue(issue, 'es');
    expect(remediation).toBe(actionableRemediationText('FT-REVIEW-011', 'es'));
    expect(remediation).toContain('componente, layout o plantilla compartida');
    expect(remediation).toContain('Verifica:');
  });
});
