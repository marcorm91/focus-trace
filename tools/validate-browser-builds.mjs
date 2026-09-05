import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const packageJson = JSON.parse(readFileSync(resolve('package.json'), 'utf8'));
const EXPECTED_OPTIONAL_HOSTS = ['http://*/*', 'https://*/*', '<all_urls>'];
const CHROMIUM_PERMISSIONS = ['activeTab', 'scripting', 'storage', 'sidePanel'];
const FIREFOX_PERMISSIONS = ['activeTab', 'scripting', 'storage'];
const BUILD_TARGETS = ['chrome-mv3', 'edge-mv3', 'firefox-mv3'];

function readManifest(target) {
  return JSON.parse(readFileSync(resolve('.output', target, 'manifest.json'), 'utf8'));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sameValues(actual, expected) {
  if (!Array.isArray(actual)) return false;
  const left = [...actual].sort();
  const right = [...expected].sort();
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function hasNoRequiredHosts(manifest) {
  return manifest.host_permissions == null
    || (Array.isArray(manifest.host_permissions) && manifest.host_permissions.length === 0);
}

function hasNoPersistentContentScripts(manifest) {
  return manifest.content_scripts == null
    || (Array.isArray(manifest.content_scripts) && manifest.content_scripts.length === 0);
}

function hasSafeExtensionCsp(manifest) {
  const extensionPages = manifest.content_security_policy?.extension_pages;
  if (!extensionPages) return true;
  return !extensionPages.includes("'unsafe-eval'") && !/https?:\/\//i.test(extensionPages);
}

const chrome = readManifest('chrome-mv3');
const edge = readManifest('edge-mv3');
const firefox = readManifest('firefox-mv3');

console.log('Generated manifest security summary:');
console.log(JSON.stringify({
  chrome: {
    permissions: chrome.permissions,
    host_permissions: chrome.host_permissions,
    optional_host_permissions: chrome.optional_host_permissions,
    content_scripts: chrome.content_scripts,
    side_panel: chrome.side_panel,
  },
  edge: {
    permissions: edge.permissions,
    host_permissions: edge.host_permissions,
    optional_host_permissions: edge.optional_host_permissions,
    content_scripts: edge.content_scripts,
    side_panel: edge.side_panel,
  },
  firefox: {
    permissions: firefox.permissions,
    host_permissions: firefox.host_permissions,
    optional_permissions: firefox.optional_permissions,
    optional_host_permissions: firefox.optional_host_permissions,
    content_scripts: firefox.content_scripts,
    sidebar_action: firefox.sidebar_action,
    browser_specific_settings: firefox.browser_specific_settings,
  },
}, null, 2));

for (const [name, manifest] of Object.entries({ chrome, edge, firefox })) {
  assert(manifest.manifest_version === 3, `${name} must be Manifest V3`);
  assert(manifest.version === packageJson.version, `${name} version must match package.json`);
  assert(hasNoRequiredHosts(manifest), `${name} production build must not require permanent host access`);
  assert(hasNoPersistentContentScripts(manifest), `${name} must not auto-inject persistent content scripts; runtime analysis is user-triggered`);
  assert(hasSafeExtensionCsp(manifest), `${name} extension-page CSP must not allow unsafe-eval or remote HTTP(S) script sources`);
}

for (const target of BUILD_TARGETS) {
  assert(existsSync(resolve('.output', target, 'site-audit.html')), `${target} must include site-audit.html`);
  assert(existsSync(resolve('.output', target, 'report-print.html')), `${target} must include report-print.html`);
  assert(existsSync(resolve('.output', target, 'sidepanel.html')), `${target} must include sidepanel.html`);
  assert(existsSync(resolve('.output', target, 'background.js')), `${target} must include background.js`);
  assert(existsSync(resolve('.output', target, 'content-scripts', 'runtime.js')), `${target} must include the on-demand runtime content script`);
}

for (const [name, manifest] of Object.entries({ chrome, edge })) {
  assert(manifest.minimum_chrome_version === '114', `${name} must require Chromium 114+`);
  assert(sameValues(manifest.permissions, CHROMIUM_PERMISSIONS), `${name} permissions must exactly match the reviewed Chromium permission set`);
  assert(sameValues(manifest.optional_host_permissions, EXPECTED_OPTIONAL_HOSTS), `${name} must expose HTTP/HTTPS plus temporary visual-capture access as optional hosts`);
  assert(manifest.side_panel?.default_path === 'sidepanel.html', `${name} must expose sidepanel.html`);
}

assert(!firefox.minimum_chrome_version, 'Firefox manifest must not contain minimum_chrome_version');
assert(sameValues(firefox.permissions, FIREFOX_PERMISSIONS), 'Firefox permissions must exactly match the reviewed Firefox permission set');
assert(
  sameValues(firefox.optional_permissions, EXPECTED_OPTIONAL_HOSTS)
    || sameValues(firefox.optional_host_permissions, EXPECTED_OPTIONAL_HOSTS),
  'Firefox must expose HTTP/HTTPS plus temporary visual-capture access as optional hosts',
);
assert(firefox.sidebar_action?.default_panel === 'sidepanel.html', 'Firefox must expose sidepanel.html as sidebar_action');
assert(firefox.browser_specific_settings?.gecko?.id === 'focustrace@focus-mode.app', 'Firefox must have a stable Gecko ID');
assert(firefox.browser_specific_settings?.gecko?.strict_min_version === '115.0', 'Firefox must require version 115+');
assert(
  firefox.browser_specific_settings?.gecko?.data_collection_permissions?.required?.length === 1
    && firefox.browser_specific_settings.gecko.data_collection_permissions.required[0] === 'none',
  'Firefox must declare that it does not collect/transmit data',
);

console.log('Browser builds validated: exact permissions, optional host access, no persistent content scripts, safe CSP, and required entrypoints for chrome-mv3, edge-mv3 and firefox-mv3.');
