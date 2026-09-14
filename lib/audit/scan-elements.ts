import {
  traverseComposedTree,
  type ComposedCoverageLimit,
  type ComposedTraversalResult,
} from './composed-tree';

export type ScanRoot = Document | Element;

export interface ScanQueryMetrics {
  requests: number;
  cacheHits: number;
  domQueries: number;
}

type ScanQueryCache = {
  results: WeakMap<ScanRoot, Map<string, Element[]>>;
  traversals: WeakMap<ScanRoot, ComposedTraversalResult>;
  metrics?: ScanQueryMetrics;
};

let activeCache: ScanQueryCache | undefined;

export function withScanElementQueryCache<T>(
  run: () => T,
  metrics?: ScanQueryMetrics,
): T {
  const previous = activeCache;
  activeCache = {
    results: new WeakMap(),
    traversals: new WeakMap(),
    metrics,
  };
  try {
    return run();
  } finally {
    activeCache = previous;
  }
}

function traversalFor(root: ScanRoot): ComposedTraversalResult {
  const cache = activeCache;
  const cached = cache?.traversals.get(root);
  if (cached) return cached;

  const traversal = traverseComposedTree(root);
  cache?.traversals.set(root, traversal);
  if (cache?.metrics) cache.metrics.domQueries += 1;
  return traversal;
}

/**
 * Returns matching elements from the complete bounded composed traversal rooted
 * at `root`: light DOM, open shadow roots, flattened slot assignments and
 * same-origin nested frame documents. The traversal itself is built once per
 * synchronous scan and shared across all rule queries so the 10,000-element
 * budget applies to the scan as a whole rather than once per rule.
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

  const result: T[] = [];
  for (const element of traversalFor(root).elements) {
    try {
      if (element.matches(selector)) result.push(element as T);
    } catch {
      // A selector valid in the top document can still be unsupported by an
      // older nested browsing context. Treat that element as non-matching.
    }
  }

  if (cache) {
    bySelector ??= new Map();
    bySelector.set(selector, result);
    cache.results.set(root, bySelector);
  }
  return result;
}

export function composedCoverageLimits(root: ScanRoot): readonly ComposedCoverageLimit[] {
  return traversalFor(root).coverageLimits;
}
