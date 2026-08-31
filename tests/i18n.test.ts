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

  it('localizes dynamic semantic evidence while preserving HTML and ARIA tokens', () => {
    const cases: ScanIssue[] = [
      {
        id: 'issue-semantic-button',
        ruleId: 'FT-REVIEW-006',
        title: 'Button-like interaction should prefer native button semantics',
        description: 'Button-like interaction.',
        evidence: 'Current <div>; signals: role="button", click handler, keyboard handler; confidence=high. Recommended native element: <button type="button">. Alternative semantics: role="button" with complete keyboard and focus behavior.',
        severity: 'moderate',
        outcome: 'review',
        targets: ['#save'],
        references: [],
      },
      {
        id: 'issue-semantic-link',
        ruleId: 'FT-REVIEW-007',
        title: 'Link-like navigation should prefer native link semantics',
        description: 'Link-like interaction.',
        evidence: 'Current <div>; signals: click handler, navigation-like click handler; confidence=medium. Recommended native element: <a href="…">. Alternative semantics: role="link" with complete keyboard and navigation behavior.',
        severity: 'moderate',
        outcome: 'review',
        targets: ['#products'],
        references: [],
      },
      {
        id: 'issue-semantic-unknown',
        ruleId: 'FT-REVIEW-008',
        title: 'Generic interactive element requires semantic review',
        description: 'Ambiguous interaction.',
        evidence: 'Current <img>; signals: click handler; confidence=medium. Native recommendation withheld because the interaction intent is ambiguous.',
        severity: 'moderate',
        outcome: 'review',
        targets: ['#card'],
        references: [],
      },
    ];

    const [button, link, unknown] = cases.map((issue) => localizedScanIssue(issue, 'es'));

    expect(button?.evidence).toContain('Elemento actual <div>');
    expect(button?.evidence).toContain('role="button"');
    expect(button?.evidence).toContain('<button type="button">');
    expect(button?.evidence).toContain('controlador de teclado');
    expect(link?.evidence).toContain('<a href="…">');
    expect(link?.evidence).toContain('teclado y navegación');
    expect(unknown?.evidence).toBe(
      'Elemento actual <img>; señales: controlador de clic; confianza=media. No se ofrece una recomendación de elemento nativo porque la intención de la interacción es ambigua.',
    );
    expect(cases.map((issue) => localizedScanIssue(issue, 'en').evidence)).toEqual(
      cases.map((issue) => issue.evidence),
    );
  });

  it('localizes structured contrast evidence without changing ratios or colors', () => {
    const issue: ScanIssue = {
      id: 'issue-contrast',
      ruleId: 'FT-WCAG-010',
      title: 'Text has sufficient color contrast',
      description: 'Rendered text contrast is too low.',
      evidence: 'text: contrast 2.07:1; required 4.5:1; foreground rgb(180, 180, 180); background rgb(255, 255, 255); font 16px / 400. Observed visual state: expanded.',
      severity: 'serious',
      outcome: 'fail',
      targets: ['#copy'],
      contrast: {
        kind: 'text',
        subject: 'text',
        ratio: 2.07,
        requiredRatio: 4.5,
        foreground: 'rgb(180, 180, 180)',
        background: 'rgb(255, 255, 255)',
        fontSizePx: 16,
        fontWeight: 400,
      },
      references: [],
    };

    const spanish = localizedScanIssue(issue, 'es');
    expect(spanish.title).toBe('Contraste de color del texto');
    expect(spanish.evidence).toBe(
      'texto: contraste 2.07:1; requerido 4.5:1; primer plano rgb(180, 180, 180); fondo rgb(255, 255, 255); fuente 16px / 400. Estado visual observado: expandido.',
    );
    const english = localizedScanIssue(issue, 'en');
    expect(english.title).toBe('Text color contrast');
    expect(english.evidence).toBe(issue.evidence);
  });

  it('localizes advanced ARIA validation findings while preserving technical evidence', () => {
    const issue: ScanIssue = {
      id: 'issue-aria',
      ruleId: 'FT-WARN-016',
      title: 'ARIA ID reference does not resolve to a valid relationship',
      description: 'This ARIA ID relationship is invalid.',
      evidence: 'aria-controls references missing ID #dialog-panel.',
      severity: 'serious',
      outcome: 'warning',
      targets: ['#open'],
      references: [],
    };

    const spanish = localizedScanIssue(issue, 'es');
    expect(spanish.title).toContain('referencia ARIA por ID');
    expect(spanish.description).toContain('relación ARIA');
    expect(spanish.evidence).toContain('aria-controls');
    expect(spanish.evidence).toContain('#dialog-panel');
  });

  it('localizes the new ARIA semantic warnings in both supported languages', () => {
    const unsupported: ScanIssue = {
      id: 'issue-aria-unsupported',
      ruleId: 'FT-WARN-020',
      title: 'ARIA state or property is not supported by the resolved role',
      description: 'This known ARIA state/property is not supported by the resolved role.',
      evidence: 'aria-selected is not supported by role="button".',
      severity: 'serious',
      outcome: 'warning',
      targets: ['#save'],
      references: [],
    };
    const relationship: ScanIssue = {
      id: 'issue-aria-relationship',
      ruleId: 'FT-WARN-021',
      title: 'ARIA relationship and exposed state are inconsistent',
      description: 'The ARIA relationship resolves but contradicts the exposed state.',
      evidence: 'aria-expanded="true" contradicts the current availability of #panel.',
      severity: 'serious',
      outcome: 'warning',
      targets: ['#toggle'],
      references: [],
    };

    const unsupportedEs = localizedScanIssue(unsupported, 'es');
    const relationshipEs = localizedScanIssue(relationship, 'es');
    const unsupportedEn = localizedScanIssue(unsupported, 'en');
    const relationshipEn = localizedScanIssue(relationship, 'en');

    expect(unsupportedEs.title).toContain('no es compatible con el rol');
    expect(unsupportedEs.description).toContain('tecnologías de asistencia');
    expect(relationshipEs.title).toContain('relación ARIA');
    expect(relationshipEs.description).toContain('aria-invalid');
    expect(unsupportedEn.title).toBe(unsupported.title);
    expect(relationshipEn.title).toBe(relationship.title);
    expect(unsupportedEs.evidence).toBe(unsupported.evidence);
    expect(relationshipEs.evidence).toBe(relationship.evidence);
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

  it('explains a denied fresh-install page permission instead of showing a generic analysis error', () => {
    const reason = new Error('FocusTrace page access permission was not granted.');

    expect(localizedUserError(reason, 'es', 'analysis')).toBe(
      'FocusTrace no tiene el acceso a la página necesario para esta acción. Concede el acceso y vuelve a intentarlo.',
    );
    expect(localizedUserError(reason, 'en', 'analysis')).toBe(
      'FocusTrace does not have the page access required for this action. Grant access and try again.',
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
