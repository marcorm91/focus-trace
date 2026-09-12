# axe-core 4.13.0 parity audit

Status: exhaustive classification complete  
FocusTrace baseline: 0.2.9  
External benchmark: axe-core 4.13.0  
Baseline tracking issue: #224  
Classification tracking issue: #225

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

## Classification model

Every axe-core 4.13.0 rule is assigned exactly one relationship:

| Relationship | Meaning |
| --- | --- |
| `equivalent` | The tested applicability, expectation and relevant exceptions are materially equivalent. |
| `partial` | FocusTrace implements a strict subset of the external rule. |
| `superset` | FocusTrace includes the external expectation and adds supported evidence or scope. |
| `overlap` | The rules share meaningful evidence but have materially different applicability or outcomes. |
| `missing` | No implemented FocusTrace check provides the tested expectation. |
| `not-applicable` | Intentionally outside the defined FocusTrace target, with a documented rationale. |

Classification is conservative. Similar titles, common selectors or shared WCAG references are not enough to claim equivalence. Each non-missing relationship points to concrete FocusTrace rule identifiers and an evidence set containing implementation and test files.

## Reviewed parity summary

The exhaustive review of all 105 axe-core 4.13.0 rules produces this baseline:

| Relationship | Rules |
| --- | ---: |
| Equivalent | 5 |
| Partial | 23 |
| Superset | 10 |
| Overlap | 21 |
| Missing | 45 |
| Not applicable | 1 |
| **Total** | **105** |

`covered` is reported as 59 rules: equivalent + partial + superset + overlap. This is a planning metric only. It does **not** mean FocusTrace behaves identically to axe-core for 59 rules; only the five `equivalent` entries make that stronger claim.

The one `not-applicable` rule is `frame-tested`. That rule checks whether axe-core itself was injected into nested frames. Requiring axe-core injection would conflict with FocusTrace's local, independent runtime architecture and therefore is not a functional parity target.

## Data layout

The benchmark is development-only data:

- `generated/axe-rule-severities.json` stores the pinned axe-core 4.13.0 public rule inventory and impact metadata.
- `config/axe-equivalents.json` stores the schema, benchmark policy, reproducible summary, severity mappings and evidence sets.
- `config/axe-parity/*.json` stores the exhaustive per-rule classifications.
- `tools/axe-validate.mjs` validates the registry, schema, relationships, evidence references and summary.
- `tools/axe-parity-summary.mjs` prints the reproducible coverage summary and the current missing rule IDs.
- `tests/axe-parity-benchmark.test.ts` enforces the 105/105 classification invariant and verifies evidence paths exist.

Run:

```bash
npm run axe:validate
npm run axe:summary
```

`npm run release:check` already includes `npm run axe:validate`.

## Bundle isolation

The benchmark must never become a runtime dependency.

Browser-build validation checks that the benchmark files are absent from Chrome, Edge and Firefox output and also scans generated text assets for benchmark-only sentinels. This protects against an accidental future import that would bundle the external benchmark data into the extension.

There is no runtime axe-core/Deque API, service, account or network dependency.

## What the classification changes publicly

Nothing in #225 changes FocusTrace rule behavior or user-facing capability identifiers. The English and Spanish public catalogs therefore remain unchanged for this issue. A later functional rule PR must update the appropriate public catalogs and rule documentation when it changes actual product capability.

## Confirmed strengths in the current baseline

The review confirms meaningful existing FocusTrace coverage across:

- document title and page language;
- image, SVG and image-role alternatives;
- button, link and form-control naming;
- several ARIA vocabulary, role, state/property and ownership checks;
- hidden focusable content;
- visible-label-in-name analysis;
- text contrast and use-of-color evidence;
- target-size review;
- HTML structural/content-model validation;
- heading, landmark and bypass reviews;
- media alternatives and pause/stop/hide evidence;
- runtime keyboard/focus evidence that has no direct static axe equivalent.

The relationship type must still be consulted before treating any of those areas as equivalent.

## Genuine gaps established by the review

Forty-five axe-core rules currently have no implemented FocusTrace expectation matching their tested condition. Important gap families include:

### Accessible names and modern ARIA

- dialog, meter, progressbar, tab, tooltip and treeitem naming;
- ARIA conditional attributes;
- ARIA required owned-child presence;
- braille-equivalent naming;
- host-element allowed-role restrictions.

### Frames, landmarks and document structure

- frame titles and frame-title uniqueness;
- focusable frame content;
- banner/contentinfo placement and uniqueness;
- full landmark-region coverage;
- empty headings and page-level h1 guidance.

### Tables

- `headers` IDREF relationships;
- header-to-data-cell association;
- empty table headers;
- `scope` validity;
- fake captions and duplicate table naming.

### Browser, media and authoring behavior

- accesskey uniqueness;
- meta refresh variants;
- `user-scalable` / `maximum-scale` viewport restrictions at the 200% and 500% thresholds;
- autoplaying audio or audible video beyond three seconds without a stop/mute mechanism;
- CSS orientation locking;
- server-side image maps;
- object alternatives;
- scrollable-region focusability;
- redundant image alternative text.

The machine-readable classification files are the source of truth for the complete list.

## Priority after classification

The first functional implementation family remains **accessible names for specialized ARIA widgets and related native elements**.

This is a strong next step because it has high user impact, can reuse the current semantic/name infrastructure, is largely deterministic, has a bounded fixture surface and closes several explicit benchmark gaps without coupling FocusTrace to axe-core implementation details.

Candidate gaps include:

- `aria-dialog-name`;
- `aria-meter-name`;
- `aria-progressbar-name`;
- `aria-tab-name`;
- `aria-tooltip-name`;
- `aria-treeitem-name`;
- `summary-name`;
- frame accessible names in a separate focused change if frame collection requires different runtime handling.

## Required evidence for later parity changes

For every relationship change or new FocusTrace rule, prefer evidence covering:

- an applicable passing example;
- an applicable failing or review example;
- an inapplicable example;
- hidden-content behavior where relevant;
- native and ARIA variants where relevant;
- invalid-reference behavior;
- browser-rendered E2E coverage when computed state matters;
- explicit known limitations.

FocusTrace fixtures and external benchmark behavior must be recorded separately. axe-core output must never become the normative reason for a FocusTrace result.

## Release constraints

- No version bump or tag for the audit/classification work.
- No new runtime network access.
- No broader browser permission without explicit review.
- No copied Pro code, text or gated material.
- Keep README.md and README.es.md semantically aligned when public capabilities change.
- Update docs/RULES.md when rule behavior changes.
- Run `npm run capabilities:validate` for public capability changes.
- Run `npm run release:check:full` before release work.

## Completion criteria for #225

#225 is complete when:

1. all 105 axe-core 4.13.0 rules are classified exactly once;
2. every relationship includes rationale and standards references;
3. implemented relationships point to FocusTrace source/test evidence;
4. validation fails on missing, duplicate or inconsistent classifications;
5. the summary is reproducible from repository data;
6. benchmark-only data is excluded from browser builds;
7. no runtime axe-core dependency is introduced.
