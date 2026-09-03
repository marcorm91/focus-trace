import { describe, expect, it } from 'vitest';
import { localizedScanIssue } from '../shared/i18n';
import type { ScanIssue } from '../shared/types';

function contrastIssue(reason: string): ScanIssue {
  return {
    id: 'contrast-source-copy',
    ruleId: 'FT-WCAG-010',
    title: 'Text color contrast',
    description: 'FocusTrace could not determine the rendered text/background contrast reliably.',
    evidence: `${reason} Required ratio: 4.5:1 for normal text.`,
    severity: 'serious',
    outcome: 'review',
    targets: ['#copy'],
    contrast: {
      kind: 'text',
      subject: 'text',
      requiredRatio: 4.5,
      reason,
    },
    references: [],
  };
}

describe('Spanish contrast source copy', () => {
  it('localizes known generated contrast reasons in structured evidence', () => {
    const localized = localizedScanIssue(
      contrastIssue('A background image or gradient affects the rendered background.'),
      'es',
    );

    expect(localized.contrast?.reason).toBe('Una imagen de fondo o un degradado afecta al fondo renderizado.');
    expect(localized.contrast?.reason).not.toContain('background image');
  });

  it('uses a Spanish review message for a future unknown English contrast reason', () => {
    const localized = localizedScanIssue(
      contrastIssue('This future visual source cannot be resolved with the current renderer.'),
      'es',
    );

    expect(localized.contrast?.reason).toContain('Revisa este caso manualmente');
    expect(localized.contrast?.reason).not.toContain('future visual source');
  });
});
