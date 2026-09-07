# FocusTrace 0.2.3

FocusTrace 0.2.3 is a stability release for the **Structure > Headings** view. It prevents deeply nested heading branches from causing excessive browser layout work and native-memory growth while they are expanded.

## Heading-tree stability fix

The heading outline previously used CSS Grid for both each visible heading row and every recursively nested branch container. With an H1–H6 hierarchy, intrinsic sizing across those nested grids could become disproportionately expensive even when the page contained only a small number of headings.

The release keeps the three-column grid that aligns the expand control, heading-level badge and label within each row. Recursive tree and child containers now use normal block flow, avoiding repeated nested-grid sizing while preserving:

- the existing heading hierarchy and indentation;
- individual and global expand/collapse controls;
- narrow side-panel layouts;
- heading location and reset actions;
- the optional inspected-page heading overlay.

## Regression evidence

Browser coverage now expands a representative H1–H6 tree at both 320 px and 600 px panel widths.

A Chromium/CDP regression test also samples native embedder memory after forced garbage collection at every expanded level. The test enforces a 64 MB ceiling and verifies that collapsing the tree returns document, DOM-node and event-listener counts to their original baseline.

This guard targets the observed failure mode: the JavaScript heap and retained React state were not the source of the growth; the expensive allocation occurred in browser-native layout/embedder memory. The memory assertion is Chromium-specific, while production builds and the functional heading-tree behavior continue to be validated for Chrome, Edge and Firefox.

## Capability catalog

The README capability catalogs are unchanged. This patch does not add, remove or materially redefine Structure behavior; it restores responsive operation for the documented heading-outline workflow.

## Privacy and permissions

0.2.3 adds no backend, analytics, production permission or persisted data. FocusTrace remains local-first.

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

The final candidate must keep `package.json`, `package-lock.json`, generated browser manifests, release documentation and `tests/release-contract.test.ts` aligned on `0.2.3`. CI must be green on the exact commit intended for `v0.2.3`, and the manual checks in `docs/RELEASE_CHECKLIST.md` must be completed before publishing production packages.
