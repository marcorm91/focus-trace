import { describe, expect, it } from 'vitest';
import { createClickEvent, createKeydownEvent, keyLabel } from '../lib/runtime/interaction-events';

const button = {
  tag: 'button',
  id: 'save',
  selector: '#save',
  name: 'Save',
};

describe('runtime interaction event builders', () => {
  it('normalizes keyboard labels for display', () => {
    expect(keyLabel(' ')).toBe('Space');
    expect(keyLabel('Enter')).toBe('Enter');
  });

  it('creates a keydown event with an element snapshot when present', () => {
    expect(createKeydownEvent({ key: 'Enter', element: button })).toMatchObject({
      kind: 'keydown',
      severity: 'info',
      title: 'Key: Enter',
      element: button,
    });
  });

  it('creates a keydown event without an element snapshot', () => {
    expect(createKeydownEvent({ key: ' ' })).toMatchObject({
      kind: 'keydown',
      severity: 'info',
      title: 'Key: Space',
    });
    expect(createKeydownEvent({ key: ' ' })).not.toHaveProperty('element');
  });

  it('creates a click event with the provided label and element', () => {
    expect(createClickEvent({ label: 'Save', element: button })).toMatchObject({
      kind: 'click',
      severity: 'info',
      title: 'Click → Save',
      element: button,
    });
  });
});
