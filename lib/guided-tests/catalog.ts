import type { GuidedTestDefinition } from './framework';

export const GUIDED_TESTS: GuidedTestDefinition[] = [
  {
    id: 'FT-GUIDED-001',
    title: { en: 'Sensory characteristics review', es: 'Revisión de características sensoriales' },
    description: {
      en: 'Review instructions and decide whether they rely only on sensory characteristics.',
      es: 'Revisa instrucciones y decide si dependen únicamente de características sensoriales.',
    },
    references: [{
      type: 'WCAG', id: '1.3.3', label: 'Sensory Characteristics',
      url: 'https://www.w3.org/WAI/WCAG22/Understanding/sensory-characteristics.html', level: 'A',
    }],
    coverage: 'guided-manual',
    steps: [
      {
        id: 'review-instructions',
        title: { en: 'Review the page instructions', es: 'Revisa las instrucciones de la página' },
        prompt: {
          en: 'Inspect instructions and labels that tell a user what to select, activate, identify or follow.',
          es: 'Inspecciona instrucciones y etiquetas que indiquen al usuario qué seleccionar, activar, identificar o seguir.',
        },
        answers: ['acknowledged'],
      },
      {
        id: 'judge-sensory-only',
        title: { en: 'Decide whether meaning depends only on sensory cues', es: 'Decide si el significado depende solo de señales sensoriales' },
        prompt: {
          en: 'Do any relevant instructions rely only on color, shape, size, visual position, orientation or sound?',
          es: '¿Alguna instrucción relevante depende únicamente de color, forma, tamaño, posición visual, orientación o sonido?',
        },
        answers: ['pass', 'issue', 'not-applicable', 'uncertain'],
      },
    ],
  },
  {
    id: 'FT-GUIDED-002',
    title: { en: 'Keyboard operability pass', es: 'Recorrido de operabilidad por teclado' },
    description: {
      en: 'Perform a reproducible keyboard-only pass and review pointer-only actions and possible traps.',
      es: 'Realiza un recorrido reproducible solo con teclado y revisa acciones solo de puntero y posibles bloqueos.',
    },
    references: [
      { type: 'WCAG', id: '2.1.1', label: 'Keyboard', url: 'https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html', level: 'A' },
      { type: 'WCAG', id: '2.1.2', label: 'No Keyboard Trap', url: 'https://www.w3.org/WAI/WCAG22/Understanding/no-keyboard-trap.html', level: 'A' },
    ],
    coverage: 'guided-manual',
    steps: [
      {
        id: 'start-keyboard-pass',
        title: { en: 'Start from a known point', es: 'Empieza desde un punto conocido' },
        prompt: {
          en: 'Move focus to the first meaningful control, then continue using only Tab, Shift+Tab, Enter, Space and documented arrow-key interactions.',
          es: 'Lleva el foco al primer control relevante y continúa usando solo Tab, Shift+Tab, Enter, Espacio y las interacciones documentadas con flechas.',
        },
        answers: ['acknowledged'],
      },
      {
        id: 'keyboard-actions',
        title: { en: 'Exercise every available action', es: 'Ejecuta todas las acciones disponibles' },
        prompt: {
          en: 'Can every action that is available with a pointer also be reached and operated from the keyboard?',
          es: '¿Puede alcanzarse y ejecutarse con teclado toda acción disponible mediante puntero?',
        },
        answers: ['pass', 'issue', 'uncertain'],
      },
      {
        id: 'keyboard-traps',
        title: { en: 'Check that focus can move on', es: 'Comprueba que el foco puede continuar' },
        prompt: {
          en: 'Can focus leave each non-modal component using standard or documented keys? Do not count intentional containment inside an open modal dialog as a keyboard trap.',
          es: '¿Puede el foco salir de cada componente no modal mediante teclas estándar o documentadas? No consideres bloqueo la contención intencionada dentro de un diálogo modal abierto.',
        },
        answers: ['pass', 'issue', 'uncertain'],
      },
    ],
  },
  {
    id: 'FT-GUIDED-003',
    title: { en: 'Focus order and visibility review', es: 'Revisión de orden y visibilidad del foco' },
    description: {
      en: 'Review sequential focus order, visible focus and contextual focus movement using existing runtime evidence.',
      es: 'Revisa el orden secuencial, la visibilidad y los movimientos contextuales del foco usando la evidencia runtime existente.',
    },
    references: [
      { type: 'WCAG', id: '2.4.3', label: 'Focus Order', url: 'https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html', level: 'A' },
      { type: 'WCAG', id: '2.4.7', label: 'Focus Visible', url: 'https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html', level: 'AA' },
    ],
    coverage: 'guided-manual',
    steps: [
      {
        id: 'focus-order',
        title: { en: 'Follow the sequential focus order', es: 'Sigue el orden secuencial del foco' },
        prompt: {
          en: 'Tab through the page in both directions. Does the order preserve meaning and operability without unexpected jumps?',
          es: 'Recorre la página con Tab en ambos sentidos. ¿El orden conserva el significado y la operabilidad sin saltos inesperados?',
        },
        answers: ['pass', 'issue', 'uncertain'],
      },
      {
        id: 'focus-indicator',
        title: { en: 'Verify focus remains perceivable', es: 'Verifica que el foco siga siendo perceptible' },
        prompt: {
          en: 'At each step, is the keyboard focus indicator visible and not completely hidden by other content?',
          es: 'En cada paso, ¿el indicador de foco de teclado es visible y no queda completamente oculto por otro contenido?',
        },
        answers: ['pass', 'issue', 'uncertain'],
      },
      {
        id: 'focus-context',
        title: { en: 'Review contextual focus movement', es: 'Revisa los movimientos contextuales del foco' },
        prompt: {
          en: 'After navigation, dynamic updates or closing transient UI, does focus move to a logical destination instead of being lost?',
          es: 'Tras navegación, actualizaciones dinámicas o cerrar UI temporal, ¿el foco se mueve a un destino lógico en lugar de perderse?',
        },
        answers: ['pass', 'issue', 'not-applicable', 'uncertain'],
      },
    ],
  },
  {
    id: 'FT-GUIDED-004',
    title: { en: 'Dialog focus lifecycle', es: 'Ciclo de foco en diálogos' },
    description: {
      en: 'Validate dialog entry, intentional modal containment, Escape/close behavior and focus restoration.',
      es: 'Valida la entrada al diálogo, la contención modal intencionada, Escape/cierre y la restauración del foco.',
    },
    references: [
      { type: 'WCAG', id: '2.1.2', label: 'No Keyboard Trap', url: 'https://www.w3.org/WAI/WCAG22/Understanding/no-keyboard-trap.html', level: 'A' },
      { type: 'WCAG', id: '2.4.3', label: 'Focus Order', url: 'https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html', level: 'A' },
      { type: 'WAI-ARIA APG', id: 'dialog-modal', label: 'Dialog (Modal) Pattern', url: 'https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/' },
    ],
    coverage: 'guided-manual',
    steps: [
      {
        id: 'dialog-entry',
        title: { en: 'Open the dialog and inspect entry focus', es: 'Abre el diálogo y revisa el foco de entrada' },
        prompt: {
          en: 'When the dialog opens, does focus move inside it to a meaningful initial destination?',
          es: 'Al abrirse el diálogo, ¿el foco se mueve dentro a un destino inicial significativo?',
        },
        answers: ['pass', 'issue', 'uncertain'],
      },
      {
        id: 'dialog-containment',
        title: { en: 'Verify modal containment', es: 'Verifica la contención modal' },
        prompt: {
          en: 'While the modal is open, Tab and Shift+Tab may intentionally remain inside it. Mark an issue only if focus escapes unexpectedly or becomes stuck without a documented way to close the dialog.',
          es: 'Mientras el modal esté abierto, Tab y Shift+Tab pueden permanecer intencionadamente dentro. Marca problema solo si el foco escapa de forma inesperada o queda bloqueado sin una forma documentada de cerrar el diálogo.',
        },
        answers: ['pass', 'issue', 'uncertain'],
      },
      {
        id: 'dialog-close',
        title: { en: 'Close and restore focus', es: 'Cierra y restaura el foco' },
        prompt: {
          en: 'Close the dialog using its expected keyboard mechanism, including Escape when supported. Is focus restored to the invoking control or another logical destination?',
          es: 'Cierra el diálogo con su mecanismo de teclado esperado, incluido Escape cuando proceda. ¿Se restaura el foco al control que lo abrió o a otro destino lógico?',
        },
        answers: ['pass', 'issue', 'uncertain'],
      },
    ],
  },
];

export const SAMPLE_GUIDED_TEST = GUIDED_TESTS[0]!;
