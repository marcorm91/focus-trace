function bullets(values) {
  return values.length ? values.map((value) => `- ${value}`).join('\n') : '_None._';
}

export function renderSourceChangeReport(before, after) {
  const previous = new Map((before.sources ?? []).map((source) => [source.id, source]));
  const current = new Map((after.sources ?? []).map((source) => [source.id, source]));
  const added = [];
  const removed = [];
  const changed = [];

  for (const [id, source] of current) {
    const old = previous.get(id);
    if (!old) added.push(`${source.label} — ${source.url}`);
    else if (old.contentHash !== source.contentHash) changed.push(`${source.label} — ${source.url}`);
  }
  for (const [id, source] of previous) {
    if (!current.has(id)) removed.push(`${source.label} — ${source.url}`);
  }

  return [
    '## Monitored specification sources',
    '',
    `Sources: **${before.summary?.sources ?? 0} → ${after.summary?.sources ?? 0}**`,
    '',
    '### Added sources', bullets(added), '',
    '### Removed sources', bullets(removed), '',
    '### Content changed', bullets(changed),
  ].join('\n');
}
