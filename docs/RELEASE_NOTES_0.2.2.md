# FocusTrace 0.2.2

FocusTrace 0.2.2 strengthens the runtime debugger around WCAG 2.2 context changes and tightens the privacy boundary of persisted Trace evidence.

The release keeps FocusTrace's conservative evidence model: observed runtime ordering can be strong diagnostic evidence without proving author-handler causation or every WCAG exception, so the new context-change rules remain explicit `REVIEW` findings rather than automatic failures.

## Highlights

### On Focus — WCAG 3.2.1 A

Trace adds `FT-RUNTIME-008` for context changes observed shortly after a component receives focus.

Within a bounded 1.2-second correlation window, FocusTrace can review cases where receiving focus is followed by an observed:

- SPA/navigation route change;
- dialog opening;
- programmatic focus move.

Separate user actions clear stale attribution, explicit button/link activation is not treated as an On Focus problem, and ordinary sequential focus movement is not blamed on the previously focused control.

The result remains `REVIEW`, because runtime ordering alone cannot prove which author handler initiated the context change.

### On Input — WCAG 3.2.2 A

Trace adds `FT-RUNTIME-009` for context changes observed after a trusted control-setting event.

The detector correlates trusted `input` / `change` events from supported setting controls with the same route, dialog and programmatic-focus signals used by the On Focus review.

When browser event ordering produces both `input` and a later blur-driven `change` for one text edit, FocusTrace preserves the original edit as the causal signal instead of replacing it with the later commit event.

The rule remains `REVIEW`, because WCAG 3.2.2 permits an automatic context change when the user has been advised beforehand, and that prior advice cannot always be established from runtime evidence alone.

### Privacy hardening for runtime URLs

0.2.2 prevents common URL-carried user or session data from being retained in Trace, reports or exports.

FocusTrace now:

- retains origin + pathname for route identity;
- replaces query-string content with `?[redacted]`;
- replaces fragment content with `#[redacted]`;
- strips URL credentials through normalized origin handling;
- applies the same policy to raw route events, SPA focus/title reviews and WCAG 3.2.1 / 3.2.2 context-change reviews.

Raw URLs may still be used transiently in-page to detect that navigation occurred, but sensitive query/hash content is not persisted as runtime evidence.

Path segments remain visible because FocusTrace uses them to identify the observed route. Applications that place sensitive data directly in pathname segments remain outside this narrow hardening boundary.

### Non-sensitive control-setting evidence

Context-change tracking records control identity and the trusted setting-event type, not the control value itself.

This keeps the diagnostic sequence useful while avoiding retention of typed form content in the new WCAG 3.2 runtime evidence.

## Test and reliability coverage

The 0.2.2 regression suite adds or strengthens coverage for:

- focus-triggered SPA route changes;
- trusted select changes followed by navigation;
- text input followed by a programmatic focus move;
- explicit activation and safe inline-setting negative cases;
- input/change causal ordering for text controls;
- dialog context changes;
- sequential-focus false-positive prevention;
- query/hash/credential URL redaction;
- browser E2E assertions proving fictitious email/token values do not appear in persisted session events;
- English/Spanish context-change labels, evidence and remediation;
- critical coverage for the new runtime context-change module.

## Documentation and rule contracts

The rule catalog, runtime presentation, remediation, README EN/ES, `docs/RULES.md` and severity audit are aligned with `FT-RUNTIME-008` and `FT-RUNTIME-009`.

FocusTrace does not claim exhaustive WCAG 3.2.1 or 3.2.2 evaluation. The rules cover only the explicitly documented runtime signals that FocusTrace can observe and correlate conservatively.

## Privacy and permissions

0.2.2 adds no FocusTrace backend, analytics pipeline or new production permission.

The local-first model is unchanged. The release reduces retained runtime URL detail and does not persist form-control values for the new context-change tracking.

## Browser targets

Release targets remain:

- Google Chrome 114+;
- Chromium-based Microsoft Edge;
- Firefox 115+ as an experimental release target pending the packaged-build smoke checklist.

## EN 301 549 context

FocusTrace continues to use WCAG 2.2 as its web-conformance source. Relevant implemented WCAG criteria may support evaluation against corresponding EN 301 549 web requirements, but FocusTrace does **not** claim complete EN 301 549 coverage, certification or conformance.

## Validation before publishing

Before the final 0.2.2 version bump/tag, run the complete release gate on the exact candidate commit:

```bash
npm run release:check:full
npm audit --omit=dev
npm audit
```

The final candidate must keep `package.json`, `package-lock.json`, generated browser manifests, release documentation and `tests/release-contract.test.ts` aligned on `0.2.2`. CI must be green on the exact commit intended for `v0.2.2`, and the manual checks in `docs/RELEASE_CHECKLIST.md` must be completed before publishing production packages.
