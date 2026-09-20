import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('finding management workflow contract', () => {
  it('exposes every professional auditor state through an accessible native control', () => {
    const control = source('entrypoints/sidepanel/components/FindingReviewStateControl.tsx');
    const css = source('entrypoints/sidepanel/components/finding-review-state.css');
    const model = source('lib/audit/finding-review.ts');
    expect(control).toContain('<select');
    expect(control).toContain("aria-label={tr(language, 'Finding workflow status'");
    for (const state of ['open', 'reviewed', 'accepted', 'false-positive', 'resolved', 'regressed']) {
      expect(model).toContain(`'${state}'`);
    }
    expect(control).toContain("'Reset status', 'Restablecer estado'");
    expect(css).toContain('padding-inline-start: 10px;');
  });

  it('persists managed state locally and updates saved Site Audit evidence', () => {
    const background = source('entrypoints/background.ts');
    const storage = source('lib/audit/finding-review-storage.ts');
    const multipage = source('lib/audit/multipage-audit-storage.ts');
    expect(storage).toContain("'focustrace:finding-review:v1'");
    expect(background).toContain("message.type === 'FOCUSTRACE_SAVE_FINDING_REVIEW_STATE'");
    expect(background).toContain('updateStoredMultipageAuditScan(next.scan)');
    expect(background).toContain('syncStoredFindingReviewNote(next.scan, message.target.findingId)');
    expect(multipage).toContain('applyStoredFindingReviews(scan)');
  });

  it('keeps workflow state separate from automatic lifecycle and detected outcome', () => {
    const scanView = source('entrypoints/sidepanel/views/ScanView.tsx');
    const types = source('shared/types.ts');
    expect(types).toContain("export type FindingReviewState = 'open' | 'reviewed' | 'accepted' | 'false-positive' | 'resolved' | 'regressed'");
    expect(scanView).toContain('state={issue.reviewState}');
    expect(scanView).toContain('onSaveFindingReviewState(issue.id, state)');
  });

  it('offers reproducible profile filters for source, exact rule, severity and scope', () => {
    const settings = source('entrypoints/sidepanel/components/AuditProfileSettings.tsx');
    const model = source('lib/audit/audit-profiles.ts');
    expect(settings).toContain("'Standards sources', 'Fuentes normativas'");
    expect(settings).toContain("'Exact rule IDs', 'IDs exactos de regla'");
    expect(model).toContain('referenceTypes: AuditProfileReferenceType[]');
    expect(model).toContain('ruleIds: string[]');
    expect(model).toContain('profile.ruleIds.length && !profile.ruleIds.includes');
  });
});
