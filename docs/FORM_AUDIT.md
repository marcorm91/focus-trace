# Form audit methodology

This document complements `docs/RULES.md` with the form-specific applicability, evidence and privacy boundaries introduced or tightened by issue #233.

FocusTrace keeps form analysis evidence-first and conservative. Deterministic empty accessible-name failures continue to use `FT-WCAG-004`; contextual labeling, grouping and instruction signals use `FT-REVIEW-040`; input-purpose syntax uses `FT-REVIEW-014`; and observed error-state evidence uses `FT-REVIEW-019` / `FT-REVIEW-020`.

## `FT-REVIEW-040` — Form labeling, grouping and instructions

`FT-REVIEW-040` is a **serious REVIEW** family mapped to WCAG 1.3.1 and 3.3.2 plus HTML form semantics. It intentionally does not convert the following structural signals into automatic WCAG failures because final adequacy can depend on wording, task context and author intent.

### Multiple native labels

An exposed native `input`, `select` or `textarea` with more than one associated `<label>` is reviewed. Multiple labels can be intentional, so FocusTrace records the count and target rather than declaring failure. This provides partial benchmark coverage for axe-core `form-field-multiple-labels` while preserving human judgement.

### Title-only control names

An exposed supported form control whose bounded accessible-name computation resolves only through `title` is reviewed. FocusTrace does not report the same control as an empty-name `FT-WCAG-004` failure because a programmatic name exists; the review instead asks whether a persistent, robust label is available. Together with the existing placeholder review, this strengthens partial coverage of axe-core `label-title-only`.

### Unnamed groups

Exposed `fieldset`, `role="group"` and `role="radiogroup"` containers with at least two eligible controls are reviewed when no usable group name is observable. For native fieldsets, a non-empty direct `legend` is accepted. Explicit `aria-label` and resolved non-empty `aria-labelledby` references are accepted for supported group semantics.

A missing group name remains REVIEW because not every set of adjacent controls necessarily needs a shared group label and the complete relationship can depend on page context.

### Constraint instructions

Controls exposing correction-relevant constraint metadata such as `pattern`, `min`, `max`, `step`, `minlength` or `maxlength` are reviewed when FocusTrace cannot resolve a non-empty `aria-describedby` or `aria-details` relationship.

This is not a claim that ARIA description relationships are the only valid way to satisfy WCAG 3.3.2. Visible labels, surrounding instructions and other programmatic relationships can still satisfy the criterion. The detector therefore identifies a bounded review candidate rather than failing the field.

### Required-state exposure

FocusTrace reviews a field when its associated native or `aria-labelledby` label text contains a bounded English/Spanish required-word signal but neither native `required` nor `aria-required="true"` is exposed.

The lexical signal is deliberately small and is used only to identify REVIEW candidates. FocusTrace does not infer required state from arbitrary natural language and never turns wording alone into a deterministic failure.

## Input purpose (`FT-REVIEW-014`)

The existing Identify Input Purpose review continues to validate explicit standard-like `autocomplete` token sequences conservatively. Issue #233 tightens two boundaries:

- a `section-*` token must contain a non-empty identifier after `section-`;
- readonly `input` and `textarea` controls are excluded from this review family.

Unknown-only/custom taxonomies remain intentionally unreported because a non-HTML taxonomy can still make purpose programmatically determinable. FocusTrace does not infer a required purpose from a field name, label, placeholder or input type.

## Error identification and suggestions

### `FT-REVIEW-019`

FocusTrace considers a control applicable when it exposes explicit `aria-invalid` other than `false` or browser-supported `:user-invalid`. A resolved non-empty `aria-errormessage` or `aria-describedby` target is bounded positive evidence that associated text exists. Missing associated text remains REVIEW, not FAIL, because visual or application-level error messaging can exist outside the modeled relationship.

### `FT-REVIEW-020`

Correction-suggestion review is emitted only when an observed invalid control already has associated non-empty error text and exposes correction-relevant constraint metadata such as `required`, constrained native input types, `pattern`, `min`, `max`, `step` or length bounds. Suggestion quality and the WCAG security/purpose exception remain manual.

## Privacy boundary

Form auditing must not retain user-entered data.

- `FT-REVIEW-040` never reads or stores editable field values.
- `FT-REVIEW-019` and `FT-REVIEW-020` inspect associated error text only to determine whether non-empty text exists.
- The text of the associated error message is not copied into finding evidence.
- Evidence retains only structural relationships such as `aria-errormessage -> #id (non-empty text)`, constraint metadata and the target selector.
- Component scans apply the same privacy boundary and report only targets inside the selected component.

These boundaries are covered by focused fixtures that include a private-looking field value and matching error copy and assert that neither survives serialized scan findings.

## Benchmark relationship

With issue #233, the axe-core 4.13 benchmark changes from **88/105** to **89/105** covered rules:

- `form-field-multiple-labels`: `missing` → `partial` via `FT-REVIEW-040`;
- `label-title-only`: `overlap` → `partial` via `FT-REVIEW-003` + `FT-REVIEW-040`.

The relationships remain partial because FocusTrace uses bounded local semantics and intentionally keeps contextual form-authoring concerns as REVIEW rather than reproducing axe outcome semantics blindly.
