import { defineConfig } from 'wxt';
import react from '@wxt-dev/module-react';

export default defineConfig({
  modules: [react()],
  manifest: {
    name: 'FocusTrace',
    description: 'Local-first WCAG 2.2 accessibility rule engine and runtime focus debugger.',
    permissions: ['activeTab', 'scripting', 'storage', 'sidePanel'],
    side_panel: {
      default_path: 'sidepanel.html'
    },
    action: {
      default_title: 'Open FocusTrace'
    }
  }
});
