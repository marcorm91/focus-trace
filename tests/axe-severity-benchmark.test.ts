import { describe, expect, it } from 'vitest';
import axeEquivalents from '../config/axe-equivalents.json';
import axeRegistry from '../generated/axe-rule-severities.json';
import { ADVANCED_ARIA_RULES } from '../shared/aria-authoring-rules';
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
import { RULES, type RuleDefinition } from '../shared/rule-catalog';
import { STRUCTURAL_HTML_RULES } from '../shared/structural-html-rules';
import type { Severity } from '../shared/types';

type AxeImpact = Exclude<Severity, 'info'>;

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
  ...STRUCTURAL_HTML_RULES,
];

const ALL_RULES = new Map(
  [...Object.values(RULES), ...HTML_RULES, ...ADVANCED_ARIA_RULES].map((rule) => [rule.id, rule] as const),
);
const AXE_RULES = new Map(axeRegistry.rules.map((rule) => [rule.id, rule] as const));
const IMPACT_RANK: Record<AxeImpact, number> = {
  critical: 4,
  serious: 3,
  moderate: 2,
  minor: 1,
};

function highestAxeImpact(ids: string[]): AxeImpact {
  const impacts = ids
    .map((id) => AXE_RULES.get(id)?.impact)
    .filter((impact): impact is AxeImpact => impact != null);
  expect(impacts.length, `No rated axe rules found for ${ids.join(', ')}`).toBeGreaterThan(0);
  const highest = impacts.sort((a, b) => IMPACT_RANK[b] - IMPACT_RANK[a])[0];
  if (!highest) throw new Error(`No rated axe rules found for ${ids.join(', ')}`);
  return highest;
}

describe('axe-core severity benchmark', () => {
  it('stores the complete current axe impact registry rather than only critical rules', () => {
    expect(axeRegistry.source.repository).toBe('dequelabs/axe-core');
    expect(axeRegistry.source.tag).toMatch(/^v\d+\.\d+\.\d+/);
    expect(axeRegistry.rules.length).toBeGreaterThan(80);
    expect(axeRegistry.summary.total).toBe(axeRegistry.rules.length);
    expect(axeRegistry.summary.critical).toBe(axeRegistry.rules.filter((rule) => rule.impact === 'critical').length);
    expect(axeRegistry.summary.serious).toBe(axeRegistry.rules.filter((rule) => rule.impact === 'serious').length);
    expect(axeRegistry.summary.moderate).toBe(axeRegistry.rules.filter((rule) => rule.impact === 'moderate').length);
    expect(axeRegistry.summary.minor).toBe(axeRegistry.rules.filter((rule) => rule.impact === 'minor').length);
  });

  it('keeps every declared FocusTrace ↔ axe equivalence resolvable', () => {
    for (const mapping of axeEquivalents.mappings) {
      expect(ALL_RULES.has(mapping.focusTraceRuleId), `Missing FocusTrace rule ${mapping.focusTraceRuleId}`).toBe(true);
      for (const axeRuleId of mapping.axeRuleIds) {
        expect(AXE_RULES.has(axeRuleId), `${mapping.focusTraceRuleId} maps to missing axe rule ${axeRuleId}`).toBe(true);
      }
    }
  });

  it('aligns mapped FocusTrace severities to the highest equivalent axe impact', () => {
    for (const mapping of axeEquivalents.mappings.filter((entry) => entry.policy === 'highest-impact')) {
      const rule = ALL_RULES.get(mapping.focusTraceRuleId);
      expect(rule, `Missing FocusTrace rule ${mapping.focusTraceRuleId}`).toBeDefined();
      const expected = highestAxeImpact(mapping.axeRuleIds);
      expect(rule?.severity, `${mapping.focusTraceRuleId} is out of sync with ${mapping.axeRuleIds.join(', ')}`).toBe(expected);
    }
  });

  it('keeps the full axe critical list queryable even when FocusTrace has no equivalent rule yet', () => {
    const critical = axeRegistry.rules.filter((rule) => rule.impact === 'critical');
    const mapped = new Set(axeEquivalents.mappings.flatMap((entry) => entry.axeRuleIds));
    expect(critical.length).toBeGreaterThan(0);
    expect(critical.some((rule) => !mapped.has(rule.id))).toBe(true);
  });
});
