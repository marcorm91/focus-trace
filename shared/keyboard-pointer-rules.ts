import type { RuleDefinition } from './rule-catalog';

export const KEYBOARD_OPERABILITY_RULE: RuleDefinition = {
  id: 'FT-RUNTIME-011',
  title: 'Observed custom pointer action may not be keyboard reachable',
  severity: 'serious',
  severityRationale: {
    en: 'A custom action that can be activated with a pointer but is not reachable through sequential keyboard navigation can block keyboard-only users. FocusTrace keeps this as review because an equivalent keyboard path may exist elsewhere in the interface.',
    es: 'Una acción personalizada que puede activarse con puntero pero no es alcanzable mediante navegación secuencial por teclado puede bloquear a usuarios que solo usan teclado. FocusTrace lo mantiene como revisión porque puede existir una vía de teclado equivalente en otra parte de la interfaz.',
  },
  references: [
    {
      type: 'WCAG',
      id: '2.1.1',
      label: 'Keyboard',
      level: 'A',
      status: 'normative',
      url: 'https://www.w3.org/TR/WCAG22/#keyboard',
    },
  ],
};

export const KEYBOARD_TRAP_RULE: RuleDefinition = {
  id: 'FT-RUNTIME-012',
  title: 'Repeated Tab cycle may indicate a keyboard trap',
  severity: 'serious',
  severityRationale: {
    en: 'Repeated Tab navigation cycling through only a subset of the available focus order can prevent keyboard users from leaving a component. FocusTrace keeps this as review because intentional modal containment and documented escape mechanisms can make a bounded cycle appropriate.',
    es: 'La navegación repetida con Tab que recorre solo una parte del orden de foco disponible puede impedir que los usuarios de teclado salgan de un componente. FocusTrace lo mantiene como revisión porque la contención intencionada en modales y los mecanismos de salida documentados pueden hacer apropiado un ciclo acotado.',
  },
  references: [
    {
      type: 'WCAG',
      id: '2.1.2',
      label: 'No Keyboard Trap',
      level: 'A',
      status: 'normative',
      url: 'https://www.w3.org/TR/WCAG22/#no-keyboard-trap',
    },
    {
      type: 'ACT',
      id: 'a1b64e',
      label: 'Focusable element has no keyboard trap via standard navigation',
      status: 'proposed',
      url: 'https://www.w3.org/WAI/standards-guidelines/act/rules/a1b64e/proposed/',
    },
  ],
};

export const POINTER_CANCELLATION_RULE: RuleDefinition = {
  id: 'FT-RUNTIME-013',
  title: 'Pointer action may activate before release',
  severity: 'serious',
  severityRationale: {
    en: 'Triggering functionality on pointer-down can remove the opportunity to abort an accidental activation before release. FocusTrace keeps this as review because WCAG 2.5.2 includes essential-function and undo exceptions that require context.',
    es: 'Activar una funcionalidad al presionar el puntero puede eliminar la oportunidad de cancelar una activación accidental antes de soltarlo. FocusTrace lo mantiene como revisión porque WCAG 2.5.2 incluye excepciones por función esencial y deshacer que requieren contexto.',
  },
  references: [
    {
      type: 'WCAG',
      id: '2.5.2',
      label: 'Pointer Cancellation',
      level: 'A',
      status: 'normative',
      url: 'https://www.w3.org/TR/WCAG22/#pointer-cancellation',
    },
  ],
};

export const KEYBOARD_POINTER_RULES: RuleDefinition[] = [
  KEYBOARD_OPERABILITY_RULE,
  KEYBOARD_TRAP_RULE,
  POINTER_CANCELLATION_RULE,
];
