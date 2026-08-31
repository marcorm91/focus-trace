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

  it('removes inactive text contrast failures from the final scan', () => {
    render(
      '<style>#disabled { color: rgb(180, 180, 180); background: white; font-size: 16px; }</style>',
      '<button id="disabled" disabled>Inactive low contrast</button>',
    );
    const scan = runFocusTraceScan();
    expect(scan.issues.some((issue) => issue.ruleId === 'FT-WCAG-010' && issue.targets.includes('#disabled'))).toBe(false);
  });
});
