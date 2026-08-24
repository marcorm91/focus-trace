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
  assert(registry.schemaVersion >= 1, 'ARIA registry schemaVersion must be >= 1.');
  assert(Array.isArray(registry.roles), 'ARIA registry roles must be an array.');
  assert(registry.roles.length > 0, 'ARIA registry must not be empty.');
  const names = new Set();
  for (const role of registry.roles) {
    assert(role.name, 'Every ARIA role needs a name.');
    assert(!names.has(role.name), `Duplicate ARIA role: ${role.name}`);
    names.add(role.name);
    assert(typeof role.deprecated === 'boolean', `ARIA role ${role.name} must declare deprecated.`);
    assert(Array.isArray(role.properties), `ARIA role ${role.name} must declare properties.`);
    for (const property of role.properties) {
      assert(property.name?.startsWith('aria-'), `ARIA role ${role.name} has invalid property ${property.name}.`);
      assert(['state', 'property'].includes(property.kind), `ARIA ${property.name} on ${role.name} has invalid kind.`);
    }
  }
  assert(registry.summary.roles === registry.roles.length, 'ARIA summary.roles does not match roles length.');
  return true;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [actPath = 'generated/act-catalog.json', ariaPath = 'generated/aria-registry.json'] = process.argv.slice(2);
  validateActCatalog(await load(actPath));
  validateAriaRegistry(await load(ariaPath));
  console.log('Standards registries are valid.');
}
