function stable(value) {
  return JSON.stringify(value);
}

function rolePropertyMap(registry, predicate = () => true) {
  const map = new Map();
  for (const role of registry.roles ?? []) {
    for (const property of role.properties ?? []) {
      if (!predicate(property)) continue;
      map.set(`${role.name}|${property.name}`, { role: role.name, ...property });
    }
  }
  return map;
}

function setDifference(current, previous) {
  return [...current.entries()]
    .filter(([key]) => !previous.has(key))
    .map(([, value]) => value)
    .sort((a, b) => `${a.role}|${a.name}`.localeCompare(`${b.role}|${b.name}`));
}

export function diffAriaRegistries(before, after) {
  const previousRoles = new Map((before.roles ?? []).map((role) => [role.name, role]));
  const currentRoles = new Map((after.roles ?? []).map((role) => [role.name, role]));
  const addedRoles = [];
  const removedRoles = [];
  const changedRoles = [];
  const newlyDeprecatedRoles = [];
  const reactivatedRoles = [];

  for (const [name, role] of currentRoles) {
    const old = previousRoles.get(name);
    if (!old) {
      addedRoles.push(role);
      continue;
    }
    if (!old.deprecated && role.deprecated) newlyDeprecatedRoles.push(role);
    if (old.deprecated && !role.deprecated) reactivatedRoles.push(role);
    if (stable(old) !== stable(role)) changedRoles.push({ before: old, after: role });
  }
  for (const [name, role] of previousRoles) {
    if (!currentRoles.has(name)) removedRoles.push(role);
  }

  const previousDeprecated = rolePropertyMap(before, (property) => property.deprecated);
  const currentDeprecated = rolePropertyMap(after, (property) => property.deprecated);
  const previousDisallowed = rolePropertyMap(before, (property) => property.disallowed);
  const currentDisallowed = rolePropertyMap(after, (property) => property.disallowed);
  const previousRequired = rolePropertyMap(before, (property) => property.required);
  const currentRequired = rolePropertyMap(after, (property) => property.required);

  const byName = (a, b) => a.name.localeCompare(b.name);
  return {
    addedRoles: addedRoles.sort(byName),
    removedRoles: removedRoles.sort(byName),
    changedRoles: changedRoles.sort((a, b) => a.after.name.localeCompare(b.after.name)),
    newlyDeprecatedRoles: newlyDeprecatedRoles.sort(byName),
    reactivatedRoles: reactivatedRoles.sort(byName),
    newlyDeprecatedProperties: setDifference(currentDeprecated, previousDeprecated),
    noLongerDeprecatedProperties: setDifference(previousDeprecated, currentDeprecated),
    newlyDisallowedProperties: setDifference(currentDisallowed, previousDisallowed),
    newlyRequiredProperties: setDifference(currentRequired, previousRequired),
  };
}

function renderRoles(title, roles) {
  if (!roles.length) return '';
  return `\n### ${title}\n\n${roles.map((role) => `- \`${role.name}\`${role.deprecatedVersion ? ` · deprecated in ARIA ${role.deprecatedVersion}` : ''}`).join('\n')}\n`;
}

function renderPairs(title, pairs) {
  if (!pairs.length) return '';
  return `\n### ${title}\n\n${pairs.map((pair) => `- \`${pair.name}\` on role \`${pair.role}\``).join('\n')}\n`;
}

export function renderAriaChangeReport(before, after) {
  const diff = diffAriaRegistries(before, after);
  const changed = diff.changedRoles.map(({ after: role }) => role);
  const lines = [
    '## WAI-ARIA upstream sync',
    '',
    `- ARIA version: **${after.source?.version ?? 'unknown'}**`,
    `- Roles: **${after.summary?.roles ?? after.roles?.length ?? 0}**`,
    `- Deprecated roles: **${after.summary?.deprecatedRoles ?? 0}**`,
    `- Deprecated role/property pairs: **${after.summary?.deprecatedRolePropertyPairs ?? 0}**`,
  ];

  return `${lines.join('\n')}${renderRoles('New roles', diff.addedRoles)}${renderRoles('Newly deprecated roles', diff.newlyDeprecatedRoles)}${renderRoles('Reactivated roles', diff.reactivatedRoles)}${renderRoles('Removed roles', diff.removedRoles)}${renderPairs('Newly deprecated role/property combinations', diff.newlyDeprecatedProperties)}${renderPairs('No longer deprecated role/property combinations', diff.noLongerDeprecatedProperties)}${renderPairs('Newly prohibited role/property combinations', diff.newlyDisallowedProperties)}${renderPairs('Newly required role/property combinations', diff.newlyRequiredProperties)}${renderRoles('Other changed roles', changed)}`;
}
