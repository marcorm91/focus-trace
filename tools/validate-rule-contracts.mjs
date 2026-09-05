import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SOURCE_ROOTS = ['entrypoints', 'lib', 'shared'];
const SOURCE_EXTENSIONS = /\.(?:ts|tsx)$/;
const RULE_ID = 'FT-(?:(?:WCAG|WARN|REVIEW|APG)-\\d{3}|RUNTIME(?:-ARIA)?-\\d{3})';
const DEFINITION_PATTERN = new RegExp(`\\bid\\s*:\\s*(['\"])(?<id>${RULE_ID})\\1`, 'g');
const LITERAL_PATTERN = new RegExp(`(['\"])(?<id>${RULE_ID})\\1`, 'g');
const ALLOWED_SEVERITIES = new Set(['critical', 'serious', 'moderate', 'minor', 'info']);

function sourceFiles(root) {
  const files = [];
  for (const entry of readdirSync(root)) {
    const path = join(root, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) files.push(...sourceFiles(path));
    else if (SOURCE_EXTENSIONS.test(entry)) files.push(path);
  }
  return files;
}

function stripComments(source) {
  let output = '';
  let quote = null;
  let lineComment = false;
  let blockComment = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];

    if (lineComment) {
      if (char === '\n') {
        lineComment = false;
        output += '\n';
      } else output += ' ';
      continue;
    }

    if (blockComment) {
      if (char === '*' && next === '/') {
        output += '  ';
        blockComment = false;
        index += 1;
      } else output += char === '\n' ? '\n' : ' ';
      continue;
    }

    if (quote) {
      output += char;
      if (char === '\\') {
        output += next ?? '';
        index += 1;
      } else if (char === quote) quote = null;
      continue;
    }

    if (char === '/' && next === '/') {
      output += '  ';
      lineComment = true;
      index += 1;
      continue;
    }
    if (char === '/' && next === '*') {
      output += '  ';
      blockComment = true;
      index += 1;
      continue;
    }
    if (char === '\'' || char === '"' || char === '`') quote = char;
    output += char;
  }

  return output;
}

function bracePairs(source) {
  const pairs = [];
  const stack = [];
  let quote = null;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];

    if (quote) {
      if (char === '\\') index += 1;
      else if (char === quote) quote = null;
      continue;
    }

    if (char === '\'' || char === '"' || char === '`') {
      quote = char;
      continue;
    }
    if (char === '/' && next === '/') {
      index = source.indexOf('\n', index + 2);
      if (index === -1) break;
      continue;
    }
    if (char === '/' && next === '*') {
      const end = source.indexOf('*/', index + 2);
      if (end === -1) break;
      index = end + 1;
      continue;
    }
    if (char === '{') stack.push(index);
    else if (char === '}') {
      const start = stack.pop();
      if (start != null) pairs.push({ start, end: index });
    }
  }

  return pairs;
}

function enclosingObject(source, position) {
  const candidates = bracePairs(source)
    .filter(({ start, end }) => start < position && position < end)
    .sort((a, b) => (a.end - a.start) - (b.end - b.start));
  const range = candidates[0];
  return range ? source.slice(range.start, range.end + 1) : '';
}

const files = SOURCE_ROOTS.flatMap(sourceFiles);
const definitions = new Map();
const literalReferences = new Map();
const errors = [];

for (const path of files) {
  const source = stripComments(readFileSync(path, 'utf8'));

  for (const match of source.matchAll(DEFINITION_PATTERN)) {
    const id = match.groups?.id;
    if (!id) continue;
    const object = enclosingObject(source, match.index ?? 0);
    const previous = definitions.get(id);
    if (previous) {
      errors.push(`Duplicate rule definition ${id}: ${previous.path} and ${path}.`);
      continue;
    }

    const severity = object.match(/\bseverity\s*:\s*['\"]([^'\"]+)['\"]/i)?.[1];
    const references = object.match(/\breferences\s*:\s*\[([\s\S]*?)\]/i)?.[1]?.trim();
    const hasRationale = /\bseverityRationale\s*:|\.\.\.impact\s*\(/.test(object);

    if (!/\btitle\s*:/.test(object)) errors.push(`${id} in ${path} has no title.`);
    if (!severity || !ALLOWED_SEVERITIES.has(severity)) errors.push(`${id} in ${path} has an invalid or missing severity.`);
    if (!references) errors.push(`${id} in ${path} has no non-empty references array.`);
    if (!hasRationale) errors.push(`${id} in ${path} has no bilingual severity rationale.`);
    if (id.startsWith('FT-WCAG-') && !/WCAG|wcag\s*\(/.test(object)) {
      errors.push(`${id} in ${path} is a normative WCAG rule without a WCAG reference.`);
    }

    definitions.set(id, { path });
  }

  for (const match of source.matchAll(LITERAL_PATTERN)) {
    const id = match.groups?.id;
    if (!id) continue;
    const paths = literalReferences.get(id) ?? new Set();
    paths.add(path);
    literalReferences.set(id, paths);
  }
}

if (definitions.size === 0) errors.push('No FocusTrace rule definitions were found.');

for (const [id, paths] of literalReferences) {
  if (!definitions.has(id)) {
    errors.push(`Rule ID ${id} is referenced but has no production rule definition (${[...paths].join(', ')}).`);
  }
}

for (const id of definitions.keys()) {
  if (!literalReferences.has(id)) errors.push(`Rule definition ${id} is unreachable from production source scanning.`);
}

for (const docPath of ['docs/RULES.md', 'docs/SEVERITY-AUDIT.md']) {
  const document = readFileSync(docPath, 'utf8');
  const missing = [...definitions.keys()].filter((id) => !document.includes(id));
  if (missing.length > 0) errors.push(`${docPath} is missing rule IDs: ${missing.join(', ')}`);
}

if (errors.length > 0) {
  console.error('FocusTrace rule contracts are inconsistent.');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Rule contracts validated for ${definitions.size} production rule definitions.`);
