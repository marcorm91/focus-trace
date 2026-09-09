# FocusTrace 0.2.4

FocusTrace 0.2.4 refines the **Structure > Headings** experience after the heading-tree performance work introduced in 0.2.3.

## Expanded heading outline by default

The current H1–H6 hierarchy is now fully expanded whenever the heading view receives a new analysis. This makes the complete document outline immediately visible without requiring users to open every nested branch.

Individual branch controls and **Expand all / Collapse all** remain available. A manual collapse continues to affect only the current outline until a new scan replaces it, at which point the new hierarchy opens fully again.

## Transparent indentation gutter

Heading rows use an internal layout wrapper around the branch toggle, level badge and heading button. A shared surface rule was painting that wrapper white, which made the progressively indented left gutter appear as a set of disconnected white blocks.

The wrapper is now explicitly transparent. The visible heading badge, heading button, warning states, borders and hover feedback keep their existing themed surfaces in both light and dark modes.

## Performance and regression coverage

The block-flow branch layout from 0.2.3 remains unchanged. Opening all levels by default does not restore the recursively nested Grid pattern that caused excessive native layout memory.

Regression coverage now verifies:

- all six representative levels are rendered on entry;
- the heading-row wrapper has a transparent background;
- individual and global controls can still collapse and reopen the hierarchy;
- a new scan restores the expanded default;
- repeated toggling remains responsive at 320 px and 600 px;
- initially expanded and manually reopened outlines remain below the Chromium native-memory ceiling.

## Capability catalog

The English and Spanish README capability catalogs now document that the heading outline opens by default and retains branch controls.

## Privacy and permissions

0.2.4 adds no backend, analytics, production permission or persisted data. FocusTrace remains local-first.

## Browser targets

Release targets remain:

- Google Chrome 114+;
- Chromium-based Microsoft Edge;
- Firefox 115+ as an experimental release target pending the packaged-build smoke checklist.

## Validation before publishing

Before tagging the release, run the complete gate on the exact candidate commit:

```bash
npm run release:check:full
npm audit --omit=dev
npm audit
```

The final candidate must keep `package.json`, `package-lock.json`, generated browser manifests, release documentation and `tests/release-contract.test.ts` aligned on `0.2.4`. CI must be green on the exact commit intended for `v0.2.4`, and the manual checks in `docs/RELEASE_CHECKLIST.md` must be completed before publishing production packages.
