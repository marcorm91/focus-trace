import { readFile } from 'node:fs/promises';

const IMPACTS = new Set(['critical', 'serious', 'moderate', 'minor', null]);
const POLICIES = new Set(['highest-impact', 'reference-only']);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function load(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

export function validateAxeRegistry(registry) {
  assert(registry.schemaVersion >= 1, 'axe registry schemaVersion must be >= 1.');
  assert(registry.source?.repository === 'dequelabs/axe-core', 'axe registry must identify dequelabs/axe-core as its source.');
  assert(/^v\d+\.\d+\.\d+/.test(registry.source?.tag ?? ''), 'axe registry must record a stable release tag.');
  assert(Array.isArray(registry.rules), 'axe registry rules must be an array.');
  assert(registry.rules.length >= 80, 'axe registry unexpectedly contains fewer than 80 rules.');

  const ids = new Set();
  for (const rule of registry.rules) {
    assert(typeof rule.id === 'string' && rule.id.length > 0, 'Every axe rule needs an id.');
    assert(!ids.has(rule.id), `Duplicate axe rule id: ${rule.id}.`);
    ids.add(rule.id);
    assert(IMPACTS.has(rule.impact), `axe rule ${rule.id} has unsupported impact ${String(rule.impact)}.`);
    assert(typeof rule.enabled === 'boolean', `axe rule ${rule.id} must declare enabled.`);
    assert(Array.isArray(rule.tags), `axe rule ${rule.id} must declare tags.`);
  }

  const counts = {
    total: registry.rules.length,
    critical: registry.rules.filter((rule) => rule.impact === 'critical').length,
    serious: registry.rules.filter((rule) => rule.impact === 'serious').length,
    moderate: registry.rules.filter((rule) => rule.impact === 'moderate').length,
    minor: registry.rules.filter((rule) => rule.impact === 'minor').length,
    unrated: registry.rules.filter((rule) => rule.impact == null).length,
  };
  for (const [key, value] of Object.entries(counts)) {
    assert(registry.summary?.[key] === value, `axe summary.${key} does not match the rule registry.`);
  }
  return ids;
}

export function validateAxeMappings(mapping, axeRuleIds) {
  assert(mapping.schemaVersion >= 1, 'axe equivalence mapping schemaVersion must be >= 1.');
  assert(Array.isArray(mapping.mappings), 'axe equivalence mappings must be an array.');
  const focusTraceIds = new Set();
  for (const entry of mapping.mappings) {
    assert(/^FT-[A-Z]+-\d{3}$/.test(entry.focusTraceRuleId), `Invalid FocusTrace rule id in axe mapping: ${entry.focusTraceRuleId}.`);
    assert(!focusTraceIds.has(entry.focusTraceRuleId), `Duplicate FocusTrace axe mapping: ${entry.focusTraceRuleId}.`);
    focusTraceIds.add(entry.focusTraceRuleId);
    assert(POLICIES.has(entry.policy), `Unsupported axe mapping policy ${entry.policy} for ${entry.focusTraceRuleId}.`);
    assert(Array.isArray(entry.axeRuleIds) && entry.axeRuleIds.length > 0, `${entry.focusTraceRuleId} must map to at least one axe rule.`);
    for (const axeRuleId of entry.axeRuleIds) {
      assert(axeRuleIds.has(axeRuleId), `${entry.focusTraceRuleId} references missing axe rule ${axeRuleId}.`);
    }
  }
  return true;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [
    registryPath = 'generated/axe-rule-severities.json',
    mappingPath = 'config/axe-equivalents.json',
  ] = process.argv.slice(2);
  const [registry, mapping] = await Promise.all([load(registryPath), load(mappingPath)]);
  const axeRuleIds = validateAxeRegistry(registry);
  validateAxeMappings(mapping, axeRuleIds);
  console.log(`axe-core severity benchmark is valid: ${registry.summary.total} rules from ${registry.source.tag}.`);
}
