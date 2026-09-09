<p align="right"><strong>English</strong> · <a href="./README.es.md">Español</a></p>

# FocusTrace

**Debug accessibility focus like you debug JavaScript.**

FocusTrace is a local-first browser extension with its own WCAG 2.2 rule engine and a runtime debugger for keyboard focus, SPA navigation and dynamic UI behavior.

The project is in active development. Automated results are intentionally separated into deterministic failures, contextual review signals and authoring warnings so the extension does not claim certainty it cannot support.

FocusTrace is free software licensed under **GNU GPL v3.0 only**. The source-code license and the FocusTrace project identity are intentionally separate; see [License and project identity](#license-and-project-identity).

## Install

FocusTrace is available from the official Chrome Web Store:

- [Install FocusTrace from the Chrome Web Store](https://chromewebstore.google.com/detail/focustrace/efmfklamjafbknbmadpfmlbhobnoffnn)

The store listing may temporarily show an earlier version while a newer release is under review.

## Functional capability API

This section is the canonical functional inventory of FocusTrace: what the extension can analyze, observe, detect, retain and export, and what kind of evidence each capability produces.

FocusTrace uses WCAG 2.2 as its conformance source. WCAG 2.2 criteria are also reflected in the web requirements of EN 301 549 V4.1.1, but FocusTrace implements only explicitly documented observable subsets and **does not constitute complete EN 301 549 evaluation, certification or proof of conformance**.

### Result types

| Result | Meaning |
| --- | --- |
| **FAIL** | Measured evidence is sufficient to determine that the tested automated expectation is not met. |
| **REVIEW** | A relevant signal exists, but deciding whether it is an accessibility problem requires human context. |
| **WARNING** | An HTML/ARIA authoring or standards-maintenance risk should be fixed or reviewed without automatically treating it as a WCAG failure. |
| **PASS** | The specific expectation tested by the rule is met. It does not imply complete conformance with the linked WCAG criterion. |

### Core capabilities

| Capability | Input / scope | What it does | Evidence / output |
| --- | --- | --- | --- |
| **Full-page analysis** | Active document | Runs the local rule engine and prepares the bounded Structure snapshot for the current page. | FAIL, REVIEW, WARNING and PASS plus Headings, Semantics and Metrics evidence. |
| **Component analysis** | Visually selected DOM subtree | Runs the same engine within the selected component while preserving document-wide context when a rule needs it. | Findings limited to the selected scope. |
| **Inspect finding** | Current finding | Locates and highlights the target when it still exists on the page. | Selector, target element and visual highlight. |
| **Accessible name** | Supported controls | Computes the accessible name and records the winning source. | Role, computed name, source and inspected candidates. |
| **Text contrast** | Rendered text with resolvable colors | Calculates ratio, required threshold, foreground/background, font size and weight. | Structured evidence reusable by UI and reports. |
| **Non-text contrast** | Observable boundaries, states, graphics or focus cues | Evaluates deterministic signals and keeps ambiguous visual composition as REVIEW. | Ratio, signal kind and visual context. |
| **Pointer target size** | Observable rendered pointer targets | Measures target geometry and WCAG 2.5.8 spacing while preserving contextual exceptions as REVIEW. | CSS-pixel size, neighboring target and pass/review rationale. |
| **Color suggestion** | Deterministic contrast failure | Suggests a small sRGB adjustment that reaches the required ratio when it can be computed safely. | Measured HEX/RGB, suggestion and copy action. |
| **How to fix** | Findings with remediation guidance | Shows concrete remediation strategies and a verification step. | Localized EN/ES guidance. |
| **Structure** | Current full-page analysis | Exposes headings, semantic review and structural metrics prepared with the page scan; Refresh recalculates them after page changes. | H1-H6 outline, suggestions and counts. |
| **Trace** | Real interaction | Records keyboard/pointer input, focus, non-sensitive setting-change events, relevant mutations, SPA routes, dialogs, status-message candidates, ARIA widgets and causal/context-change evidence. | Events correlated by interaction; control values are not retained by context-change tracking. |
| **Virtual focus** | Compatible `aria-activedescendant` widgets | Records valid virtual-focus changes as informational evidence without treating them as DOM focus movement or a finding. | Virtual destination available in Trace, Journey and Graph. |
| **Focus Walk** | Active page | Automates sequential focus traversal to build navigation evidence. | Journey of reachable focus targets. |
| **Replay** | Recorded Trace session | Reconstructs evidence read-only without replaying actions against the page. | Runtime sequence. |
| **Journey** | Trace session | Orders observed focus movement chronologically. | Navigable focus story. |
| **Graph** | Trace session | Represents observed connections between focus targets. | Focus-navigation graph. |
| **Accessibility breakpoints** | Trace | Can pause recording after selected deterministic runtime causes are captured. | Breakpoint tied to captured evidence. |
| **Site Audit** | Same-origin site | Discovers, groups and samples representative pages using the real scanner. | Findings by page, route family and template. |
| **FocusTrace Memory** | Repeated scans, opt-in | Keeps bounded local history for persistence, changes, resolutions and regressions. | Observations, locator and optional preview. |
| **Report** | Available static/runtime evidence | Consolidates analysis, runtime stories and already-generated Structure data. | Report view and exports. |
| **PDF / TXT / Markdown** | Current report | Exports available evidence without silently rerunning a full DOM collection. | Shareable artifacts. |

### Static WCAG rules

| ID | Detects / checks | Result | Reference |
| --- | --- | --- | --- |
| `FT-WCAG-001` | HTML page has a non-empty title. | FAIL / PASS | WCAG 2.4.2 · ACT 2779a5 |
| `FT-WCAG-002` | Images have an accessible name or are treated as decorative. | FAIL / PASS | WCAG 1.1.1 · ACT 23a2a8 |
| `FT-WCAG-003` | Buttons have a non-empty accessible name. | FAIL / PASS | WCAG 4.1.2 · ACT 97a4e1 |
| `FT-WCAG-004` | Form fields have a non-empty accessible name. | FAIL / PASS | WCAG 4.1.2 · ACT e086e5 |
| `FT-WCAG-005` | Links have a non-empty accessible name. | FAIL / PASS | WCAG 4.1.2 / 2.4.4 · ACT c487ae |
| `FT-WCAG-006` | `aria-hidden="true"` content still contains sequentially focusable elements. | FAIL / PASS | WCAG 4.1.2 · ACT 6cfa84 |
| `FT-WCAG-007` | Visible label is contained in the accessible name. | FAIL / PASS | WCAG 2.5.3 · ACT 2ee8b8 |
| `FT-WCAG-008` | Document has a non-empty `lang` attribute. | FAIL / PASS | WCAG 3.1.1 · ACT b5c3f8 |
| `FT-WCAG-009` | `lang` uses a known primary language subtag. | FAIL / PASS | WCAG 3.1.1 · ACT bf051a · IANA |
| `FT-WCAG-010` | Text reaches the required contrast ratio when foreground/background can be resolved safely. | FAIL / REVIEW / PASS | WCAG 1.4.3 AA |
| `FT-WCAG-011` | Required non-text visual information reaches the required contrast when deterministic evidence exists. | FAIL / REVIEW / PASS | WCAG 1.4.11 AA |
| `FT-WCAG-012` | Pointer targets contain a verifiable 24 × 24 CSS px area or meet an observable spacing/inline exception; unresolved semantic exceptions remain for review. | REVIEW / PASS | WCAG 2.5.8 AA |
| `FT-WCAG-013` | Explicit `lang` values on rendered human-language content use a known primary language subtag. Code-like contexts are excluded. | FAIL / PASS | WCAG 3.1.2 AA · ACT de46e4 · IANA |

`FT-WCAG-013` validates only explicit language declarations on rendered text that inherits the tested `lang`. FocusTrace does not use NLP to infer unmarked language changes, and it excludes code-like contexts such as `code`, `pre`, `samp`, `kbd` and `var` to avoid treating programming-language labels as human-language failures. A PASS therefore means the observed declaration is valid, not that every change of human language on the page has been identified.

### Contextual and structural reviews

| ID | Detects / signals | Result | Reference |
| --- | --- | --- | --- |
| `FT-REVIEW-001` | Positive `tabindex` that can disturb natural focus order. | REVIEW | WCAG 2.4.3 |
| `FT-REVIEW-002` | Heading-level jumps. | REVIEW | WCAG 1.3.1 / 2.4.6 |
| `FT-REVIEW-003` | Field relying on `placeholder` for identification/name. | REVIEW | WCAG 3.3.2 |
| `FT-REVIEW-004` | No visible primary `<main>` / `role="main"` landmark. | REVIEW / PASS | HTML · WAI-ARIA APG |
| `FT-REVIEW-005` | More than one exposed `main` landmark. | REVIEW / PASS | HTML · WAI-ARIA APG |
| `FT-REVIEW-006` | Custom interaction with observable button-like behavior. | REVIEW | HTML · WAI-ARIA APG |
| `FT-REVIEW-007` | Custom interaction with observable link/navigation behavior. | REVIEW | HTML · WAI-ARIA APG |
| `FT-REVIEW-008` | Generic interaction whose purpose cannot be determined safely. | REVIEW | WAI-ARIA APG |
| `FT-REVIEW-009` | Visible `section` / `article` without its own heading or computed accessible name. | REVIEW | HTML |
| `FT-REVIEW-010` | Repeated navigation/search/complementary landmarks without distinguishable names. | REVIEW | WAI-ARIA APG |
| `FT-REVIEW-011` | The same help mechanisms change relative order across sampled pages. | REVIEW | WCAG 3.2.6 |
| `FT-REVIEW-012` | Substantial navigation appears before primary content without a validated early keyboard-focusable fragment link that reaches the main region. | REVIEW / PASS | WCAG 2.4.1 |
| `FT-REVIEW-013` | The exact same repeated navigation destination set changes relative order across sampled pages. | REVIEW | WCAG 3.2.3 AA |
| `FT-REVIEW-014` | A form control uses recognizable standard `autocomplete` purpose vocabulary in a malformed token sequence. Unknown-only/custom taxonomies are deliberately ignored. | REVIEW / PASS | WCAG 1.3.5 AA · ACT 73f2c2 |
| `FT-REVIEW-015` | A uniquely observed native link points to the same exact destination on same-language sampled pages but its identification changes substantially. | REVIEW | WCAG 3.2.4 AA |
| `FT-REVIEW-016` | Rendered direct text is locked by an inline `!important` `letter-spacing`, `word-spacing` or wrapped-text `line-height` below the corresponding ACT threshold. | REVIEW / PASS | WCAG 1.4.12 AA · ACT 24afc2 / 78fd32 / 9e45ec |
| `FT-REVIEW-017` | Likely prerecorded native audio exposes no observable local candidate equivalent alternative; transcript/description candidates suppress the review without claiming equivalence. | REVIEW / PASS | WCAG 1.2.1 A |
| `FT-REVIEW-018` | Likely prerecorded native video exposes no observable captions track; subtitles alone are not treated as captions. | REVIEW / PASS | WCAG 1.2.2 A · ACT f51b46 |
| `FT-REVIEW-019` | An observed invalid or user-invalid field exposes no non-empty text error candidate through `aria-errormessage` or `aria-describedby`; resolved candidates produce bounded PASS evidence only. | REVIEW / PASS | WCAG 3.3.1 A · ACT 36b590 |
| `FT-REVIEW-020` | An invalid field has associated error text plus observable correction-relevant constraint metadata and needs human review of the correction suggestion. | REVIEW | WCAG 3.3.3 AA |
| `FT-REVIEW-021` | Likely prerecorded synchronized native video exposes no observable local media-alternative or audio-description candidate. | REVIEW / PASS | WCAG 1.2.3 A · ACT c5a4ea |
| `FT-REVIEW-022` | Native video with strong live-media evidence exposes no observable captions track. HLS/DASH playlist URLs alone do not establish live status. | REVIEW / PASS | WCAG 1.2.4 AA |
| `FT-REVIEW-023` | Likely prerecorded synchronized native video exposes no native descriptions track or nearby audio-described-version control. | REVIEW / PASS | WCAG 1.2.5 AA · ACT 1ec09b |

For `FT-REVIEW-012`, FocusTrace treats a validated same-document fragment link before the repeated-navigation candidate as a positive signal. A missing link or broken target remains **REVIEW**, not automatic FAIL, because WCAG 2.4.1 permits other mechanisms and repeated-block applicability can require cross-page context.

For `FT-REVIEW-013`, FocusTrace compares only rendered navigation landmarks with at least three unique HTTP(S) destinations. Two blocks are treated as the same repeated mechanism only when their complete destination sets match exactly and that set occurs only once on each page. Partially overlapping or ambiguous duplicated blocks are ignored. A changed order remains **REVIEW**, not FAIL, because the criterion allows user-initiated changes and Site Audit cannot always prove that context.

For `FT-REVIEW-014`, FocusTrace validates only explicit, non-empty `autocomplete` values that visibly use the standard HTML token vocabulary and satisfy the control applicability modeled from ACT 73f2c2. A valid standard token sequence is PASS for this tested expectation; a malformed standard-like sequence is REVIEW, never automatic FAIL. FocusTrace does not infer a required purpose from `name`, label, placeholder or input type, and it deliberately ignores unknown-only values because a custom taxonomy can still provide a programmatically determinable purpose. Whether the field actually collects information about the user remains contextual.

For `FT-REVIEW-015`, FocusTrace uses the exact HTTP(S) link destination only as a strong cross-page function anchor, not as proof that all functionality is identical. The destination must occur once per page, both pages must declare the same primary language, and both names must come from the same observed source. Duplicate destinations, different-language pages and labels that retain clear functional vocabulary are ignored. Numeric-only variation is normalized, so wording such as `Go to page 4` and `Go to page 5` does not create noise. The result remains **REVIEW** because semantic equivalence still needs human confirmation and the Site Audit collector intentionally uses a bounded naming approximation rather than full AccName for this comparison.

For `FT-REVIEW-016`, FocusTrace implements only the three current ACT subsets that test inline `!important` spacing. It reviews below-threshold `letter-spacing` (< `0.12 × font-size`), `word-spacing` (< `0.16 × font-size`) and `line-height` (< `1.5 × font-size`) only when the same direct text node visibly soft-wraps. Inherited CSS-wide values, code-like contexts, hidden/clipped/off-document text and non-HTML styled nodes are excluded. A below-threshold result remains **REVIEW** because a page-provided adjustment mechanism and language/script applicability can still make WCAG 1.4.12 conforming. FocusTrace does not automate paragraph spacing or the final combined no-loss-of-content/functionality judgement.

For `FT-REVIEW-017`, `FT-REVIEW-018`, `FT-REVIEW-021`, `FT-REVIEW-022` and `FT-REVIEW-023`, FocusTrace evaluates only bounded native-media evidence. It does not decode media payloads, transcribe audio or inspect video pixels. A finite duration or an inspectable normal media source can support prerecorded review; `srcObject`, infinite duration or `mediastream:` can support live review. Blob-only media and streaming-playlist-only `.m3u8` / `.mpd` URLs without runtime timing evidence remain **unknown** rather than being guessed as prerecorded or live. Native tracks and nearby alternative controls can provide bounded PASS evidence for the specific observable expectation, but FocusTrace never verifies equivalence, caption/description accuracy or completeness. A transcript-like candidate can suppress the 1.2.3 media-alternative review but does not count as 1.2.5 audio-description evidence. Custom-player tracks, burned-in captions, auditory-content applicability and meaningful-visual-content judgement remain manual. `FT-REVIEW-017` still covers only the native audio-only subset of WCAG 1.2.1.

For `FT-REVIEW-019`, FocusTrace applies only when it observes explicit `aria-invalid` (except `false`) or browser-supported `:user-invalid`. A non-empty `aria-errormessage` or `aria-describedby` target is bounded PASS evidence for association presence only; FocusTrace does not prove that the text completely describes the error or that no visible/application-level message exists elsewhere. `FT-REVIEW-020` runs only when that invalid field already has associated text and exposes a correction-relevant constraint such as `required`, a constrained input type, `pattern`, `min`/`max`, `step` or length bounds. It remains REVIEW because suggestion adequacy and the WCAG security/purpose exception require context. Neither rule reads or stores the field value.

For semantic signals, FocusTrace tries to distinguish function before recommending native HTML: button behavior → prefer `<button type="button">`; navigation → prefer `<a href="…">`; ambiguous interaction → review the intended behavior first. ARIA can be shown as a fallback, but it does not automatically add native keyboard behavior.

### HTML and ARIA authoring warnings

#### Basic ARIA

| ID | Detects | Result | Source |
| --- | --- | --- | --- |
| `FT-WARN-001` | Deprecated ARIA role. | WARNING / PASS | WAI-ARIA |
| `FT-WARN-002` | Deprecated ARIA state/property for the role. | WARNING / PASS | WAI-ARIA |
| `FT-WARN-003` | Prohibited ARIA state/property for the role. | WARNING / PASS | WAI-ARIA |

#### HTML

| ID | Detects | Result | Source |
| --- | --- | --- | --- |
| `FT-WARN-004` | Duplicate non-empty HTML IDs. | WARNING / PASS | HTML Living Standard |
| `FT-WARN-005` | Entirely obsolete HTML elements. | WARNING | HTML Living Standard |
| `FT-WARN-006` | Obsolete non-conforming HTML attributes. | WARNING | HTML Living Standard |
| `FT-WARN-007` | Obsolete-but-conforming HTML features. | WARNING | HTML Living Standard |
| `FT-WARN-008` | Element outside the required native parent/ancestor context. | WARNING | HTML Living Standard |
| `FT-WARN-009` | Native content-model/group/order violation. | WARNING | HTML Living Standard |
| `FT-WARN-010` | Conflicting nested interactive/label structure. | WARNING | HTML Living Standard |
| `FT-WARN-011` | Invalid native `main` hierarchy. | WARNING | HTML Living Standard |

#### Advanced ARIA

| ID | Detects | Result | Source |
| --- | --- | --- | --- |
| `FT-WARN-012` | Explicit role cannot resolve safely or an abstract ARIA role is used. | WARNING | WAI-ARIA 1.3 |
| `FT-WARN-013` | Unknown `aria-*` attribute. | WARNING | WAI-ARIA 1.3 |
| `FT-WARN-014` | Deterministically invalid ARIA value. | WARNING | WAI-ARIA 1.3 |
| `FT-WARN-015` | Required ARIA state/property is missing for the resolved role. | WARNING | WAI-ARIA 1.3 |
| `FT-WARN-016` | Invalid ID reference, `aria-owns` or `aria-activedescendant` relationship. | WARNING | WAI-ARIA 1.3 |
| `FT-WARN-017` | Required accessibility parent role is missing. | WARNING | WAI-ARIA 1.3 |
| `FT-WARN-018` | ARIA container exposes an incompatible accessibility child role. | WARNING | WAI-ARIA 1.3 |
| `FT-WARN-019` | ARIA range, position or set states contradict each other. | WARNING | WAI-ARIA 1.3 |
| `FT-WARN-020` | A known ARIA state/property is not supported by the resolved role. | WARNING | WAI-ARIA 1.3 |
| `FT-WARN-021` | An ARIA relationship resolves, but exposed state contradicts the relationship or related content. | WARNING | WAI-ARIA 1.3 |

FocusTrace resolves observable accessibility relationships and `aria-owns` rather than comparing direct DOM parents only. These warnings identify authoring evidence; a separate WCAG rule must decide when that evidence proves a conformance failure.

### Runtime WCAG rules

Trace stores compact evidence: selector, role, accessible name, tag, relevant changes, route transition, dialog/focus events, dragging summary and bounded keyboard/pointer review signals. It does not store full DOM snapshots or the complete pointer-coordinate trail. Temporary lossless viewport captures used by `FT-RUNTIME-010` are compared in memory and are not retained in Trace, Memory or reports.

| ID | Detects / observes | Result | Reference |
| --- | --- | --- | --- |
| `FT-RUNTIME-001` | Focused element is removed during an interaction. | REVIEW | WCAG 2.4.3 |
| `FT-RUNTIME-002` | Component keeping focus may become completely obscured by other content. | REVIEW | WCAG 2.4.11 |
| `FT-RUNTIME-003` | SPA route changes without updating the document title. | REVIEW | WCAG 2.4.2 |
| `FT-RUNTIME-004` | SPA route changes without moving focus into the new context. | REVIEW | WCAG 2.4.3 |
| `FT-RUNTIME-005` | Element keeping focus becomes hidden during interaction. | REVIEW | WCAG 2.4.3 / 4.1.2 |
| `FT-RUNTIME-006` | Significant pointer dragging is observed on a likely drag-capable target and a single-pointer alternative must be reviewed. | REVIEW | WCAG 2.5.7 |
| `FT-RUNTIME-007` | After a real activation, a short visible status-like message appears without observable live/status semantics or an active `aria-errormessage` relationship. | REVIEW | WCAG 4.1.3 |
| `FT-RUNTIME-008` | Receiving focus is followed by an observed route change, dialog opening or programmatic focus move without a separate observed activation. | REVIEW | WCAG 3.2.1 |
| `FT-RUNTIME-009` | A trusted `input`/`change` event on a setting control is followed by an observed route change, dialog opening or programmatic focus move. | REVIEW | WCAG 3.2.2 |
| `FT-RUNTIME-010` | After a trusted real Tab/Shift+Tab transition, two stable non-focused and two stable focused captures show no pixel-color change in the bounded region around the focused control. | REVIEW | WCAG 2.4.7 AA · ACT oj04fd |
| `FT-RUNTIME-011` | A trusted pointer activation is observed on a custom action target that is not reachable in the observed sequential keyboard focus order. | REVIEW | WCAG 2.1.1 A |
| `FT-RUNTIME-012` | Repeated standard-Tab navigation cycles through only a subset of the observed focus order, or repeated Tab attempts leave focus unchanged outside an open modal. | REVIEW | WCAG 2.1.2 A · ACT a1b64e |
| `FT-RUNTIME-013` | Activation-like semantic state, target removal or navigation occurs after pointer-down but before pointer release or `pointercancel`. | REVIEW | WCAG 2.5.2 A |
| `FT-RUNTIME-014` | During Trace, a trusted real hover, pointer-active, keyboard focus/focus-visible or observed semantic state renders text below the required contrast ratio. | REVIEW | WCAG 1.4.3 AA |
| `FT-RUNTIME-015` | Additional content revealed by real hover or focus is observed for hoverability, persistence and dismissibility signals. | REVIEW | WCAG 1.4.13 AA |
| `FT-RUNTIME-016` | During Trace, a trusted real interactive state renders a measured component, graphic or focus cue below 3:1 against its adjacent color. | REVIEW | WCAG 1.4.11 AA |

`FT-RUNTIME-002` rechecks the element while it keeps focus after scroll, resize and relevant DOM mutations. `FT-RUNTIME-006` requires real pointer movement above the jitter threshold; native `dragstart` alone is not used to emit the review.

`FT-RUNTIME-007` is interaction-correlated and stabilized. It excludes dialogs, modeled widget-state containers, messages that receive focus or are followed by a focus/navigation/dialog context change, and messages already exposed through `role="status"`, `role="alert"`, `role="log"`, progress semantics, active `aria-live` or an active `aria-errormessage` relationship. `aria-busy` alone is not treated as sufficient status-message exposure. Status-message classification still depends on meaning, so the rule stays **REVIEW** and does not manufacture an automatic WCAG FAIL.

`FT-RUNTIME-008` and `FT-RUNTIME-009` use a bounded 1.2-second correlation window. Separate user actions clear stale attribution, explicit activation is not treated as an On Focus failure, and ordinary sequential focus movement is not blamed on the previously focused control. `FT-RUNTIME-009` records control identity and the trusted `input`/`change` event type, not the control value. Both rules stay **REVIEW** because runtime ordering cannot prove author-handler causation for 3.2.1 or establish prior user advice for 3.2.2 in every case.

`FT-RUNTIME-010` deliberately does not use automatic Focus Walk because programmatic `element.focus()` does not reliably reproduce keyboard `:focus-visible` modality. It runs only during manual Trace after a trusted Tab/Shift+Tab transition, waits for a one-second stable focused state, and requires stable before/after PNG capture pairs with unchanged viewport geometry. Any local pixel change is treated as evidence that this bounded check observed a visible difference; instability, scrolling, resizing or unavailable capture makes the observation inconclusive and produces no review. A stable unchanged local crop remains **REVIEW**, never automatic FAIL, because ACT `oj04fd` can allow a focus indication elsewhere in the viewport.

`FT-RUNTIME-011` is intentionally narrow: it needs a real pointer activation plus an observable custom-action signal and only reviews the case where that target is outside sequential keyboard navigation. It does not claim that delegated framework listeners or an equivalent keyboard control elsewhere are absent. `FT-RUNTIME-012` requires repeated real Tab evidence, ignores a full focus-order wrap and suppresses intentional focus containment inside an open modal; other escape mechanisms still require human review. `FT-RUNTIME-013` compares only activation-like state visible before release/cancellation and stays REVIEW because abort, undo and essential-function exceptions remain contextual. `FT-RUNTIME-014` measures only trusted interactive states that are actually rendered during Trace, waits for a bounded transition-settle window and stays REVIEW because unobserved states and WCAG applicability still require manual coverage.

`FT-RUNTIME-015` observes only additional content that actually becomes visible after a real hover or user-correlated focus interaction. It associates candidate content conservatively through explicit ARIA relationships or bounded geometric proximity, limits concurrent observations, and emits only REVIEW evidence when an observed interaction suggests one of WCAG 1.4.13's dismissible, hoverable or persistent requirements may not be met. Escape is treated as a probe that can provide dismissibility evidence, not as a universal WCAG requirement; unobserved states, alternate dismissal mechanisms and applicability remain manual.

`FT-RUNTIME-016` reuses the existing non-text contrast evaluator only on the interacted control after the trusted state settles. It emits REVIEW only when a simple rendered cue has a resolved ratio below 3:1; unresolved gradients/images, generated CSS graphics, multiple-color graphics and box-shadow-only focus cues stay silent/manual rather than creating runtime noise. Focus-indicator evidence is attributed only to real focus/focus-visible states. Unobserved states and required-visual-information applicability remain manual.

### Runtime ARIA warnings

These rules run after real interactions and a short stabilization window. They represent deterministic ARIA state/relationship contradictions and are emitted as **WARNING**, not automatic WCAG FAIL.

| ID | Pattern | Detects / observes | Result | Source |
| --- | --- | --- | --- | --- |
| `FT-RUNTIME-ARIA-001` | Disclosure / Accordion / Menu button | `aria-expanded` contradicts programmatic availability of the `aria-controls` content. | WARNING | WAI-ARIA |
| `FT-RUNTIME-ARIA-002` | Tabs | Selected tab controls a `tabpanel` that remains programmatically hidden. | WARNING | WAI-ARIA |
| `FT-RUNTIME-ARIA-003` | Combobox | Expanded combobox does not resolve `aria-controls` to an allowed popup role. | WARNING | WAI-ARIA |
| `FT-RUNTIME-ARIA-004` | Combobox | Actual popup role does not match `aria-haspopup`. | WARNING | WAI-ARIA |
| `FT-RUNTIME-ARIA-005` | Combobox / Listbox / Tree / Grid / Treegrid | `aria-activedescendant` is missing or outside the allowed ownership/control relationship. | WARNING | WAI-ARIA |
| `FT-RUNTIME-ARIA-006` | Tree | A treeitem's `aria-expanded` state contradicts availability of its child `group`. | WARNING | WAI-ARIA |

### Modal dialog runtime guidance

| ID | Detects / observes | Result | Reference |
| --- | --- | --- | --- |
| `FT-APG-001` | Dialog opens while initial focus remains outside. | REVIEW | WAI-ARIA APG Dialog Modal |
| `FT-APG-002` | Focus escapes an open modal dialog. | REVIEW | WAI-ARIA APG Dialog Modal |
| `FT-APG-003` | Dialog closes without restoring focus to a logical target. | REVIEW | WAI-ARIA APG Dialog Modal |

### APG widget runtime reviews

These rules observe real behavior in widget patterns modeled by FocusTrace. APG is informative guidance, so results remain **REVIEW** and are not presented as normative WCAG failures.

| ID | Pattern | Detects / observes | Result |
| --- | --- | --- | --- |
| `FT-APG-004` | Tabs | Enter, Space or click activates a tab but it does not become selected. | REVIEW |
| `FT-APG-005` | Menu button | Required activation does not open the menu, or an opened menu does not focus the expected item; optional ArrowUp/ArrowDown opening is reviewed only if implemented. | REVIEW |
| `FT-APG-006` | Menu button | Escape leaves the menu open or closes it without returning focus to the trigger. | REVIEW |
| `FT-APG-007` | Dialog | A dynamically observed dialog opens without an accessible name. | REVIEW |
| `FT-APG-008` | Combobox / Listbox / Tree / Grid / Treegrid | A valid `aria-activedescendant` is programmatically hidden after navigation. | REVIEW |
| `FT-APG-009` | Combobox | Escape is pressed while the popup is open but the popup remains exposed. | REVIEW |
| `FT-APG-010` | Listbox | A single-select listbox exposes multiple selected or checked options. | REVIEW |
| `FT-APG-011` | Tabs / Radio group / Toolbar / Menu / Listbox / Tree / Grid / Treegrid | A roving-tabindex composite exposes multiple managed page tab stops after interaction. | REVIEW |
| `FT-APG-012` | Tree | Arrow or required Home/End navigation does not reach the destination/state expected by the observed Tree pattern. | REVIEW |
| `FT-APG-013` | Grid / Treegrid | Arrow or required Home/End navigation does not reach the expected row/cell or state. | REVIEW |
| `FT-APG-014` | Tree | A single-select tree exposes multiple selected or checked treeitems. | REVIEW |
| `FT-APG-015` | Tabs | Arrow navigation does not reach the expected tab, respecting orientation and required wrapping. | REVIEW |
| `FT-APG-016` | Radio group | Arrow navigation does not reach/select the expected ARIA radio outside a toolbar. | REVIEW |
| `FT-APG-017` | Toolbar | The toolbar-owned arrow key does not reach the expected control. | REVIEW |
| `FT-APG-018` | Menu / Menubar | The menu-owned arrow key does not reach the expected menu item. | REVIEW |
| `FT-APG-019` | Listbox | The listbox-owned arrow key does not reach the expected option/virtual option. | REVIEW |
| `FT-APG-020` | Modal dialog | Escape is observed inside an open modal and the modal remains open after stabilization. | REVIEW |
| `FT-APG-021` | Disclosure / Accordion | Enter or Space on the button does not toggle the exposed `aria-expanded` state. | REVIEW |

#### Focus models and covered widgets

| Area | Observed behavior |
| --- | --- |
| **Roving tabindex** | FocusTrace checks that normally only one managed item participates in the page tab sequence. |
| **`aria-activedescendant`** | Valid changes are recorded as informational virtual focus; they do not increase finding counts or Tab metrics. |
| **Tabs** | Orientation, wrapping, activation and arrow navigation. |
| **Radio groups** | Arrow movement/selection outside toolbars; inside a toolbar navigation belongs to the toolbar. |
| **Toolbars** | Orientation-aware navigation while avoiding keys owned by embedded controls. |
| **Menus / Menu buttons** | Required Enter/Space opening, optional arrow opening when implemented, menu navigation and Escape. |
| **Listboxes** | DOM-focus or virtual-focus navigation plus single-selection consistency. |
| **Disclosure / Accordion** | Enter/Space `aria-expanded` transitions and state/content consistency. |
| **Dialogs** | Accessible name, initial focus, containment, Escape and restoration. |
| **Tree** | Orientation, visible traversal, expand/collapse, parent/child movement, Home/End and selection. |
| **Grid / Treegrid** | Row/cell navigation, Home/End and tree behavior where applicable, with conservative limits for irregular/virtualized grids. |

### Runtime causality

| Classification | Meaning |
| --- | --- |
| `FOCUSED_NODE_REMOVED` | The node containing focus was removed. |
| `FOCUS_FELL_BACK_TO_BODY` | The browser ended up returning focus to the document/body. |
| `DIALOG_OPENED_WITHOUT_FOCUS` | A dialog opened without receiving focus. |
| `MODAL_FOCUS_ESCAPE` | Focus left a modal that remained open. |
| `ROUTE_CHANGED_WITHOUT_FOCUS_MOVE` | SPA route changed while focus remained in the previous context. |
| `FOCUSED_ELEMENT_BECAME_HIDDEN` | The focused element became hidden. |

Causality explains the recorded chain; it does not by itself promote a contextual situation to FAIL.

### Structure

| Capability | Behavior |
| --- | --- |
| **Headings** | Reuses the current analysis to show the H1-H6 outline expanded by default, with hierarchy, branch controls and page location. |
| **Semantics** | Finds concrete native-HTML opportunities and generic interactions that need review. |
| **Metrics** | Counts semantic regions, lists, forms, buttons, links, controls, tables and images. |
| **Location** | A heading or metric group can be located and highlighted on the page. |
| **Unified page analysis** | **Analyze this page** prepares Semantics and Metrics together with the normal full-page scan; **Refresh** recalculates the Structure snapshot after page changes. |
| **Component boundary** | Component scans do not reuse a stale full-page Structure snapshot as component evidence. |
| **Safety bound** | The collector processes at most 10,000 elements by default. |
| **Report reuse** | PDF/TXT/report reuse existing compact metrics/suggestions without exporting the full DOM tree. |

### Trace tools

| Tool | Function |
| --- | --- |
| **Interactions** | Groups keyboard/pointer input and correlated runtime evidence using `interactionId`. |
| **Journey** | Reconstructs focus movement chronologically. |
| **Graph** | Represents observed connections between focus targets, including supported virtual focus. |
| **Replay** | Shows the recorded sequence without rerunning the page interaction. |
| **Delete interaction** | Removes an accidental recorded action and its correlated evidence. |
| **Recalculate session** | After deletion, recalculates Replay, Journey, Graph and Report. |
| **Breakpoints** | Can stop Trace after selected deterministic runtime conditions are captured. |
| **Highlight** | Can locate a recorded target again while it still exists. |

### Focus Walk

| Capability | Behavior |
| --- | --- |
| **Automated Tab walk** | Traverses targets reachable through sequential keyboard navigation. |
| **Focus evidence** | Builds a journey without manually pressing Tab through the entire page. |
| **Location** | Recorded steps can be used to identify the matching target. |
| **Limit** | It is a debugging aid and does not replace manual keyboard testing for contextual behavior. |

### Site Audit

Site Audit stays within the selected origin and reuses the real FocusTrace scanner.

| Capability | Behavior |
| --- | --- |
| **Sitemap discovery** | Includes same-origin URLs exposed through sitemaps. |
| **robots.txt** | Uses available information during discovery. |
| **Internal links** | Discovers internal site navigation. |
| **Manual URLs** | Allows optional explicit URLs. |
| **Route families** | Groups repeated route shapes instead of blindly scanning every duplicate. |
| **Representative sampling** | Runs the scanner on samples from each family. |
| **Template findings** | Treats a normalized signal as shared only when it appears in every successfully scanned sample in the family. |
| **Consistent Help** | Compares repeated help categories across pages for `FT-REVIEW-011`. |
| **Consistent Navigation** | Compares exact repeated navigation destination sets across sampled pages for `FT-REVIEW-013`; partial or ambiguous matches are ignored. |
| **Consistent Identification** | Reviews substantially divergent identification only for a unique exact native-link destination across same-language sampled pages (`FT-REVIEW-015`). |
| **Multipage history** | Keeps the latest static review per normalized URL in the active audit. |
| **Re-analysis** | Replaces the previous review/visual evidence for the same URL instead of duplicating it. |
| **Bounded visual evidence** | Can retain small local crops tied to reviews to preserve historical context. |
| **Complete audit PDF** | Exports saved pages with the evidence available for each review. |

| Current limit | Value |
| --- | ---: |
| Discovered URLs | 500 |
| Scanned pages | 30 |
| Samples per route family | 3 |

Sampling is representative evidence: it does not prove every URL is identical and does not automatically run Trace through every site workflow.

### FocusTrace Memory

Memory is optional and **disabled by default**.

| Capability | Behavior |
| --- | --- |
| **Page/component history** | Compares observations from the same scope over time. |
| **Persistence** | Identifies findings that continue to reproduce. |
| **Changes** | Exposes differences between successive observations. |
| **No longer reproduced** | Identifies findings that were present and no longer appear. |
| **Regressions** | Recognizes the return of a previously resolved finding. |
| **Compact locator** | Can retain an ID or CSS selector to identify the element later. |
| **Visual preview** | Can keep a small local JPEG crop of a currently visible failing element when capture is available. |
| **Fallback** | If capture fails, keeps the compact locator instead. |
| **Clear history** | Saved history can be removed from Settings even while Memory is disabled. |

| Current limit | Value |
| --- | ---: |
| Observations per scope | 8 |
| Total observations | 200 |
| Visual previews | 24 |
| Maximum age | 90 days |

Memory does not store page HTML, full DOM snapshots or full-page screenshots.

### Reports and export

| Capability | Content / behavior |
| --- | --- |
| **Session report** | Combines static findings and runtime evidence from the current session. |
| **Interaction stories** | Includes Trace chains, including status-message reviews, runtime ARIA warnings and APG reviews. |
| **Document structure** | Reuses compact metrics/suggestions prepared by the full-page analysis or a later Structure refresh. |
| **Rule legend** | Explains `FT-WCAG-*`, `FT-WARN-*`, `FT-REVIEW-*`, `FT-RUNTIME-*`, `FT-RUNTIME-ARIA-*` and `FT-APG-*` families. |
| **PDF** | Printable single-page or multipage-audit export. |
| **TXT** | Text export of available evidence. |
| **Markdown** | Structured Markdown export. |
| **Optional visual evidence** | Single-page PDF can include capture only when explicitly requested. |
| **Historical multipage evidence** | Audit PDFs can reuse bounded local crops saved during each analysis. |

### Languages and preferences

| Capability | Behavior |
| --- | --- |
| **English / Spanish** | Interface, explanations, human-readable evidence and remediation are maintained in both languages. |
| **Technical identifiers** | Rule IDs, selectors, HTML/ARIA tokens, ratios and colors remain canonical. |
| **Interface size** | Persistent preference. |
| **Breakpoints** | Persistent runtime preferences. |
| **Memory** | Persistent opt-in preference. |

### Analysis limits

| Area | Main limit |
| --- | --- |
| Accessible name | Targeted implementation for engine needs, not a complete browser accessibility-engine reproduction. |
| Shadow DOM / slots | Not fully covered. |
| Cross-origin iframes | Content is not fully traversed. |
| Contrast | Complex visual composition remains REVIEW when it cannot be resolved safely. |
| Target size | Uses observable DOM/layout geometry and conservative target discovery. Equivalent, essential and user-agent-control exceptions, arbitrary framework-only pointer listeners and complex non-rectangular hit areas can still require manual review. |
| Text spacing | Only inline `!important` letter spacing, word spacing and soft-wrapped line height are checked against the three current ACT thresholds. Paragraph spacing, page-provided spacing mechanisms, language/script applicability and the combined no-loss-of-content/functionality judgement remain manual. |
| Media alternatives, captions and descriptions | Native media evidence only. 1.2.1 covers the audio-only subset; 1.2.2/1.2.4 observe captions tracks; 1.2.3/1.2.5 observe bounded local media-alternative/audio-description signals. HLS/DASH URLs alone are not treated as live, custom/burned-in tracks can be missed, browser audio-track availability varies, and FocusTrace never verifies alternative equivalence or caption/description accuracy/completeness. |
| Form errors | Static review observes explicit/user-invalid state, ARIA-associated error text and correction-relevant constraint metadata only. It does not read field values, infer every visual/application-level message or determine semantic adequacy of a correction suggestion. |
| Focus visible | Runtime coverage requires a trusted real Tab/Shift+Tab transition, stable focus and stable active-tab captures. The detector compares only a bounded local region, so unchanged pixels remain REVIEW and cannot prove that no indicator exists elsewhere in the viewport. Automatic Focus Walk is intentionally not used for this rule. |
| Keyboard / trap | Runtime coverage observes real pointer and standard-Tab behavior only. Equivalent keyboard controls elsewhere, delegated framework handlers, non-standard navigation and documented escape mechanisms still require manual review. |
| Pointer cancellation | Runtime coverage only flags activation-like state already observable before release/cancellation. Whether activation is essential, can be aborted or can be undone remains manual. |
| Dynamic states | Static analysis does not force inactive hover, pressed, checked or focus states. During Trace, FocusTrace can review measured text and non-text contrast for trusted interactive states that are actually observed, but it does not exercise every possible state or application path. Unresolved non-text visual composition remains manual rather than generating runtime noise. |
| Hover/focus additional content | Trace observes only additional content that actually appears after real hover or user-correlated focus. Association is bounded, and alternate dismissal mechanisms, exceptional content behavior and unobserved states still require manual review. |
| HTML | Operates on the parsed live DOM; browser parser repair may normalize invalid source before FocusTrace runs. |
| ARIA | Derives observable relationships but does not reproduce the exact browser accessibility tree or a screen reader's spoken output. |
| Runtime ARIA | Evaluates modeled patterns only after relevant real interactions and uses a stabilization window; it does not simulate arbitrary actions. |
| Status messages | Runtime review is limited to short visible EN/ES status-like text and observable structural signals after real activation. It cannot prove every message's meaning, non-text-only status, exact accessibility-tree exposure or screen-reader announcement. |
| Context changes | Trace correlates focus/input with route, dialog and DOM-focus movement inside a bounded window. It does not prove author causation or whether prior warning satisfies WCAG 3.2.2. |
| Input purpose | Only explicit standard-like `autocomplete` token sequences are validated. Missing `autocomplete`, unknown-only custom taxonomies and whether a field actually collects information about the user remain outside automatic judgement. |
| Language of parts | Only explicit `lang` values on rendered human-language text are validated. FocusTrace does not infer missing language changes from the text itself, and code-like contexts are deliberately excluded. |
| APG | APG is informative guidance and optional variants are not forced as universal requirements. |
| Grid / Treegrid | Reviews stay conservative for irregular/virtualized grids, spans and explicit indexes. |
| Runtime | Can report only interaction paths that were actually observed. |
| Site Audit | Representative sampling is not equivalent to checking every URL. Repeated-navigation comparison intentionally ignores partial destination overlap, duplicate exact-set mechanisms and user-initiated-order context; consistent-identification comparison is limited to unique exact native-link destinations on pages with the same declared primary language and intentionally ignores ambiguous or duplicated matches. |
| WCAG | PASS means the tested expectation passed, not the entire linked success criterion. |
| EN 301 549 | FocusTrace does not perform a complete evaluation or certify conformance. |

See [`docs/RULES.md`](docs/RULES.md) for detailed methodology/applicability, [`docs/RUNTIME_ARIA.md`](docs/RUNTIME_ARIA.md) for runtime ARIA/APG rules and [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for architecture, data and storage boundaries.

## Browser support

FocusTrace targets Manifest V3.

Currently supported release targets:

- Google Chrome 114+
- Microsoft Edge based on Chromium

Experimental pre-release target:

- Firefox 115+

The Firefox build is generated and validated in CI, but remains experimental until the manual Firefox smoke checklist has been completed against the packaged build. WXT generates the same sidepanel UI as a Firefox sidebar.

## Extension permissions

FocusTrace intentionally keeps its production permission set narrow:

| Permission | Browser | Why it is needed |
| --- | --- | --- |
| `activeTab` | Chrome / Edge / Firefox | Analyze the page the user explicitly activates FocusTrace on and support local visible-tab evidence for explicit analysis, report export and real-Tab focus-visible review when available. |
| `scripting` | Chrome / Edge / Firefox | Inject local analysis/runtime instrumentation into the active page. |
| `storage` | Chrome / Edge / Firefox | Persist preferences, local state, bounded audits and optional FocusTrace Memory evidence. |
| `sidePanel` | Chrome / Edge | Provide the FocusTrace debugging interface in the Chromium side panel. |

Firefox uses its native sidebar manifest integration instead of the Chromium-only `sidePanel` permission.

Production builds do not require global host access at install time. HTTP/HTTPS access is optional and requested from explicit user actions. Broad `<all_urls>` capture access is requested only when a visual export needs it and is removed after the operation when FocusTrace acquired it for that export.

## Privacy

All analysis runs locally in the browser. FocusTrace does not send page content, DOM data, screenshots or recorded interactions to a FocusTrace server or third-party AI API.

Full-page analysis prepares bounded Structure evidence together with the rule-engine result. FocusTrace Memory is opt-in. Memory/report visual evidence is local and bounded, and the lossless captures used for focus-visible runtime comparison are temporary and not persisted. See [`PRIVACY.md`](PRIVACY.md) for the canonical privacy policy and [`SECURITY.md`](SECURITY.md) for responsible vulnerability reporting.

## License and project identity

FocusTrace source code is distributed under the **GNU General Public License version 3 only (`GPL-3.0-only`)**. See [`LICENSE`](LICENSE).

The FocusTrace name, logo and project identity are not granted by the source-code license for use in a way that presents an unofficial fork as the official project. See [`TRADEMARKS.md`](TRADEMARKS.md).

Contributions are welcome under the same project license. See [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Try the latest development build

After CI succeeds for a push to `main`, GitHub Actions publishes development artifacts from that exact commit:

- `focustrace-chrome-dev`
- `focustrace-firefox-dev`

### Chrome

1. Open **Actions** → **Dev Extension**.
2. Download `focustrace-chrome-dev` from the latest successful run.
3. Unzip it.
4. Open `chrome://extensions`, enable **Developer mode**, then choose **Load unpacked**.
5. Select the folder containing `manifest.json`.

### Firefox experimental build

1. Download and unzip `focustrace-firefox-dev`.
2. Open `about:debugging#/runtime/this-firefox`.
3. Choose **Load Temporary Add-on…**.
4. Select the build's `manifest.json`.
5. Complete the Firefox smoke checklist before treating the build as supported.

Each artifact includes `FOCUSTRACE_BUILD.txt` with the source SHA and browser target. Development artifacts are unsigned previews retained for 14 days.

## Development

Requirements:

- Node.js 22
- npm

Install dependencies:

```bash
npm ci
```

Development builds:

```bash
npm run dev
npm run dev:firefox
```

Production builds:

```bash
npm run build
npm run build:edge
npm run build:firefox
```

Package browser artifacts:

```bash
npm run zip
npm run zip:edge
npm run zip:firefox
```

Main validation:

```bash
npm run standards:validate
npm run capabilities:validate
npm run check
npm run lint
npm test
```

Release gate:

```bash
npm run release:check
npm run release:check:full
```

See [`docs/RELEASE_CHECKLIST.md`](docs/RELEASE_CHECKLIST.md) before tagging a release or changing repository visibility.