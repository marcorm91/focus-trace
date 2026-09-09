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

describe('interactive contrast runtime presentation', () => {
  it('uses a dedicated localized runtime kind instead of presenting contrast as a widget-state event', () => {
    expect(runtimeEventKindLabel(event.kind, 'en')).toBe('Interactive contrast');
    expect(runtimeEventKindLabel(event.kind, 'es')).toBe('Contraste interactivo');
  });

  it('presents the observed state, measured ratio and required ratio in both languages', () => {
    const english = humanRuntimeEventDetail(event, 'en');
    const spanish = humanRuntimeEventDetail(event, 'es');

    expect(english).toContain('hover');
    expect(english).toContain('2.30:1');
    expect(english).toContain('4.5:1');
    expect(english).toContain('#checkout');

    expect(spanish).toContain('hover');
    expect(spanish).toContain('2.30:1');
    expect(spanish).toContain('4.5:1');
    expect(spanish).toContain('#checkout');
  });
});
