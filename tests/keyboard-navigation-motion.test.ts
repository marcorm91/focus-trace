// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import {
  evaluateAccesskeys,
  evaluateAutoplayAudio,
  evaluateMetaRefresh,
  evaluateScrollableRegions,
} from '../lib/audit/keyboard-navigation-motion';
import { runFocusTraceScan } from '../lib/audit/scan';

function render(body = '', head = ''): void {
  document.open();
  document.write(`<!doctype html><html lang="en"><head><title>Keyboard navigation motion</title>${head}</head><body><main><h1>Test</h1>${body}</main></body></html>`);
  document.close();
}

function dimensions(element: Element, values: { clientWidth?: number; scrollWidth?: number; clientHeight?: number; scrollHeight?: number }): void {
  for (const [name, value] of Object.entries(values)) {
    Object.defineProperty(element, name, { configurable: true, value });
  }
}

describe('keyboard navigation, refresh and autoplay audio checks', () => {
  it('reports duplicate valid accesskey tokens case-insensitively', () => {
    render('<button id="save" accesskey="S">Save</button><a id="settings" href="#settings" accesskey="s">Settings</a><button accesskey="xy">Ignored invalid token</button>');

    const evaluations = evaluateAccesskeys();
    expect(evaluations).toHaveLength(2);
    expect(evaluations.map((entry) => entry.element.id)).toEqual(expect.arrayContaining(['save', 'settings']));
    expect(evaluations.every((entry) => entry.token === 's' && entry.occurrences === 2)).toBe(true);
  });

  it('keeps duplicate accesskey detection document-aware while component findings stay scoped', () => {
    render('<section id="component"><button id="inside" accesskey="x">Inside</button></section><button id="outside" accesskey="X">Outside</button>');
    const component = document.querySelector('#component')!;

    const evaluations = evaluateAccesskeys(component);
    expect(evaluations).toHaveLength(1);
    expect(evaluations[0]?.element.id).toBe('inside');
    expect(evaluations[0]?.occurrences).toBe(2);
  });

  it('fails the first parseable delayed meta refresh inside the WCAG timing window', () => {
    render('', '<meta http-equiv="refresh" content="invalid"><meta id="refresh" http-equiv="Refresh" content="5; url=/next">');

    expect(evaluateMetaRefresh(document)).toMatchObject([{
      outcome: 'fail',
      delaySeconds: 5,
      element: document.querySelector('#refresh'),
    }]);
  });

  it('accepts zero-delay redirect and a delay beyond twenty hours for the bounded timing expectation', () => {
    render('', '<meta http-equiv="refresh" content="0; url=/next">');
    expect(evaluateMetaRefresh(document)).toMatchObject([{ outcome: 'pass', delaySeconds: 0 }]);

    render('', '<meta http-equiv="refresh" content="72001">');
    expect(evaluateMetaRefresh(document)).toMatchObject([{ outcome: 'pass', delaySeconds: 72001 }]);
  });

  it('reviews a scrollable region without a sequential focus entry point', () => {
    render('<div id="region" style="overflow:auto"><div>Scrollable copy</div></div>');
    const region = document.querySelector('#region')!;
    dimensions(region, { clientWidth: 100, scrollWidth: 300, clientHeight: 100, scrollHeight: 100 });

    expect(evaluateScrollableRegions()).toMatchObject([{
      outcome: 'review',
      element: region,
      horizontalScrollPixels: 200,
      verticalScrollPixels: 0,
    }]);
  });

  it('passes a scrollable region when it or a descendant is sequentially focusable', () => {
    render('<div id="region" style="overflow-y:scroll"><button id="entry">Open item</button></div>');
    const region = document.querySelector('#region')!;
    dimensions(region, { clientWidth: 100, scrollWidth: 100, clientHeight: 100, scrollHeight: 260 });

    expect(evaluateScrollableRegions()).toMatchObject([{
      outcome: 'pass',
      element: region,
      verticalScrollPixels: 160,
      focusEntry: document.querySelector('#entry'),
    }]);
  });

  it('reviews unmuted autoplay audio over three seconds without native controls', () => {
    render('<audio id="intro" src="intro.mp3" autoplay></audio>');
    const audio = document.querySelector<HTMLAudioElement>('#intro')!;
    Object.defineProperty(audio, 'duration', { configurable: true, value: 8 });
    Object.defineProperty(audio, 'volume', { configurable: true, value: 1 });

    expect(evaluateAutoplayAudio()).toMatchObject([{
      outcome: 'review',
      element: audio,
      durationMs: 8000,
      audioPresence: 'native-audio',
      controlSelectors: [],
    }]);
  });

  it('does not review muted autoplay and records passes for short audio or native controls', () => {
    render('<audio id="muted" src="muted.mp3" autoplay muted></audio><audio id="short" src="short.mp3" autoplay></audio><audio id="controlled" src="long.mp3" autoplay controls></audio>');
    const short = document.querySelector<HTMLAudioElement>('#short')!;
    const controlled = document.querySelector<HTMLAudioElement>('#controlled')!;
    Object.defineProperty(short, 'duration', { configurable: true, value: 3 });
    Object.defineProperty(short, 'volume', { configurable: true, value: 1 });
    Object.defineProperty(controlled, 'duration', { configurable: true, value: 12 });
    Object.defineProperty(controlled, 'volume', { configurable: true, value: 1 });

    const evaluations = evaluateAutoplayAudio();
    expect(evaluations).toHaveLength(2);
    expect(evaluations.every((entry) => entry.outcome === 'pass')).toBe(true);
  });

  it('keeps autoplay video contextual when an audible track cannot be proven', () => {
    render('<video id="promo" src="promo.mp4" autoplay></video>');
    const video = document.querySelector<HTMLVideoElement>('#promo')!;
    Object.defineProperty(video, 'duration', { configurable: true, value: 10 });
    Object.defineProperty(video, 'volume', { configurable: true, value: 1 });

    expect(evaluateAutoplayAudio()).toMatchObject([{
      outcome: 'review',
      element: video,
      audioPresence: 'video-unknown',
    }]);
  });

  it('integrates warnings, failures and reviews into the page scan without duplicating motion semantics', () => {
    render(
      '<button id="one" accesskey="q">One</button><button id="two" accesskey="Q">Two</button><div id="scroll" style="overflow:auto">Scrollable</div><audio id="intro" src="intro.mp3" autoplay></audio>',
      '<meta http-equiv="refresh" content="10; url=/next">',
    );
    const scroll = document.querySelector('#scroll')!;
    const audio = document.querySelector<HTMLAudioElement>('#intro')!;
    dimensions(scroll, { clientWidth: 100, scrollWidth: 240, clientHeight: 100, scrollHeight: 100 });
    Object.defineProperty(audio, 'duration', { configurable: true, value: 8 });
    Object.defineProperty(audio, 'volume', { configurable: true, value: 1 });

    const result = runFocusTraceScan();
    expect(result.warnings.filter((issue) => issue.ruleId === 'FT-WARN-028')).toHaveLength(2);
    expect(result.issues.some((issue) => issue.ruleId === 'FT-WCAG-022')).toBe(true);
    expect(result.review.some((issue) => issue.ruleId === 'FT-REVIEW-043' && issue.targets.includes('#scroll'))).toBe(true);
    expect(result.review.some((issue) => issue.ruleId === 'FT-REVIEW-044' && issue.targets.includes('#intro'))).toBe(true);
    expect(result.review.some((issue) => issue.ruleId === 'FT-REVIEW-026' && issue.targets.includes('#intro'))).toBe(false);
  });
});
