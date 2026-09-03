# FocusTrace 0.1.3

FocusTrace 0.1.3 improves FocusTrace Memory so historical failures remain understandable after they stop reproducing, while keeping the feature opt-in, bounded and local-first.

## FocusTrace Memory visual context

- Resolved findings no longer expose an opaque `Ref. XXXXX` identifier in the interface.
- When Memory is enabled, an explicit page or component analysis may retain a small local JPEG crop of a currently visible failing element.
- Saved previews are compressed, bounded and highlighted around the affected element.
- Preview images expand on pointer hover and keyboard focus.
- When visual capture is unavailable, Memory falls back to a compact local element locator.
- Existing diagnostic evidence such as contrast ratio, colors, text metrics and the last detection time remains available when recorded.
- Marking a no-longer-reproduced finding as resolved removes its detailed remembered history, locator and preview while retaining only the minimal hashed marker required to recognize a future regression.

## Privacy and storage

- FocusTrace Memory remains optional and disabled by default.
- Memory does not store page HTML, full DOM snapshots or full-page screenshots as history.
- Visual evidence is bounded to at most 24 retained previews across remembered findings, with only the newest retained preview for a given finding.
- Memory visual context remains in the browser profile and is not intentionally sent to a FocusTrace backend or third-party AI service.
- Memory preview capture does not add a persistent broad `<all_urls>` permission; when capture is unavailable in the explicit active-tab analysis context, FocusTrace uses the locator fallback instead.
- Saved Memory history can still be disabled or cleared from Settings.

## Interface polish

- **Why this impact? / ¿Por qué este impacto?** now uses the shared FocusTrace chevron icon rather than a text glyph, matching the rest of the disclosure components.

## Compatibility

- Google Chrome 114+
- Chromium-based Microsoft Edge
- Firefox 115+ remains an experimental release target until its manual smoke checklist is completed.

## Validation before publishing

The release candidate must pass `npm run release:check:full` and CI on the exact commit intended for `v0.1.3`. The manual accessibility, Memory and packaged-browser smoke checks in `docs/RELEASE_CHECKLIST.md` must also be completed before the tag and production packages are published.
