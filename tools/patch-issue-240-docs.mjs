import fs from 'node:fs';

const patches = [
  {
    path: 'README.md',
    marker: 'The new guided workflows remain `guided-manual` and `automated: false`; they do not change automated PASS/FAIL totals or axe-core parity.',
    heading: '### Guided table, form, resize and multimedia tests',
    addition: `\n\n### Guided table, form, resize and multimedia tests\n\nThe guided catalog also includes contextual workflows for complex table header associations, form instructions/error recovery, 200% text resize plus 320 CSS px reflow, and prerecorded multimedia alternatives. Each substantive step is mapped to the WCAG criterion branch being judged so the manual answer remains traceable to its normative requirement.\n\nThese workflows deliberately do **not** attach runtime Trace events. Form checks use synthetic test data and the guided layer never reads or stores field values. Multimedia checks store only the auditor's judgement and optional redacted note; FocusTrace does not copy or persist audio, video, captions or transcript payloads.\n\nThe resize/reflow workflow reuses FocusTrace's existing Resize Text and Reflow baselines and asks the auditor for the contextual judgement that measurements alone cannot prove. All four workflows remain \`guided-manual\` / \`automated: false\` and do not change automatic rule or axe-core parity counts.`,
  },
  {
    path: 'README.es.md',
    marker: 'Los nuevos flujos siguen siendo `guided-manual` y `automated: false`; no modifican los totales automáticos PASS/FAIL ni la paridad con axe-core.',
    heading: '### Pruebas guiadas de tablas, formularios, resize y multimedia',
    addition: `\n\n### Pruebas guiadas de tablas, formularios, resize y multimedia\n\nEl catálogo guiado también incluye flujos contextuales para asociaciones complejas de cabeceras de tablas, instrucciones/recuperación de errores en formularios, resize de texto al 200 % más reflow a 320 px CSS y alternativas para multimedia pregrabada. Cada paso sustantivo se vincula al criterio WCAG que se está evaluando para que la respuesta manual quede trazada hasta su requisito normativo.\n\nEstos flujos deliberadamente **no** adjuntan eventos runtime de Trace. Las pruebas de formularios usan datos sintéticos y la capa guiada nunca lee ni guarda valores de campos. Las revisiones multimedia almacenan solo la valoración del auditor y una nota opcional redactada; FocusTrace no copia ni persiste audio, vídeo, subtítulos ni transcripciones.\n\nEl flujo de resize/reflow reutiliza las líneas base existentes de Resize Text y Reflow de FocusTrace y pide al auditor el juicio contextual que las mediciones por sí solas no pueden demostrar. Los cuatro flujos siguen siendo \`guided-manual\` / \`automated: false\` y no modifican los recuentos de reglas automáticas ni la paridad con axe-core.`,
  },
  {
    path: 'docs/RULES.md',
    marker: 'These workflows remain outside automated conformance totals and outside axe-core parity counts.',
    heading: '## Guided table, form, resize and multimedia evidence',
    addition: `\n\n## Guided table, form, resize and multimedia evidence\n\n\`FT-GUIDED-005\` through \`FT-GUIDED-008\` add manual/contextual review for complex table header associations (WCAG 1.3.1), form instructions and error recovery (WCAG 3.3.1–3.3.4), text resize/reflow (WCAG 1.4.4 and 1.4.10), and prerecorded multimedia alternatives (WCAG 1.2.1, 1.2.2, 1.2.3 and 1.2.5). Each substantive guided step has a structured criterion mapping displayed in the UI.\n\nThe table workflow complements static table semantics by asking the auditor to judge whether grouped and multi-level headers describe representative data cells correctly. The form workflow uses synthetic test data and records only the manual judgement; guided code does not read or persist form values. The resize/reflow workflow reuses the existing 200% Resize Text comparison and 320 CSS px Reflow baseline, then asks for the contextual loss/overlap/operability judgement.\n\nThe multimedia workflow records only manual equivalence/quality answers and optional redacted notes. It does not copy or store audio, video, captions or transcript payloads. \`FT-GUIDED-005\` through \`FT-GUIDED-008\` also opt out of runtime Trace evidence attachment, keeping these contextual checks bounded to manual evidence.\n\nAll four remain \`guided-manual\` / \`automated: false\` and remain outside automated PASS/FAIL/REVIEW/WARNING totals and axe-core parity counts.`,
  },
];

for (const patch of patches) {
  const source = fs.readFileSync(patch.path, 'utf8');
  if (source.includes(patch.heading)) continue;
  if (!source.includes(patch.marker)) {
    throw new Error(`Could not find documentation insertion marker in ${patch.path}`);
  }
  fs.writeFileSync(patch.path, source.replace(patch.marker, `${patch.marker}${patch.addition}`));
}

fs.rmSync('tools/patch-issue-240-docs.mjs');
fs.rmSync('.github/workflows/zz-temp-issue-240-docs.yml');
