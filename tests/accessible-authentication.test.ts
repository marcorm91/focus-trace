import { beforeEach, describe, expect, it } from 'vitest';
import { evaluateAccessibleAuthentication } from '../lib/audit/accessible-authentication';
import { runFocusTraceScan } from '../lib/audit/scan';

beforeEach(() => {
  document.documentElement.innerHTML = '<head><title>Authentication test</title></head><body></body>';
});

describe('accessible authentication review', () => {
  it('reviews an explicitly marked current-password field whose inline handler blocks paste', () => {
    document.body.innerHTML = `
      <form>
        <label for="password">Password</label>
        <input id="password" type="password" autocomplete="current-password" onpaste="return false" />
      </form>
    `;

    const evaluations = evaluateAccessibleAuthentication(document);
    expect(evaluations).toHaveLength(1);
    expect(evaluations[0]?.purpose).toBe('current-password');
    expect(evaluations[0]?.detail).toContain('return false');
  });

  it('reviews a one-time-code field when a containing form cancels paste', () => {
    document.body.innerHTML = `
      <form onpaste="event.preventDefault()">
        <label for="code">Verification code</label>
        <input id="code" inputmode="numeric" autocomplete="one-time-code" />
      </form>
    `;

    const evaluations = evaluateAccessibleAuthentication(document);
    expect(evaluations).toHaveLength(1);
    expect(evaluations[0]?.purpose).toBe('one-time-code');
    expect(evaluations[0]?.blocker.tagName).toBe('FORM');
  });

  it('reviews a username field only when the same form exposes an authentication credential purpose', () => {
    document.body.innerHTML = `
      <form>
        <input id="username" autocomplete="username" onpaste="return(false)" />
        <input id="password" type="password" autocomplete="current-password" />
      </form>
    `;
    expect(evaluateAccessibleAuthentication(document).map((item) => item.element.id)).toEqual(['username']);

    document.body.innerHTML = '<input id="standalone" autocomplete="username" onpaste="return false" />';
    expect(evaluateAccessibleAuthentication(document)).toEqual([]);
  });

  it('does not treat new-password, benign paste handlers or unavailable fields as authentication blockers', () => {
    document.body.innerHTML = `
      <input type="password" autocomplete="new-password" onpaste="return false" />
      <input type="password" autocomplete="current-password" onpaste="window.telemetry = true" />
      <input type="password" autocomplete="current-password" onpaste="return false" readonly />
      <input type="password" autocomplete="current-password" onpaste="return false" disabled />
      <input type="password" autocomplete="current-password" onpaste="return false" hidden />
    `;

    expect(evaluateAccessibleAuthentication(document)).toEqual([]);
  });

  it('adds a REVIEW finding without retaining the authentication value', () => {
    document.body.innerHTML = `
      <form>
        <label for="password">Password</label>
        <input id="password" type="password" autocomplete="current-password" value="do-not-retain-me" onpaste="event.preventDefault()" />
      </form>
    `;

    const scan = runFocusTraceScan();
    const finding = scan.review.find((issue) => issue.ruleId === 'FT-REVIEW-024');
    expect(finding).toBeDefined();
    expect(finding?.outcome).toBe('review');
    expect(finding?.evidence).toContain('FocusTrace did not inspect or retain the field value');
    expect(JSON.stringify(finding)).not.toContain('do-not-retain-me');
    expect(scan.issues.some((issue) => issue.ruleId === 'FT-REVIEW-024')).toBe(false);
  });
});
