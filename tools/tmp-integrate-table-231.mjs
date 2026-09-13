import { readFile, writeFile } from 'node:fs/promises';

async function appendSection(path, marker, section) {
  const source = await readFile(path, 'utf8');
  if (source.includes(marker)) return;
  await writeFile(path, `${source.trimEnd()}\n\n${section.trim()}\n`, 'utf8');
}

const mediaPath = 'lib/audit/media-scan-extension.ts';
let media = await readFile(mediaPath, 'utf8');

if (!media.includes("./table-scan-extension")) {
  const importAnchor = "import { appendSpecializedAccessibleNameChecks } from './specialized-accessible-name-scan-extension';";
  if (!media.includes(importAnchor)) throw new Error('Missing table integration import anchor.');
  media = media.replace(
    importAnchor,
    `${importAnchor}\nimport { appendTableRelationshipChecks } from './table-scan-extension';`,
  );

  const callAnchor = '  appendFormErrorReviews(result, root);';
  if (!media.includes(callAnchor)) throw new Error('Missing table integration call anchor.');
  media = media.replace(callAnchor, `  appendTableRelationshipChecks(result, root);\n${callAnchor}`);
  await writeFile(mediaPath, media, 'utf8');
}

const componentPath = 'tests/component-scan.test.ts';
let component = await readFile(componentPath, 'utf8');
if (component.includes('expect(result.rulesRun).toBe(72);')) {
  component = component.replace('expect(result.rulesRun).toBe(72);', 'expect(result.rulesRun).toBe(78);');
  await writeFile(componentPath, component, 'utf8');
}

const evaluatorPath = 'lib/audit/table-relationships.ts';
let evaluator = await readFile(evaluatorPath, 'utf8');
const unused = "const TABLE_ROOT_ROLES = new Set(['table', 'grid', 'treegrid']);\n";
evaluator = evaluator.replace(unused, '');
evaluator = evaluator.replace('for (const [column, span] of [...occupied]) {', 'for (const [column, span] of occupied) {');
evaluator = evaluator.replace('const rowCells = [...row.children].filter(', 'const rowCells = Array.from(row.children).filter(');
await writeFile(evaluatorPath, evaluator, 'utf8');

await appendSection(
  'README.md',
  '### Table names, headers and cell relationships',
  `### Table names, headers and cell relationships

FocusTrace evaluates native HTML tables and explicit ARIA \`table\`, \`grid\` and \`treegrid\` structures with a conservative evidence model. \`FT-WCAG-017\` can report FAIL only when a simple exposed data table has a deterministically missing cell-to-header relationship; spanning, indexed, owned or otherwise ambiguous table models remain REVIEW rather than being promoted to a conformance failure.

\`FT-WARN-025\` reports exposed header cells without usable header text. \`FT-WARN-026\` validates native \`scope\` tokens and their table context. \`FT-WARN-027\` reports \`headers\` IDREFs that are empty, unresolved, point to non-header elements, hidden headers or headers in another table. \`FT-REVIEW-036\` surfaces headers that appear not to describe any data cell, while \`FT-REVIEW-037\` keeps duplicate/caption-like table naming patterns for human review. The same bounded evaluator runs in full-page and component scans.`,
);

await appendSection(
  'README.es.md',
  '### Nombres de tablas, cabeceras y relaciones de celdas',
  `### Nombres de tablas, cabeceras y relaciones de celdas

FocusTrace evalúa tablas HTML nativas y estructuras ARIA explícitas \`table\`, \`grid\` y \`treegrid\` con un modelo de evidencia conservador. \`FT-WCAG-017\` solo puede informar FAIL cuando una tabla de datos simple y expuesta tiene una relación celda-cabecera ausente de forma determinista; los modelos con spans, índices, ownership u otras ambigüedades permanecen como REVIEW en lugar de convertirse en un fallo de conformidad.

\`FT-WARN-025\` informa cabeceras expuestas sin texto de cabecera utilizable. \`FT-WARN-026\` valida los tokens nativos de \`scope\` y su contexto de tabla. \`FT-WARN-027\` informa IDREFs de \`headers\` vacíos, no resueltos o que apuntan a elementos que no son cabecera, cabeceras ocultas o cabeceras de otra tabla. \`FT-REVIEW-036\` señala cabeceras que parecen no describir ninguna celda de datos y \`FT-REVIEW-037\` mantiene para revisión humana patrones de nombre duplicado o similares a un caption. El mismo evaluador acotado se ejecuta en análisis de página completa y de componente.`,
);

await appendSection(
  'docs/RULES.md',
  '## Table names, headers and cell relationships',
  `## Table names, headers and cell relationships

\`FT-WCAG-017\` evaluates the observable cell-to-header relationship subset of WCAG 1.3.1 for native and supported ARIA table models. Simple deterministic missing relationships may FAIL; complex or ambiguous relationships remain REVIEW. \`FT-WARN-025\`, \`FT-WARN-026\` and \`FT-WARN-027\` cover empty headers, invalid native \`scope\` authoring and broken \`headers\` IDREFs. \`FT-REVIEW-036\` and \`FT-REVIEW-037\` cover apparently unused headers and table naming/caption patterns that require human context.

Layout-like native tables without data-table evidence are not converted into deterministic relationship failures. Programmatically hidden table roots are excluded. Component analysis uses the same bounded table evaluator while limiting reported targets to the selected scope.`,
);

await appendSection(
  'docs/SEVERITY-AUDIT.md',
  '## Table relationship severity decisions',
  `## Table relationship severity decisions

- \`FT-WCAG-017\` — **serious**: losing a proven row/column header relationship can remove essential context; FAIL is restricted to deterministic simple cases and ambiguous complex models remain REVIEW.
- \`FT-WARN-025\` — **moderate**: an exposed empty header declares semantics without usable identifying content.
- \`FT-WARN-026\` — **moderate**: invalid or inapplicable \`scope\` authoring can contradict the native table model.
- \`FT-WARN-027\` — **serious**: broken \`headers\` IDREFs explicitly encode an unreliable cell/header relationship.
- \`FT-REVIEW-036\` — **moderate**: a header that appears unused may indicate an incomplete model, but complex layouts need human context.
- \`FT-REVIEW-037\` — **minor**: duplicate or caption-like naming is primarily an identification/usability concern and remains contextual review.`,
);
