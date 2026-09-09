// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { runFocusTraceScan } from '../lib/audit/scan';
import {
  scopedElements,
  withScanElementQueryCache,
  type ScanQueryMetrics,
} from '../lib/audit/scan-elements';

afterEach(() => {
  document.documentElement.removeAttribute('lang');
  document.head.innerHTML = '';
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('static scan DOM-query budget', () => {
  it('reuses an identical root query within one scan and expires it afterwards', () => {
    document.body.innerHTML = '<main><span id="first"></span></main>';
    const metrics: ScanQueryMetrics = { requests: 0, cacheHits: 0, domQueries: 0 };

    withScanElementQueryCache(() => {
      expect(scopedElements(document, '*')).toHaveLength(5);
      expect(scopedElements(document, '*')).toHaveLength(5);
      document.querySelector('#first')?.remove();
      expect(scopedElements(document, '*')).toHaveLength(5);
    }, metrics);

    expect(metrics).toEqual({ requests: 3, cacheHits: 2, domQueries: 1 });
    expect(withScanElementQueryCache(() => scopedElements(document, '*'))).toHaveLength(4);
  });

  it('keeps a full page scan to one root-wide DOM query', () => {
    document.documentElement.lang = 'en';
    document.head.innerHTML = '<title>Query budget</title>';
    document.body.innerHTML = '<main><h1>Query budget</h1><div><span>Content</span></div></main>';
    const querySelectorAll = vi.spyOn(Document.prototype, 'querySelectorAll');

    const result = runFocusTraceScan();

    const rootWideQueries = querySelectorAll.mock.calls
      .filter(([selector]) => selector === '*');
    expect(rootWideQueries).toHaveLength(1);
    expect(result.rulesRun).toBeGreaterThan(0);
  });
});
