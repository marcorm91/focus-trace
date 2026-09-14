// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';
import { resolveFindingTargetInPage } from '../lib/runtime/finding-recheck-page';

afterEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
});

describe('finding recheck target resolution', () => {
  it('resolves an unchanged target by its unique locator', () => {
    document.body.innerHTML = '<button id="save">Save</button>';

    const result = resolveFindingTargetInPage({
      locator: '#save',
      tag: 'button',
      id: 'save',
      role: 'button',
      name: 'Save',
    });

    expect(result.status).toBe('matched');
    expect(result.locator).toBe('#save');
    expect(result.element?.name).toBe('Save');
    expect(result.relocated).not.toBe(true);
  });

  it('never chooses automatically when the original locator becomes ambiguous', () => {
    document.body.innerHTML = '<button>One</button><button>Two</button>';

    const result = resolveFindingTargetInPage({
      locator: 'button',
      tag: 'button',
      role: 'button',
    });

    expect(result.status).toBe('ambiguous');
    expect(result.reason).toContain('more than one');
  });

  it('relocates only one uniquely matching stable signature after a structural move', () => {
    document.body.innerHTML = '<main><div><button class="primary-action" aria-label="Save">Save</button></div></main>';

    const result = resolveFindingTargetInPage({
      locator: '#old-location',
      tag: 'button',
      role: 'button',
      name: 'Save',
      className: 'primary-action',
    });

    expect(result.status).toBe('matched');
    expect(result.relocated).toBe(true);
    expect(result.element?.name).toBe('Save');
  });

  it('returns ambiguity when two relocated elements match the same signature equally', () => {
    document.body.innerHTML = [
      '<button class="primary-action" aria-label="Save">Save</button>',
      '<button class="primary-action" aria-label="Save">Save</button>',
    ].join('');

    const result = resolveFindingTargetInPage({
      locator: '#old-location',
      tag: 'button',
      role: 'button',
      name: 'Save',
      className: 'primary-action',
    });

    expect(result.status).toBe('ambiguous');
    expect(result.candidateCount).toBe(2);
  });

  it('resolves an open-shadow boundary path without flattening it into a light-DOM selector', () => {
    const host = document.createElement('div');
    host.id = 'host';
    document.body.append(host);
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = '<button id="inside">Inside</button>';

    const result = resolveFindingTargetInPage({
      locator: '#host |shadow| #inside',
      tag: 'button',
      id: 'inside',
      role: 'button',
      name: 'Inside',
    });

    expect(result.status).toBe('matched');
    expect(result.locator).toContain('|shadow|');
    expect(result.element?.id).toBe('inside');
  });

  it('reports a stable-identity change instead of attaching the old finding to it', () => {
    document.body.innerHTML = '<a id="save" href="#">Save</a>';

    const result = resolveFindingTargetInPage({
      locator: '#save',
      tag: 'button',
      id: 'save',
      role: 'button',
      name: 'Save',
    });

    expect(result.status).toBe('changed');
    expect(result.element?.tag).toBe('a');
  });
});
