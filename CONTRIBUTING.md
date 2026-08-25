# Contributing to FocusTrace

Thanks for taking the time to contribute.

FocusTrace is an accessibility testing aid and focus debugger. Contributions should preserve that goal: findings must be explainable, reproducible and mapped to the standards or runtime behavior they test.

## Development setup

Requirements:

- Node.js 22
- npm

Install dependencies and start the development build:

```bash
npm install
npm run dev
```

Useful checks before opening a pull request:

```bash
npm run check
npm test
npm run standards:validate
```

For end-to-end coverage:

```bash
npm run e2e
```

## Pull requests

Keep pull requests focused and describe:

- the problem being solved;
- the expected behavior;
- how the change was tested;
- any accessibility standard, ACT Rule or APG pattern involved;
- screenshots or recordings when the UI changes materially.

Please avoid bundling unrelated refactors with behavior changes unless they are required for the implementation.

## Accessibility rules

When adding or changing an automated rule:

1. Define exactly what evidence the rule evaluates.
2. Link the rule to the relevant WCAG 2.2 success criterion.
3. Reference a W3C ACT Rule when an applicable rule exists.
4. Keep PASS, FAIL and REVIEW outcomes aligned with what the code can actually prove.
5. Add or update tests for positive, negative and ambiguous cases.
6. Document important limitations in `docs/RULES.md`.

Do not turn a heuristic into a conformance claim. If a result still requires human judgment, expose it as review guidance rather than a definitive failure or pass.

## Runtime and focus behavior

Changes to runtime recording should account for dynamic interfaces, including SPA navigation, DOM replacement, dialogs, focus restoration and programmatic focus changes. Prefer evidence that explains the transition rather than only reporting the final focused element.

## Code style

Follow the existing TypeScript and React patterns in the repository. Keep code readable and avoid dependencies when the same behavior can be implemented clearly with the platform APIs already in use.

## Reporting bugs and proposing features

Use GitHub Issues for reproducible bugs, accessibility rule discussions and feature proposals. For security-sensitive reports, follow `SECURITY.md` instead of opening a public issue with vulnerability details.
