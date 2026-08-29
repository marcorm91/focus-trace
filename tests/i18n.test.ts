import { describe, expect, it } from 'vitest';
import { explanationForCause, humanRuntimeEventTitle, outcomeLabel } from '../lib/runtime/explanations';
import { humanRuntimeEventDetail, runtimeEventKindLabel } from '../lib/runtime/runtime-presentation';
import { localizedScanIssue, localizedSeverity } from '../shared/i18n';
import type { RuntimeEvent, ScanIssue } from '../shared/types';
import { localizedUserError } from '../shared/user-facing-errors';

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

  it('localizes structural HTML semantic findings', () => {
    const issue: ScanIssue = {
      id: 'issue-structural',
      ruleId: 'FT-WARN-008',
      title: 'HTML element is used outside its required semantic context',
      description: 'This native HTML element is outside a required semantic context.',
      evidence: '<li> requires a direct <ul>, <ol> or <menu> parent.',
      severity: 'moderate',
      outcome: 'warning',
      targets: ['#orphan'],
      references: [],
    };

    const spanish = localizedScanIssue(issue, 'es');
    expect(spanish.title).toContain('contexto semántico requerido');
    expect(spanish.description).toContain('HTML nativo');
    expect(spanish.evidence).toContain('<li>');
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
    expect(localizedSeverity('critical', 'es')).toBe('crítico');
    expect(localizedSeverity('serious', 'es')).toBe('grave');
    expect(localizedSeverity('moderate', 'es')).toBe('moderado');
    expect(localizedSeverity('minor', 'es')).toBe('leve');
    expect(event.element?.selector).toBe('#save');
  });

  it('never exposes native restricted-page errors as user-facing English in Spanish', () => {
    const native = new Error('Cannot access a chrome:// URL');
    const spanish = localizedUserError(native, 'es', 'analysis');
    const english = localizedUserError(native, 'en', 'analysis');

    expect(spanish).toContain('no se puede analizar');
    expect(spanish).toContain('navegador');
    expect(spanish).not.toContain(native.message);
    expect(english).toContain('cannot be analyzed');
  });

  it('uses localized safe fallbacks instead of echoing unknown technical errors', () => {
    const native = new Error('Unexpected internal transport failure 0xdeadbeef');

    expect(localizedUserError(native, 'es', 'trace')).toBe(
      'FocusTrace no ha podido actualizar la sesión de Trace actual. Vuelve a intentarlo.',
    );
    expect(localizedUserError(native, 'en', 'trace')).toBe(
      'FocusTrace could not update the current Trace session. Try again.',
    );
  });

  it('localizes runtime kinds and structured details instead of rendering stored English prose', () => {
    const event: RuntimeEvent = {
      id: 'event-walk',
      timestamp: 1,
      kind: 'focus-walk-end',
      severity: 'info',
      title: 'Automatic focus walk completed',
      detail: 'Focused 3/5 candidates; skipped 2.',
      focusWalk: {
        totalCandidates: 5,
        focusedSteps: 3,
        skipped: 2,
        stopped: false,
      },
    };

    expect(runtimeEventKindLabel(event.kind, 'es')).toBe('Recorrido de foco finalizado');
    expect(humanRuntimeEventDetail(event, 'es')).toBe('Se enfocaron 3/5 elementos; se omitieron 2.');
    expect(humanRuntimeEventDetail(event, 'es')).not.toBe(event.detail);
    expect(humanRuntimeEventDetail(event, 'en')).toBe('Focused 3/5 candidates; skipped 2.');
  });
});
