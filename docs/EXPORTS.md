# Versioned exports

FocusTrace can serialize accessibility findings from a page session or Site Audit into a stable interchange model and render that model as JSON, HTML, CSV, SARIF 2.1.0 or JUnit XML.

The export layer is local-first. It operates on results already held by FocusTrace and does not upload inspected-page data to a FocusTrace, Deque or axe service.

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

### Compatibility policy

Within schema major version `1`, patch and minor FocusTrace releases must preserve the meaning and type of existing required fields. New optional fields may be added. A breaking rename, removal or semantic change requires a new schema major version.

Consumers should key compatibility off `schemaVersion`, not the browser-extension version. Tests lock the v1 schema identity and required fields, and JSON export tests round-trip the generated envelope through the supported v1 parser.

## URL privacy

Exports remove URL user/password credentials and common credential-like query parameters such as tokens, session IDs, authorization values, secrets and keys. Common tracking parameters are removed as well.

Exporters do not intentionally persist cookies, browser storage, passwords or authentication headers.

## CSV

CSV output is UTF-8 with a BOM and CRLF line endings for clean opening in Excel and LibreOffice. Every field is quoted and embedded quotes are escaped. Cells beginning with spreadsheet formula prefixes (`=`, `+`, `-`, `@`) are prefixed with an apostrophe to avoid formula execution when a CSV is opened.

The first data row is a `summary` record containing schema version, standard, scope, coverage and FAIL/REVIEW/WARNING counts. Finding rows carry the same scope/coverage context plus normalized evidence and standards provenance.

## HTML

HTML output is a standalone, UTF-8 human-readable report. Finding content is HTML-escaped before rendering. No page scripts or captured DOM are embedded. The report includes standard, scope, coverage, description, evidence, remediation and standards provenance.

## SARIF

SARIF output uses SARIF `2.1.0`, the version supported by GitHub code scanning for third-party results.

FocusTrace keeps its evidence semantics in SARIF:

- deterministic `FAIL` becomes `error` for critical/serious findings and `warning` for lower severities;
- `REVIEW` becomes `note`;
- `WARNING` becomes `note`;
- the original FocusTrace outcome and severity remain available in result properties.

Each result includes a stable synthetic web-artifact location plus the sanitized page URL in location metadata. This makes the document structurally suitable for SARIF ingestion without pretending that a web DOM selector is a repository source-code line. Run-level properties preserve the FocusTrace schema version, standard, scope, coverage and summary.

## JUnit

JUnit uses one testcase per FocusTrace finding:

- only deterministic `FAIL` creates a `<failure>` element and increments the suite failure count;
- `REVIEW` and `WARNING` are non-failing skipped cases with their original outcome in testcase properties;
- evidence is kept in the failure body or `system-out` where available;
- suite properties retain schema version, standard, scope, coverage and outcome totals;
- testcase properties retain standards provenance.

This prevents CI systems from treating a manual-review requirement as a proven accessibility failure.

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

The next CLI/CI layers can use this module without needing browser APIs or a network service.
