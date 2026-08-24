# FocusTrace rule methodology

FocusTrace does not use axe-core as its analysis engine. The extension implements its own local rules and maps each rule to the W3C source that justifies the expectation.

## Sources

1. **WCAG 2.2** is the conformance standard and the normative source for success criteria.
2. **W3C ACT Rules** are used where available to make applicability, expectations and outcome mapping explicit. ACT rules may be proposed or approved; FocusTrace records the ACT status in the UI.
3. **WAI-ARIA Authoring Practices Guide (APG)** is used for runtime widget patterns such as modal dialog focus behavior. APG findings are guidance findings, not direct WCAG conformance failures.
4. **Accessible Name and Description Computation (AccName)** and **HTML Accessibility API Mappings (HTML-AAM)** are used to implement accessible-name precedence and host-language fallbacks. The current 1.2 / 1.0 publications are W3C Working Drafts, so FocusTrace treats them as implementation guidance rather than WCAG conformance criteria.

## Outcomes

### FAIL

FocusTrace found observable evidence that matches an automated rule whose expectation can be evaluated deterministically. A FAIL is linked to the corresponding WCAG criterion and, when available, the ACT rule.

A FAIL does **not** mean that FocusTrace has evaluated every requirement of the linked WCAG criterion.

### REVIEW

FocusTrace found a signal that can indicate an accessibility problem but the final judgement depends on context, meaning, workflow or user interaction.

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

The implementation also supports self-reference inside `aria-labelledby`, multiple native labels, directly referenced hidden naming nodes, and exclusion of a wrapped control's own value from its label text.

A placeholder-derived name is **not** reported as an empty-name WCAG failure. Instead FocusTrace emits `FT-REVIEW-003`, because WCAG 3.3.2 distinguishes a label presented to users from the programmatic name, and W3C techniques recommend persistent visible labels for form controls.

## Label in Name scope

`FT-WCAG-007` implements the current automated subset described by ACT rule `2ee8b8` for WCAG 2.5.3. The rule applies when a widget that supports name from content has visible text content and its accessible name is overridden through `aria-label` or `aria-labelledby`.

FocusTrace compares the visible DOM text with the computed accessible name, ignoring leading/trailing whitespace and case differences. The visible label must occur intact inside the accessible name.

Examples:

```html
<!-- pass -->
<button aria-label="Delete item">Delete</button>

<!-- fail -->
<button aria-label="Remove item">Delete</button>
```

This first implementation intentionally does not claim complete 2.5.3 coverage. CSS generated text, images of text and broader proximity-based visible-label detection are outside the current automated scope.

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
| FT-REVIEW-001 Positive tabindex | REVIEW | WCAG 2.4.3 |
| FT-REVIEW-002 Heading-level jump | REVIEW | WCAG 1.3.1 / 2.4.6 |
| FT-REVIEW-003 Placeholder-only form label | REVIEW | WCAG 3.3.2 |

## Runtime rules

| FocusTrace rule | Outcome | Source |
| --- | --- | --- |
| FT-RUNTIME-001 Focused element removed | REVIEW | WCAG 2.4.3 |
| FT-RUNTIME-002 Focus may be completely obscured | REVIEW | WCAG 2.4.11 |
| FT-RUNTIME-003 SPA route changed without title change | REVIEW | WCAG 2.4.2 |
| FT-APG-001 Dialog initial focus remains outside | REVIEW | WAI-ARIA APG Dialog Modal |
| FT-APG-002 Focus escapes modal dialog | REVIEW | WAI-ARIA APG Dialog Modal |
| FT-APG-003 Focus not restored after dialog close | REVIEW | WAI-ARIA APG Dialog Modal |

## Known limitations of v0.1

- FocusTrace still implements a targeted subset of the complete AccName algorithm, not a user-agent-level reimplementation.
- CSS generated content, slots/Shadow DOM, complex embedded-control recursion and cross-origin iframe traversal are not fully covered yet.
- `FT-WCAG-007` currently covers ACT `2ee8b8` text-content cases; images of text and broader visual-label inference are not covered yet.
- Runtime focus-obscured detection intentionally returns REVIEW because exact 2.4.11 evaluation has edge cases.
- Dialog restoration has valid workflow exceptions defined by APG, so it remains REVIEW.
- No automated result is a full WCAG 2.2 conformance claim.
