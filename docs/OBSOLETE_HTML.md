# Obsolete HTML coverage

FocusTrace reports obsolete HTML authoring features inside **Review → Semantics** as authoring warnings. These warnings are intentionally separate from WCAG failures: obsolete markup can be non-conforming HTML without proving an accessibility failure by itself.

## Standards snapshot

- Source: WHATWG HTML Living Standard, **Obsolete features**.
- Snapshot date used by the committed registry: **2026-08-28**.
- Registry: `shared/obsolete-html-registry.ts`.
- Evaluator: `lib/audit/obsolete-html.ts`.

The registry is deliberately data-driven so updates to the Living Standard can be reviewed as a standards-data change instead of adding scattered conditions to the scanner.

## Entirely obsolete elements

FocusTrace covers the complete element list in HTML §16.2 for this snapshot:

`applet`, `acronym`, `bgsound`, `dir`, `frame`, `frameset`, `noframes`, `isindex`, `keygen`, `listing`, `menuitem`, `nextid`, `noembed`, `param`, `plaintext`, `rb`, `rtc`, `strike`, `xmp`, `basefont`, `big`, `blink`, `center`, `font`, `marquee`, `multicol`, `nobr`, `spacer`, `tt`.

Each occurrence is reported as `FT-WARN-005` with the affected selector and a modernization hint based on the replacement guidance in the standard.

## Obsolete non-conforming attributes

`FT-WARN-006` covers the complete attribute/element matrix in HTML §16.2 for the snapshot, including:

- legacy link/resource metadata (`charset`, `coords`, `shape`, `methods`, `rev`, `urn`, legacy `name`, etc.);
- obsolete form, image-map, `head`/`html`, image and iframe attributes;
- legacy `object`, script and style authoring attributes;
- obsolete table-description/header attributes;
- Microsoft-era data-binding attributes (`datasrc`, `datafld`, `dataformatas`);
- global `contextmenu`, `onshow` and `dropzone`;
- presentational attributes on `body`, headings, images, iframes, lists, tables and table cells/rows/sections, including legacy alignment, spacing, color, border and background attributes.

The exact authoritative matrix is kept in `OBSOLETE_ATTRIBUTES` rather than duplicated in runtime code.

## Obsolete but conforming features

HTML retains a small set of legacy features so conformance checkers can distinguish vestigial markup from hard conformance errors. FocusTrace reports these as `FT-WARN-007` rather than merging them with non-conforming attributes.

The snapshot covers:

- `img[border="0"]`;
- `script[charset="utf-8"]`;
- `script[language="JavaScript"]` under the allowed legacy `type` conditions;
- empty or JavaScript-MIME `script[type]` declarations;
- `style[type="text/css"]`;
- legacy non-empty `a[name]` when its old fragment-target constraints are satisfied;
- `maxlength` and `size` on `input[type="number"]`.

FocusTrace includes the JavaScript MIME essence list referenced by the MIME Sniffing Living Standard so historical JavaScript `type` values are classified consistently with current HTML.

## Conditional cases

Some feature names can be either obsolete-but-conforming or non-conforming depending on their value/context. The evaluator therefore does not treat them as simple attribute-name matches:

- `img[border]`: only the exact value `0` gets the obsolete-but-conforming classification;
- `script[charset]`: only `utf-8` gets the obsolete-but-conforming classification;
- `script[language]`: only the legacy JavaScript combination allowed by HTML gets that classification;
- `style[type]`: only `text/css` is obsolete-but-conforming;
- `a[name]`: the legacy uniqueness/equality constraints are evaluated before classification;
- `script[type]`: JavaScript MIME declarations are obsolete-but-conforming, while non-JavaScript data-block types are not treated as obsolete simply for having `type`;
- `input[type="number"]`: `maxlength` and `size` are reported as obsolete-but-conforming legacy compatibility features.

## Scope and outcome

Obsolete-markup checks run for full-page and component scans. They do not skip hidden markup because HTML authoring conformance is a property of the markup itself, not only of elements currently exposed to assistive technology.

The three rules are:

| Rule | Outcome | Meaning |
| --- | --- | --- |
| `FT-WARN-005` | WARNING | Entirely obsolete HTML element |
| `FT-WARN-006` | WARNING | Obsolete non-conforming HTML attribute/combination |
| `FT-WARN-007` | WARNING | Obsolete but conforming legacy feature |

These warnings appear under **Semantics / Semántica**, remain locatable/highlightable like other scan findings, and do not claim WCAG failure on their own.

## Deliberate boundary

This coverage targets obsolete **HTML markup authoring features**: elements, attributes and the obsolete-but-conforming markup cases listed by the current HTML standard. Legacy DOM/IDL APIs that exist only as implementation-compatibility requirements are not converted into static markup findings unless the obsolete feature is actually observable in the page markup.
