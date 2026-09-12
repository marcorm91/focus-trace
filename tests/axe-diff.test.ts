import { describe, expect, it } from 'vitest';
import { axeDiffReport } from '../tools/axe-diff.mjs';

const before = {
  source: { tag: 'v4.12.0' },
  summary: { total: 0, critical: 0, serious: 0, moderate: 0, minor: 0 },
  rules: [],
};

const after = {
  source: { tag: 'v4.13.0' },
  summary: { total: 2, critical: 2, serious: 0, moderate: 0, minor: 0 },
  rules: [
    { id: 'image-alt', impact: 'critical' as const },
    { id: 'aria-required-children', impact: 'critical' as const },
  ],
};

describe('axe registry diff', () => {
  it('uses schema-v2 severityMappings without falling back to the removed mappings field', () => {
    const report = axeDiffReport(before, after, {
      schemaVersion: 2,
      severityMappings: [
        { focusTraceRuleId: 'FT-WCAG-002', axeRuleIds: ['image-alt'] },
      ],
    });

    expect(report).toContain('Release: `v4.12.0` → `v4.13.0`');
    expect(report).toContain('referenced by current FocusTrace severity benchmark: **1**');
    expect(report).toContain('not currently referenced by a FocusTrace severity mapping: **1**');
    expect(report).toContain('`image-alt` · critical');
    expect(report).toContain('`aria-required-children` · critical');
  });

  it('keeps schema v1 readable for historical benchmark fixtures', () => {
    const report = axeDiffReport(before, after, {
      schemaVersion: 1,
      mappings: [
        { focusTraceRuleId: 'FT-WCAG-002', axeRuleIds: ['image-alt'] },
      ],
    });

    expect(report).toContain('referenced by current FocusTrace severity benchmark: **1**');
  });

  it('fails explicitly for an unsupported mapping schema', () => {
    expect(() => axeDiffReport(before, after, { schemaVersion: 99 })).toThrow(
      /unsupported axe equivalence schema version/i,
    );
  });
});
