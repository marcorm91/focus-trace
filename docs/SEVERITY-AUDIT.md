# FocusTrace severity audit

Audit date: 2026-09-05

This document records the rule-by-rule review behind the base severity values used by FocusTrace.

Severity is a prioritization aid. It is not a WCAG conformance level. WCAG A / AA / AAA remains separate from `critical / serious / moderate / minor`.

## Method

For each rule we review:

1. the user barrier that the FocusTrace rule can actually demonstrate or flag;
2. whether the result is a deterministic `fail`, a `review`, a `warning` or a runtime observation;
3. the applicable W3C / ACT / WAI-ARIA / APG / HTML references attached to the rule;
4. whether axe-core has a sufficiently equivalent rule and, when it does, the impact currently published by the latest stable axe-core release;
5. whether the detected evidence is strong enough to justify the impact without pretending to know page context that FocusTrace has not observed.

FocusTrace still owns its detector logic and rules that have no reliable axe equivalent. For declared equivalents, however, we deliberately avoid maintaining a second impact scale for the same failure.

`generated/axe-rule-severities.json` stores the complete current axe impact registry. `config/axe-equivalents.json` stores the curated equivalence map. Mappings with `highest-impact` must match the highest axe impact in their equivalent set and CI enforces that contract.

See `docs/AXE-SEVERITY-BENCHMARK.md` for the synchronization and review model.

## Changes in the 2026-09-01 benchmark alignment

| Rule | Previous | Current | axe benchmark / reason |
| --- | --- | --- | --- |
| `FT-WCAG-002` Image name | serious | **critical** | The broad FocusTrace image-name detector includes native images; axe `image-alt` is critical. The combined rule adopts the highest equivalent axe impact. |
| `FT-WARN-012` Invalid / unresolved ARIA role | serious | **critical** | axe `aria-roles` is critical. |
| `FT-WARN-013` Unknown `aria-*` attribute | moderate | **critical** | axe `aria-valid-attr` is critical. |
| `FT-WARN-014` Invalid ARIA value | serious | **critical** | axe `aria-valid-attr-value` is critical. |
| `FT-WARN-015` Missing required ARIA state/property | serious | **critical** | axe `aria-required-attr` is critical. |
| `FT-WARN-016` Invalid ARIA ID relationship | serious | **critical** | Invalid relationship values overlap the critical axe `aria-valid-attr-value` failure family. |
| `FT-WARN-017` Missing required ARIA parent | serious | **critical** | axe `aria-required-parent` is critical. |
| `FT-WARN-018` Missing/incompatible required ARIA children | serious | **critical** | axe `aria-required-children` is critical. |
| `FT-WARN-020` ARIA attribute unsupported by role | serious | **critical** | axe `aria-allowed-attr` is critical. |

Existing equivalent rules that already matched axe keep their severity, including page title, buttons, form fields, links, aria-hidden focus, label-in-name, page language, text contrast, deprecated roles and prohibited ARIA attributes.

## Current core rule audit

| FocusTrace rule | Base impact | Outcome family | Audit note |
| --- | --- | --- | --- |
| `FT-WCAG-001` Page title | serious | fail | Aligned with axe `document-title`. |
| `FT-WCAG-002` Image name | critical | fail | Aligned to the highest equivalent image impact; axe `image-alt` is critical. |
| `FT-WCAG-003` Button name | critical | fail | Aligned with axe `button-name`. |
| `FT-WCAG-004` Form field name | critical | fail | Broad native/ARIA field rule adopts the highest equivalent form-name impact. |
| `FT-WCAG-005` Link name | serious | fail | Aligned with native and ARIA link/command naming impacts. |
| `FT-WCAG-006` aria-hidden focus | serious | fail | Aligned with axe `aria-hidden-focus`. |
| `FT-WCAG-007` Label in name | serious | fail / warning | Aligned with axe label/content-name mismatch impact. |
| `FT-WCAG-008` Page lang present | serious | fail | Aligned with axe `html-has-lang`. |
| `FT-WCAG-009` Page lang known | serious | fail | Aligned with axe `html-lang-valid`. |
| `FT-WCAG-010` Text contrast | serious | fail / review | Aligned with axe `color-contrast`. |
| `FT-WCAG-011` Non-text contrast | serious | fail / review | FocusTrace-owned WCAG 1.4.11 detector; axe-core 4.13 has no equivalent rule to enforce. |
| `FT-WCAG-012` Target size minimum | moderate | review | FocusTrace-owned WCAG 2.5.8 geometry/spacing detector. Contextual WCAG exceptions prevent geometric risk alone from becoming an automatic failure. |
| `FT-WARN-001` Deprecated ARIA role | minor | warning | Aligned with axe `aria-deprecated-role`. |
| `FT-WARN-002` Deprecated ARIA property | minor | warning | No exact impact mapping is enforced; deprecation alone is treated as an authoring/compatibility warning. |
| `FT-WARN-003` Prohibited ARIA property | serious | warning | Aligned with axe `aria-prohibited-attr`. |
| `FT-WARN-004` Duplicate HTML id | moderate | warning | Generic duplicate IDs are broader than axe `duplicate-id-aria`; no exact mapping is enforced. |
| `FT-REVIEW-001` Positive tabindex | serious | review | Contextual FocusTrace review; no direct impact mapping is enforced. |
| `FT-REVIEW-002` Heading level jump | minor | review | Structural review signal rather than a deterministic failure. |
| `FT-REVIEW-003` Placeholder-only label | moderate | review | The field still has a computed name; persistent visible identification needs context. |
| `FT-RUNTIME-001` Focused element removed | serious | runtime | FocusTrace runtime evidence; no axe equivalent. |
| `FT-RUNTIME-002` Focus completely obscured | serious | runtime | FocusTrace runtime evidence; no direct axe equivalent. |
| `FT-RUNTIME-003` SPA title unchanged | moderate | runtime | Context depends on the SPA transition. |
| `FT-RUNTIME-004` SPA focus unchanged | moderate | runtime | Context depends on the SPA transition. |
| `FT-RUNTIME-005` Focused element became hidden | serious | runtime | FocusTrace runtime evidence. |
| `FT-RUNTIME-006` Dragging observed | moderate | runtime / review | A drag can be a substantial pointer barrier, but the rule cannot prove whether an equivalent single-pointer operation or essential exception exists. |
| `FT-RUNTIME-007` Status message exposure | moderate | runtime / review | Missing status exposure can hide success, result, progress or error feedback from assistive-technology users. The observed text still requires contextual status-message classification, so it remains REVIEW. |
| `FT-APG-001` Dialog opened without focus | serious | runtime | APG/runtime behavior rather than an axe-equivalent static rule. |
| `FT-APG-002` Modal focus escape | serious | runtime | APG/runtime behavior rather than an axe-equivalent static rule. |
| `FT-APG-003` Dialog focus restore | moderate | runtime | APG/runtime behavior rather than an axe-equivalent static rule. |

## Structural and authoring rule audit

| FocusTrace rule | Base impact | Outcome family | Audit note |
| --- | --- | --- | --- |
| `FT-WARN-005` Entirely obsolete HTML element | moderate | warning | Non-conforming legacy markup can preserve ambiguous or poorly supported semantics, but its presence alone is not a WCAG failure. |
| `FT-WARN-006` Obsolete non-conforming HTML attribute | minor | warning | Current HTML authoring error with limited proven user impact unless it contributes to another accessibility failure. |
| `FT-WARN-007` Obsolete-but-conforming HTML feature | minor | warning | Legacy markup retained only for compatibility/conformance-warning purposes; modernization is recommended without overstating immediate user impact. |
| `FT-REVIEW-004` Missing primary main landmark | moderate | review | Can make orientation and repeated navigation harder, while still requiring page-context judgement. |
| `FT-REVIEW-005` Multiple exposed main landmarks | moderate | review | Several main regions can make primary content ambiguous unless the page structure clearly distinguishes them. |
| `FT-REVIEW-006` Button-like custom interaction | moderate | review | Native button behavior is more reliable, but a custom implementation can still be accessible when its keyboard, focus and semantics are complete. |
| `FT-REVIEW-007` Link-like custom interaction | moderate | review | Native anchors provide expected navigation behavior; custom links remain contextual rather than automatically invalid. |
| `FT-REVIEW-008` Generic interactive element | moderate | review | The observed interaction is insufficient to determine whether button, link or another widget semantics are intended. |
| `FT-REVIEW-011` Consistent help across sampled pages | moderate | review | Relative help order can affect predictability, but FocusTrace samples pages and therefore keeps the result contextual. |
| `FT-WARN-008` Invalid native parent/ancestor context | moderate | warning | Native semantics may be lost or distorted outside their required HTML context; the rule reports a deterministic authoring contradiction, not a WCAG failure. |
| `FT-WARN-009` Native content-model/group/order violation | moderate | warning | Invalid grouping/order can produce browser DOM repair or inconsistent semantic relationships. |
| `FT-WARN-010` Conflicting nested interactive/label structure | serious | warning | Conflicting interactive structures can directly create ambiguous activation, focus and accessibility-tree behavior. |
| `FT-WARN-011` Invalid native main hierarchy | serious | warning | Invalid placement of the dominant main region can make the primary document structure materially misleading. |
| `FT-REVIEW-009` Unidentified section/article structure | minor | review | Missing structural identification is a weak signal and does not by itself prove invalid or inaccessible sectioning. |
| `FT-REVIEW-010` Repeated landmarks without distinguishable names | moderate | review | Duplicate landmark roles/names can make landmark navigation ambiguous and require contextual review. |

## Advanced ARIA audit

| FocusTrace rule | Base impact | axe alignment |
| --- | --- | --- |
| `FT-WARN-012` Invalid/unresolved role | critical | `aria-roles` · critical |
| `FT-WARN-013` Unknown ARIA attribute | critical | `aria-valid-attr` · critical |
| `FT-WARN-014` Invalid ARIA value | critical | `aria-valid-attr-value` · critical |
| `FT-WARN-015` Missing required ARIA property | critical | `aria-required-attr` · critical |
| `FT-WARN-016` Invalid ARIA ID relationship | critical | `aria-valid-attr-value` failure family · critical |
| `FT-WARN-017` Required ARIA parent missing | critical | `aria-required-parent` · critical |
| `FT-WARN-018` Required/incompatible ARIA children | critical | `aria-required-children` · critical |
| `FT-WARN-019` Inconsistent ARIA range/set state | serious | FocusTrace-specific consistency detector |
| `FT-WARN-020` ARIA property unsupported by role | critical | `aria-allowed-attr` · critical |
| `FT-WARN-021` Relationship/state contradiction | serious | FocusTrace-specific consistency detector |

## Guardrails

The rule catalog remains the source of truth for FocusTrace rule definitions. The axe benchmark is a maintained external constraint for declared equivalents, not a replacement for our detector logic.

The Standards Registry workflow refreshes the latest stable axe rule-impact snapshot every day. If axe adds/removes rules or changes an impact, the workflow generates a diff and opens or refreshes the registry PR; if that cannot be created, it falls back to a GitHub issue.

Automated tests require every declared FocusTrace ↔ axe mapping to resolve and require `highest-impact` mappings to match the current generated axe snapshot. Unmapped axe critical rules are listed by the daily report but do not automatically fail CI, because a missing equivalence can mean different detector scope rather than missing accessibility coverage.
