import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchWithRetry, normaliseText, sha256, writeJson } from './standards-utils.mjs';

const HTML_OBSOLETE_URL = 'https://html.spec.whatwg.org/multipage/obsolete.html';
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
  return normaliseText(decodeEntities(html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')));
}

function sourceDate(html) {
  const match = textContent(html.slice(0, 12_000)).match(/Last Updated\s+(\d{1,2}\s+[A-Za-z]+\s+\d{4})/i);
  return match?.[1] ?? '';
}

function sliceBetween(source, startPattern, endPattern) {
  const start = source.search(startPattern);
  if (start < 0) throw new Error(`HTML obsolete parser could not find ${startPattern}.`);
  const tail = source.slice(start);
  const end = tail.search(endPattern);
  return end > 0 ? tail.slice(0, end) : tail;
}

function codeTokens(html = '') {
  return [...html.matchAll(/<code\b[^>]*>([\s\S]*?)<\/code>/gi)]
    .map((match) => textContent(match[1] ?? '').trim().toLowerCase())
    .filter(Boolean);
}

function obsoleteElementNames(nonConformingHtml) {
  const elementArea = sliceBetween(
    nonConformingHtml,
    /Elements in the following list are entirely obsolete/i,
    /The following attributes are obsolete/i,
  );
  const names = [];
  for (const match of elementArea.matchAll(/<dt\b[^>]*>([\s\S]*?)<\/dt>/gi)) {
    for (const token of codeTokens(match[1] ?? '')) {
      if (/^[a-z][a-z0-9-]*$/.test(token)) names.push(token);
    }
  }
  return [...new Set(names)].sort();
}

function obsoleteAttributePairs(nonConformingHtml) {
  const attributeArea = sliceBetween(
    nonConformingHtml,
    /The following attributes are obsolete/i,
    /<h[23]\b[^>]*id=["'][^"']+["'][^>]*>/i,
  );
  const pairs = [];

  for (const match of attributeArea.matchAll(/<dt\b[^>]*>([\s\S]*?)<\/dt>/gi)) {
    const block = match[1] ?? '';
    const marked = block.replace(/<code\b[^>]*>([\s\S]*?)<\/code>/gi, (_, value) => `[[${textContent(value).toLowerCase()}]]`);
    const text = textContent(marked).replace(/\[\s*\[/g, '[[').replace(/\]\s*\]/g, ']]');

    for (const pair of text.matchAll(/\[\[([a-z][a-z0-9-]*)\]\]\s+on\s+(?:the\s+)?\[\[([a-z][a-z0-9-]*)\]\]/gi)) {
      pairs.push({ attribute: pair[1].toLowerCase(), element: pair[2].toLowerCase() });
    }

    const tokens = [...text.matchAll(/\[\[([a-z][a-z0-9-]*)\]\]/gi)].map((token) => token[1].toLowerCase());
    if (/on all html elements|on all elements|global attribute/i.test(text) && tokens[0]) {
      pairs.push({ attribute: tokens[0], element: '*' });
    }
  }

  const unique = new Map(pairs.map((pair) => [`${pair.attribute}|${pair.element}`, pair]));
  return [...unique.values()].sort((a, b) => `${a.attribute}|${a.element}`.localeCompare(`${b.attribute}|${b.element}`));
}

function countObsoleteButConformingWarnings(html) {
  const area = sliceBetween(html, /Warnings for obsolete but conforming features/i, /Non-conforming features/i);
  return [...area.matchAll(/<li\b/gi)].length;
}

export function parseHtmlObsoleteCatalog(html, source = {}) {
  const obsoleteArea = sliceBetween(html, /Obsolete features/i, /IANA considerations|Index/i);
  const nonConforming = sliceBetween(obsoleteArea, /Non-conforming features/i, /Requirements for implementations|IANA considerations|Index/i);
  const elements = obsoleteElementNames(nonConforming);
  const attributePairs = obsoleteAttributePairs(nonConforming);
  const obsoleteButConformingWarnings = countObsoleteButConformingWarnings(obsoleteArea);

  if (elements.length < 29) {
    throw new Error(`HTML obsolete parser found ${elements.length} obsolete elements; expected at least 29.`);
  }
  if (attributePairs.length < 80) {
    throw new Error(`HTML obsolete parser found only ${attributePairs.length} obsolete attribute/element pairs; expected at least 80.`);
  }
  if (obsoleteButConformingWarnings < 8) {
    throw new Error(`HTML obsolete parser found only ${obsoleteButConformingWarnings} obsolete-but-conforming warning cases; expected at least 8.`);
  }

  return {
    schemaVersion: 1,
    source: {
      authority: 'WHATWG',
      specification: 'HTML Living Standard',
      url: HTML_OBSOLETE_URL,
      snapshotLabel: sourceDate(html),
      ...(source.lastModified ? { lastModified: source.lastModified } : {}),
      ...(source.etag ? { etag: source.etag } : {}),
      obsoleteSectionHash: sha256(normaliseText(textContent(obsoleteArea))),
    },
    summary: {
      obsoleteElements: elements.length,
      obsoleteAttributePairs: attributePairs.length,
      obsoleteButConformingWarnings,
    },
    obsoleteElements: elements,
    obsoleteAttributePairs: attributePairs,
  };
}

export async function syncHtmlObsoleteCatalog(outputPath = DEFAULT_OUTPUT) {
  const response = await fetchWithRetry(HTML_OBSOLETE_URL, { headers: { 'User-Agent': 'FocusTrace-HTML-Sync' } });
  const html = await response.text();
  const catalog = parseHtmlObsoleteCatalog(html, {
    lastModified: response.headers.get('last-modified') ?? '',
    etag: response.headers.get('etag') ?? '',
  });
  await writeJson(outputPath, catalog);
  return catalog;
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  const output = process.argv[2] ?? DEFAULT_OUTPUT;
  const catalog = await syncHtmlObsoleteCatalog(output);
  console.log(`HTML obsolete catalog synced: ${catalog.summary.obsoleteElements} elements, ${catalog.summary.obsoleteAttributePairs} attribute/element pairs, ${catalog.summary.obsoleteButConformingWarnings} obsolete-but-conforming warnings.`);
}
