import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SiteAuditReport } from '../entrypoints/site-audit/SiteAuditReport';
import { buildSiteAuditTemplates } from '../lib/site-audit/aggregate';
import type {
  SiteAuditPageResult,
  SiteAuditResult,
  SiteAuditRouteFamily,
} from '../lib/site-audit/model';
import type { ScanResult } from '../shared/types';

function reportFixture(): SiteAuditResult {
  const url = 'https://example.test/products/widget';
  const family: SiteAuditRouteFamily = {
    id: 'R01',
    pattern: '/products/:item',
    urls: [url],
    sampleUrls: [url],
  };
  const scan: ScanResult = {
    engine: 'FocusTrace Rules',
    standard: 'WCAG 2.2',
    url,
    title: 'Widget',
    scannedAt: 1,
    issues: [{
      id: 'contrast-widget',
      ruleId: 'FT-WCAG-010',
      title: 'Text contrast is below the required minimum',
      description: 'Contrast is low.',
      severity: 'serious',
      outcome: 'fail',
      targets: ['main > p.price'],
      references: [{
        type: 'WCAG',
        id: '1.4.3',
        label: 'Contrast (Minimum)',
        level: 'AA',
        url: 'https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html',
      }],
    }],
    review: [],
    warnings: [],
    headings: [],
    passes: 0,
    rulesRun: 1,
  };
  const pages: SiteAuditPageResult[] = [{ url, routeFamilyId: family.id, scan }];

  return {
    origin: 'https://example.test',
    generatedAt: 1,
    discovery: {
      origin: 'https://example.test',
      source: 'manual',
      urls: [url],
      sitemapUrls: [],
      truncated: false,
    },
    routeFamilies: [family],
    pages,
    templates: buildSiteAuditTemplates([family], pages),
    scannedPages: 1,
    failedPages: 0,
  };
}

describe('Site Audit report view', () => {
  it('renders aggregate, finding and action semantics after component extraction', () => {
    const html = renderToStaticMarkup(
      <SiteAuditReport result={reportFixture()} language="en" onRunAgain={() => undefined} />,
    );

    expect(html).toContain('Site Audit complete');
    expect(html).toContain('URLs selected');
    expect(html).toContain('Text color contrast');
    expect(html).toContain('Affected component');
    expect(html).toContain('Exact selector');
    expect(html).toContain('main &gt; p.price');
    expect(html).toContain('Capture visual evidence');
    expect(html).toContain('WCAG 1.4.3 (AA)');
    expect(html).toContain('target="_blank" rel="noreferrer"');
  });

  it('keeps the extracted report bilingual', () => {
    const html = renderToStaticMarkup(
      <SiteAuditReport result={reportFixture()} language="es" onRunAgain={() => undefined} />,
    );

    expect(html).toContain('Site Audit completado');
    expect(html).toContain('URLs seleccionadas');
    expect(html).toContain('Componente afectado');
    expect(html).toContain('Capturar evidencia visual');
    expect(html).toContain('Abrir página de muestra');
  });
});
