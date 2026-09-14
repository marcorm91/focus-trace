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

Redaction is a defensive boundary, not a promise that arbitrary free text can never contain personal data. The UI therefore tells auditors to record only their judgement and not to enter passwords, tokens, form values, captions, transcripts or media content.

All guided evidence remains local to the extension and uses the existing storage permission. The framework does not add host permissions and does not transmit inspected-page data.

## Sample workflow

`FT-GUIDED-001` proves the complete framework using WCAG 2.2 Success Criterion 1.3.3 Sensory Characteristics (Level A). It asks the auditor to inspect relevant instructions and then decide whether any instruction relies only on characteristics such as color, shape, size, visual position, orientation, or sound without another textual or programmatic way to identify the target.

The sample is intentionally contextual. FocusTrace records the auditor's judgement but does not infer a deterministic WCAG failure from page text.

## Keyboard, focus and dialog workflows

`FT-GUIDED-002` guides a keyboard-only pass for WCAG 2.1.1 and 2.1.2. It asks the auditor to start from a known focus point, operate pointer-equivalent actions using keyboard input, and verify that focus can leave non-modal components through standard or documented keys.

`FT-GUIDED-003` covers WCAG 2.4.3 and 2.4.7 through sequential focus order, focus visibility, and contextual focus movement after navigation or dynamic UI changes.

`FT-GUIDED-004` covers dialog entry, modal containment, close/Escape behavior and focus restoration, using WCAG 2.1.2, WCAG 2.4.3 and the WAI-ARIA APG modal-dialog pattern as references. Intentional Tab/Shift+Tab containment inside an open modal is valid behavior and is not classified as a keyboard trap by itself.

These workflows reuse the existing FocusTrace Trace/runtime stream rather than introducing a second recorder. When a guided step is saved, up to two relevant events from that step are copied into bounded `runtime-observation` evidence. Manual answers and notes remain separate evidence kinds, so observed behavior and auditor judgement are distinguishable in persisted sessions and reports.

Runtime observations support review but never decide the guided result automatically. A dialog problem remains contextual: examples include unexpected focus escape, inability to close the dialog through the expected keyboard mechanism, or illogical focus restoration after close.

## Table, form, resize and multimedia workflows

`FT-GUIDED-005` reviews complex table header relationships for WCAG 1.3.1. The auditor checks row, column and grouped headers and representative data cells using the table semantics already exposed by FocusTrace. The workflow records the judgement, not cell contents.

`FT-GUIDED-006` covers WCAG 3.3.1, 3.3.2, 3.3.3 and 3.3.4. It asks the auditor to review instructions, trigger representative validation with synthetic data, judge error identification and suggestions, and verify review/reversal/confirmation where consequential submissions require it. Field values are never captured by the guided workflow.

`FT-GUIDED-007` covers WCAG 1.4.4 and 1.4.10. It reuses the existing Resize Text 200% comparison and the Reflow 320 CSS px baseline, then asks the auditor to decide whether content, controls and functionality remain available without unacceptable clipping, overlap or two-dimensional scrolling.

`FT-GUIDED-008` covers prerecorded multimedia alternatives for WCAG 1.2.1, 1.2.2, 1.2.3 and 1.2.5. The auditor judges captions, equivalent alternatives and audio description quality. FocusTrace stores only the manual judgement and optional redacted note; it does not copy or persist audio, video, caption or transcript payloads.

Each substantive step in these four workflows has an explicit WCAG criterion mapping shown in the guided UI and retained by the static workflow definition. Unlike the keyboard/focus/dialog workflows, `FT-GUIDED-005` through `FT-GUIDED-008` do not attach runtime Trace observations automatically.

## APG widget-pattern workflows

`FT-GUIDED-009` through `FT-GUIDED-016` cover tabs, accordion/disclosure, menu, combobox/listbox, tree, grid, carousel and tooltip. They are explicitly labelled **informative APG guidance** because WAI-ARIA APG interaction patterns support implementation review but are not, by themselves, WCAG conformance outcomes.

Each APG workflow asks the auditor to confirm applicability and select an implementation variation before the run. The selected variation is persisted as bounded session metadata so repeated reviews can distinguish, for example, manual versus automatic tab activation, single versus multi-select widgets, or automatic versus manual carousel rotation without consuming per-step evidence capacity.

Relevant Trace evidence is reused conservatively. `aria-widget` observations are filtered by the rule IDs associated with the selected pattern, while bounded keyboard/focus/virtual-focus/change evidence can support patterns that do not have a dedicated runtime rule. The runtime stream never chooses a guided answer automatically.

Browser acceptance fixtures provide accessible, failure and review/variation scenarios for all eight supported patterns. They exist to keep the guided instructions and expected interaction branches testable without claiming an automated APG conformance engine.

## Reporting and standards coverage

Guided tests appear in the Report workspace under an explicit **Guided test · manual evidence** label with a warning that the result is not automated conformance. Completed step answers remain visible with the outcome so a reviewer can understand how the manual conclusion was reached.

`config/guided-tests.json` is the machine-readable coverage declaration for this framework. Entries use `coverage: "guided-manual"` and `automated: false`. This catalog is intentionally separate from the axe-core parity benchmark and from automatic rule counts.

## Extension boundary

New guided definitions should reuse this lifecycle, privacy model, and result vocabulary instead of creating parallel manual-testing state. Domain-specific workflows can add their own prompts and standards references while keeping manual evidence clearly separated from automatic rule outcomes.
