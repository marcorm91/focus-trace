# FocusTrace

**Debug accessibility focus like you debug JavaScript.**

FocusTrace is a local-first Chrome/Edge extension with its own WCAG 2.2 rule engine and a runtime debugger for keyboard focus, SPA navigation and dynamic UI behavior.

## What makes it different?

FocusTrace does not use axe-core as its scanner. Its rules are implemented in the repository and explicitly mapped to:

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

## Privacy

All analysis runs locally in the browser. FocusTrace does not send page content, DOM data, screenshots or recorded interactions to a FocusTrace server or third-party AI API.

## Development

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
npm run zip
```

## Important conformance note

FocusTrace is an accessibility testing aid, not an automatic WCAG conformance certificate. A passing automated rule only means that the specific expectation tested by that rule passed.
