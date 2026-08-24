import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

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

function section(front, key) {
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

function parseInputAspects(front) {
  return section(front, 'input_aspects')
    .split(/\r?\n/)
    .map((line) => line.match(/^\s*-\s*(.*?)(?:\s+#.*)?$/)?.[1]?.trim() ?? '')
    .filter(Boolean);
}

function parseWcagCriteria(front) {
  const requirements = section(front, 'accessibility_requirements');
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

  return {
    id,
    name,
    ruleType,
    deprecated: /^deprecated:\s*/m.test(front),
    wcag: parseWcagCriteria(front),
    inputAspects: parseInputAspects(front),
    source: {
      filename: source.filename ?? '',
      sha: source.sha ?? '',
      url: source.url ?? '',
    },
  };
}

async function fetchWithRetry(url, options = {}, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) throw new Error(`${response.status} ${response.statusText} for ${url}`);
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise((resolveDelay) => setTimeout(resolveDelay, attempt * 750));
    }
  }
  throw lastError;
}

function githubHeaders() {
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'FocusTrace-ACT-Sync',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return headers;
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
    schemaVersion: 1,
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
  const listingResponse = await fetchWithRetry(ACT_RULES_API, { headers: githubHeaders() });
  const listing = await listingResponse.json();
  if (!Array.isArray(listing)) throw new Error('Unexpected ACT _rules directory response.');

  const files = listing.filter((entry) => entry.type === 'file' && entry.name.endsWith('.md') && entry.download_url);
  const rules = await mapLimit(files, CONCURRENCY, async (entry) => {
    const response = await fetchWithRetry(entry.download_url, { headers: { 'User-Agent': 'FocusTrace-ACT-Sync' } });
    const markdown = await response.text();
    return parseActRule(markdown, { filename: entry.name, sha: entry.sha, url: entry.html_url });
  });

  const catalog = buildCatalog(rules);
  const absoluteOutput = resolve(outputPath);
  await mkdir(dirname(absoluteOutput), { recursive: true });
  await writeFile(absoluteOutput, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
  return catalog;
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  const output = process.argv[2] ?? DEFAULT_OUTPUT;
  const catalog = await syncActRules(output);
  console.log(`ACT catalog synced: ${catalog.summary.total} total, ${catalog.summary.active} active, ${catalog.summary.deprecated} deprecated.`);
}
