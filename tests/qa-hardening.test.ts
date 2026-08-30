// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { isDisabledUiComponent, semanticRole } from '../lib/audit/dom';
import { evaluateInteractiveSemantics, mainLandmarkCandidates } from '../lib/audit/semantics';
import { isInactiveContrastElement } from '../lib/audit/contrast-state-coverage';
import { runFocusTraceScan } from '../lib/audit/scan';
import { ownedRoleElements } from '../lib/runtime/aria-ownership';
import { focusWalkCandidates } from '../lib/runtime/focus-walk';
import { actionTarget, findDialogs, snapshot } from '../lib/runtime/page-inspection';

function render(body: string, styles = '') {
  document.open();
  document.write(`<!doctype html><html lang="en"><head><title>QA hardening</title>${styles ? `<style>${styles}</style>` : ''}</head><body><main><h1>QA hardening</h1>${body}</main></body></html>`);
  document.close();

  for (const element of document.querySelectorAll('*')) {
    Object.defineProperty(element, 'getClientRects', {
      configurable: true,
      value: () => [{ width: 24, height: 24 }],
    });
  }
}

describe('QA hardening regressions', () => {
  it('uses ARIA fallback-token resolution consistently in semantic and runtime helpers', () => {
    render(`
      <div id="button" role="future-widget button" tabindex="0"><span id="button-copy">Save</span></div>
      <div id="main" role="future-landmark main" aria-label="Workspace"></div>
      <div id="dialog" role="future-window dialog" aria-label="Preferences"></div>
      <div id="list" role="future-list listbox"><div id="option" role="future-option option">One</div></div>
    `);

    const button = document.querySelector('#button')!;
    const buttonCopy = document.querySelector('#button-copy')!;
    const dialog = document.querySelector('#dialog')!;
    const listbox = document.querySelector('#list')!;

    expect(semanticRole(button)).toBe('button');
    expect(evaluateInteractiveSemantics(document).find((signal) => signal.element === button)?.intent).toBe('button');
    expect(mainLandmarkCandidates().map((element) => element.id)).toContain('main');
    expect(actionTarget(buttonCopy)).toBe(button);
    expect(findDialogs(document.querySelector('main')!).map((element) => element.id)).toContain('dialog');
    expect(ownedRoleElements(listbox, ['option']).map((element) => element.id)).toContain('option');
    expect(snapshot(button).role).toBe('button');
    expect(semanticRole(dialog)).toBe('dialog');
  });

  it('keeps aria-disabled controls in keyboard order while excluding inert and natively disabled controls', () => {
    render(`
      <fieldset disabled>
        <legend><button id="legend-action">Legend action</button></legend>
        <button id="fieldset-disabled">Blocked</button>
      </fieldset>
      <button id="aria-disabled" aria-disabled="true">Unavailable for activation</button>
      <div inert><button id="inert-action">Inert</button></div>
      <button id="enabled">Enabled</button>
    `);

    const selectors = focusWalkCandidates().map((candidate) => candidate.selector);
    expect(selectors).toContain('#legend-action');
    expect(selectors).toContain('#aria-disabled');
    expect(selectors).toContain('#enabled');
    expect(selectors).not.toContain('#fieldset-disabled');
    expect(selectors).not.toContain('#inert-action');
  });

  it('limits inactive contrast exemptions to disabled UI components, not whole disabled containers', () => {
    render(`
      <fieldset disabled>
        <legend id="legend-copy">Account settings</legend>
        <p id="fieldset-copy">This explanatory copy remains perceivable.</p>
        <button id="disabled-button"><span id="disabled-copy">Disabled action</span></button>
      </fieldset>
      <div id="generic-aria-disabled" aria-disabled="true"><span id="generic-copy">Normal content</span></div>
      <div id="aria-button" role="button" aria-disabled="true"><span id="aria-button-copy">ARIA disabled action</span></div>
    `);

    expect(isInactiveContrastElement(document.querySelector('#legend-copy')!)).toBe(false);
    expect(isInactiveContrastElement(document.querySelector('#fieldset-copy')!)).toBe(false);
    expect(isInactiveContrastElement(document.querySelector('#disabled-copy')!)).toBe(true);
    expect(isInactiveContrastElement(document.querySelector('#generic-copy')!)).toBe(false);
    expect(isInactiveContrastElement(document.querySelector('#aria-button-copy')!)).toBe(true);
    expect(isDisabledUiComponent(document.querySelector('#aria-button')!)).toBe(true);
  });

  it('does not prune low-contrast explanatory text merely because it is inside fieldset disabled', () => {
    render(
      '<fieldset disabled><legend>Account</legend><p id="low-copy">Important explanatory copy</p></fieldset>',
      'html,body{background:#fff;color:#000;font-size:16px} #low-copy{color:rgb(190,190,190);background:#fff;font-size:16px;font-weight:400}',
    );

    const scan = runFocusTraceScan();
    expect(scan.issues.some((issue) => issue.ruleId === 'FT-WCAG-010' && issue.targets.includes('#low-copy'))).toBe(true);
  });

  it('clears both component scan and focus-walk scopes when resetting a tab', () => {
    const source = readFileSync(resolve(process.cwd(), 'entrypoints', 'background.ts'), 'utf8');
    const resetBlock = source.slice(source.indexOf("message.type === 'FOCUSTRACE_RESET_TAB'"), source.indexOf("message.type === 'FOCUSTRACE_SET_RECORDING_STATE'"));

    expect(resetBlock).toContain("removeAttribute('data-focustrace-scan-component')");
    expect(resetBlock).toContain("removeAttribute('data-focustrace-focus-component')");
  });
});
