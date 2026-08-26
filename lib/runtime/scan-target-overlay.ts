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

function readableTargetLabel(target: Element): string {
  const ariaLabel = target.getAttribute('aria-label')?.trim();
  const labelledBy = target.getAttribute('aria-labelledby')?.trim();
  let labelledText = '';
  if (labelledBy) {
    labelledText = labelledBy
      .split(/\s+/)
      .map((id) => document.getElementById(id)?.textContent?.replace(/\s+/g, ' ').trim() ?? '')
      .filter(Boolean)
      .join(' ');
  }
  const visible = target.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  const value = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
    ? target.value.trim()
    : '';
  return (ariaLabel || labelledText || visible || value).slice(0, 110);
}

function targetDomSnippet(target: Element): string {
  const html = target.outerHTML.replace(/\s+/g, ' ').trim();
  return html.length <= 1400 ? html : `${html.slice(0, 1397)}…`;
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

  const tone = options.tone ?? 'inspect';
  const colors: Record<ScanTargetHighlightTone, { solid: string; ring: string; fill: string }> = {
    inspect: {
      solid: '#7c3aed',
      ring: 'rgba(124, 58, 237, 0.34)',
      fill: 'rgba(124, 58, 237, 0.08)',
    },
    ok: {
      solid: '#08745b',
      ring: 'rgba(8, 116, 91, 0.32)',
      fill: 'rgba(8, 116, 91, 0.08)',
    },
    review: {
      solid: '#b54708',
      ring: 'rgba(181, 71, 8, 0.32)',
      fill: 'rgba(181, 71, 8, 0.08)',
    },
    fail: {
      solid: '#b42318',
      ring: 'rgba(180, 35, 24, 0.34)',
      fill: 'rgba(180, 35, 24, 0.08)',
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
    boxShadow: `0 0 0 6px ${color.ring}, 0 0 0 100vmax rgba(15, 23, 42, 0.46), 0 10px 34px rgba(0, 0, 0, 0.34)`,
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
    border: '1px solid rgba(255,255,255,.38)',
    background: color.solid,
    color: '#fff',
    font: '700 14px/1.35 system-ui, sans-serif',
    boxShadow: '0 5px 18px rgba(0, 0, 0, 0.32)',
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

  const targetLabel = readableTargetLabel(target);
  if (targetLabel) {
    const detail = document.createElement('span');
    detail.textContent = targetLabel;
    Object.assign(detail.style, {
      maxWidth: '100%',
      opacity: '.94',
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
    ], { duration: 700, iterations: 2, easing: 'ease-in-out' });
  } catch {
    // Web Animations may be unavailable in older/restricted documents.
  }

  const durationMs = options.durationMs ?? 7000;
  if (durationMs > 0) window.setTimeout(() => overlay.remove(), durationMs);

  return { found: true, selector, snippet: targetDomSnippet(target) };
}
