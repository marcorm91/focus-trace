# Runtime ARIA widget validation

FocusTrace validates selected ARIA widget behavior while **Trace** is recording real user interaction. These checks complement the static ARIA authoring validator; they do not replace it and they do not simulate arbitrary application actions during a page scan.

## Execution model

1. Trace records the real keyboard or pointer interaction.
2. FocusTrace captures the relevant widget relationship before the page handles the action.
3. After a short stabilization delay, FocusTrace checks the resulting ARIA state, controlled content and focus destination.
4. A deterministic state mismatch is emitted as a runtime `warning`.
5. A behavior described by an APG pattern but requiring author/context judgement is emitted as `review`.
6. The runtime finding flows into the consolidated session report. Repeated occurrences are counted but do not create duplicate report cards.

Raw Trace Markdown/JSON evidence remains chronological and lossless.

## Rules

| Rule | Pattern | Outcome | Signal |
| --- | --- | --- | --- |
| `FT-RUNTIME-ARIA-001` | Disclosure / Accordion / Menu button | Warning | `aria-expanded` does not match whether `aria-controls` content is programmatically available. |
| `FT-RUNTIME-ARIA-002` | Tabs | Warning | A tab reports `aria-selected="true"` while its controlled `tabpanel` remains programmatically hidden. |
| `FT-APG-004` | Tabs | Review | Enter, Space or click activates a tab but it does not become selected. Manual activation variants still require contextual review. |
| `FT-APG-005` | Menu button | Review | A keyboard-opened menu becomes available but focus is not observed inside the menu. |
| `FT-APG-006` | Menu button | Review | Escape leaves the menu open or closes it without returning focus to its trigger. |
| `FT-APG-007` | Dialog | Review | A dynamically observed dialog opens without an accessible name. |

Existing dialog runtime rules continue to cover initial focus, modal focus escape and focus restoration (`FT-APG-001` to `FT-APG-003`).

## Precision boundaries

- FocusTrace does **not** treat APG patterns as normative WCAG failures.
- Runtime ARIA warnings are not automatically promoted to WCAG `FAIL`.
- The evaluator only runs after interactions that are relevant to the detected widget pattern.
- `aria-controls` must resolve to live DOM elements; broken ID references are handled by the static ARIA validator instead.
- A 320 ms stabilization window reduces false positives from synchronous framework updates and short visual transitions.
- Menu focus checks run for keyboard opening, not pointer click, to avoid imposing keyboard-specific focus expectations on pointer-only interaction evidence.
- Tab selection is checked on activation (click, Enter, Space), not arrow navigation, because tabs may use automatic or manual activation.
- Dialog naming is checked after a short delay so frameworks can finish inserting labels for dynamically opened dialogs.

## Standards

Deterministic state checks cite WAI-ARIA state definitions. Interaction-pattern reviews cite the WAI-ARIA Authoring Practices Guide and remain explicitly informative/contextual.
