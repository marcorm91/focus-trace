# Contributing to FocusTrace

Thanks for helping improve FocusTrace.

FocusTrace is an accessibility debugging tool, so contributions are expected to preserve the same evidence-first approach used by the scanner and runtime debugger: do not turn ambiguous behavior into a deterministic WCAG failure, do not weaken keyboard accessibility, and do not add permissions or data collection without a clear product need.

## Before you start

For non-trivial changes, open or join an issue first so the problem, intended behavior and testing strategy are clear before implementation.

Small fixes, documentation improvements and regression tests can go directly to a pull request.

## Development setup

Requirements:

- Node.js 22
- npm

Install dependencies:

```bash
npm ci
```

Start the default Chromium development build:

```bash
npm run dev
```

Useful validation commands:

```bash
npm run standards:validate
npm run check
npm run lint
npm test
npm run release:check
```

Run the complete local gate, including Chromium extension E2E tests, before a release-sensitive change:

```bash
npm run release:check:full
```

## Pull requests

Keep pull requests focused on one product or technical concern. A good PR should explain:

- the problem being solved;
- the user-visible behavior that changes;
- whether WCAG, ACT, ARIA, AccName, HTML-AAM or APG references are involved;
- what was deliberately not changed;
- how the change was validated.

Prefer regression tests for bug fixes. Do not bundle unrelated formatting, refactors or dependency changes into a feature PR.

## Accessibility requirements

FocusTrace must itself remain keyboard accessible and understandable with assistive technology.

When changing UI or interaction behavior:

- use semantic HTML before ARIA;
- preserve visible `:focus-visible` treatment;
- keep controls operable with the keyboard;
- provide accessible names for controls and meaningful status/error announcements;
- verify narrow side-panel layouts and zoom behavior;
- preserve reduced-motion and forced-colors behavior where applicable;
- keep English and Spanish human-readable UI copy in sync.

When changing scanner or runtime rules:

- deterministic evidence may produce a `FAIL` only when FocusTrace can actually prove the tested condition;
- contextual or visually ambiguous cases should remain `REVIEW`;
- authoring guidance that is not a conformance failure should remain a warning or review signal;
- APG guidance must not be presented as if it were normative WCAG conformance;
- standards IDs and technical evidence remain canonical even when surrounding copy is translated.

## Privacy and permissions

FocusTrace is local-first. Contributions must not introduce analytics, telemetry, remote AI calls, DOM uploads, screenshot uploads or other external transmission of inspected-page data without an explicit project decision and corresponding privacy review.

Do not broaden extension permissions unless the feature requires it. Prefer optional, user-initiated permissions where possible.

See [`PRIVACY.md`](PRIVACY.md) and [`SECURITY.md`](SECURITY.md).

## Code style

Follow the existing TypeScript/React structure and repository conventions. Keep runtime logic testable outside the UI where practical.

The project uses TypeScript, Vitest, Playwright and Oxlint. CI is the final gate, but contributors should run the relevant checks locally first.

## Licensing contributions

By submitting a contribution, you agree that your contribution may be distributed under the repository's GNU General Public License v3.0-only terms.

Do not submit code, assets, standards data or copied material unless you have the right to contribute it under compatible terms. Preserve required attribution and source metadata for standards-derived snapshots.

## Brand

The source-code license does not grant permission to present a fork as the official FocusTrace product. See [`TRADEMARKS.md`](TRADEMARKS.md) for the project-name and logo policy.

## Reporting bugs and proposing features

Use GitHub Issues for reproducible bugs, accessibility rule discussions and feature proposals. For security-sensitive reports, follow [`SECURITY.md`](SECURITY.md) instead of opening a public issue with vulnerability details.
