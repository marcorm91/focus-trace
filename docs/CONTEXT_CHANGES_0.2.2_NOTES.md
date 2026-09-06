# FocusTrace 0.2.2 context-change implementation notes

Working notes for the WCAG 3.2.1 / 3.2.2 runtime implementation.

This branch is intentionally opened as a draft while integration is completed.

## Scope

- WCAG 3.2.1 On Focus runtime REVIEW evidence.
- WCAG 3.2.2 On Input runtime REVIEW evidence.
- Shared context-change correlation instead of duplicate observers.
- Compact evidence only; form values are never stored.
- EN/ES presentation, remediation and documentation parity.
- Unit and E2E coverage for positive and negative cases.

## Guardrails

- Do not treat ordinary DOM mutations as a context change.
- Do not treat button/link activation as On Input.
- Do not report normal sequential Tab focus movement as On Focus.
- Do not infer a WCAG FAIL from temporal correlation alone.
- Keep route/dialog/focus evidence explicit and reviewable.

This file is temporary working documentation for the draft PR and must be removed or folded into the canonical documentation before the PR is marked ready for review.
