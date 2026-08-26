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

  it('keeps rendered severity styles synchronized with the canonical palette', () => {
    const sidepanel = readFileSync(new URL('../entrypoints/sidepanel/severity.css', import.meta.url), 'utf8');
    const siteAudit = readFileSync(new URL('../entrypoints/site-audit/severity.css', import.meta.url), 'utf8');
    const report = readFileSync(new URL('../entrypoints/report-print/severity.css', import.meta.url), 'utf8');

    for (const [severity, color] of Object.entries(SEVERITY_PALETTE.light.aa)) {
      const token = `--ft-severity-${severity}-aa: ${color};`;
      expect(sidepanel).toContain(token);
      expect(siteAudit).toContain(token);
      expect(report).toContain(token);
    }
    for (const [severity, color] of Object.entries(SEVERITY_PALETTE.light.aaa)) {
      const token = `--ft-severity-${severity}-aaa: ${color};`;
      expect(sidepanel).toContain(token);
      expect(siteAudit).toContain(token);
      expect(report).toContain(token);
    }
    for (const [severity, color] of Object.entries(SEVERITY_PALETTE.dark.aa)) {
      const token = `--ft-severity-${severity}-aa: ${color};`;
      expect(sidepanel).toContain(token);
      expect(siteAudit).toContain(token);
    }
    for (const [severity, color] of Object.entries(SEVERITY_PALETTE.dark.aaa)) {
      const token = `--ft-severity-${severity}-aaa: ${color};`;
      expect(sidepanel).toContain(token);
      expect(siteAudit).toContain(token);
    }
  });
});
