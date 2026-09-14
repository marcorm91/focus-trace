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
        title: {
          en: 'Review the page instructions',
          es: 'Revisa las instrucciones de la página',
        },
        prompt: {
          en: 'Inspect instructions and labels that tell a user what to select, activate, identify or follow. Include instructions inside dialogs and expandable content that are relevant to the current task.',
          es: 'Inspecciona instrucciones y etiquetas que indiquen al usuario qué seleccionar, activar, identificar o seguir. Incluye instrucciones de diálogos y contenido desplegable relevantes para la tarea actual.',
        },
        answers: ['acknowledged'],
      },
      {
        id: 'judge-sensory-only',
        title: {
          en: 'Decide whether meaning depends only on sensory cues',
          es: 'Decide si el significado depende solo de señales sensoriales',
        },
        prompt: {
          en: 'Do any relevant instructions rely only on sensory characteristics such as “the green button”, “the field on the right”, “the round icon” or a sound, without another programmatic or textual way to identify the target?',
          es: '¿Alguna instrucción relevante depende únicamente de características sensoriales como «el botón verde», «el campo de la derecha», «el icono redondo» o un sonido, sin otra forma programática o textual de identificar el objetivo?',
        },
        answers: ['pass', 'issue', 'not-applicable', 'uncertain'],
      },
    ],
  },
];

export const SAMPLE_GUIDED_TEST = GUIDED_TESTS[0]!;

export function guidedTestById(id: string): GuidedTestDefinition | undefined {
  return GUIDED_TESTS.find((test) => test.id === id);
}
