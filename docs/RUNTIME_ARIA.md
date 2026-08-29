# Runtime ARIA widget validation

FocusTrace validates selected ARIA widget behavior while **Trace** is recording real user interaction. These checks complement the static ARIA authoring validator; they do not replace it and they do not simulate arbitrary application actions during a page scan.

Rule IDs in this document are FocusTrace product identifiers. See [`RULE_IDENTIFIERS.md`](RULE_IDENTIFIERS.md) for the naming convention, prefix meanings and the distinction between rule family, outcome and severity.

## Execution model

1. Trace records the real keyboard or pointer interaction.
2. FocusTrace captures the relevant widget relationship before the page handles the action.
3. Real `aria-activedescendant` mutations correlated with that interaction are recorded immediately as informational virtual-focus evidence when the resulting relationship is valid.
4. After a short stabilization delay, FocusTrace checks the resulting ARIA state, controlled content, ownership relationships and focus destination.
5. A deterministic state mismatch is emitted as a runtime `warning`.
6. A behavior described by an APG pattern but requiring author/context judgement is emitted as `review`.
7. Runtime findings flow into the consolidated session report. Repeated occurrences are counted but do not create duplicate report cards.

Raw Trace Markdown/JSON evidence remains chronological. Runtime conclusions use the stabilized state; virtual-focus evidence follows the observed ARIA state transition rather than inventing a DOM focus move.

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
| `FT-RUNTIME-ARIA-005` | Combobox / Listbox / Tree / Grid / Treegrid | Warning | `aria-activedescendant` is missing or is outside the ownership/control relationship allowed by WAI-ARIA. |
| `FT-APG-008` | Combobox / Listbox / Tree / Grid / Treegrid | Review | A valid active descendant is programmatically hidden after widget navigation. |
| `FT-APG-009` | Combobox | Review | Escape is pressed while the popup is open but the popup remains exposed after stabilization. |
| `FT-APG-010` | Listbox | Review | A single-select listbox exposes multiple selected or checked options after interaction. |
| `FT-RUNTIME-ARIA-006` | Tree | Warning | A parent treeitem exposes `aria-expanded` that contradicts the programmatic availability of its child `group`. |
| `FT-APG-011` | Tree / Grid / Treegrid | Review | A composite using roving tabindex exposes more than one managed item with `tabindex="0"` after interaction. |
| `FT-APG-012` | Tree | Review | Arrow navigation does not move to, expand or collapse the item expected by the observed Tree pattern. |
| `FT-APG-013` | Grid / Treegrid | Review | Arrow navigation does not move to the expected row/cell or update the expected treegrid row state. |
| `FT-APG-014` | Tree | Review | A single-select tree exposes multiple selected or checked treeitems after interaction. |

Existing dialog runtime rules continue to cover initial focus, modal focus escape and focus restoration (`FT-APG-001` to `FT-APG-003`).

## Composite widget focus model

FocusTrace supports both common composite focus-management strategies instead of requiring one implementation technique:

- **DOM focus / roving tabindex** — focus moves among managed treeitems, rows or cells while normally only one managed item participates in the page tab sequence.
- **Virtual focus / `aria-activedescendant`** — DOM focus remains on the composite owner while `aria-activedescendant` identifies the active item.

When a valid `aria-activedescendant` value changes during a recorded interaction, the existing runtime `MutationObserver` records the observed state transition as an informational `virtual-focus` event. The 320 ms stabilization pass is still used for warnings and reviews, but it is not used to fabricate positive virtual-focus movement.

A virtual-focus event:

- appears in Trace as part of the real interaction chain;
- appears as a focus destination in Journey and Graph;
- can be located on the inspected page like other observed focus destinations;
- has severity `info` and no finding outcome;
- does **not** increase runtime finding counts or create an additional report problem;
- does **not** increase Tab forward/backward/wrap/jump metrics in Focus Journey.

Observing the ARIA mutation also means FocusTrace can capture the first interaction that adds `aria-activedescendant`; the attribute does not need to exist before the key is pressed. The final ownership relationship is checked again after stabilization so frameworks can finish inserting or re-parenting the active item.

The existing `FT-RUNTIME-ARIA-005` relationship rule is reused for Tree/Grid/Treegrid. A new component-specific prefix such as `FT-TREE` or `FT-GRID` is intentionally not introduced.

## Combobox and listbox relationship model

`aria-activedescendant` validation understands both physical and logical ownership:

- DOM descendants;
- recursive `aria-owns` relationships;
- active items owned by a `listbox`, `tree` or `grid` controlled by a focused combobox/textbox/searchbox.

The evaluator skips active-descendant review during Escape dismissal so a temporarily residual reference is not treated as a false positive while the popup closes.

Listbox selection also includes options logically owned through `aria-owns`. Multiselect listboxes (`aria-multiselectable="true"`) are accepted when they expose multiple selected options.

## Tree behavior

Tree checks observe the orientation and current active-item strategy before deriving an expectation:

- vertical Tree: Up/Down moves among visible treeitems, Right expands or enters children, Left collapses or moves to the parent;
- horizontal Tree: the APG axis mapping is respected instead of hard-coding vertical arrows;
- hidden child groups are removed from the visible traversal sequence;
- nested or external child groups connected with `aria-owns` participate in the accessibility ownership model;
- multi-selection is accepted only when the Tree explicitly exposes `aria-multiselectable="true"`.

`FT-RUNTIME-ARIA-006` is reserved for the deterministic state contradiction between `aria-expanded` and the child group. Keyboard expectations remain `FT-APG-012` reviews because application context and interaction design still require human judgement.

## Grid and treegrid behavior

Grid checks are deliberately conservative:

- Right/Left can be reviewed between adjacent managed cells;
- Up/Down can be reviewed between corresponding cells in adjacent rows;
- row-focused Treegrid can review Up/Down row movement and Right/Left expand/collapse behavior;
- ambiguous Treegrid first-cell Left behavior is not forced because row-focus support is optional;
- when editing text or a nested arrow-key widget is active, FocusTrace does not attribute that arrow key to the outer Grid;
- nested radiogroups, menus, menubars, listboxes and toolbars are treated as owning their arrow navigation while focus is inside them;
- controls that normally do **not** use arrow keys, such as checkboxes and input buttons, do not automatically suppress Grid navigation checks merely because they are implemented with `<input>`.

This follows the APG distinction between grid-navigation mode and interacting with content inside a cell, reducing both false positives and false negatives.

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
- Composite roving-tabindex review is skipped when the composite is using `aria-activedescendant`; the two strategies are both valid.
- Grid arrow reviews are suppressed only when the focused editing/nested-widget context owns those arrow keys; generic input elements are not all treated the same.
- The current Trace keyboard recorder evaluates the arrow keys, Enter, Space and Escape used by these runtime checks. Home/End behavior is not reported by this release and absence of that evidence is not treated as a failure.
- Grid vertical expectations currently use the observed row/cell order. Irregular or virtualized grids with explicit `aria-colindex`, omitted columns or spans remain a future specialization rather than being promoted to a deterministic failure in this release.

## Standards

Deterministic state and relationship checks cite WAI-ARIA definitions. Interaction-pattern reviews cite the WAI-ARIA Authoring Practices Guide and remain explicitly informative/contextual.

Future widget work should follow the registered identifier families in `RULE_IDENTIFIERS.md` rather than introducing component-specific prefixes unless the evidence model genuinely changes.
