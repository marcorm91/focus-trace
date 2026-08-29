# Runtime ARIA widget validation

FocusTrace validates selected ARIA widget behavior while **Trace** is recording real user interaction. These checks complement the static ARIA authoring validator; they do not replace it and they do not simulate arbitrary application actions during a page scan.

## Execution model

1. Trace records the real keyboard or pointer interaction.
2. FocusTrace captures the relevant widget relationship before the page handles the action.
3. After a short stabilization delay, FocusTrace checks the resulting ARIA state, controlled content and focus destination.
4. A deterministic state or relationship mismatch is emitted as a runtime `warning`.
5. A behavior described by an APG pattern but requiring author/context judgement is emitted as `review`.
6. The runtime finding flows into the consolidated session report. Repeated occurrences are counted but do not create duplicate report cards.

Raw Trace Markdown/JSON evidence remains chronological and lossless.

## Rules

| Rule | Pattern | Outcome | Signal |
| --- | --- | --- | --- |
| `FT-RUNTIME-ARIA-001` | Disclosure / Accordion / Menu button / Combobox | Warning | `aria-expanded` does not match whether `aria-controls` content is programmatically available. |
| `FT-RUNTIME-ARIA-002` | Tabs | Warning | A tab reports `aria-selected="true"` while its controlled `tabpanel` remains programmatically hidden. |
| `FT-RUNTIME-ARIA-003` | Combobox | Warning | An expanded combobox does not resolve `aria-controls` to an allowed popup (`listbox`, `tree`, `grid` or `dialog`). |
| `FT-RUNTIME-ARIA-004` | Combobox | Warning | The controlled popup role does not match the combobox `aria-haspopup` value; omitted `aria-haspopup` correctly implies `listbox`. |
| `FT-RUNTIME-ARIA-005` | Combobox / Listbox | Warning | `aria-activedescendant` points to a missing element or to an element outside the ownership/control relationship allowed by WAI-ARIA. |
| `FT-APG-004` | Tabs | Review | Enter, Space or click activates a tab but it does not become selected. Manual activation variants still require contextual review. |
| `FT-APG-005` | Menu button | Review | A keyboard-opened menu becomes available but focus is not observed inside the menu. |
| `FT-APG-006` | Menu button | Review | Escape leaves the menu open or closes it without returning focus to its trigger. |
| `FT-APG-007` | Dialog | Review | A dynamically observed dialog opens without an accessible name. |
| `FT-APG-008` | Combobox / Listbox | Review | A valid `aria-activedescendant` relationship points to an item that is programmatically hidden after navigation. |
| `FT-APG-009` | Combobox | Review | Escape is pressed while the popup is open but the combobox still exposes an open popup after stabilization. |
| `FT-APG-010` | Listbox | Review | A listbox without `aria-multiselectable="true"` exposes more than one option as selected/checked after interaction. |

Existing dialog runtime rules continue to cover initial focus, modal focus escape and focus restoration (`FT-APG-001` to `FT-APG-003`).

## Combobox relationship model

WAI-ARIA 1.2 requires a combobox to expose `aria-expanded` and to identify its popup with `aria-controls`. The popup role is limited to `listbox`, `tree`, `grid` or `dialog`. A combobox has an implicit `aria-haspopup="listbox"`; an explicit different value must match the actual popup role.

When DOM focus stays on a combobox or listbox and `aria-activedescendant` is used, FocusTrace validates the relationship after the user interaction:

- a direct DOM descendant is valid;
- an element logically owned through `aria-owns` is valid;
- for a focused combobox/textbox/searchbox, an active item owned by an eligible controlled popup (`listbox`, `tree`, `grid`) is valid;
- a missing ID or an active item outside those relationships is a deterministic authoring mismatch;
- a valid but programmatically hidden active item remains a contextual review rather than an automatic failure.

FocusTrace deliberately does not evaluate a residual `aria-activedescendant` during Escape dismissal because the popup and its active item may be transitioning out of the active interaction state.

## Listbox selection model

FocusTrace observes listbox state after selection/navigation interactions. A single-select listbox that exposes multiple selected or checked options is surfaced as `REVIEW`, not an automatic WCAG failure. `aria-multiselectable="true"` explicitly permits multiple selected options and is not flagged.

Options logically owned through `aria-owns` are included in the selection model in addition to normal DOM descendants.

## Precision boundaries

- FocusTrace does **not** treat APG patterns as normative WCAG failures.
- Runtime ARIA warnings are not automatically promoted to WCAG `FAIL`.
- The evaluator only runs after interactions that are relevant to the detected widget pattern.
- Static broken-reference checks remain useful; runtime validation adds the post-interaction state and relationship evidence that static analysis cannot prove.
- A 320 ms stabilization window reduces false positives from synchronous framework updates and short visual transitions.
- Menu focus checks run for keyboard opening, not pointer click, to avoid imposing keyboard-specific focus expectations on pointer-only interaction evidence.
- Tab selection is checked on activation (click, Enter, Space), not arrow navigation, because tabs may use automatic or manual activation.
- Combobox/listbox active-descendant checks run after navigation/selection actions but not during Escape dismissal.
- Dialog naming is checked after a short delay so frameworks can finish inserting labels for dynamically opened dialogs.

## Standards

Deterministic state and relationship checks cite WAI-ARIA 1.2 normative definitions. Interaction-pattern reviews cite the WAI-ARIA Authoring Practices Guide and remain explicitly informative/contextual.
