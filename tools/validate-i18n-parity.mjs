import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SOURCE_ROOTS = ['entrypoints', 'lib', 'shared'];
const SOURCE_EXTENSIONS = /\.(?:ts|tsx)$/;

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

function parseArguments(source, openParen) {
  const args = [];
  let start = openParen + 1;
  let parens = 1;
  let brackets = 0;
  let braces = 0;
  let quote = null;
  let lineComment = false;
  let blockComment = false;

  for (let index = openParen + 1; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];

    if (lineComment) {
      if (char === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (char === '*' && next === '/') {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (char === '\\') index += 1;
      else if (char === quote) quote = null;
      continue;
    }

    if (char === '/' && next === '/') {
      lineComment = true;
      index += 1;
      continue;
    }
    if (char === '/' && next === '*') {
      blockComment = true;
      index += 1;
      continue;
    }
    if (char === '\'' || char === '"' || char === '`') {
      quote = char;
      continue;
    }

    if (char === '(') parens += 1;
    else if (char === ')') {
      parens -= 1;
      if (parens === 0) {
        args.push(source.slice(start, index).trim());
        return args;
      }
    } else if (char === '[') brackets += 1;
    else if (char === ']') brackets -= 1;
    else if (char === '{') braces += 1;
    else if (char === '}') braces -= 1;
    else if (char === ',' && parens === 1 && brackets === 0 && braces === 0) {
      args.push(source.slice(start, index).trim());
      start = index + 1;
    }
  }

  return null;
}

function findCalls(source, name) {
  const calls = [];
  const pattern = new RegExp(`\\b${name}\\s*\\(`, 'g');
  for (const match of source.matchAll(pattern)) {
    const openParen = source.indexOf('(', match.index ?? 0);
    const args = parseArguments(source, openParen);
    if (args) calls.push({ index: match.index ?? 0, args });
  }
  return calls;
}

function literalValue(argument) {
  const value = argument.trim();
  if (value.length < 2) return undefined;
  const quote = value[0];
  if (!['\'', '"', '`'].includes(quote) || value.at(-1) !== quote) return undefined;
  return value.slice(1, -1).trim();
}

function lineFor(source, index) {
  return source.slice(0, index).split('\n').length;
}

const errors = [];
let translationCalls = 0;

for (const path of SOURCE_ROOTS.flatMap(sourceFiles)) {
  const source = readFileSync(path, 'utf8');
  for (const call of findCalls(source, 'tr')) {
    if (source.slice(Math.max(0, call.index - 20), call.index).includes('function ')) continue;
    translationCalls += 1;
    if (call.args.length < 3) {
      errors.push(`${path}:${lineFor(source, call.index)} calls tr(...) without English and Spanish arguments.`);
      continue;
    }
    const english = literalValue(call.args[1]);
    const spanish = literalValue(call.args[2]);
    if (english === '' || spanish === '') {
      errors.push(`${path}:${lineFor(source, call.index)} has an empty English or Spanish translation.`);
    }
  }
}

const catalog = readFileSync('shared/rule-catalog.ts', 'utf8');
const sourceCopy = readFileSync('shared/i18n-source-copy.ts', 'utf8');
const translatedReferenceLabels = new Set(
  [...sourceCopy.matchAll(/^\s{2}'([^']+)'\s*:/gm)].map((match) => match[1]),
);
const referenceLabels = new Set();
for (const helper of ['wcag', 'act']) {
  for (const call of findCalls(catalog, helper)) {
    const label = literalValue(call.args[1] ?? '');
    if (label) referenceLabels.add(label);
  }
}
for (const label of referenceLabels) {
  if (!translatedReferenceLabels.has(label)) {
    errors.push(`shared/i18n-source-copy.ts is missing the Spanish reference label for “${label}”.`);
  }
}

const types = readFileSync('shared/types.ts', 'utf8');
const runtimeKindBlock = types.match(/export type RuntimeEventKind\s*=([\s\S]*?);/)?.[1] ?? '';
const runtimeKinds = new Set([...runtimeKindBlock.matchAll(/'([^']+)'/g)].map((match) => match[1]));
const presentation = readFileSync('lib/runtime/runtime-presentation.ts', 'utf8');
const labelFunction = presentation.match(/export function runtimeEventKindLabel[\s\S]*?(?=export function focusDirectionLabel)/)?.[0] ?? '';
const presentedKinds = new Set([...labelFunction.matchAll(/kind\s*===\s*'([^']+)'/g)].map((match) => match[1]));
const missingRuntimeKinds = [...runtimeKinds].filter((kind) => !presentedKinds.has(kind));
const legacyFocusWalkFallback = missingRuntimeKinds.length === 1
  && missingRuntimeKinds[0] === 'focus-walk-end'
  && labelFunction.includes("tr(language, 'Focus walk finished', 'Recorrido de foco finalizado')");
if (!legacyFocusWalkFallback) {
  for (const kind of missingRuntimeKinds) errors.push(`Runtime event kind “${kind}” has no bilingual label.`);
}
for (const kind of presentedKinds) {
  if (!runtimeKinds.has(kind)) errors.push(`Runtime presentation labels unknown event kind “${kind}”.`);
}

const englishReadme = readFileSync('README.md', 'utf8');
const spanishReadme = readFileSync('README.es.md', 'utf8');
const idPattern = /`(FT-(?:(?:WCAG|WARN|REVIEW|APG)-\d{3}|RUNTIME(?:-ARIA)?-\d{3}))`/g;
const englishIds = new Set([...englishReadme.matchAll(idPattern)].map((match) => match[1]));
const spanishIds = new Set([...spanishReadme.matchAll(idPattern)].map((match) => match[1]));
for (const id of englishIds) if (!spanishIds.has(id)) errors.push(`README.es.md is missing ${id} from the English catalog.`);
for (const id of spanishIds) if (!englishIds.has(id)) errors.push(`README.md is missing ${id} from the Spanish catalog.`);

if (errors.length > 0) {
  console.error('FocusTrace bilingual contracts are inconsistent.');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Bilingual contracts validated across ${translationCalls} tr(...) calls, ${referenceLabels.size} reference labels and ${runtimeKinds.size} runtime event kinds.`);
