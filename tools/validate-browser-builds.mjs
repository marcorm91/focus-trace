import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const packageJson = JSON.parse(readFileSync(resolve('package.json'), 'utf8'));

function readManifest(target) {
  return JSON.parse(readFileSync(resolve('.output', target, 'manifest.json'), 'utf8'));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const chrome = readManifest('chrome-mv3');
const edge = readManifest('edge-mv3');
const firefox = readManifest('firefox-mv3');

for (const [name, manifest] of Object.entries({ chrome, edge, firefox })) {
  assert(manifest.manifest_version === 3, `${name} must be Manifest V3`);
  assert(manifest.version === packageJson.version, `${name} version must match package.json`);
  assert(!manifest.host_permissions, `${name} production build must not request host_permissions`);
}

for (const [name, manifest] of Object.entries({ chrome, edge })) {
  assert(manifest.minimum_chrome_version === '114', `${name} must require Chromium 114+`);
  assert(manifest.permissions?.includes('activeTab'), `${name} must request activeTab`);
  assert(manifest.permissions?.includes('scripting'), `${name} must request scripting`);
  assert(manifest.permissions?.includes('storage'), `${name} must request storage`);
  assert(manifest.permissions?.includes('sidePanel'), `${name} must request sidePanel`);
  assert(manifest.side_panel?.default_path === 'sidepanel.html', `${name} must expose sidepanel.html`);
}

assert(!firefox.minimum_chrome_version, 'Firefox manifest must not contain minimum_chrome_version');
assert(firefox.permissions?.includes('activeTab'), 'Firefox must request activeTab');
assert(firefox.permissions?.includes('scripting'), 'Firefox must request scripting');
assert(firefox.permissions?.includes('storage'), 'Firefox must request storage');
assert(!firefox.permissions?.includes('sidePanel'), 'Firefox must not request Chromium sidePanel');
assert(firefox.sidebar_action?.default_panel === 'sidepanel.html', 'Firefox must expose sidepanel.html as sidebar_action');
assert(firefox.browser_specific_settings?.gecko?.id === 'focustrace@focus-mode.app', 'Firefox must have a stable Gecko ID');
assert(firefox.browser_specific_settings?.gecko?.strict_min_version === '115.0', 'Firefox must require version 115+');
assert(
  firefox.browser_specific_settings?.gecko?.data_collection_permissions?.required?.length === 1
    && firefox.browser_specific_settings.gecko.data_collection_permissions.required[0] === 'none',
  'Firefox must declare that it does not collect/transmit data',
);

console.log('Browser build manifests validated: chrome-mv3, edge-mv3, firefox-mv3');
