import type { GuidedTestDefinition } from './framework';

export const CONTEXTUAL_GUIDED_TESTS: GuidedTestDefinition[] = [
  {
    id: 'FT-GUIDED-005',
    title: { en: 'Complex table header review', es: 'Revisión de cabeceras de tablas complejas' },
    description: {
      en: 'Review whether complex row, column and grouped headers expose the intended relationships for every data cell.',
      es: 'Revisa si las cabeceras complejas de filas, columnas y grupos exponen las relaciones previstas para cada celda de datos.',
    },
    references: [
      { type: 'WCAG', id: '1.3.1', label: 'Info and Relationships', url: 'https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html', level: 'A' },
      { type: 'HTML', id: 'tables', label: 'HTML table model', url: 'https://html.spec.whatwg.org/multipage/tables.html' },
    ],
    coverage: 'guided-manual',
    steps: [
      {
        id: 'table-scope',
        title: { en: 'Identify the table header model', es: 'Identifica el modelo de cabeceras' },
        prompt: {
          en: 'Inspect the table structure and determine whether each header applies to the intended row, column or group. Use the semantic table evidence already exposed by FocusTrace as context.',
          es: 'Inspecciona la estructura de la tabla y determina si cada cabecera se aplica a la fila, columna o grupo previsto. Usa como contexto la evidencia semántica de tablas ya expuesta por FocusTrace.',
        },
        answers: ['pass', 'issue', 'not-applicable', 'uncertain'],
      },
      {
        id: 'table-groups',
        title: { en: 'Review grouped and multi-level headers', es: 'Revisa cabeceras agrupadas y multinivel' },
        prompt: {
          en: 'For multi-level headers, row groups or column groups, can you determine an unambiguous programmatic relationship between each group header and the cells it describes?',
          es: 'En cabeceras multinivel, grupos de filas o de columnas, ¿puedes determinar una relación programática inequívoca entre cada cabecera de grupo y las celdas que describe?',
        },
        answers: ['pass', 'issue', 'not-applicable', 'uncertain'],
      },
      {
        id: 'table-cell-association',
        title: { en: 'Verify representative data-cell associations', es: 'Verifica asociaciones de celdas de datos' },
        prompt: {
          en: 'Check representative cells across the table. Does each cell expose the headers a user needs to understand its value without relying on visual position alone?',
          es: 'Comprueba celdas representativas de toda la tabla. ¿Expone cada celda las cabeceras necesarias para entender su valor sin depender solo de la posición visual?',
        },
        answers: ['pass', 'issue', 'uncertain'],
      },
    ],
  },
  {
    id: 'FT-GUIDED-006',
    title: { en: 'Form guidance and error recovery', es: 'Instrucciones y recuperación de errores en formularios' },
    description: {
      en: 'Review instructions, error identification, useful suggestions and prevention for consequential submissions without storing field values.',
      es: 'Revisa instrucciones, identificación de errores, sugerencias útiles y prevención en envíos con consecuencias sin guardar valores de campos.',
    },
    references: [
      { type: 'WCAG', id: '3.3.1', label: 'Error Identification', url: 'https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html', level: 'A' },
      { type: 'WCAG', id: '3.3.2', label: 'Labels or Instructions', url: 'https://www.w3.org/WAI/WCAG22/Understanding/labels-or-instructions.html', level: 'A' },
      { type: 'WCAG', id: '3.3.3', label: 'Error Suggestion', url: 'https://www.w3.org/WAI/WCAG22/Understanding/error-suggestion.html', level: 'AA' },
      { type: 'WCAG', id: '3.3.4', label: 'Error Prevention (Legal, Financial, Data)', url: 'https://www.w3.org/WAI/WCAG22/Understanding/error-prevention-legal-financial-data.html', level: 'AA' },
    ],
    coverage: 'guided-manual',
    steps: [
      {
        id: 'form-instructions',
        title: { en: 'Review labels and instructions before input', es: 'Revisa etiquetas e instrucciones antes de introducir datos' },
        prompt: {
          en: 'Before entering anything, are required formats, required fields and other necessary instructions available where the user needs them?',
          es: 'Antes de introducir datos, ¿están disponibles donde se necesitan los formatos obligatorios, campos requeridos y demás instrucciones necesarias?',
        },
        answers: ['pass', 'issue', 'not-applicable', 'uncertain'],
      },
      {
        id: 'form-error-identification',
        title: { en: 'Trigger and identify representative errors', es: 'Provoca e identifica errores representativos' },
        prompt: {
          en: 'Using synthetic test data only, trigger representative validation errors. Is each error identified in text and associated with the field or control that needs correction? Do not record the field value.',
          es: 'Usando solo datos sintéticos de prueba, provoca errores de validación representativos. ¿Se identifica cada error mediante texto y se asocia al campo o control que debe corregirse? No registres el valor del campo.',
        },
        answers: ['pass', 'issue', 'uncertain'],
      },
      {
        id: 'form-error-suggestion',
        title: { en: 'Review correction suggestions', es: 'Revisa las sugerencias de corrección' },
        prompt: {
          en: 'When the correction is known and can be suggested safely, does the error provide a useful suggestion rather than only stating that the value is invalid?',
          es: 'Cuando la corrección se conoce y puede sugerirse de forma segura, ¿ofrece el error una sugerencia útil en lugar de limitarse a indicar que el valor no es válido?',
        },
        answers: ['pass', 'issue', 'not-applicable', 'uncertain'],
      },
      {
        id: 'form-error-prevention',
        title: { en: 'Review prevention for consequential submissions', es: 'Revisa la prevención en envíos con consecuencias' },
        prompt: {
          en: 'For legal, financial or data-changing submissions, can the user reverse, review or confirm the information before the action becomes final?',
          es: 'En envíos legales, financieros o que modifican datos, ¿puede el usuario revertir, revisar o confirmar la información antes de que la acción sea definitiva?',
        },
        answers: ['pass', 'issue', 'not-applicable', 'uncertain'],
      },
    ],
  },
  {
    id: 'FT-GUIDED-007',
    title: { en: 'Resize and reflow manual review', es: 'Revisión manual de resize y reflow' },
    description: {
      en: 'Use FocusTrace resize/reflow baselines, then make the contextual judgement about loss, overlap, clipping and two-dimensional scrolling.',
      es: 'Usa las líneas base de resize/reflow de FocusTrace y realiza después el juicio contextual sobre pérdida, solapamiento, recorte y scroll bidimensional.',
    },
    references: [
      { type: 'WCAG', id: '1.4.4', label: 'Resize Text', url: 'https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html', level: 'AA' },
      { type: 'WCAG', id: '1.4.10', label: 'Reflow', url: 'https://www.w3.org/WAI/WCAG22/Understanding/reflow.html', level: 'AA' },
    ],
    coverage: 'guided-manual',
    steps: [
      {
        id: 'resize-text-200',
        title: { en: 'Review the 200% text-resize state', es: 'Revisa el estado con texto al 200 %' },
        prompt: {
          en: 'Run the existing Resize Text comparison and inspect the 200% state. Is text and text-based UI still readable and usable without loss of content or functionality?',
          es: 'Ejecuta la comparación existente de Resize Text e inspecciona el estado al 200 %. ¿Siguen siendo legibles y utilizables el texto y la UI basada en texto sin pérdida de contenido o funcionalidad?',
        },
        answers: ['pass', 'issue', 'uncertain'],
      },
      {
        id: 'reflow-320',
        title: { en: 'Review the narrow reflow state', es: 'Revisa el estado estrecho de reflow' },
        prompt: {
          en: 'Use the existing Reflow baseline at the 320 CSS px equivalent. Except for content that genuinely requires two dimensions, can the page be read and operated without horizontal scrolling?',
          es: 'Usa la línea base existente de Reflow en el equivalente a 320 px CSS. Salvo contenido que realmente necesite dos dimensiones, ¿puede leerse y operarse la página sin scroll horizontal?',
        },
        answers: ['pass', 'issue', 'uncertain'],
      },
      {
        id: 'resize-reflow-operability',
        title: { en: 'Check overlap, clipping and controls', es: 'Comprueba solapamientos, recortes y controles' },
        prompt: {
          en: 'Across both states, inspect sticky UI, dialogs, form controls and navigation. Is meaningful content visible and are controls still reachable and operable?',
          es: 'En ambos estados, inspecciona UI sticky, diálogos, controles de formulario y navegación. ¿El contenido significativo sigue visible y los controles permanecen alcanzables y operables?',
        },
        answers: ['pass', 'issue', 'uncertain'],
      },
    ],
  },
  {
    id: 'FT-GUIDED-008',
    title: { en: 'Multimedia alternatives review', es: 'Revisión de alternativas multimedia' },
    description: {
      en: 'Judge captions, equivalent alternatives and audio description without copying or storing media, transcript or caption payloads.',
      es: 'Evalúa subtítulos, alternativas equivalentes y audiodescripción sin copiar ni guardar contenido de vídeo, audio, transcripciones o subtítulos.',
    },
    references: [
      { type: 'WCAG', id: '1.2.1', label: 'Audio-only and Video-only (Prerecorded)', url: 'https://www.w3.org/WAI/WCAG22/Understanding/audio-only-and-video-only-prerecorded.html', level: 'A' },
      { type: 'WCAG', id: '1.2.2', label: 'Captions (Prerecorded)', url: 'https://www.w3.org/WAI/WCAG22/Understanding/captions-prerecorded.html', level: 'A' },
      { type: 'WCAG', id: '1.2.3', label: 'Audio Description or Media Alternative (Prerecorded)', url: 'https://www.w3.org/WAI/WCAG22/Understanding/audio-description-or-media-alternative-prerecorded.html', level: 'A' },
      { type: 'WCAG', id: '1.2.5', label: 'Audio Description (Prerecorded)', url: 'https://www.w3.org/WAI/WCAG22/Understanding/audio-description-prerecorded.html', level: 'AA' },
    ],
    coverage: 'guided-manual',
    steps: [
      {
        id: 'media-captions',
        title: { en: 'Review prerecorded captions', es: 'Revisa los subtítulos pregrabados' },
        prompt: {
          en: 'For prerecorded synchronized media, are captions available, synchronized and equivalent enough to convey the spoken information and meaningful sounds? Record only your judgement; do not paste caption text.',
          es: 'En contenido multimedia sincronizado pregrabado, ¿hay subtítulos disponibles, sincronizados y suficientemente equivalentes para transmitir la información hablada y los sonidos significativos? Registra solo tu valoración; no pegues el texto de los subtítulos.',
        },
        answers: ['pass', 'issue', 'not-applicable', 'uncertain'],
      },
      {
        id: 'media-audio-video-only',
        title: { en: 'Review audio-only and video-only alternatives', es: 'Revisa alternativas para audio o vídeo sin sincronizar' },
        prompt: {
          en: 'For prerecorded audio-only or video-only content, is an equivalent alternative provided when the criterion applies? Judge equivalence without copying the transcript or media content into FocusTrace.',
          es: 'En contenido pregrabado solo de audio o solo de vídeo, ¿se ofrece una alternativa equivalente cuando aplica el criterio? Evalúa la equivalencia sin copiar la transcripción ni el contenido multimedia en FocusTrace.',
        },
        answers: ['pass', 'issue', 'not-applicable', 'uncertain'],
      },
      {
        id: 'media-visual-information',
        title: { en: 'Review visual information and audio description', es: 'Revisa información visual y audiodescripción' },
        prompt: {
          en: 'For prerecorded synchronized video, is important visual information conveyed through audio description or an allowed media alternative at the required conformance level? Record the quality judgement only; no media payload is stored.',
          es: 'En vídeo sincronizado pregrabado, ¿se transmite la información visual importante mediante audiodescripción o una alternativa multimedia permitida en el nivel de conformidad requerido? Registra solo la valoración de calidad; no se guarda contenido multimedia.',
        },
        answers: ['pass', 'issue', 'not-applicable', 'uncertain'],
      },
    ],
  },
];
