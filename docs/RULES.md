# FocusTrace rule methodology

FocusTrace does not use axe-core as its analysis engine. The extension implements its own local rules and maps each rule to the W3C source that justifies the expectation.

## Sources

1. **WCAG 2.2** is the conformance standard and the normative source for success criteria.
2. **W3C ACT Rules** are used where available to make applicability, expectations and outcome mapping explicit. ACT rules may be proposed or approved; FocusTrace records the ACT status in the UI.
3. **WAI-ARIA Authoring Practices Guide (APG)** is used for runtime widget patterns such as modal dialog focus behavior. APG findings are guidance findings, not direct WCAG conformance failures.

## Outcomes

### FAIL

FocusTrace found observable evidence that matches an automated rule whose expectation can be evaluated deterministically. A FAIL is linked to the corresponding WCAG criterion and, when available, the ACT rule.

A FAIL does **not** mean that FocusTrace has evaluated every requirement of the linked WCAG criterion.

### REVIEW

FocusTrace found a signal that can indicate an accessibility problem but the final judgement depends on context, meaning, workflow or user interaction.

### PASS

The automated expectation tested by a rule was met. PASS never means full WCAG conformance.

## Initial static rule set

| FocusTrace rule | Outcome | Source |
| --- | --- | --- |
| FT-WCAG-001 HTML page has a non-empty title | FAIL/PASS | WCAG 2.4.2 · ACT 2779a5 |
| FT-WCAG-002 Image has an accessible name or is decorative | FAIL/PASS | WCAG 1.1.1 · ACT 23a2a8 |
| FT-WCAG-003 Button has a non-empty accessible name | FAIL/PASS | WCAG 4.1.2 · ACT 97a4e1 |
| FT-WCAG-004 Form field has a non-empty accessible name | FAIL/PASS | WCAG 4.1.2 · ACT e086e5 |
| FT-WCAG-005 Link has a non-empty accessible name | FAIL/PASS | WCAG 4.1.2 / 2.4.4 · ACT c487ae |
| FT-WCAG-006 aria-hidden content contains sequentially focusable content | FAIL/PASS | WCAG 4.1.2 · ACT 6cfa84 |
| FT-REVIEW-001 Positive tabindex | REVIEW | WCAG 2.4.3 |
| FT-REVIEW-002 Heading-level jump | REVIEW | WCAG 1.3.1 / 2.4.6 |

## Initial runtime rules

| FocusTrace rule | Outcome | Source |
| --- | --- | --- |
| FT-RUNTIME-001 Focused element removed | REVIEW | WCAG 2.4.3 |
| FT-RUNTIME-002 Focus may be completely obscured | REVIEW | WCAG 2.4.11 |
| FT-RUNTIME-003 SPA route changed without title change | REVIEW | WCAG 2.4.2 |
| FT-APG-001 Dialog initial focus remains outside | REVIEW | WAI-ARIA APG Dialog Modal |
| FT-APG-002 Focus escapes modal dialog | REVIEW | WAI-ARIA APG Dialog Modal |
| FT-APG-003 Focus not restored after dialog close | REVIEW | WAI-ARIA APG Dialog Modal |

## Known limitations of v0.1

- FocusTrace currently implements a pragmatic subset of Accessible Name and Description Computation, not the complete AccName specification.
- Shadow DOM and cross-origin iframe traversal are not covered yet.
- Runtime focus-obscured detection intentionally returns REVIEW because exact 2.4.11 evaluation has edge cases.
- Dialog restoration has valid workflow exceptions defined by APG, so it remains REVIEW.
- No automated result is a full WCAG 2.2 conformance claim.
