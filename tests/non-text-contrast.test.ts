// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { evaluateNonTextContrast } from '../lib/audit/non-text-contrast';
import { runFocusTraceScan } from '../lib/audit/scan';

function render(body: string) {
  document.open();
  document.write(`<!doctype html><html lang="en"><head><title>Contrast</title><style>html,body{margin:0;background:#fff;color:#000;font-size:16px}</style></head><body>${body}</body></html>`);
  document.close();
}

describe('non-text contrast', () => {
  it('fails a simple low-contrast icon when it is the only visible cue in a control', () => {
    render('<button id="icon" aria-label="Settings" style="background:#fff;border:0"><svg viewBox="0 0 10 10"><path style="fill:rgb(170,170,170)" d="M0 0h10v10H0z"/></svg></button>');
    const finding = evaluateNonTextContrast().find((item) => item.element.id === 'icon');
    expect(finding?.evaluation).toMatchObject({
      status: 'fail',
      kind: 'graphic',
      subject: 'icon fill',
      requiredRatio: 3,
    });
    expect(finding?.evaluation.ratio).toBeLessThan(3);
  });

  it('does not treat a decorative low-contrast icon beside visible button text as required', () => {
    render('<button id="labelled" style="background:#fff;border:0"><svg viewBox="0 0 10 10"><path style="fill:rgb(170,170,170)" d="M0 0h10v10H0z"/></svg><span>Settings</span></button>');
    const finding = evaluateNonTextContrast().find((item) => item.element.id === 'labelled');
    expect(finding).toBeUndefined();
  });

  it('keeps a low-contrast standalone graphic as review because context determines whether it is required', () => {
    render('<svg id="chart" role="img" aria-label="Trend" viewBox="0 0 10 10"><path style="fill:rgb(170,170,170)" d="M0 0h10v10H0z"/></svg>');
    const finding = evaluateNonTextContrast().find((item) => item.element.id === 'chart');
    expect(finding?.evaluation.status).toBe('review');
    expect(finding?.evaluation.kind).toBe('graphic');
    expect(finding?.evaluation.ratio).toBeLessThan(3);
  });

  it('reports a low-contrast author-styled form boundary for manual review rather than manufacturing a failure', () => {
    render('<input id="email" aria-label="Email" style="appearance:none;background:#fff;border:1px solid rgb(190,190,190)">');
    const finding = evaluateNonTextContrast().find((item) => item.element.id === 'email');
    expect(finding?.evaluation.status).toBe('review');
    expect(finding?.evaluation.kind).toBe('ui-boundary');
    expect(finding?.evaluation.ratio).toBeLessThan(3);
  });

  it('skips native form boundaries while their appearance is still determined by the user agent', () => {
    render('<input id="native" aria-label="Email">');
    const finding = evaluateNonTextContrast().find(
      (item) => item.element.id === 'native' && item.evaluation.kind === 'ui-boundary',
    );
    expect(finding).toBeUndefined();
  });

  it('fails an observed author-defined focus outline below 3:1 when no second focus cue exists', () => {
    render('<button id="focus" style="background:#fff;border:0;outline:2px solid rgb(180,180,180)">Continue</button>');
    const button = document.querySelector('#focus') as HTMLButtonElement;
    button.focus();
    const finding = evaluateNonTextContrast().find(
      (item) => item.element.id === 'focus' && item.evaluation.kind === 'focus-indicator',
    );
    expect(finding?.evaluation.status).toBe('fail');
    expect(finding?.evaluation.subject).toBe('observed focus outline');
    expect(finding?.evaluation.ratio).toBeLessThan(3);
  });

  it('integrates WCAG 1.4.11 into the normal full-page scan', () => {
    render('<button id="icon" aria-label="Settings" style="background:#fff;border:0"><svg viewBox="0 0 10 10"><path style="fill:rgb(170,170,170)" d="M0 0h10v10H0z"/></svg></button>');
    const scan = runFocusTraceScan();
    const issue = scan.issues.find((item) => item.ruleId === 'FT-WCAG-011');
    expect(issue?.contrast).toMatchObject({ kind: 'graphic', requiredRatio: 3 });
    expect(issue?.references.some((reference) => reference.id === '1.4.11')).toBe(true);
  });
});
