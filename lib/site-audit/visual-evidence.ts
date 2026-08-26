import { browser } from '#imports';
import { captureReportVisualEvidence } from '../report/visual-evidence';
import type { SiteAuditFindingAggregate, SiteAuditPageResult } from './model';
import { waitForTabComplete } from './runner';

const SCREENSHOT_PERMISSION = { origins: ['<all_urls>'] };

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export async function captureSiteAuditFindingVisual(
  finding: SiteAuditFindingAggregate,
  page: SiteAuditPageResult | undefined,
): Promise<string> {
  // Invoke contains/request synchronously from the click handler before yielding;
  // permissions.request must remain tied to the user's explicit action.
  const alreadyGrantedPromise = browser.permissions.contains(SCREENSHOT_PERMISSION);
  const grantedPromise = browser.permissions.request(SCREENSHOT_PERMISSION);
  const [alreadyGranted, granted] = await Promise.all([alreadyGrantedPromise, grantedPromise]);
  if (!granted) throw new Error('Visual evidence permission was not granted.');

  const auditTab = await browser.tabs.getCurrent().catch(() => undefined);
  let sampleTabId: number | undefined;
  try {
    const tab = await browser.tabs.create({ url: finding.exampleUrl, active: true });
    if (tab.id == null) throw new Error('Browser did not create the evidence tab.');
    sampleTabId = tab.id;
    await waitForTabComplete(tab.id);
    await wait(220);

    const component = finding.component ?? {
      componentId: 'E00',
      selector: finding.exampleSelector,
      tag: 'element',
      context: [],
    };
    const scan = page?.scan ?? {
      engine: 'FocusTrace Rules' as const,
      standard: 'WCAG 2.2' as const,
      url: finding.exampleUrl,
      title: finding.exampleUrl,
      scannedAt: Date.now(),
      issues: finding.outcome === 'fail' ? [finding.exampleIssue] : [],
      review: finding.outcome === 'review' ? [finding.exampleIssue] : [],
      warnings: finding.outcome === 'warning' ? [finding.exampleIssue] : [],
      passes: 0,
      rulesRun: 0,
    };

    const captured = await captureReportVisualEvidence(tab.id, scan, [component]);
    const visual = captured.visuals.find((item) => item.selector === finding.exampleSelector) ?? captured.visuals[0];
    if (!visual) throw new Error('The affected element could not be captured in the current rendered page.');
    return visual.dataUrl;
  } finally {
    if (sampleTabId != null) await browser.tabs.remove(sampleTabId).catch(() => undefined);
    if (auditTab?.id != null) await browser.tabs.update(auditTab.id, { active: true }).catch(() => undefined);
    if (!alreadyGranted) await browser.permissions.remove(SCREENSHOT_PERMISSION).catch(() => false);
  }
}
