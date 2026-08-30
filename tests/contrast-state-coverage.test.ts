// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import {
  evaluateContrastStateCoverage,
  isInactiveContrastElement,
  observedContrastStates,
} from '../lib/audit/contrast-state-coverage';
import { runFocusTraceScan } from '../lib/audit/scan';

function render(head: string, body: string) {
  document.open();
  document.write(`<!doctype html><html lang="en"><head><title>States</title>${head}</head><body>${body}</body></html>`);
  document.close();
}

describe('contrast state coverage', () => {
  it('records unobserved hover text styles without forcing hover', () => {
    render(
      '<style>#target:hover { color: #777; background-color: #fff; }</style>',
      '<button id="target">Action</button>',
    );
    const signals = evaluateContrastStateCoverage();
    expect(signals).toEqual(expect.arrayContaining([
      expect.objectContaining({
        state: 'hover',
        kind: 'text',
        selector: '#target:hover',
        properties: expect.arrayContaining(['background-color', 'color']),
      }),
    ]));
  });

  it('classifies focus outline styling as non-text state coverage', () => {
    render(
      '<style>#target:focus-visible { outline: 2px solid #aaa; }</style>',
      '<button id="target">Action</button>',
    );
    const signals = evaluateContrastStateCoverage();
    expect(signals).toEqual(expect.arrayContaining([
      expect.objectContaining({ state: 'focus-visible', kind: 'non-text' }),
    ]));
  });

  it('does not create a review for a state that is already observed', () => {
    render(
      '<style>#target:focus { color: #777; }</style>',
      '<button id="target">Action</button>',
    );
    const target = document.querySelector<HTMLButtonElement>('#target')!;
    target.focus();
    expect(observedContrastStates(target)).toContain('focus');
    expect(evaluateContrastStateCoverage().some((signal) => signal.state === 'focus')).toBe(false);
  });

  it('tracks authored ARIA expanded states that are not currently active', () => {
    render(
      '<style>#target[aria-expanded="true"] { color: #777; }</style>',
      '<button id="target" aria-expanded="false">Toggle</button>',
    );
    expect(evaluateContrastStateCoverage()).toEqual(expect.arrayContaining([
      expect.objectContaining({ state: 'expanded', kind: 'text' }),
    ]));
  });

  it('treats disabled and aria-disabled content as inactive contrast', () => {
    render('', `
      <button id="native" disabled><span id="native-copy">Disabled</span></button>
      <div id="aria" aria-disabled="true"><span id="aria-copy">Disabled</span></div>
    `);
    expect(isInactiveContrastElement(document.querySelector('#native-copy')!)).toBe(true);
    expect(isInactiveContrastElement(document.querySelector('#aria-copy')!)).toBe(true);
  });

  it('removes inactive text contrast failures from the final scan', () => {
    render(
      '<style>#disabled { color: rgb(180,180,180); background: white; font-size: 16px; }</style>',
      '<button id="disabled" disabled>Inactive low contrast</button>',
    );
    const scan = runFocusTraceScan();
    expect(scan.issues.some((issue) => issue.ruleId === 'FT-WCAG-010' && issue.targets.includes('#disabled'))).toBe(false);
  });

  it('adds unobserved state styling to contrast Review rather than Failure', () => {
    render(
      '<style>#target:hover { color: #777; background: white; }</style>',
      '<button id="target">Action</button>',
    );
    const scan = runFocusTraceScan();
    const stateReview = scan.review.find((issue) =>
      issue.ruleId === 'FT-WCAG-010'
      && issue.targets.includes('#target')
      && issue.evidence?.includes('state=hover'),
    );
    expect(stateReview).toBeDefined();
    expect(stateReview?.outcome).toBe('review');
    expect(scan.issues.some((issue) => issue.evidence?.includes('state=hover'))).toBe(false);
  });
});
