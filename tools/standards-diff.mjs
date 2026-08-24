import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderActChangeReport } from './act-diff.mjs';
import { renderAriaChangeReport } from './aria-diff.mjs';
import { renderLanguageChangeReport } from './language-diff.mjs';

async function load(path, fallback) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') return fallback;
    throw error;
  }
}

export async function renderStandardsChangeReport({
  beforeAct,
  afterAct,
  beforeAria,
  afterAria,
  beforeLanguage,
  afterLanguage,
}) {
  const [actBefore, actAfter, ariaBefore, ariaAfter, languageBefore, languageAfter] = await Promise.all([
    load(beforeAct, { summary: {}, rules: [] }),
    load(afterAct, { summary: {}, rules: [] }),
    load(beforeAria, { source: {}, summary: {}, roles: [] }),
    load(afterAria, { source: {}, summary: {}, roles: [] }),
    load(beforeLanguage, { source: {}, summary: {}, subtags: [], deprecated: {} }),
    load(afterLanguage, { source: {}, summary: {}, subtags: [], deprecated: {} }),
  ]);

  return [
    '# FocusTrace standards registry update',
    '',
    'Generated from public upstream standards sources. This PR updates metadata only; it does not automatically turn a newly discovered upstream rule into a FocusTrace FAIL.',
    '',
    renderActChangeReport(actBefore, actAfter),
    '',
    renderAriaChangeReport(ariaBefore, ariaAfter),
    '',
    renderLanguageChangeReport(languageBefore, languageAfter),
    '',
  ].join('\n');
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  const [beforeAct, afterAct, beforeAria, afterAria, beforeLanguage, afterLanguage] = process.argv.slice(2);
  if (!beforeAct || !afterAct || !beforeAria || !afterAria || !beforeLanguage || !afterLanguage) {
    throw new Error('Usage: node tools/standards-diff.mjs <before-act.json> <after-act.json> <before-aria.json> <after-aria.json> <before-language.json> <after-language.json>');
  }
  process.stdout.write(`${await renderStandardsChangeReport({ beforeAct, afterAct, beforeAria, afterAria, beforeLanguage, afterLanguage })}\n`);
}
