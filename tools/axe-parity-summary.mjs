import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  loadAxeClassifications,
  validateAxeMappings,
  validateAxeRegistry,
} from './axe-validate.mjs';

async function load(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

const root = process.cwd();
const registry = await load(resolve(root, 'generated/axe-rule-severities.json'));
const mapping = await load(resolve(root, 'config/axe-equivalents.json'));
const axeRuleIds = validateAxeRegistry(registry);
const classifications = await loadAxeClassifications(mapping, root);
const summary = validateAxeMappings(mapping, axeRuleIds, classifications, registry.source.release);

const missingRuleIds = classifications
  .filter((entry) => entry.relationship === 'missing')
  .map((entry) => entry.axeRuleId)
  .sort();
const notApplicableRuleIds = classifications
  .filter((entry) => entry.relationship === 'not-applicable')
  .map((entry) => entry.axeRuleId)
  .sort();

console.log(JSON.stringify({
  benchmark: {
    name: mapping.benchmark.name,
    release: mapping.benchmark.release,
    tag: registry.source.tag,
  },
  summary,
  missingRuleIds,
  notApplicableRuleIds,
}, null, 2));
