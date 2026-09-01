# axe-core severity benchmark

FocusTrace uses axe-core as an external impact benchmark when both tools evaluate substantially the same accessibility failure.

This does **not** mean FocusTrace runs axe-core or delegates conformance decisions to axe. Detection remains implemented by FocusTrace. The benchmark is used only to avoid assigning a different impact level to an equivalent failure without an explicit reason.

## Source of truth

`generated/axe-rule-severities.json` is a generated snapshot of the latest stable `dequelabs/axe-core` release. It stores every axe rule and its published impact (`critical`, `serious`, `moderate`, `minor` or unrated), not only the critical subset.

`config/axe-equivalents.json` is the curated FocusTrace ↔ axe equivalence map. A mapping is added only when the detector scope is sufficiently comparable.

For `highest-impact` mappings, a FocusTrace rule that covers several axe rules adopts the highest impact in that equivalent set. This matters for broad FocusTrace checks such as image naming, where native `<img>` and explicit image roles are evaluated together.

Rules with no reliable axe equivalent keep a FocusTrace-owned severity based on observed user impact and evidence strength. An unmapped axe critical rule therefore means “no declared equivalent” rather than automatically “missing implementation”.

## Scheduled synchronization

The Standards Registry workflow runs on the 1st and 15th of each month at 06:17 UTC and:

1. resolves the latest stable axe-core GitHub release;
2. downloads the rule metadata from that release;
3. regenerates `generated/axe-rule-severities.json` deterministically;
4. validates every configured FocusTrace ↔ axe mapping;
5. reports added/removed axe rules and any impact changes;
6. reports the current critical axe list and which critical rules have no declared FocusTrace equivalent;
7. opens or refreshes the existing registry PR when the upstream snapshot changes, falling back to a GitHub issue if a PR cannot be created.

The workflow can also be dispatched manually at any time. It never silently rewrites FocusTrace detector logic. A changed axe impact is surfaced for review through the generated PR/diff.

## CI guardrail

Unit tests resolve all FocusTrace rules, all mapped axe rules and the generated benchmark. For mappings marked `highest-impact`, CI fails when the FocusTrace severity no longer matches the highest current axe impact.

This gives us two separate safeguards:

- **upstream freshness:** the scheduled workflow tells us when axe changes;
- **local alignment:** CI tells us when FocusTrace has become inconsistent with a declared equivalent.

WCAG conformance levels remain independent. `A`, `AA` and `AAA` are standards levels; `critical`, `serious`, `moderate` and `minor` are user-impact prioritization levels.
