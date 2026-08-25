# Security Policy

## Supported versions

FocusTrace is currently in active early development. Security fixes are applied to the latest code on `main`; older development builds are not maintained as separate supported release lines.

## Reporting a vulnerability

Please do not publish vulnerability details in a public issue.

If GitHub's private vulnerability reporting option is available for this repository, use **Security → Report a vulnerability**.

If private vulnerability reporting is not available, open a minimal GitHub issue stating that you need a private channel to report a security problem. Do not include exploit details, secrets, affected page content or other sensitive information in that issue.

A useful private report should include:

- the affected FocusTrace version or commit;
- browser and operating system;
- reproduction steps;
- expected and observed behavior;
- impact assessment;
- a proof of concept when appropriate, without unrelated private data.

## Scope

Security reports are especially relevant when they involve extension permissions, script injection boundaries, storage of analysis data, exposure of page content, unsafe handling of exported reports or a way for inspected pages to interfere with FocusTrace's privileged extension context.

FocusTrace is designed to analyze page accessibility locally in the browser. Any unexpected transmission of inspected page content or recorded interaction data should be treated as security-sensitive.
