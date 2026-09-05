import { suggestAccessibleForeground } from '../audit/contrast';
import { actionableRemediationText } from '../report/actionable-remediation';
import type { AppLanguage } from '../../shared/i18n';
import type { ScanIssue } from '../../shared/types';

function t(language: AppLanguage, en: string, es: string) {
  return language === 'es' ? es : en;
}

export function remediationForIssue(issue: ScanIssue, language: AppLanguage): string {
  const actionable = actionableRemediationText(issue.ruleId, language);
  if (actionable) return actionable;

  if (issue.ruleId === 'FT-WCAG-001') return t(language,
    'Add a concise, descriptive and page-specific <title> that identifies the current view or task.',
    'Añade un <title> conciso, descriptivo y específico de la página que identifique la vista o tarea actual.');
  if (issue.ruleId === 'FT-WCAG-002') return t(language,
    'Provide a meaningful alt/accessible name when the image conveys information, or mark it decorative with an empty alt when it should be ignored.',
    'Proporciona un alt/nombre accesible significativo si la imagen transmite información, o márcala como decorativa con alt vacío si debe ignorarse.');
  if (issue.ruleId === 'FT-WCAG-003') return t(language,
    'Give the button an accessible name that describes its action, preferably from visible text or an associated label; use aria-label only when necessary.',
    'Da al botón un nombre accesible que describa su acción, preferiblemente mediante texto visible o una etiqueta asociada; usa aria-label solo cuando sea necesario.');
  if (issue.ruleId === 'FT-WCAG-004') return t(language,
    'Associate the form control with a persistent visible label using <label>, aria-labelledby or another valid naming mechanism.',
    'Asocia el control de formulario con una etiqueta visible persistente mediante <label>, aria-labelledby u otro mecanismo válido de nombrado.');
  if (issue.ruleId === 'FT-WCAG-005') return t(language,
    'Give the link an accessible name that explains its destination or purpose in context.',
    'Da al enlace un nombre accesible que explique su destino o propósito dentro del contexto.');
  if (issue.ruleId === 'FT-WCAG-006') return t(language,
    'Remove sequential focusability from content hidden with aria-hidden, or do not hide an element that must remain keyboard-operable.',
    'Elimina la posibilidad de foco secuencial del contenido oculto con aria-hidden, o no ocultes un elemento que deba seguir siendo operable por teclado.');
  if (issue.ruleId === 'FT-WCAG-007') return t(language,
    'Ensure the accessible name contains the visible label text so speech-input and screen-reader users can identify the same control.',
    'Asegura que el nombre accesible contenga el texto de la etiqueta visible para que usuarios de entrada por voz y lector de pantalla identifiquen el mismo control.');
  if (issue.ruleId === 'FT-WCAG-008') return t(language,
    'Set a valid lang attribute on the root html element that identifies the primary language of the page.',
    'Define un atributo lang válido en el elemento html raíz que identifique el idioma principal de la página.');
  if (issue.ruleId === 'FT-WCAG-009') return t(language,
    'Use a recognized BCP 47 primary language subtag in the page lang attribute.',
    'Usa un subtipo de idioma principal BCP 47 reconocido en el atributo lang de la página.');
  if (issue.ruleId === 'FT-WCAG-010' || issue.ruleId === 'FT-WCAG-011') {
    const contrast = issue.contrast;
    if (contrast?.foreground && contrast.background) {
      const suggestion = suggestAccessibleForeground(contrast.foreground, contrast.background, contrast.requiredRatio);
      if (suggestion) return t(language,
        `Adjust the recorded foreground/visual color to at least ${contrast.requiredRatio}:1. One deterministic sRGB option is ${suggestion.hex} (${suggestion.rgb}), which reaches ${suggestion.ratio}:1 against the recorded adjacent color.`,
        `Ajusta el color de primer plano/visual registrado hasta alcanzar al menos ${contrast.requiredRatio}:1. Una opción sRGB determinista es ${suggestion.hex} (${suggestion.rgb}), que alcanza ${suggestion.ratio}:1 frente al color adyacente registrado.`);
    }
    return t(language,
      `Adjust the relevant foreground, boundary or graphical color until the measured contrast reaches at least ${contrast?.requiredRatio ?? 'the required'}:1, then verify it in the final rendered state.`,
      `Ajusta el color de primer plano, límite o gráfico relevante hasta que el contraste medido alcance al menos ${contrast?.requiredRatio ?? 'el valor requerido'}:1 y verifícalo en el estado final renderizado.`);
  }
  if (issue.ruleId === 'FT-WCAG-012') return t(language,
    'Increase the active pointer target so it contains at least a 24 × 24 CSS px area, or increase spacing so a 24 CSS px circle centered on the undersized target does not intersect another target. If an equivalent, inline, user-agent-control or essential exception is being relied on, document and verify that exception manually.',
    'Aumenta el área activa del objetivo de puntero para que contenga al menos 24 × 24 CSS px, o aumenta la separación para que un círculo de 24 CSS px centrado en el objetivo pequeño no interseque con otro objetivo. Si se aplica una excepción por control equivalente, contenido inline, control del navegador o necesidad esencial, documéntala y verifícala manualmente.');
  if (issue.ruleId === 'FT-WARN-001') return t(language,
    'Replace the deprecated ARIA role with its current supported semantic equivalent and retest the accessible name and interaction model.',
    'Sustituye el rol ARIA obsoleto por su equivalente semántico actual compatible y vuelve a probar el nombre accesible y el modelo de interacción.');
  if (issue.ruleId === 'FT-WARN-002' || issue.ruleId === 'FT-WARN-003') return t(language,
    'Remove or replace the deprecated/prohibited ARIA attribute according to the role semantics instead of relying on unsupported authoring.',
    'Elimina o sustituye el atributo ARIA obsoleto/prohibido según la semántica del rol, en lugar de depender de un marcado no compatible.');
  if (issue.ruleId === 'FT-WARN-004') return t(language,
    'Give every element a unique non-empty id and update all for, aria-labelledby, aria-describedby, aria-controls, aria-owns, aria-activedescendant, headers or href references that point to any renamed identifier.',
    'Asigna a cada elemento un id no vacío y único, y actualiza todas las referencias for, aria-labelledby, aria-describedby, aria-controls, aria-owns, aria-activedescendant, headers o href que apunten a cualquier identificador renombrado.');
  if (issue.ruleId === 'FT-REVIEW-001') return t(language,
    'Prefer natural DOM order with tabindex="0" only where needed. Avoid positive tabindex values unless a documented interaction pattern genuinely requires them.',
    'Prioriza el orden natural del DOM con tabindex="0" solo donde sea necesario. Evita tabindex positivos salvo que un patrón de interacción documentado los requiera realmente.');
  if (issue.ruleId === 'FT-REVIEW-002') return t(language,
    'Review the document outline and use heading levels that reflect the actual content hierarchy rather than visual size.',
    'Revisa el esquema del documento y usa niveles de encabezado que reflejen la jerarquía real del contenido, no su tamaño visual.');
  if (issue.ruleId === 'FT-REVIEW-003') return t(language,
    'Add a persistent programmatically associated label. Placeholder text should supplement a label, not replace it.',
    'Añade una etiqueta persistente asociada programáticamente. El placeholder debe complementar a la etiqueta, no sustituirla.');

  return t(language,
    `Review the affected component against the recorded evidence and ${issue.references[0] ? `${issue.references[0].type} ${issue.references[0].id}` : 'the applicable accessibility requirement'}, then retest the rendered state.`,
    `Revisa el componente afectado frente a la evidencia registrada y ${issue.references[0] ? `${issue.references[0].type} ${issue.references[0].id}` : 'el requisito de accesibilidad aplicable'}, y vuelve a probar el estado renderizado.`);
}
