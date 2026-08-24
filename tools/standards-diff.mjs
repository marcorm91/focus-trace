import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderActChangeReport } from './act-diff.mjs';
import { renderAriaChangeReport } from './aria-diff.mjs';

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
}) {
  const [actBefore, actAfter, ariaBefore, ariaAfter] = await Promise.all([
    load(beforeAct, { summary: {}, rules: [] }),
    load(afterAct, { summary: {}, rules: [] }),
    load(beforeAria, { source: {}, summary: {}, roles: [] }),
    load(afterAria, { source: {}, summary: {}, roles: [] }),
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
  ].join('\n');
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  const [beforeAct, afterAct, beforeAria, afterAria] = process.argv.slice(2);
  if (!beforeAct || !afterAct || !beforeAria || !afterAria) {
    throw new Error('Usage: node tools/standards-diff.mjs <before-act.json> <after-act.json> <before-aria.json> <after-aria.json>');
  }
  process.stdout.write(
    `${await renderStandardsChangeReport({ beforeAct, afterAct, beforeAria, afterAria })}\n`,
  );
}
