import type { Severity, StandardReference } from './types';

export interface RuleDefinition {
  id: string;
  title: string;
  severity: Severity;
  severityRationale: {
    en: string;
    es: string;
  };
  references: StandardReference[];
}

const wcag = (id: string, label: string, level: 'A' | 'AA' | 'AAA', anchor: string): StandardReference => ({
  type: 'WCAG',
  id,
  label,
  level,
  status: 'normative',
  url: `https://www.w3.org/TR/WCAG22/#${anchor}`,
});

const act = (id: string, label: string): StandardReference => ({
  type: 'ACT',
  id,
  label,
  status: 'proposed',
  url: `https://www.w3.org/WAI/standards-guidelines/act/rules/${id}/proposed/`,
});

const aria: StandardReference = {
  type: 'WAI-ARIA',
  id: '1.3-editor-draft',
  label: 'WAI-ARIA 1.3 Editor Draft',
  status: 'editor-draft',
  url: 'https://w3c.github.io/aria/',
};

const apgDialog: StandardReference = {
  type: 'WAI-ARIA APG',
  id: 'dialog-modal',
  label: 'Dialog (Modal) Pattern',
  status: 'informative',
  url: 'https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/',
};

const impact = (
  en: string,
  es: string,
): Pick<RuleDefinition, 'severityRationale'> => ({
  severityRationale: { en, es },
});

export const RULES = {
  pageTitle: {
    id: 'FT-WCAG-001',
    title: 'HTML page has a non-empty title',
    severity: 'serious',
    ...impact(
      'A missing page title can make the current view difficult to identify and navigate, especially across multiple tabs or views.',
      'La ausencia de título puede dificultar identificar y navegar la vista actual, especialmente entre varias pestañas o vistas.',
    ),
    references: [wcag('2.4.2', 'Page Titled', 'A', 'page-titled'), act('2779a5', 'HTML page has non-empty title')],
  },
  imageName: {
    id: 'FT-WCAG-002',
    title: 'Image has an accessible name or is marked decorative',
    severity: 'serious',
    ...impact(
      'An unnamed meaningful image can remove information for screen-reader users. FocusTrace uses one base severity for native images and role=img without assuming every image is a complete task blocker.',
      'Una imagen significativa sin nombre puede eliminar información para usuarios de lector de pantalla. FocusTrace usa una única severidad base para imágenes nativas y role=img sin asumir que toda imagen bloquea por completo una tarea.',
    ),
    references: [wcag('1.1.1', 'Non-text Content', 'A', 'non-text-content'), act('23a2a8', 'Image has non-empty accessible name')],
  },
  buttonName: {
    id: 'FT-WCAG-003',
    title: 'Button has a non-empty accessible name',
    severity: 'critical',
    ...impact(
      'An unnamed button can make an action impossible to identify or invoke reliably with a screen reader or voice control.',
      'Un botón sin nombre puede hacer imposible identificar o ejecutar de forma fiable una acción con lector de pantalla o control por voz.',
    ),
    references: [wcag('4.1.2', 'Name, Role, Value', 'A', 'name-role-value'), act('97a4e1', 'Button has non-empty accessible name')],
  },
  formFieldName: {
    id: 'FT-WCAG-004',
    title: 'Form field has a non-empty accessible name',
    severity: 'critical',
    ...impact(
      'An unnamed form control can prevent users from knowing what information or action the control represents, blocking completion of a form task.',
      'Un control de formulario sin nombre puede impedir saber qué información o acción representa, bloqueando la finalización de una tarea de formulario.',
    ),
    references: [wcag('4.1.2', 'Name, Role, Value', 'A', 'name-role-value'), act('e086e5', 'Form field has non-empty accessible name')],
  },
  linkName: {
    id: 'FT-WCAG-005',
    title: 'Link has a non-empty accessible name',
    severity: 'serious',
    ...impact(
      'An unnamed link can hide its destination or purpose from assistive-technology users and make navigation substantially harder.',
      'Un enlace sin nombre puede ocultar su destino o propósito a usuarios de tecnologías de asistencia y dificultar considerablemente la navegación.',
    ),
    references: [wcag('4.1.2', 'Name, Role, Value', 'A', 'name-role-value'), wcag('2.4.4', 'Link Purpose (In Context)', 'A', 'link-purpose-in-context'), act('c487ae', 'Link has non-empty accessible name')],
  },
  ariaHiddenFocusable: {
    id: 'FT-WCAG-006',
    title: 'aria-hidden content contains a sequentially focusable element',
    severity: 'serious',
    ...impact(
      'Keyboard focus entering content hidden from assistive technology creates a substantial mismatch between operability and what is exposed to the accessibility tree.',
      'Que el foco de teclado entre en contenido oculto para tecnologías de asistencia crea una discrepancia importante entre la operabilidad y lo expuesto en el árbol de accesibilidad.',
    ),
    references: [wcag('4.1.2', 'Name, Role, Value', 'A', 'name-role-value'), act('6cfa84', 'Element with aria-hidden has no content in sequential focus navigation')],
  },
  labelInName: {
    id: 'FT-WCAG-007',
    title: 'Visible label is part of the accessible name',
    severity: 'serious',
    ...impact(
      'A mismatch between visible text and accessible name can prevent voice-input users from targeting a control by the words they can see.',
      'Una discrepancia entre el texto visible y el nombre accesible puede impedir que usuarios de entrada por voz activen un control mediante las palabras que ven.',
    ),
    references: [wcag('2.5.3', 'Label in Name', 'A', 'label-in-name'), act('2ee8b8', 'Visible label is part of accessible name')],
  },
  pageLangPresent: {
    id: 'FT-WCAG-008',
    title: 'HTML page has a non-empty lang attribute',
    severity: 'serious',
    ...impact(
      'Without the page language, assistive technologies can use the wrong pronunciation and language rules across the whole document.',
      'Sin el idioma de la página, las tecnologías de asistencia pueden aplicar reglas de pronunciación e idioma incorrectas en todo el documento.',
    ),
    references: [wcag('3.1.1', 'Language of Page', 'A', 'language-of-page'), act('b5c3f8', 'HTML page has lang attribute')],
  },
  pageLangKnown: {
    id: 'FT-WCAG-009',
    title: 'HTML page lang has a known primary language tag',
    severity: 'serious',
    ...impact(
      'An invalid primary language tag can cause assistive technologies to apply incorrect pronunciation rules across the page.',
      'Una etiqueta de idioma principal no válida puede provocar que las tecnologías de asistencia apliquen reglas de pronunciación incorrectas en la página.',
    ),
    references: [wcag('3.1.1', 'Language of Page', 'A', 'language-of-page'), act('bf051a', 'HTML page lang attribute has valid language tag')],
  },
  textContrast: {
    id: 'FT-WCAG-010',
    title: 'Text has sufficient color contrast',
    severity: 'serious',
    ...impact(
      'Insufficient text contrast can make content substantially harder or impossible to read for people with low vision or reduced contrast sensitivity.',
      'Un contraste de texto insuficiente puede dificultar considerablemente o impedir la lectura a personas con baja visión o sensibilidad reducida al contraste.',
    ),
    references: [wcag('1.4.3', 'Contrast (Minimum)', 'AA', 'contrast-minimum')],
  },
  nonTextContrast: {
    id: 'FT-WCAG-011',
    title: 'Required non-text visual information has sufficient contrast',
    severity: 'serious',
    ...impact(
      'Low contrast in essential component boundaries, states, focus indicators or graphics can make controls and information difficult to perceive.',
      'Un contraste bajo en límites, estados, indicadores de foco o gráficos esenciales puede dificultar la percepción de controles e información.',
    ),
    references: [wcag('1.4.11', 'Non-text Contrast', 'AA', 'non-text-contrast')],
  },
  deprecatedAriaRole: {
    id: 'FT-WARN-001',
    title: 'Deprecated ARIA role is used',
    severity: 'minor',
    ...impact(
      'A deprecated role is an authoring risk and future-compatibility concern, but by itself it usually has limited immediate user impact.',
      'Un rol obsoleto supone un riesgo de autoría y compatibilidad futura, pero por sí solo suele tener un impacto inmediato limitado para el usuario.',
    ),
    references: [aria],
  },
  deprecatedAriaProperty: {
    id: 'FT-WARN-002',
    title: 'ARIA state or property is deprecated for this role',
    severity: 'minor',
    ...impact(
      'A deprecated state or property can become unsupported or misleading over time, but the signal does not prove that current interaction is blocked.',
      'Un estado o propiedad obsoletos pueden dejar de ser compatibles o resultar engañosos con el tiempo, pero la señal no demuestra que la interacción actual esté bloqueada.',
    ),
    references: [aria],
  },
  prohibitedAriaProperty: {
    id: 'FT-WARN-003',
    title: 'ARIA state or property is prohibited for this role',
    severity: 'serious',
    ...impact(
      'A prohibited ARIA attribute can be ignored by accessibility APIs, causing important semantics or state information to be missing or misleading.',
      'Un atributo ARIA prohibido puede ser ignorado por las APIs de accesibilidad, haciendo que información semántica o de estado importante falte o resulte engañosa.',
    ),
    references: [aria],
  },
  positiveTabindex: {
    id: 'FT-REVIEW-001',
    title: 'Positive tabindex may create an unexpected focus order',
    severity: 'serious',
    ...impact(
      'A positive tabindex can substantially disrupt the natural focus sequence. FocusTrace keeps the outcome as review because the resulting order still needs contextual judgement.',
      'Un tabindex positivo puede alterar de forma importante la secuencia natural de foco. FocusTrace mantiene el resultado como revisión porque el orden resultante todavía requiere criterio contextual.',
    ),
    references: [wcag('2.4.3', 'Focus Order', 'A', 'focus-order')],
  },
  headingJump: {
    id: 'FT-REVIEW-002',
    title: 'Heading levels skip a level',
    severity: 'minor',
    ...impact(
      'A skipped heading level is a structural signal rather than proof of a broken hierarchy. FocusTrace reports it for review with limited base impact unless the hierarchy is actually misleading.',
      'Un salto de nivel de encabezado es una señal estructural, no una prueba de jerarquía rota. FocusTrace lo presenta para revisión con impacto base limitado salvo que la jerarquía resulte realmente engañosa.',
    ),
    references: [wcag('1.3.1', 'Info and Relationships', 'A', 'info-and-relationships'), wcag('2.4.6', 'Headings and Labels', 'AA', 'headings-and-labels')],
  },
  placeholderOnlyLabel: {
    id: 'FT-REVIEW-003',
    title: 'Form field relies on placeholder text as its accessible name',
    severity: 'moderate',
    ...impact(
      'Placeholder-only identification can disappear while typing and may leave users without a persistent visible cue, but the control still has a computed name and needs manual context review.',
      'La identificación basada solo en placeholder puede desaparecer al escribir y dejar al usuario sin una pista visible persistente, pero el control sigue teniendo un nombre calculado y requiere revisión contextual.',
    ),
    references: [wcag('3.3.2', 'Labels or Instructions', 'A', 'labels-or-instructions')],
  },
  focusLost: {
    id: 'FT-RUNTIME-001',
    title: 'Focused element removed during interaction',
    severity: 'serious',
    ...impact(
      'Removing the focused element can disorient keyboard and screen-reader users and interrupt the current interaction flow.',
      'Eliminar el elemento con foco puede desorientar a usuarios de teclado y lector de pantalla e interrumpir el flujo de interacción actual.',
    ),
    references: [wcag('2.4.3', 'Focus Order', 'A', 'focus-order')],
  },
  focusObscured: {
    id: 'FT-RUNTIME-002',
    title: 'Focused component may be completely obscured',
    severity: 'serious',
    ...impact(
      'A completely obscured focused control can leave keyboard users operating an element they cannot perceive.',
      'Un control con foco completamente oculto puede hacer que usuarios de teclado operen un elemento que no pueden percibir.',
    ),
    references: [wcag('2.4.11', 'Focus Not Obscured (Minimum)', 'AA', 'focus-not-obscured-minimum')],
  },
  spaTitleUnchanged: {
    id: 'FT-RUNTIME-003',
    title: 'SPA route changed without a document title change',
    severity: 'moderate',
    ...impact(
      'A route change without a title update can make the new SPA view harder to identify, but it does not necessarily block the current task.',
      'Un cambio de ruta sin actualizar el título puede dificultar identificar la nueva vista SPA, pero no bloquea necesariamente la tarea actual.',
    ),
    references: [wcag('2.4.2', 'Page Titled', 'A', 'page-titled')],
  },
  spaFocusUnchanged: {
    id: 'FT-RUNTIME-004',
    title: 'SPA route changed without moving focus',
    severity: 'moderate',
    ...impact(
      'Keeping focus in the previous view after navigation can make the new context unclear, but the severity depends strongly on the transition and available landmarks.',
      'Mantener el foco en la vista anterior tras navegar puede hacer poco claro el nuevo contexto, pero la gravedad depende mucho de la transición y de los puntos de referencia disponibles.',
    ),
    references: [wcag('2.4.3', 'Focus Order', 'A', 'focus-order')],
  },
  focusedElementHidden: {
    id: 'FT-RUNTIME-005',
    title: 'Focused element became hidden during interaction',
    severity: 'serious',
    ...impact(
      'When the focused element becomes hidden, users can lose both their visible position and a reliable assistive-technology interaction target.',
      'Cuando el elemento con foco pasa a estar oculto, los usuarios pueden perder tanto su posición visible como un destino fiable para la tecnología de asistencia.',
    ),
    references: [wcag('2.4.3', 'Focus Order', 'A', 'focus-order'), wcag('4.1.2', 'Name, Role, Value', 'A', 'name-role-value')],
  },
  dialogInitialFocus: {
    id: 'FT-APG-001',
    title: 'Dialog opened while focus remained outside',
    severity: 'serious',
    ...impact(
      'A dialog that opens without receiving focus can separate keyboard and screen-reader users from the active task and dialog content.',
      'Un diálogo que se abre sin recibir foco puede separar a usuarios de teclado y lector de pantalla de la tarea activa y del contenido del diálogo.',
    ),
    references: [apgDialog],
  },
  dialogFocusEscape: {
    id: 'FT-APG-002',
    title: 'Focus escaped an open modal dialog',
    severity: 'serious',
    ...impact(
      'Focus escaping a modal can expose background controls that should be inactive and create a confusing or unusable keyboard interaction.',
      'Que el foco escape de un modal puede exponer controles de fondo que deberían estar inactivos y crear una interacción de teclado confusa o inutilizable.',
    ),
    references: [apgDialog],
  },
  dialogRestoreFocus: {
    id: 'FT-APG-003',
    title: 'Dialog closed without restoring focus to a logical target',
    severity: 'moderate',
    ...impact(
      'Failure to restore focus can make users search for their previous position after closing a dialog, but usually leaves the page otherwise operable.',
      'No restaurar el foco puede obligar a buscar de nuevo la posición anterior tras cerrar un diálogo, aunque normalmente la página sigue siendo operable.',
    ),
    references: [apgDialog],
  },
} satisfies Record<string, RuleDefinition>;

const RULES_BY_ID = new Map<string, RuleDefinition>(
  Object.values(RULES).map((rule) => [rule.id, rule]),
);

export function ruleDefinitionForId(ruleId: string): RuleDefinition | undefined {
  return RULES_BY_ID.get(ruleId);
}

export function localizedRuleSeverityRationale(ruleId: string, language: 'en' | 'es'): string | undefined {
  const rationale = ruleDefinitionForId(ruleId)?.severityRationale;
  return rationale?.[language];
}
