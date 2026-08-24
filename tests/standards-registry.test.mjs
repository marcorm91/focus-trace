import { describe, expect, it } from 'vitest';
import { buildCatalog, parseActRule } from '../tools/act-sync.mjs';
import { diffCatalogs } from '../tools/act-diff.mjs';
import { buildAriaRegistry, deprecatedRoleVersion, parseRoleInfoSource } from '../tools/aria-sync.mjs';
import { diffAriaRegistries } from '../tools/aria-diff.mjs';
import { parseLanguageSubtagRegistry } from '../tools/language-sync.mjs';
import { diffLanguageRegistries } from '../tools/language-diff.mjs';
import { validateActCatalog, validateAriaRegistry, validateLanguageRegistry } from '../tools/standards-validate.mjs';

const ACT_RULE = `---
id: abc123
name: Example rule
rules_format: 1.1
rule_type: atomic
accessibility_requirements:
  wcag22:4.1.2:
    forConformance: true
input_aspects:
  - DOM Tree
  - Accessibility Tree
deprecated: |
  Historical only.
---

## Applicability

Every example node.

## Expectation

The node has a name.
`;

const ROLE_INFO = `var roleInfo = {
  button: {
    name: "button",
    fragID: "button",
    parentRoles: ["command"],
    allprops: [
      { is: "state", name: "aria-disabled", required: false, disallowed: false, deprecated: false },
      { is: "property", name: "aria-errormessage", required: false, disallowed: false, deprecated: true }
    ]
  },
  directory: {
    name: "directory",
    fragID: "directory",
    parentRoles: ["list"],
    allprops: []
  }
};`;

const ARIA_SPEC = `<!doctype html><html><head><title>Accessible Rich Internet Applications (WAI-ARIA) 1.3</title></head><body>
<div class="role" id="button"><div class="role-description"><p>A button.</p></div><table></table></div>
<div class="role" id="directory"><div class="role-description"><p>[Deprecated in ARIA 1.2] A list of references.</p></div><table></table></div>
</body></html>`;

const LANGUAGE_REGISTRY = `File-Date: 2026-08-08
%%
Type: language
Subtag: en
Description: English
Added: 2005-10-16
%%
Type: language
Subtag: iw
Description: Hebrew
Added: 2005-10-16
Deprecated: 1989-01-01
Preferred-Value: he
%%
Type: script
Subtag: Latn
Description: Latin
Added: 2005-10-16
`;

describe('ACT registry', () => {
  it('extracts semantic metadata and a stable logic hash', () => {
    const rule = parseActRule(ACT_RULE, { filename: 'example-abc123.md', url: 'https://example.test/rule' });
    expect(rule.id).toBe('abc123');
    expect(rule.deprecated).toBe(true);
    expect(rule.wcag).toEqual(['4.1.2']);
    expect(rule.inputAspects).toEqual(['Accessibility Tree', 'DOM Tree']);
    expect(rule.logicHash).toMatch(/^[a-f0-9]{64}$/);

    const catalog = buildCatalog([rule]);
    expect(validateActCatalog(catalog)).toBe(true);
  });

  it('detects added and newly deprecated rules', () => {
    const baseRule = { id: 'one', name: 'One', deprecated: false, wcag: [], inputAspects: [], ruleType: 'atomic', logicHash: 'a'.repeat(64), source: {} };
    const added = { ...baseRule, id: 'two', name: 'Two' };
    const deprecated = { ...baseRule, deprecated: true };
    const diff = diffCatalogs({ rules: [baseRule] }, { rules: [deprecated, added] });
    expect(diff.added.map((rule) => rule.id)).toEqual(['two']);
    expect(diff.newlyDeprecated.map((rule) => rule.id)).toEqual(['one']);
  });
});

describe('ARIA registry', () => {
  it('extracts normalized roles and deprecated role/property combinations', () => {
    const roleInfo = parseRoleInfoSource(ROLE_INFO);
    expect(deprecatedRoleVersion(ARIA_SPEC, 'directory')).toBe('1.2');
    const registry = buildAriaRegistry(roleInfo, ARIA_SPEC);
    expect(registry.source.version).toBe('1.3');
    expect(registry.summary.deprecatedRoles).toBe(1);
    expect(registry.summary.deprecatedRolePropertyPairs).toBe(1);
    expect(registry.properties['aria-disabled']).toBe('state');
    expect(registry.properties['aria-errormessage']).toBe('property');
    expect(registry.roles.find((role) => role.name === 'directory')?.deprecated).toBe(true);
    expect(registry.roles.find((role) => role.name === 'button')?.deprecatedProperties).toEqual(['aria-errormessage']);
    expect(validateAriaRegistry(registry)).toBe(true);
  });

  it('detects newly deprecated roles and properties', () => {
    const before = buildAriaRegistry(parseRoleInfoSource(ROLE_INFO.replace('deprecated: true', 'deprecated: false')), ARIA_SPEC.replace('[Deprecated in ARIA 1.2] ', ''));
    const after = buildAriaRegistry(parseRoleInfoSource(ROLE_INFO), ARIA_SPEC);
    const diff = diffAriaRegistries(before, after);
    expect(diff.newlyDeprecatedRoles.map((role) => role.name)).toEqual(['directory']);
    expect(diff.newlyDeprecatedProperties).toEqual([
      expect.objectContaining({ role: 'button', name: 'aria-errormessage', kind: 'property' }),
    ]);
  });
});

describe('IANA language registry', () => {
  it('keeps only Type: language subtags and records deprecations', () => {
    const registry = parseLanguageSubtagRegistry(LANGUAGE_REGISTRY);
    expect(registry.source.fileDate).toBe('2026-08-08');
    expect(registry.subtags).toEqual(['en', 'iw']);
    expect(registry.deprecated.iw).toEqual({ date: '1989-01-01', preferredValue: 'he' });
    expect(validateLanguageRegistry(registry)).toBe(true);
  });

  it('detects new and newly deprecated primary language subtags', () => {
    const before = parseLanguageSubtagRegistry(LANGUAGE_REGISTRY.replace('Deprecated: 1989-01-01\nPreferred-Value: he\n', ''));
    const after = parseLanguageSubtagRegistry(`${LANGUAGE_REGISTRY}%%\nType: language\nSubtag: zz\nDescription: Example\nAdded: 2026-01-01\n`);
    const diff = diffLanguageRegistries(before, after);
    expect(diff.added).toEqual(['zz']);
    expect(diff.newlyDeprecated).toEqual(['iw']);
  });
});
