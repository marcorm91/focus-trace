# FocusTrace

**Debug accessibility focus like you debug JavaScript.**

FocusTrace is a local-first browser extension with its own WCAG 2.2 rule engine and a runtime debugger for keyboard focus, SPA navigation and dynamic UI behavior.

The project is in active early development. Automated results are intentionally separated into deterministic failures, contextual review signals and authoring warnings so the extension does not claim certainty it cannot support.

## What makes it different?

FocusTrace combines complementary workflows instead of treating accessibility as a single static scan.

### Full page analysis

The local rule engine evaluates observable WCAG/ARIA expectations and keeps diagnostic evidence such as accessible-name provenance and measured contrast ratios. Rules are mapped to:

- WCAG 2.2 success criteria;
- W3C ACT Rules where an applicable testing rule exists;
- WAI-ARIA semantics and registry data;
- AccName / HTML-AAM naming behavior;
- WAI-ARIA APG for runtime widget patterns.

FocusTrace does not use axe-core as its scanner.

### Runtime Trace

Trace records what the user did, what had focus, what changed in the page and where focus moved afterwards. Recorded evidence can be inspected as a journey, correlated interactions, a focus graph or a read-only replay.

The runtime debugger can derive deterministic causal explanations for patterns such as a focused node being removed, a modal opening without receiving focus or SPA navigation leaving focus behind. These explanations describe recorded evidence; they do not turn contextual behavior into an automatic WCAG conformance claim.

### Smart Site Audit

Site Audit extends the same local page scanner to representative coverage of a whole same-origin site without blindly repeating the same scan across thousands of equivalent URLs.

The first Site Audit workflow:

- discovers same-origin URLs from `robots.txt`, sitemap files and internal links;
- normalizes tracking noise and duplicate URL forms;
- groups repeated route families such as `/product/:item`;
- samples up to three representative pages per route family within a global scan budget;
- renders each representative page in a real browser tab and runs the normal FocusTrace scanner, preserving computed CSS, contrast and rendered DOM evidence;
- compares a coarse semantic structure fingerprint across samples;
- distinguishes signals observed in every scanned sample from page-specific variations;
- exports an aggregated `.txt` report or printable/PDF view.

Current safety limits are 500 discovered URLs and 30 actually scanned pages per run. These limits are intentional: Site Audit is representative sampling, not a claim that every URL in a route family is identical.

Runtime Trace is not automatically exercised across every Site Audit page. Authentication flows, dynamic states and complete WCAG conformance still require targeted manual/runtime testing.

## Current rule engine

Current static coverage includes:

- page title;
- image accessible name / decorative treatment;
- button, form field and link accessible names;
- visible label contained in the accessible name;
- `aria-hidden="true"` content remaining in sequential focus navigation;
- page language presence and known primary language subtag;
- WCAG 1.4.3 text contrast with structured ratio/color evidence;
- conservative WCAG 1.4.11 non-text contrast coverage for deterministic visual cues;
- positive `tabindex`, placeholder-only labels and heading-level jumps as review signals;
- deprecated/prohibited ARIA authoring signals as warnings.

For deterministic contrast failures, FocusTrace can show HEX/RGB values, copy recorded colors and suggest a small sRGB adjustment that reaches the required ratio. Complex visual composition remains REVIEW rather than being manufactured into a false failure.

Runtime recording currently observes:

- keyboard and pointer interactions;
- focus movement, backward navigation, loops and unexpected jumps;
- focused nodes removed or made hidden;
- SPA route changes;
- modal dialog initial focus, focus escape and restoration;
- relevant DOM mutations and dialog lifecycle evidence;
- accessibility breakpoints for selected deterministic runtime causes.

Trace also includes a read-only replay of recorded evidence and a Trace-first report that combines static findings with runtime interaction stories and recommendations.

See [`docs/RULES.md`](docs/RULES.md) for methodology, sources and limitations.

## Browser support

FocusTrace targets Manifest V3.

Currently supported release targets:

- Google Chrome 114+
- Microsoft Edge based on Chromium

Experimental pre-release target:

- Firefox 115+

The Firefox build is generated and validated in CI, but it remains experimental until the manual Firefox smoke checklist has been completed against the packaged build. The same sidepanel UI is generated as a Firefox sidebar by WXT.

## Extension permissions

FocusTrace intentionally keeps its production permission set narrow:

| Permission | Browser | Why it is needed |
| --- | --- | --- |
| `activeTab` | Chrome / Edge / Firefox | Work with the page the user explicitly activates FocusTrace on. |
| `scripting` | Chrome / Edge / Firefox | Inject the local analysis/runtime instrumentation into pages the user has granted access to. |
| `storage` | Chrome / Edge / Firefox | Persist extension preferences and local state. |
| `sidePanel` | Chrome / Edge | Provide the FocusTrace debugging interface in the Chromium side panel. |

Firefox uses its native sidebar manifest integration instead of requesting the Chromium-only `sidePanel` permission.

Production builds do not require permanent HTTP/HTTPS host access. HTTP and HTTPS are declared as optional host permissions and are requested from explicit user actions when FocusTrace needs page access. Site Audit requests access to the current site when the user starts the audit so representative same-origin pages can be opened and scanned. A localhost host permission is enabled only for the end-to-end test build.

## Privacy

All analysis runs locally in the browser. FocusTrace does not send page content, DOM data, screenshots, Site Audit results or recorded interactions to a FocusTrace server or third-party AI API.

Site Audit fetches public/site-visible discovery files such as `robots.txt` and sitemaps directly from the audited site and opens representative pages in the user's own browser profile. No external crawler service is involved.

## Try the latest development build

After the CI workflow succeeds for a push to `main`, GitHub Actions publishes development artifacts from that exact commit:

- `focustrace-chrome-dev`
- `focustrace-firefox-dev`

### Chrome

1. Open the repository **Actions** tab and choose **Dev Extension**.
2. Open the latest successful run and download `focustrace-chrome-dev`.
3. Unzip it to a local folder.
4. Open `chrome://extensions` and enable **Developer mode**.
5. Choose **Load unpacked** and select the folder that contains `manifest.json`.

To update an existing development installation, download the newest artifact, replace the local folder contents, then press **Reload** on the FocusTrace card in `chrome://extensions`.

### Firefox experimental build

1. Download and unzip `focustrace-firefox-dev` from the latest successful **Dev Extension** run.
2. Open `about:debugging#/runtime/this-firefox`.
3. Choose **Load Temporary Add-on…**.
4. Select the build's `manifest.json`.
5. Open FocusTrace from the toolbar action and complete the Firefox smoke checklist before treating the build as supported.

Each artifact includes `FOCUSTRACE_BUILD.txt` with the source commit SHA and browser target. Development artifacts are unsigned preview builds and are retained for 14 days.

## Development

Requirements:

- Node.js 22
- npm

Install dependencies and start the default Chromium development build:

```bash
npm install
npm run dev
```

Firefox MV3 development build:

```bash
npm run dev:firefox
```

Production builds:

```bash
npm run build
npm run build:edge
npm run build:firefox
```

Package browser artifacts:

```bash
npm run zip
npm run zip:edge
npm run zip:firefox
```

Run the main validation suite:

```bash
npm run check
npm test
npm run standards:validate
```

Run the release gate, including Chrome, Edge and Firefox MV3 production builds:

```bash
npm run release:check
```

Run the complete gate including Chromium browser E2E tests:

```bash
npm run release:check:full
```

See [`docs/RELEASE_CHECKLIST.md`](docs/RELEASE_CHECKLIST.md) before tagging a release or changing repository visibility.
