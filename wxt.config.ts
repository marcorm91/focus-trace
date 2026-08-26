import { defineConfig, type UserManifest } from 'wxt';

const OPTIONAL_PAGE_HOST_PERMISSIONS = ['http://*/*', 'https://*/*'];
const OPTIONAL_VISUAL_CAPTURE_HOST_PERMISSION = '<all_urls>';
const OPTIONAL_HOST_PERMISSIONS = [
  ...OPTIONAL_PAGE_HOST_PERMISSIONS,
  OPTIONAL_VISUAL_CAPTURE_HOST_PERMISSION,
];
const FIREFOX_115_OPTIONAL_HOSTS = OPTIONAL_HOST_PERMISSIONS as unknown as NonNullable<UserManifest['optional_permissions']>;
const e2eHostPermissions = process.env.FOCUSTRACE_E2E === '1'
  ? ['http://127.0.0.1/*']
  : undefined;
const AUTO_RUNTIME_HOST_PERMISSIONS = new Set(OPTIONAL_PAGE_HOST_PERMISSIONS);

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
    ...(firefox
      ? {
          // Firefox supports runtime host requests through optional_permissions
          // before optional_host_permissions was added in Firefox 128. WXT's
          // manifest type does not model those legacy host patterns.
          optional_permissions: FIREFOX_115_OPTIONAL_HOSTS,
        }
      : { optional_host_permissions: OPTIONAL_HOST_PERMISSIONS }),
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
      // WXT derives the runtime content-script matches as required host
      // permissions. FocusTrace asks for web-page access from explicit user
      // actions in the side panel instead, so keep production access optional.
      if (!manifest.host_permissions) return;
      manifest.host_permissions = manifest.host_permissions.filter(
        (permission: string) => !AUTO_RUNTIME_HOST_PERMISSIONS.has(permission),
      );
      if (manifest.host_permissions.length === 0) delete manifest.host_permissions;
    },
  },
});