import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(import.meta.dirname, '..');
const component = fs.readFileSync(
  path.join(root, 'entrypoints/sidepanel/components/GuidedTestPanel.tsx'),
  'utf8',
);
const workspace = fs.readFileSync(
  path.join(root, 'entrypoints/sidepanel/views/AuditReportWorkspace.tsx'),
  'utf8',
);
const css = fs.readFileSync(
  path.join(root, 'entrypoints/sidepanel/components/guided-test-panel.css'),
  'utf8',
);
const coverage = JSON.parse(
  fs.readFileSync(path.join(root, 'config/guided-tests.json'), 'utf8'),
) as {
  automatedConformance: boolean;
  tests: Array<{ id: string; coverage: string; automated: boolean }>;
};

describe('guided test UI contract', () => {
  it('keeps manual judgement and runtime observations separate from automated conformance', () => {
    expect(component).toContain('Not an automated conformance result.');
    expect(component).toContain('Guided tests · manual + runtime evidence');
    expect(component).toContain('Observed runtime evidence');
    expect(component).toContain('Your answer remains a separate manual judgement.');
    expect(component).toContain("role=\"note\"");
  });

  it('feeds the existing runtime event stream into Report and keeps coverage explicitly manual', () => {
    expect(workspace).toContain('<GuidedTestPanel scan={scan} events={events} language={language} />');
    expect(coverage.automatedConformance).toBe(false);
    for (const id of ['FT-GUIDED-001', 'FT-GUIDED-002', 'FT-GUIDED-003', 'FT-GUIDED-004']) {
      expect(coverage.tests).toContainEqual(expect.objectContaining({
        id,
        coverage: 'guided-manual',
        automated: false,
      }));
    }
  });

  it('uses native keyboard-operable controls and announces state changes', () => {
    expect(component).toContain('<select');
    expect(component).toContain('<fieldset>');
    expect(component).toContain('type="radio"');
    expect(component).toContain('type="button"');
    expect(component).toContain('aria-live="polite"');
    expect(component).toContain('aria-atomic="true"');
  });

  it('supports narrow layouts and forced-colors without tiny text', () => {
    expect(css).toContain('@media (max-width: 420px)');
    expect(css).toContain('@media (forced-colors: active)');
    expect(css).toContain('.guided-runtime-evidence');
    expect(css).not.toMatch(/font-size:\s*(?:1[0-3]|[0-9])px/);
  });
});
