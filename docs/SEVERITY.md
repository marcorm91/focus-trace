# Finding severity and impact

FocusTrace keeps **finding outcome** and **severity** as separate concepts.

- `fail`, `review`, and `warning` describe what FocusTrace can conclude from the collected evidence.
- `critical`, `serious`, `moderate`, and `minor` describe the estimated user impact used to prioritize findings.
- `info` is reserved for informational runtime signals and is not part of the four-level failure impact summary.

A severe finding is not automatically a WCAG failure. A `review` can carry a high potential impact while still requiring human judgement.

## Impact scale

| Severity | Intended meaning |
| --- | --- |
| `critical` | Can prevent access to a key control, piece of content, or task. |
| `serious` | A substantial accessibility barrier that can make a task significantly harder. |
| `moderate` | A meaningful difficulty that is usually not completely blocking. |
| `minor` | A limited or localized accessibility barrier. |

These labels are a **FocusTrace prioritization aid**. They are not WCAG conformance levels and must not be mapped mechanically to WCAG `A`, `AA`, or `AAA`.

## How severity is assigned

Severity is currently defined as a **base value in the FocusTrace rule catalog**. The scanner does not infer or recalculate severity from the page context at runtime.

This keeps the result deterministic and reviewable: the same rule has the same base impact wherever it is detected.

The four-level taxonomy aligns with conventions used by established accessibility auditing tools, including the public `critical / serious / moderate / minor` impact taxonomy used by axe-core. FocusTrace does not query axe-core at runtime and owns its own rule catalog and severity assignments.

## Outcome is not severity

Examples:

- `FAILURE · CRITICAL` means FocusTrace has deterministic failure evidence and the rule has critical base impact.
- `REVIEW · MODERATE` means the signal requires human judgement and has moderate base impact if the issue is confirmed.

The UI must always expose the outcome independently from severity. Color alone must not carry either meaning.

## Future contextual severity

A future version may distinguish **base severity** from **contextual severity** when FocusTrace can collect enough evidence about task blocking, alternatives, repetition, or interaction context.

That must be introduced as a separate, documented model rather than silently changing the base severity of a rule.
