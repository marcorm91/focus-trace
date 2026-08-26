import { SITE_AUDIT_MAX_DISCOVERED_URLS, type SiteAuditDiscovery } from './model';

const TRACKING_QUERY_KEYS = new Set([
  'gclid', 'fbclid', 'msclkid', 'mc_cid', 'mc_eid',
  'utm_campaign', 'utm_content', 'utm_medium', 'utm_source', 'utm_term',
]);
const MAX_SITEMAPS = 24;
const MAX_FETCH_BYTES = 6_000_000;

function decodeXml(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'");
}

export function normalizeDiscoveredUrl(value: string, origin: string): string | undefined {
  try {
    const url = new URL(value, origin);
    if (!['http:', 'https:'].includes(url.protocol)) return undefined;
    const expected = new URL(origin);
    if (url.origin !== expected.origin) return undefined;
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) {
      if (TRACKING_QUERY_KEYS.has(key.toLowerCase())) url.searchParams.delete(key);
    }
    url.searchParams.sort();
    if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, '');
    return url.toString();
  } catch {
    return undefined;
  }
}

export function sitemapLocations(xml: string): { kind: 'index' | 'urls' | 'unknown'; locations: string[] } {
  const root = /<\s*(?:[\w-]+:)?(sitemapindex|urlset)\b/i.exec(xml)?.[1]?.toLowerCase();
  const locations = [...xml.matchAll(/<\s*(?:[\w-]+:)?loc\b[^>]*>([\s\S]*?)<\s*\/\s*(?:[\w-]+:)?loc\s*>/gi)]
    .map((match) => decodeXml(match[1]?.trim() ?? ''))
    .filter(Boolean);
  return {
    kind: root === 'sitemapindex' ? 'index' : root === 'urlset' ? 'urls' : 'unknown',
    locations,
  };
}

export function robotsSitemaps(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => /^\s*sitemap\s*:\s*(\S.*?)\s*$/i.exec(line)?.[1])
    .filter((value): value is string => Boolean(value));
}

async function fetchText(url: string): Promise<string | undefined> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(url, {
      cache: 'no-store',
      credentials: 'include',
      redirect: 'follow',
      signal: controller.signal,
    });
    if (!response.ok) return undefined;
    const declaredLength = Number(response.headers.get('content-length') ?? '0');
    if (declaredLength > MAX_FETCH_BYTES) return undefined;
    const text = await response.text();
    return text.length > MAX_FETCH_BYTES ? undefined : text;
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}

export async function discoverSiteUrls(
  sourceUrl: string,
  fallbackLinks: string[] = [],
): Promise<SiteAuditDiscovery> {
  const source = new URL(sourceUrl);
  const origin = source.origin;
  const discovered = new Set<string>();
  const sitemapUrls = new Set<string>();
  let usedRobots = false;
  let usedSitemap = false;

  const addUrl = (candidate: string) => {
    if (discovered.size >= SITE_AUDIT_MAX_DISCOVERED_URLS) return;
    const normalized = normalizeDiscoveredUrl(candidate, origin);
    if (normalized) discovered.add(normalized);
  };
  addUrl(sourceUrl);

  const robotsUrl = new URL('/robots.txt', origin).toString();
  const robots = await fetchText(robotsUrl);
  const queue: string[] = [];
  if (robots) {
    const fromRobots = robotsSitemaps(robots)
      .map((value) => normalizeDiscoveredUrl(value, origin))
      .filter((value): value is string => Boolean(value));
    if (fromRobots.length) usedRobots = true;
    queue.push(...fromRobots);
  }

  for (const standardPath of ['/sitemap.xml', '/sitemap_index.xml']) {
    const candidate = new URL(standardPath, origin).toString();
    if (!queue.includes(candidate)) queue.push(candidate);
  }

  const visitedSitemaps = new Set<string>();
  while (
    queue.length
    && visitedSitemaps.size < MAX_SITEMAPS
    && discovered.size < SITE_AUDIT_MAX_DISCOVERED_URLS
  ) {
    const sitemapUrl = queue.shift()!;
    if (visitedSitemaps.has(sitemapUrl)) continue;
    visitedSitemaps.add(sitemapUrl);
    const xml = await fetchText(sitemapUrl);
    if (!xml) continue;
    const parsed = sitemapLocations(xml);
    if (!parsed.locations.length) continue;
    usedSitemap = true;
    sitemapUrls.add(sitemapUrl);

    if (parsed.kind === 'index') {
      for (const location of parsed.locations) {
        const normalized = normalizeDiscoveredUrl(location, origin);
        if (normalized && !visitedSitemaps.has(normalized) && !queue.includes(normalized)) queue.push(normalized);
      }
      continue;
    }

    for (const location of parsed.locations) addUrl(location);
  }

  let usedLinks = false;
  for (const link of fallbackLinks) {
    const before = discovered.size;
    addUrl(link);
    if (discovered.size > before) usedLinks = true;
    if (discovered.size >= SITE_AUDIT_MAX_DISCOVERED_URLS) break;
  }

  const sourceKind: SiteAuditDiscovery['source'] = usedSitemap && usedLinks
    ? 'mixed'
    : usedSitemap
      ? usedRobots ? 'robots+sitemap' : 'sitemap'
      : 'links';

  return {
    origin,
    source: sourceKind,
    urls: [...discovered],
    sitemapUrls: [...sitemapUrls],
    truncated: discovered.size >= SITE_AUDIT_MAX_DISCOVERED_URLS,
  };
}
