import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

function stableRule(rule) {
  return JSON.stringify(rule);
}

export function diffCatalogs(before, after) {
  const previous = new Map((before.rules ?? []).map((rule) => [rule.id, rule]));
  const current = new Map((after.rules ?? []).map((rule) => [rule.id, rule]));

  const added = [];
  const removed = [];
  const changed = [];
  const newlyDeprecated = [];
  const reactivated = [];

  for (const [id, rule] of current) {
    const old = previous.get(id);
    if (!old) {
      added.push(rule);
      continue;
    }
    if (!old.deprecated && rule.deprecated) newlyDeprecated.push(rule);
    if (old.deprecated && !rule.deprecated) reactivated.push(rule);
    if (stableRule(old) !== stableRule(rule)) changed.push({ before: old, after: rule });
  }

  for (const [id, rule] of previous) {
    if (!current.has(id)) removed.push(rule);
  }

  const byId = (a, b) => a.id.localeCompare(b.id);
  return {
    added: added.sort(byId),
    removed: removed.sort(byId),
    changed: changed.sort((a, b) => a.after.id.localeCompare(b.after.id)),
    newlyDeprecated: newlyDeprecated.sort(byId),
    reactivated: reactivated.sort(byId),
  };
}

function renderRuleList(title, rules) {
  if (!rules.length) return '';
  return `\n### ${title}\n\n${rules.map((rule) => `- \`${rule.id}\` — ${rule.name}${rule.wcag?.length ? ` · WCAG ${rule.wcag.join(', ')}` : ''}`).join('\n')}\n`;
}

export function renderActChangeReport(before, after) {
  const diff = diffCatalogs(before, after);
  const changedRules = diff.changed.map(({ after: rule }) => rule);

  const lines = [
    '## ACT Rules upstream sync',
    '',
    `FocusTrace detected a change in the public ACT Rules catalog.`,
    '',
    `- Before: **${before.summary?.total ?? before.rules?.length ?? 0}** rules`,
    `- After: **${after.summary?.total ?? after.rules?.length ?? 0}** rules`,
    `- Active now: **${after.summary?.active ?? 0}**`,
    `- Deprecated now: **${after.summary?.deprecated ?? 0}**`,
    '',
    'This PR only updates the upstream registry snapshot. A new ACT rule is **not automatically treated as an implemented FocusTrace FAIL**; it still needs classification as AUTO, REVIEW, RUNTIME or UNSUPPORTED.',
  ];

  return `${lines.join('\n')}${renderRuleList('New rules', diff.added)}${renderRuleList('Newly deprecated', diff.newlyDeprecated)}${renderRuleList('Reactivated rules', diff.reactivated)}${renderRuleList('Removed rules', diff.removed)}${renderRuleList('Changed rules', changedRules)}`;
}

async function load(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  const [beforePath, afterPath] = process.argv.slice(2);
  if (!beforePath || !afterPath) throw new Error('Usage: node tools/act-diff.mjs <before.json> <after.json>');
  const report = renderActChangeReport(await load(beforePath), await load(afterPath));
  process.stdout.write(`${report}\n`);
}
