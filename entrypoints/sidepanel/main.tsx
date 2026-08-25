import React from 'react';
import { createRoot } from 'react-dom/client';
import { browser } from '#imports';
import { normalizeUiScale, UI_SCALE_STORAGE_KEY } from '../../shared/ui-scale';
import App from './App';
import './style.css';
import './focus-graph.css';
import './scan-settings.css';
import './ux-polish.css';
import './ui-scale.css';

const root = document.getElementById('root');
if (!root) throw new Error('FocusTrace root element was not found.');

document.documentElement.dataset.ftUiScale = '100';
void browser.storage.local.get(UI_SCALE_STORAGE_KEY).then((stored) => {
  document.documentElement.dataset.ftUiScale = String(
    normalizeUiScale(stored[UI_SCALE_STORAGE_KEY]),
  );
});

createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
