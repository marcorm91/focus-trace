import { describe, expect, it } from 'vitest';
import {
  humanRuntimeEventDetail,
  runtimeEventKindLabel,
} from '../lib/runtime/runtime-presentation';
import type { RuntimeEvent } from '../shared/types';

const event: RuntimeEvent = {
  id: 'interactive-contrast-1',
  timestamp: 1,
  kind: 'contrast-state',
  severity: 'serious',
  title: 'WCAG 1.4.3 · hover · 2.30:1',
  outcome: 'review',
  ruleId: 'FT-RUNTIME-014',
  element: {
    tag: 'button',
    selector: '#checkout',
  },
  detail: 'state=hover · subject=text · ratio=2.30:1 · required=4.5:1 · foreground=rgb(170, 170, 170) · background=rgb(221, 221, 221)',
  references: [],
};

const nonTextEvent: RuntimeEvent = {
  id: 'interactive-non-text-contrast-1',
  timestamp: 2,
  kind: 'contrast-state',
  severity: 'serious',
  title: 'WCAG 1.4.11 · focus-visible · 1.80:1',
  outcome: 'review',
  ruleId: 'FT-RUNTIME-016',
  element: {
    tag: 'button',
    selector: '#save',
  },
  detail: 'category=non-text · state=focus-visible · kind=focus-indicator · subject=observed focus outline · ratio=1.80:1 · required=3:1 · foreground=rgb(190, 190, 190) · background=rgb(255, 255, 255)',
  references: [],
};

describe('interactive contrast runtime presentation', () => {
  it('uses a dedicated localized runtime kind instead of presenting contrast as a widget-state event', () => {
    expect(runtimeEventKindLabel(event.kind, 'en')).toBe('Interactive contrast');
    expect(runtimeEventKindLabel(event.kind, 'es')).toBe('Contraste interactivo');
  });

  it('presents the observed text state, measured ratio and required ratio in both languages', () => {
    const english = humanRuntimeEventDetail(event, 'en');
    const spanish = humanRuntimeEventDetail(event, 'es');

    expect(english).toContain('hover');
    expect(english).toContain('2.30:1');
    expect(english).toContain('4.5:1');
    expect(english).toContain('WCAG 1.4.3');
    expect(english).toContain('#checkout');

    expect(spanish).toContain('hover');
    expect(spanish).toContain('2.30:1');
    expect(spanish).toContain('4.5:1');
    expect(spanish).toContain('WCAG 1.4.3');
    expect(spanish).toContain('#checkout');
  });

  it('presents measured non-text state evidence under WCAG 1.4.11 in both languages', () => {
    const english = humanRuntimeEventDetail(nonTextEvent, 'en');
    const spanish = humanRuntimeEventDetail(nonTextEvent, 'es');

    expect(english).toContain('focus-visible');
    expect(english).toContain('WCAG 1.4.11');
    expect(english).toContain('1.80:1');
    expect(english).toContain('3:1');
    expect(english).toContain('Visual color');
    expect(english).toContain('#save');

    expect(spanish).toContain('focus-visible');
    expect(spanish).toContain('WCAG 1.4.11');
    expect(spanish).toContain('1.80:1');
    expect(spanish).toContain('3:1');
    expect(spanish).toContain('color adyacente');
    expect(spanish).toContain('#save');
  });
});