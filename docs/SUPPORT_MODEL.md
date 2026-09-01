# FocusTrace voluntary support model

FocusTrace may accept voluntary financial support without turning core accessibility functionality into a subscription product.

## Principles

- FocusTrace remains usable without payment.
- Analyze, Trace, Replay, Report, Site Audit and Memory are not gated behind a contribution.
- Supporting the project is optional and must never be presented as required to fix, export or continue an accessibility workflow.
- Do not add recurring nags, countdowns, artificial limits or paywall-style friction.
- Prefer wording such as **Support FocusTrace**, **Sponsor** or **Support development** rather than implying a charitable donation.
- FocusTrace does not process card or bank details. Payments are handled by the external support provider.
- Do not add analytics or tracking merely to measure support conversions.

## Provider strategy

The extension UI is provider-agnostic. `shared/project-links.ts` contains the optional `SUPPORT_URL` destination.

GitHub Sponsors is the preferred initial option because it fits the project/repository workflow and can support one-time contributions where available. The extension must not depend on GitHub Sponsors-specific behavior, so the destination can be replaced later without changing the UI copy.

## Activation

Until a real public support destination exists, keep:

```ts
export const SUPPORT_URL: string | null = null;
```

With `null`, the support block is not rendered in the About view.

When the destination is ready:

1. Set `SUPPORT_URL` to the final public `https://` URL.
2. Verify the destination works without requiring repository access.
3. Update `PRIVACY.md` to state that voluntary support opens an external provider and that FocusTrace does not process payment details.
4. Update `STORE_SUBMISSION.md` with the final support URL and keep store disclosures consistent with the external-payment behavior.
5. Test the About link with keyboard navigation, visible focus and 200% zoom.
6. Only then add a GitHub funding configuration if desired.

## UX placement

The preferred placement is the About view. The support invitation should be visually secondary to product and privacy information and should not interrupt Analyze, Trace, Replay, Report or Site Audit.

Suggested copy:

> FocusTrace remains free to use. If it helps your accessibility work, you can voluntarily support its continued development.

The button label should remain concise: **Support development** / **Apoyar el desarrollo**.

## Release policy

A release can ship with support disabled. The existence of this support model is not a release blocker. Enabling financial support is a deliberate configuration change that should receive the same review as other public links and privacy-sensitive integrations.
