import React from 'react';
import { createRoot } from 'react-dom/client';
import { browser } from '#imports';
import { armReportVisualEvidencePermissionRequest } from '../../lib/report/visual-evidence';
import { locateScanTargetInPage } from '../../lib/runtime/scan-target-overlay';
import { SETTINGS_STORAGE_KEY } from '../../shared/i18n';
import { normalizeUiScale, UI_SCALE_STORAGE_KEY } from '../../shared/ui-scale';
import App from './App';
import { ImpactMatrix } from './components/ImpactMatrix';
import { ReportScanCompact } from './components/ReportScanCompact';
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
import './final-review-polish.css';
import './heading-text-overflow.css';
import './icon-followup-fixes.css';

const PAGE_ACCESS_ORIGINS = ['http://*/*', 'https://*/*'];
const root = document.getElementById('root');
if (!root) throw new Error('FocusTrace root element was not found.');

document.documentElement.dataset.ftUiScale = '100';

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

function syncDynamicPolish() {
  const spanish = document.documentElement.lang === 'es';
  const actionLabel = spanish ? 'Destacar elemento en la página' : 'Highlight element on page';

  document.querySelectorAll<HTMLButtonElement>('.finding-location > button').forEach((button) => {
    if (button.getAttribute('aria-label') !== actionLabel) button.setAttribute('aria-label', actionLabel);
    if (button.title !== actionLabel) button.title = actionLabel;
  });

  const note = document.querySelector<HTMLElement>('.scan-results-note p');
  if (note) {
    const text = spanish
      ? 'Cada criterio se muestra una sola vez. Ábrelo para recorrer los elementos afectados. La acción de foco destaca el elemento actual en la página. Chrome no permite a una extensión abrir DevTools automáticamente; para inspeccionar el DOM en vivo, abre F12 y usa Elements. Las revisiones de contraste complejo requieren verificación manual y no son fallos WCAG automáticos.'
      : 'Each criterion is shown once. Open it to move through the affected elements. The focus action highlights the current element on the page. Chrome does not allow an extension to open DevTools automatically; open F12 and use Elements to inspect the live DOM. Complex contrast reviews require manual verification and are not automatic WCAG failures.';
    if (note.textContent !== text) note.textContent = text;
  }
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

const uiObserver = new MutationObserver(syncDynamicPolish);
uiObserver.observe(root, { childList: true, subtree: true });
const languageObserver = new MutationObserver(syncDynamicPolish);
languageObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

void (async () => {
  try {
    const stored = await browser.storage.local.get([UI_SCALE_STORAGE_KEY, SETTINGS_STORAGE_KEY]);
    document.documentElement.dataset.ftUiScale = String(normalizeUiScale(stored[UI_SCALE_STORAGE_KEY]));
    const settings = stored[SETTINGS_STORAGE_KEY] as { language?: 'en' | 'es' } | undefined;
    if (settings?.language === 'en' || settings?.language === 'es') {
      document.documentElement.lang = settings.language;
    }
  } catch {
    // App has its own settings fallback; bootstrap should never block rendering.
  }

  createRoot(root).render(
    <React.StrictMode>
      <App />
      <ImpactMatrix />
      <ReportScanCompact />
    </React.StrictMode>,
  );
  window.requestAnimationFrame(syncDynamicPolish);
})();
