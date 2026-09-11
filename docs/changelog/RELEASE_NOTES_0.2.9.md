# FocusTrace 0.2.9

FocusTrace 0.2.9 expands conservative WCAG 2.2 review evidence around visual presentation and content understanding. It adds bounded checks for reflow, use of color, persistent moving content and generic link purpose, plus a guided same-document comparison for text resizing at 200% browser zoom.

The release preserves the FocusTrace evidence boundary: every new candidate remains `REVIEW`, context and exceptions remain visible, and a quiet scan is never presented as proof of complete WCAG or EN 301 549 conformance.

## Reflow at narrow viewports

`FT-REVIEW-024` adds partial review evidence for WCAG 2.2 1.4.10 Reflow and the corresponding EN 301 549 clause.

When the effective viewport reaches the WCAG reflow threshold, FocusTrace can review:

- cross-axis document overflow caused by non-exempt rendered content;
- visible text or controls clipped by an unscrollable `overflow: hidden` or `overflow: clip` ancestor;
- the responsible element and ancestor selectors;
- viewport, document and element geometry;
- relevant minimum width, white-space, positioning and overflow evidence.

The rule does not change browser zoom. Known bidirectional surfaces such as tables, maps, video, canvas and SVG are treated conservatively, and essential two-dimensional layout remains a human decision. Shadow DOM, cross-origin frames, transforms, overlays and compositing can remain outside the detected subset.

## Inline links that may rely on color alone

`FT-REVIEW-025` adds bounded evidence for the inline-link subset of WCAG 2.2 1.4.1 Use of Color.

For rendered native links inside prose, FocusTrace compares the link color with adjacent non-link text and records:

- the resolved link and surrounding text colors;
- the measured lightness-difference ratio;
- whether a persistent underline, typographic difference, boundary or graphic cue was observed;
- stable target and context selectors.

A candidate is reviewed when the measured difference is below 3:1 and no supported persistent non-color cue is observable. Navigation, isolated links, complex backgrounds, custom link roles and non-link uses of color remain outside this detector. Hover and focus behavior still requires manual verification.

## Persistent moving content

`FT-REVIEW-026` adds conservative current-state evidence for the moving, blinking and scrolling branch of WCAG 2.2 2.2.2 Pause, Stop, Hide.

The rule can inspect bounded sets of:

- running browser-exposed Web Animations;
- rendered `<marquee>` elements;
- rendered native `video[autoplay]` elements.

It records resolved active duration or indefinite repetition, changing keyframe properties, automatic-start confidence and accessibly named controls explicitly related through `aria-controls`. Native video controls and content with a resolved duration of no more than five seconds can produce bounded positive evidence.

The rule does not continuously observe timed DOM or text updates and does not decode animated GIF, APNG or WebP pixels. Canvas, SVG SMIL, custom players, paused or completed animations, Shadow DOM and cross-origin frames can remain outside the result. Essentiality and custom-control behavior require human verification.

## Link purpose in programmatic context

`FT-REVIEW-027` complements the deterministic empty accessible-name check for WCAG 2.2 2.4.4 Link Purpose (In Context).

It reviews exposed semantic links whose non-empty accessible name exactly matches a deliberately small English or Spanish generic phrase, including examples such as:

- “read more” / «leer más»;
- “click here” / «clic aquí»;
- “details” / «detalles»;
- “more information” / «más información».

Structured evidence can retain bounded context from resolved `aria-describedby` targets, the containing sentence or paragraph, current and parent list items, table cells and explicitly or conservatively associated table headers.

Every candidate remains `REVIEW`, even when context is observed. Determining whether natural language communicates the destination or action requires human judgement, and WCAG permits purposes that would be ambiguous to users generally. Custom wording, raw destination meaning, visually preceding headings, Shadow DOM and cross-origin frames remain manual.

## Guided Resize Text comparison

`FT-REVIEW-028` adds a full-page guided workflow for partial WCAG 2.2 1.4.4 Resize Text evidence:

1. Set browser zoom to 100% and run Analyze to capture a bounded session-only reference.
2. Keep the same page document open, set browser zoom to 200% and run Analyze again.
3. Review only regressions that become observable in the 200% state.

FocusTrace never changes or restores browser zoom. The comparison can review:

- text or controls that become unavailable without an observable equivalent replacement;
- controls that lose their accessible name;
- newly introduced clipping through `overflow: hidden/clip`;
- newly introduced overlap between unrelated subjects;
- effective text enlargement below 1.9:1.

Responsive replacements with the same bounded text/name signature and hidden content associated with a rendered named disclosure candidate are suppressed conservatively. Evidence that was already clipped or overlapping at 100% does not become a new resize candidate.

The reference is held only in the current extension session, is scoped to the same document and is bounded to 1,000 retained subjects from at most 5,000 inspected elements. At most 30 findings are emitted. Intermediate zoom steps, images of text and captions, transforms, generated or Shadow DOM text, cross-origin frames, browser chrome and complete task functionality remain manual.

## Evidence, reports and localization

The five rules provide:

- structured JSON evidence alongside concise human-readable evidence;
- English and Spanish titles, explanations, workflow guidance and remediation;
- page/component support where the rule's scope permits it;
- standards references and partial-coverage metadata;
- report and Memory-compatible finding serialization without introducing a parallel evidence format.

Reflow and Resize Text remain full-page workflows. Use of Color, Pause/Stop/Hide and Link Purpose support the bounded scopes documented in the rule catalog.

## Privacy and permissions

0.2.9 adds no FocusTrace backend, account requirement, analytics pipeline, `chrome.debugger` access, required permission or new persistent storage category.

All analysis remains local unless the user explicitly exports evidence. The Resize Text 100% reference is session-only and is not retained as a separate long-term page snapshot. The new rules inspect rendered styles, geometry, compact text/name context and animation metadata needed for their documented purpose; they do not read form-control values.

## Browser targets

Release targets remain:

- Google Chrome 114+;
- Chromium-based Microsoft Edge;
- Firefox 115+.

## Validation before publishing

Run the complete gate on the exact candidate commit before tagging:

```bash
npm run release:check:full
npm audit --omit=dev
npm audit
```

The final candidate must keep `package.json`, `package-lock.json`, generated Chrome/Edge/Firefox manifests, release documentation and `tests/release-contract.test.ts` aligned on `0.2.9`.

CI must be green on the exact commit intended for `v0.2.9`. Complete the manual checks in `docs/RELEASE_CHECKLIST.md`, especially the five new review workflows, browser zoom from 100% through 200%, responsive replacements, reflow exceptions, animation controls, link context, EN/ES evidence and packaged browser smoke tests, before publishing production artifacts.
