# FocusTrace rule methodology

FocusTrace implements its own local analysis engine and maps each rule to the standards source that justifies the expectation.

The public, bilingual capability inventory lives in [`README.md`](../README.md) and [`README.es.md`](../README.es.md). Keep this methodology document and those catalogs aligned whenever rule behavior or applicability changes.

## Sources

1. **WCAG 2.2** is the conformance standard and normative source for success criteria.
2. **W3C ACT Rules** make applicability, expectations and outcome mapping explicit where available.
3. **WAI-ARIA** supplies role/state/property semantics. The automated registry currently follows the public ARIA 1.3 Editor Draft; findings sourced only from this registry are authoring warnings, not direct WCAG failures.
4. **WAI-ARIA APG** is used for runtime widget patterns and authoring guidance such as modal-dialog focus behavior, landmark structure and preferring native HTML semantics. It remains informative guidance.
5. **AccName** and **HTML-AAM** guide accessible-name precedence and host-language fallbacks.
6. **IANA Language Subtag Registry** supplies the primary language subtags used by the ACT rules behind `FT-WCAG-009` and `FT-WCAG-013`.
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

## Language of Parts scope

`FT-WCAG-013` implements a conservative observable subset of ACT `de46e4` for WCAG 3.1.2 Language of Parts. It evaluates explicit, non-empty `lang` attributes on HTML descendants of `body` when non-whitespace human DOM text inherits its programmatic language from that element.

The rule uses the same committed IANA primary-language registry as `FT-WCAG-009`. A known primary language subtag records `PASS`; an unknown, malformed or whitespace-only primary value records deterministic `FAIL`. Later subtags are intentionally ignored by this expectation, matching the ACT known-primary-language model.

Applicability is deliberately bounded to avoid manufacturing failures from authoring uses that are not human-language declarations. FocusTrace excludes `code`, `pre`, `samp`, `kbd` and `var` contexts because ACT explicitly notes programming-language labels as an assumption risk. It also excludes `script`, `style`, `template` and `noscript` source text, empty `lang` values, nested text whose own element overrides `lang`, and content removed from rendering through `hidden`, `display:none` or hidden/collapsed visibility. Visible text remains applicable even when an ancestor uses `aria-hidden="true"`, because visual human-language content can still require a valid declared language.

This is intentionally narrower than the complete ACT input model: the current detector does not traverse Shadow DOM/slot flat-tree composition and does not treat accessible-name-only strings such as an image `alt` as applicable text for this rule. It also does not use language identification or NLP to infer that an unmarked phrase appears to be in another language. Therefore `PASS` means only that the explicit `lang` declarations evaluated by this subset use known primary language tags; it is not proof that every language change required by WCAG 3.1.2 has been marked.

The rule is page-only. Component-scoped analysis does not execute `FT-WCAG-013`, because the implementation is maintained as a document-level explicit-language check and its coverage contract is reported once per full-page scan.

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

## Text Spacing inline-important review scope

`FT-REVIEW-016` implements the three current ACT subsets for WCAG 1.4.12 that test author-locked inline spacing: ACT `24afc2` for `letter-spacing`, `78fd32` for `line-height` and `9e45ec` for `word-spacing`. The rule runs in normal page and component analysis and never mutates the tested page merely to create a finding.

Applicability is intentionally narrow. FocusTrace considers only rendered human-language direct text nodes whose own HTML element declares the relevant property in its inline `style` with `!important`. `inherit`, `unset`, `revert` and `revert-layer` are excluded rather than treating inherited values as author-locked. Code-like contexts (`code`, `pre`, `samp`, `kbd`, `var`), hidden/transparent/clipped text and text positioned outside the reachable document area are also excluded. Styled SVG/non-HTML nodes are not coerced into this HTML-specific subset.

The thresholds mirror the ACT expectations: `letter-spacing` must reach at least `0.12 × font-size`, `word-spacing` at least `0.16 × font-size`, and `line-height` at least `1.5 × font-size`. The line-height subset is applicable only when the same direct text node exposes a real soft wrap across more than one rendered line; an authored `<br>` or preserved source newline is not used as proof of wrapping. Each finding carries only WCAG 1.4.12 plus the ACT rule for the property that produced the evidence.

A below-threshold observation remains `REVIEW`, never automatic `FAIL`. The ACT assumptions explicitly allow that a page may provide its own mechanism for adjusting text spacing, and language/script applicability still requires context. A `PASS` means only that the tested inline-important declaration met its property threshold; it does not prove complete 1.4.12 conformance.

FocusTrace does not currently automate the paragraph-spacing requirement (`2 × font-size`) or the complete requirement to apply all four spacing values together without loss of content or functionality. The remediation therefore instructs reviewers to perform that combined manual check. These boundaries deliberately favor false negatives over claiming that a syntactic spacing lock proves the whole WCAG criterion.

## Prerecorded media review scope

`FT-REVIEW-017` provides conservative observable evidence for WCAG 1.2.1 Audio-only and Video-only (Prerecorded), limited to the native audio-only subset that FocusTrace can inspect responsibly. It evaluates native `<audio>` elements only when the media looks prerecorded from finite-duration or inspectable non-stream source evidence. A bounded `PASS` is recorded when local markup exposes a candidate equivalent alternative through a non-empty `aria-describedby` or `aria-details` target, a native captions track, or a nearby transcript-like link or disclosure. A `REVIEW` is emitted when none of those candidate signals is observable.

That `PASS` proves only that a candidate alternative is present. FocusTrace does not compare the recording with the candidate text and therefore cannot establish information equivalence. The current detector deliberately does not claim coverage of the video-only branch of WCAG 1.2.1 because browser APIs do not reliably expose whether arbitrary video content truly has no audio track.

`FT-REVIEW-018` provides conservative observable evidence for WCAG 1.2.2 Captions (Prerecorded), with ACT `f51b46` traceability for the native-video auditory-content/captions expectation. It evaluates likely prerecorded native `<video>` elements. When the browser exposes `audioTracks` and proves that there are zero audio tracks, the criterion is treated as inapplicable for that video. When an observable captions track exists, FocusTrace records a bounded `PASS`; a `subtitles` track by itself is not treated as proof of captions.

When no captions track is observable, the result is `REVIEW`, never automatic `FAIL`. Auditory content may be unknown, captions may be burned into the picture, or a custom player may provide caption support without a native `<track kind="captions">`. Even when a native captions track is present, FocusTrace does not verify caption synchronization, accuracy or completeness.

Both media rules skip clear live/stream signals such as infinite duration, an attached `srcObject`, stream/blob-only sources and streaming-playlist-only URLs. These exclusions deliberately prefer false negatives over claiming prerecorded applicability from weak evidence. Full media equivalence, custom-player behavior, captions embedded in video pixels, and alternatives located elsewhere in an application remain manual territory.

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
- trusted setting-change event type and target identity, never the control value;
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

## Focus Visible runtime scope

`FT-RUNTIME-010` provides conservative runtime review evidence for WCAG 2.4.7 Focus Visible, informed by ACT `oj04fd`. It runs only during manual Trace after a trusted real `Tab` or `Shift+Tab` transition; Focus Walk is deliberately excluded because programmatic `element.focus()` does not reliably reproduce keyboard `:focus-visible` modality.

For an adjacent sequential-focus candidate, FocusTrace first requires a stable non-focused baseline and later waits one second while the same target remains focused. It captures two lossless PNG viewport samples in each state, maps the target plus a bounded 32 CSS px margin to screenshot device pixels, and compares only that local region. Viewport size, scroll position and capture dimensions must stay unchanged, and any instability within either sample pair makes the observation inconclusive.

A review is emitted only when the local crop is stable and unchanged between the non-focused and focused states. Any stable pixel change suppresses the review. The screenshots are ephemeral working data used only for the comparison and are not persisted to the session, Memory, reports or exports.

The outcome is always `REVIEW`, never automatic `FAIL`. ACT `oj04fd` permits a visible focus indication to appear elsewhere in the viewport, while this detector intentionally bounds comparison around the focused target to avoid broad-page animation noise. The implementation therefore prefers false negatives over claiming that an unchanged local crop proves the whole WCAG criterion has failed.

## Dragging Movements runtime scope

`FT-RUNTIME-006` provides observed runtime evidence for WCAG 2.5.7 Dragging Movements. Trace watches likely drag-capable targets and records a review only after an observed pointer path exceeds the small movement threshold used to distinguish dragging from click/tap jitter.

The runtime event stores the target plus a compact movement-distance summary; it does not persist the raw pointer path. Native browser `dragstart` alone does not emit this review. The outcome is always `REVIEW`, because observing a drag does not prove that the functionality requires dragging: an equivalent single-pointer operation may be available elsewhere, and the WCAG exception for essential dragging still requires context.

## Status Messages runtime scope

`FT-RUNTIME-007` provides conservative observed runtime evidence for WCAG 4.1.3 Status Messages. The criterion applies to content changes that communicate action results, waiting states, progress or the existence of errors without constituting a change of context. FocusTrace therefore does not treat every DOM update as a status message.

The review is evaluated only while **Trace** is recording and is correlated to a recent real activation (`click`, Enter or Space) through the existing `interactionId`. Candidate content is stabilized briefly before evaluation and must be a short rendered text message with observable status-oriented structure or a bounded EN/ES status-text signal.

FocusTrace suppresses the review when observable evidence already indicates programmatic exposure, including `role="status"`, `role="alert"`, `role="log"`, progress semantics, active `aria-live` or an active `aria-errormessage` relationship. `aria-busy="true"` alone is not treated as sufficient status-message exposure: it can indicate that a region is being updated, but it does not by itself identify the status message or provide its semantics. Dialogs, modeled widget-state containers and interactive containers are excluded so WCAG 4.1.3 is not conflated with context changes or WCAG 4.1.2 widget state.

A candidate is also discarded when it receives focus or Trace observes a subsequent focus transition, route change or dialog opening inside the stabilization/correlation window. This reflects the WCAG definition: a message that changes context falls outside the status-message requirement.

The result is always `REVIEW`, never automatic `FAIL`. FocusTrace can observe status-like content and missing common exposure mechanisms, but it cannot deterministically prove from DOM text alone that the content is a WCAG status message or exhaust every equivalent accessibility-tree mechanism. The current subset is intentionally limited to short visible text and EN/ES lexical/structural signals; non-text-only status, arbitrary natural language, disappearance-only state and exact screen-reader announcement remain manual territory.

## On Focus and On Input runtime context-change scope

`FT-RUNTIME-008` provides conservative runtime review evidence for WCAG 3.2.1 On Focus. When a component receives focus, FocusTrace watches a bounded 1.2-second correlation window for an observed SPA route change, dialog opening or programmatic DOM-focus move. A separate observed activation or a new user action clears the pending focus attribution, and ordinary sequential focus movement is not reinterpreted as a context change caused by the previous component.

`FT-RUNTIME-009` provides the corresponding runtime review evidence for WCAG 3.2.2 On Input. A trusted `input` or `change` event on a setting control can become the trigger for a later observed route change, dialog opening or programmatic focus move inside the same bounded window. The setting-change event records only the compact control identity and event type; FocusTrace does not read or persist the control value for this rule.

Both rules remain `REVIEW`. For 3.2.1, observed ordering does not by itself prove which author handler caused the context change. For 3.2.2, the criterion allows an automatic context change when the user was advised before using the control, and that prior advice cannot always be established from runtime evidence alone. Explicit user activation is therefore not presented as a violation of either rule.

## Consistent Help Site Audit scope

`FT-REVIEW-011` provides multipage review evidence for WCAG 3.2.6 Consistent Help. During the existing Site Audit structure collection, FocusTrace identifies a bounded set of candidate help mechanisms using observable link/control text and href patterns. Candidates are grouped into four categories: human contact details, human contact mechanisms, self-help options and automated contact mechanisms.

FocusTrace compares the relative order only when at least two of the same observed categories occur on both sampled pages. A single shared mechanism is never enough to emit the review. When a mismatch is observed, the report keeps the compared page URL and both observed orders as evidence.

This is deliberately a `REVIEW`, not a `FAIL`. Text heuristics cannot prove that a candidate belongs to the success criterion, whether two differently labelled controls are semantically the same mechanism, or whether a contextual exception applies. Site Audit sampling also does not prove that every page on the site has been evaluated.

## Consistent Navigation Site Audit scope

`FT-REVIEW-013` provides conservative multipage review evidence for WCAG 3.2.3 Consistent Navigation. Site Audit collects rendered native `nav` and `role="navigation"` landmarks and records the ordered HTTP(S) destinations exposed by each candidate.

FocusTrace intentionally uses a high-confidence identity rule before comparing order. A candidate must expose at least three unique destinations. Two navigation blocks are considered the same repeated mechanism only when their complete normalized destination sets match exactly. If that exact set appears more than once on either page, the pairing is ambiguous and FocusTrace does not compare it. Blocks with only partial destination overlap are also ignored.

Only after that identity check does FocusTrace compare relative destination order. A changed order emits `REVIEW` with both page URLs and both observed orders as evidence. It never becomes automatic `FAIL`: WCAG 3.2.3 allows changes initiated by the user, Site Audit cannot always prove personalization or interaction history, and representative samples do not prove site-wide behavior. The rule deliberately prefers false negatives over guessing that two similar menus are the same mechanism.

## Consistent Identification Site Audit scope

`FT-REVIEW-015` provides conservative multipage review evidence for WCAG 3.2.4 Consistent Identification. The current subset is deliberately restricted to rendered native HTTP(S) links because an exact destination is one of the few browser-observable signals that can anchor repeated link functionality without guessing from icon shape, nearby copy or similar labels.

Before FocusTrace compares identification, the exact destination (including path, query and fragment) must occur only once on each sampled page, both pages must declare the same non-empty primary `html[lang]`, and both candidates must expose their identification through the same observed source (`aria-label`, `aria-labelledby`, DOM text, a single image `alt`, or `title`). If the destination is duplicated on either page—for example a logo and a footer link to the same URL—the correspondence is ambiguous and no review is emitted.

Names are normalized only to suppress clearly compatible variants: case/diacritics are ignored, numeric values are replaced by a placeholder, and shared functional vocabulary prevents a review for cases such as `Cart` versus `View cart`. This also keeps number-only variations such as `Go to page 4` and `Go to page 5` quiet; WCAG 3.2.4 requires consistent identification, not byte-identical wording. A review is emitted only when the same strongly anchored link function has substantially divergent observed identification.

The result is always `REVIEW`, never automatic `FAIL`. The same URL is strong evidence of repeated link purpose but does not prove that scripts, page context or application state make the complete functionality identical, and lexical comparison cannot determine every synonym or semantically equivalent label. The Site Audit collector also uses a bounded DOM naming approximation for this cross-page comparison rather than claiming to reproduce the full AccName algorithm. Buttons, custom controls, framework-only actions and functions without a stable exact link destination are intentionally outside this first subset. These boundaries prefer false negatives over noisy WCAG findings.

## Identify Input Purpose autocomplete review scope

`FT-REVIEW-014` provides conservative static review evidence for WCAG 1.3.5 Identify Input Purpose and the observable HTML `autocomplete` subset described by ACT `73f2c2`.

FocusTrace evaluates only rendered, applicable `input`, `select` and `textarea` controls that already expose a non-empty `autocomplete` attribute and visibly use the standard HTML autocomplete vocabulary. It checks the standard token order: optional `section-*`, optional `shipping`/`billing`, optional contact hint, required field token and optional trailing `webauthn`. A valid standard token sequence records `PASS` for this tested expectation. A malformed standard-like sequence records `REVIEW`, never automatic `FAIL`.

The detector deliberately does **not** infer a required input purpose from `name`, label text, `placeholder`, input type or surrounding copy. It also ignores values composed only of unknown tokens, because ACT explicitly notes that a custom taxonomy can still make purpose programmatically determinable even when it does not match the HTML autocomplete vocabulary. `autocomplete="on"`, `autocomplete="off"`, disabled controls, fixed-value input types and hidden/inapplicable controls are excluded.

The rule remains contextual because WCAG 1.3.5 applies to fields that collect information about the user. The live DOM cannot always prove that semantic fact. FocusTrace therefore prefers missing a questionable case over turning a syntactic signal into a false WCAG failure.

## Bypass Blocks keyboard review scope

`FT-REVIEW-012` provides conservative page-level review evidence for WCAG 2.4.1 Bypass Blocks. It does not search for a literal label such as “Skip to content”. Instead, FocusTrace looks for an exposed primary `main` landmark, a substantial navigation landmark before that main content, and an early sequentially focusable same-document fragment link whose target resolves to the main landmark or to content inside it.

A validated fragment bypass records `PASS` for this tested expectation. When a substantial pre-main navigation block is observed but no such validated link is found, FocusTrace emits `REVIEW`, not `FAIL`, because WCAG 2.4.1 can be satisfied by other mechanisms that cannot be proved from this single DOM pattern. A likely bypass link whose fragment target is missing is also reported for review with the broken target as evidence.

The rule is full-page only. Component-scoped analysis does not execute `FT-REVIEW-012`, because repeated-block bypass behavior depends on document-level order and page context.

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
| FT-WCAG-013 Declared content lang has a known primary language tag | FAIL/PASS | WCAG 3.1.2 AA · ACT de46e4 · IANA |
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
| FT-REVIEW-012 Missing or broken keyboard bypass candidate before repeated navigation | REVIEW/PASS | WCAG 2.4.1 A |
| FT-REVIEW-013 Exact repeated navigation destination set changes relative order across sampled pages | REVIEW | WCAG 3.2.3 AA |
| FT-REVIEW-014 Standard autocomplete purpose token sequence may be malformed | REVIEW/PASS | WCAG 1.3.5 AA · ACT 73f2c2 |
| FT-REVIEW-015 Exact unique link function may have substantially inconsistent identification across sampled pages | REVIEW | WCAG 3.2.4 AA |
| FT-REVIEW-016 Inline important text spacing may block required user adjustments | REVIEW/PASS | WCAG 1.4.12 AA · ACT 24afc2 / 78fd32 / 9e45ec |
| FT-REVIEW-017 Prerecorded audio may lack an observable equivalent alternative | REVIEW/PASS | WCAG 1.2.1 A |
| FT-REVIEW-018 Prerecorded video may lack observable captions | REVIEW/PASS | WCAG 1.2.2 A · ACT f51b46 |

## Runtime rules

| FocusTrace rule | Outcome | Source |
| --- | --- | --- |
| FT-RUNTIME-001 Focused element removed | REVIEW | WCAG 2.4.3 |
| FT-RUNTIME-002 Focus may be completely obscured | REVIEW | WCAG 2.4.11 |
| FT-RUNTIME-003 SPA route changed without title change | REVIEW | WCAG 2.4.2 |
| FT-RUNTIME-004 SPA route changed without moving focus | REVIEW | WCAG 2.4.3 |
| FT-RUNTIME-005 Focused element became hidden | REVIEW | WCAG 2.4.3 / 4.1.2 |
| FT-RUNTIME-006 Dragging interaction observed | REVIEW | WCAG 2.5.7 |
| FT-RUNTIME-007 Status-like message may not be programmatically exposed | REVIEW | WCAG 4.1.3 |
| FT-RUNTIME-008 Receiving focus may initiate a context change | REVIEW | WCAG 3.2.1 |
| FT-RUNTIME-009 Changing a control may initiate a context change | REVIEW | WCAG 3.2.2 |
| FT-RUNTIME-010 Keyboard focus may have no visible local change | REVIEW | WCAG 2.4.7 AA · ACT oj04fd |
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
- `FT-WCAG-013` validates only explicit `lang` declarations with inheriting rendered human DOM text. It does not infer missing language changes, traverse Shadow DOM/slot flat-tree text, or currently include accessible-name-only strings such as image `alt`; those gaps intentionally prevent PASS from being interpreted as complete WCAG 3.1.2 conformance.
- `FT-RUNTIME-002` uses bounded viewport hit-testing of the observed focused element; it is not a rendering-engine proof of every possible overlap/compositing case.
- `FT-RUNTIME-006` recognizes observed drag interaction signals but does not automatically prove whether an equivalent non-dragging operation or an essential-dragging exception exists.
- `FT-RUNTIME-007` reviews only short visible EN/ES status-like text with observable structural signals after real activation. It cannot prove the meaning of every message, non-text-only status, disappearance-only state, equivalent accessibility-tree exposure or actual screen-reader announcement.
- `FT-RUNTIME-008` and `FT-RUNTIME-009` correlate only observed focus/input events with route, dialog and DOM-focus changes inside a bounded window. They cannot prove author-handler causation, and `FT-RUNTIME-009` cannot always establish whether prior user advice satisfies WCAG 3.2.2.
- `FT-RUNTIME-010` observes only trusted manual Tab focus transitions with a stable local pixel comparison. A visible focus cue outside the bounded target region, viewport/capture instability or non-Tab focus paths can remain outside this detector, so absence of a review is not proof of complete WCAG 2.4.7 conformance.
- `FT-REVIEW-011` uses bounded, text-based help-mechanism candidates over Site Audit samples and therefore cannot establish full WCAG 3.2.6 applicability or site-wide conformance.
- `FT-REVIEW-012` validates only the observable keyboard fragment-bypass pattern around substantial pre-main navigation; other WCAG 2.4.1 bypass mechanisms and repeated-block applicability still require manual context.
- `FT-REVIEW-013` requires an exact repeated destination-set match and ignores partial/ambiguous navigation matches; it therefore favors false negatives, and Site Audit cannot prove whether an observed order change was initiated by the user.
- `FT-REVIEW-014` validates only explicit standard-like `autocomplete` token sequences. It does not infer missing input-purpose metadata, judge unknown-only custom taxonomies, or prove that a field collects information about the user; those boundaries intentionally favor false negatives over false WCAG failures.
- `FT-REVIEW-015` currently compares only unique rendered native HTTP(S) links with the same exact destination, same declared primary page language and same bounded observed naming source. It deliberately ignores duplicated destinations, buttons/custom controls, unknown-language pages and semantically uncertain label variations, so it favors false negatives over noisy 3.2.4 reviews.
- `FT-REVIEW-016` covers only the three inline-`!important` ACT subsets for letter spacing, word spacing and wrapped-text line height. It does not automate paragraph spacing, all-language/script applicability, page-provided spacing controls, Shadow DOM/pseudo-generated text or the combined no-loss-of-content/functionality judgement required by the full WCAG 1.4.12 criterion.
- `FT-REVIEW-017` covers only likely prerecorded native audio-only evidence. It does not prove that candidate alternative content is equivalent, does not claim the video-only branch of WCAG 1.2.1, and can miss custom or application-level alternatives outside the local media markup.
- `FT-REVIEW-018` observes native/runtime captions tracks and uses browser `audioTracks` only when available. It does not detect burned-in captions or arbitrary custom-player caption systems, does not verify caption synchronization/accuracy/completeness, and may keep audio applicability as unknown.
- Structural HTML checks operate on the parsed live DOM. Browser parser repair can normalize invalid source before FocusTrace runs; the tool does not infer source-level errors that are no longer observable. See [`STRUCTURAL_HTML.md`](STRUCTURAL_HTML.md).
- Advanced ARIA checks operate on the live accessibility relationships FocusTrace can derive from DOM semantics and `aria-owns`; they do not claim to reproduce the browser accessibility tree or a screen reader's spoken output. See [`ARIA_VALIDATION.md`](ARIA_VALIDATION.md).
- Automated static checks are intentionally narrower than the corresponding full WCAG success criteria.
- Runtime findings are evidence from the observed interaction, not proof that every possible path was exercised.
