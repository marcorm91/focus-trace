# FocusTrace

**Debug accessibility focus like you debug JavaScript.**

FocusTrace is a local-first browser extension with its own WCAG 2.2 rule engine and a runtime debugger for keyboard focus, SPA navigation and dynamic UI behavior.

The project is in active early development. Automated results are intentionally separated into deterministic failures, contextual review signals and authoring warnings so the extension does not claim certainty it cannot support.

FocusTrace is free software licensed under **GNU GPL v3.0 only**. The source-code license and the FocusTrace project identity are intentionally separate; see [License and project identity](#license-and-project-identity).

## What makes it different?

FocusTrace combines two complementary workflows instead of treating accessibility as a single static scan.

### Full page analysis

The local rule engine evaluates observable WCAG/ARIA expectations and keeps diagnostic evidence such as accessible-name provenance and measured contrast ratios. Rules are mapped to:

- WCAG 2.2 success criteria;
- W3C ACT Rules where an applicable testing rule exists;
- WAI-ARIA semantics and registry data;
- AccName / HTML-AAM naming behavior;
- WAI-ARIA APG for runtime widget patterns.

FocusTrace uses its own local rule engine and does not require a third-party accessibility scanner.

### Runtime Trace

Trace records what the user did, what had focus, what changed in the page and where focus moved afterwards. Recorded evidence can be inspected as a journey, correlated interactions, a focus graph or a read-only replay.

The runtime debugger can derive deterministic causal explanations for patterns such as a focused node being removed, a modal opening without receiving focus or SPA navigation leaving focus behind. These explanations describe recorded evidence; they do not turn contextual behavior into an automatic WCAG conformance claim.

### Site Audit

Site Audit discovers same-origin pages from sitemaps, robots.txt, internal links and optional manually supplied URLs, groups repeated route families and runs the real FocusTrace page scanner on representative samples instead of blindly scanning every duplicate URL.

The current Site Audit safety limits are 500 discovered URLs, 30 scanned pages and 3 representative samples per route family. Template-wide findings are reported only when the same normalized target signal appears across every successfully scanned sample in that family. Representative sampling is not proof that every URL is identical, and runtime Trace is not automatically exercised across the whole site.

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
| `activeTab` | Chrome / Edge / Firefox | Analyze the page the user explicitly activates FocusTrace on. |
| `scripting` | Chrome / Edge / Firefox | Inject the local analysis/runtime instrumentation into the active page. |
| `storage` | Chrome / Edge / Firefox | Persist extension preferences and local state. |
| `sidePanel` | Chrome / Edge | Provide the FocusTrace debugging interface in the Chromium side panel. |

Firefox uses its native sidebar manifest integration instead of requesting the Chromium-only `sidePanel` permission.

Production builds do not require global host permissions. HTTP/HTTPS page access is declared as optional and requested only from explicit user actions. Printable reports can optionally include visual evidence; when that option is used, FocusTrace requests the browser's `<all_urls>` screenshot capability from the Export PDF click because `tabs.captureVisibleTab()` requires `activeTab` or `<all_urls>`. That broad screenshot permission is removed after the export operation. A localhost host permission is enabled only for the end-to-end test build.

## Privacy

All analysis runs locally in the browser. FocusTrace does not send page content, DOM data, screenshots or recorded interactions to a FocusTrace server or third-party AI API.

Visual evidence in printable reports is optional. Screenshot crops can contain visible page content, are prepared locally for that report only and are not transmitted by FocusTrace.

See [`PRIVACY.md`](PRIVACY.md) for the project privacy policy and [`SECURITY.md`](SECURITY.md) for responsible vulnerability reporting.

## License and project identity

FocusTrace source code is distributed under the **GNU General Public License version 3 only (`GPL-3.0-only`)**. See [`LICENSE`](LICENSE).

The GPL allows users to run, study, modify and redistribute covered code under its terms. When a covered modified build is conveyed, the GPL's source-code and license obligations continue to apply.

The FocusTrace name, logo and project identity are not granted by the source-code license for use in a way that implies an unofficial fork is the official FocusTrace release. Forks are welcome, but materially modified distributions should use a distinct primary name and visual identity. See [`TRADEMARKS.md`](TRADEMARKS.md).

Contributions are welcome under the same project license. See [`CONTRIBUTING.md`](CONTRIBUTING.md).

FocusTrace is intended to remain free to use. If voluntary sponsorship is introduced later, sponsorship should support continued development rather than silently changing the accessibility tool into a paywalled product.

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
