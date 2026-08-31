// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import {
  evaluateContrastStateCoverage,
  isInactiveContrastElement,
  observedContrastStates,
} from '../lib/audit/contrast-state-coverage';
import { runFocusTraceScan } from '../lib/audit/scan';
import { reportFindingDescription } from '../lib/report/finding-guidance';
import { localizedScanIssue } from '../shared/i18n';

function render(head: string, body: string) {
  document.documentElement.lang = 'en';
  document.head.innerHTML = `<title>States</title>${head}`;
  document.body.innerHTML = body;
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
    expect(observedContrastStates(target)).toEqual(expect.arrayContaining(['focus-visible']));
    expect(evaluateContrastStateCoverage().some((signal) => signal.state === 'focus')).toBe(false);
  });

  it('keeps coverage per element when only one matching control is observed', () => {
    render(
      '<style>.target:focus { color: #777; }</style>',
      '<button id="first" class="target">First</button><button id="second" class="target">Second</button>',
    );
    document.querySelector<HTMLButtonElement>('#first')!.focus();
    const signals = evaluateContrastStateCoverage().filter((signal) => signal.state === 'focus');
    expect(signals).toHaveLength(1);
    expect(signals[0]?.element.id).toBe('second');
  });

  it('reports one representative review for a repeated authored selector', () => {
    render(
      '<style>.target:hover { color: #777; background-color: #fff; }</style>',
      Array.from({ length: 20 }, (_, index) => `<a class="target" href="#${index}">Item ${index}</a>`).join(''),
    );
    const signals = evaluateContrastStateCoverage().filter((signal) => signal.state === 'hover');

    expect(signals).toHaveLength(1);
    expect(signals[0]).toMatchObject({
      selector: '.target:hover',
      candidateCount: 20,
    });
  });

  it('ignores transparent outline geometry that does not create contrast evidence', () => {
    render(
      `<style>#target:active {
        outline-color: transparent;
        outline-offset: 0;
        outline-style: solid;
        outline-width: 0;
      }</style>`,
      '<a id="target" href="#menu">Menu</a>',
    );

    expect(evaluateContrastStateCoverage()).toEqual([]);
    const scan = runFocusTraceScan();
    expect(scan.review.some((issue) => issue.evidence?.includes('state=active'))).toBe(false);
  });

  it('recognizes contrast-related CSS custom properties used by component libraries', () => {
    render(
      '<style>#variable-target:hover { --bs-btn-hover-color: #777; --bs-btn-hover-bg: #fff; }</style>',
      '<button id="variable-target">Action</button>',
    );
    expect(evaluateContrastStateCoverage()).toEqual(expect.arrayContaining([
      expect.objectContaining({
        state: 'hover',
        kind: 'text',
        selector: '#variable-target:hover',
        properties: expect.arrayContaining(['--bs-btn-hover-bg', '--bs-btn-hover-color']),
      }),
    ]));
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

  it('treats disabled UI components as inactive without suppressing generic aria-disabled content', () => {
    render('', `
      <button id="native" disabled><span id="native-copy">Disabled</span></button>
      <div id="aria" role="button" aria-disabled="true"><span id="aria-copy">Disabled</span></div>
      <div id="generic" aria-disabled="true"><span id="generic-copy">Normal content</span></div>
    `);
    expect(isInactiveContrastElement(document.querySelector('#native-copy')!)).toBe(true);
    expect(isInactiveContrastElement(document.querySelector('#aria-copy')!)).toBe(true);
    expect(isInactiveContrastElement(document.querySelector('#generic-copy')!)).toBe(false);
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
    expect(stateReview?.evidence).toContain('matching candidates=1');
    expect(stateReview?.contrastState).toMatchObject({
      state: 'hover',
      kind: 'text',
      selector: '#target:hover',
      candidateCount: 1,
    });
    expect(localizedScanIssue(stateReview!, 'es')).toMatchObject({
      title: 'Revisar el contraste de texto en estados no observados',
      description: expect.stringContaining('no se ha medido ning\u00fan fallo de contraste'),
    });
    expect(reportFindingDescription(stateReview!, 'es')).toContain(
      'FocusTrace no ha medido ning\u00fan fallo de contraste',
    );
    expect(scan.issues.some((issue) => issue.evidence?.includes('state=hover'))).toBe(false);
  });
});
