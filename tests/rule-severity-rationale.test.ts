import { describe, expect, it } from 'vitest';
import { RULES, localizedRuleSeverityRationale, ruleDefinitionForId } from '../shared/rule-catalog';

const rules = Object.values(RULES);

describe('rule severity rationale', () => {
  it('documents every FocusTrace rule in both supported languages', () => {
    expect(rules).toHaveLength(27);
    for (const rule of rules) {
      expect(rule.severityRationale.en.trim().length, `${rule.id} English rationale`).toBeGreaterThan(24);
      expect(rule.severityRationale.es.trim().length, `${rule.id} Spanish rationale`).toBeGreaterThan(24);
      expect(localizedRuleSeverityRationale(rule.id, 'en')).toBe(rule.severityRationale.en);
      expect(localizedRuleSeverityRationale(rule.id, 'es')).toBe(rule.severityRationale.es);
      expect(ruleDefinitionForId(rule.id)).toBe(rule);
    }
  });

  it('keeps standards references separate from FocusTrace severity', () => {
    for (const rule of rules) {
      expect(rule.references.length, `${rule.id} standards references`).toBeGreaterThan(0);
      expect(rule).not.toHaveProperty('impactReferences');
      for (const reference of rule.references) {
        expect(['WCAG', 'ACT', 'WAI-ARIA', 'WAI-ARIA APG']).toContain(reference.type);
      }
    }
  });

  it('records the severity changes found during the rule-by-rule audit', () => {
    expect(RULES.ariaHiddenFocusable.severity).toBe('serious');
    expect(RULES.deprecatedAriaRole.severity).toBe('minor');
    expect(RULES.prohibitedAriaProperty.severity).toBe('serious');
    expect(RULES.positiveTabindex.severity).toBe('serious');
  });

  it('keeps contextual review signals independent from their base impact', () => {
    expect(RULES.positiveTabindex.severity).toBe('serious');
    expect(RULES.headingJump.severity).toBe('minor');
    expect(RULES.placeholderOnlyLabel.severity).toBe('moderate');
    expect(RULES.draggingMovement.severity).toBe('moderate');
    expect(RULES.consistentHelp.severity).toBe('moderate');
  });
});
