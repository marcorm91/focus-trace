// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import {
  colorToHex,
  colorToRgb,
  contrastRatio,
  evaluateTextContrastForElement,
  parseCssColor,
  suggestAccessibleForeground,
  textContrastRequirement,
} from '../lib/audit/contrast';

function render(body: string) {
  document.open();
  document.write(`<!doctype html><html><head><style>html,body{margin:0;background:#fff;color:#000;font-size:16px}</style></head><body>${body}</body></html>`);
  document.close();
}

describe('text contrast', () => {
  it('parses rgb, rgba and hex colors', () => {
    expect(parseCssColor('rgb(255, 0, 128)')).toEqual({ r: 255, g: 0, b: 128, a: 1 });
    expect(parseCssColor('rgba(10, 20, 30, 0.5)')).toEqual({ r: 10, g: 20, b: 30, a: 0.5 });
    expect(parseCssColor('#fff')).toEqual({ r: 255, g: 255, b: 255, a: 1 });
    expect(parseCssColor('#00000080')?.a).toBeCloseTo(128 / 255);
  });

  it('converts parsed colors to hex and rgb', () => {
    const color = parseCssColor('#778899')!;
    expect(colorToHex(color)).toBe('#778899');
    expect(colorToRgb(color)).toBe('rgb(119, 136, 153)');
  });

  it('calculates the WCAG black-on-white ratio', () => {
    expect(contrastRatio(parseCssColor('#000')!, parseCssColor('#fff')!)).toBeCloseTo(21, 5);
  });

  it('uses 4.5:1 for normal text and 3:1 for large text', () => {
    expect(textContrastRequirement(16, 400)).toEqual({ largeText: false, requiredRatio: 4.5 });
    expect(textContrastRequirement(24, 400)).toEqual({ largeText: true, requiredRatio: 3 });
    expect(textContrastRequirement(18.667, 700)).toEqual({ largeText: true, requiredRatio: 3 });
  });

  it('suggests the smallest black/white-mix adjustment that reaches the target ratio', () => {
    const suggestion = suggestAccessibleForeground('rgb(119, 119, 119)', 'rgb(255, 255, 255)', 4.5);
    expect(suggestion).toMatchObject({
      hex: '#767676',
      rgb: 'rgb(118, 118, 118)',
      direction: 'darker',
    });
    expect(suggestion?.ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('can choose a lighter accessible suggestion when that requires less change', () => {
    const suggestion = suggestAccessibleForeground('#777', '#000', 4.5);
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
});
