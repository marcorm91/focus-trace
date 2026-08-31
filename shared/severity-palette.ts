import type { Severity } from './types';

export type SeverityPaletteLevel = 'aa' | 'aaa';
export type SeverityTheme = 'light' | 'dark';

type SeverityColorSet = Record<Exclude<Severity, 'info'>, string>;

export const SEVERITY_PALETTE_BACKGROUNDS: Record<SeverityTheme, string> = {
  light: '#ffffff',
  dark: '#1b2530',
};

export const SEVERITY_PALETTE: Record<SeverityTheme, Record<SeverityPaletteLevel, SeverityColorSet>> = {
  light: {
    aa: {
      critical: '#b91c1c',
      serious: '#a64b00',
      moderate: '#786500',
      minor: '#2377d4',
    },
    aaa: {
      critical: '#991b1b',
      serious: '#8a3d00',
      moderate: '#695800',
      minor: '#1b59a0',
    },
  },
  dark: {
    aa: {
      critical: '#f87171',
      serious: '#f5a524',
      moderate: '#998b3e',
      minor: '#448dde',
    },
    aaa: {
      critical: '#fca5a5',
      serious: '#ffd08a',
      moderate: '#b9af7b',
      minor: '#81b2e9',
    },
  },
};

/**
 * AA colors stay closest to the product hues and are used for accent strokes.
 * AAA colors are used for severity text on the standard FocusTrace surfaces.
 * Neither level changes the meaning of the severity itself.
 */
export const SEVERITY_ACCENT_LEVEL: SeverityPaletteLevel = 'aa';
export const SEVERITY_TEXT_LEVEL: SeverityPaletteLevel = 'aaa';
