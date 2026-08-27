# Security Policy

## Supported versions

FocusTrace is in active early development. Security fixes are applied to the latest code on `main` and to the latest published release when one exists. Older development artifacts and preview builds are not maintained as separate supported release lines.

## Reporting a vulnerability

Please do **not** publish exploit details, secrets, inspected-page content or other sensitive information in a public issue.

Once the repository is public, use GitHub **Private Vulnerability Reporting** when it is enabled: **Security → Report a vulnerability**.

If private vulnerability reporting is temporarily unavailable, open a minimal GitHub issue stating only that you need a private channel to report a security problem. Do not include vulnerability details in that issue.

A useful private report should include:

- the affected FocusTrace version or commit;
- browser and operating system;
- reproduction steps;
- expected and observed behavior;
- impact assessment;
- a proof of concept when appropriate, without unrelated private data.

## Security-sensitive areas

Reports are especially relevant when they involve:

- extension permission boundaries;
- script injection or message-passing boundaries;
- privileged extension contexts being influenced by inspected pages;
- storage or unintended disclosure of analysis data;
- exported reports or optional screenshot evidence exposing more content than intended;
- dependency or build-chain compromise;
- unsafe handling of external links or user-controlled URLs.

## Privacy expectation

FocusTrace is designed to analyze accessibility locally in the browser. Any unexpected transmission of inspected-page content, DOM-derived evidence, screenshots or recorded interaction data should be treated as security-sensitive.

See [`PRIVACY.md`](PRIVACY.md) for the intended data-handling model.

## Disclosure

Please allow reasonable time to investigate and prepare a fix before public disclosure. When appropriate, the project will credit reporters who want to be acknowledged.
