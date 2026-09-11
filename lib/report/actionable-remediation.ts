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

  if (ruleId === 'FT-REVIEW-016') {
    return {
      options: [
        tr(
          language,
          'Remove inline !important from letter-spacing, word-spacing or line-height when it prevents user styles from reaching the required spacing. Prefer an author stylesheet declaration that remains overridable by user or extension styles.',
          'Elimina !important inline de letter-spacing, word-spacing o line-height cuando impida que los estilos del usuario alcancen el espaciado requerido. Prefiere una declaración en la hoja de estilos de autor que pueda seguir siendo sobrescrita por estilos del usuario o extensiones.',
        ),
        tr(
          language,
          'If an important declaration is genuinely required, ensure applicable human-language text can reach at least 0.12em letter spacing, 0.16em word spacing and 1.5 line height without clipping, overlap or loss of functionality.',
          'Si una declaración importante es realmente necesaria, asegúrate de que el texto de lenguaje humano aplicable pueda alcanzar al menos 0,12em de espaciado entre letras, 0,16em entre palabras y 1,5 de altura de línea sin recortes, solapamientos ni pérdida de funcionalidad.',
        ),
        tr(
          language,
          'If the page provides its own text-spacing control, verify that users can reach the WCAG values through that mechanism and that the setting works consistently instead of relying on a locked default declaration.',
          'Si la página ofrece su propio control de espaciado de texto, verifica que permita alcanzar los valores WCAG y que el ajuste funcione de forma coherente en lugar de depender de una declaración predeterminada bloqueada.',
        ),
      ],
      validation: tr(
        language,
        'Apply all WCAG 1.4.12 values together: line height 1.5 times the font size, paragraph spacing 2 times the font size, letter spacing 0.12 times the font size and word spacing 0.16 times the font size. Confirm that no content or functionality is lost; FocusTrace automates only the three inline-important ACT subsets, not the paragraph-spacing or combined-layout judgement.',
        'Aplica conjuntamente todos los valores de WCAG 1.4.12: altura de línea de 1,5 veces el tamaño de fuente, separación entre párrafos de 2 veces el tamaño de fuente, espaciado entre letras de 0,12 veces y entre palabras de 0,16 veces. Confirma que no se pierde contenido ni funcionalidad; FocusTrace automatiza solo los tres subconjuntos ACT de !important inline, no el espaciado entre párrafos ni el juicio del layout combinado.',
      ),
    };
  }

  if (ruleId === 'FT-REVIEW-024') {
    return {
      options: [
        tr(
          language,
          'Let ordinary content wrap into a single column at a 320 CSS px viewport. Replace fixed widths and minimum widths with fluid sizing such as max-width, percentages, grid/flex wrapping or responsive breakpoints.',
          'Permite que el contenido ordinario se reajuste en una sola columna con un viewport de 320 píxeles CSS. Sustituye anchuras y mínimos fijos por dimensiones fluidas como max-width, porcentajes, grid/flex con salto o breakpoints responsive.',
        ),
        tr(
          language,
          'Do not hide or clip text and controls when content wraps. Remove fixed heights or overflow clipping where they cut content, and keep responsive navigation and actions visible and operable.',
          'No ocultes ni recortes texto o controles cuando el contenido se reajuste. Elimina alturas fijas o recortes por overflow cuando corten contenido y mantén visibles y operables la navegación y las acciones responsive.',
        ),
        tr(
          language,
          'Keep two-dimensional scrolling only where the information or operation genuinely requires a two-dimensional layout, such as a data table, map or diagram, and confine that scrolling to the relevant component when possible.',
          'Conserva el desplazamiento bidimensional solo cuando la información u operación necesite realmente un layout de dos dimensiones, como una tabla de datos, un mapa o un diagrama, y limita ese desplazamiento al componente correspondiente cuando sea posible.',
        ),
      ],
      validation: tr(
        language,
        'Set the effective page viewport to 320 CSS px wide for horizontal writing (commonly 400% browser zoom on a 1280 CSS px window), rerun Analyze without resetting zoom, and traverse all content and controls. Confirm that ordinary content needs only one scrolling direction and that nothing is clipped, lost or inoperable; manually validate every essential two-dimensional exception.',
        'Ajusta el viewport efectivo de la página a 320 píxeles CSS de ancho para escritura horizontal —habitualmente 400 % de zoom del navegador sobre una ventana de 1280 píxeles CSS—, vuelve a ejecutar Analizar sin restablecer el zoom y recorre todo el contenido y los controles. Confirma que el contenido ordinario solo necesita una dirección de desplazamiento y que nada queda recortado, perdido o inoperable; valida manualmente cada excepción bidimensional esencial.',
      ),
    };
  }

  if (ruleId === 'FT-REVIEW-025') {
    return {
      options: [
        tr(
          language,
          'Add a persistent non-color cue to inline links, such as an underline, bold or italic styling, a distinct font family or a sufficiently different text size. Keep the cue visible before hover or keyboard focus.',
          'Añade a los enlaces integrados una señal persistente no basada en el color, como subrayado, negrita, cursiva, una familia tipográfica distinta o un tamaño de texto suficientemente diferente. Mantén la señal visible antes del hover o del foco de teclado.',
        ),
        tr(
          language,
          'When lightness is the additional distinction, ensure at least 3:1 contrast between the link text and the surrounding non-link text. Separately preserve the required text-to-background contrast for both colors.',
          'Cuando la luminosidad sea la distinción adicional, asegura un contraste mínimo de 3:1 entre el texto del enlace y el texto adyacente que no es enlace. Conserva por separado el contraste exigido entre ambos colores de texto y su fondo.',
        ),
        tr(
          language,
          'Apply the same persistent treatment consistently to links inside prose. Do not rely only on a cue that appears on hover, active or focus, because users must be able to identify the link before interacting with it.',
          'Aplica el mismo tratamiento persistente de forma coherente a los enlaces dentro de texto. No dependas únicamente de una señal que aparezca con hover, active o focus, porque el usuario debe poder identificar el enlace antes de interactuar.',
        ),
      ],
      validation: tr(
        language,
        'Inspect the link in its normal, unhovered and unfocused state and confirm it remains identifiable when color differences are removed. If lightness is the only additional cue, measure at least 3:1 against adjacent text and also verify each text color against its background under WCAG 1.4.3.',
        'Inspecciona el enlace en su estado normal, sin hover ni foco, y confirma que sigue siendo identificable al eliminar las diferencias de color. Si la luminosidad es la única señal adicional, mide al menos 3:1 respecto al texto adyacente y verifica también cada color de texto frente a su fondo según WCAG 1.4.3.',
      ),
    };
  }

  if (ruleId === 'FT-REVIEW-026') {
    return {
      options: [
        tr(
          language,
          'Provide a visible, keyboard-operable control that pauses and resumes, stops or hides automatically moving, blinking or scrolling content. Keep the content paused until the user explicitly resumes it.',
          'Proporciona un control visible y operable por teclado que pause y reanude, detenga u oculte el contenido que se mueve, parpadea o desplaza automáticamente. Mantén el contenido pausado hasta que el usuario lo reanude de forma explícita.',
        ),
        tr(
          language,
          'For auto-updating information, also allow users to control the update frequency. Associate local controls with their content programmatically where practical, for example with aria-controls, without relying on that relationship alone to implement the behavior.',
          'Para información que se actualiza automáticamente, permite también controlar la frecuencia de actualización. Relaciona programáticamente los controles locales con su contenido cuando sea práctico, por ejemplo con aria-controls, sin depender únicamente de esa relación para implementar el comportamiento.',
        ),
        tr(
          language,
          'If non-essential motion does not need to continue, stop it within five seconds. Document an essential-motion exception only when removing the movement would fundamentally change information or functionality and no conforming alternative exists.',
          'Si el movimiento no esencial no necesita continuar, detenlo en un máximo de cinco segundos. Documenta una excepción por movimiento esencial únicamente cuando eliminarlo cambie fundamentalmente la información o funcionalidad y no exista una alternativa conforme.',
        ),
      ],
      validation: tr(
        language,
        'Reload the page without interacting and observe the candidate for more than five seconds alongside the rest of the content. Activate every pause, stop or hide mechanism with keyboard and pointer input; confirm motion stays stopped until explicitly resumed and manually assess essentiality. Separately observe timed text or DOM updates that a single scan cannot detect.',
        'Recarga la página sin interactuar y observa el candidato durante más de cinco segundos junto al resto del contenido. Activa cada mecanismo de pausa, detención u ocultación con teclado y puntero; confirma que el movimiento permanece detenido hasta reanudarlo explícitamente y valora manualmente si es esencial. Observa por separado las actualizaciones temporizadas de texto o DOM que un único barrido no puede detectar.',
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
