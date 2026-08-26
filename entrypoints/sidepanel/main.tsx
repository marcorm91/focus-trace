import React from 'react';
import { createRoot } from 'react-dom/client';
import { browser } from '#imports';
import { armReportVisualEvidencePermissionRequest } from '../../lib/report/visual-evidence';
import { locateScanTargetInPage } from '../../lib/runtime/scan-target-overlay';
import { normalizeUiScale, UI_SCALE_STORAGE_KEY } from '../../shared/ui-scale';
import App from './App';
import { ImpactMatrix } from './components/ImpactMatrix';
import { openFocusedSettingsView } from './settings-focus';
import './style.css';
import './focus-graph.css';
import './scan-settings.css';
import './scan-accordion.css';
import './ux-polish.css';
import './settings-scale.css';
import './ui-scale.css';
import './visual-system.css';
import './accessibility-guardrails.css';
import './severity.css';
import './workflow-fixes.css';
import './heading-tree-visual.css';
import './modern-icons.css';
import './regression-fixes.css';

const PAGE_ACCESS_ORIGINS = ['http://*/*', 'https://*/*'];
const root = document.getElementById('root');
if (!root) throw new Error('FocusTrace root element was not found.');

document.documentElement.dataset.ftUiScale = '100';
void browser.storage.local.get(UI_SCALE_STORAGE_KEY).then((stored) => {
  document.documentElement.dataset.ftUiScale = String(
    normalizeUiScale(stored[UI_SCALE_STORAGE_KEY]),
  );
});

async function locateCurrentOccurrence(pagerButton: HTMLButtonElement, permission: Promise<boolean>) {
  if (!(await permission)) return;

  // React updates the selected finding in the bubble phase. Read the selector on
  // the next frame so the page highlight always follows the newly selected item.
  await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
  const rule = pagerButton.closest('.scan-rule-group');
  const selector = rule?.querySelector('.finding-location code')?.textContent?.trim();
  if (!selector) return;

  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (tab?.id == null || !tab.url || !/^https?:/i.test(tab.url)) return;

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

  const pagerButton = target.closest('.scan-occurrence-pager button') as HTMLButtonElement | null;
  if (pagerButton && !pagerButton.disabled) {
    const permission = browser.permissions.request({ origins: PAGE_ACCESS_ORIGINS }).catch(() => false);
    void locateCurrentOccurrence(pagerButton, permission).catch(() => undefined);
  }
}, { capture: true });

createRoot(root).render(
  <React.StrictMode>
    <App />
    <ImpactMatrix />
  </React.StrictMode>
);
