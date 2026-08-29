import { readFile } from 'node:fs/promises';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function load(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

export function validateActCatalog(catalog) {
  assert(catalog.schemaVersion >= 2, 'ACT catalog schemaVersion must be >= 2.');
  assert(Array.isArray(catalog.rules), 'ACT catalog rules must be an array.');
  assert(catalog.rules.length > 0, 'ACT catalog must not be empty.');
  const ids = new Set();
  for (const rule of catalog.rules) {
    assert(rule.id && rule.name && rule.ruleType, 'Every ACT rule needs id, name and ruleType.');
    assert(!ids.has(rule.id), `Duplicate ACT rule id: ${rule.id}`);
    ids.add(rule.id);
    assert(typeof rule.deprecated === 'boolean', `ACT ${rule.id} must declare deprecated.`);
    assert(Array.isArray(rule.wcag), `ACT ${rule.id} must declare wcag array.`);
    assert(/^[a-f0-9]{64}$/.test(rule.logicHash), `ACT ${rule.id} has invalid logicHash.`);
  }
  assert(catalog.summary.total === catalog.rules.length, 'ACT summary.total does not match rules length.');
  return true;
}

export function validateAriaRegistry(registry) {
  assert(registry.schemaVersion >= 2, 'ARIA registry schemaVersion must be >= 2.');
  assert(registry.properties && typeof registry.properties === 'object', 'ARIA registry properties must be an object.');
  const propertyNames = new Set(Object.keys(registry.properties));
  for (const [name, kind] of Object.entries(registry.properties)) {
    assert(name.startsWith('aria-'), `Invalid ARIA property name: ${name}.`);
    assert(['state', 'property'].includes(kind), `ARIA ${name} has invalid kind ${kind}.`);
  }

  assert(Array.isArray(registry.roles), 'ARIA registry roles must be an array.');
  assert(registry.roles.length > 0, 'ARIA registry must not be empty.');
  const names = new Set();
  const fields = ['supportedProperties', 'requiredProperties', 'disallowedProperties', 'deprecatedProperties'];
  for (const role of registry.roles) {
    assert(role.name, 'Every ARIA role needs a name.');
    assert(!names.has(role.name), `Duplicate ARIA role: ${role.name}`);
    names.add(role.name);
    assert(typeof role.deprecated === 'boolean', `ARIA role ${role.name} must declare deprecated.`);
    assert(Array.isArray(role.parentRoles), `ARIA role ${role.name} must declare parentRoles.`);
    for (const field of fields) {
      assert(Array.isArray(role[field]), `ARIA role ${role.name} must declare ${field}.`);
      for (const propertyName of role[field]) {
        assert(propertyNames.has(propertyName), `ARIA role ${role.name} references unknown ${propertyName}.`);
      }
    }
  }
  assert(registry.summary.roles === registry.roles.length, 'ARIA summary.roles does not match roles length.');
  assert(registry.summary.properties === propertyNames.size, 'ARIA summary.properties does not match property count.');
  return true;
}

export function validateLanguageRegistry(registry) {
  assert(registry.schemaVersion >= 1, 'IANA language registry schemaVersion must be >= 1.');
  assert(Array.isArray(registry.subtags), 'IANA language registry subtags must be an array.');
  assert(registry.subtags.length > 0, 'IANA language registry must not be empty.');
  const subtags = new Set();
  for (const subtag of registry.subtags) {
    assert(/^[a-z0-9]+$/.test(subtag), `Invalid IANA language subtag: ${subtag}.`);
    assert(!subtags.has(subtag), `Duplicate IANA language subtag: ${subtag}.`);
    subtags.add(subtag);
  }
  assert(registry.summary.languages === registry.subtags.length, 'IANA summary.languages does not match subtag count.');
  for (const subtag of Object.keys(registry.deprecated ?? {})) {
    assert(subtags.has(subtag), `Deprecated IANA language subtag ${subtag} is missing from subtags.`);
  }
  return true;
}

export function validateWcagCatalog(catalog) {
  assert(catalog.schemaVersion >= 1, 'WCAG catalog schemaVersion must be >= 1.');
  assert(Array.isArray(catalog.criteria), 'WCAG criteria must be an array.');
  assert(catalog.criteria.length >= 80, 'WCAG catalog unexpectedly contains fewer than 80 success criteria.');
  const ids = new Set();
  for (const criterion of catalog.criteria) {
    assert(/^\d+\.\d+\.\d+$/.test(criterion.id), `Invalid WCAG criterion id: ${criterion.id}.`);
    assert(!ids.has(criterion.id), `Duplicate WCAG criterion id: ${criterion.id}.`);
    ids.add(criterion.id);
    assert(criterion.title && criterion.url, `WCAG ${criterion.id} must have title and url.`);
    assert(['active', 'removed'].includes(criterion.status), `WCAG ${criterion.id} has invalid status.`);
    if (criterion.status === 'active') assert(['A', 'AA', 'AAA'].includes(criterion.level), `WCAG ${criterion.id} has invalid level.`);
    assert(/^[a-f0-9]{64}$/.test(criterion.logicHash), `WCAG ${criterion.id} has invalid logicHash.`);
  }
  const active = catalog.criteria.filter((criterion) => criterion.status === 'active');
  assert(catalog.summary.active === active.length, 'WCAG summary.active does not match criteria.');
  assert(catalog.summary.total === catalog.criteria.length, 'WCAG summary.total does not match criteria length.');
  return true;
}

export function validateHtmlObsoleteCatalog(catalog) {
  assert(catalog.schemaVersion >= 1, 'HTML obsolete catalog schemaVersion must be >= 1.');
  assert(Array.isArray(catalog.obsoleteElements), 'HTML obsoleteElements must be an array.');
  assert(catalog.obsoleteElements.length >= 29, 'HTML obsolete element catalog unexpectedly contains fewer than 29 entries.');
  assert(new Set(catalog.obsoleteElements).size === catalog.obsoleteElements.length, 'HTML obsolete element catalog contains duplicates.');
  assert(Array.isArray(catalog.obsoleteAttributePairs), 'HTML obsoleteAttributePairs must be an array.');
  assert(catalog.obsoleteAttributePairs.length >= 80, 'HTML obsolete attribute catalog unexpectedly contains fewer than 80 pairs.');
  const pairs = new Set();
  for (const pair of catalog.obsoleteAttributePairs) {
    assert(pair.attribute && pair.element, 'Every HTML obsolete attribute pair needs attribute and element.');
    const key = `${pair.attribute}|${pair.element}`;
    assert(!pairs.has(key), `Duplicate HTML obsolete attribute pair: ${key}.`);
    pairs.add(key);
  }
  assert(/^[a-f0-9]{64}$/.test(catalog.source.obsoleteSectionHash), 'HTML obsoleteSectionHash is invalid.');
  assert(catalog.summary.obsoleteElements === catalog.obsoleteElements.length, 'HTML obsolete element summary is inconsistent.');
  assert(catalog.summary.obsoleteAttributePairs === catalog.obsoleteAttributePairs.length, 'HTML obsolete attribute summary is inconsistent.');
  assert(catalog.summary.obsoleteButConformingWarnings >= 8, 'HTML obsolete-but-conforming warning count is unexpectedly low.');
  return true;
}

export function validateStandardsSources(registry) {
  assert(registry.schemaVersion >= 1, 'Standards source registry schemaVersion must be >= 1.');
  assert(Array.isArray(registry.sources), 'Standards sources must be an array.');
  assert(registry.sources.length >= 10, 'Standards source monitor unexpectedly contains fewer than 10 sources.');
  const ids = new Set();
  for (const source of registry.sources) {
    assert(source.id && source.url && source.authority && source.role, 'Every monitored specification needs id, url, authority and role.');
    assert(!ids.has(source.id), `Duplicate monitored specification id: ${source.id}.`);
    ids.add(source.id);
    assert(['normative', 'informative'].includes(source.role), `Specification ${source.id} has invalid role.`);
    assert(/^[a-f0-9]{64}$/.test(source.contentHash), `Specification ${source.id} has invalid contentHash.`);
  }
  assert(registry.summary.sources === registry.sources.length, 'Standards source summary is inconsistent.');
  return true;
}

export function validateCrossRegistryLinks(actCatalog, wcagCatalog) {
  const wcagIds = new Set(wcagCatalog.criteria.map((criterion) => criterion.id));
  for (const rule of actCatalog.rules) {
    for (const criterion of rule.wcag) {
      assert(wcagIds.has(criterion), `ACT ${rule.id} references WCAG ${criterion}, which is missing from the WCAG catalog.`);
    }
  }
  return true;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [
    actPath = 'generated/act-catalog.json',
    ariaPath = 'generated/aria-registry.json',
    languagePath = 'generated/language-subtags.json',
    wcagPath = 'generated/wcag-catalog.json',
    htmlPath = 'generated/html-obsolete-catalog.json',
    sourcesPath = 'generated/standards-sources.json',
  ] = process.argv.slice(2);
  const [act, aria, language, wcag, html, sources] = await Promise.all([
    load(actPath), load(ariaPath), load(languagePath), load(wcagPath), load(htmlPath), load(sourcesPath),
  ]);
  validateActCatalog(act);
  validateAriaRegistry(aria);
  validateLanguageRegistry(language);
  validateWcagCatalog(wcag);
  validateHtmlObsoleteCatalog(html);
  validateStandardsSources(sources);
  validateCrossRegistryLinks(act, wcag);
  console.log('Standards registries are valid and cross-references are consistent.');
}
