import { describe, expect, it } from 'vitest';
import { classifyGeneratedContentForContrast } from '../lib/audit/contrast';

describe('generated content contrast classification', () => {
  it('keeps genuine generated words in WCAG 1.4.3 text contrast', () => {
    expect(classifyGeneratedContentForContrast('"Required"', 'Arial')).toBe('text');
    expect(classifyGeneratedContentForContrast('"X"', 'Arial')).toBe('text');
  });

  it('classifies Font Awesome private-use glyphs as non-text symbols', () => {
    expect(classifyGeneratedContentForContrast('"\uf00d"', '"Font Awesome 6 Free"')).toBe('symbol');
    expect(classifyGeneratedContentForContrast('"\\f00d"', 'sans-serif')).toBe('symbol');
  });

  it('classifies single Unicode symbols as non-text symbols', () => {
    expect(classifyGeneratedContentForContrast('">"', 'Arial')).toBe('symbol');
    expect(classifyGeneratedContentForContrast('"→"', 'Arial')).toBe('symbol');
  });

  it('uses known icon-font families as a strong signal even for ligature text', () => {
    expect(classifyGeneratedContentForContrast('"home"', '"Material Icons"')).toBe('symbol');
    expect(classifyGeneratedContentForContrast('"menu"', '"Bootstrap Icons"')).toBe('symbol');
  });

  it('ignores empty and disabled generated content', () => {
    expect(classifyGeneratedContentForContrast('none')).toBe('none');
    expect(classifyGeneratedContentForContrast('normal')).toBe('none');
    expect(classifyGeneratedContentForContrast('""')).toBe('none');
  });
});