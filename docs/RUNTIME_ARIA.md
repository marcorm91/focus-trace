# Runtime ARIA and keyboard-focus validation

FocusTrace validates selected ARIA widget and keyboard-focus behavior while **Trace** records real user interaction. These checks complement the static ARIA authoring validator; they do not replace it and they do not simulate arbitrary application actions during a page scan.

Rule IDs in this document are FocusTrace product identifiers. See [`RULE_IDENTIFIERS.md`](RULE_IDENTIFIERS.md) for naming conventions and the distinction between rule family, outcome and severity.

## Execution model

1. Trace records the real keyboard or pointer interaction.
2. FocusTrace captures only probes relevant to the observed widget pattern and unmodified key binding.
3. Real `aria-activedescendant` mutations retain their exact previous value from the `MutationRecord` and are correlated with the interaction after browser dispatch completes.
4. A valid correlated active-descendant transition is recorded as informational virtual-focus evidence; it is not treated as DOM focus movement or as a finding.
5. After a short stabilization delay, FocusTrace checks the resulting ARIA state, controlled content, ownership relationship, focus destination and supported keyboard expectation.
6. A deterministic state or relationship mismatch is emitted as a runtime `warning`.
7. Behavior derived from the WAI-ARIA Authoring Practices Guide (APG) is emitted as `review`, because APG is informative and application context can matter.
8. Runtime findings flow into the consolidated session report. Repeated occurrences are counted without creating duplicate report cards.

Raw Trace Markdown/JSON evidence remains chronological. Runtime conclusions use stabilized state; FocusTrace never fabricates a positive focus transition that was not observed.

## Rules

| Rule | Pattern | Outcome | Signal |
| --- | --- | --- | --- |
| `FT-RUNTIME-ARIA-001` | Disclosure / Accordion / Menu button | Warning | `aria-expanded` contradicts whether `aria-controls` content is programmatically available. |
| `FT-RUNTIME-ARIA-002` | Tabs | Warning | A selected tab controls a `tabpanel` that remains programmatically hidden. |
| `FT-RUNTIME-ARIA-003` | Combobox | Warning | An expanded combobox does not resolve `aria-controls` to an allowed popup role. |
| `FT-RUNTIME-ARIA-004` | Combobox | Warning | The popup role does not match `aria-haspopup`. |
| `FT-RUNTIME-ARIA-005` | Combobox / Listbox / Tree / Grid / Treegrid | Warning | `aria-activedescendant` is missing or falls outside the allowed ownership/control relationship. |
| `FT-RUNTIME-ARIA-006` | Tree | Warning | A treeitem's `aria-expanded` state contradicts availability of its child `group`. |
| `FT-APG-004` | Tabs | Review | Enter, Space or click activates a tab but it does not become selected. |
| `FT-APG-005` | Menu button | Review | Required keyboard activation does not open the menu, or an opened menu does not place focus on the expected item. Optional ArrowUp/ArrowDown opening is only evaluated when the application implements it. |
| `FT-APG-006` | Menu button | Review | Escape leaves a menu open or closes it without returning focus to its trigger. |
| `FT-APG-007` | Dialog | Review | A dynamically observed dialog opens without an accessible name. |
| `FT-APG-008` | Combobox / Listbox / Tree / Grid / Treegrid | Review | A valid active descendant is programmatically hidden after navigation. |
| `FT-APG-009` | Combobox | Review | Escape is pressed while the popup is open but the popup remains exposed. |
| `FT-APG-010` | Listbox | Review | A single-select listbox exposes multiple selected or checked options. |
| `FT-APG-011` | Tabs / Radio group / Toolbar / Menu / Listbox / Tree / Grid / Treegrid | Review | A roving-tabindex composite exposes multiple managed page tab stops after interaction. |
| `FT-APG-012` | Tree | Review | Arrow or required Home/End navigation does not reach the destination/state expected by the observed Tree pattern. |
| `FT-APG-013` | Grid / Treegrid | Review | Arrow or required Home/End navigation does not reach the expected row/cell or treegrid state. |
| `FT-APG-014` | Tree | Review | A single-select tree exposes multiple selected or checked treeitems. |
| `FT-APG-015` | Tabs | Review | Arrow navigation does not reach the expected tab, respecting tablist orientation and required wrapping. |
| `FT-APG-016` | Radio group | Review | Arrow navigation does not reach/select the expected ARIA radio outside a toolbar. |
| `FT-APG-017` | Toolbar | Review | The toolbar-owned arrow key does not reach the expected control. |
| `FT-APG-018` | Menu / Menubar | Review | The menu-owned arrow key does not reach the expected menu item. |
| `FT-APG-019` | Listbox | Review | The listbox-owned arrow key does not reach the expected option/virtual option. |
| `FT-APG-020` | Modal dialog | Review | Escape is observed inside an open modal but the modal remains open after stabilization. |
| `FT-APG-021` | Disclosure / Accordion | Review | Enter or Space on a disclosure button does not toggle the exposed `aria-expanded` state. |

Existing dialog focus rules `FT-APG-001` to `FT-APG-003` continue to cover initial focus, modal focus escape and focus restoration after close.

## Focus models

FocusTrace supports both common composite focus-management strategies where the pattern allows them:

- **DOM focus / roving tabindex** — focus moves among managed items while normally one item participates in the page tab sequence.
- **Virtual focus / `aria-activedescendant`** — DOM focus remains on the composite owner while `aria-activedescendant` identifies the active item.

A valid virtual-focus event:

- appears in Trace as part of the real interaction chain;
- can appear as a destination in Journey and Graph;
- has severity `info` and no finding outcome;
- does not increase runtime finding counts;
- does not increase Tab forward/backward/wrap/jump metrics.

The final ownership relationship is checked after stabilization so frameworks can finish inserting or re-parenting an active item. Positive virtual-focus interpretation remains limited to the owner families FocusTrace models at runtime: combobox, textbox/searchbox, listbox, tree, grid and treegrid.

## Managed widget keyboard behavior

### Tabs

FocusTrace observes the tablist orientation. Horizontal tablists use Left/Right and vertical tablists use Up/Down. Required wrapping between first and last tab is included. Activation remains separate because both automatic and manual tab activation models are valid.

### Radio groups

ARIA radio groups outside toolbars are reviewed for arrow-key movement and selection synchronization. Radio groups inside a toolbar are not forced into the standalone radio-group model because the toolbar owns the navigation behavior.

### Toolbars

Toolbar navigation follows the declared orientation. FocusTrace does not attribute an arrow key to the toolbar when the focused embedded control owns that key, such as text editing controls, comboboxes, sliders or relevant spinbutton directions.

### Menus and menu buttons

Enter and Space are treated as required menu-button activation behavior. ArrowDown/ArrowUp opening is optional in APG: FocusTrace does not report a closed menu merely because one of those optional keys was pressed. If the application does open the menu with an optional key, the resulting initial focus can still be reviewed.

Once focus is inside a menu/menubar, FocusTrace evaluates the navigation axis that belongs to that pattern and keeps Escape handling separate.

### Listboxes

Listbox navigation accepts both DOM focus and supported `aria-activedescendant` virtual focus. Single-selection consistency remains covered independently so one interaction can be understood without treating all selection models as identical.

### Disclosure / accordion controls

For a semantic button exposing `aria-expanded` and controlling content, Enter/Space are observed for an expanded-state transition. This is an APG Review, not an automatic WCAG failure. The deterministic `aria-expanded` versus content-availability contradiction remains the separate `FT-RUNTIME-ARIA-001` warning.

### Modal dialogs

When Escape is observed inside a modal, FocusTrace checks whether the modal remains open after stabilization. Existing dialog instrumentation independently verifies initial focus, focus containment and restoration after the dialog closes, so a correct journey can be demonstrated as:

`open → focus inside → Escape → close → focus restored to trigger`.

## Tree behavior

Tree checks observe orientation and the current active-item strategy before deriving an expectation:

- vertical Tree: Up/Down traverses visible treeitems, Right expands/enters children, Left collapses/moves to parent;
- horizontal Tree: the APG axis mapping is respected;
- Home/End review movement to the first/last visible treeitem;
- hidden child groups are excluded from visible traversal;
- nested or external child groups connected with `aria-owns` participate in the accessibility ownership model;
- multi-selection is accepted only when the Tree explicitly exposes `aria-multiselectable="true"`.

`FT-RUNTIME-ARIA-006` remains reserved for deterministic state contradiction. Keyboard expectations remain APG Review.

## Grid and treegrid behavior

Grid checks are deliberately conservative:

- Right/Left can be reviewed between adjacent managed cells;
- Up/Down can be reviewed between corresponding cells in adjacent rows;
- Home/End on a focused grid cell review the first/last cell in the current row;
- row-focused Treegrid Home/End review the first/last row;
- row-focused Treegrid can review Up/Down movement and Right/Left expand/collapse;
- ambiguous optional behavior is not forced;
- editing controls and nested widgets keep ownership of keys they consume;
- irregular/virtualized grids with explicit indexes, omitted columns or spans are not promoted to deterministic failures by the basic row/cell model.

`Ctrl+Home` and `Ctrl+End` have distinct APG behavior in Grid/Treegrid. FocusTrace preserves those modified keystrokes in Trace but does not reinterpret them as plain Home/End in this rule set.

## Precision boundaries

- APG behavior is informative evidence and is never promoted directly to WCAG `FAIL`.
- Runtime ARIA warnings are not automatically promoted to WCAG `FAIL` either.
- The evaluator only runs after interactions relevant to a modeled pattern.
- A 320 ms stabilization window reduces false positives from synchronous framework updates and short transitions.
- Pointer interactions do not inherit keyboard-only focus expectations.
- Optional APG bindings are not reported as missing simply because an application does not implement them.
- Keyboard modifiers are preserved in Trace (`Control+Home`, `Shift+ArrowRight`, etc.) but modified shortcuts are not evaluated as their unmodified APG bindings unless FocusTrace has an explicit model for that combination.
- Composite roving-tabindex review is skipped when the composite uses `aria-activedescendant`; both focus strategies can be valid.
- Grid navigation reviews are suppressed when an editing or nested-widget context owns the key.
- Unsupported runtime owner roles are not inferred as correct merely because an ARIA ID reference resolves.

## Standards

Deterministic state and relationship checks cite normative WAI-ARIA definitions. Interaction-pattern reviews cite the WAI-ARIA Authoring Practices Guide and remain explicitly informative/contextual.

Future widget work should continue using the registered identifier families in [`RULE_IDENTIFIERS.md`](RULE_IDENTIFIERS.md) rather than introducing component-specific prefixes unless the evidence model genuinely changes.
