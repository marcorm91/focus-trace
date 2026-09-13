import { readFile, writeFile } from 'node:fs/promises';

const path = 'lib/audit/media-scan-extension.ts';
let source = await readFile(path, 'utf8');

if (!source.includes("./table-scan-extension")) {
  const importAnchor = "import { appendSpecializedAccessibleNameChecks } from './specialized-accessible-name-scan-extension';";
  if (!source.includes(importAnchor)) throw new Error('Missing table integration import anchor.');
  source = source.replace(
    importAnchor,
    `${importAnchor}\nimport { appendTableRelationshipChecks } from './table-scan-extension';`,
  );

  const callAnchor = '  appendFormErrorReviews(result, root);';
  if (!source.includes(callAnchor)) throw new Error('Missing table integration call anchor.');
  source = source.replace(callAnchor, `  appendTableRelationshipChecks(result, root);\n${callAnchor}`);
  await writeFile(path, source, 'utf8');
}
