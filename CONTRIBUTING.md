# Contributing to FocusTrace

Thanks for helping improve FocusTrace.

FocusTrace is an accessibility debugging tool, so contributions are expected to preserve the same evidence-first approach used by the scanner and runtime debugger: do not turn ambiguous behavior into a deterministic WCAG failure, do not weaken keyboard accessibility, and do not add permissions or data collection without a clear product need.

## Before you start

For non-trivial changes, open or join an issue first so the problem, intended behavior and testing strategy are clear before implementation.

Small fixes, documentation improvements and regression tests can go directly to a pull request.

Read [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) before changing storage, extension messaging, inspected-page execution or permission boundaries. Those parts of FocusTrace cross browser execution contexts and have stricter lifecycle/privacy constraints than ordinary UI code.

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
npm run capabilities:validate
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
- whether WCAG, ACT, ARIA, AccName, HTML/HTML-AAM or APG references are involved;
- what was deliberately not changed;
- how the change was validated.

Prefer regression tests for bug fixes. Do not bundle unrelated formatting, refactors or dependency changes into a feature PR.

## Capability catalog maintenance

`README.md` and `README.es.md` contain the public functional capability catalog for FocusTrace. Keep them aligned with actual product behavior.

Update both catalogs in the same PR whenever you add, remove or materially change:

- a `FT-*` rule, standards mapping, outcome or detector behavior;
- a scanner, Trace, Structure, Focus Walk, Replay, Journey, Graph, Site Audit, Memory or reporting capability;
- user-visible limits, browser support, permissions, privacy behavior or export behavior;
- any new user-facing workflow even when it has no rule ID.

Run `npm run capabilities:validate` before opening the PR. CI checks that every source-defined FocusTrace rule ID is represented in both README catalogs. Features without a rule ID must still be maintained manually through this contributor contract and the PR checklist.

If rule methodology or applicability changes, update [`docs/RULES.md`](docs/RULES.md) as well. Keep the English and Spanish catalogs semantically equivalent rather than allowing one language to become a reduced version of the other.

Automated agents must also follow [`AGENTS.md`](AGENTS.md).

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

## Privacy, storage and permissions

FocusTrace is local-first. Contributions must not introduce analytics, telemetry, remote AI calls, DOM uploads, screenshot uploads or other external transmission of inspected-page data without an explicit project decision and corresponding privacy review.

Do not broaden extension permissions unless the feature requires it. Prefer optional, user-initiated permissions where possible.

Persistent features must define their lifecycle explicitly. Before adding browser-storage data, document whether it is session or durable state, how it is bounded, which execution context writes it, how concurrent writes are handled and how the user can remove it. Do not make product behavior depend on whether a React presentation component happened to render.

See [`PRIVACY.md`](PRIVACY.md), [`SECURITY.md`](SECURITY.md) and [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Code style

Follow the existing TypeScript/React structure and repository conventions. Keep runtime logic testable outside the UI where practical. Prefer pure helpers in `shared/` or `lib/` over business logic hidden inside view effects.

The project uses TypeScript, Vitest, Playwright and Oxlint. CI is the final gate, but contributors should run the relevant checks locally first.

Functions passed to `browser.scripting.executeScript({ func })` must be self-contained because the inspected page does not receive module closures.

## Licensing contributions

By submitting a contribution, you agree that your contribution may be distributed under the repository's GNU General Public License v3.0-only terms.

Do not submit code, assets, standards data or copied material unless you have the right to contribute it under compatible terms. Preserve required attribution and source metadata for standards-derived snapshots.

## Brand

The source-code license does not grant permission to present a fork as the official FocusTrace product. See [`TRADEMARKS.md`](TRADEMARKS.md) for the project-name and logo policy.

## Reporting bugs and proposing features

Use GitHub Issues for reproducible bugs, accessibility rule discussions and feature proposals. For security-sensitive reports, follow [`SECURITY.md`](SECURITY.md) instead of opening a public issue with vulnerability details.
