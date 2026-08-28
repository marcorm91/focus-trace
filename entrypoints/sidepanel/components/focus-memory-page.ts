import { browser } from '#imports';
import { requestActivePageAccess } from '../../../lib/extension/page-access';
import { locateScanTargetInPage } from '../../../lib/runtime/scan-target-overlay';
import { focusMemoryFailureDescriptors } from '../../../shared/focus-memory';
import type { ScanResult } from '../../../shared/types';

export function currentFindingSelectors(scan: ScanResult): Map<string, string> {
  const selectors = new Map<string, string>();
  const descriptors = focusMemoryFailureDescriptors(scan);

  for (const [index, issue] of scan.issues.entries()) {
    const selector = issue.targets.find((target) => target.trim().length > 0)?.trim();
    if (!selector) continue;
    const fingerprint = descriptors[index]?.fingerprint;
    if (fingerprint) selectors.set(fingerprint, selector);
  }

  return selectors;
}

export async function locateMemoryFindingInPage(selector: string, label: string): Promise<boolean> {
  const tab = await requestActivePageAccess().catch(() => undefined);
  if (!tab) return false;

  const results = await browser.scripting.executeScript({
    target: { tabId: tab.id },
    func: locateScanTargetInPage,
    args: [selector, {
      tone: 'fail',
      label,
      focusTarget: false,
      durationMs: 10000,
    }],
  });

  return Boolean(results[0]?.result?.found);
}
