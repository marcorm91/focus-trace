import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderActChangeReport } from './act-diff.mjs';
import { renderAriaChangeReport } from './aria-diff.mjs';
import { renderHtmlChangeReport } from './html-diff.mjs';
import { renderLanguageChangeReport } from './language-diff.mjs';
import { renderSourceChangeReport } from './specs-diff.mjs';
import { renderWcagChangeReport } from './wcag-diff.mjs';

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
  beforeWcag,
  afterWcag,
  beforeHtml,
  afterHtml,
  beforeSources,
  afterSources,
}) {
  const [
    actBefore, actAfter, ariaBefore, ariaAfter, languageBefore, languageAfter,
    wcagBefore, wcagAfter, htmlBefore, htmlAfter, sourcesBefore, sourcesAfter,
  ] = await Promise.all([
    load(beforeAct, { summary: {}, rules: [] }),
    load(afterAct, { summary: {}, rules: [] }),
    load(beforeAria, { source: {}, summary: {}, roles: [] }),
    load(afterAria, { source: {}, summary: {}, roles: [] }),
    load(beforeLanguage, { source: {}, summary: {}, subtags: [], deprecated: {} }),
    load(afterLanguage, { source: {}, summary: {}, subtags: [], deprecated: {} }),
    load(beforeWcag, { summary: {}, criteria: [] }),
    load(afterWcag, { summary: {}, criteria: [] }),
    load(beforeHtml, { source: {}, summary: {}, obsoleteElements: [], obsoleteAttributePairs: [] }),
    load(afterHtml, { source: {}, summary: {}, obsoleteElements: [], obsoleteAttributePairs: [] }),
    load(beforeSources, { summary: {}, sources: [] }),
    load(afterSources, { summary: {}, sources: [] }),
  ]);

  return [
    '# FocusTrace standards registry update',
    '',
    'Generated from official/public upstream standards sources. A standards change updates the catalog and opens this review automatically; it does not automatically turn a newly discovered upstream requirement into a FocusTrace FAIL without an implemented evaluator.',
    '',
    renderWcagChangeReport(wcagBefore, wcagAfter), '',
    renderActChangeReport(actBefore, actAfter), '',
    renderAriaChangeReport(ariaBefore, ariaAfter), '',
    renderHtmlChangeReport(htmlBefore, htmlAfter), '',
    renderLanguageChangeReport(languageBefore, languageAfter), '',
    renderSourceChangeReport(sourcesBefore, sourcesAfter), '',
  ].join('\n');
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  const args = process.argv.slice(2);
  if (args.length !== 12) {
    throw new Error('Usage: node tools/standards-diff.mjs <before-act> <after-act> <before-aria> <after-aria> <before-language> <after-language> <before-wcag> <after-wcag> <before-html> <after-html> <before-sources> <after-sources>');
  }
  process.stdout.write(`${await renderStandardsChangeReport({
    beforeAct: args[0], afterAct: args[1], beforeAria: args[2], afterAria: args[3],
    beforeLanguage: args[4], afterLanguage: args[5], beforeWcag: args[6], afterWcag: args[7],
    beforeHtml: args[8], afterHtml: args[9], beforeSources: args[10], afterSources: args[11],
  })}\n`);
}
