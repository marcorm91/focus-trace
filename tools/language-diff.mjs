function asSet(registry) {
  return new Set(registry.subtags ?? []);
}

export function diffLanguageRegistries(before, after) {
  const previous = asSet(before);
  const current = asSet(after);
  const added = [...current].filter((subtag) => !previous.has(subtag)).sort();
  const removed = [...previous].filter((subtag) => !current.has(subtag)).sort();
  const beforeDeprecated = before.deprecated ?? {};
  const afterDeprecated = after.deprecated ?? {};
  const newlyDeprecated = Object.keys(afterDeprecated).filter((subtag) => !beforeDeprecated[subtag]).sort();
  const noLongerDeprecated = Object.keys(beforeDeprecated).filter((subtag) => !afterDeprecated[subtag]).sort();
  return { added, removed, newlyDeprecated, noLongerDeprecated };
}

function render(title, values) {
  if (!values.length) return '';
  return `\n### ${title}\n\n${values.map((value) => `- \`${value}\``).join('\n')}\n`;
}

export function renderLanguageChangeReport(before, after) {
  const diff = diffLanguageRegistries(before, after);
  const lines = [
    '## IANA language subtag registry sync',
    '',
    `- Registry file date: **${after.source?.fileDate ?? 'unknown'}**`,
    `- Known primary language subtags: **${after.summary?.languages ?? after.subtags?.length ?? 0}**`,
    `- Deprecated language subtags: **${after.summary?.deprecated ?? 0}**`,
  ];
  return `${lines.join('\n')}${render('New language subtags', diff.added)}${render('Removed language subtags', diff.removed)}${render('Newly deprecated language subtags', diff.newlyDeprecated)}${render('No longer deprecated language subtags', diff.noLongerDeprecated)}`;
}
