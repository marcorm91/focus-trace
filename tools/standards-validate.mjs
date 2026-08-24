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

if (import.meta.url === `file://${process.argv[1]}`) {
  const [actPath = 'generated/act-catalog.json', ariaPath = 'generated/aria-registry.json'] = process.argv.slice(2);
  validateActCatalog(await load(actPath));
  validateAriaRegistry(await load(ariaPath));
  console.log('Standards registries are valid.');
}
