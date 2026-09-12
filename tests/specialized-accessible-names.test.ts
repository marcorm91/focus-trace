// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';
import { runFocusTraceScan } from '../lib/audit/scan';
import {
  evaluateSpecializedAccessibleNames,
  type SpecializedAccessibleNameKind,
} from '../lib/audit/specialized-accessible-names';

function mount(body: string) {
  document.open();
  document.write(`<!doctype html><html lang="en"><head><title>Names</title></head><body>${body}</body></html>`);
  document.close();
}

const passingCases: Array<{ kind: SpecializedAccessibleNameKind; markup: string; expectedName: string }> = [
  { kind: 'dialog', markup: '<div id="target" role="dialog" aria-label="Preferences"></div>', expectedName: 'Preferences' },
  { kind: 'meter', markup: '<label for="target">Storage used</label><meter id="target" min="0" max="100" value="40"></meter>', expectedName: 'Storage used' },
  { kind: 'progressbar', markup: '<label for="target">Upload progress</label><progress id="target" max="100" value="40"></progress>', expectedName: 'Upload progress' },
  { kind: 'tab', markup: '<div id="target" role="tab">Account</div>', expectedName: 'Account' },
  { kind: 'tooltip', markup: '<div id="target" role="tooltip">Delete item</div>', expectedName: 'Delete item' },
  { kind: 'treeitem', markup: '<div id="target" role="treeitem">Documents</div>', expectedName: 'Documents' },
  { kind: 'summary', markup: '<details><summary id="target">Advanced options</summary><p>Details</p></details>', expectedName: 'Advanced options' },
];

const failingCases: Array<{ kind: SpecializedAccessibleNameKind; markup: string }> = [
  { kind: 'dialog', markup: '<div id="target" role="dialog"></div>' },
  { kind: 'meter', markup: '<meter id="target" min="0" max="100" value="40"></meter>' },
  { kind: 'progressbar', markup: '<progress id="target" max="100" value="40"></progress>' },
  { kind: 'tab', markup: '<div id="target" role="tab"></div>' },
  { kind: 'tooltip', markup: '<div id="target" role="tooltip"></div>' },
  { kind: 'treeitem', markup: '<div id="target" role="treeitem"></div>' },
  { kind: 'summary', markup: '<details><summary id="target"></summary><p>Details</p></details>' },
];

describe('specialized accessible-name evaluation', () => {
  beforeEach(() => mount('<main><h1>Fixture</h1></main>'));

  for (const fixture of passingCases) {
    it(`passes a named ${fixture.kind}`, () => {
      mount(`<main><h1>Fixture</h1>${fixture.markup}</main>`);
      const evaluation = evaluateSpecializedAccessibleNames(document)
        .find((entry) => entry.kind === fixture.kind);
      expect(evaluation).toMatchObject({
        kind: fixture.kind,
        outcome: 'pass',
        evidence: { name: fixture.expectedName },
      });
      expect(evaluation?.evidence.role).toBeTruthy();
    });
  }

  for (const fixture of failingCases) {
    it(`reports an unnamed ${fixture.kind}`, () => {
      mount(`<main><h1>Fixture</h1>${fixture.markup}</main>`);
      const evaluation = evaluateSpecializedAccessibleNames(document)
        .find((entry) => entry.kind === fixture.kind);
      expect(evaluation?.evidence.name).toBe('');
      expect(evaluation?.outcome).toBe(
        fixture.kind === 'dialog' || fixture.kind === 'treeitem' ? 'warning' : 'fail',
      );
    });
  }

  for (const fixture of failingCases) {
    it(`treats a hidden ${fixture.kind} as inapplicable`, () => {
      mount(`<main><h1>Fixture</h1><div style="display:none">${fixture.markup}</div></main>`);
      expect(evaluateSpecializedAccessibleNames(document).some((entry) => entry.kind === fixture.kind)).toBe(false);
    });

    it(`fails or warns for an invalid aria-labelledby reference on ${fixture.kind}`, () => {
      const withBrokenReference = fixture.markup.replace('id="target"', 'id="target" aria-labelledby="missing-name"');
      mount(`<main><h1>Fixture</h1>${withBrokenReference}</main>`);
      const evaluation = evaluateSpecializedAccessibleNames(document)
        .find((entry) => entry.kind === fixture.kind);
      expect(evaluation?.evidence.name).toBe('');
      expect(evaluation?.evidence.candidates).toEqual(expect.arrayContaining([
        expect.objectContaining({ source: 'aria-labelledby', value: '', used: false }),
      ]));
    });

    it(`ignores non-semantic markup intended to resemble ${fixture.kind}`, () => {
      mount(`<main><h1>Fixture</h1><div id="target" data-intended-role="${fixture.kind}">Name</div></main>`);
      expect(evaluateSpecializedAccessibleNames(document)).toEqual([]);
    });
  }

  it('excludes a nested group subtree from a treeitem name', () => {
    mount(`
      <main><h1>Fixture</h1>
        <div role="tree">
          <div id="target" role="treeitem">
            <div role="group"><div role="treeitem">Child only</div></div>
          </div>
        </div>
      </main>
    `);
    const target = evaluateSpecializedAccessibleNames(document)
      .find((entry) => entry.element.id === 'target');
    expect(target).toMatchObject({ kind: 'treeitem', outcome: 'warning', evidence: { name: '' } });
  });

  it('uses treeitem content but excludes descendant group content', () => {
    mount(`
      <main><h1>Fixture</h1>
        <div role="tree">
          <div id="target" role="treeitem">
            Fruits
            <div role="group"><div role="treeitem">Apples</div></div>
          </div>
        </div>
      </main>
    `);
    const target = evaluateSpecializedAccessibleNames(document)
      .find((entry) => entry.element.id === 'target');
    expect(target?.evidence.name).toBe('Fruits');
  });

  it('integrates deterministic failures and ARIA warnings into the normal scan evidence contract', () => {
    mount(`
      <main><h1>Fixture</h1>
        <div id="tab" role="tab"></div>
        <progress id="progress" max="100" value="20"></progress>
        <div id="dialog" role="dialog"></div>
      </main>
    `);
    const result = runFocusTraceScan();

    const control = result.issues.find((issue) => issue.ruleId === 'FT-WCAG-014');
    const range = result.issues.find((issue) => issue.ruleId === 'FT-WCAG-015');
    const aria = result.warnings.find((issue) => issue.ruleId === 'FT-WARN-022');

    expect(control).toMatchObject({ targets: ['#tab'], accessibleName: { name: '', role: 'tab' } });
    expect(range).toMatchObject({ targets: ['#progress'], accessibleName: { name: '', role: 'progressbar' } });
    expect(aria).toMatchObject({ targets: ['#dialog'], accessibleName: { name: '', role: 'dialog' } });
    expect(result.issues.some((issue) => ['FT-WCAG-002', 'FT-WCAG-003', 'FT-WCAG-004', 'FT-WCAG-005', 'FT-WCAG-006', 'FT-WCAG-007'].includes(issue.ruleId))).toBe(false);
  });
});
