# FocusTrace

**Debug accessibility focus like you debug JavaScript.**

FocusTrace is a local-first Chrome/Edge extension with its own WCAG 2.2 rule engine and a runtime debugger for keyboard focus, SPA navigation and dynamic UI behavior.

The project is in active early development. Automated results are intentionally separated into deterministic failures, contextual review signals and authoring warnings so the extension does not claim certainty it cannot support.

## What makes it different?

FocusTrace combines two complementary workflows instead of treating accessibility as a single static scan.

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

The current development target is Manifest V3 on Chromium-based browsers:

- Google Chrome 114+
- Microsoft Edge based on Chromium

Build scripts for additional browser targets may exist in the repository, but only targets explicitly documented here should be considered supported.

## Extension permissions

FocusTrace intentionally keeps its production permission set narrow:

| Permission | Why it is needed |
| --- | --- |
| `activeTab` | Analyze the page the user explicitly activates FocusTrace on. |
| `scripting` | Inject the local analysis/runtime instrumentation into the active page. |
| `storage` | Persist extension preferences and local state. |
| `sidePanel` | Provide the FocusTrace debugging interface in the browser side panel. |

Production builds do not request global host permissions. A localhost host permission is enabled only for the end-to-end test build.

## Privacy

All analysis runs locally in the browser. FocusTrace does not send page content, DOM data, screenshots or recorded interactions to a FocusTrace server or third-party AI API.

## Try the latest development build

After the CI workflow succeeds for a push to `main`, GitHub Actions publishes an installable Chrome MV3 artifact named `focustrace-chrome-dev`.

To install it:

1. Open the repository **Actions** tab and choose **Dev Extension**.
2. Open the latest successful run and download the `focustrace-chrome-dev` artifact.
3. Unzip it to a local folder.
4. Open `chrome://extensions` and enable **Developer mode**.
5. Choose **Load unpacked** and select the folder that contains `manifest.json`.

To update an existing development installation, download the newest artifact, replace the local folder contents, then press **Reload** on the FocusTrace card in `chrome://extensions`.

The artifact is generated from the exact `main` commit whose CI run succeeded and includes `FOCUSTRACE_BUILD.txt` with the source commit SHA. Development artifacts are unsigned preview builds and are retained for 14 days.

## Development

Requirements:

- Node.js 22
- npm

Install dependencies and start the development build:

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
npm run zip
```

Run the main validation suite:

```bash
npm run check
npm test
npm run standards:validate
```

Run the release gate, including Chrome and Edge production builds:

```bash
npm run release:check
```

Run the complete gate including browser E2E tests:

```bash
npm run release:check:full
```

See [`docs/RELEASE_CHECKLIST.md`](docs/RELEASE_CHECKLIST.md) before tagging a release or changing repository visibility.

For contribution guidelines, see [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Security

Please do not disclose security vulnerabilities through public issues. See [`SECURITY.md`](SECURITY.md) for the reporting process and security scope.

Before making the repository public, the complete Git history should be scanned with a dedicated secret scanner. Current-tree review is not a substitute for historical scanning.

## Important conformance note

FocusTrace is an accessibility testing aid, not an automatic WCAG conformance certificate. A passing automated rule only means that the specific expectation tested by that rule passed.

## License

FocusTrace is released under the [MIT License](LICENSE).

## Author

Created by [Marco Romero](https://www.linkedin.com/in/marcorm91/).
