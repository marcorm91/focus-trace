import { describe, expect, it } from 'vitest';
import { countByOutcomeAndSeverity, countBySeverity, severityRank, sortBySeverity } from '../shared/severity';
import type { FindingOutcome, Severity } from '../shared/types';

describe('severity impact helpers', () => {
  it('orders findings from highest to lowest impact', () => {
    const findings: Array<{ id: string; severity: Severity }> = [
      { id: 'minor', severity: 'minor' },
      { id: 'critical', severity: 'critical' },
      { id: 'moderate', severity: 'moderate' },
      { id: 'serious', severity: 'serious' },
      { id: 'info', severity: 'info' },
    ];

    expect(sortBySeverity(findings).map((finding) => finding.id)).toEqual([
      'critical',
      'serious',
      'moderate',
      'minor',
      'info',
    ]);
  });

  it('counts each impact level independently', () => {
    const counts = countBySeverity([
      { severity: 'critical' as const },
      { severity: 'serious' as const },
      { severity: 'serious' as const },
      { severity: 'minor' as const },
    ]);

    expect(counts).toEqual({
      critical: 1,
      serious: 2,
      moderate: 0,
      minor: 1,
      info: 0,
    });
    expect(severityRank('critical')).toBeGreaterThan(severityRank('serious'));
    expect(severityRank('minor')).toBeGreaterThan(severityRank('info'));
  });

  it('keeps outcome and impact as independent matrix dimensions', () => {
    const findings: Array<{ outcome: FindingOutcome; severity: Severity }> = [
      { outcome: 'fail', severity: 'serious' },
      { outcome: 'fail', severity: 'serious' },
      { outcome: 'review', severity: 'minor' },
      { outcome: 'review', severity: 'serious' },
      { outcome: 'warning', severity: 'minor' },
    ];

    const matrix = countByOutcomeAndSeverity(findings);

    expect(matrix.fail.serious).toBe(2);
    expect(matrix.fail.minor).toBe(0);
    expect(matrix.review.minor).toBe(1);
    expect(matrix.review.serious).toBe(1);
    expect(matrix.warning.minor).toBe(1);
  });
});
