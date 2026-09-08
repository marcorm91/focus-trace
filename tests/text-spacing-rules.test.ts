import { describe, expect, it } from 'vitest';
import { TEXT_SPACING_RULE } from '../shared/text-spacing-rules';

describe('text spacing rule contract', () => {
  it('keeps WCAG 1.4.12 as contextual REVIEW with approved ACT traceability', () => {
    expect(TEXT_SPACING_RULE).toMatchObject({
      id: 'FT-REVIEW-016',
      severity: 'moderate',
    });
    expect(TEXT_SPACING_RULE.references.find((reference) => reference.type === 'WCAG')).toMatchObject({
      id: '1.4.12',
      level: 'AA',
      status: 'normative',
    });
    expect(TEXT_SPACING_RULE.references.filter((reference) => reference.type === 'ACT').map((reference) => reference.id)).toEqual([
      '24afc2',
      '78fd32',
      '9e45ec',
    ]);
    expect(TEXT_SPACING_RULE.references.filter((reference) => reference.type === 'ACT').every((reference) => reference.status === 'informative')).toBe(true);
    expect(TEXT_SPACING_RULE.severityRationale.en.length).toBeGreaterThan(80);
    expect(TEXT_SPACING_RULE.severityRationale.es.length).toBeGreaterThan(80);
  });
});
