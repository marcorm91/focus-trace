import { defineConfig, type UserManifest } from 'wxt';

const e2eHostPermissions = process.env.FOCUSTRACE_E2E === '1'
  ? ['http://127.0.0.1/*']
  : undefined;

const icons = {
  16: 'icon/16.png',
  32: 'icon/32.png',
  48: 'icon/48.png',
  128: 'icon/128.png',
  512: 'icon/512.png',
};

const actionIcons = {
  16: 'icon/16.png',
  32: 'icon/32.png',
  48: 'icon/48.png',
  128: 'icon/128.png',
};

export function manifestForBrowser(browser: string): UserManifest {
  const firefox = browser === 'firefox';

  return {
    name: 'FocusTrace',
    description: 'Run local WCAG 2.2 checks and debug focus, SPA transitions and dynamic accessibility behavior.',
    version: '0.1.0',
    ...(firefox
      ? {
          browser_specific_settings: {
            gecko: {
              id: 'focustrace@focus-mode.app',
              strict_min_version: '115.0',
              data_collection_permissions: {
                required: ['none'],
              },
            },
          },
        }
      : { minimum_chrome_version: '114' }),
    permissions: firefox
      ? ['activeTab', 'scripting', 'storage']
      : ['activeTab', 'scripting', 'storage', 'sidePanel'],
    ...(e2eHostPermissions ? { host_permissions: e2eHostPermissions } : {}),
    icons,
    action: {
      default_title: 'Open FocusTrace',
      default_icon: actionIcons,
    },
  };
}

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: ({ browser }) => manifestForBrowser(browser),
});
