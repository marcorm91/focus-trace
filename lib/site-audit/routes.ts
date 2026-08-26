import {
  SITE_AUDIT_MAX_SCANNED_PAGES,
  SITE_AUDIT_SAMPLES_PER_FAMILY,
  type SiteAuditRouteFamily,
} from './model';

interface ParentStats {
  total: number;
  children: Map<string, number>;
}

function pathSegments(value: string): string[] {
  return new URL(value).pathname.split('/').filter(Boolean).map((segment) => decodeURIComponent(segment));
}

function isIntrinsicDynamicSegment(segment: string): boolean {
  return /^\d{2,}$/.test(segment)
    || /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(segment)
    || /^[0-9a-f]{16,}$/i.test(segment)
    || /^[A-Za-z0-9_-]{24,}$/.test(segment);
}

function parentKey(segments: string[], index: number): string {
  return `/${segments.slice(0, index).join('/')}`;
}

export function buildRoutePatterns(urls: string[]): Map<string, string> {
  const stats = new Map<string, ParentStats>();
  const parsed = urls.map((url) => ({ url, segments: pathSegments(url) }));

  for (const { segments } of parsed) {
    segments.forEach((segment, index) => {
      const key = parentKey(segments, index);
      const current = stats.get(key) ?? { total: 0, children: new Map<string, number>() };
      current.total += 1;
      current.children.set(segment, (current.children.get(segment) ?? 0) + 1);
      stats.set(key, current);
    });
  }

  const result = new Map<string, string>();
  for (const { url, segments } of parsed) {
    const pattern = segments.map((segment, index) => {
      if (isIntrinsicDynamicSegment(segment)) return ':id';
      // Preserve the site's top-level information architecture. Dynamic slug
      // inference starts below it, where product/article/category instances live.
      if (index === 0) return segment;
      const parent = stats.get(parentKey(segments, index));
      if (!parent || parent.children.size < 3) return segment;
      const mostFrequent = Math.max(...parent.children.values());
      const dominance = mostFrequent / Math.max(1, parent.total);
      return dominance < 0.5 ? ':item' : segment;
    });
    const pathname = pattern.length ? `/${pattern.join('/')}` : '/';
    const query = new URL(url).search ? '?…' : '';
    result.set(url, `${pathname}${query}`);
  }
  return result;
}

function spreadSamples(urls: string[], count: number): string[] {
  if (urls.length <= count) return [...urls];
  if (count <= 1) return [urls[0]];
  const indexes = new Set<number>();
  for (let i = 0; i < count; i += 1) {
    indexes.add(Math.round((i * (urls.length - 1)) / (count - 1)));
  }
  return [...indexes].map((index) => urls[index]);
}

export function buildRouteFamilies(urls: string[]): SiteAuditRouteFamily[] {
  const patterns = buildRoutePatterns(urls);
  const grouped = new Map<string, string[]>();
  for (const url of urls) {
    const pattern = patterns.get(url) ?? new URL(url).pathname;
    const group = grouped.get(pattern) ?? [];
    group.push(url);
    grouped.set(pattern, group);
  }

  return [...grouped.entries()]
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
    .map(([pattern, familyUrls], index) => ({
      id: `R${String(index + 1).padStart(2, '0')}`,
      pattern,
      urls: familyUrls,
      sampleUrls: spreadSamples(familyUrls, SITE_AUDIT_SAMPLES_PER_FAMILY),
    }));
}

export function selectSiteAuditSamples(families: SiteAuditRouteFamily[]): Array<{ routeFamilyId: string; url: string }> {
  const selected: Array<{ routeFamilyId: string; url: string }> = [];
  const queues = families.map((family) => ({ family, urls: [...family.sampleUrls] }));

  // First get one representative of as many families as possible.
  for (const item of queues) {
    const url = item.urls.shift();
    if (url) selected.push({ routeFamilyId: item.family.id, url });
    if (selected.length >= SITE_AUDIT_MAX_SCANNED_PAGES) return selected;
  }

  // Then add second/third samples, prioritising families with the widest impact.
  for (let pass = 1; pass < SITE_AUDIT_SAMPLES_PER_FAMILY; pass += 1) {
    for (const item of queues) {
      const url = item.urls.shift();
      if (url) selected.push({ routeFamilyId: item.family.id, url });
      if (selected.length >= SITE_AUDIT_MAX_SCANNED_PAGES) return selected;
    }
  }
  return selected;
}
