# FocusTrace severity audit

Audit date: 2026-08-26

This document records the rule-by-rule review behind the base severity values in `shared/rule-catalog.ts`.

Severity is a FocusTrace prioritization aid. It is not a WCAG conformance level. WCAG A / AA / AAA remains separate from `critical / serious / moderate / minor`.

## Method

For each rule we reviewed:

1. the user barrier that the FocusTrace rule can actually demonstrate or flag;
2. whether the result is a deterministic `fail`, a `review`, or a `warning`;
3. the applicable W3C / ACT / APG references already attached to the rule;
4. a comparable axe-core 4.12 impact where the tested condition is sufficiently close;
5. whether that external comparison is **direct** or only **partial**.

axe-core is a comparison reference only. FocusTrace does not call axe-core at runtime and does not copy its result into a finding. Rules without a sufficiently equivalent external rule keep a FocusTrace-assessed impact.

## Changes from the previous catalog

| Rule | Previous | Audited | Reason |
| --- | --- | --- | --- |
| `FT-WCAG-006` aria-hidden + sequential focus | critical | **serious** | Directly comparable `aria-hidden-focus` is Serious; the barrier is substantial but is not necessarily a complete task blocker. |
| `FT-WARN-001` deprecated ARIA role | moderate | **minor** | Directly comparable `aria-deprecated-role` is Minor; deprecation alone is primarily an authoring/future-compatibility risk. |
| `FT-WARN-003` prohibited ARIA property | moderate | **serious** | Directly comparable `aria-prohibited-attr` is Serious; prohibited semantics can be ignored or misrepresented to assistive technology. |
| `FT-REVIEW-001` positive tabindex | moderate | **serious** | Directly comparable `tabindex` is Serious. FocusTrace still reports it as `review` because whether the resulting focus order is actually harmful requires context. |

## Current rule audit

| FocusTrace rule | Base impact | Outcome family | Comparable impact reference | Audit note |
| --- | --- | --- | --- | --- |
| `FT-WCAG-001` Page title | serious | fail | axe `document-title` — Serious — direct | Missing titles make page/view identification and multi-tab navigation substantially harder. |
| `FT-WCAG-002` Image name | serious | fail | axe `image-alt` — Critical; `role-img-alt` — Serious — partial | FocusTrace deliberately uses one rule for native `img` and `role=img`; comparable impacts differ, so no false direct equivalence is claimed. |
| `FT-WCAG-003` Button name | critical | fail | axe `button-name` — Critical; `aria-command-name` — Serious — partial | An unnamed button can make an action impossible to identify or invoke reliably. |
| `FT-WCAG-004` Form field name | critical | fail | axe `select-name` — Critical; `aria-input-field-name` — Serious — partial | The FocusTrace rule spans several native and ARIA field roles; an unnamed control can block form completion. |
| `FT-WCAG-005` Link name | serious | fail | axe `link-name` — Serious — direct | An unnamed link hides destination/purpose and substantially impairs navigation. |
| `FT-WCAG-006` aria-hidden focus | serious | fail | axe `aria-hidden-focus` — Serious — direct | Keyboard operability and accessibility-tree exposure disagree. |
| `FT-WCAG-007` Label in name | serious | fail / warning | axe `label-content-name-mismatch` — Serious — direct | Voice-input users may be unable to target the visible label. |
| `FT-WCAG-008` Page lang present | serious | fail | axe `html-has-lang` — Serious — direct | Missing language can apply incorrect pronunciation across the document. |
| `FT-WCAG-009` Page lang known | serious | fail | axe `html-lang-valid` — Serious — direct | Invalid primary language can apply incorrect language rules across the document. |
| `FT-WCAG-010` Text contrast | serious | fail / review | axe `color-contrast` — Serious — direct | Low contrast can make text difficult or impossible to read; uncertain compositions remain review. |
| `FT-WCAG-011` Non-text contrast | serious | fail / review | FocusTrace-assessed | Essential boundaries, indicators and graphics can become difficult to perceive. |
| `FT-WARN-001` Deprecated ARIA role | minor | warning | axe `aria-deprecated-role` — Minor — direct | Usually a limited immediate barrier; primarily an authoring and compatibility risk. |
| `FT-WARN-002` Deprecated ARIA property | minor | warning | FocusTrace-assessed | Deprecation alone does not prove the current interaction is blocked. |
| `FT-WARN-003` Prohibited ARIA property | serious | warning | axe `aria-prohibited-attr` — Serious — direct | Important semantics/state may be ignored or exposed incorrectly. |
| `FT-REVIEW-001` Positive tabindex | serious | review | axe `tabindex` — Serious — direct | It can substantially disrupt sequential focus, but the final order still needs contextual review. |
| `FT-REVIEW-002` Heading level jump | minor | review | axe `heading-order` — Moderate — partial | FocusTrace only detects a skip signal; a skip alone does not prove a misleading document hierarchy. |
| `FT-REVIEW-003` Placeholder-only label | moderate | review | FocusTrace-assessed | The field has a computed name, but the visible cue can disappear while typing. |
| `FT-RUNTIME-001` Focused element removed | serious | runtime | FocusTrace-assessed | Can disorient users and interrupt the current interaction. |
| `FT-RUNTIME-002` Focus completely obscured | serious | runtime | FocusTrace-assessed | Keyboard users can be operating a control they cannot perceive. |
| `FT-RUNTIME-003` SPA title unchanged | moderate | runtime | FocusTrace-assessed | The new view can be harder to identify without necessarily blocking the task. |
| `FT-RUNTIME-004` SPA focus unchanged | moderate | runtime | FocusTrace-assessed | Context may be unclear, but actual harm depends strongly on transition design. |
| `FT-RUNTIME-005` Focused element became hidden | serious | runtime | FocusTrace-assessed | Users can lose both visible position and a reliable assistive-technology target. |
| `FT-APG-001` Dialog opened without focus | serious | runtime | FocusTrace-assessed from APG behavior | Keyboard/screen-reader users can be separated from the active dialog task. |
| `FT-APG-002` Modal focus escape | serious | runtime | FocusTrace-assessed from APG behavior | Background controls can become reachable while a modal is active. |
| `FT-APG-003` Dialog focus restore | moderate | runtime | FocusTrace-assessed from APG behavior | Users may need to recover their prior position, but the page normally remains operable. |

## Guardrails

The catalog is the source of truth. Automated tests require every rule to provide a non-empty English and Spanish rationale. Direct external comparisons must use the same impact as the FocusTrace rule; differences are allowed only when the reference is explicitly marked as `partial`.

This is intentionally a base-impact model. A future contextual model may raise or lower the effective severity of an occurrence only when FocusTrace can justify that change from concrete evidence such as task blocking, alternatives, repetition, or interaction state.
