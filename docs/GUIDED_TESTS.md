# Guided accessibility tests

FocusTrace guided tests cover accessibility questions that require user action, contextual judgement, or both. They are local, evidence-first workflows and are deliberately separate from the automated rule engine.

## Result model

A guided test is declared as a bounded sequence of steps. Each step provides a localized title and prompt, an explicit set of allowed manual answers, and bounded evidence captured only from the workflow itself. The current answer vocabulary is `acknowledged`, `pass`, `issue`, `not-applicable`, and `uncertain`.

A completed guided session produces one of four manual outcomes:

- `guided-pass` — the auditor completed the workflow and did not identify the tested problem;
- `guided-issue` — the auditor explicitly recorded a problem;
- `guided-review` — the auditor could not make a safe final judgement;
- `not-applicable` — the substantive steps were marked not applicable.

These values are **manual evidence, not automated conformance outcomes**. They do not increment automated PASS, FAIL, REVIEW, or WARNING totals and must not be presented as proof that FocusTrace automatically evaluated the complete linked WCAG success criterion.

## Session lifecycle

A guided session can be started, paused, resumed, cancelled, and restarted. The active state is stored in `browser.storage.session`, so closing or leaving the Report workspace does not silently discard an interrupted run. Recovery validates the stored schema before the session is reused.

Storage is intentionally bounded:

- at most 8 guided sessions are retained;
- at most 20 steps can be materialized in one session;
- at most 4 evidence records are retained per step;
- free-text auditor notes are limited to 240 characters.

Cancelled runs remain local evidence but are not treated as completed guided results. Restart creates a fresh session instead of mutating the previous answers into a new run.

## Privacy and redaction

The framework never reads form control values automatically. Stored page context removes query strings and fragments. Free-text evidence is normalized and common sensitive patterns are redacted before persistence, including email addresses, long payment/account-like numbers, and assignments whose labels look like passwords, tokens, secrets, API keys, authorization, cookies, sessions, or values.

Redaction is a defensive boundary, not a promise that arbitrary free text can never contain personal data. The UI therefore tells auditors not to enter passwords, tokens, or form values.

All guided evidence remains local to the extension and uses the existing storage permission. The framework does not add host permissions and does not transmit inspected-page data.

## Sample workflow

`FT-GUIDED-001` proves the complete framework using WCAG 2.2 Success Criterion 1.3.3 Sensory Characteristics (Level A). It asks the auditor to inspect relevant instructions and then decide whether any instruction relies only on characteristics such as color, shape, size, visual position, orientation, or sound without another textual or programmatic way to identify the target.

The sample is intentionally contextual. FocusTrace records the auditor's judgement but does not infer a deterministic WCAG failure from page text. Future issues can register additional guided definitions on the same framework; keyboard, focus, and dialog workflows are scoped separately.

## Reporting and standards coverage

Guided tests appear in the Report workspace under an explicit **Guided test · manual evidence** label with a warning that the result is not automated conformance. Completed step answers remain visible with the outcome so a reviewer can understand how the manual conclusion was reached.

`config/guided-tests.json` is the machine-readable coverage declaration for this framework. Entries use `coverage: "guided-manual"` and `automated: false`. This catalog is intentionally separate from the axe-core parity benchmark and from automatic rule counts.

## Extension boundary

New guided definitions should reuse this lifecycle, privacy model, and result vocabulary instead of creating parallel manual-testing state. Domain-specific workflows can add their own prompts and standards references while keeping manual evidence clearly separated from automatic rule outcomes.
