export type ScanRoot = Document | Element;

export interface ScanQueryMetrics {
  requests: number;
  cacheHits: number;
  domQueries: number;
}

type ScanQueryCache = {
  results: WeakMap<ScanRoot, Map<string, Element[]>>;
  metrics?: ScanQueryMetrics;
};

let activeCache: ScanQueryCache | undefined;

export function withScanElementQueryCache<T>(
  run: () => T,
  metrics?: ScanQueryMetrics,
): T {
  const previous = activeCache;
  activeCache = { results: new WeakMap(), metrics };
  try {
    return run();
  } finally {
    activeCache = previous;
  }
}

/**
 * Returns the matching scan root and descendants. Identical queries are reused
 * only for the lifetime of one synchronous scan, so later DOM changes can never
 * observe stale results.
 */
export function scopedElements<T extends Element = Element>(
  root: ScanRoot,
  selector: string,
): T[] {
  const cache = activeCache;
  if (cache?.metrics) cache.metrics.requests += 1;

  let bySelector = cache?.results.get(root);
  const cached = bySelector?.get(selector);
  if (cached) {
    if (cache?.metrics) cache.metrics.cacheHits += 1;
    return cached as T[];
  }

  const descendants = [...root.querySelectorAll<T>(selector)];
  const result = root instanceof Element && root.matches(selector)
    ? [root as T, ...descendants]
    : descendants;

  if (cache) {
    bySelector ??= new Map();
    bySelector.set(selector, result);
    cache.results.set(root, bySelector);
    if (cache.metrics) cache.metrics.domQueries += 1;
  }
  return result;
}
