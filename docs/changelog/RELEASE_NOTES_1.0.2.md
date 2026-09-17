# FocusTrace 1.0.2

FocusTrace 1.0.2 is a maintenance release improving heading Structure evidence, the contextual WCAG 2.4.1 Bypass Blocks review, compact side-panel layouts and printable report navigation. It includes the changes merged after 1.0.1.

## Heading structure

- Fixed a false positive where H1-H6 headings without direct text content were reported as empty even when meaningful accessible content was exposed by descendants.
- Heading Structure evidence can use descendant `aria-label`, `aria-labelledby` and image `alt` text when direct heading text is unavailable.
- Decorative-only or genuinely empty headings remain marked as empty.
- Heading-level jump detection remains independent from empty-heading detection.
- The resolved accessible text is shown in the heading outline when direct text is unavailable.

## Bypass Blocks review

- Improved `FT-REVIEW-012` for pages where primary content is not exposed through `<main>` or `role="main"`.
- Substantial exposed navigation with at least three sequential keyboard stops now remains applicable as contextual `REVIEW` when FocusTrace cannot validate a bypass destination because the main landmark is missing.
- An early likely fragment bypass whose target is broken remains review evidence even without an exposed main landmark.
- Short navigation without an exposed main landmark remains inapplicable to avoid noisy reviews.
- The rule remains `REVIEW`, not automatic `FAIL`, because WCAG 2.4.1 can be satisfied by mechanisms that cannot be proven from this bounded DOM heuristic.

## Interface and PDF exports

- More formats now includes JUnit XML for current and saved page/component reports; only deterministic FAIL creates a failing testcase. Disabled Markdown/JSON Trace exports explain why the required recording is unavailable.

- Current audit headings and scope prompts list every accepted domain rather than only the initial audit name, with wrapping in narrow panels.

- Individual PDF index rows now match the compact multipage index typography and spacing, without solid row separators.
- Trace and Focus Walk validate the inspected site's audit scope before recording, with cancel/add/new decisions and a navigation recheck.
- The audit scope dialog now grows to 720px (viewport permitting); its width is protected from the shared reset-dialog style.

- The global FocusTrace header now remains visible while scrolling and uses the same theme background as the page instead of a white surface.
- The active page or selected component is shown as the Review heading subtitle instead of being repeated inside the quick-action panel.
- Trace inspector tabs switch to a two-column layout before their icons, labels or result counters can overlap at compact widths.
- The cross-site audit decision dialog uses a wider responsive layout.
- Single-page and component PDF exports now include a linked section index with measured print page numbers, matching the navigation provided by complete audit PDFs.

## Compatibility

Chrome, Edge and Firefox manifests inherit version 1.0.2 from the package metadata. This release does not add permissions, change storage behavior or modify export schemas. Existing local history, saved flows and auditor notes remain compatible.

No new FocusTrace rule ID is introduced; 1.0.2 refines Structure evidence, the applicability/evidence boundary of the existing `FT-REVIEW-012` rule, interface presentation and report navigation.

## Validation

The heading change in #293 and the Bypass Blocks change in #294 each passed FocusTrace CI before merge. The 1.0.2 release candidate must also pass its own CI and release contract before tagging and packaging.

Manual packaged-browser and assistive-technology checks remain tracked in `docs/RELEASE_CHECKLIST.md`. Generate production packages only from the approved release commit; E2E builds contain test-only permissions and must not be distributed.
