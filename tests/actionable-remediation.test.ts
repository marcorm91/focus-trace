import { describe, expect, it } from 'vitest';
import {
  actionableRemediationForRule,
  actionableRemediationText,
} from '../lib/report/actionable-remediation';
import { remediationForIssue } from '../lib/site-audit/remediation';
import type { ScanIssue } from '../shared/types';

const TARGET_RULES = ['FT-RUNTIME-002', 'FT-RUNTIME-006', 'FT-REVIEW-011', 'FT-REVIEW-013', 'FT-REVIEW-015', 'FT-REVIEW-016'] as const;

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
    expect(actionableRemediationText('FT-REVIEW-013', 'en')).toContain('user deliberately changes');
    expect(actionableRemediationText('FT-REVIEW-013', 'es')).toContain('usuario cambie ese orden');
    expect(actionableRemediationText('FT-REVIEW-015', 'en')).toContain('same functionality');
    expect(actionableRemediationText('FT-REVIEW-015', 'es')).toContain('misma función');
    expect(actionableRemediationText('FT-REVIEW-016', 'en')).toContain('paragraph spacing 2 times');
    expect(actionableRemediationText('FT-REVIEW-016', 'es')).toContain('separación entre párrafos de 2 veces');
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

  it('reuses the same Spanish 3.2.3 guidance in Site Audit', () => {
    const issue: ScanIssue = {
      id: 'navigation-order',
      ruleId: 'FT-REVIEW-013',
      title: 'Repeated navigation may change order across pages',
      description: 'Review the observed order.',
      severity: 'moderate',
      outcome: 'review',
      targets: ['page:navigation-order'],
      references: [{
        type: 'WCAG',
        id: '3.2.3',
        label: 'Consistent Navigation',
        url: 'https://www.w3.org/TR/WCAG22/#consistent-navigation',
        level: 'AA',
      }],
    };

    const remediation = remediationForIssue(issue, 'es');
    expect(remediation).toBe(actionableRemediationText('FT-REVIEW-013', 'es'));
    expect(remediation).toContain('componente, layout o plantilla común');
    expect(remediation).toContain('Verifica:');
  });

  it('reuses the same Spanish 3.2.4 guidance in Site Audit', () => {
    const issue: ScanIssue = {
      id: 'consistent-identification',
      ruleId: 'FT-REVIEW-015',
      title: 'Repeated function may be identified inconsistently across pages',
      description: 'Review the observed identification.',
      severity: 'moderate',
      outcome: 'review',
      targets: ['page:consistent-identification'],
      references: [{
        type: 'WCAG',
        id: '3.2.4',
        label: 'Consistent Identification',
        url: 'https://www.w3.org/TR/WCAG22/#consistent-identification',
        level: 'AA',
      }],
    };

    const remediation = remediationForIssue(issue, 'es');
    expect(remediation).toBe(actionableRemediationText('FT-REVIEW-015', 'es'));
    expect(remediation).toContain('misma función');
    expect(remediation).toContain('Verifica:');
  });
});
