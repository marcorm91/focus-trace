import { describe, expect, it } from 'vitest';
import equivalents from '../config/axe-equivalents.json';
import core01 from '../config/axe-parity/core-01.json';

describe('ElementInternals axe-core parity evidence', () => {
  it('strengthens existing relationships without inflating the reviewed coverage total', () => {
    expect(equivalents.summary).toMatchObject({
      total: 105,
      equivalent: 5,
      partial: 30,
      superset: 10,
      overlap: 21,
      missing: 38,
      'not-applicable': 1,
      covered: 66,
    });
  });

  it('uses ElementInternals evidence only on relationships that remain partial or overlap', () => {
    const byId = new Map(core01.classifications.map((entry) => [entry.axeRuleId, entry]));
    const expected = new Map<string, 'partial' | 'overlap'>([
      ['aria-allowed-attr', 'overlap'],
      ['aria-command-name', 'partial'],
      ['aria-input-field-name', 'partial'],
      ['aria-meter-name', 'partial'],
      ['aria-progressbar-name', 'partial'],
      ['aria-required-attr', 'overlap'],
    ]);

    for (const [axeRuleId, relationship] of expected) {
      expect(byId.get(axeRuleId)).toMatchObject({ relationship, evidenceKey: 'e23' });
    }
  });

  it('keeps the e23 evidence set tied to the independent FocusTrace bridge and tests', () => {
    expect(equivalents.evidenceSets.e23).toEqual({
      sources: [
        'shared/element-internals-bridge.ts',
        'lib/extension/element-internals-main-world.ts',
        'lib/audit/element-internals-bridge.ts',
        'lib/audit/element-internals-semantics.ts',
      ],
      tests: ['tests/element-internals-semantics.test.ts'],
    });
  });
});
