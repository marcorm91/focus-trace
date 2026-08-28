# FocusTrace severity audit

Audit date: 2026-08-28

This document records the rule-by-rule review behind the base severity values in `shared/rule-catalog.ts`.

Severity is a FocusTrace prioritization aid. It is not a WCAG conformance level. WCAG A / AA / AAA remains separate from `critical / serious / moderate / minor`.

## Method

For each rule we reviewed:

1. the user barrier that the FocusTrace rule can actually demonstrate or flag;
2. whether the result is a deterministic `fail`, a `review`, or a `warning`;
3. the applicable W3C / ACT / WAI-ARIA / APG / HTML references attached to the rule;
4. whether the rule can block a task, substantially hinder it, create a meaningful difficulty, or normally remain localized;
5. whether the detected evidence is strong enough to justify the base impact without pretending to know page context that FocusTrace has not observed.

External standards references describe accessibility or authoring requirements and expected behavior. They do not define FocusTrace severity scores. The severity mapping is owned and maintained by FocusTrace.

## Changes from the previous catalog

| Rule | Previous | Audited | Reason |
| --- | --- | --- | --- |
| `FT-WCAG-006` aria-hidden + sequential focus | critical | **serious** | The barrier is substantial, but the condition does not necessarily prove a complete task blocker in every page context. |
| `FT-WARN-001` deprecated ARIA role | moderate | **minor** | Deprecation alone is primarily an authoring and future-compatibility risk with normally limited immediate user impact. |
| `FT-WARN-003` prohibited ARIA property | moderate | **serious** | Prohibited semantics can be ignored or misrepresented to assistive technology and can remove important state or role information. |
| `FT-REVIEW-001` positive tabindex | moderate | **serious** | A positive tabindex can substantially disrupt sequential focus. FocusTrace still reports it as `review` because the final order requires context. |

## Current rule audit

| FocusTrace rule | Base impact | Outcome family | Audit note |
| --- | --- | --- | --- |
| `FT-WCAG-001` Page title | serious | fail | Missing titles make page/view identification and multi-tab navigation substantially harder. |
| `FT-WCAG-002` Image name | serious | fail | A meaningful unnamed image can remove information for screen-reader users; the rule spans multiple image semantics. |
| `FT-WCAG-003` Button name | critical | fail | An unnamed button can make an action impossible to identify or invoke reliably. |
| `FT-WCAG-004` Form field name | critical | fail | An unnamed control can prevent users from understanding the requested input and can block form completion. |
| `FT-WCAG-005` Link name | serious | fail | An unnamed link hides destination or purpose and substantially impairs navigation. |
| `FT-WCAG-006` aria-hidden focus | serious | fail | Keyboard operability and accessibility-tree exposure disagree. |
| `FT-WCAG-007` Label in name | serious | fail / warning | Voice-input users may be unable to target the visible label. |
| `FT-WCAG-008` Page lang present | serious | fail | Missing language can apply incorrect pronunciation across the document. |
| `FT-WCAG-009` Page lang known | serious | fail | Invalid primary language can apply incorrect language rules across the document. |
| `FT-WCAG-010` Text contrast | serious | fail / review | Low contrast can make text difficult or impossible to read; uncertain compositions remain review. |
| `FT-WCAG-011` Non-text contrast | serious | fail / review | Essential boundaries, indicators and graphics can become difficult to perceive. |
| `FT-WARN-001` Deprecated ARIA role | minor | warning | Usually a limited immediate barrier; primarily an authoring and compatibility risk. |
| `FT-WARN-002` Deprecated ARIA property | minor | warning | Deprecation alone does not prove the current interaction is blocked. |
| `FT-WARN-003` Prohibited ARIA property | serious | warning | Important semantics or state may be ignored or exposed incorrectly. |
| `FT-WARN-004` Duplicate HTML id | moderate | warning | Duplicate identifiers can break ID-based relationships, navigation or scripted lookup, but duplication alone does not prove an accessibility barrier. |
| `FT-REVIEW-001` Positive tabindex | serious | review | It can substantially disrupt sequential focus, but the final order still needs contextual review. |
| `FT-REVIEW-002` Heading level jump | minor | review | FocusTrace only detects a skip signal; a skip alone does not prove a misleading document hierarchy. |
| `FT-REVIEW-003` Placeholder-only label | moderate | review | The field has a computed name, but the visible cue can disappear while typing. |
| `FT-RUNTIME-001` Focused element removed | serious | runtime | Can disorient users and interrupt the current interaction. |
| `FT-RUNTIME-002` Focus completely obscured | serious | runtime | Keyboard users can be operating a control they cannot perceive. |
| `FT-RUNTIME-003` SPA title unchanged | moderate | runtime | The new view can be harder to identify without necessarily blocking the task. |
| `FT-RUNTIME-004` SPA focus unchanged | moderate | runtime | Context may be unclear, but actual harm depends strongly on transition design. |
| `FT-RUNTIME-005` Focused element became hidden | serious | runtime | Users can lose both visible position and a reliable assistive-technology target. |
| `FT-APG-001` Dialog opened without focus | serious | runtime | Keyboard and screen-reader users can be separated from the active dialog task. |
| `FT-APG-002` Modal focus escape | serious | runtime | Background controls can become reachable while a modal is active. |
| `FT-APG-003` Dialog focus restore | moderate | runtime | Users may need to recover their prior position, but the page normally remains operable. |

## Guardrails

The catalog is the source of truth. Automated tests require every rule to provide a non-empty English and Spanish rationale. Standards references are kept separate from severity so a WCAG level or an external rule cannot silently become a FocusTrace impact score.

This is intentionally a base-impact model. A future contextual model may raise or lower the effective severity of an occurrence only when FocusTrace can justify that change from concrete evidence such as task blocking, alternatives, repetition, or interaction state.
