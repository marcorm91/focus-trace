import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const AXE_REPOSITORY = 'dequelabs/axe-core';
const AXE_API = `https://api.github.com/repos/${AXE_REPOSITORY}`;
const IMPACTS = ['critical', 'serious', 'moderate', 'minor'];

function githubHeaders() {
  return {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'FocusTrace-standards-sync',
    ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
  };
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: githubHeaders() });
  if (!response.ok) {
    throw new Error(`axe-core sync failed for ${url}: HTTP ${response.status} ${response.statusText}`);
  }
  return response.json();
}

async function mapLimit(items, concurrency, mapper) {
  const results = Array.from({ length: items.length });
  let next = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await mapper(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

async function loadRule(entry, tag) {
  const payload = await fetchJson(`${AXE_API}/contents/${entry.path}?ref=${encodeURIComponent(tag)}`);
  if (payload.type !== 'file' || payload.encoding !== 'base64' || typeof payload.content !== 'string') {
    throw new Error(`Unexpected axe-core rule payload for ${entry.path}.`);
  }
  const json = JSON.parse(Buffer.from(payload.content.replace(/\s/g, ''), 'base64').toString('utf8'));
  const impact = IMPACTS.includes(json.impact) ? json.impact : null;
  return {
    id: json.id,
    impact,
    enabled: json.enabled !== false,
    tags: Array.isArray(json.tags) ? [...json.tags].sort() : [],
  };
}

export async function syncAxeRuleSeverities(output = 'generated/axe-rule-severities.json') {
  const release = await fetchJson(`${AXE_API}/releases/latest`);
  const tag = release.tag_name;
  if (!tag || release.draft || release.prerelease) {
    throw new Error('Latest axe-core release is missing a stable tag.');
  }

  const entries = await fetchJson(`${AXE_API}/contents/lib/rules?ref=${encodeURIComponent(tag)}`);
  if (!Array.isArray(entries)) throw new Error('axe-core lib/rules directory did not return a file list.');

  const ruleEntries = entries
    .filter((entry) => entry.type === 'file' && entry.name?.endsWith('.json'))
    .sort((a, b) => a.name.localeCompare(b.name));
  if (ruleEntries.length < 80) {
    throw new Error(`axe-core rule registry unexpectedly contains only ${ruleEntries.length} JSON files.`);
  }

  const rules = (await mapLimit(ruleEntries, 8, (entry) => loadRule(entry, tag)))
    .filter((rule) => typeof rule.id === 'string' && rule.id.length > 0)
    .sort((a, b) => a.id.localeCompare(b.id));

  const summary = {
    total: rules.length,
    critical: rules.filter((rule) => rule.impact === 'critical').length,
    serious: rules.filter((rule) => rule.impact === 'serious').length,
    moderate: rules.filter((rule) => rule.impact === 'moderate').length,
    minor: rules.filter((rule) => rule.impact === 'minor').length,
    unrated: rules.filter((rule) => rule.impact == null).length,
  };

  const snapshot = {
    schemaVersion: 1,
    source: {
      repository: AXE_REPOSITORY,
      release: String(tag).replace(/^v/, ''),
      tag,
      publishedAt: release.published_at ?? null,
    },
    summary,
    rules,
  };

  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
  return snapshot;
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  const [output = 'generated/axe-rule-severities.json'] = process.argv.slice(2);
  const snapshot = await syncAxeRuleSeverities(output);
  console.log(
    `axe-core ${snapshot.source.release}: ${snapshot.summary.total} rules; ${snapshot.summary.critical} critical, ${snapshot.summary.serious} serious, ${snapshot.summary.moderate} moderate, ${snapshot.summary.minor} minor, ${snapshot.summary.unrated} unrated.`,
  );
}
