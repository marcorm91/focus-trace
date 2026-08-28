import { normalizeDiscoveredUrl } from './discovery';
import {
  SITE_AUDIT_MAX_SCANNED_PAGES,
  type SiteAuditDiscovery,
  type SiteAuditRouteFamily,
} from './model';

export type SiteAuditInputMode = 'automatic' | 'manual';

export interface ManualSiteAuditSelection {
  urls: string[];
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
    url.pathname = '/';
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    return undefined;
  }
}

export function parseManualSiteAuditUrls(
  value: string,
  origin: string,
  limit = SITE_AUDIT_MAX_SCANNED_PAGES,
): ManualSiteAuditSelection {
  const seen = new Set<string>();
  const invalid: string[] = [];
  let duplicateCount = 0;

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
    urls: allUrls.slice(0, limit),
    invalid,
    duplicateCount,
    truncated: allUrls.length > limit,
  };
}

export function manualSiteAuditDiscovery(
  origin: string,
  selection: ManualSiteAuditSelection,
): SiteAuditDiscovery {
  return {
    origin,
    source: 'manual',
    urls: selection.urls,
    sitemapUrls: [],
    truncated: selection.truncated,
  };
}

export function selectManualSiteAuditSamples(
  families: SiteAuditRouteFamily[],
  urls: string[],
): Array<{ routeFamilyId: string; url: string }> {
  const familyForUrl = new Map<string, string>();
  for (const family of families) {
    for (const url of family.urls) familyForUrl.set(url, family.id);
  }

  return urls
    .slice(0, SITE_AUDIT_MAX_SCANNED_PAGES)
    .map((url) => ({ routeFamilyId: familyForUrl.get(url) ?? families[0]?.id ?? 'R01', url }));
}
