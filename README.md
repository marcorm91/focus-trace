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
| **Full-page analysis** | Active document | Runs the local rule engine on the current page. | FAIL, REVIEW, WARNING and PASS depending on each rule. |
| **Component analysis** | Visually selected DOM subtree | Runs the same engine within the selected component while preserving document-wide context when a rule needs it. | Findings limited to the selected scope. |
| **Inspect finding** | Current finding | Locates and highlights the target when it still exists on the page. | Selector, target element and visual highlight. |
| **Accessible name** | Supported controls | Computes the accessible name and records the winning source. | Role, computed name, source and inspected candidates. |
| **Text contrast** | Rendered text with resolvable colors | Calculates ratio, required threshold, foreground/background, font size and weight. | Structured evidence reusable by UI and reports. |
| **Non-text contrast** | Observable boundaries, states, graphics or focus cues | Evaluates deterministic signals and keeps ambiguous visual composition as REVIEW. | Ratio, signal kind and visual context. |
| **Pointer target size** | Observable rendered pointer targets | Measures target geometry and WCAG 2.5.8 spacing while preserving contextual exceptions as REVIEW. | CSS-pixel size, neighboring target and pass/review rationale. |
| **Color suggestion** | Deterministic contrast failure | Suggests a small sRGB adjustment that reaches the required ratio when it can be computed safely. | Measured HEX/RGB, suggestion and copy action. |
| **How to fix** | Findings with remediation guidance | Shows concrete remediation strategies and a verification step. | Localized EN/ES guidance. |
| **Structure** | Current page | Exposes headings, semantic review and structural metrics on demand. | H1-H6 outline, suggestions and counts. |
| **Trace** | Real interaction | Records keyboard/pointer input, focus, relevant mutations, SPA routes, dialogs, status-message candidates, ARIA widgets and causal evidence. | Events correlated by interaction. |
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

Trace stores compact evidence: selector, role, accessible name, tag, relevant changes, route transition, dialog/focus events and dragging summary. It does not store full DOM snapshots or the complete pointer-coordinate trail.

| ID | Detects / observes | Result | Reference |
| --- | --- | --- | --- |
| `FT-RUNTIME-001` | Focused element is removed during an interaction. | REVIEW | WCAG 2.4.3 |
| `FT-RUNTIME-002` | Component keeping focus may become completely obscured by other content. | REVIEW | WCAG 2.4.11 |
| `FT-RUNTIME-003` | SPA route changes without updating the document title. | REVIEW | WCAG 2.4.2 |
| `FT-RUNTIME-004` | SPA route changes without moving focus into the new context. | REVIEW | WCAG 2.4.3 |
| `FT-RUNTIME-005` | Element keeping focus becomes hidden during interaction. | REVIEW | WCAG 2.4.3 / 4.1.2 |
| `FT-RUNTIME-006` | Significant pointer dragging is observed on a likely drag-capable target and a single-pointer alternative must be reviewed. | REVIEW | WCAG 2.5.7 |
| `FT-RUNTIME-007` | After a real activation, a short visible status-like message appears without observable live/status semantics or an active `aria-errormessage` relationship. | REVIEW | WCAG 4.1.3 |

`FT-RUNTIME-002` rechecks the element while it keeps focus after scroll, resize and relevant DOM mutations. `FT-RUNTIME-006` requires real pointer movement above the jitter threshold; native `dragstart` alone is not used to emit the review.

`FT-RUNTIME-007` is interaction-correlated and stabilized. It excludes dialogs, modeled widget-state containers, messages that receive focus or are followed by a focus/navigation/dialog context change, and messages already exposed through `role="status"`, `role="alert"`, `role="log"`, progress semantics, active `aria-live` or an active `aria-errormessage` relationship. `aria-busy` alone is not treated as sufficient status-message exposure. Status-message classification still depends on meaning, so the rule stays **REVIEW** and does not manufacture an automatic WCAG FAIL.

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
| **Headings** | Reuses the current analysis to show the H1-H6 outline, hierarchy and page location. |
| **Semantics** | Finds concrete native-HTML opportunities and generic interactions that need review. |
| **Metrics** | Counts semantic regions, lists, forms, buttons, links, controls, tables and images. |
| **Location** | A heading or metric group can be located and highlighted on the page. |
| **On demand** | Semantics and Metrics traverse the DOM only after **Analyze structure** or **Refresh**. |
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
| **Document structure** | Reuses compact metrics/suggestions when Structure was already generated. |
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
| Dynamic states | Static analysis does not systematically force every hover, pressed, checked or focus state. |
| HTML | Operates on the parsed live DOM; browser parser repair may normalize invalid source before FocusTrace runs. |
| ARIA | Derives observable relationships but does not reproduce the exact browser accessibility tree or a screen reader's spoken output. |
| Runtime ARIA | Evaluates modeled patterns only after relevant real interactions and uses a stabilization window; it does not simulate arbitrary actions. |
| Status messages | Runtime review is limited to short visible EN/ES status-like text and observable structural signals after real activation. It cannot prove every message's meaning, non-text-only status, exact accessibility-tree exposure or screen-reader announcement. |
| APG | APG is informative guidance and optional variants are not forced as universal requirements. |
| Grid / Treegrid | Reviews stay conservative for irregular/virtualized grids, spans and explicit indexes. |
| Runtime | Can report only interaction paths that were actually observed. |
| Site Audit | Representative sampling is not equivalent to checking every URL. |
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
| `activeTab` | Chrome / Edge / Firefox | Analyze the page the user explicitly activates FocusTrace on and support visible-tab evidence for an explicit analysis when available. |
| `scripting` | Chrome / Edge / Firefox | Inject local analysis/runtime instrumentation into the active page. |
| `storage` | Chrome / Edge / Firefox | Persist preferences, local state, bounded audits and optional FocusTrace Memory evidence. |
| `sidePanel` | Chrome / Edge | Provide the FocusTrace debugging interface in the Chromium side panel. |

Firefox uses its native sidebar manifest integration instead of the Chromium-only `sidePanel` permission.

Production builds do not require global host access at install time. HTTP/HTTPS access is optional and requested from explicit user actions. Broad `<all_urls>` capture access is requested only when a visual export needs it and is removed after the operation when FocusTrace acquired it for that export.

## Privacy

All analysis runs locally in the browser. FocusTrace does not send page content, DOM data, screenshots or recorded interactions to a FocusTrace server or third-party AI API.

Structure is generated on demand. FocusTrace Memory is opt-in. Memory/report visual evidence is local and bounded. See [`PRIVACY.md`](PRIVACY.md) for the canonical privacy policy and [`SECURITY.md`](SECURITY.md) for responsible vulnerability reporting.

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