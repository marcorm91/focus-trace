# FocusTrace standards coverage model

FocusTrace exposes standards traceability to help developers understand what evidence the product can collect. The coverage model is deliberately conservative: a linked WCAG criterion does **not** mean FocusTrace has evaluated every requirement branch, exception or conformance condition for that criterion.

## Coverage dimensions

The in-product matrix separates how evidence is obtained from how much of the criterion is covered.

| Label | Meaning |
| --- | --- |
| **Automated** | FocusTrace can make a deterministic static evaluation for at least one bounded rule linked to the criterion. |
| **Review** | FocusTrace can surface contextual evidence that still needs human judgement. |
| **Runtime** | At least one linked review depends on observed interaction/runtime evidence. |
| **Site Audit** | At least one linked review depends on representative multi-page evidence. |
| **Manual** | Human assessment is still required for criterion-level conformance. |
| **Not covered** | FocusTrace currently has no implemented WCAG-linked rule for that criterion. |

`Automated`, `Review`, `Runtime` and `Site Audit` are therefore evidence/tooling signals. `Manual` is the residual conformance requirement, and `Not covered` identifies a tooling gap.

## Completeness and overclaim protection

Coverage completeness has three states:

- `none`: no WCAG-linked FocusTrace tooling exists for the criterion;
- `partial`: one or more FocusTrace checks provide bounded evidence, but the complete criterion is not claimed as evaluated;
- `complete`: reserved for a future criterion whose complete requirement branches and relevant exceptions can be explicitly justified by the coverage model.

A criterion can become `complete` only through the explicit allow-list in `shared/wcag-coverage.ts`. The allow-list is intentionally empty for the current model. This prevents adding a WCAG reference to a rule from silently turning into a claim of complete criterion coverage.

A clean FocusTrace result therefore means that no problem was found by the evidence FocusTrace actually evaluated. It does not mean that every applicable WCAG success criterion passed.

## ACT traceability

When a FocusTrace rule references an ACT rule, the coverage matrix keeps that ACT identifier alongside the relevant WCAG criterion and FocusTrace rule id. ACT references describe the implemented expectation/subset; they do not expand the result into full WCAG criterion coverage.

## EN 301 549 V4.1.1 (2026-09)

FocusTrace maps WCAG 2.2 Level A and AA criteria to the corresponding web requirement numbering in **EN 301 549 V4.1.1 (2026-09)**, published by ETSI/CEN/CENELEC.

Official source:

`https://www.etsi.org/deliver/etsi_en/301500_301599/301549/04.01.01_60/en_301549v040101p.pdf`

Clause 9.0 states that WCAG 2.2 Level AA conformance is equivalent to conforming with clauses 9.1 to 9.4 together with the WCAG conformance requirements in clause 9.6. The standard keeps the A/AA requirement numbering aligned with WCAG 2.2, including void clauses where necessary. For example:

- WCAG 1.1.1 → EN 301 549 § 9.1.1.1;
- WCAG 2.4.11 → EN 301 549 § 9.2.4.11;
- WCAG 3.2.6 → EN 301 549 § 9.3.2.6.

WCAG Level AAA criteria are not presented as part of that Level AA clause 9 equivalence. They remain available in the all-criteria WCAG view, without an A/AA EN clause mapping.

This mapping is technical standards traceability only. FocusTrace does not certify EN 301 549 compliance, does not claim that its tooling covers all of clause 9, and does not infer legal/harmonisation status from the existence of the published standard.

## Source of truth

The executable model lives in `shared/wcag-coverage.ts` and is checked by `tests/standards-coverage.test.ts` and `tests/standards-coverage-ui-contract.test.ts`.

The WCAG criterion catalog is synchronized from W3C. FocusTrace rule-to-WCAG/ACT references remain defined by the rule catalog and specialized rule modules; the coverage matrix derives from those references rather than maintaining a second independent list of implemented rules.
