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

function structuralText(html = '') {
  const withCode = html.replace(
    /<code\b[^>]*>([\s\S]*?)<\/code>/gi,
    (_, value) => ` [[${textContent(value).toLowerCase()}]] `,
  );
  return normaliseText(decodeEntities(
    withCode
      .replace(/<dt\b[^>]*>/gi, '\n@@DT@@ ')
      .replace(/<\/dt>/gi, ' @@ENDDT@@\n')
      .replace(/<li\b[^>]*>/gi, '\n@@LI@@ ')
      .replace(/<\/li>/gi, ' @@ENDLI@@\n')
      .replace(/<h[1-6]\b[^>]*>/gi, '\n@@HEADING@@ ')
      .replace(/<\/h[1-6]>/gi, ' @@ENDHEADING@@\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n\s+/g, '\n'),
  ));
}

function sourceDate(html) {
  const match = textContent(html.slice(0, 12_000)).match(/Last\s+Updated\s+(\d{1,2}\s+[A-Za-z]+\s+\d{4})/i);
  return match?.[1] ?? '';
}

function sliceBetween(source, startPattern, endPattern) {
  const start = source.search(startPattern);
  if (start < 0) throw new Error(`HTML obsolete parser could not find ${startPattern}.`);
  const tail = source.slice(start);
  const end = tail.search(endPattern);
  return end > 0 ? tail.slice(0, end) : tail;
}

function markedTokens(value = '') {
  return [...value.matchAll(/\[\[([a-z][a-z0-9-]*)\]\]/gi)].map((match) => match[1].toLowerCase());
}

function obsoleteElementNames(structure) {
  const elementArea = sliceBetween(
    structure,
    /Elements\s+in\s+the\s+following\s+list\s+are\s+entirely\s+obsolete/i,
    /The\s+following\s+attributes\s+are\s+obsolete/i,
  );
  const names = [];
  for (const match of elementArea.matchAll(/@@DT@@([\s\S]*?)@@ENDDT@@/gi)) {
    names.push(...markedTokens(match[1] ?? ''));
  }
  return [...new Set(names)].sort();
}

function obsoleteAttributePairs(structure) {
  const attributeArea = sliceBetween(
    structure,
    /The\s+following\s+attributes\s+are\s+obsolete/i,
    /@@HEADING@@\s*16\.3\b|Requirements\s+for\s+implementations/i,
  );
  const pairs = [];

  for (const match of attributeArea.matchAll(/@@DT@@([\s\S]*?)@@ENDDT@@/gi)) {
    const text = match[1] ?? '';
    for (const pair of text.matchAll(/\[\[([a-z][a-z0-9-]*)\]\]\s+on\s+(?:the\s+)?\[\[([a-z][a-z0-9-]*)\]\]/gi)) {
      pairs.push({ attribute: pair[1].toLowerCase(), element: pair[2].toLowerCase() });
    }

    const tokens = markedTokens(text);
    if (/on\s+all\s+(?:html\s+)?elements/i.test(text) && tokens[0]) {
      pairs.push({ attribute: tokens[0], element: '*' });
    }
  }

  const unique = new Map(pairs.map((pair) => [`${pair.attribute}|${pair.element}`, pair]));
  return [...unique.values()].sort((a, b) => `${a.attribute}|${a.element}`.localeCompare(`${b.attribute}|${b.element}`));
}

function countObsoleteButConformingWarnings(structure) {
  const area = sliceBetween(
    structure,
    /Warnings\s+for\s+obsolete\s+but\s+conforming\s+features/i,
    /@@HEADING@@\s*16\.2\b|Non-conforming\s+features/i,
  );
  return [...area.matchAll(/@@LI@@/g)].length;
}

export function parseHtmlObsoleteCatalog(html, source = {}) {
  const structure = structuralText(html);
  const obsoleteArea = sliceBetween(structure, /Obsolete\s+features/i, /IANA\s+considerations|Index/i);
  const nonConforming = sliceBetween(
    obsoleteArea,
    /Non-conforming\s+features/i,
    /Requirements\s+for\s+implementations|IANA\s+considerations|Index/i,
  );
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
      obsoleteSectionHash: sha256(normaliseText(obsoleteArea)),
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
