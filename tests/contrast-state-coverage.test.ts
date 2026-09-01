// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import {
  isInactiveContrastElement,
  observedContrastStates,
} from '../lib/audit/contrast-state-coverage';
import { runFocusTraceScan } from '../lib/audit/scan';

function render(head: string, body: string) {
  document.documentElement.lang = 'en';
  document.head.innerHTML = `<title>States</title>${head}`;
  document.body.innerHTML = body;
}

describe('rendered contrast states', () => {
  it('annotates a state only when it is active at scan time', () => {
    render(
      '<style>#target[aria-expanded="true"] { color: rgb(180, 180, 180); background: white; }</style>',
      '<button id="target" aria-expanded="true">Expanded action</button>',
    );

    const target = document.querySelector<HTMLButtonElement>('#target')!;
    expect(observedContrastStates(target)).toContain('expanded');

    const scan = runFocusTraceScan();
    const issue = scan.issues.find((candidate) =>
      candidate.ruleId === 'FT-WCAG-010' && candidate.targets.includes('#target'),
    );
    expect(issue).toBeDefined();
    expect(issue?.evidence).toContain('Observed visual state: expanded.');
  });

  it('does not create findings or reviews from an inactive authored selector', () => {
    render(
      '<style>#target:hover { color: rgb(180, 180, 180); background: white; }</style>',
      '<button id="target">Action</button>',
    );

    const scan = runFocusTraceScan();
    const stateFindings = [...scan.issues, ...scan.review].filter((issue) =>
      issue.ruleId === 'FT-WCAG-010'
      && (issue.evidence?.includes('hover') || issue.description.includes('hover')),
    );
    expect(stateFindings).toEqual([]);
  });

  it('still reports deterministic low contrast in the rendered default state', () => {
    render(
      '<style>#target { color: rgb(180, 180, 180); background: white; font-size: 16px; }</style>',
      '<p id="target">Visible low contrast</p>',
    );

    const scan = runFocusTraceScan();
    const issue = scan.issues.find((candidate) =>
      candidate.ruleId === 'FT-WCAG-010' && candidate.targets.includes('#target'),
    );
    expect(issue).toBeDefined();
    expect(issue?.outcome).toBe('fail');
    expect(issue?.contrast?.requiredRatio).toBe(4.5);
    expect(issue?.contrast?.ratio).toBeLessThan(4.5);
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

  it('treats fully suppressed visual subtrees as contrast-inapplicable', () => {
    render('', `
      <div style="opacity:0"><span id="opacity-copy">Invisible</span></div>
      <div style="content-visibility:hidden"><span id="content-copy">Invisible</span></div>
      <div style="position:absolute;clip:rect(0, 0, 0, 0)"><span id="clip-copy">Invisible</span></div>
      <div style="clip-path:inset(50%)"><span id="clip-path-copy">Invisible</span></div>
      <span id="transparent-copy" style="color:transparent">Invisible</span>
      <span id="zero-font-copy" style="font-size:0">Invisible</span>
    `);

    expect(isInactiveContrastElement(document.querySelector('#opacity-copy')!), '#opacity-copy').toBe(true);
    expect(isInactiveContrastElement(document.querySelector('#content-copy')!), '#content-copy').toBe(true);
    expect(isInactiveContrastElement(document.querySelector('#clip-copy')!), '#clip-copy').toBe(true);
    expect(isInactiveContrastElement(document.querySelector('#clip-path-copy')!), '#clip-path-copy').toBe(true);
    expect(isInactiveContrastElement(document.querySelector('#transparent-copy')!), '#transparent-copy').toBe(true);
    expect(isInactiveContrastElement(document.querySelector('#zero-font-copy')!), '#zero-font-copy').toBe(true);
  });

  it('treats content inside a closed details disclosure as contrast-inapplicable but keeps its summary active', () => {
    render('', `
      <details>
        <summary id="summary-copy">Visible summary</summary>
        <p id="details-copy">Hidden details content</p>
      </details>
    `);

    expect(isInactiveContrastElement(document.querySelector('#summary-copy')!)).toBe(false);
    expect(isInactiveContrastElement(document.querySelector('#details-copy')!)).toBe(true);
  });

  it('removes hidden unresolved-background reviews from the final scan', () => {
    render(
      '<style>#hidden-copy { color: #777; background: linear-gradient(white, black); }</style>',
      '<div style="display:none"><p id="hidden-copy">Hidden uncertain contrast</p></div>',
    );

    const scan = runFocusTraceScan();
    const matches = [...scan.issues, ...scan.review].filter((issue) =>
      issue.ruleId === 'FT-WCAG-010' && issue.targets.includes('#hidden-copy'),
    );
    expect(matches).toEqual([]);
  });

  it('keeps genuinely visible unresolved backgrounds in review', () => {
    render(
      '<style>#visible-copy { color: #777; background: linear-gradient(white, black); }</style>',
      '<p id="visible-copy">Visible uncertain contrast</p>',
    );

    const scan = runFocusTraceScan();
    const review = scan.review.find((issue) =>
      issue.ruleId === 'FT-WCAG-010' && issue.targets.includes('#visible-copy'),
    );
    expect(review).toBeDefined();
    expect(review?.outcome).toBe('review');
  });

  it('does not use viewport position to decide contrast applicability', () => {
    render('', '<p id="below-fold" style="margin-top:5000px;color:black;background:white">Still rendered</p>');
    expect(isInactiveContrastElement(document.querySelector('#below-fold')!)).toBe(false);
  });

  it('removes inactive text contrast failures from the final scan', () => {
    render(
      '<style>#copy { color: rgb(180, 180, 180); background:white; }</style>',
      '<div hidden><p id="copy">Hidden low contrast</p></div>',
    );

    const scan = runFocusTraceScan();
    const matches = [...scan.issues, ...scan.review].filter((issue) =>
      issue.ruleId === 'FT-WCAG-010' && issue.targets.includes('#copy'),
    );
    expect(matches).toEqual([]);
  });
});
