import { describe, expect, it } from 'vitest';
import actCatalog from '../generated/act-catalog.json';
import htmlCatalog from '../generated/html-obsolete-catalog.json';
import sourcesRegistry from '../generated/standards-sources.json';
import wcagCatalog from '../generated/wcag-catalog.json';
import { ADVANCED_ARIA_RULES } from '../shared/aria-authoring-rules';
import { FOCUS_VISIBLE_RULE } from '../shared/focus-visible-rules';
import { FORM_PURPOSE_RULES } from '../shared/form-purpose-rules';
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
import { LANGUAGE_PARTS_RULE } from '../shared/language-parts-rules';
import { MEDIA_RULES } from '../shared/media-rules';
import { OBSOLETE_ATTRIBUTES, OBSOLETE_ELEMENTS } from '../shared/obsolete-html-registry';
import { RULES, type RuleDefinition } from '../shared/rule-catalog';
import { STRUCTURAL_HTML_RULES } from '../shared/structural-html-rules';
import { TEXT_SPACING_RULE } from '../shared/text-spacing-rules';
import {
  EN_301_549_WEB_STANDARD,
  WCAG_COVERAGE,
  WCAG_COVERAGE_SUMMARY,
  wcagCoverageForCriterion,
} from '../shared/wcag-coverage';

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

const ALL_RULES: RuleDefinition[] = [
  ...Object.values(RULES),
  ...FORM_PURPOSE_RULES,
  LANGUAGE_PARTS_RULE,
  TEXT_SPACING_RULE,
  FOCUS_VISIBLE_RULE,
  ...MEDIA_RULES,
  ...HTML_RULES,
  ...ADVANCED_ARIA_RULES,
];

describe('standards registry coverage', () => {
  it('keeps every FocusTrace WCAG and ACT reference resolvable against current upstream catalogs', () => {
    const wcag = new Map(wcagCatalog.criteria.map((criterion) => [criterion.id, criterion]));
    const act = new Set(actCatalog.rules.map((rule) => rule.id));

    for (const rule of ALL_RULES) {
      for (const reference of rule.references) {
        if (reference.type === 'WCAG') {
          const criterion = wcag.get(reference.id);
          expect(criterion, `${rule.id} references missing WCAG ${reference.id}`).toBeDefined();
          if (criterion?.status === 'active' && reference.level) {
            expect(reference.level, `${rule.id} has stale WCAG level for ${reference.id}`).toBe(criterion.level);
          }
        }
        if (reference.type === 'ACT') {
          expect(act.has(reference.id), `${rule.id} references missing ACT ${reference.id}`).toBe(true);
        }
      }
    }
  });

  it('monitors every standards family directly used by FocusTrace', () => {
    const ids = new Set(sourcesRegistry.sources.map((source) => source.id));
    for (const required of [
      'wcag22',
      'wcag22-errata',
      'wcag22-editor-draft',
      'wcag22-understanding',
      'wcag22-techniques',
      'wcag2-changelog',
      'html',
      'html-obsolete',
      'wai-aria',
      'accname',
      'html-aam',
      'core-aam',
      'apg',
      'mime-sniff',
      'iana-language-subtags',
    ]) {
      expect(ids.has(required), `Missing monitored source ${required}`).toBe(true);
    }
  });

  it('keeps the implemented obsolete-element registry aligned with the current WHATWG snapshot', () => {
    const implemented = OBSOLETE_ELEMENTS.map((definition) => definition.tag).sort();
    expect(implemented).toEqual([...htmlCatalog.obsoleteElements].sort());
  });

  it('keeps every implemented non-conforming obsolete attribute pair present in the WHATWG snapshot', () => {
    const upstream = new Set(htmlCatalog.obsoleteAttributePairs.map((pair) => `${pair.attribute}|${pair.element}`));
    for (const definition of OBSOLETE_ATTRIBUTES) {
      if (definition.elements === '*') {
        expect(upstream.has(`${definition.attribute}|*`), `Missing upstream pair ${definition.attribute}|*`).toBe(true);
        continue;
      }
      for (const element of definition.elements) {
        expect(upstream.has(`${definition.attribute}|${element}`), `Missing upstream pair ${definition.attribute}|${element}`).toBe(true);
      }
    }
  });

  it('exposes a criterion-by-criterion WCAG coverage matrix with execution surfaces', () => {
    const active = wcagCatalog.criteria.filter((criterion) => criterion.status === 'active');
    expect(WCAG_COVERAGE).toHaveLength(active.length);
    expect(WCAG_COVERAGE_SUMMARY.totalActive).toBe(active.length);
    expect(WCAG_COVERAGE_SUMMARY.implemented + WCAG_COVERAGE_SUMMARY.notImplemented).toBe(active.length);

    expect(wcagCoverageForCriterion('1.2.1')).toMatchObject({
      level: 'A',
      coverage: ['review', 'manual'],
      ruleIds: ['FT-REVIEW-017'],
      completeness: 'partial',
      manualReviewRequired: true,
    });
    expect(wcagCoverageForCriterion('1.2.2')).toMatchObject({
      level: 'A',
      coverage: ['review', 'manual'],
      ruleIds: ['FT-REVIEW-018'],
      actRuleIds: ['f51b46'],
      completeness: 'partial',
      manualReviewRequired: true,
    });
    expect(wcagCoverageForCriterion('1.2.3')).toMatchObject({
      level: 'A',
      coverage: ['review', 'manual'],
      ruleIds: ['FT-REVIEW-021'],
      actRuleIds: ['c5a4ea'],
      completeness: 'partial',
      manualReviewRequired: true,
    });
    expect(wcagCoverageForCriterion('1.2.4')).toMatchObject({
      level: 'AA',
      coverage: ['review', 'manual'],
      ruleIds: ['FT-REVIEW-022'],
      completeness: 'partial',
      manualReviewRequired: true,
    });
    expect(wcagCoverageForCriterion('1.2.5')).toMatchObject({
      level: 'AA',
      coverage: ['review', 'manual'],
      ruleIds: ['FT-REVIEW-023'],
      actRuleIds: ['1ec09b'],
      completeness: 'partial',
      manualReviewRequired: true,
    });
    expect(wcagCoverageForCriterion('1.3.5')).toMatchObject({
      level: 'AA',
      coverage: ['review', 'manual'],
      ruleIds: ['FT-REVIEW-014'],
      completeness: 'partial',
      manualReviewRequired: true,
    });
    expect(wcagCoverageForCriterion('1.4.3')).toMatchObject({
      level: 'AA',
      coverage: ['automated', 'manual'],
      ruleIds: ['FT-WCAG-010'],
      completeness: 'partial',
    });
    expect(wcagCoverageForCriterion('1.4.12')).toMatchObject({
      level: 'AA',
      coverage: ['review', 'manual'],
      ruleIds: ['FT-REVIEW-016'],
    });
    expect(wcagCoverageForCriterion('2.4.1')).toMatchObject({
      level: 'A',
      coverage: ['review', 'manual'],
      ruleIds: ['FT-REVIEW-012'],
    });
    expect(wcagCoverageForCriterion('2.4.3')?.coverage).toEqual(expect.arrayContaining(['review', 'runtime', 'manual']));
    expect(wcagCoverageForCriterion('2.4.7')).toMatchObject({
      level: 'AA',
      coverage: ['review', 'runtime', 'manual'],
      ruleIds: ['FT-RUNTIME-010'],
    });
    expect(wcagCoverageForCriterion('2.4.11')).toMatchObject({
      level: 'AA',
      coverage: ['review', 'runtime', 'manual'],
      ruleIds: ['FT-RUNTIME-002'],
    });
    expect(wcagCoverageForCriterion('2.5.7')).toMatchObject({
      level: 'AA',
      coverage: ['review', 'runtime', 'manual'],
      ruleIds: ['FT-RUNTIME-006'],
    });
    expect(wcagCoverageForCriterion('3.1.2')).toMatchObject({
      level: 'AA',
      coverage: ['automated', 'manual'],
      ruleIds: ['FT-WCAG-013'],
    });
    expect(wcagCoverageForCriterion('3.2.3')).toMatchObject({
      level: 'AA',
      coverage: ['review', 'site-audit', 'manual'],
      ruleIds: ['FT-REVIEW-013'],
    });
    expect(wcagCoverageForCriterion('3.2.4')).toMatchObject({
      level: 'AA',
      coverage: ['review', 'site-audit', 'manual'],
      ruleIds: ['FT-REVIEW-015'],
    });
    expect(wcagCoverageForCriterion('3.2.6')).toMatchObject({
      level: 'A',
      coverage: ['review', 'site-audit', 'manual'],
      ruleIds: ['FT-REVIEW-011'],
    });
  });

  it('keeps ACT traceability attached to the FocusTrace check that supplies it', () => {
    expect(wcagCoverageForCriterion('1.1.1')).toMatchObject({
      ruleIds: ['FT-WCAG-002'],
      actRuleIds: ['23a2a8'],
    });
    expect(wcagCoverageForCriterion('1.1.1')?.checks[0]).toMatchObject({
      ruleId: 'FT-WCAG-002',
      method: 'automated',
      surface: 'page',
      actRuleIds: ['23a2a8'],
    });
    expect(wcagCoverageForCriterion('1.2.2')?.checks[0]).toMatchObject({
      ruleId: 'FT-REVIEW-018',
      method: 'review',
      surface: 'page',
      actRuleIds: ['f51b46'],
    });
    expect(wcagCoverageForCriterion('1.2.3')?.checks[0]).toMatchObject({
      ruleId: 'FT-REVIEW-021',
      method: 'review',
      surface: 'page',
      actRuleIds: ['c5a4ea'],
    });
    expect(wcagCoverageForCriterion('1.2.5')?.checks[0]).toMatchObject({
      ruleId: 'FT-REVIEW-023',
      method: 'review',
      surface: 'page',
      actRuleIds: ['1ec09b'],
    });
  });

  it('maps WCAG 2.2 A/AA web requirements to EN 301 549 V4.1.1 clause 9 without treating AAA as an AA requirement', () => {
    expect(EN_301_549_WEB_STANDARD.version).toBe('V4.1.1 (2026-09)');
    expect(wcagCoverageForCriterion('1.1.1')?.en301549?.clause).toBe('9.1.1.1');
    expect(wcagCoverageForCriterion('1.2.1')?.en301549?.clause).toBe('9.1.2.1');
    expect(wcagCoverageForCriterion('1.2.2')?.en301549?.clause).toBe('9.1.2.2');
    expect(wcagCoverageForCriterion('1.2.3')?.en301549?.clause).toBe('9.1.2.3');
    expect(wcagCoverageForCriterion('1.2.4')?.en301549?.clause).toBe('9.1.2.4');
    expect(wcagCoverageForCriterion('1.2.5')?.en301549?.clause).toBe('9.1.2.5');
    expect(wcagCoverageForCriterion('2.4.11')?.en301549?.clause).toBe('9.2.4.11');
    expect(wcagCoverageForCriterion('3.2.6')?.en301549?.clause).toBe('9.3.2.6');
    expect(wcagCoverageForCriterion('1.2.6')?.level).toBe('AAA');
    expect(wcagCoverageForCriterion('1.2.6')?.en301549).toBeUndefined();
    expect(WCAG_COVERAGE_SUMMARY.en301549Web).toBe(WCAG_COVERAGE_SUMMARY.levelAOrAA);
  });

  it('prevents tool-assisted coverage from being presented as complete WCAG conformance by default', () => {
    expect(WCAG_COVERAGE_SUMMARY.totalActive).toBeGreaterThan(80);
    expect(WCAG_COVERAGE_SUMMARY.implemented).toBeGreaterThan(0);
    expect(WCAG_COVERAGE_SUMMARY.notImplemented).toBeGreaterThan(0);
    expect(WCAG_COVERAGE_SUMMARY.automated).toBeLessThan(WCAG_COVERAGE_SUMMARY.totalActive);
    expect(WCAG_COVERAGE_SUMMARY.complete).toBe(0);
    expect(WCAG_COVERAGE_SUMMARY.partial).toBe(WCAG_COVERAGE_SUMMARY.implemented);
    expect(WCAG_COVERAGE_SUMMARY.manualRequired).toBe(WCAG_COVERAGE_SUMMARY.totalActive);

    const uncovered = WCAG_COVERAGE.find((criterion) => !criterion.implemented);
    expect(uncovered?.coverage).toEqual(['manual', 'not-covered']);
    expect(uncovered?.completeness).toBe('none');
  });
});
