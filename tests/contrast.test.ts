// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import {
  colorToHex,
  colorToRgb,
  contrastRatio,
  evaluateTextContrastForElement,
  parseCssColor,
  suggestAccessibleForeground,
  suggestAccessibleTextColors,
  textContrastSubjectsForElement,
  textContrastRequirement,
  textContrastTargets,
} from '../lib/audit/contrast';

function render(body: string) {
  document.open();
  document.write(`<!doctype html><html><head><style>html,body{margin:0;background:#fff;color:#000;font-size:16px}</style></head><body>${body}</body></html>`);
  document.close();
}

describe('text contrast', () => {
  it('parses rgb, rgba, hex and modern sRGB/OKLCH colors', () => {
    expect(parseCssColor('rgb(255, 0, 128)')).toEqual({ r: 255, g: 0, b: 128, a: 1 });
    expect(parseCssColor('rgba(10, 20, 30, 0.5)')).toEqual({ r: 10, g: 20, b: 30, a: 0.5 });
    expect(parseCssColor('#fff')).toEqual({ r: 255, g: 255, b: 255, a: 1 });
    expect(parseCssColor('#00000080')?.a).toBeCloseTo(128 / 255);
    expect(parseCssColor('color(srgb 1 0 0)')).toMatchObject({ r: 255, g: 0, b: 0, a: 1 });
    const oklch = parseCssColor('oklch(62.8% 0.2577 29.23)');
    expect(oklch?.r).toBeGreaterThan(240);
    expect(oklch?.g).toBeLessThan(40);
  });

  it('converts parsed colors to hex and rgb', () => {
    const color = parseCssColor('#778899')!;
    expect(colorToHex(color)).toBe('#778899');
    expect(colorToRgb(color)).toBe('rgb(119, 136, 153)');
  });

  it('calculates the WCAG black-on-white ratio', () => {
    expect(contrastRatio(parseCssColor('#000')!, parseCssColor('#fff')!)).toBeCloseTo(21, 5);
  });

  it('uses the correct AA and AAA targets for normal and large text', () => {
    expect(textContrastRequirement(16, 400)).toEqual({ largeText: false, requiredRatio: 4.5 });
    expect(textContrastRequirement(24, 400)).toEqual({ largeText: true, requiredRatio: 3 });
    expect(textContrastRequirement(18.667, 700)).toEqual({ largeText: true, requiredRatio: 3 });
    expect(textContrastTargets(false)).toEqual({ aa: 4.5, aaa: 7 });
    expect(textContrastTargets(true)).toEqual({ aa: 3, aaa: 4.5 });
  });

  it('suggests the perceptually nearest lightness adjustment that reaches AA', () => {
    const suggestion = suggestAccessibleForeground('rgb(119, 119, 119)', 'rgb(255, 255, 255)', 4.5);
    expect(suggestion?.direction).toBe('darker');
    expect(suggestion?.ratio).toBeGreaterThanOrEqual(4.5);
    expect(suggestion?.targetRatio).toBe(4.5);
    expect(suggestion?.perceptualDelta).toBeGreaterThan(0);
    expect(suggestion?.hex).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('returns separate AA and AAA suggestions for normal text', () => {
    const suggestions = suggestAccessibleTextColors('#d78925', '#fff', false);
    expect(suggestions.aa?.ratio).toBeGreaterThanOrEqual(4.5);
    expect(suggestions.aaa?.ratio).toBeGreaterThanOrEqual(7);
    expect(suggestions.aaa?.perceptualDelta).toBeGreaterThan(suggestions.aa?.perceptualDelta ?? 0);
    expect(suggestions.aa?.hex).not.toBe(suggestions.aaa?.hex);
  });

  it('uses the large-text AAA target without inventing a 7:1 requirement', () => {
    const suggestions = suggestAccessibleTextColors('#999', '#fff', true);
    expect(suggestions.aa?.targetRatio).toBe(3);
    expect(suggestions.aaa?.targetRatio).toBe(4.5);
    expect(suggestions.aaa?.ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('can choose a lighter accessible suggestion for failing text on a dark background', () => {
    const suggestion = suggestAccessibleForeground('#555', '#000', 4.5);
    expect(suggestion?.direction).toBe('lighter');
    expect(suggestion?.ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('fails deterministic low-contrast normal text with structured evidence', () => {
    render('<p id="low" style="color:rgb(119,119,119);background-color:rgb(255,255,255);font-size:16px;font-weight:400">Low contrast</p>');
    const element = document.querySelector('#low')!;
    const result = evaluateTextContrastForElement(element);
    expect(result.status).toBe('fail');
    expect(result.ratio).toBeCloseTo(4.48, 2);
    expect(result.requiredRatio).toBe(4.5);
    expect(result.foreground).toBe('rgb(119, 119, 119)');
    expect(result.background).toBe('rgb(255, 255, 255)');
  });

  it('passes the same ratio when the text qualifies as large', () => {
    render('<p id="large" style="color:rgb(119,119,119);background-color:white;font-size:24px;font-weight:400">Large text</p>');
    const result = evaluateTextContrastForElement(document.querySelector('#large')!);
    expect(result.status).toBe('pass');
    expect(result.requiredRatio).toBe(3);
    expect(result.largeText).toBe(true);
  });

  it('calculates simple element opacity instead of sending deterministic text to review', () => {
    render('<div style="background:#fff"><p id="fade" style="color:#000;opacity:.5;font-size:16px">Faded text</p></div>');
    const result = evaluateTextContrastForElement(document.querySelector('#fade')!);
    expect(result.status).toBe('fail');
    expect(result.ratio).toBeCloseTo(3.98, 2);
    expect(result.foreground).toBe('rgb(128, 128, 128)');
    expect(result.background).toBe('rgb(255, 255, 255)');
  });

  it('keeps ancestor opacity in review when group compositing cannot be isolated safely', () => {
    render('<div style="background:#fff;opacity:.5"><p id="nested-opacity" style="color:#000;font-size:16px">Nested opacity</p></div>');
    const result = evaluateTextContrastForElement(document.querySelector('#nested-opacity')!);
    expect(result.status).toBe('review');
    expect(result.reason).toContain('opacity');
  });

  it('returns review for gradients instead of manufacturing a fail', () => {
    render('<p id="gradient" style="color:#777;background-image:linear-gradient(#fff,#eee);font-size:16px">Gradient text</p>');
    const result = evaluateTextContrastForElement(document.querySelector('#gradient')!);
    expect(result.status).toBe('review');
    expect(result.reason).toContain('background image or gradient');
  });

  it('resolves transparent ancestor backgrounds against the page canvas', () => {
    render('<div style="background:#000"><span id="nested" style="color:#fff;font-size:16px">Nested</span></div>');
    const result = evaluateTextContrastForElement(document.querySelector('#nested')!);
    expect(result.status).toBe('pass');
    expect(result.ratio).toBeCloseTo(21, 2);
    expect(result.background).toBe('rgb(0, 0, 0)');
  });

  it('recognizes form values, selected options, placeholders and default submit/reset labels as rendered text', () => {
    render(`
      <input id="value" value="Visible value">
      <input id="placeholder" placeholder="Visible placeholder">
      <textarea id="textarea">Visible textarea</textarea>
      <select id="select"><option selected>Visible option</option></select>
      <input id="submit" type="submit">
      <input id="reset" type="reset">
    `);

    expect(textContrastSubjectsForElement(document.querySelector('#value')!)).toEqual([
      { subject: 'input value' },
    ]);
    expect(textContrastSubjectsForElement(document.querySelector('#placeholder')!)).toEqual([
      { subject: 'placeholder', pseudo: '::placeholder' },
    ]);
    expect(textContrastSubjectsForElement(document.querySelector('#textarea')!)).toEqual([
      { subject: 'textarea value' },
    ]);
    expect(textContrastSubjectsForElement(document.querySelector('#select')!)).toEqual([
      { subject: 'selected option' },
    ]);
    expect(textContrastSubjectsForElement(document.querySelector('#submit')!)).toEqual([
      { subject: 'input value' },
    ]);
    expect(textContrastSubjectsForElement(document.querySelector('#reset')!)).toEqual([
      { subject: 'input value' },
    ]);
  });

  it('keeps unresolved computed text colors as review evidence', () => {
    render('<p id="system">System color</p>');
    const element = document.querySelector('#system')!;
    const base = getComputedStyle(element);
    const unresolved = new Proxy(base, {
      get(target, property, receiver) {
        if (property === 'color') return 'CanvasText';
        return Reflect.get(target, property, receiver);
      },
    });
    const original = window.getComputedStyle;
    window.getComputedStyle = (() => unresolved) as typeof window.getComputedStyle;
    try {
      const result = evaluateTextContrastForElement(element);
      expect(result.status).toBe('review');
      expect(result.reason).toContain('CanvasText');
      expect(result.requiredRatio).toBe(4.5);
    } finally {
      window.getComputedStyle = original;
    }
  });
});
