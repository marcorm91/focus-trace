# FocusTrace agent instructions

These instructions apply to automated agents and contributors working in this repository.

## Capability catalog contract

`README.md` and `README.es.md` contain the public functional capability catalog for FocusTrace. Treat that catalog as part of the product contract, not as optional marketing copy.

Whenever a change adds, removes or materially changes any of the following, update both README catalogs in the same pull request:

- a `FT-*` rule or standards mapping;
- scanner applicability, evidence, outcome or severity behavior;
- runtime Trace behavior or causal evidence;
- Structure, Focus Walk, Replay, Journey, Graph or breakpoint behavior;
- Site Audit discovery, sampling, aggregation or multipage review behavior;
- FocusTrace Memory behavior, storage bounds or retained evidence;
- report/export formats or visual evidence behavior;
- user-visible limits, browser support, permissions or privacy behavior;
- a new user-facing workflow or capability that has no rule ID.

Keep the English and Spanish catalogs semantically equivalent. Technical identifiers such as rule IDs, selectors, HTML/ARIA tokens, ratios and colors remain canonical in both languages.

Do not describe contextual evidence as a deterministic WCAG failure. Do not present APG guidance as normative WCAG conformance, and do not claim complete WCAG or EN 301 549 certification.

When rule behavior changes, update `docs/RULES.md` as well as the README catalog where relevant.

Run:

```bash
npm run capabilities:validate
```

The validator checks that every source-defined `FT-*` rule is represented in both README catalogs and that the core catalog sections remain present.

## Pull request maintenance

For every user-visible capability change, explicitly state in the PR whether the capability catalog was updated. If the change does not affect the catalog, explain why.

Preserve the existing evidence-first, local-first, bilingual and least-privilege constraints documented in `CONTRIBUTING.md`, `PRIVACY.md` and `docs/ARCHITECTURE.md`.
