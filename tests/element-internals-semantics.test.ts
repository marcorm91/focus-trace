// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';
import { runFocusTraceScan } from '../lib/audit/scan';
import {
  elementInternalsSnapshot,
  refreshElementInternalsSnapshots,
} from '../lib/audit/element-internals-bridge';
import {
  ELEMENT_INTERNALS_BRIDGE_SCHEMA,
  ELEMENT_INTERNALS_KEY_ATTRIBUTE,
  ELEMENT_INTERNALS_REQUEST_ATTRIBUTE,
  ELEMENT_INTERNALS_REQUEST_EVENT,
  ELEMENT_INTERNALS_RESPONSE_ATTRIBUTE,
  type ElementInternalsSemanticSnapshot,
} from '../shared/element-internals-bridge';

function render(body: string) {
  document.open();
  document.write(`<!doctype html><html lang="en"><head><title>ElementInternals fixture</title></head><body>${body}</body></html>`);
  document.close();
}

function installFixtureBridge(
  snapshotsFor: (element: Element, key: string) => Omit<ElementInternalsSemanticSnapshot, 'key'> | undefined,
): () => void {
  const handler = () => {
    const root = document.documentElement;
    const requestId = root.getAttribute(ELEMENT_INTERNALS_REQUEST_ATTRIBUTE);
    if (!requestId) return;
    const snapshots: ElementInternalsSemanticSnapshot[] = [];
    for (const element of document.querySelectorAll(`[${ELEMENT_INTERNALS_KEY_ATTRIBUTE}]`)) {
      const key = element.getAttribute(ELEMENT_INTERNALS_KEY_ATTRIBUTE);
      if (!key) continue;
      const snapshot = snapshotsFor(element, key);
      if (snapshot) snapshots.push({ key, ...snapshot });
    }
    root.setAttribute(ELEMENT_INTERNALS_RESPONSE_ATTRIBUTE, JSON.stringify({
      schema: ELEMENT_INTERNALS_BRIDGE_SCHEMA,
      requestId,
      snapshots,
    }));
  };
  window.addEventListener(ELEMENT_INTERNALS_REQUEST_EVENT, handler);
  return () => window.removeEventListener(ELEMENT_INTERNALS_REQUEST_EVENT, handler);
}

const cleanups: Array<() => void> = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()?.();
  document.documentElement.removeAttribute(ELEMENT_INTERNALS_REQUEST_ATTRIBUTE);
  document.documentElement.removeAttribute(ELEMENT_INTERNALS_RESPONSE_ATTRIBUTE);
});

describe('ElementInternals semantic bridge', () => {
  it('accepts only bounded normalized semantic data and never exposes arbitrary page fields', () => {
    render('<x-field id="field"></x-field>');
    cleanups.push(installFixtureBridge((_element, _key) => ({
      role: 'textbox',
      aria: {
        'aria-label': 'Internal label',
        'aria-required': 'true',
      },
      labels: [{ id: 'label', text: 'Visible label' }],
      formAssociated: true,
      extra: 'must be discarded',
    } as unknown as Omit<ElementInternalsSemanticSnapshot, 'key'>)));

    expect(refreshElementInternalsSnapshots()).toBe(1);
    const snapshot = elementInternalsSnapshot(document.querySelector('#field')!);
    expect(snapshot).toEqual({
      key: expect.any(String),
      role: 'textbox',
      aria: {
        'aria-label': 'Internal label',
        'aria-required': 'true',
      },
      labels: [{ id: 'label', text: 'Visible label' }],
      formAssociated: true,
    });
    expect((snapshot as unknown as Record<string, unknown>)?.extra).toBeUndefined();
  });

  it('treats an ElementInternals-only role and aria-label as applicable naming evidence', () => {
    render('<main><x-action id="action"></x-action></main>');
    cleanups.push(installFixtureBridge((element) => element.id === 'action' ? {
      role: 'button',
      aria: { 'aria-label': 'Save changes' },
      labels: [],
      formAssociated: false,
    } : undefined));

    const result = runFocusTraceScan();
    expect(result.issues.some((issue) => issue.ruleId === 'FT-WCAG-003' && issue.targets.includes('#action'))).toBe(false);
    expect(result.ruleResults?.find((entry) => entry.ruleId === 'FT-WCAG-003')?.passed).toBeGreaterThan(0);
  });

  it('reports an unnamed ElementInternals-only form role with bridge evidence', () => {
    render('<main><x-field id="field"></x-field></main>');
    cleanups.push(installFixtureBridge((element) => element.id === 'field' ? {
      role: 'textbox',
      aria: {},
      labels: [],
      formAssociated: true,
    } : undefined));

    const result = runFocusTraceScan();
    const issue = result.issues.find((entry) => entry.ruleId === 'FT-WCAG-004' && entry.targets.includes('#field'));
    expect(issue?.evidence).toContain('ElementInternals page-world bridge');
    expect(issue?.accessibleName?.role).toBe('textbox');
  });

  it('uses ElementInternals.labels to prevent a false form-field name failure', () => {
    render('<main><label id="email-label">Email address</label><x-field id="field" role="textbox"></x-field></main>');
    cleanups.push(installFixtureBridge((element) => element.id === 'field' ? {
      role: 'textbox',
      aria: {},
      labels: [{ id: 'email-label', text: 'Email address' }],
      formAssociated: true,
    } : undefined));

    const result = runFocusTraceScan();
    expect(result.issues.some((issue) => issue.ruleId === 'FT-WCAG-004' && issue.targets.includes('#field'))).toBe(false);
  });

  it('honors reflected required ARIA state for an ElementInternals-only role', () => {
    render('<main><x-check id="check">Accept</x-check></main>');
    cleanups.push(installFixtureBridge((element) => element.id === 'check' ? {
      role: 'checkbox',
      aria: { 'aria-checked': 'false' },
      labels: [],
      formAssociated: false,
    } : undefined));

    const result = runFocusTraceScan();
    expect(result.warnings.some((issue) => issue.ruleId === 'FT-WARN-015' && issue.targets.includes('#check'))).toBe(false);
    expect(result.issues.some((issue) => issue.ruleId === 'FT-WCAG-004' && issue.targets.includes('#check'))).toBe(false);
  });

  it('reports broken reflected ID references without exposing raw page objects', () => {
    render('<main><x-field id="field"></x-field></main>');
    cleanups.push(installFixtureBridge((element) => element.id === 'field' ? {
      role: 'textbox',
      aria: { 'aria-describedby': 'missing-help' },
      labels: [{ text: 'Email' }],
      formAssociated: true,
    } : undefined));

    const result = runFocusTraceScan();
    const warning = result.warnings.find((issue) => issue.ruleId === 'FT-WARN-016' && issue.targets.includes('#field'));
    expect(warning?.evidence).toContain('#missing-help');
    expect(warning?.evidence).toContain('ElementInternals page-world bridge');
  });

  it('degrades conservatively when no MAIN-world bridge is available', () => {
    render('<main><x-field id="field"></x-field></main>');
    const result = runFocusTraceScan();

    expect(result.issues.some((issue) => issue.targets.includes('#field'))).toBe(false);
    expect(result.warnings.some((issue) => issue.targets.includes('#field'))).toBe(false);
  });
});
