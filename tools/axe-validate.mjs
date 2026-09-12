import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const IMPACTS = new Set(['critical', 'serious', 'moderate', 'minor', null]);
const POLICIES = new Set(['highest-impact', 'reference-only']);
const RELATIONSHIPS = new Set(['equivalent', 'partial', 'superset', 'overlap', 'missing', 'not-applicable']);
const SOURCE_ROOTS = ['shared', 'lib'];
const RULE_ID_PATTERN = /\b(?:id|ruleId)\s*:\s*['"](FT-(?:(?:WCAG|WARN|REVIEW|APG)-\d{3}|RUNTIME(?:-ARIA)?-\d{3}))['"]/g;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function load(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function sourceFiles(root) {
  const files = [];
  for (const entry of readdirSync(root)) {
    const path = join(root, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) files.push(...sourceFiles(path));
    else if (/\.(?:ts|tsx)$/.test(entry)) files.push(path);
  }
  return files;
}

function definedFocusTraceRuleIds(root) {
  const ids = new Set();
  for (const sourceRoot of SOURCE_ROOTS) {
    const absoluteRoot = resolve(root, sourceRoot);
    for (const path of sourceFiles(absoluteRoot)) {
      const source = readFileSync(path, 'utf8');
      for (const match of source.matchAll(RULE_ID_PATTERN)) ids.add(match[1]);
    }
  }
  assert(ids.size > 0, 'FocusTrace parity validation found no source-defined rule IDs.');
  return ids;
}

export function validateAxeRegistry(registry) {
  assert(registry.schemaVersion >= 1, 'axe registry schemaVersion must be >= 1.');
  assert(registry.source?.repository === 'dequelabs/axe-core', 'axe registry must identify dequelabs/axe-core as its source.');
  assert(/^v\d+\.\d+\.\d+/.test(registry.source?.tag ?? ''), 'axe registry must record a stable release tag.');
  assert(Array.isArray(registry.rules), 'axe registry rules must be an array.');
  assert(registry.rules.length >= 80, 'axe registry unexpectedly contains fewer than 80 rules.');

  const ids = new Set();
  for (const rule of registry.rules) {
    assert(typeof rule.id === 'string' && rule.id.length > 0, 'axe registry rule id must be a non-empty string.');
    assert(!ids.has(rule.id), `duplicate axe registry rule id: ${rule.id}`);
    assert(IMPACTS.has(rule.impact ?? null), `unsupported axe impact for ${rule.id}: ${rule.impact}`);
    assert(typeof rule.enabled === 'boolean', `axe rule ${rule.id} must declare enabled.`);
    assert(Array.isArray(rule.tags), `axe rule ${rule.id} must declare tags.`);
    ids.add(rule.id);
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
    assert(registry.summary?.[key] === value, `axe registry summary ${key} is ${registry.summary?.[key]}, expected ${value}.`);
  }

  return ids;
}

export function summarizeAxeParity(classifications) {
  const summary = {
    total: classifications.length,
    equivalent: 0,
    partial: 0,
    superset: 0,
    overlap: 0,
    missing: 0,
    'not-applicable': 0,
    covered: 0,
  };

  for (const entry of classifications) {
    if (RELATIONSHIPS.has(entry.relationship)) summary[entry.relationship] += 1;
  }
  summary.covered = summary.equivalent + summary.partial + summary.superset + summary.overlap;
  return summary;
}

export async function loadAxeClassifications(mapping, root = process.cwd()) {
  assert(Array.isArray(mapping.classificationFiles) && mapping.classificationFiles.length > 0, 'classificationFiles must be a non-empty array.');
  const chunks = await Promise.all(mapping.classificationFiles.map((path) => load(resolve(root, path))));
  return chunks.flatMap((chunk, index) => {
    assert(chunk.schemaVersion === 1, `classification file ${mapping.classificationFiles[index]} must use schemaVersion 1.`);
    assert(Array.isArray(chunk.classifications), `classification file ${mapping.classificationFiles[index]} must expose classifications.`);
    return chunk.classifications;
  });
}

function validateEvidenceSets(mapping, root) {
  assert(mapping.evidenceSets && typeof mapping.evidenceSets === 'object', 'evidenceSets must be an object.');
  for (const [key, evidence] of Object.entries(mapping.evidenceSets)) {
    assert(/^e\d{2}$/.test(key), `invalid evidence set key: ${key}`);
    assert(Array.isArray(evidence.sources) && evidence.sources.length > 0, `${key} must reference source files.`);
    assert(Array.isArray(evidence.tests) && evidence.tests.length > 0, `${key} must reference tests.`);
    for (const path of [...evidence.sources, ...evidence.tests]) {
      assert(typeof path === 'string' && path.length > 0, `${key} contains an invalid evidence path.`);
      assert(existsSync(resolve(root, path)), `${key} references missing evidence path ${path}.`);
    }
  }
}

export function validateAxeMappings(mapping, axeRuleIds, classifications, expectedRelease, root = process.cwd()) {
  assert(mapping.schemaVersion === 2, 'axe parity config must use schemaVersion 2.');
  assert(mapping.benchmark?.name === 'axe-core', 'benchmark name must be axe-core.');
  assert(mapping.benchmark?.release === expectedRelease, `benchmark release must match generated registry ${expectedRelease}.`);
  assert(typeof mapping.policy === 'string' && mapping.policy.length >= 40, 'parity policy must explain classification semantics.');
  validateEvidenceSets(mapping, root);
  const focusTraceRuleIds = definedFocusTraceRuleIds(root);

  assert(Array.isArray(mapping.severityMappings), 'severityMappings must be an array.');
  const severityMappingIds = new Set();
  for (const entry of mapping.severityMappings) {
    assert(typeof entry.focusTraceRuleId === 'string' && entry.focusTraceRuleId.length > 0, 'severity mapping FocusTrace rule id must be non-empty.');
    assert(focusTraceRuleIds.has(entry.focusTraceRuleId), `severity mapping references unknown FocusTrace rule ${entry.focusTraceRuleId}.`);
    assert(!severityMappingIds.has(entry.focusTraceRuleId), `duplicate severity mapping for ${entry.focusTraceRuleId}`);
    assert(POLICIES.has(entry.policy), `unsupported severity mapping policy for ${entry.focusTraceRuleId}: ${entry.policy}`);
    assert(Array.isArray(entry.axeRuleIds) && entry.axeRuleIds.length > 0, `severity mapping ${entry.focusTraceRuleId} must reference at least one axe rule.`);
    for (const axeRuleId of entry.axeRuleIds) {
      assert(axeRuleIds.has(axeRuleId), `severity mapping ${entry.focusTraceRuleId} references missing axe rule ${axeRuleId}.`);
    }
    severityMappingIds.add(entry.focusTraceRuleId);
  }

  assert(Array.isArray(classifications), 'classifications must be an array.');
  assert(classifications.length === axeRuleIds.size, `expected ${axeRuleIds.size} axe classifications, found ${classifications.length}.`);

  const classified = new Set();
  for (const entry of classifications) {
    assert(typeof entry.axeRuleId === 'string' && axeRuleIds.has(entry.axeRuleId), `classification references unknown axe rule ${entry.axeRuleId}.`);
    assert(!classified.has(entry.axeRuleId), `duplicate axe classification: ${entry.axeRuleId}`);
    assert(RELATIONSHIPS.has(entry.relationship), `unsupported relationship for ${entry.axeRuleId}: ${entry.relationship}`);
    assert(Array.isArray(entry.focusTraceRuleIds), `${entry.axeRuleId} focusTraceRuleIds must be an array.`);
    assert(new Set(entry.focusTraceRuleIds).size === entry.focusTraceRuleIds.length, `${entry.axeRuleId} contains duplicate FocusTrace rule ids.`);

    const requiresFocusTraceRule = !['missing', 'not-applicable'].includes(entry.relationship);
    assert(requiresFocusTraceRule ? entry.focusTraceRuleIds.length > 0 : entry.focusTraceRuleIds.length === 0,
      `${entry.axeRuleId} has inconsistent FocusTrace rule references for relationship ${entry.relationship}.`);
    for (const focusTraceRuleId of entry.focusTraceRuleIds) {
      assert(focusTraceRuleIds.has(focusTraceRuleId), `${entry.axeRuleId} references unknown FocusTrace rule ${focusTraceRuleId}.`);
    }
    assert(typeof entry.rationale === 'string' && entry.rationale.trim().length >= 40, `${entry.axeRuleId} requires a substantive rationale.`);
    assert(Array.isArray(entry.standards) && entry.standards.length > 0, `${entry.axeRuleId} must cite at least one normative standard or benchmark-specific reference.`);
    assert(entry.standards.every((standard) => typeof standard === 'string' && standard.length > 0), `${entry.axeRuleId} contains an invalid standards reference.`);
    assert(typeof entry.evidenceKey === 'string' && mapping.evidenceSets[entry.evidenceKey], `${entry.axeRuleId} references unknown evidence set ${entry.evidenceKey}.`);
    classified.add(entry.axeRuleId);
  }

  for (const axeRuleId of axeRuleIds) {
    assert(classified.has(axeRuleId), `missing axe classification: ${axeRuleId}`);
  }

  const computed = summarizeAxeParity(classifications);
  for (const [key, value] of Object.entries(computed)) {
    assert(mapping.summary?.[key] === value, `parity summary ${key} is ${mapping.summary?.[key]}, expected ${value}.`);
  }

  return computed;
}

async function main() {
  const root = process.cwd();
  const registry = await load(resolve(root, 'generated/axe-rule-severities.json'));
  const mapping = await load(resolve(root, 'config/axe-equivalents.json'));
  const axeRuleIds = validateAxeRegistry(registry);
  const classifications = await loadAxeClassifications(mapping, root);
  const summary = validateAxeMappings(mapping, axeRuleIds, classifications, registry.source.release, root);
  console.log(`axe-core parity benchmark is valid: ${summary.total} rules from ${registry.source.tag}; ${summary.covered} covered, ${summary.missing} missing, ${summary['not-applicable']} not applicable.`);
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) await main();
