import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const packageJson = JSON.parse(readFileSync(resolve('package.json'), 'utf8'));
const EXPECTED_PAGE_HOSTS = ['http://*/*', 'https://*/*'];
const BUILD_TARGETS = ['chrome-mv3', 'edge-mv3', 'firefox-mv3'];

function readManifest(target) {
  return JSON.parse(readFileSync(resolve('.output', target, 'manifest.json'), 'utf8'));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sameHosts(actual) {
  if (!Array.isArray(actual)) return false;
  const left = [...actual].sort();
  const right = [...EXPECTED_PAGE_HOSTS].sort();
  return left.length === right.length && left.every((permission, index) => permission === right[index]);
}

function hasNoRequiredHosts(manifest) {
  return manifest.host_permissions == null
    || (Array.isArray(manifest.host_permissions) && manifest.host_permissions.length === 0);
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
    side_panel: chrome.side_panel,
  },
  edge: {
    permissions: edge.permissions,
    host_permissions: edge.host_permissions,
    optional_host_permissions: edge.optional_host_permissions,
    side_panel: edge.side_panel,
  },
  firefox: {
    permissions: firefox.permissions,
    host_permissions: firefox.host_permissions,
    optional_permissions: firefox.optional_permissions,
    optional_host_permissions: firefox.optional_host_permissions,
    sidebar_action: firefox.sidebar_action,
    browser_specific_settings: firefox.browser_specific_settings,
  },
}, null, 2));

for (const [name, manifest] of Object.entries({ chrome, edge, firefox })) {
  assert(manifest.manifest_version === 3, `${name} must be Manifest V3`);
  assert(manifest.version === packageJson.version, `${name} version must match package.json`);
  assert(hasNoRequiredHosts(manifest), `${name} production build must not require permanent host access`);
}

for (const target of BUILD_TARGETS) {
  assert(existsSync(resolve('.output', target, 'site-audit.html')), `${target} must include site-audit.html`);
  assert(existsSync(resolve('.output', target, 'report-print.html')), `${target} must include report-print.html`);
  assert(existsSync(resolve('.output', target, 'sidepanel.html')), `${target} must include sidepanel.html`);
}

for (const [name, manifest] of Object.entries({ chrome, edge })) {
  assert(manifest.minimum_chrome_version === '114', `${name} must require Chromium 114+`);
  assert(manifest.permissions?.includes('activeTab'), `${name} must request activeTab`);
  assert(manifest.permissions?.includes('scripting'), `${name} must request scripting`);
  assert(manifest.permissions?.includes('storage'), `${name} must request storage`);
  assert(manifest.permissions?.includes('sidePanel'), `${name} must request sidePanel`);
  assert(sameHosts(manifest.optional_host_permissions), `${name} must expose exactly HTTP/HTTPS as optional hosts`);
  assert(manifest.side_panel?.default_path === 'sidepanel.html', `${name} must expose sidepanel.html`);
}

assert(!firefox.minimum_chrome_version, 'Firefox manifest must not contain minimum_chrome_version');
assert(firefox.permissions?.includes('activeTab'), 'Firefox must request activeTab');
assert(firefox.permissions?.includes('scripting'), 'Firefox must request scripting');
assert(firefox.permissions?.includes('storage'), 'Firefox must request storage');
assert(!firefox.permissions?.includes('sidePanel'), 'Firefox must not request Chromium sidePanel');
assert(
  sameHosts(firefox.optional_permissions) || sameHosts(firefox.optional_host_permissions),
  'Firefox must expose exactly HTTP/HTTPS as optional hosts',
);
assert(firefox.sidebar_action?.default_panel === 'sidepanel.html', 'Firefox must expose sidepanel.html as sidebar_action');
assert(firefox.browser_specific_settings?.gecko?.id === 'focustrace@focus-mode.app', 'Firefox must have a stable Gecko ID');
assert(firefox.browser_specific_settings?.gecko?.strict_min_version === '115.0', 'Firefox must require version 115+');
assert(
  firefox.browser_specific_settings?.gecko?.data_collection_permissions?.required?.length === 1
    && firefox.browser_specific_settings.gecko.data_collection_permissions.required[0] === 'none',
  'Firefox must declare that it does not collect/transmit data',
);

console.log('Browser builds validated: chrome-mv3, edge-mv3, firefox-mv3 (including sidepanel, printable report and Site Audit entrypoints)');
