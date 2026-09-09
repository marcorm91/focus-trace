import React from 'react';
import { createRoot } from 'react-dom/client';
import { browser } from '#imports';
import { requestTabPageAccess } from '../../lib/extension/page-access';
import { armReportVisualEvidencePermissionRequest } from '../../lib/report/visual-evidence';
import { normalizeRuntimeBreakpointSettings } from '../../lib/runtime/breakpoints';
import { locateScanTargetInPage } from '../../lib/runtime/scan-target-overlay';
import { SETTINGS_STORAGE_KEY } from '../../shared/i18n';
import { RUNTIME_BREAKPOINT_SETTINGS_STORAGE_KEY } from '../../shared/runtime-breakpoint-preferences';
import { mountSupportFooter } from '../../shared/support-footer';
import type { ExtensionMessage, RuntimeBreakpointSettings } from '../../shared/types';
import { normalizeUiScale, UI_SCALE_STORAGE_KEY } from '../../shared/ui-scale';
import App from '../sidepanel/App';
import { openFocusedInstructionsView, openFocusedSettingsView } from '../sidepanel/settings-focus';

import '../sidepanel/index.css';
import './devtools-panel.css';

const root = document.getElementById('root');
if (!root) throw new Error('FocusTrace DevTools root element was not found.');

const rawTabId = new URLSearchParams(window.location.search).get('focustraceTabId');
const inspectedTabId = rawTabId == null ? Number.NaN : Number(rawTabId);
if (!Number.isInteger(inspectedTabId) || inspectedTabId < 0) {
  throw new Error('FocusTrace could not resolve the inspected DevTools tab.');
}

document.documentElement.dataset.ftUiScale = '100';
document.documentElement.dataset.ftSurface = 'devtools';

async function syncBreakpointPreferencesToInspectedTab(
  supplied?: Partial<RuntimeBreakpointSettings>,
) {
  const saved = supplied ?? (
    await browser.storage.local.get(RUNTIME_BREAKPOINT_SETTINGS_STORAGE_KEY)
  )[RUNTIME_BREAKPOINT_SETTINGS_STORAGE_KEY] as Partial<RuntimeBreakpointSettings> | undefined;
  if (!saved) return;

  const breakpoints = normalizeRuntimeBreakpointSettings(saved);
  await browser.runtime.sendMessage({
    type: 'FOCUSTRACE_SAVE_BREAKPOINTS',
    tabId: inspectedTabId,
    breakpoints,
  } satisfies ExtensionMessage);
  await browser.tabs.sendMessage(inspectedTabId, {
    type: 'FOCUSTRACE_CONFIGURE_BREAKPOINTS',
    breakpoints,
  } satisfies ExtensionMessage).catch(() => undefined);
}

async function locateCurrentOccurrence(pagerButton: HTMLButtonElement) {
  const tab = await requestTabPageAccess(inspectedTabId).catch(() => undefined);
  if (!tab) return;

  await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
  const rule = pagerButton.closest('.scan-rule-group');
  const selector = rule?.querySelector('.finding-location code')?.textContent?.trim();
  if (!selector) return;

  await browser.scripting.executeScript({
    target: { tabId: inspectedTabId },
    func: locateScanTargetInPage,
    args: [selector, { tone: 'inspect', label: 'FocusTrace', focusTarget: false }],
  });
}

document.addEventListener('click', (event) => {
  armReportVisualEvidencePermissionRequest(event.target);

  const target = event.target instanceof Element ? event.target : null;
  if (!target) return;

  for (const details of document.querySelectorAll<HTMLDetailsElement>('.report-more-formats[open]')) {
    if (!details.contains(target)) details.open = false;
  }

  if (target.closest('.settings-trigger')) openFocusedSettingsView();
  if (target.closest('.instructions-trigger')) openFocusedInstructionsView();

  const pagerButton = target.closest('.scan-occurrence-pager button') as HTMLButtonElement | null;
  if (pagerButton && !pagerButton.disabled) {
    void locateCurrentOccurrence(pagerButton).catch(() => undefined);
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

    const savedBreakpoints = stored[RUNTIME_BREAKPOINT_SETTINGS_STORAGE_KEY] as Partial<RuntimeBreakpointSettings> | undefined;
    if (savedBreakpoints) await syncBreakpointPreferencesToInspectedTab(savedBreakpoints);
  } catch {
    // The shared app handles its own fallbacks; bootstrap must not block rendering.
  }

  createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
  mountSupportFooter();
})();
