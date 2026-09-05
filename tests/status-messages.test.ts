// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import {
  createStatusMessageReviewEvent,
  findPotentialStatusMessages,
  hasProgrammaticStatusExposure,
  isPotentialStatusMessage,
} from '../lib/runtime/status-messages';

function render(body: string) {
  document.open();
  document.write(`<!doctype html><html lang="en"><head><title>Status messages</title></head><body>${body}</body></html>`);
  document.close();
}

function element(selector: string): Element {
  const result = document.querySelector(selector);
  if (!result) throw new Error(`Missing test element ${selector}`);
  return result;
}

describe('WCAG 4.1.3 runtime status-message review', () => {
  it('reviews a short status-like toast that has no programmatic status semantics', () => {
    render('<div id="save-toast" class="toast success">Saved</div>');
    const toast = element('#save-toast');

    expect(isPotentialStatusMessage(toast)).toBe(true);
    expect(hasProgrammaticStatusExposure(toast)).toBe(false);
    expect(createStatusMessageReviewEvent(toast)).toMatchObject({
      kind: 'status-message',
      severity: 'moderate',
      outcome: 'review',
      ruleId: 'FT-RUNTIME-007',
      references: [expect.objectContaining({
        type: 'WCAG',
        id: '4.1.3',
        level: 'AA',
      })],
    });
  });

  it('recognizes Spanish status-like text without translating the inspected-page evidence', () => {
    render('<div id="estado" class="notification">Guardado correctamente.</div>');
    const status = element('#estado');
    const finding = createStatusMessageReviewEvent(status);

    expect(finding).toBeDefined();
    expect(finding?.detail).toContain('“Guardado correctamente.”');
  });

  it.each([
    ['role=status', '<div id="message" role="status">Saved</div>'],
    ['role=alert', '<div id="message" role="alert">Error</div>'],
    ['aria-live', '<div id="message" aria-live="polite">Saved</div>'],
    ['role=log', '<div id="message" role="log">1 result</div>'],
    ['progress', '<progress id="message" value="40" max="100">40%</progress>'],
    ['aria-busy', '<div aria-busy="true"><div id="message">Loading</div></div>'],
  ])('does not review an already exposed status mechanism: %s', (_label, markup) => {
    render(markup);
    const message = element('#message');
    expect(hasProgrammaticStatusExposure(message)).toBe(true);
    expect(createStatusMessageReviewEvent(message)).toBeUndefined();
  });

  it('recognizes an aria-errormessage relationship as programmatic error exposure', () => {
    render('<input id="email" aria-invalid="true" aria-errormessage="email-error"><div id="email-error" class="error">Invalid email</div>');
    const error = element('#email-error');

    expect(hasProgrammaticStatusExposure(error)).toBe(true);
    expect(createStatusMessageReviewEvent(error)).toBeUndefined();
  });

  it('does not reinterpret dialogs or widget state containers as status messages', () => {
    render(`
      <div id="dialog" role="dialog" class="notification">Saved</div>
      <div id="tabpanel" role="tabpanel" class="status">Updated</div>
      <button id="button" class="status">Saved</button>
    `);

    expect(isPotentialStatusMessage(element('#dialog'))).toBe(false);
    expect(isPotentialStatusMessage(element('#tabpanel'))).toBe(false);
    expect(isPotentialStatusMessage(element('#button'))).toBe(false);
  });

  it('keeps ordinary dynamic content quiet when it has no status signal', () => {
    render('<section id="account">Account settings</section><div id="message" class="message">Hello Marco</div>');

    expect(isPotentialStatusMessage(element('#account'))).toBe(false);
    expect(isPotentialStatusMessage(element('#message'))).toBe(false);
  });

  it('does not treat a result list itself as a status message', () => {
    render('<ul id="results"><li>Alpha</li><li>Beta</li><li>Gamma</li></ul>');
    expect(isPotentialStatusMessage(element('#results'))).toBe(false);
  });

  it('finds a nested status candidate without multiplying identical ancestor/child evidence', () => {
    render('<main id="root"><div class="toast success"><span>Saved</span></div></main>');
    const candidates = findPotentialStatusMessages(element('#root'));

    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.textContent).toContain('Saved');
  });
});
