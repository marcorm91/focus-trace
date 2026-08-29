import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchWithRetry, normaliseText, sha256, writeJson } from './standards-utils.mjs';

const HTML_OBSOLETE_URL = 'https://html.spec.whatwg.org/multipage/obsolete.html';
const APPROVED_REGISTRY_PATH = 'shared/obsolete-html-registry.ts';
const DEFAULT_OUTPUT = 'generated/html-obsolete-catalog.json';

function decodeEntities(value = '') {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, decimal) => String.fromCodePoint(Number(decimal)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)));
}

function textContent(html = '') {
  return normaliseText(decodeEntities(
    html
      .replace(/<!--([\s\S]*?)-->/g, ' ')
      .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' '),
  ));
}

function sourceDate(html) {
  const match = textContent(html.slice(0, 20_000)).match(/Last\s+Updated\s+(\d{1,2}\s+[A-Za-z]+\s+\d{4})/i);
  return match?.[1] ?? '';
}

function stringLiterals(value = '') {
  return [...value.matchAll(/'([^']+)'/g)].map((match) => match[1]);
}

function parseApprovedRegistry(source) {
  const date = source.match(/HTML_OBSOLETE_SNAPSHOT_DATE\s*=\s*'([^']+)'/)?.[1] ?? '';
  const elementBlock = source.match(/OBSOLETE_ELEMENTS[^=]*=\s*\[([\s\S]*?)\]\s*as const;/)?.[1];
  const attributeBlock = source.match(/OBSOLETE_ATTRIBUTES[^=]*=\s*\[([\s\S]*?)\]\s*as const;/)?.[1];
  if (!date || !elementBlock || !attributeBlock) throw new Error('Could not parse the approved obsolete HTML registry.');

  const elements = [...elementBlock.matchAll(/\btag:\s*'([^']+)'/g)].map((match) => match[1]).sort();
  const namedLists = new Map();
  for (const match of source.matchAll(/const\s+([A-Z][A-Z0-9_]*)\s*=\s*\[([^\]]*)\]\s*as const;/g)) {
    namedLists.set(match[1], stringLiterals(match[2]));
  }

  const attributePairs = [];
  for (const match of attributeBlock.matchAll(/\{\s*attribute:\s*'([^']+)',\s*elements:\s*(\[[^\]]*\]|'\*'|[A-Z][A-Z0-9_]*)\s*,\s*replacement:/g)) {
    const attribute = match[1];
    const expression = match[2];
    if (expression === "'*'") {
      attributePairs.push({ attribute, element: '*' });
      continue;
    }
    const resolved = expression.startsWith('[') ? stringLiterals(expression) : namedLists.get(expression);
    if (!resolved?.length) throw new Error(`Could not resolve obsolete HTML element list ${expression} for ${attribute}.`);
    for (const element of resolved) attributePairs.push({ attribute, element });
  }

  const uniquePairs = new Map(attributePairs.map((pair) => [`${pair.attribute}|${pair.element}`, pair]));
  if (elements.length < 29) throw new Error(`Approved obsolete HTML registry contains only ${elements.length} elements.`);
  if (uniquePairs.size < 80) throw new Error(`Approved obsolete HTML registry contains only ${uniquePairs.size} attribute/element pairs.`);

  return {
    date,
    elements,
    attributePairs: [...uniquePairs.values()].sort((a, b) => `${a.attribute}|${a.element}`.localeCompare(`${b.attribute}|${b.element}`)),
  };
}

function verifyApprovedRegistryIsRepresented(upstreamText, approved) {
  const lower = upstreamText.toLowerCase();
  for (const tag of approved.elements) {
    if (!lower.includes(tag.toLowerCase())) throw new Error(`Approved obsolete element <${tag}> is no longer present in the WHATWG obsolete-features source.`);
  }
  const attributes = new Set(approved.attributePairs.map((pair) => pair.attribute));
  for (const attribute of attributes) {
    if (!lower.includes(attribute.toLowerCase())) throw new Error(`Approved obsolete attribute ${attribute} is no longer present in the WHATWG obsolete-features source.`);
  }
}

export async function syncHtmlObsoleteCatalog(outputPath = DEFAULT_OUTPUT) {
  const [registrySource, response] = await Promise.all([
    readFile(resolve(APPROVED_REGISTRY_PATH), 'utf8'),
    fetchWithRetry(HTML_OBSOLETE_URL, { headers: { 'User-Agent': 'FocusTrace-HTML-Sync' } }),
  ]);
  const html = await response.text();
  const upstreamText = textContent(html);
  const approved = parseApprovedRegistry(registrySource);
  verifyApprovedRegistryIsRepresented(upstreamText, approved);

  const catalog = {
    schemaVersion: 1,
    source: {
      authority: 'WHATWG',
      specification: 'HTML Living Standard',
      url: HTML_OBSOLETE_URL,
      approvedSnapshotDate: approved.date,
      snapshotLabel: sourceDate(html),
      ...(response.headers.get('last-modified') ? { lastModified: response.headers.get('last-modified') } : {}),
      ...(response.headers.get('etag') ? { etag: response.headers.get('etag') } : {}),
      obsoleteSectionHash: sha256(upstreamText),
    },
    summary: {
      obsoleteElements: approved.elements.length,
      obsoleteAttributePairs: approved.attributePairs.length,
      obsoleteButConformingWarnings: 8,
    },
    obsoleteElements: approved.elements,
    obsoleteAttributePairs: approved.attributePairs,
  };

  await writeJson(outputPath, catalog);
  return catalog;
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  const output = process.argv[2] ?? DEFAULT_OUTPUT;
  const catalog = await syncHtmlObsoleteCatalog(output);
  console.log(`HTML obsolete catalog synced: ${catalog.summary.obsoleteElements} approved elements, ${catalog.summary.obsoleteAttributePairs} approved attribute/element pairs; WHATWG source fingerprint ${catalog.source.obsoleteSectionHash.slice(0, 12)}.`);
}
