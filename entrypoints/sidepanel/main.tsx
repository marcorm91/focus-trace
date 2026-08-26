import React from 'react';
import { createRoot } from 'react-dom/client';
import { browser } from '#imports';
import { armReportVisualEvidencePermissionRequest } from '../../lib/report/visual-evidence';
import { normalizeUiScale, UI_SCALE_STORAGE_KEY } from '../../shared/ui-scale';
import App from './App';
import './style.css';
import './focus-graph.css';
import './scan-settings.css';
import './scan-accordion.css';
import './ux-polish.css';
import './settings-scale.css';
import './ui-scale.css';
import './visual-system.css';
import './accessibility-guardrails.css';

const root = document.getElementById('root');
if (!root) throw new Error('FocusTrace root element was not found.');

document.documentElement.dataset.ftUiScale = '100';
void browser.storage.local.get(UI_SCALE_STORAGE_KEY).then((stored) => {
  document.documentElement.dataset.ftUiScale = String(
    normalizeUiScale(stored[UI_SCALE_STORAGE_KEY]),
  );
});

// Start the optional screenshot permission request synchronously from the
// Export PDF click. permissions.request() loses its user-gesture eligibility
// after awaited work, while the actual report preparation happens later.
document.addEventListener('click', (event) => {
  armReportVisualEvidencePermissionRequest(event.target);
}, { capture: true });

createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
