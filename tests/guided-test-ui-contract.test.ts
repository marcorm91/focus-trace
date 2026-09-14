import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(import.meta.dirname, '..');
const component = fs.readFileSync(
  path.join(root, 'entrypoints/sidepanel/components/GuidedTestPanel.tsx'),
  'utf8',
);
const css = fs.readFileSync(
  path.join(root, 'entrypoints/sidepanel/components/guided-test-panel.css'),
  'utf8',
);

describe('guided test UI contract', () => {
  it('keeps manual evidence visually and semantically separate from automated conformance', () => {
    expect(component).toContain('Not an automated conformance result.');
    expect(component).toContain('Guided test · manual evidence');
    expect(component).toContain("role=\"note\"");
  });

  it('uses native keyboard-operable controls and announces state changes', () => {
    expect(component).toContain('<fieldset>');
    expect(component).toContain('type="radio"');
    expect(component).toContain('type="button"');
    expect(component).toContain('aria-live="polite"');
    expect(component).toContain('aria-atomic="true"');
  });

  it('supports narrow layouts and forced-colors without tiny text', () => {
    expect(css).toContain('@media (max-width: 420px)');
    expect(css).toContain('@media (forced-colors: active)');
    expect(css).not.toMatch(/font-size:\s*(?:1[0-3]|[0-9])px/);
  });
});
