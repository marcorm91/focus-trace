import React from 'react';
import { createRoot } from 'react-dom/client';
import { browser } from '#imports';
import { armReportVisualEvidencePermissionRequest } from '../../lib/report/visual-evidence';
import { requestActivePageAccess, type WebPageTab } from '../../lib/extension/page-access';
import { normalizeRuntimeBreakpointSettings } from '../../lib/runtime/breakpoints';
import { locateScanTargetInPage } from '../../lib/runtime/scan-target-overlay';
import { SETTINGS_STORAGE_KEY } from '../../shared/i18n';
import { RUNTIME_BREAKPOINT_SETTINGS_STORAGE_KEY } from '../../shared/runtime-breakpoint-preferences';
import type { ExtensionMessage, RuntimeBreakpointSettings } from '../../shared/types';
import { normalizeUiScale, UI_SCALE_STORAGE_KEY } from '../../shared/ui-scale';
import App from './App';
import { openFocusedInstructionsView, openFocusedSettingsView } from './settings-focus';

import './index.css';

const root = document.getElementById('root');
if (!root) throw new Error('FocusTrace root element was not found.');

document.documentElement.dataset.ftUiScale = '100';

async function syncBreakpointPreferencesToTab(
  tabId: number,
  supplied?: Partial<RuntimeBreakpointSettings>,
) {
  const saved = supplied ?? (
    await browser.storage.local.get(RUNTIME_BREAKPOINT_SETTINGS_STORAGE_KEY)
  )[RUNTIME_BREAKPOINT_SETTINGS_STORAGE_KEY] as Partial<RuntimeBreakpointSettings> | undefined;
  if (!saved) return;

  const breakpoints = normalizeRuntimeBreakpointSettings(saved);
  await browser.runtime.sendMessage({
    type: 'FOCUSTRACE_SAVE_BREAKPOINTS',
    tabId,
    breakpoints,
  } satisfies ExtensionMessage);
  await browser.tabs.sendMessage(tabId, {
    type: 'FOCUSTRACE_CONFIGURE_BREAKPOINTS',
    breakpoints,
  } satisfies ExtensionMessage).catch(() => undefined);
}

browser.tabs.onActivated.addListener(({ tabId }) => {
  void syncBreakpointPreferencesToTab(tabId).catch(() => undefined);
});

async function locateCurrentOccurrence(
  pagerButton: HTMLButtonElement,
  pageAccess: Promise<WebPageTab | undefined>,
) {
  const tab = await pageAccess;
  if (!tab) return;

  // React updates the selected finding in the bubble phase. Read the selector on
  // the next frame so the page highlight always follows the newly selected item.
  await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
  const rule = pagerButton.closest('.scan-rule-group');
  const selector = rule?.querySelector('.finding-location code')?.textContent?.trim();
  if (!selector) return;

  await browser.scripting.executeScript({
    target: { tabId: tab.id },
    func: locateScanTargetInPage,
    args: [selector, { tone: 'inspect', label: 'FocusTrace', focusTarget: false }],
  });
}

// Start permission-sensitive work synchronously from the original click.
// Browser permission APIs can lose user-gesture eligibility after awaited work.
document.addEventListener('click', (event) => {
  armReportVisualEvidencePermissionRequest(event.target);

  const target = event.target instanceof Element ? event.target : null;
  if (!target) return;

  if (target.closest('.settings-trigger')) {
    openFocusedSettingsView();
  }

  if (target.closest('.instructions-trigger')) {
    openFocusedInstructionsView();
  }

  const pagerButton = target.closest('.scan-occurrence-pager button') as HTMLButtonElement | null;
  if (pagerButton && !pagerButton.disabled) {
    const pageAccess = requestActivePageAccess().catch(() => undefined);
    void locateCurrentOccurrence(pagerButton, pageAccess).catch(() => undefined);
  }
}, { capture: true });

void (async () => {
  try {
    const stored = await browser.storage.local.get([
      UI_SCALE_STORAGE_KEY,
      SETTINGS_STORAGE_KEY,
      RUNTIME_BREAKPOINT_SETTINGS_STORAGE_KEY,
    ]);
    document.documentElement.dataset.ftUiScale = String(normalizeUiScale(stored[UI_SCALE_STORAGE_KEY]));
    const settings = stored[SETTINGS_STORAGE_KEY] as { language?: 'en' | 'es' } | undefined;
    if (settings?.language === 'en' || settings?.language === 'es') {
      document.documentElement.lang = settings.language;
    }

    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    const savedBreakpoints = stored[RUNTIME_BREAKPOINT_SETTINGS_STORAGE_KEY] as Partial<RuntimeBreakpointSettings> | undefined;
    if (tab?.id != null && savedBreakpoints) {
      await syncBreakpointPreferencesToTab(tab.id, savedBreakpoints);
    }
  } catch {
    // App has its own settings fallback; bootstrap should never block rendering.
  }

  createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
})();
