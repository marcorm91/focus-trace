import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import axeEquivalents from '../config/axe-equivalents.json';
import aaa from '../config/axe-parity/aaa.json';
import bestPractice01 from '../config/axe-parity/best-practice-01.json';
import bestPractice02 from '../config/axe-parity/best-practice-02.json';
import core01 from '../config/axe-parity/core-01.json';
import core02 from '../config/axe-parity/core-02.json';
import core03 from '../config/axe-parity/core-03.json';
import core04 from '../config/axe-parity/core-04.json';
import deprecated from '../config/axe-parity/deprecated.json';
import experimental from '../config/axe-parity/experimental.json';
import wcagModern from '../config/axe-parity/wcag-modern.json';
import axeRegistry from '../generated/axe-rule-severities.json';
import { summarizeAxeParity, validateAxeMappings, validateAxeRegistry } from '../tools/axe-validate.mjs';

const CLASSIFICATIONS = [
  ...core01.classifications,
  ...core02.classifications,
  ...core03.classifications,
  ...core04.classifications,
  ...wcagModern.classifications,
  ...bestPractice01.classifications,
  ...bestPractice02.classifications,
  ...aaa.classifications,
  ...experimental.classifications,
  ...deprecated.classifications,
];

describe('axe-core parity classification', () => {
  it('classifies every axe-core 4.13 rule exactly once', () => {
    const axeRuleIds = validateAxeRegistry(axeRegistry);
    const classifiedRuleIds = new Set(CLASSIFICATIONS.map((entry) => entry.axeRuleId));

    expect(axeRegistry.source.release).toBe('4.13.0');
    expect(axeRegistry.rules).toHaveLength(105);
    expect(CLASSIFICATIONS).toHaveLength(105);
    expect(classifiedRuleIds.size).toBe(105);
    expect(classifiedRuleIds).toEqual(axeRuleIds);
  });

  it('keeps the reviewed summary reproducible from the classification data', () => {
    const axeRuleIds = validateAxeRegistry(axeRegistry);
    const summary = validateAxeMappings(
      axeEquivalents,
      axeRuleIds,
      CLASSIFICATIONS,
      axeRegistry.source.release,
    );

    expect(summary).toEqual(axeEquivalents.summary);
    expect(summary).toEqual({
      total: 105,
      equivalent: 5,
      partial: 23,
      superset: 10,
      overlap: 23,
      missing: 43,
      'not-applicable': 1,
      covered: 61,
    });
  });

  it('keeps every declared classification and evidence path backed by a real repository file', () => {
    for (const path of axeEquivalents.classificationFiles) {
      expect(existsSync(resolve(path)), `Missing classification file ${path}`).toBe(true);
    }

    for (const [key, evidence] of Object.entries(axeEquivalents.evidenceSets)) {
      for (const path of [...evidence.sources, ...evidence.tests]) {
        expect(existsSync(resolve(path)), `Missing ${key} evidence path ${path}`).toBe(true);
      }
    }
  });

  it('keeps benchmark-only frame orchestration out of functional parity', () => {
    expect(CLASSIFICATIONS.find((entry) => entry.axeRuleId === 'frame-tested')).toMatchObject({
      relationship: 'not-applicable',
      focusTraceRuleIds: [],
    });
  });

  it('fails closed when the classification becomes incomplete or the summary drifts', () => {
    const axeRuleIds = validateAxeRegistry(axeRegistry);
    expect(() => validateAxeMappings(
      axeEquivalents,
      axeRuleIds,
      CLASSIFICATIONS.slice(1),
      axeRegistry.source.release,
    )).toThrow(/expected 105 axe classifications/i);

    const computed = summarizeAxeParity(CLASSIFICATIONS);
    expect({ ...computed, missing: computed.missing + 1 }).not.toEqual(axeEquivalents.summary);
  });
});
