# Privacy

FocusTrace is designed as a local-first browser extension.

- Page content, DOM snapshots and runtime events are analyzed inside the browser.
- No OpenAI, Gemini, Claude or other paid AI APIs are required.
- No page content is sent to FocusTrace servers in the initial product architecture.
- FocusTrace requests access to standard HTTP and HTTPS pages because the side panel must inspect the DOM, inject the runtime debugger and highlight findings while it remains open.
- Browser-internal and other restricted pages are outside the auditing scope.
- Page access is used for local accessibility analysis; it does not change the no-upload/no-remote-processing architecture.
