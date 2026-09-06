import { describe, expect, it } from 'vitest';
import { sanitizeRuntimeUrl } from '../lib/runtime/url-privacy';

describe('runtime URL privacy', () => {
  it('keeps route identity while redacting query and fragment content', () => {
    expect(
      sanitizeRuntimeUrl('https://user:password@app.test/search?q=private@example.com&token=secret#account-private'),
    ).toBe('https://app.test/search?[redacted]#[redacted]');
  });

  it('supports relative route evidence without exposing dynamic URL content', () => {
    expect(sanitizeRuntimeUrl('/checkout?email=private@example.com#payment-secret'))
      .toBe('/checkout?[redacted]#[redacted]');
  });

  it('leaves routes without query or fragment data unchanged', () => {
    expect(sanitizeRuntimeUrl('https://app.test/settings')).toBe('https://app.test/settings');
    expect(sanitizeRuntimeUrl('/settings')).toBe('/settings');
  });

  it('does not echo malformed URL input', () => {
    expect(sanitizeRuntimeUrl('http://[invalid-secret')).toBe('[redacted-url]');
  });
});
