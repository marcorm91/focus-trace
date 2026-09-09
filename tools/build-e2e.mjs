// The browser E2E suite exercises the production side panel, runtime content
// scripts and service worker. Chromium DevTools itself is not opened by these
// Playwright fixtures, so building the DevTools HTML entrypoints here only
// changes Vite's shared-chunk graph without adding DevTools coverage.
//
// Keep the established runtime suite isolated from that unrelated bundling
// change. The normal release build still includes and validates devtools.html
// and devtools-panel.html, while DevTools has its own contract/build validation
// plus the packaged manual smoke checklist in docs/DEVTOOLS.md.
process.env.FOCUSTRACE_E2E = '1';

const { build } = await import('wxt');

await build({
  filterEntrypoints: [
    'audit-print',
    'background',
    'focus-visible',
    'hover-focus-content',
    'report-print',
    'runtime',
    'sidepanel',
    'site-audit',
  ],
});
