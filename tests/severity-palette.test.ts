import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { contrastRatio, parseCssColor } from '../lib/audit/contrast';
import {
  SEVERITY_ACCENT_LEVEL,
  SEVERITY_PALETTE,
  SEVERITY_PALETTE_BACKGROUNDS,
  SEVERITY_TEXT_LEVEL,
} from '../shared/severity-palette';

const thresholds = { aa: 4.5, aaa: 7 } as const;

function source(path: string): string {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

describe('severity contrast palette', () => {
  it('keeps every AA and AAA variant above its declared text contrast threshold', () => {
    for (const theme of ['light', 'dark'] as const) {
      const background = parseCssColor(SEVERITY_PALETTE_BACKGROUNDS[theme]);
      expect(background).toBeDefined();

      for (const level of ['aa', 'aaa'] as const) {
        for (const color of Object.values(SEVERITY_PALETTE[theme][level])) {
          const foreground = parseCssColor(color);
          expect(foreground).toBeDefined();
          expect(contrastRatio(foreground!, background!)).toBeGreaterThanOrEqual(thresholds[level]);
        }
      }
    }
  });

  it('uses AA for accents and AAA for textual severity labels', () => {
    expect(SEVERITY_ACCENT_LEVEL).toBe('aa');
    expect(SEVERITY_TEXT_LEVEL).toBe('aaa');
  });

  it('keeps shared CSS tokens synchronized with the canonical palette', () => {
    const lightTokens = source('shared/severity-tokens.css');
    const darkTokens = source('shared/severity-tokens-dark.css');

    for (const [severity, color] of Object.entries(SEVERITY_PALETTE.light.aa)) {
      expect(lightTokens).toContain(`--ft-severity-${severity}-aa: ${color};`);
    }
    for (const [severity, color] of Object.entries(SEVERITY_PALETTE.light.aaa)) {
      expect(lightTokens).toContain(`--ft-severity-${severity}-aaa: ${color};`);
    }
    for (const [severity, color] of Object.entries(SEVERITY_PALETTE.dark.aa)) {
      expect(darkTokens).toContain(`--ft-severity-${severity}-aa: ${color};`);
    }
    for (const [severity, color] of Object.entries(SEVERITY_PALETTE.dark.aaa)) {
      expect(darkTokens).toContain(`--ft-severity-${severity}-aaa: ${color};`);
    }
  });

  it('loads the shared tokens in every severity surface without duplicating the palette', () => {
    const sidepanel = source('entrypoints/sidepanel/severity.css');
    const siteAudit = source('entrypoints/site-audit/severity.css');
    const report = source('entrypoints/report-print/severity.css');

    for (const interactiveSurface of [sidepanel, siteAudit]) {
      expect(interactiveSurface).toContain("@import '../../shared/severity-tokens.css';");
      expect(interactiveSurface).toContain("@import '../../shared/severity-tokens-dark.css';");
      expect(interactiveSurface).not.toContain('--ft-severity-critical-aa:');
    }

    expect(report).toContain("@import '../../shared/severity-tokens.css';");
    expect(report).not.toContain('severity-tokens-dark.css');
    expect(report).not.toContain('--ft-severity-critical-aa:');
  });
});
