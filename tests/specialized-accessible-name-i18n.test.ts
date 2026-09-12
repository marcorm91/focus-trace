import { describe, expect, it } from 'vitest';
import { localizedScanIssue } from '../shared/i18n';
import type { ScanIssue } from '../shared/types';

function issue(
  ruleId: 'FT-WCAG-014' | 'FT-WCAG-015' | 'FT-WARN-022',
  title: string,
  description: string,
  evidence: string,
): ScanIssue {
  return {
    id: `test-${ruleId}`,
    ruleId,
    title,
    description,
    severity: 'serious',
    outcome: ruleId === 'FT-WARN-022' ? 'warning' : 'fail',
    targets: ['#target'],
    evidence,
    references: ruleId === 'FT-WCAG-015'
      ? [{ type: 'WCAG', id: '1.1.1', label: 'Non-text Content', level: 'A', status: 'normative' }]
      : ruleId === 'FT-WCAG-014'
        ? [{ type: 'WCAG', id: '4.1.2', label: 'Name, Role, Value', level: 'A', status: 'normative' }]
        : [{ type: 'WAI-ARIA', id: 'namecalculation', label: 'Accessible name requirements', status: 'editor-draft' }],
  };
}

describe('specialized accessible-name localization', () => {
  it('localizes deterministic specialized control failures', () => {
    const localized = localizedScanIssue(issue(
      'FT-WCAG-014',
      'Specialized interactive control has a non-empty accessible name',
      'English fallback description.',
      'tab accessible-name computation returned an empty string.',
    ), 'es');

    expect(localized.title).toBe('El control interactivo especializado tiene un nombre accesible no vacío');
    expect(localized.description).toContain('Este control especializado expuesto tiene un nombre accesible vacío');
    expect(localized.evidence).toBe('El cálculo del nombre accesible de tab devolvió una cadena vacía.');
  });

  it('localizes range-indicator failures', () => {
    const localized = localizedScanIssue(issue(
      'FT-WCAG-015',
      'Meter or progress indicator has a non-empty accessible name',
      'English fallback description.',
      'progressbar accessible-name computation returned an empty string.',
    ), 'es');

    expect(localized.title).toBe('El medidor o indicador de progreso tiene un nombre accesible no vacío');
    expect(localized.description).toContain('Este medidor o indicador de progreso expuesto tiene un nombre accesible vacío');
    expect(localized.evidence).toBe('El cálculo del nombre accesible de progressbar devolvió una cadena vacía.');
  });

  it('localizes ARIA authoring warnings and successful name evidence', () => {
    const localized = localizedScanIssue(issue(
      'FT-WARN-022',
      'ARIA dialog or tree item has no usable accessible name',
      'English fallback description.',
      'treeitem accessible name = "Documents"; source = subtree.',
    ), 'es');

    expect(localized.title).toBe('El diálogo ARIA o elemento de árbol no tiene un nombre accesible utilizable');
    expect(localized.description).toContain('Este diálogo ARIA o elemento de árbol expuesto no tiene un nombre accesible utilizable');
    expect(localized.evidence).toBe('treeitem: nombre accesible = "Documents"; fuente = subtree.');
  });
});
