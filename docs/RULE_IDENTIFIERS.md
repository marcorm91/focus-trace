# FocusTrace rule identifier convention

FocusTrace rule IDs are stable **product identifiers** used across Review, Trace, reports, exports, tests and FocusTrace Memory. They are not official identifiers issued by WCAG, ACT, WAI-ARIA, APG or WHATWG.

## General format

All internal rule IDs start with `FT`, meaning **FocusTrace**.

The normal shape is:

```text
FT-<FAMILY>-<SEQUENCE>
```

Runtime subdomains may use:

```text
FT-RUNTIME-<DOMAIN>-<SEQUENCE>
```

The sequence is zero-padded to three digits (`001`, `002`, ...). A sequence number has meaning only inside its FocusTrace family; it must never be presented as an external standards number.

## Registered families

| Family | Meaning | Typical evidence / outcome |
| --- | --- | --- |
| `FT-WCAG-###` | FocusTrace automated rule directly mapped to a WCAG success criterion. | Deterministic WCAG evidence. Depending on rule scope it may produce `FAIL`, `PASS` or a conservative `REVIEW`. |
| `FT-WARN-###` | Deterministic authoring or standards-conformance warning. | HTML, ARIA or related authoring evidence that should be corrected/reviewed but does not by itself prove a WCAG failure. |
| `FT-REVIEW-###` | Context-dependent signal. | Requires human judgement before it can be treated as an accessibility failure. |
| `FT-RUNTIME-###` | Runtime rule based on behavior observed by Trace. | Focus, DOM, route, dialog or other dynamic behavior. The rule outcome depends on the evidence model. |
| `FT-RUNTIME-ARIA-###` | Runtime contradiction in ARIA state or relationships observed after interaction. | Deterministic ARIA runtime evidence; currently emitted as `WARNING`, not automatic WCAG `FAIL`. |
| `FT-APG-###` | Runtime or contextual behavior reviewed against WAI-ARIA Authoring Practices. | Informative APG guidance; normally `REVIEW` unless a separate normative rule independently proves a stronger result. |

## Family, outcome, severity and confidence are separate concepts

A rule ID identifies **which FocusTrace rule produced the evidence**. It does not, by itself, define every property of the finding.

- **Family/prefix** identifies the rule family and evidence model.
- **Outcome** (`FAIL`, `WARNING`, `REVIEW`, `PASS`) describes the conclusion FocusTrace can support from the measured evidence.
- **Severity** (`critical`, `serious`, `moderate`, `minor`) describes impact or prioritization. It is not a WCAG conformance level.
- **Confidence/evidence quality**, where represented, describes how directly the evidence supports the conclusion. Severity must not be used as a proxy for confidence.

Example:

```text
FT-APG-010
family: APG
outcome: REVIEW
severity: moderate
```

`010` is only the FocusTrace sequence number within the `FT-APG` family. It is not “APG rule 10”.

## External standards references

External identifiers stay separate from FocusTrace IDs and should be shown as references/evidence sources.

Examples:

- `WCAG 2.4.3`
- `ACT 2ee8b8`
- `WAI-ARIA aria-expanded`
- `WAI-ARIA role=combobox`
- `HTML Living Standard`

A FocusTrace rule can cite one or more of these references. The internal rule ID remains stable even if a source URL moves or a synchronized standards snapshot is updated.

## Stability rules

1. **Do not reuse an existing ID** for a different expectation.
2. **Do not renumber released rules** merely to make sequences contiguous.
3. When a rule changes implementation but preserves the same expectation/evidence contract, keep its ID.
4. When the expectation materially changes, create a new ID and document the migration/deprecation where relevant.
5. Use the next available sequence inside the existing family; do not infer semantic meaning from the number.
6. Keep identifiers uppercase and ASCII.

## Adding a new rule

Before assigning an ID:

1. Decide whether the evidence fits an existing family.
2. Decide independently what outcomes the rule is allowed to emit.
3. Define the normative or informative source and whether it proves WCAG conformance evidence or only authoring/context guidance.
4. Choose the next sequence for that family.
5. Add tests that assert the ID, outcome and false-positive boundaries.
6. Update the relevant rule/coverage documentation.

## Adding a new family or runtime domain

Do **not** introduce a new prefix just because a new feature or component exists. A new family should be created only when the evidence model or standards relationship is genuinely different from the registered families.

Before introducing one:

1. document its meaning and allowed outcomes in this file;
2. add it to the user-facing legend in `InstructionsView` if users can encounter the identifier;
3. add contract tests for the nomenclature;
4. ensure reports/exports do not imply the prefix is an external standard identifier.

For example, future Tree/Grid runtime work should continue using `FT-RUNTIME-ARIA` for deterministic ARIA contradictions and `FT-APG` for contextual APG behavior rather than inventing `FT-TREE` or `FT-GRID` families.

If a future capability introduces genuinely different evidence — for example browser Accessibility Tree or assistive-technology observations — the family name should be decided only after the evidence contract is defined, then registered here before the first rule ships.

## Report terminology

FocusTrace also distinguishes:

- **Finding** — one consolidated problem identity (rule + affected context + relevant cause/evidence identity).
- **Occurrence** — one observation of that finding during Trace.

A finding observed five times remains one report finding with five occurrences. Raw Trace evidence may retain all five chronological observations.

## Source of truth

- `docs/RULES.md` documents rule methodology and coverage.
- `docs/RUNTIME_ARIA.md` applies this policy to runtime ARIA/APG rules and points future widget work back here.
- this file defines identifier/naming policy;
- user-facing **Instructions → Rule legend and identifiers** explains the same concepts in product language.
