import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const config = JSON.parse(readFileSync(resolve('tools/bundle-budgets.json'), 'utf8'));
const TARGETS = ['chrome-mv3', 'edge-mv3', 'firefox-mv3'];
const growthFactor = 1 + config.maxGrowthPercent / 100;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function totalBytes(path) {
  const stat = statSync(path);
  if (stat.isFile()) return stat.size;
  return readdirSync(path).reduce((total, entry) => total + totalBytes(join(path, entry)), 0);
}

function matchingFile(dir, pattern, label) {
  assert(existsSync(dir), `${label} directory is missing: ${dir}`);
  const matches = readdirSync(dir).filter((entry) => pattern.test(entry));
  assert(matches.length === 1, `${label} must resolve to exactly one file; found ${matches.length}.`);
  return join(dir, matches[0]);
}

function budgetFor(key) {
  return Math.ceil(config.baseline[key] * growthFactor);
}

for (const target of TARGETS) {
  const root = resolve('.output', target);
  assert(existsSync(root), `${target} output is missing; build all browser targets before validating bundle size.`);

  const runtime = resolve(root, 'content-scripts/runtime.js');
  const sidepanelJs = matchingFile(resolve(root, 'chunks'), /^sidepanel-.*\.js$/, `${target} sidepanel JS`);
  const sidepanelCss = matchingFile(resolve(root, 'assets'), /^sidepanel-.*\.css$/, `${target} sidepanel CSS`);

  const measured = {
    totalBytes: totalBytes(root),
    runtimeBytes: statSync(runtime).size,
    sidepanelJsBytes: statSync(sidepanelJs).size,
    sidepanelCssBytes: statSync(sidepanelCss).size,
  };

  for (const [key, actual] of Object.entries(measured)) {
    const budget = budgetFor(key);
    assert(
      actual <= budget,
      `${target} ${key} grew beyond the ${config.maxGrowthPercent}% budget: ${actual} B > ${budget} B (baseline ${config.baseline[key]} B).`,
    );
  }

  console.log(`${target} bundle size is within budget: ${JSON.stringify(measured)}`);
}

console.log(`Bundle growth validated against fixed baselines with a ${config.maxGrowthPercent}% maximum increase.`);
