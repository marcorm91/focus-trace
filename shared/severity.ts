import type { Severity } from './types';

export const SEVERITY_ORDER: readonly Severity[] = [
  'critical',
  'serious',
  'moderate',
  'minor',
  'info',
];

const SEVERITY_WEIGHT: Record<Severity, number> = {
  critical: 4,
  serious: 3,
  moderate: 2,
  minor: 1,
  info: 0,
};

export type SeverityFilter = 'all' | Severity;

export function severityRank(severity: Severity): number {
  return SEVERITY_WEIGHT[severity];
}

export function sortBySeverity<T extends { severity: Severity }>(items: readonly T[]): T[] {
  return [...items].sort((left, right) => severityRank(right.severity) - severityRank(left.severity));
}

export function countBySeverity(items: readonly { severity: Severity }[]): Record<Severity, number> {
  const counts: Record<Severity, number> = {
    critical: 0,
    serious: 0,
    moderate: 0,
    minor: 0,
    info: 0,
  };
  for (const item of items) counts[item.severity] += 1;
  return counts;
}
