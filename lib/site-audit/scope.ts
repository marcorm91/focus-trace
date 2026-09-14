import { normalizeDiscoveredUrl, siteAuditDecisionUrl } from './discovery';
import {
  SITE_AUDIT_MAX_EXCLUSIONS,
  SITE_AUDIT_MAX_SCANNED_PAGES,
  type SiteAuditDiscovery,
  type SiteAuditMode,
  type SiteAuditRouteFamily,
} from './model';
import type { SiteAuditSampleSelection } from './routes';

export type SiteAuditInputMode = SiteAuditMode;

export interface ManualSiteAuditSelection {
  urls: string[];
  totalValid: number;
  invalid: string[];
  duplicateCount: number;
  truncated: boolean;
}

export function normalizeSiteAuditRoot(value: string, defaultProtocol = 'https:'): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)
    ? trimmed
    : `${defaultProtocol}//${trimmed.replace(/^\/+/, '')}`;

  try {
    const url = new URL(candidate);
    if (!['http:', 'https:'].includes(url.protocol)) return undefined;
    url.username = '';
    url.password = '';
    url.pathname = '/';
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    return undefined;
  }
}

export function normalizeSiteAuditExclusionPrefixes(value: string): string[] {
  return [...new Set(value
    .split(/\r?\n/)
    .map((raw) => raw.trim())
    .filter(Boolean)
    .map((raw) => {
      try {
        const pathname = new URL(raw, 'https://example.invalid').pathname;
        const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
        return normalized || '/';
      } catch {
        return undefined;
      }
    })
    .filter((prefix): prefix is string => Boolean(prefix)))]
    .slice(0, SITE_AUDIT_MAX_EXCLUSIONS)
    .sort((left, right) => left.localeCompare(right));
}

export function parseManualSiteAuditUrls(
  value: string,
  origin: string,
  limit = SITE_AUDIT_MAX_SCANNED_PAGES,
): ManualSiteAuditSelection {
  const seen = new Set<string>();
  const invalid: string[] = [];
  let duplicateCount = 0;
  const boundedLimit = Math.max(1, Math.min(SITE_AUDIT_MAX_SCANNED_PAGES, Math.floor(limit)));

  for (const raw of value.split(/\r?\n/)) {
    const candidate = raw.trim();
    if (!candidate) continue;
    const normalized = normalizeDiscoveredUrl(candidate, origin);
    if (!normalized) {
      invalid.push(candidate);
      continue;
    }
    if (seen.has(normalized)) {
      duplicateCount += 1;
      continue;
    }
    seen.add(normalized);
  }

  const allUrls = [...seen];
  return {
    urls: allUrls.slice(0, boundedLimit),
    totalValid: allUrls.length,
    invalid,
    duplicateCount,
    truncated: allUrls.length > boundedLimit,
  };
}

export function manualSiteAuditDiscovery(
  origin: string,
  selection: ManualSiteAuditSelection,
  mode: Extract<SiteAuditInputMode, 'manual' | 'session'> = 'manual',
): SiteAuditDiscovery {
  const reason = mode === 'session' ? 'current-session' : 'manual-selection';
  return {
    origin,
    source: mode,
    urls: selection.urls,
    sitemapUrls: [],
    truncated: selection.truncated,
    decisions: selection.urls.map((url) => ({
      url: siteAuditDecisionUrl(url, origin),
      status: 'included',
      reason,
    })),
  };
}

export function selectManualSiteAuditSamples(
  families: SiteAuditRouteFamily[],
  urls: string[],
  mode: Extract<SiteAuditInputMode, 'manual' | 'session'> = 'manual',
  maxPages = SITE_AUDIT_MAX_SCANNED_PAGES,
): SiteAuditSampleSelection[] {
  const familyForUrl = new Map<string, string>();
  for (const family of families) {
    for (const url of family.urls) familyForUrl.set(url, family.id);
  }
  const limit = Math.max(1, Math.min(SITE_AUDIT_MAX_SCANNED_PAGES, Math.floor(maxPages)));
  const selectionReason = mode === 'session' ? 'current-session' : 'manual-selection';

  return urls
    .slice(0, limit)
    .flatMap((url) => {
      const routeFamilyId = familyForUrl.get(url);
      return routeFamilyId ? [{ routeFamilyId, url, selectionReason }] : [];
    });
}
