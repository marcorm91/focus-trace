import { localizedScanIssue, tr, type AppLanguage } from '../../shared/i18n';
import type { ScanIssue } from '../../shared/types';

export interface FindingGuidance {
  impact: string;
  remediation: string;
  validation: string;
}

function criterionlessDescription(description: string): string {
  return description
    .replace(/\s+Criterion\/source:.*\.$/u, '')
    .replace(/\s+Criterio\/fuente:.*\.$/u, '');
}

export function reportFindingDescription(issue: ScanIssue, language: AppLanguage): string {
  if (issue.ruleId === 'FT-WCAG-010' && issue.outcome === 'review') {
    return issue.contrast?.reason || tr(
      language,
      'The final rendered text/background contrast could not be determined reliably for this element. Manual review is required.',
      'No se ha podido determinar con fiabilidad el contraste final renderizado entre el texto y su fondo para este elemento. Requiere revisión manual.',
    );
  }
  if (issue.ruleId === 'FT-WCAG-011' && issue.outcome === 'review') {
    return issue.contrast?.reason || tr(
      language,
      'The final non-text visual contrast or the necessity of this visual cue could not be proven automatically. Manual review is required.',
      'No se ha podido demostrar automáticamente el contraste visual no textual final o que esta señal visual sea imprescindible. Requiere revisión manual.',
    );
  }
  return criterionlessDescription(localizedScanIssue(issue, language).description);
}

export function guidanceForIssue(issue: ScanIssue, language: AppLanguage): FindingGuidance {
  const requiredRatio = issue.contrast?.requiredRatio;
  const measuredRatio = issue.contrast?.ratio;

  switch (issue.ruleId) {
    case 'FT-WCAG-001':
      return {
        impact: tr(language,
          'Users of assistive technology and people navigating several tabs may have difficulty identifying the current page or view.',
          'Las personas que utilizan tecnologías de asistencia o navegan entre varias pestañas pueden tener dificultades para identificar la página o vista actual.'),
        remediation: tr(language,
          'Add a concise, descriptive and page-specific <title> that identifies the current view or task.',
          'Añade un <title> conciso, descriptivo y específico de la página que identifique la vista o tarea actual.'),
        validation: tr(language,
          'Reload the page and verify that the browser tab and accessibility tree expose a meaningful, non-empty title.',
          'Recarga la página y verifica que la pestaña del navegador y el árbol de accesibilidad exponen un título significativo y no vacío.'),
      };
    case 'FT-WCAG-002':
      return {
        impact: tr(language,
          'A meaningful image may be announced without useful information, or a decorative image may create unnecessary noise for screen-reader users.',
          'Una imagen con significado puede anunciarse sin información útil, o una imagen decorativa puede generar ruido innecesario para usuarios de lector de pantalla.'),
        remediation: tr(language,
          'Provide a meaningful accessible name when the image conveys information, or use an empty alt when it is purely decorative.',
          'Proporciona un nombre accesible significativo si la imagen transmite información, o usa alt vacío cuando sea puramente decorativa.'),
        validation: tr(language,
          'Inspect the computed accessible name and confirm that a screen reader announces the intended information, or ignores the image when decorative.',
          'Revisa el nombre accesible calculado y confirma que un lector de pantalla anuncia la información prevista, o ignora la imagen cuando sea decorativa.'),
      };
    case 'FT-WCAG-003':
      return {
        impact: tr(language,
          'Screen-reader and voice-control users may encounter a button without enough information to understand or invoke its action.',
          'Usuarios de lector de pantalla y control por voz pueden encontrar un botón sin información suficiente para comprender o ejecutar su acción.'),
        remediation: tr(language,
          'Give the button a concise accessible name that describes its action, preferably using visible text or aria-labelledby; use aria-label when no visible label is appropriate.',
          'Da al botón un nombre accesible conciso que describa su acción, preferiblemente mediante texto visible o aria-labelledby; usa aria-label cuando no proceda una etiqueta visible.'),
        validation: tr(language,
          'Reach the button with the keyboard and confirm that its computed accessible name and screen-reader announcement clearly describe the action.',
          'Llega al botón con el teclado y confirma que su nombre accesible calculado y el anuncio del lector de pantalla describen claramente la acción.'),
      };
    case 'FT-WCAG-004':
    case 'FT-REVIEW-003':
      return {
        impact: tr(language,
          'Users may not know what information a form control expects, especially when placeholders disappear after typing.',
          'Los usuarios pueden no saber qué información espera un control de formulario, especialmente cuando el placeholder desaparece al escribir.'),
        remediation: tr(language,
          'Provide a persistent visible label and associate it programmatically with the control using <label>, aria-labelledby or another valid naming mechanism.',
          'Proporciona una etiqueta visible persistente y asóciala programáticamente con el control mediante <label>, aria-labelledby u otro mecanismo válido de nombrado.'),
        validation: tr(language,
          'Focus the control and verify that the visible label remains available and the computed accessible name matches the intended field purpose.',
          'Lleva el foco al control y verifica que la etiqueta visible permanece disponible y que el nombre accesible calculado coincide con la finalidad del campo.'),
      };
    case 'FT-WCAG-005':
      return {
        impact: tr(language,
          'Screen-reader users may encounter a link whose destination or purpose cannot be understood from its accessible name.',
          'Los usuarios de lector de pantalla pueden encontrar un enlace cuyo destino o propósito no se puede comprender a partir de su nombre accesible.'),
        remediation: tr(language,
          'Give the link an accessible name that describes its destination or purpose in context.',
          'Da al enlace un nombre accesible que describa su destino o propósito dentro del contexto.'),
        validation: tr(language,
          'Navigate to the link with a screen reader or inspect its computed name and confirm the destination/purpose is understandable without relying on surrounding visual cues alone.',
          'Navega hasta el enlace con lector de pantalla o revisa su nombre calculado y confirma que el destino o propósito se entiende sin depender únicamente de pistas visuales cercanas.'),
      };
    case 'FT-WCAG-006':
      return {
        impact: tr(language,
          'Keyboard users can move focus into content that is hidden from assistive technology, creating an inconsistent and confusing interaction.',
          'Los usuarios de teclado pueden mover el foco a contenido oculto para las tecnologías de asistencia, creando una interacción incoherente y confusa.'),
        remediation: tr(language,
          'Remove sequential focusability from descendants hidden with aria-hidden, or do not hide content that must remain keyboard-operable.',
          'Elimina la posibilidad de foco secuencial de los descendientes ocultos con aria-hidden, o no ocultes contenido que deba seguir siendo operable por teclado.'),
        validation: tr(language,
          'Navigate through the affected area using Tab/Shift+Tab and confirm that no focus target exists inside aria-hidden content.',
          'Recorre la zona afectada con Tab/Shift+Tab y confirma que no existe ningún destino de foco dentro de contenido con aria-hidden.'),
      };
    case 'FT-WCAG-007':
      return {
        impact: tr(language,
          'Voice-input users may be unable to target the control using the visible words, while assistive-technology users receive a different label.',
          'Los usuarios de entrada por voz pueden no poder activar el control usando las palabras visibles, mientras que las tecnologías de asistencia reciben una etiqueta diferente.'),
        remediation: tr(language,
          'Ensure the accessible name contains the visible label text in the same order wherever practical.',
          'Asegura que el nombre accesible contenga el texto de la etiqueta visible, en el mismo orden siempre que sea posible.'),
        validation: tr(language,
          'Compare the visible label with the computed accessible name and confirm that the visible words are included.',
          'Compara la etiqueta visible con el nombre accesible calculado y confirma que las palabras visibles están incluidas.'),
      };
    case 'FT-WCAG-008':
    case 'FT-WCAG-009':
      return {
        impact: tr(language,
          'Assistive technologies may choose incorrect pronunciation rules when the primary page language is missing or invalid.',
          'Las tecnologías de asistencia pueden aplicar reglas de pronunciación incorrectas cuando falta el idioma principal de la página o su valor no es válido.'),
        remediation: tr(language,
          'Set a valid BCP 47 lang value on the root html element that represents the primary language of the page.',
          'Define un valor lang BCP 47 válido en el elemento html raíz que represente el idioma principal de la página.'),
        validation: tr(language,
          'Inspect document.documentElement.lang and verify that assistive technology switches to the expected language/pronunciation.',
          'Revisa document.documentElement.lang y verifica que la tecnología de asistencia utiliza el idioma y pronunciación esperados.'),
      };
    case 'FT-WCAG-010':
      if (issue.outcome === 'review') {
        return {
          impact: tr(language,
            'Low text contrast can make content difficult to read for people with low vision, but this case cannot be classified automatically from the rendered composition with enough confidence.',
            'Un contraste de texto bajo puede dificultar la lectura a personas con baja visión, pero este caso no puede clasificarse automáticamente con suficiente fiabilidad a partir de la composición renderizada.'),
          remediation: tr(language,
            'Review the final rendered foreground/background combination manually. If needed, adjust the text color, background, overlay or image treatment so the applicable contrast ratio is consistently reached.',
            'Revisa manualmente la combinación final renderizada de primer plano y fondo. Si es necesario, ajusta el color del texto, el fondo, overlay o tratamiento de imagen para alcanzar de forma estable el ratio de contraste aplicable.'),
          validation: tr(language,
            `Measure the final visible state manually and confirm it reaches at least ${requiredRatio ?? 4.5}:1 for the evaluated text.`,
            `Mide manualmente el estado final visible y confirma que alcanza al menos ${requiredRatio ?? 4.5}:1 para el texto evaluado.`),
        };
      }
      return {
        impact: tr(language,
          'Insufficient text contrast can make content difficult or impossible to read for people with low vision or reduced contrast sensitivity.',
          'Un contraste de texto insuficiente puede dificultar o impedir la lectura a personas con baja visión o sensibilidad reducida al contraste.'),
        remediation: tr(language,
          `Adjust the text color, background or both until the rendered contrast reaches at least ${requiredRatio ?? 4.5}:1.${measuredRatio != null ? ` The recorded value is ${measuredRatio}:1.` : ''}`,
          `Ajusta el color del texto, el fondo o ambos hasta que el contraste renderizado alcance al menos ${requiredRatio ?? 4.5}:1.${measuredRatio != null ? ` El valor registrado es ${measuredRatio}:1.` : ''}`),
        validation: tr(language,
          'Re-measure the same rendered state after the change and verify that the required ratio is reached in the final UI.',
          'Vuelve a medir el mismo estado renderizado después del cambio y verifica que el ratio requerido se alcanza en la interfaz final.'),
      };
    case 'FT-WCAG-011':
      return {
        impact: tr(language,
          'Controls, focus indicators or essential graphical information with insufficient visual contrast may be difficult to perceive for people with low vision.',
          'Los controles, indicadores de foco o información gráfica esencial con contraste visual insuficiente pueden resultar difíciles de percibir para personas con baja visión.'),
        remediation: tr(language,
          issue.outcome === 'review'
            ? 'Confirm manually that the evaluated visual cue is required to identify the component/state. If it is essential, adjust its color against the adjacent color to reach at least 3:1.'
            : 'Adjust the relevant boundary, icon, focus indicator or graphical color against its adjacent color until it reaches at least 3:1.',
          issue.outcome === 'review'
            ? 'Confirma manualmente que la señal visual evaluada es necesaria para identificar el componente o estado. Si es esencial, ajusta su color frente al color adyacente hasta alcanzar al menos 3:1.'
            : 'Ajusta el borde, icono, indicador de foco o color gráfico relevante frente a su color adyacente hasta alcanzar al menos 3:1.'),
        validation: tr(language,
          'Inspect the final rendered state and measure the essential visual cue against the immediately adjacent color, confirming at least 3:1 where WCAG 1.4.11 applies.',
          'Revisa el estado final renderizado y mide la señal visual esencial frente al color inmediatamente adyacente, confirmando al menos 3:1 cuando aplique WCAG 1.4.11.'),
      };
    case 'FT-REVIEW-001':
      return {
        impact: tr(language,
          'A positive tabindex can create a focus order that differs from the visual/DOM order and becomes difficult to predict for keyboard users.',
          'Un tabindex positivo puede crear un orden de foco diferente al orden visual/DOM y resultar difícil de predecir para usuarios de teclado.'),
        remediation: tr(language,
          'Prefer the natural DOM order and tabindex="0" only where necessary. Reserve positive tabindex values for exceptional, documented interaction patterns.',
          'Prioriza el orden natural del DOM y tabindex="0" solo cuando sea necesario. Reserva los tabindex positivos para patrones de interacción excepcionales y documentados.'),
        validation: tr(language,
          'Navigate the complete interaction with Tab and Shift+Tab and confirm that focus follows a logical, predictable order.',
          'Recorre toda la interacción con Tab y Shift+Tab y confirma que el foco sigue un orden lógico y predecible.'),
      };
    case 'FT-REVIEW-002':
      return {
        impact: tr(language,
          'An inconsistent heading hierarchy can make page structure harder to understand and navigate for screen-reader users.',
          'Una jerarquía de encabezados incoherente puede dificultar la comprensión y navegación de la estructura para usuarios de lector de pantalla.'),
        remediation: tr(language,
          'Review the document outline and use heading levels that represent the actual content hierarchy rather than visual size.',
          'Revisa el esquema del documento y usa niveles de encabezado que representen la jerarquía real del contenido, no su tamaño visual.'),
        validation: tr(language,
          'Inspect the H1–H6 outline in document order and confirm that each level change reflects a meaningful structural relationship.',
          'Revisa el esquema H1–H6 en orden de documento y confirma que cada cambio de nivel refleja una relación estructural significativa.'),
      };
    case 'FT-WARN-001':
      return {
        impact: tr(language,
          'Deprecated ARIA semantics may be interpreted inconsistently by current or future accessibility APIs and assistive technologies.',
          'La semántica ARIA obsoleta puede interpretarse de forma inconsistente por APIs de accesibilidad y tecnologías de asistencia actuales o futuras.'),
        remediation: tr(language,
          'Replace the deprecated role with the current supported semantic equivalent and retest the component interaction.',
          'Sustituye el rol obsoleto por su equivalente semántico actual compatible y vuelve a probar la interacción del componente.'),
        validation: tr(language,
          'Inspect the resolved role in the accessibility tree and test the component with keyboard and assistive technology.',
          'Revisa el rol resuelto en el árbol de accesibilidad y prueba el componente con teclado y tecnología de asistencia.'),
      };
    case 'FT-WARN-002':
    case 'FT-WARN-003':
      return {
        impact: tr(language,
          'Unsupported ARIA authoring can expose misleading or inconsistent semantics to assistive technologies.',
          'Un marcado ARIA no compatible puede exponer una semántica engañosa o inconsistente a las tecnologías de asistencia.'),
        remediation: tr(language,
          'Remove or replace the deprecated/prohibited ARIA state or property according to the resolved role semantics.',
          'Elimina o sustituye el estado o propiedad ARIA obsoleto/prohibido de acuerdo con la semántica del rol resuelto.'),
        validation: tr(language,
          'Inspect the final accessibility tree and confirm that the component exposes only supported states/properties for its role.',
          'Revisa el árbol de accesibilidad final y confirma que el componente expone únicamente estados y propiedades compatibles con su rol.'),
      };
    default:
      return {
        impact: tr(language,
          'This finding may affect how users perceive, understand or operate the affected component.',
          'Este hallazgo puede afectar a la forma en que los usuarios perciben, comprenden u operan el componente afectado.'),
        remediation: tr(language,
          'Review the affected component against the recorded evidence and the referenced accessibility requirement, then correct the rendered behavior or semantics.',
          'Revisa el componente afectado frente a la evidencia registrada y el requisito de accesibilidad referenciado, y corrige el comportamiento o la semántica renderizada.'),
        validation: tr(language,
          'Repeat the same interaction or static check after the change and confirm that the recorded evidence no longer reproduces the finding.',
          'Repite la misma interacción o comprobación estática después del cambio y confirma que la evidencia registrada ya no reproduce el hallazgo.'),
      };
  }
}
