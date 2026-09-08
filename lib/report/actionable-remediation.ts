import { tr, type AppLanguage } from '../../shared/i18n';

export interface ActionableRemediation {
  options: string[];
  validation: string;
}

export function actionableRemediationForRule(
  ruleId: string | undefined,
  language: AppLanguage,
): ActionableRemediation | undefined {
  if (ruleId === 'FT-RUNTIME-002') {
    return {
      options: [
        tr(
          language,
          'Reserve scrolling clearance for fixed or sticky interface regions. Use scroll-padding on the scrolling container or scroll-margin on focus targets when that matches the layout.',
          'Reserva espacio de desplazamiento para regiones fijas o sticky. Usa scroll-padding en el contenedor de desplazamiento o scroll-margin en los destinos de foco cuando encaje con el layout.',
        ),
        tr(
          language,
          'Reposition, resize or close overlays, banners, drawers or other floating content when they can completely cover the focused control.',
          'Recoloca, reduce o cierra overlays, banners, drawers u otro contenido flotante cuando pueda cubrir por completo el control con foco.',
        ),
        tr(
          language,
          'When the interface changes dynamically, keep the current control visible or move focus to a visible and meaningful destination. For modals and drawers, manage focus inside the active component.',
          'Cuando la interfaz cambie dinámicamente, mantén visible el control actual o mueve el foco a un destino visible y significativo. En modales y drawers, gestiona el foco dentro del componente activo.',
        ),
      ],
      validation: tr(
        language,
        'Repeat the keyboard journey and exercise scroll, resize and dynamic overlay states. Confirm that the focused component never becomes completely hidden by authored content.',
        'Repite el recorrido con teclado y prueba scroll, cambios de tamaño y overlays dinámicos. Confirma que el componente con foco nunca queda completamente oculto por contenido de la interfaz.',
      ),
    };
  }

  if (ruleId === 'FT-RUNTIME-006') {
    return {
      options: [
        tr(
          language,
          'Provide a single-pointer alternative that performs the same function without dragging, such as Move up/Move down controls, selecting a destination and confirming it, or another click/tap operation appropriate to the task.',
          'Ofrece una alternativa de puntero sencillo que realice la misma función sin arrastrar, como controles Subir/Bajar, seleccionar un destino y confirmarlo u otra operación de clic/toque adecuada para la tarea.',
        ),
        tr(
          language,
          'Make the alternative available to mouse, touch and other pointer input and ensure it produces the same functional result as the drag interaction.',
          'Haz que la alternativa esté disponible para ratón, táctil y otros dispositivos de puntero, y asegúrate de que produzca el mismo resultado funcional que el arrastre.',
        ),
        tr(
          language,
          'If dragging is genuinely essential to the functionality, verify and document that exception instead of adding an artificial alternative that does not provide the same result.',
          'Si el arrastre es realmente esencial para la funcionalidad, verifica y documenta esa excepción en lugar de añadir una alternativa artificial que no proporcione el mismo resultado.',
        ),
      ],
      validation: tr(
        language,
        'Complete the same task with a single pointer without using a dragging movement and confirm that the result is equivalent.',
        'Completa la misma tarea con un puntero sencillo sin realizar un movimiento de arrastre y confirma que el resultado es equivalente.',
      ),
    };
  }

  if (ruleId === 'FT-RUNTIME-007') {
    return {
      options: [
        tr(
          language,
          'Expose the existing message with semantics that match its purpose. Use role="status" for ordinary results or success feedback, role="alert" or an appropriate live region for time-sensitive errors, and log/progress semantics when those patterns genuinely apply.',
          'Expón el mensaje existente con una semántica acorde a su propósito. Usa role="status" para resultados o confirmaciones normales, role="alert" o una región dinámica apropiada para errores urgentes, y semántica de log/progreso cuando esos patrones se apliquen realmente.',
        ),
        tr(
          language,
          'Keep focus where the workflow expects it. Do not fix every toast or status message by moving focus to it; WCAG 4.1.3 is specifically about making the message programmatically available without receiving focus.',
          'Mantén el foco donde corresponda dentro del flujo. No corrijas cada toast o mensaje de estado moviendo el foco hasta él; WCAG 4.1.3 busca precisamente que el mensaje esté disponible programáticamente sin recibir el foco.',
        ),
        tr(
          language,
          'Make the announcement concise and avoid unnecessary assertive live regions. When a live region is used, ensure the region exists before the status text changes so assistive technology can observe the update reliably.',
          'Haz que el anuncio sea conciso y evita regiones dinámicas assertive innecesarias. Cuando uses una región dinámica, asegúrate de que exista antes de cambiar el texto del estado para que las tecnologías de asistencia puedan observar la actualización de forma fiable.',
        ),
      ],
      validation: tr(
        language,
        'Repeat the same Trace interaction and verify with accessibility inspection and, when practical, a screen reader that the status can be presented without moving focus and without duplicate or unnecessary announcements.',
        'Repite la misma interacción en Trace y verifica con inspección de accesibilidad y, cuando sea práctico, con un lector de pantalla que el estado pueda presentarse sin mover el foco y sin anuncios duplicados o innecesarios.',
      ),
    };
  }

  if (ruleId === 'FT-RUNTIME-008') {
    return {
      options: [
        tr(
          language,
          'Do not initiate navigation, open a dialog or move focus to another component merely because this component receives focus. Require an explicit user activation for the context change.',
          'No inicies una navegación, abras un diálogo ni muevas el foco a otro componente únicamente porque este componente recibe el foco. Exige una activación explícita del usuario para el cambio de contexto.',
        ),
        tr(
          language,
          'Move behavior that changes context out of focus/focusin handlers and into an explicit action such as activating a button or link, while keeping ordinary focus styling and disclosure behavior non-disruptive.',
          'Saca de los manejadores focus/focusin el comportamiento que cambia el contexto y llévalo a una acción explícita, como activar un botón o enlace, manteniendo el estilo de foco y los cambios no disruptivos separados.',
        ),
      ],
      validation: tr(
        language,
        'Reach the component with keyboard and pointer focus without activating it. Confirm that receiving focus alone does not navigate, open a dialog or move focus elsewhere; then verify that the explicit user activation performs the intended change.',
        'Llega al componente mediante foco de teclado y de puntero sin activarlo. Confirma que recibir el foco por sí solo no navega, abre un diálogo ni mueve el foco a otro lugar; después verifica que la activación explícita realiza el cambio previsto.',
      ),
    };
  }

  if (ruleId === 'FT-RUNTIME-009') {
    return {
      options: [
        tr(
          language,
          'Avoid changing context automatically when a user changes a control setting. Prefer an explicit submit, apply or continue action when the change would navigate, open a dialog or move focus to a new context.',
          'Evita cambiar el contexto automáticamente cuando el usuario modifica el valor o estado de un control. Prefiere una acción explícita de enviar, aplicar o continuar cuando el cambio vaya a navegar, abrir un diálogo o mover el foco a un contexto nuevo.',
        ),
        tr(
          language,
          'If the automatic context change is genuinely required, provide clear instructions before the control is used so the user knows what will happen when its setting changes.',
          'Si el cambio automático de contexto es realmente necesario, proporciona instrucciones claras antes de utilizar el control para que el usuario sepa qué ocurrirá cuando cambie su valor o estado.',
        ),
      ],
      validation: tr(
        language,
        'Change the control using keyboard and pointer input. Confirm that the setting can change without an unexpected context change, or that the required context change was clearly described before the control is used.',
        'Cambia el control con teclado y puntero. Confirma que su valor o estado puede cambiar sin provocar un cambio de contexto inesperado, o que el cambio de contexto necesario se describió claramente antes de utilizar el control.',
      ),
    };
  }

  if (ruleId === 'FT-REVIEW-011') {
    return {
      options: [
        tr(
          language,
          'Keep the same applicable help mechanisms in the same relative order across pages that belong to the same set or process.',
          'Mantén los mismos mecanismos de ayuda aplicables en el mismo orden relativo en las páginas que pertenezcan al mismo conjunto o proceso.',
        ),
        tr(
          language,
          'Centralize repeated help UI in a shared component, layout or template when possible so page variants do not silently reorder it.',
          'Centraliza la interfaz de ayuda repetida en un componente, layout o plantilla compartida cuando sea posible para evitar que las variantes de página cambien su orden sin querer.',
        ),
        tr(
          language,
          'If a page needs a contextual variation, confirm that the changed mechanism or position is outside the scope of WCAG 3.2.6 before intentionally changing the relative order.',
          'Si una página necesita una variación contextual, confirma que el mecanismo o posición modificados quedan fuera del alcance de WCAG 3.2.6 antes de cambiar intencionadamente el orden relativo.',
        ),
      ],
      validation: tr(
        language,
        'Run Site Audit again on the same page set and manually confirm that the applicable help mechanisms keep a consistent relative order.',
        'Vuelve a ejecutar Site Audit sobre el mismo conjunto de páginas y confirma manualmente que los mecanismos de ayuda aplicables conservan un orden relativo coherente.',
      ),
    };
  }

  if (ruleId === 'FT-REVIEW-013') {
    return {
      options: [
        tr(
          language,
          'Keep the same repeated navigation destinations in the same relative order across pages in the same set unless the user deliberately changes that order.',
          'Mantén los mismos destinos de navegación repetidos en el mismo orden relativo entre las páginas del mismo conjunto, salvo que el usuario cambie ese orden de forma deliberada.',
        ),
        tr(
          language,
          'Centralize shared navigation in a common component, layout or template when practical so page-specific variants cannot silently reorder the same destinations.',
          'Centraliza la navegación compartida en un componente, layout o plantilla común cuando sea práctico para evitar que variantes específicas de página reordenen silenciosamente los mismos destinos.',
        ),
        tr(
          language,
          'If navigation order is customizable, make the change explicitly user-initiated and preserve the chosen order consistently instead of applying unexplained page-by-page differences.',
          'Si el orden de navegación es personalizable, haz que el cambio sea iniciado explícitamente por el usuario y conserva de forma coherente el orden elegido en lugar de aplicar diferencias inexplicadas entre páginas.',
        ),
      ],
      validation: tr(
        language,
        'Run Site Audit again across the same page set and manually confirm that the same repeated navigation mechanism keeps its relative order, or that any different order is the result of an explicit user choice.',
        'Vuelve a ejecutar Site Audit sobre el mismo conjunto de páginas y confirma manualmente que el mismo mecanismo de navegación repetido conserva su orden relativo, o que cualquier orden distinto es resultado de una elección explícita del usuario.',
      ),
    };
  }

  if (ruleId === 'FT-REVIEW-015') {
    return {
      options: [
        tr(
          language,
          'First confirm that the compared links really provide the same functionality. When they do, identify that repeated function with a consistent label or accessible name across the relevant pages; the wording may vary only when it remains meaningfully equivalent.',
          'Confirma primero que los enlaces comparados realizan realmente la misma función. Cuando sea así, identifica esa función repetida con una etiqueta o nombre accesible coherente entre las páginas relevantes; la redacción puede variar solo cuando siga siendo significativamente equivalente.',
        ),
        tr(
          language,
          'Centralize repeated link labels and accessible-name copy in the same shared component, template or content source when practical so page variants do not silently introduce unrelated terminology.',
          'Centraliza las etiquetas repetidas y el texto del nombre accesible en el mismo componente, plantilla o fuente de contenido compartida cuando sea práctico, para evitar que variantes de página introduzcan terminología no relacionada sin querer.',
        ),
        tr(
          language,
          'If the wording differs because the controls are not actually the same function, or because contextual information legitimately changes the identification, document that distinction rather than forcing identical text only to silence the review.',
          'Si la redacción cambia porque los controles no realizan realmente la misma función o porque la información contextual modifica legítimamente su identificación, documenta esa diferencia en lugar de forzar texto idéntico solo para silenciar la revisión.',
        ),
      ],
      validation: tr(
        language,
        'Run Site Audit again on the same page set, then manually verify every reported pair: confirm the functionality is the same and that its visible/programmatic identification remains consistent or meaningfully equivalent across those pages.',
        'Vuelve a ejecutar Site Audit sobre el mismo conjunto de páginas y verifica manualmente cada par informado: confirma que la funcionalidad sea la misma y que su identificación visible/programática se mantenga coherente o significativamente equivalente entre esas páginas.',
      ),
    };
  }

  return undefined;
}

export function actionableRemediationText(
  ruleId: string | undefined,
  language: AppLanguage,
): string | undefined {
  const guidance = actionableRemediationForRule(ruleId, language);
  if (!guidance) return undefined;
  return `${guidance.options.join(' ')} ${tr(language, 'Verify:', 'Verifica:')} ${guidance.validation}`;
}
