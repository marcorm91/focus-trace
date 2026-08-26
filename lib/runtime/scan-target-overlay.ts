export type ScanTargetHighlightTone = 'ok' | 'review' | 'fail';

export interface ScanTargetHighlightOptions {
  tone?: ScanTargetHighlightTone;
  label?: string;
  focusTarget?: boolean;
  durationMs?: number;
}

export interface ScanTargetHighlightResult {
  found: boolean;
  selector: string;
}

export function clearScanTargetHighlightInPage(): { removed: boolean } {
  const existing = document.querySelector('[data-focustrace-scan-highlight]');
  if (!existing) return { removed: false };
  existing.remove();
  return { removed: true };
}

export function locateScanTargetInPage(
  selector: string,
  options: ScanTargetHighlightOptions = {},
): ScanTargetHighlightResult {
  document.querySelector('[data-focustrace-scan-highlight]')?.remove();

  let target: Element | null = null;
  try {
    target = document.querySelector(selector);
  } catch {
    return { found: false, selector };
  }
  if (!target) return { found: false, selector };

  target.scrollIntoView({ block: 'center', inline: 'center', behavior: 'auto' });

  if (options.focusTarget !== false && target instanceof HTMLElement) {
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

  const tone = options.tone ?? 'fail';
  const colors: Record<ScanTargetHighlightTone, { solid: string; ring: string; fill: string }> = {
    ok: {
      solid: '#08745b',
      ring: 'rgba(8, 116, 91, 0.22)',
      fill: 'rgba(8, 116, 91, 0.06)',
    },
    review: {
      solid: '#b54708',
      ring: 'rgba(181, 71, 8, 0.22)',
      fill: 'rgba(181, 71, 8, 0.06)',
    },
    fail: {
      solid: '#b42318',
      ring: 'rgba(180, 35, 24, 0.22)',
      fill: 'rgba(180, 35, 24, 0.06)',
    },
  };
  const color = colors[tone];
  const rect = target.getBoundingClientRect();
  const overlay = document.createElement('div');
  overlay.setAttribute('data-focustrace-scan-highlight', 'true');
  overlay.setAttribute('data-focustrace-tone', tone);
  overlay.setAttribute('aria-hidden', 'true');
  Object.assign(overlay.style, {
    position: 'fixed',
    top: `${Math.max(0, rect.top - 4)}px`,
    left: `${Math.max(0, rect.left - 4)}px`,
    width: `${Math.max(0, rect.width + 8)}px`,
    height: `${Math.max(0, rect.height + 8)}px`,
    border: `3px solid ${color.solid}`,
    borderRadius: '6px',
    background: color.fill,
    boxShadow: `0 0 0 4px ${color.ring}`,
    pointerEvents: 'none',
    zIndex: '2147483647',
    boxSizing: 'border-box',
  });

  const badge = document.createElement('span');
  badge.textContent = options.label ?? 'FocusTrace';
  Object.assign(badge.style, {
    position: 'absolute',
    top: rect.top >= 32 ? '-27px' : '4px',
    left: '-3px',
    maxWidth: 'min(420px, calc(100vw - 24px))',
    padding: '3px 8px',
    borderRadius: '5px',
    background: color.solid,
    color: '#fff',
    font: '700 14px/1.4 system-ui, sans-serif',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    boxShadow: '0 2px 7px rgba(0, 0, 0, 0.2)',
  });
  overlay.append(badge);
  document.documentElement.append(overlay);

  const durationMs = options.durationMs ?? 4000;
  if (durationMs > 0) window.setTimeout(() => overlay.remove(), durationMs);

  return { found: true, selector };
}
