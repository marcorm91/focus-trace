# FocusTrace rule methodology

FocusTrace does not use axe-core as its analysis engine. The extension implements its own local rules and maps each rule to the standards source that justifies the expectation.

## Sources

1. **WCAG 2.2** is the conformance standard and normative source for success criteria.
2. **W3C ACT Rules** make applicability, expectations and outcome mapping explicit where available.
3. **WAI-ARIA** supplies role/state/property semantics. The automated registry currently follows the public ARIA 1.3 Editor Draft; findings sourced only from this registry are authoring warnings, not direct WCAG failures.
4. **WAI-ARIA APG** is used for runtime widget patterns such as modal-dialog focus behavior and remains informative guidance.
5. **AccName** and **HTML-AAM** guide accessible-name precedence and host-language fallbacks.
6. **IANA Language Subtag Registry** supplies the primary language subtags used by the ACT rule behind `FT-WCAG-009`.

## Outcomes

### FAIL

FocusTrace found observable evidence that matches an automated rule whose expectation can be evaluated deterministically. A FAIL is linked to the corresponding WCAG criterion and, when available, the ACT rule. A FAIL does not mean that every requirement of the linked WCAG criterion was evaluated.

### REVIEW

FocusTrace found a signal that can indicate an accessibility problem but final judgement depends on context, meaning, workflow or user interaction.

### WARNING

FocusTrace found an authoring or standards-maintenance risk that should be fixed or reviewed but is not automatically represented as a WCAG failure. Current examples include deprecated or prohibited ARIA usage sourced from the local WAI-ARIA registry.

### PASS

The automated expectation tested by a rule was met. PASS never means full WCAG conformance.

## Accessible name computation

FocusTrace records both the computed name and the source that produced it. The current implementation covers the precedence needed by the rule engine for common HTML controls:

1. `aria-labelledby` references, in reference order
2. `aria-label`
3. native HTML labels where applicable
4. host-language alternatives such as `alt` and button values
5. name-from-content for controls such as buttons and links
6. `title` where HTML-AAM defines it as a fallback
7. `placeholder`, then `aria-placeholder`, for text-entry controls where HTML-AAM defines those fallbacks

Name-from-content traversal includes the computed text alternative of descendants. For example, an icon-only `button` can receive its name from a descendant `svg[role="img"][aria-label]`; FocusTrace must not report `FT-WCAG-003` for that pattern.

When an accessible-name rule fails, the Accessibility and Developer explanation levels expose the resolved role, computed name, winning source and inspected candidates. This evidence is diagnostic context; it does not change the rule outcome.

The implementation also supports self-reference inside `aria-labelledby`, multiple native labels, directly referenced hidden naming nodes, and exclusion of a wrapped control's own value from its label text.

A placeholder-derived name is not reported as an empty-name WCAG failure. FocusTrace emits `FT-REVIEW-003` because a programmatic name and a persistent visible label are separate concerns.

## Label in Name scope

`FT-WCAG-007` implements the automated text-content subset of ACT `2ee8b8` for WCAG 2.5.3. For a name-from-content widget whose accessible name is overridden by `aria-label` or `aria-labelledby`, the visible DOM text must occur intact inside the accessible name after whitespace/case normalization.

```html
<!-- pass -->
<button aria-label="Delete item">Delete</button>

<!-- fail -->
<button aria-label="Remove item">Delete</button>
```

CSS-generated text, images of text and broader visual-label inference remain outside this automated subset.

## Language of Page

`FT-WCAG-008` implements ACT `b5c3f8`: a top-level `text/html` document must have a non-empty `lang` attribute on its root HTML element.

`FT-WCAG-009` implements ACT `bf051a`: when `lang` is non-empty, its primary language subtag must be registered by IANA as `Type: language`. FocusTrace uses the committed `generated/language-subtags.json` snapshot, so the page scan remains offline and deterministic. Later subtags are intentionally not validated by this rule; for example `en-US-GB` still has the known primary subtag `en`.

## Text contrast scope

`FT-WCAG-010` evaluates WCAG 2.2 1.4.3 Contrast (Minimum) for rendered DOM text whose foreground and background can be resolved deterministically from computed styles.

FocusTrace calculates relative luminance and contrast ratio from the rendered foreground/background colors and applies the WCAG AA thresholds:

- `4.5:1` for normal text;
- `3:1` for large text (at least `24px`, or at least `18.667px` when the computed font weight is `700` or greater).

The scan records structured evidence with the measured ratio, required ratio, computed foreground/background, font size and weight. These values can be reused by reports without reparsing human-readable evidence.

A contrast result becomes `FAIL` only when the computed colors and threshold are deterministic. FocusTrace returns `REVIEW` instead when the final rendered background can be affected by visual composition it cannot resolve safely, including:

- background images or gradients;
- element/ancestor opacity;
- `mix-blend-mode`;
- CSS filters;
- an unresolved computed background color.

This conservative model intentionally avoids converting uncertain rendering into false WCAG failures.

WCAG 2.2 1.4.11 Non-text Contrast is **not** automatically failed by `FT-WCAG-010`. Controls, icons, component boundaries, states and focus indicators require separate visual/context evaluation. That coverage should be implemented as its own rule rather than reusing the text-contrast heuristic.

## ARIA authoring warnings

The scan consumes `generated/aria-registry.json` instead of maintaining role/property lists by hand. For recognized explicit ARIA roles FocusTrace currently reports:

- `FT-WARN-001` when the role itself is deprecated;
- `FT-WARN-002` when a state/property is deprecated for that role;
- `FT-WARN-003` when a state/property is prohibited for that role.

These are `WARNING`, not `FAIL`. Unknown roles/attributes, required ARIA properties, context/owned-element requirements and value validation are planned as separate conformance rules so each can be mapped to the appropriate ACT expectation.

## Runtime causality

Runtime recording assigns a stable `interactionId` to user-driven keyboard and pointer activity. Subsequent focus changes, relevant DOM mutations, dialog lifecycle events and SPA route changes inherit that interaction while they remain inside a bounded correlation window.

FocusTrace records only compact evidence needed for debugging:

- element selector, role, accessible name and tag;
- relevant node additions/removals;
- focus-affecting attribute changes;
- route transitions;
- dialog/focus events;
- deterministic root-cause classifications.

The runtime engine does **not** persist full DOM snapshots. It also does not use AI to infer root causes. Current causal classifications are deterministic signals such as:

- `FOCUSED_NODE_REMOVED`;
- `FOCUS_FELL_BACK_TO_BODY`;
- `DIALOG_OPENED_WITHOUT_FOCUS`;
- `MODAL_FOCUS_ESCAPE`;
- `ROUTE_CHANGED_WITHOUT_FOCUS_MOVE`;
- `FOCUSED_ELEMENT_BECAME_HIDDEN`.

A causal classification explains the recorded chain; the linked runtime WCAG/APG outcome can still remain `REVIEW` where conformance depends on workflow context.

## Static rule set

| FocusTrace rule | Outcome | Source |
| --- | --- | --- |
| FT-WCAG-001 HTML page has a non-empty title | FAIL/PASS | WCAG 2.4.2 · ACT 2779a5 |
| FT-WCAG-002 Image has an accessible name or is decorative | FAIL/PASS | WCAG 1.1.1 · ACT 23a2a8 |
| FT-WCAG-003 Button has a non-empty accessible name | FAIL/PASS | WCAG 4.1.2 · ACT 97a4e1 |
| FT-WCAG-004 Form field has a non-empty accessible name | FAIL/PASS | WCAG 4.1.2 · ACT e086e5 |
| FT-WCAG-005 Link has a non-empty accessible name | FAIL/PASS | WCAG 4.1.2 / 2.4.4 · ACT c487ae |
| FT-WCAG-006 aria-hidden content contains sequentially focusable content | FAIL/PASS | WCAG 4.1.2 · ACT 6cfa84 |
| FT-WCAG-007 Visible label is part of accessible name | FAIL/PASS | WCAG 2.5.3 · ACT 2ee8b8 |
| FT-WCAG-008 HTML page has a non-empty lang attribute | FAIL/PASS | WCAG 3.1.1 · ACT b5c3f8 |
| FT-WCAG-009 Page lang has a known primary language tag | FAIL/PASS | WCAG 3.1.1 · ACT bf051a · IANA |
| FT-WCAG-010 Text has sufficient color contrast | FAIL/REVIEW/PASS | WCAG 1.4.3 AA |
| FT-WARN-001 Deprecated ARIA role | WARNING/PASS | WAI-ARIA registry |
| FT-WARN-002 Deprecated ARIA property for role | WARNING/PASS | WAI-ARIA registry |
| FT-WARN-003 Prohibited ARIA property for role | WARNING/PASS | WAI-ARIA registry |
| FT-REVIEW-001 Positive tabindex | REVIEW | WCAG 2.4.3 |
| FT-REVIEW-002 Heading-level jump | REVIEW | WCAG 1.3.1 / 2.4.6 |
| FT-REVIEW-003 Placeholder-only form label | REVIEW | WCAG 3.3.2 |

## Runtime rules

| FocusTrace rule | Outcome | Source |
| --- | --- | --- |
| FT-RUNTIME-001 Focused element removed | REVIEW | WCAG 2.4.3 |
| FT-RUNTIME-002 Focus may be completely obscured | REVIEW | WCAG 2.4.11 |
| FT-RUNTIME-003 SPA route changed without title change | REVIEW | WCAG 2.4.2 |
| FT-RUNTIME-004 SPA route changed without moving focus | REVIEW | WCAG 2.4.3 |
| FT-RUNTIME-005 Focused element became hidden | REVIEW | WCAG 2.4.3 / 4.1.2 |
| FT-APG-001 Dialog initial focus remains outside | REVIEW | WAI-ARIA APG Dialog Modal |
| FT-APG-002 Focus escapes modal dialog | REVIEW | WAI-ARIA APG Dialog Modal |
| FT-APG-003 Focus not restored after dialog close | REVIEW | WAI-ARIA APG Dialog Modal |

## Known limitations of v0.1

- FocusTrace implements a targeted subset of the complete AccName algorithm, not a user-agent-level reimplementation.
- CSS-generated content, slots/Shadow DOM, complex embedded-control recursion and cross-origin iframe traversal are not fully covered.
- `FT-WCAG-007` currently covers ACT `2ee8b8` text-content cases only.
- `FT-WCAG-009` checks the ACT primary-language expectation, not full BCP 47 syntax/semantics.
- `FT-WCAG-010` covers DOM text with deterministically resolvable computed foreground/background colors. Images of text, pseudo-element text and complex visual composition remain outside deterministic FAIL coverage.
- WCAG 1.4.11 Non-text Contrast is not yet automatically evaluated as a conformance result.
- ARIA warnings currently operate on recognized explicit role tokens; native implicit-role validation is a later layer.
- Runtime causality uses bounded temporal correlation and intentionally records only accessibility-relevant mutations, not every DOM change.
- Runtime focus-obscured detection intentionally returns REVIEW because exact 2.4.11 evaluation has edge cases.
- SPA focus movement and dialog restoration can have workflow-specific exceptions, so those findings remain REVIEW.
- No automated result is a full WCAG 2.2 conformance claim.
