import { describe, expect, it } from 'vitest';
import { explanationForCause, humanRuntimeEventTitle, outcomeLabel } from '../lib/runtime/explanations';
import { localizedScanIssue, localizedSeverity } from '../shared/i18n';
import type { RuntimeEvent, ScanIssue } from '../shared/types';

describe('FocusTrace bilingual presentation', () => {
  it('localizes scan rule copy without changing technical identifiers', () => {
    const issue: ScanIssue = {
      id: 'issue-1',
      ruleId: 'FT-WCAG-002',
      title: 'Image has an accessible name or is marked decorative',
      description: 'The image is exposed as image content but has an empty accessible name and is not marked decorative.',
      evidence: 'The <img> element has no alt attribute and no alternative naming mechanism was detected.',
      severity: 'serious',
      outcome: 'fail',
      targets: ['#hero-image'],
      references: [],
    };

    const spanish = localizedScanIssue(issue, 'es');
    expect(spanish.title).toContain('imagen');
    expect(spanish.description).toContain('nombre accesible');
    expect(spanish.evidence).toContain('nombre accesible');
    expect(issue.ruleId).toBe('FT-WCAG-002');
    expect(issue.targets[0]).toBe('#hero-image');
  });

  it('keeps English as the default explanation language', () => {
    expect(explanationForCause('FOCUSED_NODE_REMOVED').title).toBe('Focus was lost after an element disappeared');
    expect(outcomeLabel('fail', 'simple')).toBe('issue');
  });

  it('localizes runtime human explanations while preserving raw event data', () => {
    const event: RuntimeEvent = {
      id: 'event-1',
      timestamp: 1,
      kind: 'focus',
      severity: 'info',
      title: 'Focus → Guardar',
      element: {
        tag: 'button',
        role: 'button',
        name: 'Guardar',
        selector: '#save',
      },
    };

    expect(humanRuntimeEventTitle(event, 'es')).toBe('El foco se movió a “Guardar”');
    expect(localizedSeverity('serious', 'es')).toBe('grave');
    expect(localizedSeverity('minor', 'es')).toBe('leve');
    expect(event.element?.selector).toBe('#save');
  });
});
