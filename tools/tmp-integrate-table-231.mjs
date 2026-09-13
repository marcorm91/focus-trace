import { readFile, writeFile } from 'node:fs/promises';

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
