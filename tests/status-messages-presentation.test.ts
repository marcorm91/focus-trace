import { describe, expect, it } from 'vitest';
import { humanRuntimeEventTitle } from '../lib/runtime/explanations';
import { humanRuntimeEventDetail, runtimeEventKindLabel } from '../lib/runtime/runtime-presentation';
import { actionableRemediationText } from '../lib/report/actionable-remediation';
import type { RuntimeEvent } from '../shared/types';

const event: RuntimeEvent = {
  id: 'status-1',
  timestamp: 100,
  kind: 'status-message',
  severity: 'moderate',
  title: 'Observed status message may not be programmatically exposed',
  detail: 'Observed status-like text “Saved” after an interaction, but no live-region/status semantics or aria-errormessage relationship were found. FocusTrace keeps this as REVIEW because deciding whether the content is a WCAG status message requires context.',
  outcome: 'review',
  ruleId: 'FT-RUNTIME-007',
  element: { tag: 'div', selector: '#save-toast' },
  references: [{
    type: 'WCAG',
    id: '4.1.3',
    label: 'Status Messages',
    level: 'AA',
    status: 'normative',
    url: 'https://www.w3.org/TR/WCAG22/#status-messages',
  }],
};

describe('status message runtime presentation', () => {
  it('presents the runtime finding in Spanish while preserving inspected page text', () => {
    expect(runtimeEventKindLabel('status-message', 'es')).toBe('Mensaje de estado');
    expect(humanRuntimeEventTitle(event, 'es')).toBe(
      'Es posible que un mensaje de estado no esté expuesto a las tecnologías de asistencia',
    );

    const detail = humanRuntimeEventDetail(event, 'es');
    expect(detail).toContain('FocusTrace observó “Saved”');
    expect(detail).toContain('WCAG 4.1.3');
    expect(detail).not.toContain('“Guardado”');
  });

  it('provides equivalent English and Spanish remediation without recommending focus movement', () => {
    const english = actionableRemediationText('FT-RUNTIME-007', 'en');
    const spanish = actionableRemediationText('FT-RUNTIME-007', 'es');

    expect(english).toContain('role="status"');
    expect(english).toContain('without receiving focus');
    expect(spanish).toContain('role="status"');
    expect(spanish).toContain('sin recibir el foco');
  });
});
