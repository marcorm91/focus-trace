# FocusTrace standards registry

FocusTrace keeps a versioned local snapshot of the public standards data it uses to plan and implement accessibility checks. The registry is metadata, not a remote runtime dependency: the browser extension still analyzes pages locally and does not call W3C, ACT Rules or GitHub while scanning.

## Sources

### ACT Rules

`generated/act-catalog.json` is generated from the public `act-rules/act-rules.github.io` repository.

For every ACT rule FocusTrace records:

- ACT id and name
- atomic or composite rule type
- WCAG criteria mapped by the upstream rule
- input aspects such as DOM Tree, Accessibility Tree and CSS Styling
- whether the ACT rule itself is deprecated
- a deterministic `logicHash` derived from implementation-relevant rule content, including Applicability and Expectation
- the upstream source file and URL

The sync intentionally does not use a timestamp and does not store the upstream blob SHA as a change trigger. This keeps registry updates deterministic and avoids pull requests caused only by unrelated metadata or execution time.

An ACT rule becoming deprecated means the **test rule itself** should no longer be used as an active conformance check. FocusTrace keeps deprecated ACT rules in the registry for history and migration, but they are not candidates for new active automated checks.

A new ACT rule is not automatically a FocusTrace `FAIL`. It must still be classified and implemented as appropriate: automated, review, runtime or unsupported.

## WAI-ARIA

`generated/aria-registry.json` is generated from the public `w3c/aria` repository.

FocusTrace consumes W3C's generated `common/script/roleInfo.js` data plus the ARIA specification source. The registry records:

- ARIA specification version
- roles and parent roles
- deprecated roles and the ARIA version in which the role was deprecated when stated in the specification
- the ARIA state/property type table once, globally
- supported, required, prohibited and deprecated state/property lists per role

This normalized structure avoids repeating the same state/property metadata hundreds of times and keeps diffs reviewable.

This distinction matters. A **deprecated ACT rule** is an outdated test. A **deprecated ARIA role or role/property combination** can still exist in an application and is useful evidence for a FocusTrace warning.

Deprecation is therefore preserved rather than discarded. The registry is designed to power a future `WARNING` outcome for obsolete or deprecated authoring patterns without incorrectly turning every deprecation into a WCAG failure.

## Automatic synchronization

`.github/workflows/standards-registry.yml` runs daily and can also be started manually. It:

1. preserves the current snapshots;
2. fetches the public ACT and WAI-ARIA sources;
3. regenerates both registries;
4. validates their structure;
5. compares the old and new registries semantically;
6. does nothing when there is no meaningful change;
7. otherwise updates the dedicated `bot/standards-registry-sync` branch and opens or refreshes one pull request.

The generated report highlights new and removed ACT rules, newly deprecated or reactivated ACT rules, changed ACT rule logic, new/removed/deprecated ARIA roles, newly deprecated role/property combinations, and newly required or prohibited role/property combinations.

If repository settings prevent GitHub Actions from creating a pull request, the workflow falls back to creating an issue with the same change report and fails visibly instead of silently losing the notification.

## Local commands

```bash
npm run act:sync
npm run aria:sync
npm run standards:sync
npm run standards:validate
```

The generated files are committed deliberately. They provide a reviewable history of upstream standards changes and give the extension a future local data source without requiring network access at runtime.
