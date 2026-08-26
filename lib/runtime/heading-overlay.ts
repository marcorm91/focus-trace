export interface HeadingOverlayResult {
  total: number;
  hidden: number;
}

type HeadingOverlayWindow = Window & {
  __focusTraceHeadingOverlayAbort?: AbortController;
};

export function clearHeadingOutlineInPage(): void {
  const overlayWindow = window as HeadingOverlayWindow;
  overlayWindow.__focusTraceHeadingOverlayAbort?.abort();
  delete overlayWindow.__focusTraceHeadingOverlayAbort;
  document.querySelector('[data-focustrace-heading-overlay]')?.remove();
}

export function showHeadingOutlineInPage(): HeadingOverlayResult {
  const overlayWindow = window as HeadingOverlayWindow;
  overlayWindow.__focusTraceHeadingOverlayAbort?.abort();
  document.querySelector('[data-focustrace-heading-overlay]')?.remove();

  const abort = new AbortController();
  overlayWindow.__focusTraceHeadingOverlayAbort = abort;

  const headings = [...document.querySelectorAll<HTMLElement>('h1, h2, h3, h4, h5, h6')];
  const root = document.createElement('div');
  root.setAttribute('data-focustrace-heading-overlay', 'true');
  root.setAttribute('aria-hidden', 'true');
  Object.assign(root.style, {
    position: 'fixed',
    inset: '0',
    zIndex: '2147483646',
    pointerEvents: 'none',
  });
  document.documentElement.append(root);

  const isHidden = (element: HTMLElement): boolean => {
    let current: HTMLElement | null = element;
    while (current) {
      const style = getComputedStyle(current);
      if (
        current.hidden
        || current.getAttribute('aria-hidden')?.trim().toLowerCase() === 'true'
        || style.display === 'none'
        || style.visibility === 'hidden'
        || Number.parseFloat(style.opacity || '1') === 0
      ) return true;
      current = current.parentElement;
    }
    return false;
  };

  const boxFor = (heading: HTMLElement): { element: HTMLElement; rect: DOMRect } | undefined => {
    let current: HTMLElement | null = heading;
    while (current) {
      const rect = current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) return { element: current, rect };
      current = current.parentElement;
    }
    return undefined;
  };

  const entries = headings.map((heading, index) => {
    const hidden = isHidden(heading);
    const box = document.createElement('div');
    const label = document.createElement('span');
    const level = heading.tagName.toLowerCase();
    label.textContent = hidden ? `${level} · hidden` : level;
    Object.assign(box.style, {
      position: 'fixed',
      display: 'none',
      border: hidden ? '3px dashed #b45309' : '3px solid #047857',
      background: hidden ? 'rgba(245, 158, 11, 0.06)' : 'rgba(16, 185, 129, 0.05)',
      boxSizing: 'border-box',
      pointerEvents: 'none',
    });
    Object.assign(label.style, {
      position: 'absolute',
      top: '-3px',
      right: '-3px',
      minHeight: '24px',
      display: 'inline-flex',
      alignItems: 'center',
      padding: '2px 7px',
      borderRadius: '0 0 0 5px',
      background: hidden ? '#b45309' : '#047857',
      color: '#fff',
      font: '700 14px/1.2 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      whiteSpace: 'nowrap',
      boxShadow: '0 1px 4px rgba(0,0,0,.22)',
    });
    box.dataset.focustraceHeadingIndex = String(index + 1);
    box.append(label);
    root.append(box);
    return { heading, box, hidden, boxFor };
  });

  let frame = 0;
  const render = () => {
    frame = 0;
    for (const entry of entries) {
      const target = entry.boxFor(entry.heading);
      if (!target) {
        entry.box.style.display = 'none';
        continue;
      }
      const { rect } = target;
      entry.box.style.display = 'block';
      entry.box.style.left = `${Math.max(0, rect.left)}px`;
      entry.box.style.top = `${Math.max(0, rect.top)}px`;
      entry.box.style.width = `${Math.max(2, Math.min(rect.width, innerWidth - Math.max(0, rect.left)))}px`;
      entry.box.style.height = `${Math.max(24, Math.min(rect.height, innerHeight - Math.max(0, rect.top)))}px`;
    }
  };
  const scheduleRender = () => {
    if (frame) return;
    frame = requestAnimationFrame(render);
  };

  addEventListener('scroll', scheduleRender, { capture: true, passive: true, signal: abort.signal });
  addEventListener('resize', scheduleRender, { passive: true, signal: abort.signal });
  addEventListener('mouseover', scheduleRender, { capture: true, passive: true, signal: abort.signal });
  addEventListener('focusin', scheduleRender, { capture: true, signal: abort.signal });
  abort.signal.addEventListener('abort', () => {
    if (frame) cancelAnimationFrame(frame);
    root.remove();
  }, { once: true });

  render();
  return { total: headings.length, hidden: entries.filter((entry) => entry.hidden).length };
}
