# FocusTrace voluntary support model

FocusTrace accepts voluntary financial support without turning core accessibility functionality into a subscription product.

## Principles

- FocusTrace remains usable without payment.
- Analyze, Trace, Replay, Report, Site Audit and Memory are not gated behind a contribution.
- Supporting the project is optional and must never be presented as required to fix, export or continue an accessibility workflow.
- Do not add recurring nags, countdowns, artificial limits or paywall-style friction.
- Prefer wording such as **Support FocusTrace**, **Sponsor** or **Support development** rather than implying a charitable donation.
- FocusTrace does not process card or bank details. Payments are handled by the external support provider.
- Do not add analytics or tracking merely to measure support conversions.

## Provider strategy

The extension UI remains provider-agnostic. `shared/project-links.ts` contains the `SUPPORT_URL` destination.

The initial provider is GitHub Sponsors at `https://github.com/sponsors/marcorm91`. The extension must not depend on GitHub Sponsors-specific behavior, so the destination can be replaced later without changing the UI copy.

## Active configuration

Voluntary support is enabled with:

```ts
export const SUPPORT_URL: string | null = 'https://github.com/sponsors/marcorm91';
```

The public destination has been configured by the project owner. If support is ever disabled again, set `SUPPORT_URL` back to `null`; support UI will then not render and no empty footer space will be reserved.

When changing the support destination:

1. Use a final public `https://` URL.
2. Verify the destination works without requiring repository access.
3. Keep `PRIVACY.md` aligned with the external provider and payment-data behavior.
4. Keep `STORE_SUBMISSION.md` aligned with the final support URL.
5. Test both the About support block and compact global footer with keyboard navigation, visible focus and 200% zoom.
6. Keep `.github/FUNDING.yml` synchronized with the active public sponsorship destination when applicable.

## UX placement

Support appears in two deliberately low-pressure locations:

- **About**: the primary explanatory location, with context that FocusTrace remains free and support is voluntary.
- **Global footer**: a compact **Support FocusTrace / Apoyar FocusTrace** link shown across the side-panel views and the separate Site Audit screen.

The global footer must remain visually secondary to the active workflow and must not be fixed over content, interrupt navigation or appear in printed/exported reports.

Suggested About copy:

> FocusTrace remains free to use. If it helps your accessibility work, you can voluntarily support its continued development.

The About button label should remain concise: **Support development** / **Apoyar el desarrollo**. The global footer uses the shorter **Support FocusTrace** / **Apoyar FocusTrace** label.

## Release policy

The release may include voluntary support because the destination is real, public and optional. Financial support remains a configuration reviewed like any other public link or privacy-sensitive integration and is not a prerequisite for using FocusTrace.
