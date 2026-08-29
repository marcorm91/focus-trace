import { tr, type AppLanguage } from '../../shared/i18n';
import type { FindingOutcome, RuntimeCauseType, RuntimeEvent, RuntimeInteraction } from '../../shared/types';

export type ExplanationLevel = 'simple' | 'accessibility' | 'developer';

export interface RuntimeCauseExplanation {
  title: string;
  summary: string;
  impact: string;
  recommendation: string;
  accessibility: string;
}

type LocalizedCauseExplanation = Record<AppLanguage, RuntimeCauseExplanation>;

const CAUSE_EXPLANATIONS: Record<RuntimeCauseType, LocalizedCauseExplanation> = {
  FOCUSED_NODE_REMOVED: {
    en: {
      title: 'Focus was lost after an element disappeared',
      summary: 'The control that had keyboard focus was removed during the interaction.',
      impact: 'Keyboard and screen reader users may lose their place and may not know where to continue.',
      recommendation: 'Move focus to the next logical control or to the newly displayed content after the update.',
      accessibility: 'Review focus order and focus management after dynamic content changes. WCAG 2.4.3 may be relevant.',
    },
    es: {
      title: 'El foco se perdió después de desaparecer un elemento',
      summary: 'El control que tenía el foco de teclado se eliminó durante la interacción.',
      impact: 'Las personas que navegan con teclado o lector de pantalla pueden perder su posición y no saber dónde continuar.',
      recommendation: 'Mueve el foco al siguiente control lógico o al nuevo contenido mostrado después de la actualización.',
      accessibility: 'Revisa el orden y la gestión del foco después de cambios de contenido dinámico. Puede ser relevante WCAG 2.4.3.',
    },
  },
  FOCUS_FELL_BACK_TO_BODY: {
    en: {
      title: 'Focus fell back to the page instead of a useful control',
      summary: 'After the interface changed, browser focus ended on the document body.',
      impact: 'Keyboard users can lose their current position and may need to restart navigation from an unexpected place.',
      recommendation: 'Choose a meaningful focus destination after the interaction completes.',
      accessibility: 'Review whether the resulting focus order preserves meaning and operability under WCAG 2.4.3.',
    },
    es: {
      title: 'El foco volvió a la página en lugar de a un control útil',
      summary: 'Después de cambiar la interfaz, el foco del navegador terminó en el body del documento.',
      impact: 'Las personas que usan teclado pueden perder su posición y tener que reiniciar la navegación desde un lugar inesperado.',
      recommendation: 'Define un destino de foco significativo cuando termine la interacción.',
      accessibility: 'Revisa si el orden de foco resultante conserva el significado y la operabilidad según WCAG 2.4.3.',
    },
  },
  DIALOG_OPENED_WITHOUT_FOCUS: {
    en: {
      title: 'The dialog opened but focus stayed outside it',
      summary: 'A dialog became available without moving keyboard focus into the dialog.',
      impact: 'Keyboard and screen reader users may continue interacting with content behind the dialog or miss the dialog entirely.',
      recommendation: 'When a modal dialog opens, place focus on an appropriate control or meaningful element inside it.',
      accessibility: 'The WAI-ARIA APG modal dialog pattern expects focus to move inside the dialog when it opens.',
    },
    es: {
      title: 'El diálogo se abrió pero el foco permaneció fuera',
      summary: 'Se mostró un diálogo sin mover el foco de teclado a su interior.',
      impact: 'Las personas que usan teclado o lector de pantalla pueden seguir interactuando con el contenido de fondo o no detectar el diálogo.',
      recommendation: 'Cuando se abra un diálogo modal, coloca el foco en un control o elemento significativo dentro de él.',
      accessibility: 'El patrón de diálogo modal de WAI-ARIA APG espera que el foco se mueva al interior del diálogo al abrirse.',
    },
  },
  MODAL_FOCUS_ESCAPE: {
    en: {
      title: 'Focus moved outside the open modal',
      summary: 'Keyboard focus left a modal dialog while the dialog remained open.',
      impact: 'Users can reach background content that should be unavailable while the modal is active.',
      recommendation: 'Keep keyboard focus within the modal until it closes, while preserving a logical tab order inside it.',
      accessibility: 'Review the modal focus loop against the WAI-ARIA APG modal dialog pattern.',
    },
    es: {
      title: 'El foco salió del modal abierto',
      summary: 'El foco de teclado salió de un diálogo modal mientras este seguía abierto.',
      impact: 'Las personas usuarias pueden alcanzar contenido de fondo que debería permanecer no disponible mientras el modal está activo.',
      recommendation: 'Mantén el foco de teclado dentro del modal hasta que se cierre y conserva un orden de tabulación lógico en su interior.',
      accessibility: 'Revisa el ciclo de foco del modal según el patrón de diálogo modal de WAI-ARIA APG.',
    },
  },
  ROUTE_CHANGED_WITHOUT_FOCUS_MOVE: {
    en: {
      title: 'The view changed but keyboard focus did not',
      summary: 'The SPA route changed without an observed focus transition to the new view.',
      impact: 'Keyboard and screen reader users may remain at a location that no longer represents what is on screen.',
      recommendation: 'When the navigation changes context, move focus to a meaningful location in the new view when appropriate.',
      accessibility: 'This is workflow-dependent. Review focus order and context after client-side navigation under WCAG 2.4.3.',
    },
    es: {
      title: 'La vista cambió pero el foco de teclado no',
      summary: 'La ruta SPA cambió sin observarse una transición de foco hacia la nueva vista.',
      impact: 'Las personas que usan teclado o lector de pantalla pueden quedarse en una posición que ya no representa lo que aparece en pantalla.',
      recommendation: 'Cuando la navegación cambie de contexto, mueve el foco a una ubicación significativa de la nueva vista cuando corresponda.',
      accessibility: 'Depende del flujo. Revisa el orden y el contexto del foco tras la navegación del lado cliente según WCAG 2.4.3.',
    },
  },
  FOCUSED_ELEMENT_BECAME_HIDDEN: {
    en: {
      title: 'The element with focus became hidden',
      summary: 'The focused element, or one of its ancestors, became hidden while focus was still associated with it.',
      impact: 'Keyboard users may be focused on something they cannot see or operate reliably, and assistive technology may lose the expected context.',
      recommendation: 'Move focus before hiding the focused content, or keep the focused target available until focus has moved safely.',
      accessibility: 'Review focus order and programmatic visibility. WCAG 2.4.3 and 4.1.2 may be relevant depending on the pattern.',
    },
    es: {
      title: 'El elemento con foco pasó a estar oculto',
      summary: 'El elemento con foco, o uno de sus ancestros, pasó a estar oculto mientras el foco seguía asociado a él.',
      impact: 'Las personas que navegan con teclado pueden tener el foco en algo que no pueden ver u operar de forma fiable, y la tecnología de asistencia puede perder el contexto esperado.',
      recommendation: 'Mueve el foco antes de ocultar el contenido enfocado o mantén el destino disponible hasta que el foco se haya movido de forma segura.',
      accessibility: 'Revisa el orden de foco y la visibilidad programática. WCAG 2.4.3 y 4.1.2 pueden ser relevantes según el patrón.',
    },
  },
};

export function explanationForCause(
  type: RuntimeCauseType,
  language: AppLanguage = 'en',
): RuntimeCauseExplanation {
  return CAUSE_EXPLANATIONS[type][language];
}

function quotedTarget(event: RuntimeEvent): string | undefined {
  const target = event.element?.name?.trim() || event.element?.role || event.element?.tag;
  return target ? `“${target}”` : undefined;
}

function ariaWidgetEventTitle(event: RuntimeEvent, language: AppLanguage): string {
  switch (event.ruleId) {
    case 'FT-RUNTIME-ARIA-001':
      return tr(language, 'Expanded state does not match controlled content', 'El estado expandido no coincide con el contenido controlado');
    case 'FT-RUNTIME-ARIA-002':
      return tr(language, 'Selected tab controls a hidden tab panel', 'La pestaña seleccionada controla un panel oculto');
    case 'FT-RUNTIME-ARIA-003':
      return tr(language, 'Combobox popup relationship is invalid', 'La relación con el popup del combobox no es válida');
    case 'FT-RUNTIME-ARIA-004':
      return tr(language, 'Combobox popup role does not match aria-haspopup', 'El rol del popup del combobox no coincide con aria-haspopup');
    case 'FT-RUNTIME-ARIA-005':
      return tr(language, 'aria-activedescendant does not identify a valid active item', 'aria-activedescendant no identifica un elemento activo válido');
    case 'FT-APG-004':
      return tr(language, 'Activated tab did not become selected', 'La pestaña activada no pasó a estar seleccionada');
    case 'FT-APG-005':
      return tr(language, 'Menu opened without moving focus inside', 'El menú se abrió sin mover el foco a su interior');
    case 'FT-APG-006':
      return tr(language, 'Review Escape behavior for the open menu', 'Revisa el comportamiento de Escape en el menú abierto');
    case 'FT-APG-007':
      return tr(language, 'Opened dialog has no accessible name', 'El diálogo abierto no tiene nombre accesible');
    case 'FT-APG-008':
      return tr(language, 'Active descendant is programmatically hidden', 'El descendiente activo está oculto programáticamente');
    case 'FT-APG-009':
      return tr(language, 'Escape did not dismiss the combobox popup', 'Escape no cerró el popup del combobox');
    case 'FT-APG-010':
      return tr(language, 'Single-select listbox exposes multiple selected options', 'El listbox de selección única expone varias opciones seleccionadas');
    default:
      return event.title;
  }
}

export function humanRuntimeEventTitle(event: RuntimeEvent, language: AppLanguage = 'en'): string {
  const target = quotedTarget(event);

  switch (event.kind) {
    case 'focus':
      return target ? tr(language, `Focus moved to ${target}`, `El foco se movió a ${target}`) : tr(language, 'Focus moved', 'El foco se movió');
    case 'focus-walk-start':
      return tr(language, 'Automatic focus simulation started', 'Ha empezado la simulación automática de foco');
    case 'focus-walk-end':
      return tr(language, 'Automatic focus simulation finished', 'Ha terminado la simulación automática de foco');
    case 'keydown': {
      const key = event.title.replace(/^Key:\s*/, '');
      return target
        ? tr(language, `Pressed ${key} on ${target}`, `Se pulsó ${key} sobre ${target}`)
        : tr(language, `Pressed ${key}`, `Se pulsó ${key}`);
    }
    case 'click':
      return target ? tr(language, `Activated ${target}`, `Se activó ${target}`) : tr(language, 'Activated a control', 'Se activó un control');
    case 'route':
      return event.causes?.some((cause) => cause.type === 'ROUTE_CHANGED_WITHOUT_FOCUS_MOVE')
        ? tr(language, 'The view changed but keyboard focus did not', 'La vista cambió pero el foco de teclado no')
        : tr(language, 'The page view changed', 'La vista de la página cambió');
    case 'dom-mutation':
      return tr(language, 'Page content changed', 'El contenido de la página cambió');
    case 'focus-lost':
      return tr(language, 'Keyboard focus was lost', 'Se perdió el foco de teclado');
    case 'focus-hidden':
      return tr(language, 'The focused element became hidden', 'El elemento con foco pasó a estar oculto');
    case 'focus-obscured':
      return tr(language, 'The focused control may be covered by other content', 'El control con foco puede estar cubierto por otro contenido');
    case 'dialog-open':
      return event.outcome
        ? tr(language, 'A dialog opened without receiving focus', 'Se abrió un diálogo sin recibir el foco')
        : tr(language, 'A dialog opened', 'Se abrió un diálogo');
    case 'dialog-close':
      return event.outcome
        ? tr(language, 'Focus may not have returned after the dialog closed', 'Es posible que el foco no se haya restaurado al cerrar el diálogo')
        : tr(language, 'The dialog closed', 'El diálogo se cerró');
    case 'dialog-focus-escape':
      return tr(language, 'Focus moved outside the open modal', 'El foco se movió fuera del modal abierto');
    case 'aria-widget':
      return ariaWidgetEventTitle(event, language);
    case 'live-region':
      return tr(language, 'A screen reader announcement region updated', 'Se actualizó una región de anuncios para lectores de pantalla');
    default:
      return event.title;
  }
}

export function humanInteractionTitle(interaction: RuntimeInteraction, language: AppLanguage = 'en'): string {
  const trigger = interaction.trigger;
  if (!trigger) {
    const cause = interaction.causes[0];
    return cause ? explanationForCause(cause.type, language).title : humanRuntimeEventTitle(interaction.events[0]!, language);
  }

  const target = trigger.element?.name?.trim() || trigger.element?.role || trigger.element?.tag;
  const quoted = target ? `“${target}”` : tr(language, 'a control', 'un control');

  if (trigger.kind === 'click') return tr(language, `Activated ${quoted}`, `Se activó ${quoted}`);
  if (trigger.kind === 'keydown') {
    const key = trigger.title.replace(/^Key:\s*/, '');
    if (key === 'Enter' || key === 'Space') {
      return tr(language, `Activated ${quoted} with the keyboard`, `Se activó ${quoted} con el teclado`);
    }
    if (key === 'Tab') return tr(language, `Pressed Tab on ${quoted}`, `Se pulsó Tab sobre ${quoted}`);
    return tr(language, `Pressed ${key} on ${quoted}`, `Se pulsó ${key} sobre ${quoted}`);
  }

  return humanRuntimeEventTitle(trigger, language);
}

export function outcomeLabel(
  outcome: FindingOutcome,
  level: ExplanationLevel,
  language: AppLanguage = 'en',
): string {
  if (level !== 'simple') {
    if (outcome === 'fail') return tr(language, 'fail', 'fallo');
    if (outcome === 'review') return tr(language, 'review', 'revisión');
    return tr(language, 'warning', 'aviso');
  }
  if (outcome === 'fail') return tr(language, 'issue', 'problema');
  if (outcome === 'review') return tr(language, 'needs review', 'requiere revisión');
  return tr(language, 'warning', 'aviso');
}

export function explanationLevelDescription(
  level: ExplanationLevel,
  language: AppLanguage = 'en',
): string {
  if (level === 'simple') {
    return tr(language, 'Plain-language impact and next steps. Technical identifiers stay hidden.', 'Impacto y siguientes pasos en lenguaje claro. Los identificadores técnicos permanecen ocultos.');
  }
  if (level === 'accessibility') {
    return tr(language, 'Adds standards references, outcomes and audit evidence.', 'Añade referencias normativas, resultados y evidencia de auditoría.');
  }
  return tr(language, 'Shows selectors, event details, mutations, routes and internal cause identifiers.', 'Muestra selectores, detalles de eventos, mutaciones, rutas e identificadores internos de causa.');
}
