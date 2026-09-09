// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import {
  activeSemanticContrastStates,
  interactiveContrastSettleDelay,
  interactiveTextContrastReviews,
} from '../lib/runtime/interactive-contrast';

function render(head: string, body: string) {
  document.documentElement.lang = 'en';
  document.head.innerHTML = `<title>Interactive contrast</title>${head}`;
  document.body.innerHTML = body;
}

describe('interactive contrast runtime evidence', () => {
  it('creates bounded REVIEW evidence from a rendered semantic state with low text contrast', () => {
    render(
      '<style>#target[aria-expanded="true"] { color: rgb(180, 180, 180); background: white; font-size: 16px; }</style>',
      '<button id="target" aria-expanded="true">Expanded action</button>',
    );

    const target = document.querySelector<HTMLButtonElement>('#target')!;
    const reviews = interactiveTextContrastReviews(target, 'expanded');

    expect(reviews).toHaveLength(1);
    expect(reviews[0]).toMatchObject({
      kind: 'contrast-state',
      outcome: 'review',
      ruleId: 'FT-RUNTIME-014',
      element: { selector: '#target' },
    });
    expect(reviews[0]?.title).toContain('WCAG 1.4.3');
    expect(reviews[0]?.detail).toContain('state=expanded');
    expect(reviews[0]?.detail).toContain('required=4.5:1');
    expect(reviews[0]?.references).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'WCAG', id: '1.4.3', level: 'AA' }),
    ]));
  });

  it('does not infer hover contrast when hover is not actually active', () => {
    render(
      '<style>#target:hover { color: rgb(180, 180, 180); background: white; }</style>',
      '<button id="target">Action</button>',
    );

    const target = document.querySelector<HTMLButtonElement>('#target')!;
    expect(interactiveTextContrastReviews(target, 'hover')).toEqual([]);
  });

  it('does not emit a runtime review when the observed state has sufficient contrast', () => {
    render(
      '<style>#target[aria-pressed="true"] { color: black; background: white; }</style>',
      '<button id="target" aria-pressed="true">Toggle</button>',
    );

    const target = document.querySelector<HTMLButtonElement>('#target')!;
    expect(activeSemanticContrastStates(target)).toContain('pressed');
    expect(interactiveTextContrastReviews(target, 'pressed')).toEqual([]);
  });

  it('uses the rendered font metrics when deciding the state contrast threshold', () => {
    render(
      '<style>#target[aria-selected="true"] { color: rgb(120, 120, 120); background: white; font-size: 24px; font-weight: 700; }</style>',
      '<div id="target" role="option" aria-selected="true">Selected option</div>',
    );

    const target = document.querySelector('#target')!;
    const reviews = interactiveTextContrastReviews(target, 'selected');
    expect(reviews).toHaveLength(0);
  });

  it('waits for authored transitions but keeps the observation window bounded', () => {
    render('', '<button id="target" style="transition-duration:200ms;transition-delay:50ms">Action</button>');
    const target = document.querySelector('#target')!;
    expect(interactiveContrastSettleDelay(target)).toBe(284);

    target.setAttribute('style', 'transition-duration:5s;transition-delay:2s');
    expect(interactiveContrastSettleDelay(target)).toBe(1_000);
  });
});
