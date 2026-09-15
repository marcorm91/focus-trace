# FocusTrace 1.0.0

FocusTrace 1.0.0 brings together the independent accessibility engine, guided manual testing, local audit management and developer automation added since 0.2.9. The release is prepared from `main` after the final contrast, lifecycle and validation fixes in #283.

FocusTrace remains local-first and evidence-first: deterministic findings, contextual REVIEW, authoring WARNING and informative APG guidance are distinct. A clean report is not WCAG or EN 301 549 certification, and this version number is not a claim of complete axe parity.

## Expanded page and component analysis

- Specialized accessible-name evidence for native and ARIA controls, dialogs and other supported semantics, sharing the existing name computation.
- Supported ElementInternals semantics and form-associated labels through a local optional bridge; unavailable browser evidence remains conservative.
- ARIA role/state/relationship checks, document structure and landmarks, native/ARIA lists, table names/headers/cell relationships, and embedded frame/SVG/object alternatives.
- Form labels, groups, purpose, constraints, instructions and error association without retaining editable field values.
- Viewport enlargement restrictions, orientation review, keyboard/navigation/refresh/motion evidence and conservative visual composition handling.
- Bounded traversal through open Shadow DOM, assigned slots and same-origin frames, with explicit unavailable-context and traversal-budget evidence.

## Guided testing and revalidation

- A reusable guided-test framework with bounded session state, pause/resume/cancel/restart and separate auditor answers and observed evidence.
- Guided keyboard, focus, dialog, table, form, zoom and multimedia workflows.
- Guided APG widget-pattern checks whose informative outcomes remain separate from WCAG conformance.
- Per-finding Recheck with stable node resolution and explicit resolved, persistent, changed, missing and inconclusive outcomes, preserving original evidence.
- Saved local user-flow regression scenarios with redacted routes, bounded storage and manual stops for ambiguous or potentially destructive actions.

## Audit management and reports

- Finding deduplication, lifecycle comparison, local auditor workflow states and notes.
- Reusable standards, rule, severity and scope profiles with applied configuration snapshots.
- Evidence-based remediation guidance in English and Spanish.
- Expanded Site Audit discovery, exclusions, sampling, template grouping and compatible baseline comparison.
- Versioned JSON, standalone HTML, CSV, SARIF and JUnit exports. REVIEW/WARNING outcomes are not serialized as deterministic failures; export escaping and CSV formula protection remain enforced.

## CLI and Playwright

- A reusable audit-core boundary and local CLI using the same scanner contracts as the extension, without a FocusTrace or Deque account.
- Playwright page/component checkpoints, saved baselines, configurable thresholds and report artifacts.
- Reusable GitHub Actions examples and separate Chromium/Firefox evidence artifacts.
- No axe-core runtime dependency or remote Deque service is introduced. The 105-rule classification data is a historical development benchmark; current full parity is not inferred from it.

## Final reliability fixes

- Generated icon-font glyphs are distinguished from ordinary generated text instead of being blindly evaluated as WCAG 1.4.3 text. Semantic guidance applies to real host/control elements.
- Opaque RGB backdrops, including black and red, are no longer mistaken for transparent colors during contrast verification.
- The 100-candidate backdrop-check budget now leaves subsequent unverified candidates as REVIEW with explicit evidence and consistent counters.
- Lifecycle comparison reserves exact evidence matches before pairing changes, preventing result order from misclassifying persistent findings.
- Added direct regressions for composed contexts and browser contrast behavior, and aligned the full local gate with the CI Chromium/Firefox scanner example.

## Compatibility and privacy

- Chrome, Edge and Firefox builds use Manifest V3 and inherit version 1.0.0 from the package manifest.
- Required installation permissions remain unchanged. Page access and visual-capture authority remain optional in production; Firefox DevTools access is optional.
- After page access is granted, the optional persistent ElementInternals bridge can observe subsequently created semantics on permitted pages; this does not start a full scan or Trace or transmit inspected-page data.
- Existing bounded local Memory, notes and saved evidence remain available. Export schema versions change independently of the application version; this release does not force a new interchange schema.
- Firefox extension support retains its documented experimental/manual-validation boundary. Automated scanner tests on Firefox do not establish complete Firefox extension or assistive-technology compatibility.

## Release evidence and remaining checks

The final hardening PR #283 passed 1,196 unit tests, 64 extension E2E tests and two Chromium/Firefox scanner examples. The release PR must pass the same gates on its own versioned commit; baseline results alone are not release evidence.

See `docs/RELEASE_CHECKLIST.md` and `docs/FINAL_RELEASE_REVIEW.md`. Expert/public beta, manual assistive-technology and packaged-browser validation, final store privacy/support URLs and store submission remain explicit tasks under #250 until their evidence is recorded. Preparing this release does not mark those tasks complete or close #224/#250.

Production packages must be generated from the approved release commit after production builds and manifest validation. E2E output carries test-only required host permissions and must not be distributed as a production ZIP.
