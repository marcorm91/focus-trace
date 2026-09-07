import { describe, expect, it } from 'vitest';
import { INPUT_PURPOSE_AUTOCOMPLETE_RULE } from '../shared/form-purpose-rules';

describe('input purpose rule contract', () => {
  it('keeps the contextual review documented in both supported languages', () => {
    expect(INPUT_PURPOSE_AUTOCOMPLETE_RULE).toMatchObject({
      id: 'FT-REVIEW-014',
      severity: 'serious',
    });
    expect(INPUT_PURPOSE_AUTOCOMPLETE_RULE.severityRationale.en.length).toBeGreaterThan(24);
    expect(INPUT_PURPOSE_AUTOCOMPLETE_RULE.severityRationale.es.length).toBeGreaterThan(24);
  });

  it('links the review to WCAG 1.3.5 and ACT 73f2c2', () => {
    expect(INPUT_PURPOSE_AUTOCOMPLETE_RULE.references).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'WCAG', id: '1.3.5', level: 'AA' }),
      expect.objectContaining({ type: 'ACT', id: '73f2c2' }),
    ]));
  });
});
