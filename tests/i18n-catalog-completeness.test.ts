import { readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { localizedScanIssue, localizedReferenceLabel } from '../shared/i18n';
import { WCAG_COVERAGE } from '../shared/wcag-coverage';
import type { RuleDefinition } from '../shared/rule-catalog';

const rules = new Map<string, RuleDefinition>();
for (const file of readdirSync(new URL('../shared', import.meta.url)).filter((name) => name.endsWith('-rules.ts') || name === 'rule-catalog.ts')) {
  const module = await import(`../shared/${file.slice(0, -3)}.ts`);
  const visit = (value: unknown): void => {
    if (!value || typeof value !== 'object') return;
    const candidate = value as RuleDefinition;
    if (typeof candidate.id === 'string' && /^FT-(WCAG|WARN|REVIEW)-/.test(candidate.id) && candidate.title && candidate.severityRationale) {
      rules.set(candidate.id, candidate);
    } else for (const child of Object.values(value)) visit(child);
  };
  visit(module);
}

describe('complete Spanish public scan catalog', () => {
  it.each(WCAG_COVERAGE)('$id has a Spanish standards-matrix label', (criterion) => {
    expect(localizedReferenceLabel({ type: 'WCAG', id: criterion.id, label: criterion.title, url: criterion.url }, 'es')).not.toBe(criterion.title);
  });
  it.each([...rules.values()])('$id has a descriptive Spanish title and translated references', (rule) => {
    const result = localizedScanIssue({ id: 'test', ruleId: rule.id, title: rule.title, description: 'This page requires review.', severity: rule.severity, outcome: 'review', targets: [], references: rule.references }, 'es');
    expect(result.title).not.toBe(rule.title);
    expect(result.title).not.toContain('Hallazgo de accesibilidad');
    expect(result.description).not.toContain('This page requires review.');
    for (const reference of rule.references) {
      if (reference.label === reference.id) continue;
      expect(localizedReferenceLabel(reference, 'es'), `${rule.id}: ${reference.label}`).not.toBe(reference.label);
    }
  });
});
