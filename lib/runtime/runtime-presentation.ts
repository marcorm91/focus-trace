import { tr, type AppLanguage } from '../../shared/i18n';
import type { RuntimeEvent, RuntimeEventKind } from '../../shared/types';
import type { FocusJourneyDirection } from './focus-journey';

export function runtimeEventKindLabel(kind: RuntimeEventKind, language: AppLanguage): string {
  if (kind === 'focus') return tr(language, 'Focus', 'Foco');
  if (kind === 'virtual-focus') return tr(language, 'Virtual focus', 'Foco virtual');
  if (kind === 'keydown') return tr(language, 'Keyboard', 'Teclado');
  if (kind === 'click') return tr(language, 'Activation', 'Activación');
  if (kind === 'input-change') return tr(language, 'Setting change', 'Cambio de valor');
  if (kind === 'dragging') return tr(language, 'Dragging', 'Arrastre');
  if (kind === 'contrast-state') return tr(language, 'Interactive contrast', 'Contraste interactivo');
  if (kind === 'hover-focus-content') return tr(language, 'Hover/focus content', 'Contenido hover/foco');
  if (kind === 'route') return tr(language, 'Navigation', 'Navegación');
  if (kind === 'dom-mutation') return tr(language, 'DOM change', 'Cambio DOM');
  if (kind === 'focus-lost') return tr(language, 'Focus lost', 'Foco perdido');
  if (kind === 'focus-hidden') return tr(language, 'Hidden focus', 'Foco oculto');
  if (kind === 'focus-obscured') return tr(language, 'Obscured focus', 'Foco tapado');
  if (kind === 'dialog-open') return tr(language, 'Dialog opened', 'Diálogo abierto');
  if (kind === 'dialog-close') return tr(language, 'Dialog closed', 'Diálogo cerrado');
  if (kind === 'dialog-focus-escape') return tr(language, 'Modal focus escape', 'Foco fuera del modal');
  if (kind === 'aria-widget') return tr(language, 'Widget state', 'Estado del widget');
  if (kind === 'live-region') return tr(language, 'Live region', 'Región dinámica');
  if (kind === 'status-message') return tr(language, 'Status message', 'Mensaje de estado');
  if (kind === 'context-change') return tr(language, 'Context change', 'Cambio de contexto');
  if (kind === 'focus-walk-start') return tr(language, 'Focus walk started', 'Recorrido de foco iniciado');
  if (kind === 'focus-walk-end') return tr(language, 'Focus walk finished', 'Recorrido de foco finalizado');
  return tr(language, 'Runtime event', 'Evento runtime');
}

export function focusDirectionLabel(direction: FocusJourneyDirection, language: AppLanguage): string {
  if (direction === 'backward') return tr(language, 'Backward', 'Hacia atrás');
  if (direction === 'repeat') return tr(language, 'Repeated component', 'Componente repetido');
  if (direction === 'wrap') return tr(language, 'Restarted at beginning', 'Reinicio desde el principio');
  if (direction === 'jump') return tr(language, 'Forward jump', 'Salto hacia delante');
  if (direction === 'forward') return tr(language, 'Forward', 'Hacia delante');
  return tr(language, 'Journey start', 'Inicio del recorrido');
}

function statusMessageText(detail: string | undefined): string | undefined {
  return detail?.match(/Observed status-like text “(.+?)” after an interaction/)?.[1];
}

function detailToken(detail: string | undefined, key: string): string | undefined {
  if (!detail) return undefined;
  const match = detail.match(new RegExp(`(?:^| · )${key}=([^·]+)`));
  return match?.[1]?.trim();
}

function interactiveContrastDetail(event: RuntimeEvent, language: AppLanguage): string {
  const state = detailToken(event.detail, 'state') ?? tr(language, 'interactive', 'interactivo');
  const subject = detailToken(event.detail, 'subject') ?? tr(language, 'text', 'texto');
  const ratio = detailToken(event.detail, 'ratio') ?? tr(language, 'below the threshold', 'por debajo del umbral');
  const required = detailToken(event.detail, 'required') ?? tr(language, 'the WCAG minimum', 'el mínimo WCAG');
  const selector = event.element?.selector ?? tr(language, 'the observed element', 'el elemento observado');
  const foreground = detailToken(event.detail, 'foreground');
  const background = detailToken(event.detail, 'background');
  const colors = foreground && background
    ? tr(language, ` Foreground ${foreground}; background ${background}.`, ` Color frontal ${foreground}; fondo ${background}.`)
    : '';

  return tr(
    language,
    `While the real ${state} state was rendered on ${selector}, FocusTrace measured ${subject} contrast at ${ratio}; WCAG 1.4.3 requires ${required}.${colors} This remains REVIEW because only the observed interactive state was exercised.`,
    `Mientras el estado real ${state} estaba renderizado en ${selector}, FocusTrace midió el contraste de ${subject} en ${ratio}; WCAG 1.4.3 exige ${required}.${colors} El resultado permanece como REVISIÓN porque solo se ha comprobado el estado interactivo observado.`,
  );
}

function hoverFocusContentDetail(event: RuntimeEvent, language: AppLanguage): string {
  const mode = detailToken(event.detail, 'mode') ?? tr(language, 'hover/focus', 'hover/foco');
  const requirement = detailToken(event.detail, 'requirement') ?? tr(language, 'behavior', 'comportamiento');
  const trigger = event.element?.selector ?? tr(language, 'the observed trigger', 'el activador observado');
  const additional = detailToken(event.detail, 'additional') ?? tr(language, 'the additional content', 'el contenido adicional');
  const evidence = detailToken(event.detail, 'evidence');

  if (requirement === 'hoverable') {
    return tr(
      language,
      `Additional content ${additional}, revealed from ${trigger} by a real ${mode} interaction, disappeared while the trusted pointer moved into or remained within its last observed bounds. Review the Hoverable requirement of WCAG 1.4.13. This stays REVIEW because FocusTrace observes a bounded DOM interaction and does not prove every author-controlled presentation path.`,
      `El contenido adicional ${additional}, mostrado desde ${trigger} mediante una interacción real de ${mode}, desapareció mientras el puntero de confianza se desplazaba hacia su última zona observada o permanecía dentro de ella. Revisa el requisito Hoverable de WCAG 1.4.13. Permanece como REVIEW porque FocusTrace observa una interacción DOM acotada y no demuestra todas las rutas de presentación controladas por el autor.`,
    );
  }

  if (requirement === 'persistent') {
    return tr(
      language,
      `Additional content ${additional}, revealed from ${trigger} by a real ${mode} interaction, disappeared while the observed trigger state remained active and no explicit dismissal attempt was observed. Review the Persistent requirement of WCAG 1.4.13. Whether the information became invalid or another allowed condition applied still requires human review.`,
      `El contenido adicional ${additional}, mostrado desde ${trigger} mediante una interacción real de ${mode}, desapareció mientras el estado observado del activador seguía activo y no se observó un intento explícito de descarte. Revisa el requisito Persistent de WCAG 1.4.13. Determinar si la información dejó de ser válida o si aplicaba otra condición permitida sigue requiriendo revisión humana.`,
    );
  }

  if (requirement === 'dismissible') {
    return tr(
      language,
      `Escape was tested while author-controlled additional content ${additional} from ${trigger} remained visible over other observed content, but the content stayed present. Review the Dismissible requirement of WCAG 1.4.13. Escape is evidence, not a mandated key: another mechanism, the input-error exception, or a non-obscuring presentation can still make the content conforming.`,
      `Se probó Escape mientras el contenido adicional ${additional}, controlado por el autor y mostrado desde ${trigger}, seguía visible sobre otro contenido observado, pero no desapareció. Revisa el requisito Dismissible de WCAG 1.4.13. Escape aporta evidencia, pero no es una tecla obligatoria: otro mecanismo, la excepción por error de entrada o una presentación que no tape contenido todavía pueden hacer que el comportamiento sea conforme.`,
    );
  }

  return tr(
    language,
    `FocusTrace observed additional hover/focus content related to ${trigger}${evidence ? `: ${evidence}` : ''}. Review WCAG 1.4.13 manually.`,
    `FocusTrace observó contenido adicional de hover/foco relacionado con ${trigger}${evidence ? `: ${evidence}` : ''}. Revisa WCAG 1.4.13 manualmente.`,
  );
}

function contextChangeDetail(event: RuntimeEvent, language: AppLanguage): string | undefined {
  const evidence = event.contextChange;
  if (!evidence) return undefined;

  const source = event.element?.selector ?? tr(language, 'the observed control', 'el control observado');
  const destination = evidence.destination?.selector;
  const criterion = evidence.triggerKind === 'focus' ? 'WCAG 3.2.1' : 'WCAG 3.2.2';

  let change: string;
  if (evidence.changeKind === 'route') {
    change = event.fromUrl && event.toUrl
      ? tr(
          language,
          `a route change from ${event.fromUrl} to ${event.toUrl}`,
          `un cambio de ruta de ${event.fromUrl} a ${event.toUrl}`,
        )
      : tr(language, 'a route change', 'un cambio de ruta');
  } else if (evidence.changeKind === 'dialog-open') {
    change = destination
      ? tr(language, `the dialog ${destination} opening`, `la apertura del diálogo ${destination}`)
      : tr(language, 'a dialog opening', 'la apertura de un diálogo');
  } else {
    change = destination
      ? tr(language, `focus moving programmatically to ${destination}`, `el movimiento programático del foco a ${destination}`)
      : tr(language, 'a programmatic focus move', 'un movimiento programático del foco');
  }

  if (evidence.triggerKind === 'focus') {
    return tr(
      language,
      `Receiving focus on ${source} was followed by ${change} without a separate observed activation. Review this sequence under ${criterion}; runtime ordering is strong evidence but does not by itself prove which author handler initiated the context change.`,
      `Recibir el foco en ${source} fue seguido por ${change} sin observarse una activación independiente. Revisa esta secuencia según ${criterion}; el orden runtime aporta evidencia sólida, pero por sí solo no demuestra qué manejador inició el cambio de contexto.`,
    );
  }

  const eventType = evidence.inputEventType ?? event.inputEventType ?? 'input';
  return tr(
    language,
    `A trusted ${eventType} event on ${source} was followed by ${change}. Review this sequence under ${criterion}; an automatic context change can be allowed when the user was advised before the control is used, which this runtime evidence cannot always establish.`,
    `Un evento ${eventType} de confianza en ${source} fue seguido por ${change}. Revisa esta secuencia según ${criterion}; un cambio automático de contexto puede estar permitido si el usuario fue advertido antes de utilizar el control, algo que esta evidencia runtime no siempre puede determinar.`,
  );
}

export function humanRuntimeEventDetail(event: RuntimeEvent, language: AppLanguage): string | undefined {
  if (event.ruleId === 'FT-RUNTIME-010') {
    const selector = event.element?.selector ?? tr(language, 'the focused element', 'el elemento con foco');
    return tr(
      language,
      `After a real Tab transition to ${selector}, FocusTrace found no stable pixel-color change in the bounded local comparison region across paired before-focus and focused captures. Review the focus indicator manually: this remains REVIEW, not FAIL, because ACT oj04fd allows the visible indication to appear elsewhere in the viewport and dynamic or unavailable capture evidence is deliberately ignored.`,
      `Tras una transición real con Tab hacia ${selector}, FocusTrace no encontró ningún cambio estable de color de píxel en la región local acotada al comparar pares de capturas antes y después del foco. Revisa manualmente el indicador de foco: el resultado permanece como REVIEW, no FAIL, porque ACT oj04fd permite que la indicación visible aparezca en otra zona del viewport y la evidencia dinámica o no disponible se descarta deliberadamente.`,
    );
  }

  if (event.kind === 'contrast-state') return interactiveContrastDetail(event, language);
  if (event.kind === 'hover-focus-content') return hoverFocusContentDetail(event, language);

  if (event.kind === 'virtual-focus') {
    const target = event.element?.name?.trim() || event.element?.role || event.element?.tag;
    return target
      ? tr(
          language,
          `aria-activedescendant moved the widget's virtual focus to “${target}” while DOM focus remained on the composite widget.`,
          `aria-activedescendant movió el foco virtual del widget a “${target}” mientras el foco DOM permanecía en el widget compuesto.`,
        )
      : tr(
          language,
          'aria-activedescendant moved the widget virtual focus while DOM focus remained on the composite widget.',
          'aria-activedescendant movió el foco virtual del widget mientras el foco DOM permanecía en el widget compuesto.',
        );
  }

  if (event.kind === 'live-region') {
    // Live-region content belongs to the inspected page, not to FocusTrace. Preserve it verbatim.
    return event.detail;
  }

  if (event.kind === 'status-message') {
    // The observed page message is evidence from the inspected page. Preserve it verbatim while localizing FocusTrace copy around it.
    const message = statusMessageText(event.detail);
    return tr(
      language,
      `FocusTrace observed${message ? ` “${message}”` : ' a short status-like message'} after this action, but did not find live-region/status semantics or an aria-errormessage relationship. Review whether this content is a WCAG 4.1.3 status message that needs programmatic exposure without moving focus.`,
      `FocusTrace observó${message ? ` “${message}”` : ' un mensaje breve con apariencia de estado'} tras esta acción, pero no encontró semántica de región dinámica/estado ni una relación aria-errormessage. Revisa si este contenido es un mensaje de estado de WCAG 4.1.3 que necesita exposición programática sin mover el foco.`,
    );
  }

  if (event.kind === 'input-change') {
    const selector = event.element?.selector;
    const eventType = event.inputEventType ?? 'input';
    return tr(
      language,
      `A trusted ${eventType} event changed${selector ? ` ${selector}` : ' this control'}. FocusTrace records the control identity and event type, not its value.`,
      `Un evento ${eventType} de confianza cambió${selector ? ` ${selector}` : ' este control'}. FocusTrace registra la identidad del control y el tipo de evento, pero no guarda su valor.`,
    );
  }

  if (event.kind === 'context-change') return contextChangeDetail(event, language);

  if (event.kind === 'dragging') {
    const selector = event.element?.selector;
    return tr(
      language,
      `A dragging interaction${selector ? ` was observed on ${selector}` : ' was observed'}. Review whether the same functionality is available with a single pointer without dragging.`,
      `Se observó una interacción de arrastre${selector ? ` en ${selector}` : ''}. Revisa si la misma funcionalidad está disponible con un puntero sencillo sin necesidad de arrastrar.`,
    );
  }

  if (event.kind === 'focus-walk-start') {
    const total = event.focusWalk?.totalCandidates ?? 0;
    return tr(
      language,
      `FocusTrace will move through ${total} keyboard-focusable candidate${total === 1 ? '' : 's'} in computed tab order.`,
      `FocusTrace recorrerá ${total} elemento${total === 1 ? '' : 's'} enfocable${total === 1 ? '' : 's'} por teclado siguiendo el orden de tabulación calculado.`,
    );
  }

  if (event.kind === 'focus-walk-end') {
    const focused = event.focusWalk?.focusedSteps ?? 0;
    const total = event.focusWalk?.totalCandidates ?? 0;
    const skipped = event.focusWalk?.skipped ?? 0;
    const stopped = event.focusWalk?.stopped ?? false;
    return tr(
      language,
      `${stopped ? 'The automatic journey stopped early. ' : ''}Focused ${focused}/${total} candidate${total === 1 ? '' : 's'}; skipped ${skipped}.`,
      `${stopped ? 'El recorrido automático se detuvo antes de terminar. ' : ''}Se enfocaron ${focused}/${total} elemento${total === 1 ? '' : 's'}; se omitieron ${skipped}.`,
    );
  }

  if (event.kind === 'dom-mutation' && event.mutation) {
    const selector = event.mutation.target.selector;
    if (event.mutation.kind === 'node-added') {
      return tr(language, `A relevant node was added at ${selector}.`, `Se añadió un nodo relevante en ${selector}.`);
    }
    if (event.mutation.kind === 'node-removed') {
      return tr(language, `A relevant node was removed from ${selector}.`, `Se eliminó un nodo relevante de ${selector}.`);
    }
    const attribute = event.mutation.attribute || tr(language, 'an attribute', 'un atributo');
    return tr(
      language,
      `${attribute} changed on ${selector}.`,
      `El atributo ${attribute} cambió en ${selector}.`,
    );
  }

  if (event.kind === 'focus-lost') {
    const selector = event.element?.selector;
    return selector
      ? tr(
          language,
          `The focused element ${selector} was removed and focus moved to another location. Review whether the new focus position remains meaningful.`,
          `El elemento con foco ${selector} se eliminó y el foco pasó a otra ubicación. Revisa si la nueva posición de foco sigue siendo significativa.`,
        )
      : tr(
          language,
          'The focused element was removed and focus moved to another location. Review whether the new focus position remains meaningful.',
          'El elemento con foco se eliminó y el foco pasó a otra ubicación. Revisa si la nueva posición de foco sigue siendo significativa.',
        );
  }

  if (event.kind === 'focus-hidden') {
    const selector = event.element?.selector;
    return selector
      ? tr(language, `Focus remained on ${selector} while it became hidden.`, `El foco permaneció en ${selector} mientras el elemento pasaba a estar oculto.`)
      : tr(language, 'The focused element became hidden while it still held focus.', 'El elemento con foco pasó a estar oculto mientras seguía manteniendo el foco.');
  }

  if (event.kind === 'focus-obscured') {
    return tr(
      language,
      'The focused control may be completely covered by other page content. Review its visible focus indication and operability.',
      'El control con foco puede estar completamente cubierto por otro contenido de la página. Revisa la visibilidad del foco y su operabilidad.',
    );
  }

  if (event.kind === 'route' && event.outcome) {
    if (event.ruleId === 'FT-RUNTIME-003') {
      return tr(
        language,
        `The page route changed${event.fromUrl && event.toUrl ? ` from ${event.fromUrl} to ${event.toUrl}` : ''}, but the document title did not update. Review whether the new view needs its own descriptive title.`,
        `La ruta de la página cambió${event.fromUrl && event.toUrl ? ` de ${event.fromUrl} a ${event.toUrl}` : ''}, pero el título del documento no se actualizó. Revisa si la nueva vista necesita un título descriptivo propio.`,
      );
    }
    return tr(
      language,
      `The page route changed${event.fromUrl && event.toUrl ? ` from ${event.fromUrl} to ${event.toUrl}` : ''}, but no focus transition to the new view was observed.`,
      `La ruta de la página cambió${event.fromUrl && event.toUrl ? ` de ${event.fromUrl} a ${event.toUrl}` : ''}, pero no se observó una transición de foco hacia la nueva vista.`,
    );
  }

  if (event.kind === 'dialog-open' && event.outcome) {
    return tr(
      language,
      'The dialog opened without moving keyboard focus inside it. Review initial focus management against the dialog pattern.',
      'El diálogo se abrió sin mover el foco de teclado a su interior. Revisa la gestión del foco inicial según el patrón de diálogo.',
    );
  }

  if (event.kind === 'dialog-close' && event.outcome) {
    return tr(
      language,
      'The dialog closed without restoring focus to an expected destination. Review the workflow and focus return behavior.',
      'El diálogo se cerró sin restaurar el foco a un destino esperado. Revisa el flujo y el comportamiento de retorno del foco.',
    );
  }

  if (event.kind === 'dialog-focus-escape') {
    const selector = event.element?.selector;
    return selector
      ? tr(language, `Focus moved to ${selector} while the modal remained open.`, `El foco se movió a ${selector} mientras el modal seguía abierto.`)
      : tr(language, 'Focus moved outside the modal while it remained open.', 'El foco se movió fuera del modal mientras este seguía abierto.');
  }

  return undefined;
}