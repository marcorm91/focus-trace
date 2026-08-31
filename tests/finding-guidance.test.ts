import { describe, expect, it } from 'vitest';
import { guidanceForIssue, reportFindingDescription } from '../lib/report/finding-guidance';
import type { ScanIssue } from '../shared/types';

function issue(overrides: Partial<ScanIssue> = {}): ScanIssue {
  return {
    id: 'finding-1',
    ruleId: 'FT-WCAG-010',
    title: 'Text has sufficient color contrast',
    description: 'FocusTrace cannot reliably determine final contrast. Criterion/source: WCAG 1.4.3 (AA).',
    severity: 'serious',
    outcome: 'review',
    targets: ['h3.title'],
    references: [{
      type: 'WCAG',
      id: '1.4.3',
      level: 'AA',
      label: 'Contrast (Minimum)',
      url: 'https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html',
    }],
    contrast: {
      kind: 'text',
      requiredRatio: 4.5,
      subject: 'text',
      reason: 'Background composition requires manual review.',
    },
    ...overrides,
  };
}

describe('finding guidance', () => {
  it('keeps generic complex-contrast disclaimers out of each PDF finding', () => {
    expect(reportFindingDescription(issue(), 'es')).toBe(
      'No se ha podido determinar con fiabilidad el contraste final renderizado entre el texto y su fondo para este elemento. Requiere revisión manual.',
    );
  });

  it('localizes a known unresolved contrast reason without changing the English source', () => {
    const finding = issue({
      contrast: {
        kind: 'text',
        requiredRatio: 4.5,
        foreground: '#ffffff',
        reason: 'Element or ancestor opacity affects the rendered colors.',
      },
    });

    expect(reportFindingDescription(finding, 'es')).toBe(
      'La opacidad del elemento o de uno de sus ancestros afecta a los colores renderizados.',
    );
    expect(reportFindingDescription(finding, 'en')).toBe(
      'Element or ancestor opacity affects the rendered colors.',
    );
  });

  it('provides a remediation and verification path for deterministic contrast failures', () => {
    const finding = issue({
      outcome: 'fail',
      contrast: {
        kind: 'text',
        ratio: 2.8,
        requiredRatio: 4.5,
        foreground: '#777777',
        background: '#ffffff',
        subject: 'text',
      },
    });
    const guidance = guidanceForIssue(finding, 'en');

    expect(guidance.remediation).toContain('4.5:1');
    expect(guidance.remediation).toContain('2.8:1');
    expect(guidance.validation).toContain('Re-measure');
  });

  it('provides actionable accessible-name guidance for buttons', () => {
    const guidance = guidanceForIssue(issue({
      ruleId: 'FT-WCAG-003',
      outcome: 'fail',
      contrast: undefined,
    }), 'es');

    expect(guidance.remediation).toContain('nombre accesible');
    expect(guidance.validation).toContain('lector de pantalla');
  });
});
