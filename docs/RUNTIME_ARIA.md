# Runtime ARIA widget validation

FocusTrace validates selected ARIA widget behavior while **Trace** is recording real user interaction. These checks complement the static ARIA authoring validator; they do not replace it and they do not simulate arbitrary application actions during a page scan.

Rule IDs in this document are FocusTrace product identifiers. See [`RULE_IDENTIFIERS.md`](RULE_IDENTIFIERS.md) for the naming convention, prefix meanings and the distinction between rule family, outcome and severity.

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
| `FT-RUNTIME-ARIA-003` | Combobox | Warning | An expanded combobox does not resolve `aria-controls` to an allowed popup role (`listbox`, `tree`, `grid`, `dialog`). |
| `FT-RUNTIME-ARIA-004` | Combobox | Warning | The resolved popup role does not match the combobox `aria-haspopup` value; omitted `aria-haspopup` correctly implies `listbox`. |
| `FT-RUNTIME-ARIA-005` | Combobox / Listbox | Warning | `aria-activedescendant` is missing or is outside the ownership/control relationship allowed by WAI-ARIA. |
| `FT-APG-008` | Combobox / Listbox | Review | A valid active descendant is programmatically hidden after widget navigation. |
| `FT-APG-009` | Combobox | Review | Escape is pressed while the popup is open but the popup remains exposed after stabilization. |
| `FT-APG-010` | Listbox | Review | A single-select listbox exposes multiple selected or checked options after interaction. |

Existing dialog runtime rules continue to cover initial focus, modal focus escape and focus restoration (`FT-APG-001` to `FT-APG-003`).

## Combobox and listbox relationship model

`aria-activedescendant` validation understands both physical and logical ownership:

- DOM descendants;
- `aria-owns` relationships;
- active items owned by a `listbox`, `tree` or `grid` controlled by a focused combobox/textbox/searchbox.

The evaluator skips active-descendant review during Escape dismissal so a temporarily residual reference is not treated as a false positive while the popup closes.

Listbox selection also includes options logically owned through `aria-owns`. Multiselect listboxes (`aria-multiselectable="true"`) are accepted when they expose multiple selected options.

## Precision boundaries

- FocusTrace does **not** treat APG patterns as normative WCAG failures.
- Runtime ARIA warnings are not automatically promoted to WCAG `FAIL`.
- The evaluator only runs after interactions that are relevant to the detected widget pattern.
- `aria-controls` must resolve to live DOM elements for runtime state checks; broken ID references are also handled by the static ARIA validator.
- A 320 ms stabilization window reduces false positives from synchronous framework updates and short visual transitions.
- Menu focus checks run for keyboard opening, not pointer click, to avoid imposing keyboard-specific focus expectations on pointer-only interaction evidence.
- Tab selection is checked on activation (click, Enter, Space), not arrow navigation, because tabs may use automatic or manual activation.
- Dialog naming is checked after a short delay so frameworks can finish inserting labels for dynamically opened dialogs.
- Combobox popup validation accepts the implicit `listbox` value when `aria-haspopup` is omitted.
- Active-descendant review is deliberately skipped during Escape dismissal.

## Standards

Deterministic state and relationship checks cite WAI-ARIA definitions. Interaction-pattern reviews cite the WAI-ARIA Authoring Practices Guide and remain explicitly informative/contextual.

Future widget work should follow the registered identifier families in `RULE_IDENTIFIERS.md` rather than introducing component-specific prefixes unless the evidence model genuinely changes.
