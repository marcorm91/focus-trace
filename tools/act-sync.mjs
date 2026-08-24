import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchWithRetry, githubHeaders, normaliseText, sha256, writeJson } from './standards-utils.mjs';

const ACT_REPOSITORY = 'act-rules/act-rules.github.io';
const ACT_REF = 'develop';
const ACT_RULES_API = `https://api.github.com/repos/${ACT_REPOSITORY}/contents/_rules?ref=${ACT_REF}`;
const DEFAULT_OUTPUT = 'generated/act-catalog.json';
const CONCURRENCY = 10;

function cleanScalar(value = '') {
  const trimmed = value.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function frontMatter(markdown) {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match?.[1]) throw new Error('ACT rule is missing YAML front matter.');
  return match[1];
}

function scalar(front, key) {
  const match = front.match(new RegExp(`^${key}:\\s*(.*?)\\s*$`, 'm'));
  return match ? cleanScalar(match[1]) : '';
}

function frontMatterSection(front, key) {
  const lines = front.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trimEnd() === `${key}:`);
  if (start < 0) return '';

  const collected = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line && !/^\s/.test(line) && /^[A-Za-z0-9_-]+:/.test(line)) break;
    collected.push(line);
  }
  return collected.join('\n');
}

function markdownSection(markdown, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = markdown.match(new RegExp(`^##\\s+${escaped}\\s*$([\\s\\S]*?)(?=^##\\s+|\\z)`, 'im'));
  if (match?.[1]) return normaliseText(match[1]);

  const start = markdown.search(new RegExp(`^##\\s+${escaped}\\s*$`, 'im'));
  if (start < 0) return '';
  const afterHeading = markdown.slice(start).replace(/^##[^\n]*\n?/i, '');
  const nextHeading = afterHeading.search(/^##\s+/m);
  return normaliseText(nextHeading >= 0 ? afterHeading.slice(0, nextHeading) : afterHeading);
}

function parseInputAspects(front) {
  return frontMatterSection(front, 'input_aspects')
    .split(/\r?\n/)
    .map((line) => line.match(/^\s*-\s*(.*?)(?:\s+#.*)?$/)?.[1]?.trim() ?? '')
    .filter(Boolean)
    .sort();
}

function parseWcagCriteria(front) {
  const requirements = frontMatterSection(front, 'accessibility_requirements');
  const criteria = new Set();
  for (const match of requirements.matchAll(/^\s*wcag(?:20|21|22):([0-9]+(?:\.[0-9]+)+):/gm)) {
    if (match[1]) criteria.add(match[1]);
  }
  return [...criteria].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

export function parseActRule(markdown, source = {}) {
  const front = frontMatter(markdown);
  const id = scalar(front, 'id');
  const name = scalar(front, 'name');
  const ruleType = scalar(front, 'rule_type');

  if (!id || !name || !ruleType) {
    throw new Error(`ACT rule ${source.filename ?? '<unknown>'} is missing id, name or rule_type.`);
  }

  const deprecated = /^deprecated:\s*/m.test(front);
  const wcag = parseWcagCriteria(front);
  const inputAspects = parseInputAspects(front);
  const applicability = markdownSection(markdown, 'Applicability');
  const expectation = markdownSection(markdown, 'Expectation');
  const logicHash = sha256(JSON.stringify({ id, ruleType, deprecated, wcag, inputAspects, applicability, expectation }));

  return {
    id,
    name,
    ruleType,
    deprecated,
    wcag,
    inputAspects,
    logicHash,
    source: {
      filename: source.filename ?? '',
      url: source.url ?? '',
    },
  };
}

async function mapLimit(items, limit, mapper) {
  const results = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

export function buildCatalog(rules) {
  const sorted = [...rules].sort((a, b) => a.id.localeCompare(b.id));
  const active = sorted.filter((rule) => !rule.deprecated);

  return {
    schemaVersion: 2,
    source: {
      repository: ACT_REPOSITORY,
      ref: ACT_REF,
      rulesDirectory: '_rules',
    },
    summary: {
      total: sorted.length,
      active: active.length,
      deprecated: sorted.length - active.length,
      atomic: sorted.filter((rule) => rule.ruleType === 'atomic').length,
      composite: sorted.filter((rule) => rule.ruleType === 'composite').length,
      wcagMapped: sorted.filter((rule) => rule.wcag.length > 0).length,
    },
    rules: sorted,
  };
}

export async function syncActRules(outputPath = DEFAULT_OUTPUT) {
  const listingResponse = await fetchWithRetry(ACT_RULES_API, { headers: githubHeaders('FocusTrace-ACT-Sync') });
  const listing = await listingResponse.json();
  if (!Array.isArray(listing)) throw new Error('Unexpected ACT _rules directory response.');

  const files = listing.filter((entry) => entry.type === 'file' && entry.name.endsWith('.md') && entry.download_url);
  const rules = await mapLimit(files, CONCURRENCY, async (entry) => {
    const response = await fetchWithRetry(entry.download_url, { headers: { 'User-Agent': 'FocusTrace-ACT-Sync' } });
    const markdown = await response.text();
    return parseActRule(markdown, { filename: entry.name, url: entry.html_url });
  });

  const catalog = buildCatalog(rules);
  await writeJson(outputPath, catalog);
  return catalog;
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  const output = process.argv[2] ?? DEFAULT_OUTPUT;
  const catalog = await syncActRules(output);
  console.log(`ACT catalog synced: ${catalog.summary.total} total, ${catalog.summary.active} active, ${catalog.summary.deprecated} deprecated.`);
}
