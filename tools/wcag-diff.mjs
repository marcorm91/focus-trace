function bullets(values) {
  return values.length ? values.map((value) => `- ${value}`).join('\n') : '_None._';
}

export function renderWcagChangeReport(before, after) {
  const previous = new Map((before.criteria ?? []).map((criterion) => [criterion.id, criterion]));
  const current = new Map((after.criteria ?? []).map((criterion) => [criterion.id, criterion]));
  const added = [];
  const removed = [];
  const changed = [];

  for (const [id, criterion] of current) {
    const old = previous.get(id);
    if (!old) added.push(`${id} ${criterion.title} (${criterion.level ?? criterion.status})`);
    else if (JSON.stringify(old) !== JSON.stringify(criterion)) changed.push(`${id} ${criterion.title}`);
  }
  for (const [id, criterion] of previous) {
    if (!current.has(id)) removed.push(`${id} ${criterion.title}`);
  }

  return [
    '## WCAG 2.2',
    '',
    `Active criteria: **${before.summary?.active ?? 0} → ${after.summary?.active ?? 0}**`,
    '',
    '### Added', bullets(added), '',
    '### Removed', bullets(removed), '',
    '### Changed', bullets(changed),
  ].join('\n');
}
