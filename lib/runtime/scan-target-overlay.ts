export type ScanTargetHighlightTone = 'inspect' | 'ok' | 'review' | 'fail';

export interface ScanTargetHighlightOptions {
  tone?: ScanTargetHighlightTone;
  label?: string;
  focusTarget?: boolean;
  durationMs?: number;
}

export interface ScanTargetHighlightResult {
  found: boolean;
  selector: string;
  snippet?: string;
}

export function clearScanTargetHighlightInPage(): { removed: boolean } {
  const existing = document.querySelector('[data-focustrace-scan-highlight]');
  if (!existing) return { removed: false };
  existing.remove();
  return { removed: true };
}

/**
 * IMPORTANT: keep this function self-contained.
 *
 * Chromium serializes only `func` when it is passed to scripting.executeScript;
 * module-level closures/helpers are not available in the inspected page. Keeping
 * all page-side work inside this function makes Locate / Inspect reliable.
 */
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

  const readableLabel = (element: Element): string => {
    const ariaLabel = element.getAttribute('aria-label')?.trim();
    const labelledBy = element.getAttribute('aria-labelledby')?.trim();
    let labelledText = '';
    if (labelledBy) {
      labelledText = labelledBy
        .split(/\s+/)
        .map((id) => document.getElementById(id)?.textContent?.replace(/\s+/g, ' ').trim() ?? '')
        .filter(Boolean)
        .join(' ');
    }
    const visible = element.textContent?.replace(/\s+/g, ' ').trim() ?? '';
    const value = element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement
      ? element.value.trim()
      : '';
    return (ariaLabel || labelledText || visible || value).slice(0, 110);
  };

  const domSnippet = (element: Element): string => {
    const html = element.outerHTML.replace(/\s+/g, ' ').trim();
    return html.length <= 1400 ? html : `${html.slice(0, 1397)}…`;
  };

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

  const tone = options.tone ?? 'inspect';
  const colors: Record<ScanTargetHighlightTone, { solid: string; ring: string; fill: string }> = {
    inspect: {
      solid: '#14589f',
      ring: 'rgba(20, 88, 159, 0.28)',
      fill: 'rgba(20, 88, 159, 0.08)',
    },
    ok: {
      solid: '#08745b',
      ring: 'rgba(8, 116, 91, 0.28)',
      fill: 'rgba(8, 116, 91, 0.08)',
    },
    review: {
      solid: '#7a3e00',
      ring: 'rgba(122, 62, 0, 0.28)',
      fill: 'rgba(122, 62, 0, 0.08)',
    },
    fail: {
      solid: '#8f1d14',
      ring: 'rgba(143, 29, 20, 0.28)',
      fill: 'rgba(143, 29, 20, 0.08)',
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
    top: `${Math.max(0, rect.top - 6)}px`,
    left: `${Math.max(0, rect.left - 6)}px`,
    width: `${Math.max(0, rect.width + 12)}px`,
    height: `${Math.max(0, rect.height + 12)}px`,
    border: `4px solid ${color.solid}`,
    borderRadius: '8px',
    background: color.fill,
    boxShadow: `0 0 0 6px ${color.ring}, 0 10px 34px rgba(0, 0, 0, 0.24)`,
    pointerEvents: 'none',
    zIndex: '2147483647',
    boxSizing: 'border-box',
  });

  const card = document.createElement('div');
  Object.assign(card.style, {
    position: 'absolute',
    top: rect.top >= 74 ? '-66px' : '8px',
    left: '-4px',
    minWidth: '180px',
    maxWidth: 'min(460px, calc(100vw - 24px))',
    display: 'grid',
    gap: '2px',
    padding: '7px 10px',
    borderRadius: '7px',
    border: '1px solid rgba(255,255,255,.42)',
    background: color.solid,
    color: '#fff',
    font: '700 14px/1.35 system-ui, sans-serif',
    boxShadow: '0 5px 18px rgba(0, 0, 0, 0.28)',
  });

  const title = document.createElement('strong');
  const tag = target.tagName.toLowerCase();
  const role = target.getAttribute('role')?.trim();
  title.textContent = `${options.label ?? 'FocusTrace'} · ${role ? `${tag} · ${role}` : tag}`;
  Object.assign(title.style, {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  });
  card.append(title);

  const targetLabel = readableLabel(target);
  if (targetLabel) {
    const detail = document.createElement('span');
    detail.textContent = targetLabel;
    Object.assign(detail.style, {
      maxWidth: '100%',
      opacity: '.96',
      font: '500 13px/1.35 system-ui, sans-serif',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    });
    card.append(detail);
  }

  overlay.append(card);
  document.documentElement.append(overlay);

  try {
    overlay.animate([
      { transform: 'scale(1)', borderWidth: '4px' },
      { transform: 'scale(1.025)', borderWidth: '5px' },
      { transform: 'scale(1)', borderWidth: '4px' },
    ], { duration: 650, iterations: 2, easing: 'ease-in-out' });
  } catch {
    // Web Animations may be unavailable in older/restricted documents.
  }

  const durationMs = options.durationMs ?? 7000;
  if (durationMs > 0) window.setTimeout(() => overlay.remove(), durationMs);

  return { found: true, selector, snippet: domSnippet(target) };
}
