// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { evaluateTextSpacing } from '../lib/audit/text-spacing';

function rect(top = 10, left = 10, width = 160, height = 20): DOMRect {
  return {
    x: left,
    y: top,
    top,
    left,
    right: left + width,
    bottom: top + height,
    width,
    height,
    toJSON: () => ({}),
  } as DOMRect;
}

function render(body: string) {
  document.open();
  document.write(`<!doctype html><html lang="en"><body>${body}</body></html>`);
  document.close();
}

const originalGetClientRects = (Range.prototype as Range & { getClientRects?: () => DOMRectList }).getClientRects;

beforeEach(() => {
  Object.defineProperty(Range.prototype, 'getClientRects', {
    configurable: true,
    value(this: Range) {
      const node = this.startContainer;
      const parent = node instanceof Text ? node.parentElement : null;
      if (!parent) return [];
      if (parent.dataset.offscreen === 'true') return [rect(-20_000)];
      if (parent.dataset.wrap === 'true') return [rect(10), rect(34)];
      return [rect(10)];
    },
  });
});

afterEach(() => {
  if (originalGetClientRects) {
    Object.defineProperty(Range.prototype, 'getClientRects', {
      configurable: true,
      value: originalGetClientRects,
    });
  } else {
    delete (Range.prototype as Range & { getClientRects?: () => DOMRectList }).getClientRects;
  }
});

describe('WCAG 1.4.12 text spacing ACT subset', () => {
  it('reviews inline important letter spacing below 0.12 times font size', () => {
    render('<p id="target" style="font-size: 20px; letter-spacing: 2px !important">Readable text</p>');
    const [evaluation] = evaluateTextSpacing(document);

    expect(evaluation).toMatchObject({
      property: 'letter-spacing',
      outcome: 'review',
      fontSizePx: 20,
      requiredPx: 2.4,
      observedPx: 2,
    });
  });

  it('passes the tested letter-spacing expectation at or above the threshold', () => {
    render('<p style="font-size: 20px; letter-spacing: 2.4px !important">Readable text</p>');
    expect(evaluateTextSpacing(document)).toMatchObject([{ property: 'letter-spacing', outcome: 'pass' }]);
  });

  it('reviews inline important word spacing below 0.16 times font size', () => {
    render('<p style="font-size: 20px; word-spacing: 3px !important">Readable words here</p>');
    expect(evaluateTextSpacing(document)).toMatchObject([{
      property: 'word-spacing',
      outcome: 'review',
      requiredPx: 3.2,
      observedPx: 3,
    }]);
  });

  it('applies line-height only when a direct text node visibly soft-wraps', () => {
    render('<p data-wrap="true" style="font-size: 20px; line-height: 20px !important">This sentence wraps onto another visual line.</p>');
    expect(evaluateTextSpacing(document)).toMatchObject([{
      property: 'line-height',
      outcome: 'review',
      requiredPx: 30,
      observedPx: 20,
    }]);

    render('<p style="font-size: 20px; line-height: 20px !important">Single visual line.</p>');
    expect(evaluateTextSpacing(document)).toEqual([]);
  });

  it('does not treat preserved authored newlines as proof of a soft wrap', () => {
    render('<p data-wrap="true" style="white-space: pre-line; font-size: 20px; line-height: 20px !important">First line\nSecond line</p>');
    expect(evaluateTextSpacing(document)).toEqual([]);
  });

  it('ignores normal-priority declarations because user styles can override them', () => {
    render('<p style="font-size: 20px; letter-spacing: 1px">Readable text</p>');
    expect(evaluateTextSpacing(document)).toEqual([]);
  });

  it('ignores inherited CSS-wide important values instead of treating inherited spacing as author-locked', () => {
    render('<div style="letter-spacing: 1px"><p style="letter-spacing: inherit !important">Readable text</p></div>');
    expect(evaluateTextSpacing(document)).toEqual([]);
  });

  it('requires direct visible text affected by the inline declaration', () => {
    render('<div style="font-size: 20px; letter-spacing: 1px !important"><span>Nested text only</span></div>');
    expect(evaluateTextSpacing(document)).toEqual([]);
  });

  it('ignores code-like contexts because ACT assumes human-language text using the property', () => {
    render('<code><span style="font-size: 20px; letter-spacing: 1px !important">const example = true;</span></code>');
    expect(evaluateTextSpacing(document)).toEqual([]);
  });

  it('ignores text positioned outside the reachable document area', () => {
    render('<p data-offscreen="true" style="font-size: 20px; letter-spacing: 1px !important">Off-screen text</p>');
    expect(evaluateTextSpacing(document)).toEqual([]);
  });
});
