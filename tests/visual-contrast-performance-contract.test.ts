import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('visual contrast performance contract', () => {
  it('keeps backdrop verification bounded without scanning authored stylesheet rules per element', () => {
    const policy = source('lib/audit/visual-contrast-policy.ts');

    expect(policy).toContain('MAX_BACKDROP_STYLE_CHECKS = 2_500');
    expect(policy).toContain('styleCache: WeakMap<Element, CSSStyleDeclaration>');
    expect(policy).toContain('pseudoBackdropCache: WeakMap<Element, string | null>');
    expect(policy).not.toContain('document.styleSheets');
    expect(policy).not.toContain('sheet.cssRules');
    expect(policy).not.toContain('element.matches(styleRule.selectorText)');
  });
});
