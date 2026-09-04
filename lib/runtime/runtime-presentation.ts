import { actionableRemediationText } from '../report/actionable-remediation';
import { tr, type AppLanguage } from '../../shared/i18n';
import type { RuntimeEvent, RuntimeEventKind } from '../../shared/types';
import type { FocusJourneyDirection } from './focus-journey';

export function runtimeEventKindLabel(kind: RuntimeEventKind, language: AppLanguage): string {
  if (kind === 'focus') return tr(language, 'Focus', 'Foco');
  if (kind === 'virtual-focus') return tr(language, 'Virtual focus', 'Foco virtual');
  if (kind === 'keydown') return tr(language, 'Keyboard', 'Teclado');
  if (kind === 'click') return tr(language, 'Activation', 'Activación');
  if (kind === 'dragging') return tr(language, 'Dragging', 'Arrastre');
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
  if (kind === 'focus-walk-start') return tr(language, 'Focus walk started', 'Recorrido de foco iniciado');
  return tr(language, 'Focus walk finished', 'Recorrido de foco finalizado');
}

export function focusDirectionLabel(direction: FocusJourneyDirection, language: AppLanguage): string {
  if (direction === 'backward') return tr(language, 'Backward', 'Hacia atrás');
  if (direction === 'repeat') return tr(language, 'Repeated component', 'Componente repetido');
  if (direction === 'wrap') return tr(language, 'Restarted at beginning', 'Reinicio desde el principio');
  if (direction === 'jump') return tr(language, 'Forward jump', 'Salto hacia delante');
  if (direction === 'forward') return tr(language, 'Forward', 'Hacia delante');
  return tr(language, 'Journey start', 'Inicio del recorrido');
}

function runtimeDetailWithRemediation(
  event: RuntimeEvent,
  language: AppLanguage,
  detail: string,
): string {
  const remediation = actionableRemediationText(event.ruleId, language);
  if (!remediation) return detail;
  return `${detail} ${tr(language, 'How to fix:', 'Cómo corregirlo:')} ${remediation}`;
}

export function humanRuntimeEventDetail(event: RuntimeEvent, language: AppLanguage): string | undefined {
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

  if (event.kind === 'dragging') {
    const selector = event.element?.selector;
    const detail = tr(
      language,
      `A dragging interaction${selector ? ` was observed on ${selector}` : ' was observed'}. Review whether the same functionality is available with a single pointer without dragging.`,
      `Se observó una interacción de arrastre${selector ? ` en ${selector}` : ''}. Revisa si la misma funcionalidad está disponible con un puntero sencillo sin necesidad de arrastrar.`,
    );
    return runtimeDetailWithRemediation(event, language, detail);
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
    const detail = tr(
      language,
      'The focused control may be completely covered by other page content. Review its visible focus indication and operability.',
      'El control con foco puede estar completamente cubierto por otro contenido de la página. Revisa la visibilidad del foco y su operabilidad.',
    );
    return runtimeDetailWithRemediation(event, language, detail);
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
