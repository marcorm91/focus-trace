// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';
import { evaluatePauseStopHide } from '../lib/audit/pause-stop-hide';
import { runFocusTraceScan } from '../lib/audit/scan';

function rect(left = 20, top = 20, width = 160, height = 32): DOMRect {
  return {
    x: left,
    y: top,
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height,
    toJSON: () => ({}),
  } as DOMRect;
}

function geometry(element: Element, value = rect()): void {
  Object.defineProperty(element, 'getBoundingClientRect', {
    configurable: true,
    value: () => value,
  });
}

function render(body: string): void {
  document.open();
  document.write(`<!doctype html><html lang="en"><head><title>Pause stop hide</title></head><body><main><h1>Pause, stop, hide</h1>${body}</main></body></html>`);
  document.close();
  for (const element of document.querySelectorAll('body *')) geometry(element);
  Object.defineProperty(document, 'getAnimations', {
    configurable: true,
    value: () => [],
  });
}

function animation(
  target: Element,
  duration: number,
  options: {
    name?: string;
    properties?: Record<string, [unknown, unknown]>;
    playState?: AnimationPlayState;
    playbackRate?: number;
  } = {},
): Animation {
  const properties = options.properties ?? { transform: ['translateX(0px)', 'translateX(100px)'] };
  const [first, second] = Object.entries(properties).reduce<[Record<string, unknown>, Record<string, unknown>]>(
    (keyframes, [property, values]) => {
      keyframes[0][property] = values[0];
      keyframes[1][property] = values[1];
      return keyframes;
    },
    [{ offset: 0 }, { offset: 1 }],
  );
  return {
    playState: options.playState ?? 'running',
    playbackRate: options.playbackRate ?? 1,
    animationName: options.name ?? 'ticker',
    effect: {
      target,
      getKeyframes: () => [first, second],
      getComputedTiming: () => ({ activeDuration: duration }),
      getTiming: () => ({ duration, iterations: 1 }),
    },
  } as unknown as Animation;
}

function setAnimations(animations: Animation[]): void {
  Object.defineProperty(document, 'getAnimations', {
    configurable: true,
    value: () => animations,
  });
}

beforeEach(() => render(''));

describe('WCAG 2.2.2 moving-content review evidence', () => {
  it('reviews a running animation whose active duration exceeds five seconds', () => {
    render('<div id="ticker">Latest news</div><p>Read the rest of the page.</p>');
    const ticker = document.querySelector('#ticker')!;
    setAnimations([animation(ticker, 12_000)]);

    expect(evaluatePauseStopHide()).toMatchObject([{
      status: 'review',
      element: ticker,
      evidence: {
        kind: 'moving-or-blinking',
        source: 'web-animation',
        automaticStart: 'unknown',
        parallelContent: 'observed',
        durationMs: 12_000,
        thresholdMs: 5_000,
        repeatsIndefinitely: false,
        animatedProperties: ['transform'],
        animationNames: ['ticker'],
        controlMechanism: 'none-observed',
        controlSelectors: [],
      },
    }]);
  });

  it('records a bounded pass when observed motion lasts no more than five seconds', () => {
    render('<div id="notice">Short notice</div><p>Other content.</p>');
    const notice = document.querySelector('#notice')!;
    setAnimations([animation(notice, 5_000)]);

    expect(evaluatePauseStopHide()).toMatchObject([{ status: 'pass', element: notice }]);
  });

  it('ignores paused animations and effects without an observable visual change', () => {
    render('<div id="paused">Paused</div><div id="unchanged">Unchanged</div><p>Other content.</p>');
    const paused = document.querySelector('#paused')!;
    const unchanged = document.querySelector('#unchanged')!;
    setAnimations([
      animation(paused, Number.POSITIVE_INFINITY, { playState: 'paused' }),
      animation(unchanged, 10_000, { properties: { opacity: ['1', '1'] } }),
    ]);

    expect(evaluatePauseStopHide()).toEqual([]);
  });

  it('requires observable parallel content', () => {
    document.body.innerHTML = '<div id="only-content">Only content</div>';
    const target = document.querySelector('#only-content')!;
    geometry(target);
    setAnimations([animation(target, Number.POSITIVE_INFINITY)]);

    expect(evaluatePauseStopHide()).toEqual([]);
  });

  it('records explicitly related custom controls without assuming that they work', () => {
    render('<div id="carousel">Slide one</div><button id="pause" aria-controls="carousel">Pause slides</button><p>Other content.</p>');
    const carousel = document.querySelector('#carousel')!;
    setAnimations([animation(carousel, Number.POSITIVE_INFINITY, { name: 'carousel-cycle' })]);

    expect(evaluatePauseStopHide()).toMatchObject([{
      status: 'review',
      evidence: {
        repeatsIndefinitely: true,
        durationMs: null,
        controlMechanism: 'candidate-observed',
        controlSelectors: ['#pause'],
      },
    }]);
  });

  it('reviews rendered marquee content but leaves its unresolved duration for human verification', () => {
    render('<marquee id="news">Breaking news</marquee><p>Other content.</p>');

    expect(evaluatePauseStopHide()).toMatchObject([{
      status: 'review',
      element: document.querySelector('#news'),
      evidence: {
        kind: 'moving-or-scrolling',
        source: 'marquee',
        automaticStart: 'declared',
        durationMs: null,
        repeatsIndefinitely: true,
      },
    }]);
  });

  it('ignores hidden moving content', () => {
    render('<marquee style="display:none">Hidden news</marquee><p>Other content.</p>');

    expect(evaluatePauseStopHide()).toEqual([]);
  });

  it('reviews long or looping autoplay video without native controls', () => {
    render('<video id="promo" src="promo.mp4" autoplay loop muted></video><p>Other content.</p>');
    const video = document.querySelector<HTMLVideoElement>('#promo')!;
    Object.defineProperty(video, 'paused', { configurable: true, value: false });

    expect(evaluatePauseStopHide()).toMatchObject([{
      status: 'review',
      element: video,
      evidence: {
        source: 'autoplay-video',
        automaticStart: 'observed',
        durationMs: null,
        repeatsIndefinitely: true,
        controlMechanism: 'none-observed',
      },
    }]);
  });

  it('records a bounded pass for autoplay video with native controls or a duration of five seconds', () => {
    render('<video id="controlled" src="controlled.mp4" autoplay controls></video><video id="short" src="short.mp4" autoplay></video><p>Other content.</p>');
    const short = document.querySelector<HTMLVideoElement>('#short')!;
    Object.defineProperty(short, 'duration', { configurable: true, value: 5 });

    expect(evaluatePauseStopHide()).toMatchObject([
      { status: 'pass', element: document.querySelector('#controlled') },
      { status: 'pass', element: short },
    ]);
  });

  it('integrates the signal as REVIEW and preserves structured JSON evidence', () => {
    render('<div id="ticker">Latest news</div><p>Other content.</p>');
    const ticker = document.querySelector('#ticker')!;
    setAnimations([animation(ticker, Number.POSITIVE_INFINITY)]);

    const result = runFocusTraceScan();
    const issue = result.review.find((candidate) => candidate.ruleId === 'FT-REVIEW-026');
    const rule = result.ruleResults?.find((candidate) => candidate.ruleId === 'FT-REVIEW-026');

    expect(issue).toMatchObject({
      outcome: 'review',
      targets: ['#ticker'],
      pauseStopHide: {
        source: 'web-animation',
        durationMs: null,
        thresholdMs: 5_000,
        repeatsIndefinitely: true,
      },
    });
    expect(JSON.parse(JSON.stringify(issue))).toMatchObject({
      pauseStopHide: { animatedProperties: ['transform'], animationNames: ['ticker'] },
    });
    expect(rule).toMatchObject({ applicable: 1, passed: 0, failures: 0, reviews: 1, warnings: 0 });
  });

  it('keeps component analysis inside the selected root', () => {
    render('<section id="component"><div id="inside">Inside</div><p>Component copy.</p></section><div id="outside">Outside</div>');
    const inside = document.querySelector('#inside')!;
    const outside = document.querySelector('#outside')!;
    setAnimations([animation(inside, 10_000), animation(outside, 10_000)]);

    const evaluations = evaluatePauseStopHide(document.querySelector('#component')!);

    expect(evaluations).toHaveLength(1);
    expect(evaluations[0]?.element).toBe(inside);
  });

  it('bounds review output on animation-heavy pages', () => {
    render(`${Array.from({ length: 60 }, (_, index) => `<span id="moving-${index}">Item ${index}</span>`).join('')}<p>Other content.</p>`);
    const animations = [...document.querySelectorAll('[id^="moving-"]')]
      .map((element, index) => animation(element, Number.POSITIVE_INFINITY, { name: `motion-${index}` }));
    setAnimations(animations);

    const evaluations = evaluatePauseStopHide();

    expect(evaluations).toHaveLength(50);
    expect(evaluations.every((evaluation) => evaluation.status === 'review')).toBe(true);
  });
});
