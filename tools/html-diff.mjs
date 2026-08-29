function bullets(values) {
  return values.length ? values.map((value) => `- ${value}`).join('\n') : '_None._';
}

export function renderHtmlChangeReport(before, after) {
  const previousElements = new Set(before.obsoleteElements ?? []);
  const currentElements = new Set(after.obsoleteElements ?? []);
  const previousPairs = new Set((before.obsoleteAttributePairs ?? []).map((pair) => `${pair.attribute} on ${pair.element}`));
  const currentPairs = new Set((after.obsoleteAttributePairs ?? []).map((pair) => `${pair.attribute} on ${pair.element}`));
  const addedElements = [...currentElements].filter((value) => !previousElements.has(value));
  const removedElements = [...previousElements].filter((value) => !currentElements.has(value));
  const addedPairs = [...currentPairs].filter((value) => !previousPairs.has(value));
  const removedPairs = [...previousPairs].filter((value) => !currentPairs.has(value));

  return [
    '## WHATWG HTML',
    '',
    `Obsolete elements: **${before.summary?.obsoleteElements ?? 0} → ${after.summary?.obsoleteElements ?? 0}**`,
    `Obsolete attribute/element pairs: **${before.summary?.obsoleteAttributePairs ?? 0} → ${after.summary?.obsoleteAttributePairs ?? 0}**`,
    `Obsolete section content changed: **${before.source?.obsoleteSectionHash !== after.source?.obsoleteSectionHash ? 'yes' : 'no'}**`,
    '',
    '### Added obsolete elements', bullets(addedElements), '',
    '### Removed obsolete elements', bullets(removedElements), '',
    '### Added obsolete attribute pairs', bullets(addedPairs), '',
    '### Removed obsolete attribute pairs', bullets(removedPairs),
  ].join('\n');
}
