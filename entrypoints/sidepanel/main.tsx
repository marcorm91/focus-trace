import React from 'react';
import { createRoot } from 'react-dom/client';
import { browser } from '#imports';
import { armReportVisualEvidencePermissionRequest } from '../../lib/report/visual-evidence';
import { normalizeUiScale, UI_SCALE_STORAGE_KEY } from '../../shared/ui-scale';
import App from './App';
import { ImpactMatrix } from './components/ImpactMatrix';
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

const PAGE_ACCESS_ORIGINS = ['http://*/*', 'https://*/*'];
const root = document.getElementById('root');
if (!root) throw new Error('FocusTrace root element was not found.');

document.documentElement.dataset.ftUiScale = '100';
void browser.storage.local.get(UI_SCALE_STORAGE_KEY).then((stored) => {
  document.documentElement.dataset.ftUiScale = String(
    normalizeUiScale(stored[UI_SCALE_STORAGE_KEY]),
  );
});

// Start optional permission requests synchronously from the original click.
// Browser permission APIs can lose user-gesture eligibility after awaited work.
document.addEventListener('click', (event) => {
  armReportVisualEvidencePermissionRequest(event.target);

  const target = event.target instanceof Element ? event.target : null;
  if (target?.closest('.finding-location button')) {
    void browser.permissions.request({ origins: PAGE_ACCESS_ORIGINS }).catch(() => false);
  }
}, { capture: true });

createRoot(root).render(
  <React.StrictMode>
    <App />
    <ImpactMatrix />
  </React.StrictMode>
);
