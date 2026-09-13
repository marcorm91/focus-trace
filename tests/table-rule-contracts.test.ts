import { describe, expect, it } from 'vitest';
import { TABLE_RULE_DEFINITIONS, TABLE_RULES } from '../shared/table-rules';

describe('table rule contracts', () => {
  it('keeps compact runtime rules aligned with full documented definitions', () => {
    expect(TABLE_RULE_DEFINITIONS.map((rule) => rule.id)).toEqual(TABLE_RULES.map((rule) => rule.id));
    expect(TABLE_RULE_DEFINITIONS).toHaveLength(6);
    for (const rule of TABLE_RULE_DEFINITIONS) {
      expect(rule.severityRationale.en.trim()).not.toBe('');
      expect(rule.severityRationale.es.trim()).not.toBe('');
      expect(rule.references.length).toBeGreaterThan(0);
    }
  });
});
