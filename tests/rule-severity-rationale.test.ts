import { describe, expect, it } from 'vitest';
import { RULES, localizedRuleSeverityRationale, ruleDefinitionForId } from '../shared/rule-catalog';

const rules = Object.values(RULES);

describe('rule severity rationale', () => {
  it('documents every FocusTrace rule in both supported languages', () => {
    expect(rules).toHaveLength(25);
    for (const rule of rules) {
      expect(rule.severityRationale.en.trim().length, `${rule.id} English rationale`).toBeGreaterThan(24);
      expect(rule.severityRationale.es.trim().length, `${rule.id} Spanish rationale`).toBeGreaterThan(24);
      expect(localizedRuleSeverityRationale(rule.id, 'en')).toBe(rule.severityRationale.en);
      expect(localizedRuleSeverityRationale(rule.id, 'es')).toBe(rule.severityRationale.es);
      expect(ruleDefinitionForId(rule.id)).toBe(rule);
    }
  });

  it('keeps direct external impact comparisons aligned with the FocusTrace base severity', () => {
    for (const rule of rules) {
      for (const reference of rule.impactReferences) {
        expect(reference.url).toMatch(/^https:\/\/dequeuniversity\.com\/rules\/axe\/4\.12\//);
        if (reference.relation === 'direct') {
          expect(reference.impact, `${rule.id} vs ${reference.ruleId}`).toBe(rule.severity);
        }
      }
    }
  });

  it('records the severity changes found during the rule-by-rule audit', () => {
    expect(RULES.ariaHiddenFocusable.severity).toBe('serious');
    expect(RULES.deprecatedAriaRole.severity).toBe('minor');
    expect(RULES.prohibitedAriaProperty.severity).toBe('serious');
    expect(RULES.positiveTabindex.severity).toBe('serious');
  });

  it('marks broader or narrower comparisons as partial instead of pretending equivalence', () => {
    expect(RULES.imageName.impactReferences.every((reference) => reference.relation === 'partial')).toBe(true);
    expect(RULES.buttonName.impactReferences.every((reference) => reference.relation === 'partial')).toBe(true);
    expect(RULES.formFieldName.impactReferences.every((reference) => reference.relation === 'partial')).toBe(true);
    expect(RULES.headingJump.impactReferences[0]?.relation).toBe('partial');
    expect(RULES.headingJump.impactReferences[0]?.impact).toBe('moderate');
    expect(RULES.headingJump.severity).toBe('minor');
  });
});
