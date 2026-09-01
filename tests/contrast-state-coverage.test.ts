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
      <div style="position:absolute;clip:rect(0 0 0 0)"><span id="clip-copy">Invisible</span></div>
      <div style="clip-path:inset(50%)"><span id="clip-path-copy">Invisible</span></div>
      <span id="transparent-copy" style="color:transparent">Invisible</span>
      <span id="zero-font-copy" style="font-size:0">Invisible</span>
    `);

    for (const selector of [
      '#opacity-copy',
      '#content-copy',
      '#clip-copy',
      '#clip-path-copy',
      '#transparent-copy',
      '#zero-font-copy',
    ]) {
      expect(isInactiveContrastElement(document.querySelector(selector)!)).toBe(true);
    }
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
      '<style>#hidden-shell { opacity: 0; background-image: linear-gradient(#fff, #eee); } #hidden-copy { color: #777; font-size: 16px; }</style>',
      '<div id="hidden-shell"><p id="hidden-copy">Hidden contrast candidate</p></div>',
    );

    const scan = runFocusTraceScan();
    const hiddenFindings = [...scan.issues, ...scan.review].filter((issue) =>
      issue.ruleId === 'FT-WCAG-010' && issue.targets.includes('#hidden-copy'),
    );
    expect(hiddenFindings).toEqual([]);
  });

  it('keeps genuinely visible unresolved backgrounds in review', () => {
    render(
      '<style>#visible { color: #777; background-image: linear-gradient(#fff, #eee); font-size: 16px; }</style>',
      '<p id="visible">Visible gradient text</p>',
    );

    const scan = runFocusTraceScan();
    const review = scan.review.find((issue) =>
      issue.ruleId === 'FT-WCAG-010' && issue.targets.includes('#visible'),
    );
    expect(review).toBeDefined();
    expect(review?.contrast?.reason).toContain('background image or gradient');
  });

  it('does not use viewport position to decide contrast applicability', () => {
    render(
      '<style>#below-fold { position:absolute; top:200vh; color:rgb(180,180,180); background:white; font-size:16px; }</style>',
      '<p id="below-fold">Rendered after scrolling</p>',
    );

    const target = document.querySelector('#below-fold')!;
    expect(isInactiveContrastElement(target)).toBe(false);

    const scan = runFocusTraceScan();
    expect(scan.issues.some((issue) =>
      issue.ruleId === 'FT-WCAG-010' && issue.targets.includes('#below-fold'),
    )).toBe(true);
  });

  it('removes inactive text contrast failures from the final scan', () => {
    render(
      '<style>#disabled { color: rgb(180, 180, 180); background: white; font-size: 16px; }</style>',
      '<button id="disabled" disabled>Inactive low contrast</button>',
    );
    const scan = runFocusTraceScan();
    expect(scan.issues.some((issue) => issue.ruleId === 'FT-WCAG-010' && issue.targets.includes('#disabled'))).toBe(false);
  });
});
