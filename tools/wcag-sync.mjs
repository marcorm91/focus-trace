import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchWithRetry, normaliseText, sha256, writeJson } from './standards-utils.mjs';

const WCAG_URL = 'https://www.w3.org/TR/WCAG22/';
const DEFAULT_OUTPUT = 'generated/wcag-catalog.json';

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
      .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' '),
  ));
}

function attribute(source, name) {
  const match = source.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']+)["']`, 'i'));
  return match?.[1] ?? '';
}

function nearestSectionId(html, headingIndex) {
  const before = html.slice(0, headingIndex);
  const sectionStart = before.lastIndexOf('<section');
  const sectionEnd = before.lastIndexOf('</section');
  if (sectionStart < 0 || sectionStart < sectionEnd) return '';
  const openingTagEnd = html.indexOf('>', sectionStart);
  if (openingTagEnd < 0 || openingTagEnd > headingIndex) return '';
  return attribute(html.slice(sectionStart, openingTagEnd + 1), 'id');
}

function criterionHeadings(html) {
  const headings = [];
  const pattern = /<h([1-6])\b([^>]*)>([\s\S]*?)<\/h\1>/gi;
  for (const match of html.matchAll(pattern)) {
    const heading = textContent(match[3] ?? '');
    const numberMatch = heading.match(/^Success Criterion\s+(\d+\.\d+\.\d+)\b/i);
    if (!numberMatch?.[1] || match.index == null) continue;
    headings.push({
      id: numberMatch[1],
      heading,
      headingAttributes: match[2] ?? '',
      start: match.index,
      end: match.index + match[0].length,
    });
  }
  return headings;
}

export function parseWcagCatalog(html, source = {}) {
  const headings = criterionHeadings(html);
  const criteria = [];

  for (let index = 0; index < headings.length; index += 1) {
    const current = headings[index];
    const next = headings[index + 1];
    const body = html.slice(current.end, next?.start ?? html.length);
    const text = textContent(body);
    const headingId = attribute(current.headingAttributes, 'id');
    const sectionId = nearestSectionId(html, current.start);
    const anchor = headingId || sectionId;
    const title = current.heading
      .replace(new RegExp(`^Success Criterion\\s+${current.id}\\s*`, 'i'), '')
      .trim();
    const levelMatch = text.match(/\(?Level\s+(AAA|AA|A)\)?/i);
    const removed = /obsolete\s+and\s+removed|removed\s+success\s+criterion/i.test(`${title} ${text}`);
    const level = removed ? null : (levelMatch?.[1]?.toUpperCase() ?? null);

    criteria.push({
      id: current.id,
      anchor,
      title: title || current.id,
      level,
      status: removed ? 'removed' : 'active',
      url: anchor ? `${WCAG_URL}#${anchor}` : WCAG_URL,
      logicHash: sha256(`${current.heading}\n${text}`),
    });
  }

  const unique = new Map();
  for (const criterion of criteria) {
    if (unique.has(criterion.id)) throw new Error(`WCAG parser found duplicate success criterion ${criterion.id}.`);
    unique.set(criterion.id, criterion);
  }
  const sorted = [...unique.values()].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
  const active = sorted.filter((criterion) => criterion.status === 'active');

  if (active.length < 80) {
    throw new Error(`WCAG parser found only ${active.length} active success criteria; expected at least 80.`);
  }
  const invalidLevel = active.find((criterion) => !['A', 'AA', 'AAA'].includes(criterion.level));
  if (invalidLevel) {
    throw new Error(`WCAG parser could not resolve the level for ${invalidLevel.id} ${invalidLevel.title}.`);
  }

  return {
    schemaVersion: 1,
    source: {
      authority: 'W3C',
      specification: 'WCAG 2.2',
      url: WCAG_URL,
      recommendationDate: '2024-12-12',
      ...(source.lastModified ? { lastModified: source.lastModified } : {}),
      ...(source.etag ? { etag: source.etag } : {}),
    },
    summary: {
      total: sorted.length,
      active: active.length,
      removed: sorted.length - active.length,
      A: active.filter((criterion) => criterion.level === 'A').length,
      AA: active.filter((criterion) => criterion.level === 'AA').length,
      AAA: active.filter((criterion) => criterion.level === 'AAA').length,
    },
    criteria: sorted,
  };
}

export async function syncWcagCatalog(outputPath = DEFAULT_OUTPUT) {
  const response = await fetchWithRetry(WCAG_URL, { headers: { 'User-Agent': 'FocusTrace-WCAG-Sync' } });
  const html = await response.text();
  const catalog = parseWcagCatalog(html, {
    lastModified: response.headers.get('last-modified') ?? '',
    etag: response.headers.get('etag') ?? '',
  });
  await writeJson(outputPath, catalog);
  return catalog;
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  const output = process.argv[2] ?? DEFAULT_OUTPUT;
  const catalog = await syncWcagCatalog(output);
  console.log(`WCAG catalog synced: ${catalog.summary.active} active success criteria (${catalog.summary.A} A, ${catalog.summary.AA} AA, ${catalog.summary.AAA} AAA).`);
}
