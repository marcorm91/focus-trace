import { readBoundedResponseText } from './bounded-response';
import {
  SITE_AUDIT_MAX_DISCOVERED_URLS,
  type SiteAuditDiscovery,
  type SiteAuditDiscoveryDecision,
  type SiteAuditDiscoveryReason,
} from './model';

const TRACKING_QUERY_KEYS = new Set([
  'gclid', 'fbclid', 'msclkid', 'mc_cid', 'mc_eid',
]);
const SENSITIVE_QUERY_KEYS = new Set([
  'access_token', 'api_key', 'apikey', 'auth', 'authorization', 'code', 'jwt',
  'password', 'passwd', 'session', 'session_id', 'sessionid', 'sid', 'token',
]);
const MAX_SITEMAPS = 24;
const MAX_DISCOVERY_DECISIONS = 1_000;
export const SITE_AUDIT_MAX_FETCH_BYTES = 6_000_000;

export interface SiteAuditDiscoveryOptions {
  maxDiscoveredUrls?: number;
  exclusionPrefixes?: string[];
}

function decodeXml(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'");
}

function shouldRemoveQueryKey(key: string): boolean {
  const normalized = key.toLowerCase();
  return TRACKING_QUERY_KEYS.has(normalized)
    || SENSITIVE_QUERY_KEYS.has(normalized)
    || normalized.startsWith('utm_')
    || normalized.startsWith('pk_');
}

export function normalizeDiscoveredUrl(value: string, origin: string): string | undefined {
  try {
    const url = new URL(value, origin);
    if (!['http:', 'https:'].includes(url.protocol)) return undefined;
    const expected = new URL(origin);
    if (url.origin !== expected.origin) return undefined;
    url.username = '';
    url.password = '';
    url.hash = '';
    for (const key of Array.from(url.searchParams.keys())) {
      if (shouldRemoveQueryKey(key)) url.searchParams.delete(key);
    }
    url.searchParams.sort();
    if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, '');
    return url.toString();
  } catch {
    return undefined;
  }
}

export function siteAuditDecisionUrl(value: string, origin: string): string {
  try {
    const url = new URL(value, origin);
    url.username = '';
    url.password = '';
    url.hash = '';
    const queryKeys = [...new Set(Array.from(url.searchParams.keys())
      .filter((key) => !shouldRemoveQueryKey(key)))]
      .sort();
    url.search = '';
    for (const key of queryKeys) url.searchParams.append(key, '…');
    return `${url.origin}${url.pathname}${url.search}`;
  } catch {
    return value.slice(0, 180);
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
    return await readBoundedResponseText(
      response,
      SITE_AUDIT_MAX_FETCH_BYTES,
      () => controller.abort(),
    );
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}

function normalizeLimit(value: number | undefined): number {
  if (!Number.isFinite(value)) return SITE_AUDIT_MAX_DISCOVERED_URLS;
  return Math.max(1, Math.min(SITE_AUDIT_MAX_DISCOVERED_URLS, Math.floor(value!)));
}

function normalizeExclusions(values: string[] | undefined): string[] {
  return [...new Set((values ?? [])
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => value.startsWith('/') ? value : `/${value}`))];
}

function excludedByPrefix(url: string, prefixes: string[]): boolean {
  const pathname = new URL(url).pathname;
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(prefix.endsWith('/') ? prefix : `${prefix}/`));
}

export async function discoverSiteUrls(
  sourceUrl: string,
  fallbackLinks: string[] = [],
  options: SiteAuditDiscoveryOptions = {},
): Promise<SiteAuditDiscovery> {
  const source = new URL(sourceUrl);
  const origin = source.origin;
  const maxDiscoveredUrls = normalizeLimit(options.maxDiscoveredUrls);
  const exclusionPrefixes = normalizeExclusions(options.exclusionPrefixes);
  const discovered = new Set<string>();
  const sitemapUrls = new Set<string>();
  const decisions: SiteAuditDiscoveryDecision[] = [];
  let usedRobots = false;
  let usedSitemap = false;
  let hitLimit = false;

  const record = (candidate: string, status: SiteAuditDiscoveryDecision['status'], reason: SiteAuditDiscoveryReason) => {
    if (decisions.length >= MAX_DISCOVERY_DECISIONS) return;
    decisions.push({ url: siteAuditDecisionUrl(candidate, origin), status, reason });
  };

  const addUrl = (candidate: string, reason: Extract<SiteAuditDiscoveryReason, 'root' | 'sitemap' | 'internal-link'>) => {
    const normalized = normalizeDiscoveredUrl(candidate, origin);
    if (!normalized) return;
    if (excludedByPrefix(normalized, exclusionPrefixes)) {
      record(normalized, 'excluded', 'excluded-path');
      return;
    }
    if (discovered.has(normalized)) {
      record(normalized, 'excluded', 'duplicate');
      return;
    }
    if (discovered.size >= maxDiscoveredUrls) {
      hitLimit = true;
      record(normalized, 'excluded', 'safety-limit');
      return;
    }
    discovered.add(normalized);
    record(normalized, 'included', reason);
  };
  addUrl(sourceUrl, 'root');

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
    && discovered.size < maxDiscoveredUrls
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

    for (const location of parsed.locations) addUrl(location, 'sitemap');
  }

  let usedLinks = false;
  for (const link of fallbackLinks) {
    const before = discovered.size;
    addUrl(link, 'internal-link');
    if (discovered.size > before) usedLinks = true;
  }

  const sourceKind: SiteAuditDiscovery['source'] = usedSitemap && usedLinks
    ? 'mixed'
    : usedSitemap
      ? usedRobots ? 'robots+sitemap' : 'sitemap'
      : 'links';

  return {
    origin,
    source: sourceKind,
    urls: [...discovered].sort((left, right) => left.localeCompare(right)),
    sitemapUrls: [...sitemapUrls].sort((left, right) => left.localeCompare(right)),
    truncated: hitLimit,
    decisions,
  };
}
