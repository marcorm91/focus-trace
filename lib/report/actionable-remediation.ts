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
