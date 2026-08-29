// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { evaluateInteractiveSemantics, mainLandmarkCandidates } from '../lib/audit/semantics';

function render(body: string) {
  document.open();
  document.write(`<!doctype html><html lang="en"><head><title>Semantics</title></head><body>${body}</body></html>`);
  document.close();
}

describe('semantic HTML analysis', () => {
  it('does not flag native buttons or links', () => {
    render('<main><button type="button">Open</button><a href="/products">Products</a></main>');
    expect(evaluateInteractiveSemantics(document)).toEqual([]);
  });

  it('recommends a native button for a generic element with role=button', () => {
    render('<main><div id="dialog-trigger" role="button" tabindex="0">Open dialog</div></main>');
    const signal = evaluateInteractiveSemantics(document)[0];

    expect(signal).toMatchObject({
      intent: 'button',
      confidence: 'high',
      currentTag: 'div',
      explicitRole: 'button',
      recommendedNative: '<button type="button">',
      alternativeRole: 'button',
    });
  });

  it('recommends a native link when an inline click handler clearly navigates', () => {
    render('<main><div id="products" onclick="window.location.href=\'/products\'">Products</div></main>');
    const signal = evaluateInteractiveSemantics(document)[0];

    expect(signal).toMatchObject({
      intent: 'link',
      confidence: 'medium',
      currentTag: 'div',
      recommendedNative: '<a href="…">',
      alternativeRole: 'link',
    });
    expect(signal?.signals).toContain('navigation-like click handler');
  });

  it('treats expanded or pressed generic controls as button-like', () => {
    render('<main><span id="menu" aria-expanded="false" onclick="toggleMenu()">Menu</span></main>');
    const signal = evaluateInteractiveSemantics(document)[0];

    expect(signal).toMatchObject({
      intent: 'button',
      confidence: 'medium',
      recommendedNative: '<button type="button">',
    });
    expect(signal?.signals).toContain('aria-expanded');
  });

  it('keeps an ambiguous click-only generic element as manual semantic review', () => {
    render('<main><div id="card" onclick="selectCard()">Account</div></main>');
    const signal = evaluateInteractiveSemantics(document)[0];

    expect(signal).toMatchObject({
      intent: 'unknown',
      confidence: 'medium',
      currentTag: 'div',
    });
    expect(signal?.recommendedNative).toBeUndefined();
  });

  it('does not reinterpret a custom widget with another explicit role', () => {
    render('<main><div id="tab" role="tab" aria-controls="panel" onclick="activateTab()">Details</div></main>');
    expect(evaluateInteractiveSemantics(document)).toEqual([]);
  });

  it('finds native and ARIA main landmarks but ignores presentational main elements', () => {
    render('<main id="primary"></main><div id="secondary" role="main"></div><main id="ignored" role="presentation"></main>');
    expect(mainLandmarkCandidates().map((element) => element.id)).toEqual(['primary', 'secondary']);
  });
});
