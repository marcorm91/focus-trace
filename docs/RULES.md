# FocusTrace rule methodology

FocusTrace implements its own local analysis engine and maps each rule to the standards source that justifies the expectation.

The public, bilingual capability inventory lives in [`README.md`](../README.md) and [`README.es.md`](../README.es.md). Keep this methodology document and those catalogs aligned whenever rule behavior or applicability changes.

## Sources

1. **WCAG 2.2** is the conformance standard and normative source for success criteria.
2. **W3C ACT Rules** make applicability, expectations and outcome mapping explicit where available.
3. **WAI-ARIA** supplies role/state/property semantics. The automated registry currently follows the public ARIA 1.3 Editor Draft; findings sourced only from this registry are authoring warnings, not direct WCAG failures.
4. **WAI-ARIA APG** is used for runtime widget patterns and authoring guidance such as modal-dialog focus behavior, landmark structure and preferring native HTML semantics. It remains informative guidance.
5. **AccName** and **HTML-AAM** guide accessible-name precedence and host-language fallbacks.
6. **IANA Language Subtag Registry** supplies the primary language subtags used by the ACT rule behind `FT-WCAG-009`.
7. **HTML Living Standard** supplies host-language authoring requirements and native element semantics. FocusTrace can surface these as warnings or review guidance when they are not, by themselves, a WCAG 2.2 failure.

WCAG 2.2 criteria are also reflected in the web requirements of EN 301 549 V4.1.1. FocusTrace does not currently model EN 301 549 as a separate conformance catalog: the implemented rules below describe only their explicit observable WCAG subsets and must not be read as complete EN 301 549 evaluation or certification.

## Outcomes

### FAIL

FocusTrace found observable evidence that matches an automated rule whose expectation can be evaluated deterministically. A FAIL is linked to the corresponding WCAG criterion and, when available, the ACT rule. A FAIL does not mean that every requirement of the linked WCAG criterion was evaluated.

### REVIEW

FocusTrace found a signal that can indicate an accessibility problem but final judgement depends on context, meaning, workflow or user interaction.

### WARNING

FocusTrace found an authoring or standards-maintenance risk that should be fixed or reviewed but is not automatically represented as a WCAG failure. Current examples include deprecated/prohibited/invalid ARIA usage, duplicate HTML identifiers, obsolete HTML and invalid native content-model relationships.

### PASS

The automated expectation tested by a rule was met. PASS never means full WCAG conformance.

## Accessible name computation

FocusTrace records both the computed name and the source that produced it. The current implementation covers the precedence needed by the rule engine for common HTML controls:

1. `aria-labelledby` references, in reference order
2. `aria-label`
3. native HTML labels where applicable
4. host-language alternatives such as `alt` and button values
5. name-from-content for controls such as buttons and links
6. `title` where HTML-AAM defines it as a fallback
7. `placeholder`, then `aria-placeholder`, for text-entry controls where HTML-AAM defines those fallbacks

Name-from-content traversal includes the computed text alternative of descendants. For example, an icon-only `button` can receive its name from a descendant `svg[role="img"][aria-label]`; FocusTrace must not report `FT-WCAG-003` for that pattern.

When an accessible-name rule fails, the Accessibility and Developer explanation levels expose the resolved role, computed name, winning source and inspected candidates. This evidence is diagnostic context; it does not change the rule outcome.

The implementation also supports self-reference inside `aria-labelledby`, multiple native labels, directly referenced hidden naming nodes, and exclusion of a wrapped control's own value from its label text.

A placeholder-derived name is not reported as an empty-name WCAG failure. FocusTrace emits `FT-REVIEW-003` because a programmatic name and a persistent visible label are separate concerns.

## Label in Name scope

`FT-WCAG-007` implements the automated text-content subset of ACT `2ee8b8` for WCAG 2.5.3. For a name-from-content widget whose accessible name is overridden by `aria-label` or `aria-labelledby`, the visible DOM text must occur intact inside the accessible name after whitespace/case normalization.

```html
<!-- pass -->
<button aria-label="Delete item">Delete</button>

<!-- fail -->
<button aria-label="Remove item">Delete</button>
```

CSS-generated text, images of text and broader visual-label inference remain outside this automated subset.

## Language of Page

`FT-WCAG-008` implements ACT `b5c3f8`: a top-level `text/html` document must have a non-empty `lang` attribute on its root HTML element.

`FT-WCAG-009` implements ACT `bf051a`: when `lang` is non-empty, its primary language subtag must be registered by IANA as `Type: language`. FocusTrace uses the committed `generated/language-subtags.json` snapshot, so the page scan remains offline and deterministic. Later subtags are intentionally not validated by this rule; for example `en-US-GB` still has the known primary subtag `en`.

## Text contrast scope

`FT-WCAG-010` evaluates WCAG 2.2 1.4.3 Contrast (Minimum) for rendered DOM text whose foreground and background can be resolved deterministically from computed styles.

FocusTrace calculates relative luminance and contrast ratio from the rendered foreground/background colors and applies the WCAG AA thresholds:

- `4.5:1` for normal text;
- `3:1` for large text (at least `24px`, or at least `18.667px` when the computed font weight is `700` or greater).

The scan records structured evidence with the measured ratio, required ratio, computed foreground/background, font size and weight. These values can be reused by reports without reparsing human-readable evidence.

A contrast result becomes `FAIL` only when the computed colors and threshold are deterministic. FocusTrace returns `REVIEW` instead when the final rendered background can be affected by visual composition it cannot resolve safely, including:

- background images or gradients;
- element/ancestor opacity;
- `mix-blend-mode`;
- CSS filters;
- an unresolved computed background color.

This conservative model intentionally avoids converting uncertain rendering into false WCAG failures.

## Non-text contrast scope

`FT-WCAG-011` evaluates a conservative automated subset of WCAG 2.2 1.4.11 Non-text Contrast. The required ratio is `3:1` against adjacent colors for visual information needed to identify user interface components, states or graphical objects.

FocusTrace deliberately distinguishes deterministic evidence from contextual visual judgement:

- an icon that is the only visible identifying cue inside an interactive control can become `FAIL` when a single SVG fill/stroke and its adjacent background resolve reliably below `3:1`;
- the same low-contrast icon beside a visible text label is not failed automatically because the graphic may be decorative;
- standalone graphical objects below `3:1` become `REVIEW` because FocusTrace cannot prove from DOM/style evidence alone that the low-contrast portion is required to understand the content;
- form/control borders and fills can be measured, but a sub-`3:1` result remains `REVIEW` when visual context determines whether that boundary or state cue is necessary;
- when the page already has an element focused, an author-defined outline can be evaluated in its observed state. A simple outline below `3:1` can become `FAIL`; complex box-shadow focus treatments remain `REVIEW` rather than being reduced to a misleading single color.

User-agent appearance is not modified merely to perform this scan. FocusTrace does not programmatically focus every control, trigger hover/pressed states, or rewrite the page in order to manufacture visual evidence. As a result, state and focus coverage is limited to what is actually rendered/observed when the scan runs.

The same structured contrast evidence used by text contrast is reused here with an explicit kind (`ui-boundary`, `graphic`, or `focus-indicator`) and subject. Deterministic failures can therefore reuse the HEX/RGB converter, copy controls and accessible-color suggestion without conflating text and non-text semantics.

## Target Size (Minimum) scope

`FT-WCAG-012` evaluates an observable subset of WCAG 2.2 2.5.8 Target Size (Minimum) in the normal **Analysis** engine. WCAG requires pointer targets to contain at least a `24 × 24` CSS px area unless one of its spacing, equivalent, inline, user-agent-control or essential exceptions applies.

FocusTrace evaluates rendered pointer targets it can identify from native interactive elements, supported interactive roles, inline pointer-handler attributes and focusable elements with an observable pointer signal. Disabled, inert, non-rendered, zero-area and `pointer-events: none` targets are excluded.

A target records `PASS` when FocusTrace can demonstrate one of the observable expectations it models:

- a rectangular target contains an axis-aligned `24 × 24` CSS px area;
- a rounded target is sufficiently large that the same square is geometrically guaranteed to fit;
- an undersized target meets the WCAG spacing exception: a `24` CSS px diameter circle centered on its bounding box does not intersect another target or the corresponding circle of another undersized target;
- the target is an inline target embedded in surrounding non-target text under the modeled inline exception.

Spacing remains document-contextual during component analysis. FocusTrace limits the reported finding to the selected component, but it still compares that target with relevant pointer targets outside the component so a nearby external control cannot be silently ignored.

When a target cannot be proven to meet the modeled size/spacing/inline expectations and its spacing circle intersects another observed target, FocusTrace emits `REVIEW`, not `FAIL`. The equivalent and essential exceptions require functional/content context, and user-agent-control applicability can depend on whether the author modified native rendering. FocusTrace therefore does not convert geometric risk alone into an automatic WCAG failure.

Non-rectangular geometry is handled conservatively. SVG hit areas, `clip-path`, transforms and smaller rounded shapes are not treated as passing merely because their bounding rectangle is at least `24 × 24` CSS px. Bounding-box size alone is not sufficient evidence that an axis-aligned `24 × 24` square fits inside the actual target.

## ARIA authoring warnings

The scan consumes `generated/aria-registry.json` instead of maintaining role/property lists by hand where the synced registry contains the required information. Existing role-specific rules report:

- `FT-WARN-001` when the role itself is deprecated;
- `FT-WARN-002` when a state/property is deprecated for that role;
- `FT-WARN-003` when a state/property is prohibited for that role.

Advanced ARIA validation adds deterministic checks for:

- `FT-WARN-012` — explicit role fallback cannot resolve to a registered non-abstract role, or an abstract role token is used by the author;
- `FT-WARN-013` — unknown `aria-*` state/property names;
- `FT-WARN-014` — invalid deterministic state/property value grammar;
- `FT-WARN-015` — a required state/property is missing for the resolved explicit role, after native host semantics are considered;
- `FT-WARN-016` — empty/missing ID references, invalid `aria-owns` ownership, or invalid `aria-activedescendant` relationships;
- `FT-WARN-017` — a role is outside its required accessibility-parent context;
- `FT-WARN-018` — an explicit ARIA container exposes an incompatible accessibility child role;
- `FT-WARN-019` — ARIA range, position or set metadata contradicts itself;
- `FT-WARN-020` — a known ARIA state/property is not supported by the resolved role;
- `FT-WARN-021` — a resolved ARIA relationship contradicts the state exposed by its owner or related content.

Role parsing follows WAI-ARIA fallback-token semantics: an unknown future token before a valid fallback role is not itself an error. Required parent/child validation resolves accessibility relationships rather than comparing only DOM parents: transparent generic/presentation wrappers and valid `aria-owns` ownership are considered. Custom `aria-current` tokens are deliberately not rejected because WAI-ARIA maps unknown token values to `true`.

These findings are `WARNING`, not automatic WCAG `FAIL`. They identify deterministic ARIA authoring/conformance evidence; a separate WCAG rule is responsible for deciding when that evidence proves failure of a WCAG success criterion. See [`ARIA_VALIDATION.md`](ARIA_VALIDATION.md) for the detailed coverage and false-positive controls.

## HTML authoring warnings

`FT-WARN-004` reports a non-empty HTML `id` that occurs more than once in the document. The HTML Living Standard requires an identifier value to be unique within its tree.

The duplicate itself is reported as `WARNING`, not as a WCAG 2.2 failure. WCAG 2.2 removed Success Criterion 4.1.1 Parsing, so FocusTrace does not revive the old generic duplicate-ID failure. A duplicate identifier can still contribute to a separate WCAG failure when concrete evidence shows that it breaks an applicable relationship or name computation; that effect must be evaluated by the corresponding accessibility rule rather than inferred from duplication alone.

Component-scoped scans still evaluate identifier uniqueness against the whole document, while reporting only duplicate occurrences inside the selected component. See [`DUPLICATE_IDS.md`](DUPLICATE_IDS.md) for the detailed behavior and remediation model.

Obsolete HTML authoring is covered by `FT-WARN-005`, `FT-WARN-006` and `FT-WARN-007`. Native structural/content-model conformance is covered by `FT-WARN-008` through `FT-WARN-011`. See [`STRUCTURAL_HTML.md`](STRUCTURAL_HTML.md) for the detailed parent/child models, interaction constraints, landmark review and the live-DOM/browser-repair boundary.

## Semantic HTML review

Semantic authoring is shown in the **Semantics** area of Review. FocusTrace separates deterministic HTML authoring warnings from contextual semantic review: invalid native content-model relationships are `WARNING`, while intent-dependent guidance remains `REVIEW`.

`FT-REVIEW-004` checks whether a full-page scan exposes a visible native `<main>` or `role="main"` landmark. A missing main landmark is review guidance, not an automatic WCAG failure.

`FT-REVIEW-005` reports every exposed main landmark when more than one is present. A document should normally have a clear primary main region. Multiple ARIA main landmarks require genuine structural purpose and clear differentiation; FocusTrace therefore asks for review instead of assuming the structure is invalid.

Interactive semantic inference is intentionally conservative:

- `FT-REVIEW-006` is used when the evidence is button-like. Strong signals include explicit `role="button"`; medium-confidence signals include button states such as `aria-expanded`, `aria-pressed` or `aria-haspopup`. The recommended native element is `<button type="button">`. `role="button"` is shown only as a fallback because ARIA does not add the native keyboard and focus behavior of a real button.
- `FT-REVIEW-007` is used when the evidence is link/navigation-like. Explicit `role="link"` is high confidence; recognizable navigation handlers such as `location`, `window.open`, History API navigation or common router navigation calls are medium-confidence signals. The recommended native element is `<a href="…">`; `role="link"` is only a fallback.
- `FT-REVIEW-008` is used for generic click interaction where FocusTrace cannot safely distinguish action, navigation or another widget. No native element is recommended until the intended behavior is reviewed.
- `FT-REVIEW-009` reviews visible `section` / `article` elements that have neither a heading belonging to that sectioning element nor a computed accessible name. It does **not** require an `article` to be nested in `section`; standalone articles are valid HTML.
- `FT-REVIEW-010` reviews repeated navigation, complementary and search landmarks whose accessible names are missing or duplicated.

Native buttons and native links are not reported merely for being interactive. Elements with another explicit widget role, such as `role="tab"`, are also not reinterpreted as buttons or links by this heuristic; those patterns need their own role-specific rules.

These recommendations follow the first rule of ARIA authoring: prefer native HTML semantics and behavior where a suitable element exists. The current inference does not inspect framework event-listener registries added only through `addEventListener` or synthetic event systems when no observable DOM/element signal exists, so absence of a semantic review finding is not proof that every custom interaction is correctly authored.

## Runtime causality

Runtime recording assigns a stable `interactionId` to user-driven keyboard and pointer activity. Subsequent focus changes, relevant DOM mutations, dialog lifecycle events and SPA route changes inherit that interaction while they remain inside a bounded correlation window.

FocusTrace records only compact evidence needed for debugging:

- element selector, role, accessible name and tag;
- relevant node additions/removals;
- focus-affecting attribute changes;
- route transitions;
- dialog/focus events;
- observed dragging summary evidence;
- deterministic root-cause classifications.

The runtime engine does **not** persist full DOM snapshots or a pointer-coordinate trail. It also does not use AI to infer root causes. Current causal classifications are deterministic signals such as:

- `FOCUSED_NODE_REMOVED`;
- `FOCUS_FELL_BACK_TO_BODY`;
- `DIALOG_OPENED_WITHOUT_FOCUS`;
- `MODAL_FOCUS_ESCAPE`;
- `ROUTE_CHANGED_WITHOUT_FOCUS_MOVE`;
- `FOCUSED_ELEMENT_BECAME_HIDDEN`.

A causal classification explains the recorded chain; the linked runtime WCAG/APG outcome can still remain `REVIEW` where conformance depends on workflow context.

## Focus Not Obscured runtime scope

`FT-RUNTIME-002` provides observed runtime evidence for WCAG 2.4.11 Focus Not Obscured (Minimum). FocusTrace clips the currently focused element to the visible viewport and samples a bounded grid across that visible area. A review is emitted only when every sampled point is covered by another rendered element.

The check runs when focus moves and is re-run while that element remains focused after scroll events, viewport resize and relevant DOM mutations. This matters for sticky headers, banners, drawers and other dynamic overlays that can cover an already-focused component after the original focus event.

The result remains `REVIEW`: sampled hit-testing is evidence of complete observed coverage, not a proof of every visual/compositing condition or every exception in the complete success criterion.

## Dragging Movements runtime scope

`FT-RUNTIME-006` provides observed runtime evidence for WCAG 2.5.7 Dragging Movements. Trace watches likely drag-capable targets and records a review only after an observed pointer path exceeds the small movement threshold used to distinguish dragging from click/tap jitter.

The runtime event stores the target plus a compact movement-distance summary; it does not persist the raw pointer path. Native browser `dragstart` alone does not emit this review. The outcome is always `REVIEW`, because observing a drag does not prove that the functionality requires dragging: an equivalent single-pointer operation may be available elsewhere, and the WCAG exception for essential dragging still requires context.

## Consistent Help Site Audit scope

`FT-REVIEW-011` provides multipage review evidence for WCAG 3.2.6 Consistent Help. During the existing Site Audit structure collection, FocusTrace identifies a bounded set of candidate help mechanisms using observable link/control text and href patterns. Candidates are grouped into four categories: human contact details, human contact mechanisms, self-help options and automated contact mechanisms.

FocusTrace compares the relative order only when at least two of the same observed categories occur on both sampled pages. A single shared mechanism is never enough to emit the review. When a mismatch is observed, the report keeps the compared page URL and both observed orders as evidence.

This is deliberately a `REVIEW`, not a `FAIL`. Text heuristics cannot prove that a candidate belongs to the success criterion, whether two differently labelled controls are semantically the same mechanism, or whether a contextual exception applies. Site Audit sampling also does not prove that every page on the site has been evaluated.

## Static and structural rule set

| FocusTrace rule | Outcome | Source |
| --- | --- | --- |
| FT-WCAG-001 HTML page has a non-empty title | FAIL/PASS | WCAG 2.4.2 · ACT 2779a5 |
| FT-WCAG-002 Image has an accessible name or is decorative | FAIL/PASS | WCAG 1.1.1 · ACT 23a2a8 |
| FT-WCAG-003 Button has a non-empty accessible name | FAIL/PASS | WCAG 4.1.2 · ACT 97a4e1 |
| FT-WCAG-004 Form field has a non-empty accessible name | FAIL/PASS | WCAG 4.1.2 · ACT e086e5 |
| FT-WCAG-005 Link has a non-empty accessible name | FAIL/PASS | WCAG 4.1.2 / 2.4.4 · ACT c487ae |
| FT-WCAG-006 aria-hidden content contains sequentially focusable content | FAIL/PASS | WCAG 4.1.2 · ACT 6cfa84 |
| FT-WCAG-007 Visible label is part of accessible name | FAIL/PASS | WCAG 2.5.3 · ACT 2ee8b8 |
| FT-WCAG-008 HTML page has a non-empty lang attribute | FAIL/PASS | WCAG 3.1.1 · ACT b5c3f8 |
| FT-WCAG-009 Page lang has a known primary language tag | FAIL/PASS | WCAG 3.1.1 · ACT bf051a · IANA |
| FT-WCAG-010 Text color contrast | FAIL/REVIEW/PASS | WCAG 1.4.3 AA |
| FT-WCAG-011 Required non-text visual information has sufficient contrast | FAIL/REVIEW/PASS | WCAG 1.4.11 AA |
| FT-WCAG-012 Pointer target size and spacing | REVIEW/PASS | WCAG 2.5.8 AA |
| FT-WARN-001 Deprecated ARIA role | WARNING/PASS | WAI-ARIA registry |
| FT-WARN-002 Deprecated ARIA property for role | WARNING/PASS | WAI-ARIA registry |
| FT-WARN-003 Prohibited ARIA property for role | WARNING/PASS | WAI-ARIA registry |
| FT-WARN-004 Duplicate HTML id | WARNING/PASS | HTML Living Standard |
| FT-WARN-005 Entirely obsolete HTML element | WARNING | HTML Living Standard |
| FT-WARN-006 Obsolete non-conforming HTML attribute | WARNING | HTML Living Standard |
| FT-WARN-007 Obsolete-but-conforming HTML feature | WARNING | HTML Living Standard |
| FT-WARN-008 Element outside required native parent/ancestor context | WARNING | HTML Living Standard |
| FT-WARN-009 Native HTML content-model/group/order violation | WARNING | HTML Living Standard |
| FT-WARN-010 Conflicting nested interactive/label structure | WARNING | HTML Living Standard |
| FT-WARN-011 Invalid native main hierarchy | WARNING | HTML Living Standard |
| FT-WARN-012 Unresolvable/abstract explicit ARIA role | WARNING | WAI-ARIA 1.3 |
| FT-WARN-013 Unknown aria-* attribute | WARNING | WAI-ARIA registry |
| FT-WARN-014 Invalid deterministic ARIA value | WARNING | WAI-ARIA 1.3 |
| FT-WARN-015 Missing required ARIA state/property | WARNING | WAI-ARIA registry |
| FT-WARN-016 Invalid ARIA ID/ownership/active-descendant relationship | WARNING | WAI-ARIA 1.3 |
| FT-WARN-017 Missing required accessibility parent role | WARNING | WAI-ARIA 1.3 |
| FT-WARN-018 Incompatible accessibility child role | WARNING | WAI-ARIA 1.3 |
| FT-WARN-019 Internally inconsistent ARIA range/set state | WARNING | WAI-ARIA 1.3 |
| FT-WARN-020 ARIA state/property unsupported by resolved role | WARNING | WAI-ARIA 1.3 |
| FT-WARN-021 ARIA relationship and exposed state are inconsistent | WARNING | WAI-ARIA 1.3 |
| FT-REVIEW-001 Positive tabindex | REVIEW | WCAG 2.4.3 |
| FT-REVIEW-002 Heading-level jump | REVIEW | WCAG 1.3.1 / 2.4.6 |
| FT-REVIEW-003 Placeholder-only form label | REVIEW | WCAG 3.3.2 |
| FT-REVIEW-004 Missing primary main landmark | REVIEW/PASS | HTML Living Standard · WAI-ARIA APG |
| FT-REVIEW-005 Multiple exposed main landmarks | REVIEW/PASS | HTML Living Standard · WAI-ARIA APG |
| FT-REVIEW-006 Button-like custom interaction | REVIEW | HTML Living Standard · WAI-ARIA APG |
| FT-REVIEW-007 Link-like custom interaction | REVIEW | HTML Living Standard · WAI-ARIA APG |
| FT-REVIEW-008 Ambiguous generic interaction | REVIEW | WAI-ARIA APG |
| FT-REVIEW-009 Unidentified section/article structure | REVIEW | HTML Living Standard |
| FT-REVIEW-010 Repeated landmarks without distinguishable names | REVIEW | WAI-ARIA APG |
| FT-REVIEW-011 Repeated help mechanisms change relative order across sampled pages | REVIEW | WCAG 3.2.6 |

## Runtime rules

| FocusTrace rule | Outcome | Source |
| --- | --- | --- |
| FT-RUNTIME-001 Focused element removed | REVIEW | WCAG 2.4.3 |
| FT-RUNTIME-002 Focus may be completely obscured | REVIEW | WCAG 2.4.11 |
| FT-RUNTIME-003 SPA route changed without title change | REVIEW | WCAG 2.4.2 |
| FT-RUNTIME-004 SPA route changed without moving focus | REVIEW | WCAG 2.4.3 |
| FT-RUNTIME-005 Focused element became hidden | REVIEW | WCAG 2.4.3 / 4.1.2 |
| FT-RUNTIME-006 Dragging interaction observed | REVIEW | WCAG 2.5.7 |
| FT-APG-001 Dialog initial focus remains outside | REVIEW | WAI-ARIA APG Dialog Modal |
| FT-APG-002 Focus escapes modal dialog | REVIEW | WAI-ARIA APG Dialog Modal |
| FT-APG-003 Focus not restored after dialog close | REVIEW | WAI-ARIA APG Dialog Modal |

## Known limitations

- FocusTrace implements a targeted subset of the complete AccName algorithm, not a user-agent-level reimplementation.
- CSS-generated content, slots/Shadow DOM, complex embedded-control recursion and cross-origin iframe traversal are not fully covered.
- `FT-WCAG-007` currently covers ACT `2ee8b8` text-content cases only.
- `FT-WCAG-009` checks the ACT primary-language expectation, not full BCP 47 syntax/semantics.
- `FT-WCAG-010` covers DOM text with deterministically resolvable computed foreground/background colors. Images of text, pseudo-element text and complex visual composition remain outside deterministic FAIL coverage.
- `FT-WCAG-011` does not programmatically exercise every hover, pressed, checked or focus state. Multi-color graphics, CSS pseudo-element icons, complex shadows, images/canvas and contextual “required visual information” decisions remain REVIEW/manual territory.
- `FT-WCAG-012` uses observable DOM/layout geometry and conservative target discovery. Equivalent, essential and user-agent-control exceptions, arbitrary framework-only pointer listeners and complex non-rectangular hit areas can still require manual review; the rule therefore does not currently emit automatic FAIL solely from undersized/overlapping geometry.
- `FT-RUNTIME-002` uses bounded viewport hit-testing of the observed focused element; it is not a rendering-engine proof of every possible overlap/compositing case.
- `FT-RUNTIME-006` recognizes observed drag interaction signals but does not automatically prove whether an equivalent non-dragging operation or an essential-dragging exception exists.
- `FT-REVIEW-011` uses bounded, text-based help-mechanism candidates over Site Audit samples and therefore cannot establish full WCAG 3.2.6 applicability or site-wide conformance.
- Structural HTML checks operate on the parsed live DOM. Browser parser repair can normalize invalid source before FocusTrace runs; the tool does not infer source-level errors that are no longer observable. See [`STRUCTURAL_HTML.md`](STRUCTURAL_HTML.md).
- Advanced ARIA checks operate on the live accessibility relationships FocusTrace can derive from DOM semantics and `aria-owns`; they do not claim to reproduce the browser accessibility tree or a screen reader's spoken output. See [`ARIA_VALIDATION.md`](ARIA_VALIDATION.md).
- Automated static checks are intentionally narrower than the corresponding full WCAG success criteria.
- Runtime findings are evidence from the observed interaction, not proof that every possible path was exercised.