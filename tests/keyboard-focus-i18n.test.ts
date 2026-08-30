import { describe, expect, it } from 'vitest';
import { humanRuntimeEventTitle } from '../lib/runtime/explanations';
import type { RuntimeEvent } from '../shared/types';

const NEW_KEYBOARD_RULES = [
  ['FT-APG-015', 'Tab arrow navigation did not reach the expected tab', 'Tab arrow navigation did not reach the expected tab', 'pestañas'],
  ['FT-APG-016', 'Radio group arrow navigation did not reach the expected radio', 'Radio group arrow navigation needs review', 'grupo de opciones'],
  ['FT-APG-017', 'Toolbar arrow navigation did not reach the expected control', 'Toolbar arrow navigation did not reach the expected control', 'barra de herramientas'],
  ['FT-APG-018', 'Menu arrow navigation did not reach the expected item', 'Menu arrow navigation did not reach the expected item', 'menú'],
  ['FT-APG-019', 'Listbox arrow navigation did not reach the expected option', 'Listbox arrow navigation did not reach the expected option', 'listbox'],
  ['FT-APG-020', 'Escape did not close the open modal dialog', 'Escape did not close the open modal dialog', 'diálogo modal'],
  ['FT-APG-021', 'Disclosure keyboard activation did not toggle the expanded state', 'Disclosure keyboard activation did not toggle the expanded state', 'activación por teclado'],
] as const;

describe('keyboard focus bilingual presentation', () => {
  it.each(NEW_KEYBOARD_RULES)(
    'localizes %s while preserving raw technical evidence',
    (ruleId, rawTitle, englishTitle, spanishFragment) => {
      const event: RuntimeEvent = {
        id: `event-${ruleId}`,
        timestamp: 1,
        kind: 'aria-widget',
        severity: 'moderate',
        outcome: 'review',
        ruleId,
        title: rawTitle,
        detail: 'ArrowRight was pressed in #widget; expected=#next.',
        element: { tag: 'div', selector: '#widget' },
        references: [],
      };

      expect(humanRuntimeEventTitle(event, 'en')).toBe(englishTitle);
      expect(humanRuntimeEventTitle(event, 'es').toLowerCase()).toContain(spanishFragment.toLowerCase());
      expect(event.ruleId).toBe(ruleId);
      expect(event.title).toBe(rawTitle);
      expect(event.detail).toContain('#next');
      expect(event.element?.selector).toBe('#widget');
    },
  );

  it('uses bilingual copy for the widened menu-button review', () => {
    const event: RuntimeEvent = {
      id: 'menu-open',
      timestamp: 1,
      kind: 'aria-widget',
      severity: 'moderate',
      outcome: 'review',
      ruleId: 'FT-APG-005',
      title: 'Keyboard activation did not open the menu',
      detail: 'Enter was pressed on #actions.',
      element: { tag: 'button', selector: '#actions' },
      references: [],
    };

    expect(humanRuntimeEventTitle(event, 'en')).toContain('Menu button keyboard behavior');
    expect(humanRuntimeEventTitle(event, 'es')).toContain('botón de menú');
    expect(event.title).toBe('Keyboard activation did not open the menu');
  });
});
