# Versioned exports

FocusTrace can serialize accessibility findings from a page session or Site Audit into a stable interchange model and render that model as JSON, HTML, CSV, SARIF 2.1.0 or JUnit XML.

The export layer is local-first. It operates on results already held by FocusTrace and does not upload inspected-page data to a FocusTrace, Deque or axe service. The reusable core and local CLI consume this same serialization contract; the browser extension does not need a separate exporter implementation.

## JSON contract

The canonical interchange contract is `schemas/focustrace-export-v1.schema.json`.

Current schema version: `1.0.0`.

Every export envelope includes:

- `$schema` and `schemaVersion`;
- export `kind` (`session` or `site-audit`);
- generation timestamp and subject metadata;
- the normative producer standard (`WCAG 2.2`);
- required `context.scope` and `context.coverage` objects;
- normalized FAIL, REVIEW and WARNING counts;
- normalized findings with rule ID, severity, source, evidence, remediation and standards references when available;
- lifecycle and auditor workflow metadata when it exists on the source finding.

For a page session, coverage includes rule/pass and static/runtime finding counts. For Site Audit, scope preserves the configured discovery/page/sample limits and exclusions, while coverage records discovered URLs, route families, sampled/scanned pages, failed pages and whether discovery was truncated.

The local CLI also adds its normalized audit-profile snapshot and baseline-compatibility result to the open `metadata` object. These are optional producer metadata and do not change the v1 required-field contract.

### Compatibility policy

Within schema major version `1`, patch and minor FocusTrace releases must preserve the meaning and type of existing required fields. New optional fields may be added. A breaking rename, removal or semantic change requires a new schema major version.

Consumers should key compatibility off `schemaVersion`, not the browser-extension version. Tests lock the v1 schema identity and required fields, and JSON export tests round-trip the generated envelope through the supported v1 parser.

## URL privacy

Exports reuse the same URL privacy policy as runtime evidence. Absolute URLs retain only origin and pathname. Relative URLs retain only pathname. Query-string content and fragment content are replaced wholesale with explicit `[redacted]` markers, so user-entered values, tracking data, tokens and session material are not copied into the export. URL user/password credentials are not retained, and malformed URL-like input becomes `[redacted-url]` rather than being echoed back.

Exporters do not intentionally persist cookies, browser storage, passwords, authentication headers or form values.

## CSV

CSV output is UTF-8 with a BOM and CRLF line endings for clean opening in Excel and LibreOffice. Every field is quoted and embedded quotes are escaped. Cells beginning with spreadsheet formula prefixes (`=`, `+`, `-`, `@`) are prefixed with an apostrophe to avoid formula execution when a CSV is opened.

The first data row is a `summary` record containing schema version, standard, scope, coverage and FAIL/REVIEW/WARNING counts. Finding rows carry the same scope/coverage context plus normalized evidence, remediation and standards provenance. Tests also assert that summary and finding records keep the same column count.

## HTML

HTML output is a standalone, UTF-8 human-readable report. Finding content is HTML-escaped before rendering. No page scripts or captured DOM are embedded. The report includes standard, scope, coverage, description, evidence, remediation and standards provenance.

## SARIF

SARIF output uses SARIF `2.1.0`, the version supported by GitHub code scanning for third-party results.

FocusTrace keeps its evidence semantics in SARIF:

- deterministic `FAIL` becomes `error` for critical/serious findings and `warning` for lower severities;
- `REVIEW` becomes `note`;
- `WARNING` becomes `note`;
- the original FocusTrace outcome and severity remain available in result properties.

Each result includes a stable synthetic web-artifact location plus the sanitized page URL in location metadata. This makes the document structurally suitable for SARIF ingestion without pretending that a web DOM selector is a repository source-code line. Run-level properties preserve the FocusTrace schema version, standard, scope, coverage and summary as portable property values.

## JUnit

In the extension, open **Report → More formats → Export JUnit (.xml)** on a page/component report. This works for saved reviews without a Trace recording; historical exports include only their saved static findings, never another page's live events. It downloads results, not an executable test suite. Markdown/JSON options in this menu remain Trace-evidence exports and require recorded focus events.

JUnit uses one testcase per FocusTrace finding:

- only deterministic `FAIL` creates a `<failure>` element and increments the suite failure count;
- `REVIEW` and `WARNING` are non-failing skipped cases with their original outcome in testcase properties;
- evidence is kept in the failure body or `system-out` where available;
- suite properties retain schema version, standard, scope, coverage and outcome totals;
- testcase properties retain standards provenance and remediation guidance.

This prevents CI systems from treating a manual-review requirement as a proven accessibility failure.

## Remediation

Static and Site Audit findings reuse FocusTrace's existing rule-specific remediation engine. Runtime findings are converted to the same finding shape before remediation is resolved, so known runtime rules receive their concrete guidance and other rules receive the existing evidence/standard-based fallback. The export layer does not relabel a finding description as remediation.

## Large exports

The renderers operate in a single pass over normalized findings apart from bounded maps used for SARIF rule de-duplication. Tests cover a 5,000-finding result set, Unicode, escaping and spreadsheet-safe CSV output.

## API

The pure export functions live in `lib/report/versioned-export.ts`:

- `buildSessionExport`
- `buildSiteAuditExport`
- `parseVersionedJson`
- `renderVersionedJson`
- `renderVersionedHtml`
- `renderVersionedCsv`
- `renderVersionedSarif`
- `renderVersionedJUnit`
- `renderVersionedExport`

The reusable core exposes this module through `lib/core/index.ts`, and the local CLI documented in [`CLI.md`](./CLI.md) consumes it after running the same production scanner used by the extension.
