# Structural HTML semantics

FocusTrace audits semantic HTML structure from the live DOM and exposes the findings under **Review → Semantics**.

The implementation deliberately separates deterministic HTML authoring problems from contextual accessibility review:

- `WARNING` means the live DOM violates a native HTML parent/content-model constraint that FocusTrace can establish with high confidence.
- `REVIEW` means the DOM contains a useful semantic signal, but author intent or content meaning still needs human judgement.
- HTML conformance warnings are not automatically promoted to WCAG failures. A separate FocusTrace WCAG rule must observe evidence for the applicable success criterion.

## Required structural context

`FT-WARN-008` detects native elements outside a required parent/ancestor context, including:

- `li` outside a direct `ul`, `ol` or `menu` parent;
- `dt` / `dd` outside a valid `dl` group;
- `figcaption` outside `figure`;
- `legend` outside `fieldset` / `optgroup`;
- `summary` outside `details`;
- table elements such as `caption`, `colgroup`, `col`, `thead`, `tbody`, `tfoot`, `tr`, `td` and `th` outside their valid structural context;
- `source` / `track` outside the applicable picture/media context;
- `option` / `optgroup` outside their native selection context;
- `area` without a `map` ancestor;
- current customizable-select `selectedcontent` outside its required select/button context.

## Native content models

`FT-WARN-009` checks high-confidence child/group/order requirements, including:

- `ul`, `ol` and `menu` structural children;
- direct and div-grouped `dl` term/description sequences;
- one first `summary` in `details`;
- first-child `legend` placement;
- `figure` / `figcaption` count and position;
- table child groups, table section ordering, rows/cells and `colgroup` structure;
- `picture` source ordering and required image fallback;
- `audio` / `video` source/track ordering, `src` conflicts and nested media;
- `optgroup` labeling;
- multiple selected options on non-multiple selects;
- `map` name/id requirements and `area` alt/href combinations;
- content restrictions inside `dt` and `address`.

The analyzer intentionally follows current HTML rather than legacy assumptions. For example, customizable selects can contain structures that older HTML validators would have rejected, so FocusTrace does not apply a simplistic “select may contain only option/optgroup” rule.

## Conflicting interactive structures

`FT-WARN-010` detects combinations where native activation, focus or labeling semantics conflict, including:

- interactive content, nested anchors or tabindex descendants inside `a[href]`;
- interactive content or tabindex descendants inside `button`;
- nested labels;
- extra labelable controls inside a `label` that are not its labeled control;
- `label[for]` pointing to a non-labelable target;
- prohibited interactive descendants inside `option`;
- nested forms when such a DOM is created dynamically.

## Main hierarchy

`FT-WARN-011` checks the native `main` element hierarchy defined by current HTML. A native `main` may be under `html`, `body`, `div`, an unnamed `form`, or an autonomous custom element. A `main` nested under sectioning/navigation/other disallowed ancestors is reported as an authoring warning.

This rule is separate from `FT-REVIEW-004` / `FT-REVIEW-005`, which review whether a useful main landmark exists and whether multiple exposed main landmarks are intentional.

## Contextual semantic review

`FT-REVIEW-009` reviews visible `section` / `article` elements that have neither a heading belonging to that sectioning element nor a computed accessible name.

This is deliberately **not** a parent rule. An `article` does not need a `section` parent, and FocusTrace must not report one simply because it is independent:

```html
<main>
  <article>
    <h1>Independent story</h1>
    ...
  </article>
</main>
```

The review exists to help decide whether a sectioning element is identifiable and semantically justified, or whether a generic container would better fit the content.

`FT-REVIEW-010` reviews repeated navigation, complementary and search landmarks. When multiple landmarks expose the same role, missing or duplicate accessible names are surfaced so the regions can be made distinguishable.

## Live-DOM boundary

FocusTrace runs inside the browser and audits the **parsed live DOM**, not the original response/source text.

HTML parsers repair some invalid source structures before scripts can inspect them. Examples include portions of malformed table markup, nested forms and other parser-sensitive constructs. If the browser has already normalized the source into a valid DOM, FocusTrace cannot reliably reconstruct the exact authoring error from the resulting tree.

For that reason:

- FocusTrace reports only structural evidence that still exists in the live DOM;
- it does not guess that browser repair occurred;
- dynamically-created invalid DOM remains detectable when the invalid relationship is observable;
- source-level HTML conformance checking remains complementary to the live accessibility/semantic audit.

This boundary prevents repaired or ambiguous markup from becoming false-positive accessibility findings.
