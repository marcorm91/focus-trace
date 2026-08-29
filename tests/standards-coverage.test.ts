import { describe, expect, it } from 'vitest';
import actCatalog from '../generated/act-catalog.json';
import htmlCatalog from '../generated/html-obsolete-catalog.json';
import sourcesRegistry from '../generated/standards-sources.json';
import wcagCatalog from '../generated/wcag-catalog.json';
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
import { OBSOLETE_ATTRIBUTES, OBSOLETE_ELEMENTS } from '../shared/obsolete-html-registry';
import { RULES, type RuleDefinition } from '../shared/rule-catalog';
import { STRUCTURAL_HTML_RULES } from '../shared/structural-html-rules';
import { WCAG_COVERAGE, WCAG_COVERAGE_SUMMARY, wcagCoverageForCriterion } from '../shared/wcag-coverage';

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

const ALL_RULES: RuleDefinition[] = [...Object.values(RULES), ...HTML_RULES, ...ADVANCED_ARIA_RULES];

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

  it('exposes a criterion-by-criterion WCAG coverage matrix', () => {
    const active = wcagCatalog.criteria.filter((criterion) => criterion.status === 'active');
    expect(WCAG_COVERAGE).toHaveLength(active.length);
    expect(WCAG_COVERAGE_SUMMARY.totalActive).toBe(active.length);
    expect(WCAG_COVERAGE_SUMMARY.implemented + WCAG_COVERAGE_SUMMARY.notImplemented).toBe(active.length);

    expect(wcagCoverageForCriterion('1.4.3')).toMatchObject({
      level: 'AA',
      coverage: ['automated'],
      ruleIds: ['FT-WCAG-010'],
      implemented: true,
    });
    expect(wcagCoverageForCriterion('2.4.3')?.coverage).toEqual(expect.arrayContaining(['review', 'runtime']));
  });

  it('makes WCAG coverage gaps explicit instead of implying full automated conformance', () => {
    expect(WCAG_COVERAGE_SUMMARY.totalActive).toBeGreaterThan(80);
    expect(WCAG_COVERAGE_SUMMARY.implemented).toBeGreaterThan(0);
    expect(WCAG_COVERAGE_SUMMARY.notImplemented).toBeGreaterThan(0);
    expect(WCAG_COVERAGE_SUMMARY.automated).toBeLessThan(WCAG_COVERAGE_SUMMARY.totalActive);
  });
});
