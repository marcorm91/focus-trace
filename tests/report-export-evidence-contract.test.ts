import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('report export evidence contract', () => {
  it('keeps single-page visual export uncapped while allowing a bounded audit snapshot', () => {
    const evidence = source('lib/report/visual-evidence.ts');
    const auditHook = source('entrypoints/sidepanel/hooks/useMultipageAudit.ts');

    expect(evidence).toContain('maxVisuals = Number.POSITIVE_INFINITY');
    expect(evidence).toContain('const bounded = Number.isFinite(maxVisuals);');
    expect(evidence).toContain(': eligible;');
    expect(evidence).not.toContain('DEFAULT_MAX_VISUALS');
    expect(auditHook).toContain('MAX_AUDIT_VISUALS_PER_REVIEW = 2');
    expect(auditHook).toContain('MAX_AUDIT_VISUALS_PER_REVIEW,');
  });

  it('does not reject valid activeTab capture just because optional all-URL permission was not granted', () => {
    const evidence = source('lib/report/visual-evidence.ts');

    expect(evidence).toContain('settleTemporaryVisualCapturePermission');
    expect(evidence).toContain('captureVisibleTab');
    expect(evidence).not.toContain('if (!captureAllowed)');
    expect(evidence).toContain('if (temporaryPermissionGranted) await releaseVisualCapturePermission();');
  });

  it('carries static and runtime finding tone into visual evidence eligibility', () => {
    const components = source('lib/report/component-identity.ts');

    expect(components).toContain('visualTone?: ReportComponentTone;');
    expect(components).toContain("event.outcome === 'fail'");
    expect(components).toContain("event.outcome === 'review'");
    expect(components).toContain('Boolean(event.causes?.length)');
  });

  it('scales oversized evidence proportionally and constrains it again in print layout', () => {
    const evidence = source('lib/report/visual-evidence.ts');
    const css = source('entrypoints/report-print/visual-evidence.css');

    expect(evidence).toContain('MAX_CAPTURE_WIDTH_PX');
    expect(evidence).toContain('MAX_CAPTURE_HEIGHT_PX');
    expect(evidence).toContain('visualEvidenceOutputScale(sw, sh)');
    expect(evidence).toContain('Math.min(1, MAX_CAPTURE_WIDTH_PX / width, MAX_CAPTURE_HEIGHT_PX / height)');
    expect(css).toContain('max-width: 100%;');
    expect(css).toContain('max-height: 68mm;');
    expect(css).toContain('object-fit: contain;');
    expect(css).toContain('page-break-inside: avoid;');
    expect(css).toContain('overflow: hidden;');
  });

  it('opens additional export formats as an out-of-flow popover', () => {
    const css = source('entrypoints/sidepanel/views/report-export.css');

    expect(css).toContain('.report-more-formats {\n  position: relative;');
    expect(css).toContain('.report-format-options {\n  position: absolute;');
    expect(css).toContain('inset-block-start: calc(100% + 6px);');
    expect(css).toContain('z-index: 31;');
  });
});
