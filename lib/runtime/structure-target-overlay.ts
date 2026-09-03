export type StructureTargetHighlightResult = {
  selector: string;
  found: number;
  rendered: number;
  limited: boolean;
};

export type StructureTargetHighlightOptions = {
  label?: string;
  durationMs?: number;
  maxTargets?: number;
};

/**
 * Highlight a group of elements matched by a Structure metric.
 * Keep this function self-contained for browser.scripting.executeScript.
 */
export function locateStructureTargetsInPage(
  selector: string,
  options: StructureTargetHighlightOptions = {},
): StructureTargetHighlightResult {
  document.querySelector('[data-focustrace-scan-highlight]')?.remove();
  document.querySelector('[data-focustrace-structure-highlights]')?.remove();

  let matches: Element[] = [];
  try {
    matches = [...document.querySelectorAll(selector)];
  } catch {
    return { selector, found: 0, rendered: 0, limited: false };
  }

  const maxTargets = Math.max(1, Math.floor(options.maxTargets ?? 60));
  const visibleMatches = matches.filter((element) => {
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  });
  const targets = visibleMatches.slice(0, maxTargets);
  if (!targets.length) {
    return { selector, found: matches.length, rendered: 0, limited: matches.length > maxTargets };
  }

  targets[0]?.scrollIntoView({ block: 'center', inline: 'center', behavior: 'auto' });

  const root = document.createElement('div');
  root.setAttribute('data-focustrace-structure-highlights', 'true');
  root.setAttribute('aria-hidden', 'true');
  Object.assign(root.style, {
    position: 'absolute',
    inset: '0',
    width: '0',
    height: '0',
    pointerEvents: 'none',
    zIndex: '2147483646',
  });

  const solid = '#14589f';
  const fill = 'rgba(20, 88, 159, 0.08)';
  const ring = 'rgba(20, 88, 159, 0.24)';

  targets.forEach((target, index) => {
    const rect = target.getBoundingClientRect();
    const overlay = document.createElement('div');
    Object.assign(overlay.style, {
      position: 'absolute',
      top: `${Math.max(0, rect.top + window.scrollY - 4)}px`,
      left: `${Math.max(0, rect.left + window.scrollX - 4)}px`,
      width: `${Math.max(0, rect.width + 8)}px`,
      height: `${Math.max(0, rect.height + 8)}px`,
      border: `3px solid ${solid}`,
      borderRadius: '6px',
      background: fill,
      boxShadow: `0 0 0 4px ${ring}`,
      boxSizing: 'border-box',
      pointerEvents: 'none',
    });

    if (index === 0) {
      const badge = document.createElement('div');
      badge.textContent = `${options.label ?? 'FocusTrace'} · ${matches.length}`;
      Object.assign(badge.style, {
        position: 'absolute',
        top: rect.top + window.scrollY >= 40 ? '-32px' : '4px',
        left: '-3px',
        maxWidth: 'min(360px, calc(100vw - 24px))',
        padding: '5px 8px',
        borderRadius: '6px',
        background: solid,
        color: '#fff',
        font: '700 13px/1.3 system-ui, sans-serif',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        boxShadow: '0 4px 14px rgba(0,0,0,.22)',
      });
      overlay.append(badge);
    }

    root.append(overlay);
  });

  document.documentElement.append(root);

  const durationMs = options.durationMs ?? 7000;
  if (durationMs > 0) window.setTimeout(() => root.remove(), durationMs);

  return {
    selector,
    found: matches.length,
    rendered: targets.length,
    limited: visibleMatches.length > maxTargets,
  };
}
