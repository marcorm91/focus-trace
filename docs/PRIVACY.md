# Privacy

FocusTrace is designed as a local-first browser extension.

- Page content, DOM snapshots and runtime events are analyzed inside the browser.
- No OpenAI, Gemini, Claude or other paid AI APIs are required.
- No page content is sent to FocusTrace servers in the initial product architecture.
- Standard HTTP and HTTPS page access is optional at install time. FocusTrace asks for it from an explicit Analyze/Trace page action when local DOM inspection, runtime debugger injection or page highlighting is needed.
- If page access is not granted, FocusTrace does not inspect that page and explains that the permission is required for the requested action.
- Browser-internal and other restricted pages are outside the auditing scope.
- Page access is used for local accessibility analysis; it does not change the no-upload/no-remote-processing architecture.
