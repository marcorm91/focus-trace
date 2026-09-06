const REDACTED_QUERY = '?[redacted]';
const REDACTED_FRAGMENT = '#[redacted]';
const ABSOLUTE_URL_PATTERN = /^[a-zA-Z][a-zA-Z\d+.-]*:/;

/**
 * Removes URL parts that commonly contain user-entered or session-sensitive data
 * before runtime evidence is persisted or exported.
 *
 * The origin and pathname are retained because they identify the observed route.
 * Query-string values/content and fragment content are replaced with explicit
 * markers. Raw URLs may still be used transiently for in-page change detection.
 */
export function sanitizeRuntimeUrl(rawUrl: string): string {
  try {
    const absolute = ABSOLUTE_URL_PATTERN.test(rawUrl);
    const url = new URL(rawUrl, 'https://focustrace.invalid');
    const route = absolute ? `${url.origin}${url.pathname}` : url.pathname;
    return `${route}${url.search ? REDACTED_QUERY : ''}${url.hash ? REDACTED_FRAGMENT : ''}`;
  } catch {
    return '[redacted-url]';
  }
}
