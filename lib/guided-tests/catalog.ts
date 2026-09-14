import type { GuidedTestDefinition } from './framework';

export const GUIDED_TESTS: GuidedTestDefinition[] = [
  {
    id: 'FT-GUIDED-001',
    title: {
      en: 'Sensory characteristics review',
      es: 'Revisión de características sensoriales',
    },
    description: {
      en: 'Review instructions that tell users how to understand or operate content and decide whether they rely only on shape, color, size, visual position, orientation or sound.',
      es: 'Revisa las instrucciones que indican cómo entender u operar el contenido y decide si dependen únicamente de forma, color, tamaño, posición visual, orientación o sonido.',
    },
    references: [
      {
        type: 'WCAG',
        id: '1.3.3',
        label: 'Sensory Characteristics',
        url: 'https://www.w3.org/WAI/WCAG22/Understanding/sensory-characteristics.html',
        level: 'A',
      },
    ],
    coverage: 'guided-manual',
    steps: [
      {
        id: 'review-instructions',
        title: { en: 'Review the page instructions', es: 'Revisa las instrucciones de la página' },
        prompt: {
          en: 'Inspect instructions and labels that tell a user what to select, activate, identify or follow. Include instructions inside dialogs and expandable content that are relevant to the current task.',
          es: 'Inspecciona instrucciones y etiquetas que indiquen al usuario qué seleccionar, activar, identificar o seguir. Incluye instrucciones de diálogos y contenido desplegable relevantes para la tarea actual.',
        },
        answers: ['acknowledged'],
      },
      {
        id: 'judge-sensory-only',
        title: { en: 'Decide whether meaning depends only on sensory cues', es: 'Decide si el significado depende solo de señales sensoriales' },
        prompt: {
          en: 'Do any relevant instructions rely only on sensory characteristics such as “the green button”, “the field on the right”, “the round icon” or a sound, without another programmatic or textual way to identify the target?',
          es: '¿Alguna instrucción relevante depende únicamente de características sensoriales como «el botón verde», «el campo de la derecha», «el icono redondo» o un sonido, sin otra forma programática o textual de identificar el objetivo?',
        },
        answers: ['pass', 'issue', 'not-applicable', 'uncertain'],
      },
    ],
  },
  {
    id: 'FT-GUIDED-002',
    title: { en: 'Keyboard operability pass', es: 'Recorrido de operabilidad por teclado' },
    description: {
      en: 'Perform the page task using only the keyboard and review sequential navigation plus activation behavior.',
      es: 'Realiza la tarea de la página usando solo el teclado y revisa la navegación secuencial y el comportamiento de activación.',
    },
    references: [
      {
        type: 'WCAG',
        id: '2.1.1',
        label: 'Keyboard',
        url: 'https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html',
        level: 'A',
      },
    ],
    coverage: 'guided-manual',
    steps: [
      {
        id: 'keyboard-sequential-pass',
        title: { en: 'Complete a sequential keyboard pass', es: 'Completa un recorrido secuencial por teclado' },
        prompt: {
          en: 'Start Trace, then use Tab and Shift+Tab from the page start through the task. Do not use the pointer. Confirm that every interactive target you need can be reached.',
          es: 'Inicia Trace y usa Tab y Mayús+Tab desde el inicio de la página durante toda la tarea. No uses el puntero. Confirma que puedes alcanzar todos los objetivos interactivos necesarios.',
        },
        answers: ['pass', 'issue', 'uncertain'],
      },
      {
        id: 'keyboard-activation',
        title: { en: 'Activate controls without the pointer', es: 'Activa controles sin usar el puntero' },
        prompt: {
          en: 'Activate the controls required by the task with their expected keyboard interaction, for example Enter or Space. Record any action that appears available by pointer but cannot be completed from the keyboard.',
          es: 'Activa los controles necesarios para la tarea con su interacción de teclado esperada, por ejemplo Enter o Espacio. Registra cualquier acción disponible con puntero que no pueda completarse con teclado.',
        },
        answers: ['pass', 'issue', 'not-applicable', 'uncertain'],
      },
    ],
  },
  {
    id: 'FT-GUIDED-003',
    title: { en: 'Focus order, indicator and trap review', es: 'Revisión de orden, indicador y bloqueo de foco' },
    description: {
      en: 'Review whether sequential focus stays meaningful, visibly indicated and able to move away from non-modal regions.',
      es: 'Revisa si el foco secuencial mantiene un orden significativo, es visible y puede salir de regiones no modales.',
    },
    references: [
      {
        type: 'WCAG',
        id: '2.4.3',
        label: 'Focus Order',
        url: 'https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html',
        level: 'A',
      },
      {
        type: 'WCAG',
        id: '2.4.7',
        label: 'Focus Visible',
        url: 'https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html',
        level: 'AA',
      },
      {
        type: 'WCAG',
        id: '2.1.2',
        label: 'No Keyboard Trap',
        url: 'https://www.w3.org/WAI/WCAG22/Understanding/no-keyboard-trap.html',
        level: 'A',
      },
    ],
    coverage: 'guided-manual',
    steps: [
      {
        id: 'focus-order-indicator',
        title: { en: 'Review focus order and indicator', es: 'Revisa el orden y el indicador de foco' },
        prompt: {
          en: 'Move sequentially through the current task. Check that focus order preserves meaning and operation and that the focused element has a visible indicator at every step.',
          es: 'Recorre secuencialmente la tarea actual. Comprueba que el orden de foco conserva el significado y la operabilidad y que el elemento enfocado tiene un indicador visible en cada paso.',
        },
        answers: ['pass', 'issue', 'uncertain'],
      },
      {
        id: 'focus-trap-review',
        title: { en: 'Check that keyboard focus can leave', es: 'Comprueba que el foco de teclado puede salir' },
        prompt: {
          en: 'For each non-modal widget or region, verify that focus can move away using standard or documented keyboard commands. Focus cycling inside an active modal dialog is intentional containment and must not be treated as a keyboard trap by itself.',
          es: 'Para cada widget o región no modal, comprueba que el foco puede salir con comandos de teclado estándar o documentados. El ciclo de foco dentro de un diálogo modal activo es contención intencional y no debe tratarse por sí solo como un bloqueo de teclado.',
        },
        answers: ['pass', 'issue', 'not-applicable', 'uncertain'],
      },
    ],
  },
  {
    id: 'FT-GUIDED-004',
    title: { en: 'Dialog focus lifecycle', es: 'Ciclo de foco del diálogo' },
    description: {
      en: 'Open a modal dialog and review focus entry, modal containment, Escape behavior and focus restoration using runtime evidence plus manual judgement.',
      es: 'Abre un diálogo modal y revisa la entrada de foco, la contención modal, el comportamiento de Escape y la restauración del foco usando evidencia runtime y criterio manual.',
    },
    references: [
      {
        type: 'WAI-ARIA APG',
        id: 'dialog-modal',
        label: 'Dialog (Modal) Pattern',
        url: 'https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/',
      },
      {
        type: 'WCAG',
        id: '2.4.3',
        label: 'Focus Order',
        url: 'https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html',
        level: 'A',
      },
      {
        type: 'WCAG',
        id: '2.1.2',
        label: 'No Keyboard Trap',
        url: 'https://www.w3.org/WAI/WCAG22/Understanding/no-keyboard-trap.html',
        level: 'A',
      },
    ],
    coverage: 'guided-manual',
    steps: [
      {
        id: 'dialog-entry',
        title: { en: 'Open the dialog and inspect initial focus', es: 'Abre el diálogo y revisa el foco inicial' },
        prompt: {
          en: 'Open the modal using the keyboard. Confirm that focus is moved to an appropriate element inside the dialog and that the dialog context is understandable.',
          es: 'Abre el modal con el teclado. Confirma que el foco se mueve a un elemento apropiado dentro del diálogo y que el contexto del diálogo es comprensible.',
        },
        answers: ['pass', 'issue', 'not-applicable', 'uncertain'],
      },
      {
        id: 'dialog-containment',
        title: { en: 'Review modal focus containment', es: 'Revisa la contención de foco modal' },
        prompt: {
          en: 'Use Tab and Shift+Tab through the modal. Focus should remain in the active modal. This intentional containment is not a keyboard trap unless the user cannot dismiss or otherwise leave the modal using the expected keyboard interaction.',
          es: 'Usa Tab y Mayús+Tab dentro del modal. El foco debe permanecer en el modal activo. Esta contención intencional no es un bloqueo de teclado salvo que el usuario no pueda cerrar o abandonar el modal con la interacción de teclado esperada.',
        },
        answers: ['pass', 'issue', 'uncertain'],
      },
      {
        id: 'dialog-escape-close',
        title: { en: 'Test Escape and dialog close behavior', es: 'Prueba Escape y el cierre del diálogo' },
        prompt: {
          en: 'When the dialog pattern allows dismissal, press Escape and confirm that the modal closes. If the workflow intentionally prevents Escape, record the documented alternative instead of assuming a failure.',
          es: 'Cuando el patrón del diálogo permita cerrarlo, pulsa Escape y confirma que el modal se cierra. Si el flujo impide Escape de forma intencional, registra la alternativa documentada en lugar de asumir un fallo.',
        },
        answers: ['pass', 'issue', 'not-applicable', 'uncertain'],
      },
      {
        id: 'dialog-restore-focus',
        title: { en: 'Verify focus after close', es: 'Comprueba el foco después del cierre' },
        prompt: {
          en: 'After the dialog closes, verify that focus returns to the invoking control or another logical workflow target. APG permits workflow-specific exceptions, so judge the resulting focus position in context.',
          es: 'Después de cerrar el diálogo, comprueba que el foco vuelve al control que lo abrió o a otro objetivo lógico del flujo. APG permite excepciones según el flujo, así que valora en contexto la posición final del foco.',
        },
        answers: ['pass', 'issue', 'uncertain'],
      },
    ],
  },
];

export const SAMPLE_GUIDED_TEST = GUIDED_TESTS[0]!;
