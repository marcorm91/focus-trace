# ARIA validation

FocusTrace evaluates deterministic WAI-ARIA authoring relationships that remain observable in the live DOM. These checks complement WCAG failures, HTML authoring warnings and runtime evidence; they do not turn every ARIA authoring error into an automatic WCAG failure.

## Outcome model

Advanced ARIA authoring checks are reported as **WARNING** findings.

- **WCAG FAIL** remains reserved for implemented checks with deterministic evidence tied to a WCAG success criterion.
- **ARIA WARNING** means the live markup conflicts with a WAI-ARIA role, state/property or accessibility-relationship requirement that FocusTrace can verify deterministically.
- **REVIEW** remains appropriate when user intent, widget behavior or page context is needed before reaching a conclusion.

An ARIA warning can contribute to a real accessibility failure, but the ARIA authoring error alone is not promoted automatically to WCAG FAIL.

## Rule families

### FT-WARN-012 — role resolution

FocusTrace follows ARIA role fallback-token processing rather than assuming that the first token is always the role.

```html
<div role="future-widget button">Save</div>
```

The unknown future token is allowed to fall back to `button`. FocusTrace does not warn merely because an unknown token precedes a valid fallback.

Abstract ARIA roles are never valid author roles. If an abstract token is used, FocusTrace reports it even when a later non-abstract fallback resolves successfully.

### FT-WARN-013 — unknown aria-* attributes

Every `aria-*` attribute is checked against the synced WAI-ARIA state/property registry. Unknown attributes are reported without guessing what the author intended to type.

### FT-WARN-014 — deterministic value grammar

FocusTrace validates value types where the current ARIA grammar can be checked without page-specific interpretation, including:

- boolean and tristate values;
- `aria-autocomplete`;
- `aria-haspopup`;
- `aria-invalid`;
- `aria-live`;
- `aria-orientation`;
- `aria-sort`;
- `aria-relevant` token lists;
- numeric range values;
- positive integer indexes/spans/levels;
- row/column/set counts, including the ARIA `-1` unknown-count form.

Free-form string properties are not constrained artificially. `aria-current` also deliberately accepts custom non-empty tokens because WAI-ARIA defines unknown token values as `true` rather than as an invalid authoring value.

### FT-WARN-015 — required states and properties

For a resolved explicit ARIA role, FocusTrace checks the required states/properties from the synced role registry.

Native host semantics are considered before reporting a missing property. For example, a native checkbox that explicitly repeats `role="checkbox"` is not required to duplicate its native checked state with an unnecessary `aria-checked` attribute.

### FT-WARN-016 — ID references, ownership and active descendant

FocusTrace validates observable ID-based relationships including:

- `aria-controls`;
- `aria-describedby`;
- `aria-details`;
- `aria-errormessage`;
- `aria-flowto`;
- `aria-labelledby`;
- `aria-owns`;
- `aria-activedescendant`.

It reports empty or unresolved references and rejects invalid `aria-owns` self/ancestor cycles and multiple effective owners.

For `aria-activedescendant`, the target must be an accessibility descendant of the owner. For `combobox`, `textbox` and `searchbox`, FocusTrace also accepts a target inside an element referenced by `aria-controls`, matching the ARIA active-descendant model.

### FT-WARN-017 — required accessibility parent

FocusTrace validates high-confidence required-parent relationships for roles such as:

- `tab` → `tablist`;
- `option` → `listbox` (directly or through `group`);
- menu item roles → `menu` / `menubar` (directly or through `group`);
- `treeitem` → `tree` or nested `group` under a `treeitem`;
- table/grid row, rowgroup and cell/header relationships;
- `listitem` → `list`;
- `caption` → supported figure/table/grid contexts.

This is an **accessibility-parent** check, not a simplistic DOM-parent check. Valid `aria-owns` relationships and transparent generic/presentation wrappers are taken into account.

### FT-WARN-018 — allowed accessibility children

Explicit ARIA containers are checked against deterministic allowed-child models for:

- `grid`, `table`, `treegrid`;
- `rowgroup`, `row`;
- `list`, `listbox`;
- `menu`, `menubar`;
- `tablist`;
- `tree`.

Generic wrappers are transparent. A valid structure such as a `listbox` containing wrapper `div`/`span` elements before an `option` is therefore not rejected.

### FT-WARN-019 — internally inconsistent ARIA state

FocusTrace reports relationships that are numerically impossible even when each individual value parses correctly, for example:

- `aria-valuemin > aria-valuemax`;
- `aria-valuenow` outside an explicitly declared min/max;
- `aria-posinset > aria-setsize` when the set size is known;
- `aria-colindex > aria-colcount` when the column count is known;
- `aria-rowindex > aria-rowcount` when the row count is known.

## Scope and false-positive controls

The validator intentionally does not infer screen-reader speech or user intent.

It also avoids several common over-simplifications:

- unknown role tokens can be valid fallbacks when a later registered role resolves;
- abstract roles are distinguished from unknown forward-compatible tokens;
- generic wrappers do not automatically break required ARIA structures;
- `aria-owns` can change accessibility parentage;
- native host semantics can provide required state without redundant ARIA;
- custom `aria-current` tokens are not rejected;
- contextual APG recommendations are not promoted to normative ARIA warnings.

## Live-DOM boundary

FocusTrace validates the parsed, current DOM. It can verify relationships that exist at scan time, including DOM modified by JavaScript. It does not claim to reproduce the exact accessibility tree or the speech output of NVDA, VoiceOver or another assistive technology.

A future browser accessibility-tree integration can add another evidence layer without changing these ARIA authoring rules.

## Standards source

The role/property registry is synchronized from the W3C WAI-ARIA repository and monitored by FocusTrace standards automation. Advanced validation consumes that registry wherever possible and keeps a deliberately small set of structural relationship tables for semantics that are not currently represented in the generated registry.
