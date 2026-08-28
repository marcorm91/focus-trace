# FocusTrace product direction

FocusTrace is a local-first browser extension for accessibility debugging.

**Positioning:** debug accessible behavior with the same evidence-driven mindset used to debug JavaScript.

The product should help a developer or accessibility specialist answer not only **what is wrong**, but also **when it changed, how it happened and what evidence supports the conclusion**.

## Product pillars

### 1. Deterministic static analysis

FocusTrace maintains its own local WCAG 2.2-oriented rule engine for full-page and component-scoped analysis.

Results are deliberately separated into:

- `FAIL` when an implemented accessibility expectation can be evaluated deterministically;
- `REVIEW` when context or human judgement is still required;
- `WARNING` for authoring/standards risks that should not be misrepresented as direct WCAG failures.

The goal is trustworthy evidence, not the largest possible rule count or an opaque accessibility score.

### 2. Runtime accessibility debugging

Trace observes keyboard/pointer interaction, focus transitions, selected DOM mutations, SPA route changes and dialog lifecycle behavior.

It correlates those events so FocusTrace can explain causal patterns such as focus being removed, falling back to the document body, escaping a modal or remaining behind after SPA navigation.

Runtime evidence should remain inspectable as events, interactions, journey, graph and replay rather than being reduced to a single pass/fail number.

### 3. Historical comparison

FocusTrace Memory is an opt-in local history for repeated static page/component scans.

It can identify:

- first observations;
- persistent deterministic failures;
- failures that are no longer reproduced;
- regressions;
- other material scan changes.

Memory is disabled by default, bounded and local. It must never infer that repeated behavior is correct merely because it has been seen before.

Runtime behavioral memory is intentionally a later step. It should be built on explicit Interaction Contracts rather than learning repeated behavior as truth.

### 4. Scale without pretending certainty

Site Audit discovers same-origin routes, groups route families and samples representative pages using the real FocusTrace scanner.

Sampling and family aggregation should help users find repeated template-level problems without claiming that every route was exhaustively proven equivalent.

## Product boundaries

FocusTrace is not intended to become:

- a generic HTML/CSS linter;
- an automated claim of complete WCAG conformance;
- an AI service that uploads inspected DOM/content to explain findings;
- a score-first replacement for expert accessibility review;
- a cloud account requirement for core debugging workflows.

Best-practice or code-quality checks can be useful, but they should remain visibly separate from accessibility outcomes when they do not themselves establish an accessibility failure.

## Privacy and trust

The local-first model is a product feature, not just an implementation detail.

Core analysis, Trace evidence and FocusTrace Memory do not require a FocusTrace backend. Persistent features must have explicit retention boundaries and user controls. See [`../PRIVACY.md`](../PRIVACY.md) and [`ARCHITECTURE.md`](ARCHITECTURE.md).

## Near-term differentiation

The most valuable future work is behavior-oriented rather than simply adding large numbers of static rules.

Candidate direction:

1. **Interaction Contracts** — explicit expected behavior for patterns such as dialogs, menus or comboboxes.
2. **Focus Regression Diff** — compare known-good and current runtime behavior.
3. **Trace → Playwright** — turn reproduced behavior into a regression test scaffold.
4. **Accessibility State Timeline** — make behavior changes inspectable over time.
5. **Live Region Trace** — expose announcement-related runtime evidence where it can be measured reliably.
6. **Debug/Repro Bundle** — package reproducible accessibility evidence for a developer or QA workflow.

The first Interaction Contract should stay narrow enough to be deterministic and demonstrable, with Dialog as the strongest candidate.

## Decision rule for new features

A feature belongs in FocusTrace when it materially improves one or more of these outcomes:

- discover a real accessibility risk;
- explain evidence and causality;
- reproduce behavior;
- compare behavior over time;
- prevent a known regression;
- make accessibility debugging easier to hand from specialist/QA to developer.

If a feature mainly reports generic code style without improving those workflows, it should either live in a clearly separate Best Practices surface or remain outside the product.
