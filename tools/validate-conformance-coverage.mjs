import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const contractPath = resolve(root, 'config/conformance-coverage.json');
const productionRoots = ['lib', 'shared'];
const requiredDimensions = ['positive', 'negative', 'inapplicable', 'exception'];
const allowedBehaviors = new Set(['fail', 'review', 'warning']);
const rulePattern = /\bFT-WCAG-\d{3}\b/g;

function fail(message) {
  console.error(`Conformance coverage validation failed: ${message}`);
  process.exitCode = 1;
}

function sourceFiles(directory) {
  if (!existsSync(directory)) return [];
  const files = [];
  for (const entry of readdirSync(directory)) {
    const path = resolve(directory, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) files.push(...sourceFiles(path));
    else if (/\.(?:ts|tsx|js|mjs)$/.test(entry)) files.push(path);
  }
  return files;
}

if (!existsSync(contractPath)) {
  fail('config/conformance-coverage.json is missing.');
} else {
  const contract = JSON.parse(readFileSync(contractPath, 'utf8'));
  const discovered = new Set();

  for (const sourceRoot of productionRoots) {
    for (const path of sourceFiles(resolve(root, sourceRoot))) {
      const source = readFileSync(path, 'utf8');
      for (const match of source.matchAll(rulePattern)) discovered.add(match[0]);
    }
  }

  const productionRules = [...discovered].sort();
  const contractRules = Object.keys(contract.rules ?? {}).sort();
  const missing = productionRules.filter((ruleId) => !contractRules.includes(ruleId));
  const stale = contractRules.filter((ruleId) => !productionRules.includes(ruleId));

  if (contract.schemaVersion !== 1) fail('schemaVersion must be 1.');
  if (contract.ruleFamily !== 'FT-WCAG') fail('ruleFamily must be FT-WCAG.');
  if (JSON.stringify(contract.dimensions) !== JSON.stringify(requiredDimensions)) {
    fail(`dimensions must be exactly ${requiredDimensions.join(', ')}.`);
  }
  if (missing.length) fail(`production rules missing from the contract: ${missing.join(', ')}.`);
  if (stale.length) fail(`contract rules not found in production: ${stale.join(', ')}.`);

  for (const [ruleId, rule] of Object.entries(contract.rules ?? {})) {
    if (!allowedBehaviors.has(rule.behavior)) {
      fail(`${ruleId} has unsupported behavior ${JSON.stringify(rule.behavior)}.`);
      continue;
    }

    for (const dimension of requiredDimensions) {
      const coverage = rule[dimension];
      if (!coverage || typeof coverage !== 'object') {
        fail(`${ruleId}.${dimension} is missing.`);
        continue;
      }

      const hasTest = typeof coverage.test === 'string' && coverage.test.trim().length > 0;
      const hasScenario = typeof coverage.scenario === 'string' && coverage.scenario.trim().length >= 12;
      const hasNotApplicable = typeof coverage.notApplicable === 'string' && coverage.notApplicable.trim().length >= 24;

      if (hasTest) {
        if (!hasScenario) fail(`${ruleId}.${dimension} must describe the tested scenario.`);
        const testPath = resolve(root, coverage.test);
        if (!coverage.test.startsWith('tests/') || !existsSync(testPath)) {
          fail(`${ruleId}.${dimension} references missing test ${coverage.test}.`);
        }
        if (hasNotApplicable) fail(`${ruleId}.${dimension} cannot declare both test and notApplicable.`);
      } else if (!hasNotApplicable) {
        fail(`${ruleId}.${dimension} must reference a test or give a notApplicable rationale.`);
      }
    }
  }

  const budgets = contract.budgets ?? {};
  if (budgets.criticalRegressions !== 0) fail('criticalRegressions budget must remain zero.');
  if (budgets.knownFalsePositiveRegressions !== 0) fail('knownFalsePositiveRegressions budget must remain zero.');
  if (!Number.isInteger(budgets.rootWideUniversalQueriesPerScan) || budgets.rootWideUniversalQueriesPerScan < 0) {
    fail('rootWideUniversalQueriesPerScan must be a non-negative integer.');
  }

  const browserValidation = contract.browserValidation ?? {};
  for (const browser of ['chrome', 'edge', 'firefox']) {
    if (typeof browserValidation[browser] !== 'string' || browserValidation[browser].length === 0) {
      fail(`browserValidation.${browser} must document its validation mode.`);
    }
  }

  if (!process.exitCode) {
    console.log(
      `Conformance coverage contract valid: ${contractRules.length} FT-WCAG rules, ` +
      `${contractRules.length * requiredDimensions.length} coverage dimensions, zero critical/known-false-positive regression budgets.`,
    );
  }
}
