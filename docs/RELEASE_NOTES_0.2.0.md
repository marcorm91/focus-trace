# FocusTrace 0.2.0

FocusTrace 0.2.0 expands the runtime and multipage WCAG 2.2 review model and makes the new findings directly actionable in both English and Spanish.

The release keeps the product's existing evidence boundary: deterministic conditions can be reported as failures, while criteria that depend on interaction context, intent or cross-page interpretation remain explicit `REVIEW` findings rather than being promoted to automatic failures.

## Highlights

### Focus Not Obscured (Minimum) — WCAG 2.4.11 AA

`FT-RUNTIME-002` now rechecks the currently focused control when the page changes around it, including relevant scroll, resize and DOM-mutation activity.

FocusTrace samples the visible focused area and reports a review signal only when every sampled point is covered. The runtime logic also excludes FocusTrace's own overlay UI, document roots and visually transparent/non-rendered blockers from obstruction evidence.

This is designed to surface cases such as a sticky header, drawer, banner or dynamically inserted overlay fully covering a control that still owns focus.

### Dragging Movements — WCAG 2.5.7 AA

Trace can now record `FT-RUNTIME-006` when meaningful pointer movement is observed on a likely drag-capable target.

The signal is intentionally conservative:

- small click/tap jitter does not count as dragging;
- a minimum pointer-distance threshold is required;
- browser-native `dragstart` alone is not treated as evidence, avoiding noise from ordinary image/link dragging;
- the result is `REVIEW`, because FocusTrace cannot automatically prove whether an equivalent single-pointer alternative exists or whether dragging is essential.

### Consistent Help — WCAG 3.2.6 A

Site Audit adds `FT-REVIEW-011` to compare repeated help mechanisms across sampled pages.

The comparison looks at the relative order of shared help mechanism categories such as human contact, contact details, self-help and automated contact. At least two shared categories are required before FocusTrace can produce a review signal, which avoids flagging pages where there is not enough evidence to compare order meaningfully.

### Actionable remediation in Trace and Site Audit

The three 0.2.0 findings now share one bilingual remediation model rather than duplicating correction copy across views.

Replay and Runtime can show a **How to fix / Cómo corregirlo** block with three concrete strategies plus a verification step for:

- `FT-RUNTIME-002` — Focus Not Obscured;
- `FT-RUNTIME-006` — Dragging Movements.

Site Audit reuses the same remediation source for:

- `FT-REVIEW-011` — Consistent Help.

The guidance remains contextual. FocusTrace does not apply an automatic fix and does not imply that one suggested technique is universally correct for every implementation.

### English and Spanish coverage

Titles, descriptions, evidence, standard labels and remediation guidance for the new findings are available in English and Spanish. Technical identifiers such as rule IDs, selectors and WCAG criterion numbers remain unchanged.

## EN 301 549 context

FocusTrace continues to use WCAG 2.2 as its web-conformance source. The WCAG 2.2 criteria addressed in this release are also reflected in the web requirements of EN 301 549 V4.1.1 (2026-09).

This release does **not** claim complete EN 301 549 coverage, certification or conformance. FocusTrace implements selected automated/runtime/review evidence that can support a broader accessibility evaluation; requirements outside that implemented scope still require the appropriate manual or specialist assessment.

## Test and reliability coverage

0.2.0 adds regression coverage for:

- dynamic focus-obscuration sampling and transparent-overlay handling;
- drag threshold, cancellation and conservative review behavior;
- consistent-help order comparison and minimum shared-mechanism requirements;
- WCAG coverage mappings for 2.4.11, 2.5.7 and 3.2.6;
- Spanish evidence preservation for cross-page help comparisons;
- bilingual actionable remediation and Site Audit reuse of the shared guidance source.

## Privacy and permissions

The new runtime and Site Audit checks do not add a FocusTrace backend, analytics pipeline, new dependency, or new production permission.

The existing local-first model remains unchanged: inspected-page evidence is processed by the extension and stored according to the existing session/audit boundaries. Production page access remains optional and user initiated.

## Browser targets

Release targets remain:

- Google Chrome 114+;
- Chromium-based Microsoft Edge;
- Firefox 115+ as an experimental release target pending the manual packaged-build smoke checklist.

## Validation before publishing

Run the complete release gate on the exact candidate commit:

```bash
npm run release:check:full
npm audit --omit=dev
npm audit
```

CI must be green on the exact commit intended for `v0.2.0`, and the manual checks in `docs/RELEASE_CHECKLIST.md` must be completed before the tag and production packages are published.
