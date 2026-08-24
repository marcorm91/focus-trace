export interface FocusPathOverlayEntry {
  selector: string;
  label: string;
  orders: number[];
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
  selectedSelector?: string,
): FocusPathOverlayResult {
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

  const items = entries.map((entry) => {
    const selected = entry.selector === selectedSelector;
    const color = selected ? '#1d4ed8' : '#6d28d9';
    const overlay = document.createElement('div');
    overlay.setAttribute('data-focustrace-focus-target', entry.selector);
    Object.assign(overlay.style, {
      position: 'absolute',
      display: 'none',
      border: `${selected ? 4 : 3}px solid ${color}`,
      borderRadius: '5px',
      background: selected ? 'rgba(29, 78, 216, 0.10)' : 'rgba(109, 40, 217, 0.07)',
      boxShadow: selected
        ? '0 0 0 5px rgba(29, 78, 216, 0.24)'
        : '0 0 0 4px rgba(109, 40, 217, 0.20)',
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
      top: '-27px',
      left: `${selected ? -4 : -3}px`,
      minWidth: '24px',
      padding: '3px 7px',
      borderRadius: '999px',
      background: color,
      color: '#fff',
      font: '800 12px/1.5 system-ui, sans-serif',
      textAlign: 'center',
      whiteSpace: 'nowrap',
      boxShadow: '0 1px 4px rgba(0, 0, 0, 0.3)',
    });
    overlay.append(badge);
    root.append(overlay);
    return { entry, overlay, selected };
  });

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

  const update = (): number => {
    let found = 0;
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
      Object.assign(item.overlay.style, {
        display: 'block',
        top: `${rect.top - padding}px`,
        left: `${rect.left - padding}px`,
        width: `${rect.width + padding * 2}px`,
        height: `${rect.height + padding * 2}px`,
      });
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
