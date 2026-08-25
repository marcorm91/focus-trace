import { defineConfig, type UserManifest } from 'wxt';

const e2eHostPermissions = process.env.FOCUSTRACE_E2E === '1'
  ? ['http://127.0.0.1/*']
  : undefined;

const AUTO_RUNTIME_HOST_PERMISSIONS = new Set(['http://*/*', 'https://*/*']);

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
  hooks: {
    'build:manifestGenerated': (_wxt, manifest) => {
      // The runtime content-script entrypoint is injected explicitly after the
      // user activates FocusTrace. WXT derives its broad `matches` as permanent
      // host permissions for runtime registration, but FocusTrace deliberately
      // relies on `activeTab` instead. Preserve only explicitly configured hosts
      // such as the localhost permission used by the E2E build.
      if (!manifest.host_permissions) return;
      manifest.host_permissions = manifest.host_permissions.filter(
        (permission: string) => !AUTO_RUNTIME_HOST_PERMISSIONS.has(permission),
      );
      if (manifest.host_permissions.length === 0) delete manifest.host_permissions;
    },
  },
});
