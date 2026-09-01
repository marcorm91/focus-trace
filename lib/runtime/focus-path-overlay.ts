export type FocusPathOverlayTone = 'ok' | 'review' | 'fail';

export interface FocusPathOverlayEntry {
  selector: string;
  label: string;
  orders: number[];
  tone?: FocusPathOverlayTone;
  status?: string;
  detail?: string;
  meta?: string;
  findingCount?: number;
  findingSummary?: string;
}

export interface FocusPathOverlayResult {
  found: number;
  missing: number;
}

export function clearFocusPathInPage(): { removed: boolean } {
  const overlay = document.querySelector('[data-focustrace-focus-path]');
  if (!overlay) return { removed: false };

  overlay.dispatchEvent(new Event('focustrace:dispose-focus-path'));
  overlay.remove();
  return { removed: true };
}

export function showFocusPathInPage(
  entries: FocusPathOverlayEntry[],
  selectedSelector?: string | null,
): FocusPathOverlayResult {
  const toneColors: Record<FocusPathOverlayTone, { solid: string; fill: string; ring: string }> = {
    ok: {
      solid: '#08745b',
      fill: 'rgba(8, 116, 91, 0.08)',
      ring: 'rgba(8, 116, 91, 0.22)',
    },
    review: {
      solid: '#b54708',
      fill: 'rgba(181, 71, 8, 0.08)',
      ring: 'rgba(181, 71, 8, 0.22)',
    },
    fail: {
      solid: '#b42318',
      fill: 'rgba(180, 35, 24, 0.08)',
      ring: 'rgba(180, 35, 24, 0.22)',
    },
  };
  const disposeEvent = 'focustrace:dispose-focus-path';
  const existing = document.querySelector('[data-focustrace-focus-path]');
  if (existing) {
    existing.dispatchEvent(new Event(disposeEvent));
    existing.remove();
  }
  document.querySelector('[data-focustrace-scan-highlight]')?.remove();

  const root = document.createElement('div');
  root.setAttribute('data-focustrace-focus-path', 'true');
  root.setAttribute('aria-hidden', 'true');
  Object.assign(root.style, {
    position: 'fixed',
    inset: '0',
    overflow: 'visible',
    pointerEvents: 'none',
    zIndex: '2147483646',
  });

  const totalSteps = entries.reduce(
    (maximum, entry) => Math.max(maximum, ...entry.orders),
    0,
  );
  const items = entries.map((entry) => {
    const selected = entry.selector === selectedSelector;
    const tone = entry.tone ?? 'review';
    const colors = toneColors[tone];
    const overlay = document.createElement('div');
    overlay.setAttribute('data-focustrace-focus-target', entry.selector);
    overlay.setAttribute('data-focustrace-tone', tone);
    Object.assign(overlay.style, {
      position: 'absolute',
      display: 'none',
      border: `${selected ? 4 : 2}px solid ${colors.solid}`,
      borderRadius: '7px',
      background: selected ? colors.fill : 'transparent',
      boxShadow: selected ? `0 0 0 5px ${colors.ring}` : 'none',
      pointerEvents: 'none',
      boxSizing: 'border-box',
    });

    const visibleOrders = entry.orders.slice(0, 4);
    const remaining = entry.orders.length - visibleOrders.length;
    const badge = document.createElement('span');
    badge.textContent = `${visibleOrders.join(' · ')}${remaining > 0 ? ` +${remaining}` : ''}`;
    badge.title = `${entry.label}: ${entry.orders.join(', ')}`;
    Object.assign(badge.style, {
      position: 'absolute',
      top: '-28px',
      left: `${selected ? -4 : -2}px`,
      minWidth: '25px',
      padding: '3px 7px',
      borderRadius: '999px',
      background: colors.solid,
      color: '#fff',
      font: '800 12px/1.5 system-ui, sans-serif',
      textAlign: 'center',
      whiteSpace: 'nowrap',
      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.24)',
    });
    overlay.append(badge);
    root.append(overlay);
    return { entry, overlay, badge, selected };
  });

  const selectedItem = items.find((item) => item.selected);
  const card = selectedItem ? document.createElement('aside') : undefined;
  if (card && selectedItem) {
    card.setAttribute('data-focustrace-inspector-card', 'true');
    const heading = document.createElement('div');
    const title = document.createElement('strong');
    const status = document.createElement('span');
    const meta = document.createElement('div');
    const detail = document.createElement('p');
    const count = document.createElement('div');
    const tone = selectedItem.entry.tone ?? 'review';
    const colors = toneColors[tone];

    title.textContent = `#${selectedItem.entry.orders[0] ?? ''} / ${totalSteps} · ${selectedItem.entry.label}`;
    status.textContent = selectedItem.entry.status ?? '';
    meta.textContent = selectedItem.entry.meta ?? selectedItem.entry.selector;
    detail.textContent = selectedItem.entry.detail ?? '';
    count.textContent = selectedItem.entry.findingSummary ?? (selectedItem.entry.findingCount
      ? `${selectedItem.entry.findingCount} linked finding${selectedItem.entry.findingCount === 1 ? '' : 's'}`
      : '');

    Object.assign(card.style, {
      position: 'fixed',
      display: 'none',
      width: 'min(360px, calc(100vw - 24px))',
      padding: '13px 14px',
      border: `1px solid ${colors.solid}`,
      borderLeft: `5px solid ${colors.solid}`,
      borderRadius: '11px',
      background: '#fff',
      color: '#172033',
      boxShadow: '0 14px 34px rgba(15, 23, 42, 0.24)',
      font: '400 13px/1.45 system-ui, sans-serif',
      pointerEvents: 'none',
      boxSizing: 'border-box',
    });
    Object.assign(heading.style, {
      display: 'flex',
      alignItems: 'start',
      justifyContent: 'space-between',
      gap: '12px',
      marginBottom: '5px',
    });
    Object.assign(title.style, {
      minWidth: '0',
      fontSize: '14px',
      lineHeight: '1.35',
    });
    Object.assign(status.style, {
      flex: '0 0 auto',
      color: colors.solid,
      fontSize: '11px',
      fontWeight: '800',
    });
    Object.assign(meta.style, {
      marginBottom: '7px',
      color: '#667085',
      fontSize: '11px',
      overflowWrap: 'anywhere',
    });
    Object.assign(detail.style, {
      margin: '0',
      color: '#344054',
    });
    Object.assign(count.style, {
      display: selectedItem.entry.findingCount ? 'block' : 'none',
      marginTop: '8px',
      color: colors.solid,
      fontSize: '11px',
      fontWeight: '700',
    });

    heading.append(title, status);
    card.append(heading, meta, detail, count);
    root.append(card);
  }

  document.documentElement.append(root);

  const findTarget = (selector: string): Element | null => {
    try {
      return document.querySelector(selector);
    } catch {
      return null;
    }
  };

  if (selectedSelector) {
    findTarget(selectedSelector)?.scrollIntoView({
      block: 'center',
      inline: 'center',
      behavior: 'auto',
    });
  }

  const positionCard = (rect: DOMRect): void => {
    if (!card) return;
    const margin = 12;
    const cardWidth = Math.min(360, Math.max(240, window.innerWidth - margin * 2));
    Object.assign(card.style, {
      display: 'block',
      visibility: 'hidden',
      top: `${margin}px`,
      left: `${margin}px`,
      width: `${cardWidth}px`,
    });

    const measuredHeight = card.getBoundingClientRect().height;
    const cardHeight = measuredHeight > 0 ? measuredHeight : 155;
    const maxLeft = Math.max(margin, window.innerWidth - cardWidth - margin);
    const maxTop = Math.max(margin, window.innerHeight - cardHeight - margin);
    const clampLeft = (value: number) => Math.min(Math.max(margin, value), maxLeft);
    const clampTop = (value: number) => Math.min(Math.max(margin, value), maxTop);
    const fitsBelow = rect.bottom + margin + cardHeight <= window.innerHeight - margin;
    const fitsAbove = rect.top - margin - cardHeight >= margin;
    const fitsRight = rect.right + margin + cardWidth <= window.innerWidth - margin;
    const fitsLeft = rect.left - margin - cardWidth >= margin;

    let placement: 'below' | 'above' | 'right' | 'left' | 'pinned' = 'pinned';
    let top = clampTop(rect.bottom + margin);
    let left = clampLeft(rect.left);

    if (fitsBelow) {
      placement = 'below';
      top = rect.bottom + margin;
    } else if (fitsAbove) {
      placement = 'above';
      top = rect.top - cardHeight - margin;
    } else if (fitsRight) {
      placement = 'right';
      top = clampTop(rect.top);
      left = rect.right + margin;
    } else if (fitsLeft) {
      placement = 'left';
      top = clampTop(rect.top);
      left = rect.left - cardWidth - margin;
    }

    card.dataset.focustracePlacement = placement;
    Object.assign(card.style, {
      visibility: 'visible',
      top: `${top}px`,
      left: `${left}px`,
    });
  };

  const update = (): number => {
    let found = 0;
    if (card) card.style.display = 'none';

    for (const item of items) {
      const target = findTarget(item.entry.selector);
      if (!target) {
        item.overlay.style.display = 'none';
        continue;
      }

      const rect = target.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) {
        item.overlay.style.display = 'none';
        continue;
      }

      found += 1;
      const padding = item.selected ? 5 : 3;
      const badgeHeight = 28;
      const overlayHeight = rect.height + padding * 2;
      const hasSpaceAbove = rect.top - padding >= badgeHeight;
      const hasSpaceBelow = rect.bottom + padding + badgeHeight <= window.innerHeight;
      const badgePlacement = hasSpaceAbove ? 'above' : hasSpaceBelow ? 'below' : 'inside';
      item.badge.dataset.focustracePlacement = badgePlacement;
      Object.assign(item.badge.style, {
        top: badgePlacement === 'above'
          ? '-28px'
          : badgePlacement === 'below'
            ? `${overlayHeight + 4}px`
            : '4px',
        left: `${Math.max(-rect.left + 4, item.selected ? -4 : -2)}px`,
      });
      Object.assign(item.overlay.style, {
        display: 'block',
        top: `${rect.top - padding}px`,
        left: `${rect.left - padding}px`,
        width: `${rect.width + padding * 2}px`,
        height: `${overlayHeight}px`,
      });
      if (item.selected) positionCard(rect);
    }
    return found;
  };

  let animationFrame = 0;
  const scheduleUpdate = () => {
    if (animationFrame) return;
    animationFrame = window.requestAnimationFrame(() => {
      animationFrame = 0;
      update();
    });
  };

  window.addEventListener('scroll', scheduleUpdate, true);
  window.addEventListener('resize', scheduleUpdate);
  const refreshTimer = window.setInterval(scheduleUpdate, 400);
  root.addEventListener(disposeEvent, () => {
    window.removeEventListener('scroll', scheduleUpdate, true);
    window.removeEventListener('resize', scheduleUpdate);
    window.clearInterval(refreshTimer);
    if (animationFrame) window.cancelAnimationFrame(animationFrame);
  }, { once: true });

  const found = update();
  if (found === 0) {
    root.dispatchEvent(new Event(disposeEvent));
    root.remove();
  }

  return { found, missing: entries.length - found };
}
