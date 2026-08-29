# Standards automation

FocusTrace keeps standards data separate from executable audit logic. The standards layer answers **what the upstream standards currently contain**; FocusTrace rules answer **what the extension can evaluate reliably today**.

This separation prevents a newly published requirement from silently becoming an automated accessibility failure without an implemented evaluator and evidence model.

## Synchronized registries

`npm run standards:sync` refreshes all structured registries in parallel:

| Registry | Upstream source | Generated snapshot |
| --- | --- | --- |
| WCAG 2.2 success criteria | W3C WCAG 2.2 Recommendation | `generated/wcag-catalog.json` |
| ACT Rules | ACT Rules community repository | `generated/act-catalog.json` |
| WAI-ARIA roles/states/properties | W3C ARIA source registry | `generated/aria-registry.json` |
| HTML obsolete authoring features | WHATWG HTML Living Standard | `generated/html-obsolete-catalog.json` |
| Language subtags | IANA Language Subtag Registry | `generated/language-subtags.json` |
| Standards source fingerprints | W3C / WHATWG / IANA | `generated/standards-sources.json` |

Individual commands are available as `wcag:sync`, `act:sync`, `aria:sync`, `html:sync`, `language:sync` and `specs:sync`.

## Monitored specifications

The source monitor fingerprints specifications that FocusTrace depends on even when they do not expose a convenient machine-readable registry:

- WCAG 2.2;
- Understanding WCAG 2.2;
- WCAG 2.2 Techniques;
- HTML Living Standard and its obsolete-features section;
- WAI-ARIA;
- Accessible Name and Description Computation (AccName);
- HTML Accessibility API Mappings (HTML-AAM);
- Core Accessibility API Mappings (Core-AAM);
- ARIA Authoring Practices Guide (APG);
- MIME Sniffing Living Standard;
- IANA Language Subtag Registry.

A content fingerprint change is review evidence, not an automatic product-rule change.

## Validation

`npm run standards:validate` validates each generated schema and also cross-checks registry relationships. In particular:

- WCAG criterion identifiers, levels, statuses and hashes are validated;
- ACT mappings must resolve to a criterion present in the WCAG catalog;
- ARIA roles can only reference known states/properties;
- HTML obsolete element/attribute snapshots must meet minimum structural expectations;
- IANA language entries must be unique and valid;
- every monitored specification needs a stable content fingerprint.

Unit tests additionally resolve FocusTrace's own WCAG/ACT references against the generated registries and compare the implemented obsolete-HTML registry with the current WHATWG snapshot.

## Automated maintenance workflow

`.github/workflows/standards-registry.yml` runs every day and can also be dispatched manually. It:

1. preserves the committed snapshots;
2. synchronizes all public standards sources;
3. validates schemas and cross-links;
4. produces a human-readable diff for WCAG, ACT, ARIA, HTML, IANA and monitored specifications;
5. opens or refreshes a standards update pull request when upstream data changed;
6. falls back to an issue if a pull request cannot be created.

On a development branch the workflow can commit freshly bootstrapped snapshots directly to that branch so new registry tooling can be tested in the same pull request.

## Coverage is not conformance

The WCAG catalog intentionally contains the complete upstream success-criteria set, including criteria FocusTrace does not yet evaluate. Tests assert that FocusTrace references only valid current criteria, but they also assert that the implemented rules cover only a subset of the complete catalog.

That distinction is deliberate:

- **catalogued** means FocusTrace knows the current upstream requirement;
- **automated** means FocusTrace has deterministic evidence for a specific expectation;
- **review** means FocusTrace can surface a useful signal but context is still required;
- **runtime** means the requirement is evaluated from recorded interaction behavior;
- **not implemented** means the requirement remains visible as a coverage gap rather than being implied as tested.

A future coverage UI/report can therefore be generated from these registries without claiming full WCAG conformance.
