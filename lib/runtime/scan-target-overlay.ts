export interface ScanTargetHighlightResult {
  found: boolean;
  selector: string;
}

export function locateScanTargetInPage(selector: string): ScanTargetHighlightResult {
  const existing = document.querySelector('[data-focustrace-scan-highlight]');
  existing?.remove();

  let target: Element | null = null;
  try {
    target = document.querySelector(selector);
  } catch {
    return { found: false, selector };
  }
  if (!target) return { found: false, selector };

  target.scrollIntoView({ block: 'center', inline: 'center', behavior: 'auto' });

  if (target instanceof HTMLElement) {
    const naturallyFocusable = target.matches(
      'a[href], button, input, select, textarea, summary, iframe, [contenteditable="true"], [tabindex]',
    );
    const previousTabindex = target.getAttribute('tabindex');
    if (!naturallyFocusable) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
    if (!naturallyFocusable) {
      if (previousTabindex == null) target.removeAttribute('tabindex');
      else target.setAttribute('tabindex', previousTabindex);
    }
  }

  const rect = target.getBoundingClientRect();
  const overlay = document.createElement('div');
  overlay.setAttribute('data-focustrace-scan-highlight', 'true');
  overlay.setAttribute('aria-hidden', 'true');
  Object.assign(overlay.style, {
    position: 'fixed',
    top: `${Math.max(0, rect.top - 3)}px`,
    left: `${Math.max(0, rect.left - 3)}px`,
    width: `${Math.max(0, rect.width + 6)}px`,
    height: `${Math.max(0, rect.height + 6)}px`,
    border: '3px solid #d93025',
    borderRadius: '4px',
    boxShadow: '0 0 0 4px rgba(217, 48, 37, 0.2)',
    pointerEvents: 'none',
    zIndex: '2147483647',
    boxSizing: 'border-box',
  });

  const badge = document.createElement('span');
  badge.textContent = 'FocusTrace';
  Object.assign(badge.style, {
    position: 'absolute',
    top: '-25px',
    left: '-3px',
    padding: '3px 7px',
    borderRadius: '4px 4px 0 0',
    background: '#d93025',
    color: '#fff',
    font: '600 12px/1.4 system-ui, sans-serif',
    whiteSpace: 'nowrap',
  });
  overlay.append(badge);
  document.documentElement.append(overlay);
  window.setTimeout(() => overlay.remove(), 4000);

  return { found: true, selector };
}
