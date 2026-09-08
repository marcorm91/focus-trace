import React from 'react';
import { createRoot } from 'react-dom/client';
import { browser } from '#imports';
import { armReportVisualEvidencePermissionRequest } from '../../lib/report/visual-evidence';
import { normalizeRuntimeBreakpointSettings } from '../../lib/runtime/breakpoints';
import { SETTINGS_STORAGE_KEY } from '../../shared/i18n';
import { RUNTIME_BREAKPOINT_SETTINGS_STORAGE_KEY } from '../../shared/runtime-breakpoint-preferences';
import { mountSupportFooter } from '../../shared/support-footer';
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

// Start permission-sensitive work synchronously from the original click.
// Browser permission APIs can lose user-gesture eligibility after awaited work.
document.addEventListener('click', (event) => {
  armReportVisualEvidencePermissionRequest(event.target);

  const target = event.target instanceof Element ? event.target : null;
  if (!target) return;

  // The format picker behaves like a popover: clicking elsewhere dismisses it.
  for (const details of document.querySelectorAll<HTMLDetailsElement>('.report-more-formats[open]')) {
    if (!details.contains(target)) details.open = false;
  }

  if (target.closest('.settings-trigger')) {
    openFocusedSettingsView();
  }

  if (target.closest('.instructions-trigger')) {
    openFocusedInstructionsView();
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
  mountSupportFooter();
})();
