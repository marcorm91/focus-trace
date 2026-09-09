import React from 'react';
import { createRoot } from 'react-dom/client';
import { browser } from '#imports';
import { armReportVisualEvidencePermissionRequest } from '../../lib/report/visual-evidence';
import {
  requestActivePageAccess,
  requestTabPageAccess,
  type WebPageTab,
} from '../../lib/extension/page-access';
import { normalizeRuntimeBreakpointSettings } from '../../lib/runtime/breakpoints';
import { locateScanTargetInPage } from '../../lib/runtime/scan-target-overlay';
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

type DevtoolsEvalExceptionInfo = {
  isException?: boolean;
  description?: string;
  value?: string;
};

type DevtoolsInspectResult = 'inspected' | 'not-found' | 'invalid-selector' | 'inspect-failed';

type DevtoolsInspectedWindowApi = {
  eval: (
    expression: string,
    options: Record<string, never>,
    callback: (result: unknown, exceptionInfo?: DevtoolsEvalExceptionInfo) => void,
  ) => void;
};

type ChromeWithDevtools = typeof globalThis & {
  chrome?: {
    devtools?: {
      inspectedWindow?: DevtoolsInspectedWindowApi;
    };
  };
};

function fixedDevtoolsTabId(): number | undefined {
  try {
    const value = new URLSearchParams(window.location.search).get('focustraceTabId');
    if (!value) return undefined;
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined;
  } catch {
    return undefined;
  }
}

const inspectedTabId = fixedDevtoolsTabId();
document.documentElement.dataset.ftUiScale = '100';
if (inspectedTabId != null) document.documentElement.dataset.ftSurface = 'devtools';

function devtoolsInspectedWindow(): DevtoolsInspectedWindowApi | undefined {
  if (inspectedTabId == null) return undefined;
  return (globalThis as ChromeWithDevtools).chrome?.devtools?.inspectedWindow;
}

function devtoolsInspectExpression(selector: string): string {
  return `(() => {
    let element;
    try {
      element = document.querySelector(${JSON.stringify(selector)});
    } catch {
      return 'invalid-selector';
    }
    if (!element) return 'not-found';
    try {
      inspect(element);
      return 'inspected';
    } catch {
      return 'inspect-failed';
    }
  })()`;
}

function inspectSelectorInDevtools(selector: string): Promise<DevtoolsInspectResult> {
  const inspectedWindow = devtoolsInspectedWindow();
  if (!inspectedWindow) return Promise.resolve('inspect-failed');

  return new Promise((resolve, reject) => {
    inspectedWindow.eval(devtoolsInspectExpression(selector), {}, (result, exceptionInfo) => {
      if (exceptionInfo?.isException) {
        reject(new Error(exceptionInfo.description || exceptionInfo.value || 'DevTools could not inspect the selected DOM element.'));
        return;
      }

      if (
        result === 'inspected'
        || result === 'not-found'
        || result === 'invalid-selector'
        || result === 'inspect-failed'
      ) {
        resolve(result);
        return;
      }

      reject(new Error('DevTools returned an unexpected DOM inspection result.'));
    });
  });
}

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

if (inspectedTabId == null) {
  browser.tabs.onActivated.addListener(({ tabId }) => {
    void syncBreakpointPreferencesToTab(tabId).catch(() => undefined);
  });
}

function requestSurfacePageAccess(): Promise<WebPageTab | undefined> {
  return inspectedTabId != null
    ? requestTabPageAccess(inspectedTabId)
    : requestActivePageAccess();
}

async function locateSelectorOnPage(selector: string): Promise<void> {
  const tab = await requestSurfacePageAccess().catch(() => undefined);
  if (!tab) return;

  await browser.scripting.executeScript({
    target: { tabId: tab.id },
    func: locateScanTargetInPage,
    args: [selector, { tone: 'inspect', label: 'FocusTrace', focusTarget: false }],
  }).catch(() => undefined);
}

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

  // In the DevTools surface the compact finding-location action delegates to
  // the browser's native Elements panel instead of recreating an HTML inspector.
  // Stop before React's normal on-page highlight handler; outside DevTools the
  // existing React handler remains untouched.
  const findingLocationButton = target.closest('.finding-location > button') as HTMLButtonElement | null;
  const inspectedWindow = devtoolsInspectedWindow();
  if (findingLocationButton && inspectedWindow && !findingLocationButton.disabled) {
    const selector = findingLocationButton.closest('.finding-location')?.querySelector('code')?.textContent?.trim();
    if (selector) {
      event.preventDefault();
      event.stopPropagation();
      void inspectSelectorInDevtools(selector)
        .then((result) => {
          if (result !== 'inspected') void locateSelectorOnPage(selector);
        })
        .catch(() => locateSelectorOnPage(selector));
      return;
    }
  }

  const pagerButton = target.closest('.scan-occurrence-pager button') as HTMLButtonElement | null;
  if (pagerButton && !pagerButton.disabled) {
    const pageAccess = requestSurfacePageAccess().catch(() => undefined);
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

    const savedBreakpoints = stored[RUNTIME_BREAKPOINT_SETTINGS_STORAGE_KEY] as Partial<RuntimeBreakpointSettings> | undefined;
    if (savedBreakpoints) {
      if (inspectedTabId != null) {
        await syncBreakpointPreferencesToTab(inspectedTabId, savedBreakpoints);
      } else {
        const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
        if (tab?.id != null) await syncBreakpointPreferencesToTab(tab.id, savedBreakpoints);
      }
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
