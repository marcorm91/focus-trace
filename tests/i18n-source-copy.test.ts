import { describe, expect, it } from 'vitest';
import {
  ALLOWED_ARIA_CHILD_RULE,
  ARIA_REFERENCE_RULE,
  ARIA_RELATIONSHIP_CONSISTENCY_RULE,
  ARIA_STATE_CONSISTENCY_RULE,
  INVALID_ARIA_ROLE_RULE,
  INVALID_ARIA_VALUE_RULE,
  REQUIRED_ARIA_PARENT_RULE,
  REQUIRED_ARIA_PROPERTY_RULE,
  UNKNOWN_ARIA_ATTRIBUTE_RULE,
  UNSUPPORTED_ARIA_PROPERTY_RULE,
} from '../shared/aria-authoring-rules';
import {
  DUPLICATE_ID_RULE,
  GENERIC_INTERACTIVE_SEMANTICS_RULE,
  MAIN_LANDMARK_RULE,
  MULTIPLE_MAIN_LANDMARKS_RULE,
  NATIVE_BUTTON_SEMANTICS_RULE,
  NATIVE_LINK_SEMANTICS_RULE,
  OBSOLETE_BUT_CONFORMING_HTML_RULE,
  OBSOLETE_HTML_ATTRIBUTE_RULE,
  OBSOLETE_HTML_ELEMENT_RULE,
} from '../shared/html-authoring-rules';
import { localizedReferenceLabel, localizedScanIssue } from '../shared/i18n';
import { RULES, type RuleDefinition } from '../shared/rule-catalog';
import { STRUCTURAL_HTML_RULES } from '../shared/structural-html-rules';
import type { ScanIssue } from '../shared/types';

const HTML_RULES: RuleDefinition[] = [
  DUPLICATE_ID_RULE,
  OBSOLETE_HTML_ELEMENT_RULE,
  OBSOLETE_HTML_ATTRIBUTE_RULE,
  OBSOLETE_BUT_CONFORMING_HTML_RULE,
  MAIN_LANDMARK_RULE,
  MULTIPLE_MAIN_LANDMARKS_RULE,
  NATIVE_BUTTON_SEMANTICS_RULE,
  NATIVE_LINK_SEMANTICS_RULE,
  GENERIC_INTERACTIVE_SEMANTICS_RULE,
];

const ARIA_RULES: RuleDefinition[] = [
  INVALID_ARIA_ROLE_RULE,
  UNKNOWN_ARIA_ATTRIBUTE_RULE,
  INVALID_ARIA_VALUE_RULE,
  REQUIRED_ARIA_PROPERTY_RULE,
  ARIA_REFERENCE_RULE,
  REQUIRED_ARIA_PARENT_RULE,
  ALLOWED_ARIA_CHILD_RULE,
  ARIA_STATE_CONSISTENCY_RULE,
  UNSUPPORTED_ARIA_PROPERTY_RULE,
  ARIA_RELATIONSHIP_CONSISTENCY_RULE,
];

const ALL_RULES: RuleDefinition[] = [
  ...Object.values(RULES),
  ...HTML_RULES,
  ...STRUCTURAL_HTML_RULES,
  ...ARIA_RULES,
];

function issue(overrides: Partial<ScanIssue>): ScanIssue {
  return {
    id: 'source-copy-test',
    ruleId: 'FT-REVIEW-003',
    title: 'Form field relies on placeholder text as its accessible name',
    description: 'The control has a programmatically computed name, but that name comes only from placeholder text.',
    severity: 'moderate',
    outcome: 'review',
    targets: ['#query'],
    references: [],
    ...overrides,
  };
}

describe('Spanish localization of synced/source copy', () => {
  it('localizes every standards label currently exposed by the rule catalog', () => {
    const references = new Map(
      ALL_RULES.flatMap((rule) => rule.references).map((reference) => [
        `${reference.type}:${reference.id}:${reference.label}`,
        reference,
      ]),
    );

    for (const reference of references.values()) {
      const localized = localizedReferenceLabel(reference, 'es');
      expect(localized, `${reference.type} ${reference.id} should have Spanish display copy`).not.toBe(reference.label);
      expect(localizedReferenceLabel(reference, 'en')).toBe(reference.label);
    }
  });

  it('localizes placeholder-source evidence while preserving the page value', () => {
    const localized = localizedScanIssue(issue({
      evidence: 'Accessible name "Search products" is sourced from placeholder.',
    }), 'es');

    expect(localized.evidence).toBe('El nombre accesible "Search products" procede de placeholder.');
    expect(localized.evidence).not.toContain('is sourced from');
  });

  it('localizes missing-main evidence instead of leaking scanner English', () => {
    const localized = localizedScanIssue(issue({
      ruleId: 'FT-REVIEW-004',
      title: 'Page exposes a primary main landmark',
      description: 'The page does not expose a visible main landmark.',
      evidence: 'No exposed main landmark was detected. Prefer a native <main> element for the primary content when the document structure allows it.',
    }), 'es');

    expect(localized.evidence).toContain('No se ha detectado ningún landmark main expuesto');
    expect(localized.evidence).toContain('<main>');
    expect(localized.evidence).not.toContain('Prefer a native');
  });

  it('localizes consistent-help evidence while preserving compared page and order', () => {
    const localized = localizedScanIssue(issue({
      ruleId: 'FT-REVIEW-011',
      title: 'Repeated help mechanisms may change order across pages',
      description: 'The same observed help mechanisms appear in a different relative order across sampled pages.',
      evidence: 'Observed order: human contact mechanism → self-help option. Comparison page https://example.com/help-b: self-help option → human contact mechanism.',
    }), 'es');

    expect(localized.title).toContain('mecanismos de ayuda');
    expect(localized.description).toContain('WCAG 3.2.6');
    expect(localized.evidence).toBe(
      'Orden observado: mecanismo de contacto humano → opción de autoayuda. Página comparada https://example.com/help-b: opción de autoayuda → mecanismo de contacto humano.',
    );
    expect(localized.evidence).not.toContain('Observed order');
    expect(localized.evidence).not.toContain('Comparison page');
  });

  it('localizes obsolete HTML evidence and modernization guidance', () => {
    const localized = localizedScanIssue(issue({
      ruleId: 'FT-WARN-007',
      title: 'Obsolete but conforming HTML feature is used',
      description: 'The page uses an obsolete legacy feature.',
      evidence: 'style[type="text/css"] is obsolete but conforming. Suggested modernization: Remove type="text/css"; CSS is the default style language.',
      outcome: 'warning',
      severity: 'minor',
    }), 'es');

    expect(localized.evidence).toContain('está obsoleto pero sigue siendo conforme');
    expect(localized.evidence).toContain('Modernización sugerida');
    expect(localized.evidence).toContain('Elimina type="text/css"');
    expect(localized.evidence).not.toContain('Suggested modernization');
    expect(localized.evidence).not.toContain('default style language');
  });

  it('uses a Spanish safety fallback for unexpected generated English while preserving technical tokens', () => {
    const localized = localizedScanIssue(issue({
      ruleId: 'FT-FUTURE-999',
      title: 'Unexpected source rule title',
      description: 'This generated source description has not been localized yet.',
      evidence: 'This element requires role="button" and references #save-panel.',
    }), 'es');

    expect(localized.title).toBe('Hallazgo de accesibilidad FT-FUTURE-999');
    expect(localized.description).toContain('requiere revisión');
    expect(localized.description).not.toContain('generated source description');
    expect(localized.evidence).toContain('role="button"');
    expect(localized.evidence).toContain('#save-panel');
    expect(localized.evidence).not.toContain('This element requires');
  });
});