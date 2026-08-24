import { defineConfig } from 'wxt';

const e2eHostPermissions = process.env.FOCUSTRACE_E2E === '1'
  ? ['http://127.0.0.1/*']
  : undefined;

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'FocusTrace',
    description: 'Run local WCAG 2.2 checks and debug focus, SPA transitions and dynamic accessibility behavior.',
    version: '0.1.0',
    minimum_chrome_version: '114',
    permissions: ['activeTab', 'scripting', 'storage', 'sidePanel'],
    ...(e2eHostPermissions ? { host_permissions: e2eHostPermissions } : {}),
    action: {
      default_title: 'Open FocusTrace',
    },
  },
});
