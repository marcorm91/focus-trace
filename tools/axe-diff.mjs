import { readFile } from 'node:fs/promises';

async function load(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function indexRules(registry) {
  return new Map(registry.rules.map((rule) => [rule.id, rule]));
}

function formatImpact(impact) {
  return impact ?? 'unrated';
}

export function axeDiffReport(before, after, mapping) {
  const previous = indexRules(before);
  const current = indexRules(after);
  const added = [...current.keys()].filter((id) => !previous.has(id)).sort();
  const removed = [...previous.keys()].filter((id) => !current.has(id)).sort();
  const impactChanges = [...current.keys()]
    .filter((id) => previous.has(id) && previous.get(id).impact !== current.get(id).impact)
    .sort()
    .map((id) => ({ id, before: previous.get(id).impact, after: current.get(id).impact }));

  const mappedAxeIds = new Set(mapping.mappings.flatMap((entry) => entry.axeRuleIds));
  const critical = after.rules.filter((rule) => rule.impact === 'critical').map((rule) => rule.id).sort();
  const mappedCritical = critical.filter((id) => mappedAxeIds.has(id));
  const unmappedCritical = critical.filter((id) => !mappedAxeIds.has(id));

  const lines = [
    '## axe-core severity benchmark',
    '',
    `- Release: \`${before.source.tag || 'bootstrap'}\` → \`${after.source.tag}\``,
    `- Rules: ${before.summary.total} → ${after.summary.total}`,
    `- Critical: ${before.summary.critical} → ${after.summary.critical}`,
    `- Serious: ${before.summary.serious} → ${after.summary.serious}`,
    `- Moderate: ${before.summary.moderate} → ${after.summary.moderate}`,
    `- Minor: ${before.summary.minor} → ${after.summary.minor}`,
    '',
  ];

  if (impactChanges.length > 0) {
    lines.push('### Impact changes', '');
    for (const change of impactChanges) {
      lines.push(`- \`${change.id}\`: ${formatImpact(change.before)} → **${formatImpact(change.after)}**`);
    }
    lines.push('');
  }

  if (added.length > 0) {
    lines.push('### Added axe rules', '', ...added.map((id) => `- \`${id}\` · ${formatImpact(current.get(id).impact)}`), '');
  }
  if (removed.length > 0) {
    lines.push('### Removed axe rules', '', ...removed.map((id) => `- \`${id}\``), '');
  }

  lines.push(
    '### Critical benchmark coverage',
    '',
    `- axe critical rules: **${critical.length}**`,
    `- referenced by current FocusTrace equivalence map: **${mappedCritical.length}**`,
    `- not currently mapped to an equivalent FocusTrace rule: **${unmappedCritical.length}**`,
  );
  if (unmappedCritical.length > 0) {
    lines.push('', 'Unmapped does not automatically mean missing coverage: some axe rules have no equivalent FocusTrace detector or have intentionally different scope.', '', ...unmappedCritical.map((id) => `- \`${id}\``));
  }
  lines.push('');

  return `${lines.join('\n')}\n`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [
    beforePath = '/tmp/axe-before.json',
    afterPath = 'generated/axe-rule-severities.json',
    mappingPath = 'config/axe-equivalents.json',
  ] = process.argv.slice(2);
  const [before, after, mapping] = await Promise.all([load(beforePath), load(afterPath), load(mappingPath)]);
  process.stdout.write(axeDiffReport(before, after, mapping));
}
