import { describe, expect, it } from 'vitest';
import { reportFindingDescription } from '../lib/report/finding-guidance';
import { localizedScanIssue } from '../shared/i18n';
import { localizedAuditEvidence } from '../shared/i18n-audit-evidence';
import { EMBEDDED_CONTENT_UNEVALUATED_REVIEW_RULE } from '../shared/embedded-content-rules';
import { LANDMARK_COVERAGE_RULE } from '../shared/document-structure-rules';
import type { ScanIssue } from '../shared/types';

const sample: ScanIssue = {
  id: 'nested', ruleId: EMBEDDED_CONTENT_UNEVALUATED_REVIEW_RULE.id,
  title: EMBEDDED_CONTENT_UNEVALUATED_REVIEW_RULE.title,
  description: 'FocusTrace reached a nested audit boundary it could not traverse completely. Closed shadow content, inaccessible frame descendants or content beyond the shared traversal budget must not be reported as clean.',
  evidence: 'Nested frame document was unavailable to the local composed traversal; its descendants were not verified clean.',
  references: EMBEDDED_CONTENT_UNEVALUATED_REVIEW_RULE.references,
  targets: ['iframe'], outcome: 'review', severity: 'moderate',
};

describe('Spanish report regressions', () => {
  it('translates nested boundary explanations even when criteria are appended', () => {
    const copy = localizedScanIssue(sample, 'es');
    expect(copy.title).toBe('No se ha evaluado un contexto de auditoría anidado');
    expect(copy.description).toContain('límite de auditoría anidada');
    expect(copy.description).not.toContain('FocusTrace reached');
    expect(reportFindingDescription(sample, 'es')).toContain('límite de auditoría anidada');
    expect(copy.evidence).toContain('no se ha podido verificar');
    expect(copy.outcome).toBe('review');
    expect(localizedScanIssue(sample, 'en').description).toContain(sample.description);
  });
  it('names the landmark problem and preserves the affected element in evidence', () => {
    const copy = localizedScanIssue({ ...sample, ruleId: LANDMARK_COVERAGE_RULE.id, title: LANDMARK_COVERAGE_RULE.title,
      description: 'This perceivable page content is not contained within an exposed landmark. Review whether the page can be organized so landmark navigation covers the relevant content.',
      evidence: 'No banner, complementary, contentinfo, form, main, navigation, region or search landmark contains this img element.' }, 'es');
    expect(copy.title).toBe('Contenido fuera de las regiones de navegación');
    expect(copy.evidence).toContain('Este elemento img');
    expect(copy.evidence).not.toContain('Datos técnicos');
    expect(copy.description).not.toContain('This perceivable');
  });
  it('preserves names from the inspected page while translating surrounding prose', () => {
    const value = '3 exposed frames share accessible name "Search products". Review whether those frames have an equivalent purpose.';
    expect(localizedAuditEvidence(value, 'es')).toBe('3 marcos expuestos comparten el nombre accesible "Search products". Revisa si tienen un propósito equivalente.');
    expect(localizedAuditEvidence(value, 'en')).toBe(value);
  });
});
