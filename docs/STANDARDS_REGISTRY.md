# FocusTrace standards registry

FocusTrace keeps versioned local snapshots of public standards data used to plan and implement accessibility checks. These registries are build-time/repository data, not runtime services: scanning an inspected page remains local and does not call W3C, ACT Rules, IANA or GitHub.

## Sources

### ACT Rules

`generated/act-catalog.json` is generated from the public `act-rules/act-rules.github.io` repository. It records ACT id/name, atomic/composite type, mapped WCAG criteria, input aspects, deprecated state, source URL and a deterministic `logicHash` derived from implementation-relevant content such as Applicability and Expectation.

A deprecated ACT rule is retained for history and migration but is not a candidate for a new active FocusTrace conformance check. A newly discovered ACT rule is also not automatically a FocusTrace `FAIL`; it still needs classification as AUTO, REVIEW, RUNTIME or UNSUPPORTED.

### WAI-ARIA

`generated/aria-registry.json` is generated from the public `w3c/aria` repository. FocusTrace consumes W3C's generated `common/script/roleInfo.js` plus the specification source and stores:

- ARIA version;
- roles and parent roles;
- deprecated roles and stated deprecation version;
- the state/property type table once globally;
- supported, required, prohibited and deprecated state/property lists per role.

This normalized representation is consumed directly by the scan engine for ARIA authoring warnings and will be reused for later ACT-backed ARIA conformance rules.

### IANA Language Subtag Registry

`generated/language-subtags.json` is generated from the public IANA Language Subtag Registry. FocusTrace records only entries whose registry `Type` is `language`, plus deprecation metadata and preferred values when available.

IANA is always the authority and primary download location. A public GitHub copy of the same registry is used only as an availability fallback, and the sync refuses to replace a committed snapshot with an older `File-Date`.

This snapshot is the local source for the primary-language check behind `FT-WCAG-009` / ACT `bf051a`. It avoids relying on browser-specific locale APIs and keeps scans deterministic/offline.

## Deprecation semantics

A **deprecated ACT rule** is an outdated test methodology and is not executed as a current conformance rule.

A **deprecated ARIA role or role/property combination** can still appear in an application. FocusTrace keeps it as authoring evidence and reports it as `WARNING`, not automatically as a WCAG `FAIL`.

Deprecated IANA language subtags remain known language subtags for the ACT primary-language expectation; their deprecation metadata is preserved so future authoring guidance can distinguish validity from preferred modern usage.

## Automatic synchronization

`.github/workflows/standards-registry.yml` runs daily and can also be started manually. It:

1. preserves the ACT, ARIA and IANA snapshots;
2. fetches all three public sources in parallel where possible;
3. regenerates the registries;
4. validates structure, uniqueness and cross-references;
5. compares old/new snapshots semantically;
6. does nothing when there is no meaningful change;
7. otherwise updates `bot/standards-registry-sync` and opens or refreshes one PR.

Reports highlight ACT additions/removals/logic changes/deprecations, ARIA role/property constraint changes, and IANA language-subtag additions/removals/deprecations. If Actions cannot open a PR, the workflow falls back to an issue instead of silently losing the signal.

## Local commands

```bash
npm run act:sync
npm run aria:sync
npm run language:sync
npm run standards:sync
npm run standards:validate
```

Generated files are committed deliberately: they provide reviewable upstream history and let the extension consume current standards metadata without a network dependency at runtime.
