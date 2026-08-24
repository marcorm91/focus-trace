import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'FocusTrace',
    description: 'Run local WCAG 2.2 checks and debug focus, SPA transitions and dynamic accessibility behavior.',
    version: '0.1.0',
    minimum_chrome_version: '114',
    permissions: ['activeTab', 'scripting', 'storage', 'sidePanel'],
    action: {
      default_title: 'Open FocusTrace',
    },
  },
});
