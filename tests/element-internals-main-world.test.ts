// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';
import { installElementInternalsMainWorldBridge } from '../lib/extension/element-internals-main-world';
import {
  ELEMENT_INTERNALS_BRIDGE_SCHEMA,
  ELEMENT_INTERNALS_KEY_ATTRIBUTE,
  ELEMENT_INTERNALS_REQUEST_ATTRIBUTE,
  ELEMENT_INTERNALS_REQUEST_EVENT,
  ELEMENT_INTERNALS_RESPONSE_ATTRIBUTE,
  type ElementInternalsBridgeResponse,
} from '../shared/element-internals-bridge';

const originalDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'attachInternals');
const marker = '__focustraceElementInternalsBridgeV1';

afterEach(() => {
  if (originalDescriptor) Object.defineProperty(HTMLElement.prototype, 'attachInternals', originalDescriptor);
  else delete (HTMLElement.prototype as unknown as Record<string, unknown>).attachInternals;
  delete (window as unknown as Record<string, unknown>)[marker];
  document.documentElement.removeAttribute(ELEMENT_INTERNALS_REQUEST_ATTRIBUTE);
  document.documentElement.removeAttribute(ELEMENT_INTERNALS_RESPONSE_ATTRIBUTE);
});

describe('ElementInternals MAIN-world capture', () => {
  it('captures the returned internals privately and emits only normalized semantic data', () => {
    const fakeInternals = {
      role: 'checkbox',
      ariaLabel: 'Accept terms',
      ariaChecked: 'false',
      get labels() {
        return [Object.assign(document.createElement('label'), { id: 'terms-label', textContent: 'Terms' })];
      },
      get form() {
        return document.createElement('form');
      },
      secretFunction() {
        return 'page private';
      },
    };

    Object.defineProperty(HTMLElement.prototype, 'attachInternals', {
      configurable: true,
      writable: true,
      value() {
        return fakeInternals;
      },
    });

    expect(installElementInternalsMainWorldBridge()).toBe(true);

    const host = document.createElement('x-check');
    host.id = 'check';
    document.body.append(host);
    const returned = (host as HTMLElement & { attachInternals(): unknown }).attachInternals();
    expect(returned).toBe(fakeInternals);

    const requestId = 'request-1';
    host.setAttribute(ELEMENT_INTERNALS_KEY_ATTRIBUTE, `${requestId}:0`);
    document.documentElement.setAttribute(ELEMENT_INTERNALS_REQUEST_ATTRIBUTE, requestId);
    window.dispatchEvent(new Event(ELEMENT_INTERNALS_REQUEST_EVENT));

    const raw = document.documentElement.getAttribute(ELEMENT_INTERNALS_RESPONSE_ATTRIBUTE);
    expect(raw).toBeTruthy();
    const response = JSON.parse(raw!) as ElementInternalsBridgeResponse;
    expect(response).toEqual({
      schema: ELEMENT_INTERNALS_BRIDGE_SCHEMA,
      requestId,
      snapshots: [{
        key: `${requestId}:0`,
        role: 'checkbox',
        aria: {
          'aria-checked': 'false',
          'aria-label': 'Accept terms',
        },
        labels: [{ id: 'terms-label', text: 'Terms' }],
        formAssociated: true,
      }],
    });
    expect(raw).not.toContain('secretFunction');
    expect(raw).not.toContain('page private');
  });
});
