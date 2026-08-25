# FocusTrace

**Debug accessibility focus like you debug JavaScript.**

FocusTrace is a local-first Chrome/Edge extension with its own WCAG 2.2 rule engine and a runtime debugger for keyboard focus, SPA navigation and dynamic UI behavior.

The project is in active early development. The rule set and debugging UI will continue to evolve as runtime coverage grows.

## What makes it different?

FocusTrace does not use axe-core as its scanner. Its rules are implemented in this repository and explicitly mapped to:

- WCAG 2.2 success criteria
- W3C ACT Rules where an applicable testing rule exists
- WAI-ARIA APG for runtime widget patterns such as modal-dialog focus behavior

The second differentiator is time: FocusTrace records what had focus, what action occurred, what changed in the DOM, and where focus ended up afterwards.

## Current rule engine

The first static rules cover:

- non-empty page title
- image accessible name / decorative treatment
- button accessible name
- form-field accessible name
- link accessible name
- focusable content under `aria-hidden="true"`
- positive `tabindex` (review)
- skipped heading levels (review)

Runtime recording currently observes:

- focus, keyboard and click events
- focused nodes removed from the DOM
- possible complete focus obscuration
- SPA URL changes and unchanged page titles
- modal dialog initial focus, focus escape and restoration
- live-region mutations

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

For contribution guidelines, see [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Security

Please do not disclose security vulnerabilities through public issues. See [`SECURITY.md`](SECURITY.md) for the reporting process and security scope.

## Important conformance note

FocusTrace is an accessibility testing aid, not an automatic WCAG conformance certificate. A passing automated rule only means that the specific expectation tested by that rule passed.

## License

FocusTrace is released under the [MIT License](LICENSE).

## Author

Created by [Marco Romero](https://www.linkedin.com/in/marcorm91/).
