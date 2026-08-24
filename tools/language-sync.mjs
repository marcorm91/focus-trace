import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchWithRetry, writeJson } from './standards-utils.mjs';

const IANA_LANGUAGE_REGISTRY = 'https://www.iana.org/assignments/language-subtag-registry/language-subtag-registry';
const IANA_GITHUB_MIRROR = 'https://raw.githubusercontent.com/Masterain98/IANA-BCP47/main/src/iana_bcp47/language-subtag-registry.txt';
const DEFAULT_OUTPUT = 'generated/language-subtags.json';

function field(record, name) {
  return record.match(new RegExp(`^${name}:\\s*(.+?)\\s*$`, 'm'))?.[1]?.trim() ?? '';
}

export function parseLanguageSubtagRegistry(source) {
  const fileDate = source.match(/^File-Date:\s*(.+?)\s*$/m)?.[1]?.trim() ?? 'unknown';
  const languages = [];
  const deprecated = {};

  for (const record of source.split(/\r?\n%%\r?\n/)) {
    if (field(record, 'Type').toLowerCase() !== 'language') continue;
    const subtag = field(record, 'Subtag').toLowerCase();
    if (!subtag) continue;
    languages.push(subtag);
    const deprecatedDate = field(record, 'Deprecated');
    if (deprecatedDate) {
      deprecated[subtag] = {
        date: deprecatedDate,
        preferredValue: field(record, 'Preferred-Value') || null,
      };
    }
  }

  languages.sort();
  const sortedDeprecated = Object.fromEntries(Object.entries(deprecated).sort(([a], [b]) => a.localeCompare(b)));

  return {
    schemaVersion: 1,
    source: {
      authority: 'IANA',
      url: IANA_LANGUAGE_REGISTRY,
      fallbackMirror: IANA_GITHUB_MIRROR,
      fileDate,
    },
    summary: {
      languages: languages.length,
      deprecated: Object.keys(sortedDeprecated).length,
    },
    subtags: languages,
    deprecated: sortedDeprecated,
  };
}

async function fetchRegistrySource() {
  const errors = [];
  for (const url of [IANA_LANGUAGE_REGISTRY, IANA_GITHUB_MIRROR]) {
    try {
      const response = await fetchWithRetry(url, { headers: { 'User-Agent': 'FocusTrace-Language-Sync' } }, 2);
      return await response.text();
    } catch (error) {
      errors.push(`${url}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  throw new Error(`Unable to retrieve the IANA language registry. ${errors.join(' | ')}`);
}

async function previousFileDate(outputPath) {
  try {
    const previous = JSON.parse(await readFile(resolve(outputPath), 'utf8'));
    return previous?.source?.fileDate ?? null;
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

export async function syncLanguageSubtags(outputPath = DEFAULT_OUTPUT) {
  const registry = parseLanguageSubtagRegistry(await fetchRegistrySource());
  if (registry.source.fileDate === 'unknown') throw new Error('IANA language registry is missing File-Date.');
  const previous = await previousFileDate(outputPath);
  if (previous && previous !== 'bootstrap' && registry.source.fileDate < previous) {
    throw new Error(`Refusing to replace IANA snapshot ${previous} with older registry ${registry.source.fileDate}.`);
  }
  await writeJson(outputPath, registry);
  return registry;
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  const output = process.argv[2] ?? DEFAULT_OUTPUT;
  const registry = await syncLanguageSubtags(output);
  console.log(`IANA language registry synced: ${registry.summary.languages} primary language subtags (${registry.summary.deprecated} deprecated), File-Date ${registry.source.fileDate}.`);
}
