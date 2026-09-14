import fs from 'node:fs';

const additions = {
  'README.md': `

### Guided keyboard, focus and dialog tests

The guided-test framework now includes three runtime-assisted workflows: \`FT-GUIDED-002\` for keyboard-only operability, \`FT-GUIDED-003\` for focus order/indicator/trap review, and \`FT-GUIDED-004\` for modal-dialog focus lifecycle. They reuse the existing Trace/runtime event stream; FocusTrace does not start a second recorder.

Observed focus, key, click and dialog events are stored as bounded **runtime observations** while the auditor's answer remains separate **manual evidence**. Guided outcomes are still \`guided-manual\` and never alter automated PASS/FAIL totals. In particular, focus cycling inside an active modal without a \`dialog-focus-escape\` event is recorded as intentional modal containment and is **not** classified automatically as a keyboard trap.

The dialog workflow covers focus entry, containment, Escape/dismissal behavior and focus restoration. APG behavior is treated contextually: workflow-specific exceptions remain manual judgement rather than deterministic failures. See [\`docs/GUIDED_TESTS.md\`](docs/GUIDED_TESTS.md).
`,
  'README.es.md': `

### Pruebas guiadas de teclado, foco y diálogos

El framework de pruebas guiadas incluye ahora tres flujos asistidos por eventos runtime: \`FT-GUIDED-002\` para operabilidad solo con teclado, \`FT-GUIDED-003\` para revisar orden/indicador/bloqueo de foco y \`FT-GUIDED-004\` para el ciclo de foco de diálogos modales. Reutilizan el flujo existente de eventos de Trace/runtime; FocusTrace no inicia un segundo recorder.

El foco, las teclas, los clics y los eventos de diálogo observados se guardan como **observaciones runtime** acotadas, mientras que la respuesta del auditor sigue siendo **evidencia manual** separada. Los resultados continúan siendo \`guided-manual\` y nunca modifican los totales automáticos PASS/FAIL. En particular, un ciclo de foco dentro de un modal activo sin un evento \`dialog-focus-escape\` se registra como contención modal intencional y **no** se clasifica automáticamente como bloqueo de teclado.

El flujo de diálogos cubre entrada de foco, contención, Escape/cierre y restauración del foco. El comportamiento APG se trata de forma contextual: las excepciones propias del flujo siguen siendo criterio manual y no fallos deterministas. Consulta [\`docs/GUIDED_TESTS.md\`](docs/GUIDED_TESTS.md).
`,
  'docs/RULES.md': `

## Guided keyboard, focus and dialog methodology

\`FT-GUIDED-002\`, \`FT-GUIDED-003\` and \`FT-GUIDED-004\` extend the guided/manual layer with existing runtime evidence. The workflows consume the same bounded \`RuntimeEvent\` stream already produced by Trace, so guided testing does not create a parallel recorder or new inspected-page data channel.

Runtime observations use a dedicated \`runtime-observation\` evidence kind with the source event ID/kind retained when available. Manual answers remain \`manual-answer\` evidence. The two streams are presented separately and all three workflows remain \`coverage: "guided-manual"\` with \`automated: false\`.

Keyboard operability guides a full Tab/Shift+Tab pass and keyboard activation review. Focus review covers meaningful sequential order, visible indicators and potential traps. Repeated focus cycling is contextual evidence only. When a modal is active and no \`dialog-focus-escape\` event occurs, FocusTrace labels the sequence **Observed modal focus containment** rather than a keyboard trap; modal containment is an expected dialog behavior. The dialog workflow then reviews initial focus, containment, Escape/dismissal and post-close focus restoration against WCAG plus the WAI-ARIA APG dialog pattern without converting APG-specific workflow judgement into deterministic failures.
`,
  'docs/GUIDED_TESTS.md': `

## Keyboard, focus and dialog workflows (0.6.1)

The framework currently exposes three runtime-assisted workflows in addition to the original sensory-characteristics sample:

- \`FT-GUIDED-002\` — Keyboard operability pass (WCAG 2.1.1): complete the task with Tab/Shift+Tab and expected keyboard activation, including review of pointer-only actions.
- \`FT-GUIDED-003\` — Focus order, indicator and trap review (WCAG 2.4.3, 2.4.7 and 2.1.2): review sequential meaning, visible focus and whether non-modal regions can be left by keyboard.
- \`FT-GUIDED-004\` — Dialog focus lifecycle (WAI-ARIA APG Dialog pattern plus WCAG 2.4.3 and 2.1.2): review focus entry, modal containment, Escape/dismissal and focus restoration.

These workflows reuse the existing Trace/runtime event stream. Matching focus, keydown, click and dialog events are reduced to bounded \`runtime-observation\` records when a step is saved. The auditor's radio answer is stored separately as \`manual-answer\`; observed events never decide the guided outcome by themselves.

### Modal containment versus keyboard traps

A repeated focus sequence is not sufficient evidence of a keyboard trap. While a modal is active, focus cycling is expected. If FocusTrace sees modal focus movement without \`dialog-focus-escape\`, it records **Observed modal focus containment** and explicitly does not classify that evidence as a trap. A real trap decision remains contextual: the auditor must determine whether the user can dismiss or otherwise leave the interaction with the expected keyboard command. A \`dialog-focus-escape\` event is surfaced separately as observed evidence because it indicates focus moved outside an open modal.
`,
};

for (const [filename, addition] of Object.entries(additions)) {
  const current = fs.readFileSync(filename, 'utf8');
  const marker = addition.trim().split('\n')[0];
  if (!current.includes(marker)) fs.writeFileSync(filename, `${current.trimEnd()}${addition}\n`, 'utf8');
}
