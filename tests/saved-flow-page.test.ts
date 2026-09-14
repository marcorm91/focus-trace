// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';
import {
  executeSavedFlowActionInPage,
  inspectSavedFlowTargetInPage,
} from '../lib/runtime/saved-flow-page';
import type { SavedFlowActionStep } from '../lib/runtime/saved-flow';

function autoKey(selector: string, key = 'ArrowDown'): SavedFlowActionStep {
  return {
    id: 'step-1',
    type: 'action',
    sourceEventKind: 'keydown',
    policy: 'auto',
    key,
    target: { locator: selector, tag: 'button' },
  };
}

describe('saved flow page execution', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('replays only a bounded keyboard action against a unique target', () => {
    document.body.innerHTML = '<button id="menu">Menu</button>';
    const button = document.querySelector<HTMLButtonElement>('#menu')!;
    let received = '';
    button.addEventListener('keydown', (event) => { received = event.key; });

    const result = executeSavedFlowActionInPage(autoKey('#menu'));

    expect(result.status).toBe('performed');
    expect(received).toBe('ArrowDown');
    expect(document.activeElement).toBe(button);
  });

  it('never auto-runs manual click or input steps', () => {
    document.body.innerHTML = '<button id="delete">Delete</button>';
    let clicked = false;
    document.querySelector('#delete')?.addEventListener('click', () => { clicked = true; });
    const result = executeSavedFlowActionInPage({
      id: 'click',
      type: 'action',
      sourceEventKind: 'click',
      policy: 'manual-stop',
      target: { locator: '#delete', tag: 'button' },
    });

    expect(result.status).toBe('blocked');
    expect(clicked).toBe(false);
  });

  it('stops instead of choosing an ambiguous target', () => {
    document.body.innerHTML = '<button class="item">One</button><button class="item">Two</button>';
    const result = executeSavedFlowActionInPage(autoKey('.item'));
    expect(result.status).toBe('ambiguous');
  });

  it('reports a missing target without continuing', () => {
    document.body.innerHTML = '<main></main>';
    const result = executeSavedFlowActionInPage(autoKey('#missing'));
    expect(result.status).toBe('missing');
  });

  it('inspects focus and dialog state without copying page text', () => {
    document.body.innerHTML = '<button id="open">Open</button><div id="dialog" role="dialog" style="width:100px;height:100px">Private content</div>';
    const button = document.querySelector<HTMLButtonElement>('#open')!;
    button.focus();

    const focus = inspectSavedFlowTargetInPage({ locator: '#open', tag: 'button' });
    const dialog = inspectSavedFlowTargetInPage({ locator: '#dialog', tag: 'div', role: 'dialog' });

    expect(focus).toMatchObject({ status: 'matched', focused: true });
    expect(dialog.status).toBe('matched');
    expect(dialog).not.toHaveProperty('text');
  });
});
