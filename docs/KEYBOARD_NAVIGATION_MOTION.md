# Keyboard, navigation, refresh and motion

This document is the methodology companion for FocusTrace keyboard/navigation authoring checks, automatic refresh evidence and automatically started media/motion checks. It complements `docs/RULES.md`, `docs/SEVERITY-AUDIT.md` and the runtime-specific `docs/KEYBOARD_POINTER_RUNTIME.md`.

## Accesskey collisions

`FT-WARN-028` reports a valid single-code-point `accesskey` token when the same normalized token is assigned to more than one element in the document.

- Comparison is case-insensitive after NFC normalization.
- Space-separated accesskey tokens are evaluated individually.
- Tokens containing more than one Unicode code point are outside this bounded collision detector rather than being repaired or guessed.
- Component scans keep the finding inside the selected component but still use the whole document to establish that the token collides.

The result is **WARNING**, not a WCAG failure. `accesskey` shortcut assignment depends on browser/platform behavior and authors can create accessibility problems even with a token that is technically unique.

## Delayed meta refresh

`FT-WCAG-022` implements a bounded WCAG 2.2.1 / ACT `bc659a` timing check for HTML meta refresh.

FocusTrace inspects `meta[http-equiv="refresh"]` in tree order and uses the first declaration whose content can be parsed conservatively. The implemented expectation is:

- delay `0` seconds → PASS for this timing expectation;
- delay greater than `0` and no more than `72,000` seconds (20 hours) → deterministic FAIL;
- delay greater than `72,000` seconds → PASS for this bounded expectation;
- content whose delay cannot be parsed safely → ignored rather than guessed.

The rule is page-only. A PASS does not claim that the destination, resulting context change or every user-agent recovery behavior conforms to WCAG.

## Scrollable regions and keyboard reachability

`FT-REVIEW-043` inspects rendered HTML elements whose computed `overflow-x` or `overflow-y` is `auto`/`scroll` and whose measured scroll extent is larger than the client extent.

A bounded PASS is recorded when the region itself or a descendant is in sequential keyboard focus navigation. An inert region is also excluded from the keyboard-entry review. Otherwise FocusTrace emits **REVIEW**, because an external accessible scrolling control, decorative overflow, user-agent behavior or an unusual interaction model can still affect the final WCAG judgement.

The evaluator is bounded to 1,000 candidate elements, 2,000 descendants per region and 50 review findings per scan. Iframes are excluded because nested browsing-context keyboard behavior is handled separately.

## Automatically started audio

`FT-REVIEW-044` evaluates native `audio[autoplay]` and `video[autoplay]` candidates for the observable WCAG 1.4.2 / ACT `80f0bf` signals.

- Muted media or media with zero volume is excluded from the review.
- Visual rendering is not required: an `<audio>` element without controls is commonly not rendered while its audio can still affect WCAG 1.4.2.
- Known duration of three seconds or less records a bounded PASS.
- Native media controls record a bounded PASS for the observable stop/volume mechanism.
- Longer or unresolved unmuted autoplay without native controls remains REVIEW.
- A named control explicitly related through `aria-controls` is recorded as a candidate but does not suppress REVIEW because FocusTrace cannot prove that it actually stops or mutes audio.
- Native `<audio>` provides a strong audio-presence signal. For `<video>`, the presence of an audible track remains unknown unless browser-observable evidence can prove it, so the result stays contextual.

FocusTrace does not treat browser autoplay blocking as proof that the authored experience is safe in every user agent.

## Existing focus-order and motion evidence

The #235 package intentionally reuses existing rules instead of creating duplicate findings:

- `FT-REVIEW-001` continues to review positive `tabindex` values that can reorder sequential focus.
- `FT-RUNTIME-011` continues to review an observed pointer action that is not keyboard reachable.
- `FT-RUNTIME-012` continues to review observed repeated Tab cycles/no-move evidence that may indicate a keyboard trap.
- `FT-REVIEW-026` continues to review rendered Web Animations, `<marquee>` and autoplay video movement for WCAG 2.2.2.
- Obsolete `<blink>` / `<marquee>` authoring continues to be reported by `FT-WARN-005`. A `<blink>` element is not automatically treated as moving content unless FocusTrace observes actual browser animation/motion evidence; modern user agents do not necessarily render legacy blink behavior.

This separation prevents the same signal from being presented simultaneously as a static deterministic failure and as an observed runtime barrier.

## Severity decisions

- `FT-WARN-028` — **serious WARNING**, aligned to the axe accesskeys benchmark impact while preserving HTML-authoring semantics.
- `FT-WCAG-022` — **critical FAIL/PASS**, aligned to the axe meta-refresh impact and limited to the implemented ACT timing window.
- `FT-REVIEW-043` — **serious REVIEW/PASS**, because inaccessible scroll containers can block keyboard operation but applicability and alternate mechanisms can require context.
- `FT-REVIEW-044` — **moderate REVIEW/PASS**, aligned to the axe no-autoplay-audio impact while preserving uncertainty around actual playback/audio tracks/custom controls.

## Privacy and performance

All checks run locally and retain only compact structural evidence such as selectors, timing values, scroll distances and related-control selectors. Media payloads, audio samples, field values, full DOM snapshots and continuous scroll traces are not stored.
