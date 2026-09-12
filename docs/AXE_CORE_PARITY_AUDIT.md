# axe-core 4.13.0 parity audit

Status: initial baseline  
FocusTrace baseline: 0.2.9 (`main` at `3b625911523dcdb014b5d1524e5dc4d868d90b67`)  
External benchmark: axe-core 4.13.0  
Tracking issue: #224

## Purpose

This audit measures FocusTrace against the public axe-core rule set so that missing web-auditing coverage can be prioritized without making axe-core a runtime dependency.

WCAG, ACT Rules, WAI-ARIA, AccName, HTML and related standards remain the normative sources. axe-core is used only as an external implementation benchmark. FocusTrace must continue to run locally without a Deque account, API, service or Pro license.

## Verified inventory

### FocusTrace

The 0.2.9 public capability catalog contains 105 identifiers:

| Family | Count |
| --- | ---: |
| Deterministic WCAG rules | 13 |
| Contextual page/site reviews | 28 |
| HTML/ARIA authoring warnings | 21 |
| Runtime WCAG reviews | 16 |
| Runtime ARIA warnings | 6 |
| APG runtime checks | 21 |
| **Total** | **105** |

These counts are not directly comparable with axe-core. FocusTrace includes runtime evidence, APG behavior, contextual review and authoring warnings in the same public catalog.

### axe-core

The synchronized 4.13.0 registry contains 105 rules:

| Impact | Count |
| --- | ---: |
| Critical | 21 |
| Serious | 52 |
| Moderate | 18 |
| Minor | 14 |
| **Total** | **105** |

The current FocusTrace benchmark maps 29 unique axe-core rules to 22 FocusTrace rules. Seventy-six axe rules have no explicit mapping entry. “Unmapped” must not be interpreted as “missing”: several already overlap implemented FocusTrace behavior.

## Classification model

Every axe-core rule must be assigned one relationship:

| Relationship | Meaning |
| --- | --- |
| `equivalent` | The tested applicability, expectation and relevant exceptions are materially equivalent. |
| `partial` | FocusTrace implements a strict subset of the external rule. |
| `superset` | FocusTrace includes the external expectation and adds supported evidence or scope. |
| `overlap` | The rules share some evidence but have materially different applicability or outcomes. |
| `missing` | No implemented FocusTrace check provides the tested expectation. |
| `not-applicable` | Intentionally outside the defined FocusTrace target, with rationale. |

Classification requires source and test evidence. Similar titles or shared WCAG references are insufficient.

## Confirmed current benchmark coverage

The current mapping already covers representative areas including:

- document title;
- image, SVG and image-role alternatives;
- button, link and form-control names;
- hidden focusable content;
- visible label in accessible name;
- page language presence and validity;
- text contrast;
- several core ARIA authoring constraints.

This mapping remains useful but is too coarse to establish complete equivalence.

## Unmapped families

The current benchmark leaves 76 axe-core rules without an explicit relationship.

| Family | Raw unmapped count | Initial interpretation |
| --- | ---: | --- |
| ARIA | 13 | Mixture of genuine name/role gaps and likely validator overlap |
| Names and labels | 7 | Several specialized name sources and duplicate-label cases need review |
| Structure and landmarks | 17 | Some existing review overlap; significant deterministic coverage remains |
| Tables and lists | 9 | Content-model warnings may overlap, but table relationships are a likely gap |
| Media, images and frames | 8 | Existing media reviews overlap; frame-specific rules need attention |
| Visual/CSS | 4 | Target size is already implemented but unmapped; viewport rules need review |
| Keyboard/navigation | 3 | Runtime evidence overlaps; static best-practice expectations differ |
| Forms | 1 | Existing autocomplete review likely overlaps but is deliberately conservative |
| Other/best practice | 14 | Includes existing warning/review overlap and genuine missing checks |
| **Total** | **76** | Must be classified from implementation and tests |

## High-confidence mapping corrections to investigate first

These entries are not yet declared equivalent. They are the first candidates for source-level verification:

| axe-core rule | FocusTrace candidate | Expected relationship |
| --- | --- | --- |
| `target-size` | `FT-WCAG-012` | partial or overlap |
| `duplicate-id` | `FT-WARN-004` | overlap |
| `duplicate-id-active` | `FT-WARN-004` | overlap |
| `nested-interactive` | `FT-WARN-010` | partial or overlap |
| `heading-order` | `FT-REVIEW-002` | partial or overlap |
| `bypass` | `FT-REVIEW-012` | partial |
| `skip-link` | `FT-REVIEW-012` | overlap |
| `autocomplete-valid` | `FT-REVIEW-014` | partial or overlap |
| `identical-links-same-purpose` | `FT-REVIEW-015` | overlap |
| `blink` / `marquee` | `FT-REVIEW-026` | partial or overlap |
| `audio-caption` / `video-caption` | existing media reviews | partial or overlap |
| `no-autoplay-audio` | existing media/motion reviews | partial or overlap |

FocusTrace intentionally reports many of these as REVIEW or WARNING. Matching the same DOM pattern does not justify claiming deterministic equivalence.

## Priority gap order

### P0 — Make the benchmark accurate

1. Extend the mapping schema with relationship and rationale.
2. Classify all existing overlap.
3. Add validation for the new schema.
4. Generate summary counts automatically.
5. Confirm benchmark data and tooling are excluded from browser bundles.
6. Preserve offline release validation.

### P1 — Accessible names and modern ARIA

Review and implement high-impact coverage for:

- dialog names;
- meter and progressbar names;
- tab, tooltip and treeitem names;
- summary names;
- ARIA conditional attributes;
- ARIA descriptions and braille equivalence;
- ElementInternals-backed ARIA and form-associated labels.

The exact outcome type must follow the applicable standard and observable evidence.

### P1 — Frames, landmarks and document structure

Review and implement:

- frame title and uniqueness;
- focusable content in frames;
- explicit untested-frame evidence;
- one-main and unique-landmark expectations;
- top-level landmark placement;
- named/unique regions;
- empty or heading-like paragraph reviews;
- scrollable region keyboard access.

### P1 — Tables and lists

Review and implement:

- native/ARIA list ownership;
- definition-list structure;
- empty table headers;
- table header/data associations;
- `headers` and `scope` validity;
- fake captions and duplicate names.

### P2 — Browser/layout behavior

Review and implement:

- viewport zoom restrictions;
- orientation lock;
- refresh/redirect behavior;
- advanced contrast edge cases;
- hidden content diagnostics;
- generated and rendered content boundaries.

### P2 — Best-practice and authoring signals

Classify separately from WCAG failures:

- access keys;
- redundant alternative text;
- page-level heading guidance;
- region guidance;
- identical-link guidance;
- presentational-role conflicts.

## First functional implementation candidate

After the P0 classification, the first coherent rule family should be **accessible names for specialized ARIA widgets and native disclosure/frame elements**.

Reasons:

- high user impact;
- strong deterministic potential;
- reuse of the current semantic/name infrastructure;
- direct benefit to page and component scans;
- a bounded set of fixtures;
- alignment with current ARIA and ElementInternals changes;
- foundation for guided APG workflows.

The implementation should be split if ElementInternals requires a different page-world collection mechanism or additional permission review.

## Required test evidence

For every relationship or new rule:

- applicable passing example;
- applicable failing or review example;
- inapplicable example;
- hidden-content case;
- native and ARIA variants where relevant;
- invalid-reference case;
- browser-rendered E2E coverage when computed state matters;
- explicit known limitations.

For parity claims, FocusTrace fixtures and external benchmark behavior must be recorded separately. axe-core output must never become the normative reason for a FocusTrace result.

## Release constraints

- No version bump or tag on the audit branch.
- No new runtime network access.
- No broader browser permission without explicit review.
- No copied Pro code, text or gated material.
- Keep README.md and README.es.md semantically aligned for capability changes.
- Update docs/RULES.md when rule behavior changes.
- Run `npm run capabilities:validate` for public capability changes.
- Run `npm run release:check:full` before release work.

## Completion criteria

The audit is complete when:

1. all 105 axe-core rules have an evidence-backed relationship;
2. existing FocusTrace coverage is no longer counted as missing because of absent mappings;
3. genuine gaps have standards references and implementation/test plans;
4. the first functional rule family has shipped through a focused PR;
5. the generated summary can be reproduced by repository validation scripts.
