import { defineConfig, type UserManifest } from 'wxt';
import packageJson from './package.json';

const OPTIONAL_PAGE_HOST_PERMISSIONS = ['http://*/*', 'https://*/*'];
const OPTIONAL_VISUAL_CAPTURE_HOST_PERMISSION = '<all_urls>';
const OPTIONAL_HOST_PERMISSIONS = [
  ...OPTIONAL_PAGE_HOST_PERMISSIONS,
  OPTIONAL_VISUAL_CAPTURE_HOST_PERMISSION,
];
const FIREFOX_115_OPTIONAL_PERMISSIONS = [
  ...OPTIONAL_HOST_PERMISSIONS,
  'devtools',
] as unknown as NonNullable<UserManifest['optional_permissions']>;
// Browser-level sidepanel/runtime tests inject representative state directly. In
// a real session the equivalent page/capture authority exists only after an
// explicit user action has granted page access and/or activeTab. The E2E build
// therefore mirrors that post-grant state without changing production manifests.
const e2eHostPermissions = process.env.FOCUSTRACE_E2E === '1'
  ? OPTIONAL_HOST_PERMISSIONS
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
    name: '__MSG_extensionName__',
    description: '__MSG_extensionDescription__',
    default_locale: 'en',
    version: packageJson.version,
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
          // Firefox 115 keeps optional host patterns under optional_permissions.
          // DevTools is optional too so introducing the panel in an update does
          // not force a new install/update permission warning. Users can enable
          // it explicitly from FocusTrace Settings when they want the F12 panel.
          optional_permissions: FIREFOX_115_OPTIONAL_PERMISSIONS,
        }
      : { optional_host_permissions: OPTIONAL_HOST_PERMISSIONS }),
    ...(e2eHostPermissions ? { host_permissions: e2eHostPermissions } : {}),
    icons,
    action: {
      default_title: '__MSG_actionTitle__',
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
      // actions in production instead, so keep production access optional.
      // E2E intentionally preserves its required hosts to model the already-
      // granted permission state that exists after a successful analysis.
      if (process.env.FOCUSTRACE_E2E === '1') return;
      if (!manifest.host_permissions) return;
      manifest.host_permissions = manifest.host_permissions.filter(
        (permission: string) => !AUTO_RUNTIME_HOST_PERMISSIONS.has(permission),
      );
      if (manifest.host_permissions.length === 0) delete manifest.host_permissions;
    },
  },
});
