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

## Severity color contrast

AA and AAA describe the contrast of the **FocusTrace interface colors**, not the severity of a finding. A critical finding is not "AAA" and a minor finding is not "AA".

FocusTrace keeps two calibrated variants for every severity hue:

- **AA variant**: the closest practical equivalent to the product hue that reaches at least `4.5:1` against the standard surface. It is used for accent strokes and borders.
- **AAA variant**: the closest practical equivalent that reaches at least `7:1`. It is used for severity text and badge labels.

This lets the interface preserve visual differentiation while giving the textual severity label the stronger contrast target. Text, labels, borders and layout continue to communicate meaning independently of color.

### Light surface (`#ffffff`)

| Severity | AA accent | AAA text |
| --- | --- | --- |
| `critical` | `#b42318` | `#ac2217` |
| `serious` | `#a13e00` | `#9a3b00` |
| `moderate` | `#786500` | `#695800` |
| `minor` | `#2377d4` | `#1b59a0` |

### Dark surface (`#1b2530`)

| Severity | AA accent | AAA text |
| --- | --- | --- |
| `critical` | `#ce6f67` | `#de9f9a` |
| `serious` | `#be7b50` | `#d3a587` |
| `moderate` | `#998b3e` | `#b9af7b` |
| `minor` | `#448dde` | `#81b2e9` |

The palette is covered by automated contrast tests so future visual changes cannot silently drop below the declared thresholds.

## Future contextual severity

A future version may distinguish **base severity** from **contextual severity** when FocusTrace can collect enough evidence about task blocking, alternatives, repetition, or interaction context.

That must be introduced as a separate, documented model rather than silently changing the base severity of a rule.
