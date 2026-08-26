export interface FocusWalkBackdropController {
  update(current: number, total: number): void;
  dispose(): void;
}

export function showFocusWalkBackdropInPage(total: number): FocusWalkBackdropController {
  document.querySelector('[data-focustrace-focus-walk-backdrop]')?.remove();

  const root = document.createElement('div');
  root.setAttribute('data-focustrace-focus-walk-backdrop', 'true');
  root.setAttribute('role', 'status');
  root.setAttribute('aria-live', 'polite');
  Object.assign(root.style, {
    position: 'fixed',
    inset: '0',
    zIndex: '2147483647',
    pointerEvents: 'none',
  });

  const focusBox = document.createElement('div');
  Object.assign(focusBox.style, {
    position: 'fixed',
    display: 'none',
    boxSizing: 'border-box',
    border: '4px solid #dc2626',
    borderRadius: '5px',
    background: 'rgba(220, 38, 38, 0.05)',
    boxShadow: '0 0 0 3px rgba(255,255,255,.9), 0 8px 24px rgba(0,0,0,.24)',
    pointerEvents: 'none',
    transition: 'left 90ms ease, top 90ms ease, width 90ms ease, height 90ms ease',
  });

  const focusLabel = document.createElement('span');
  focusLabel.textContent = 'FocusTrace';
  Object.assign(focusLabel.style, {
    position: 'absolute',
    left: '-4px',
    bottom: '100%',
    padding: '4px 8px',
    borderRadius: '5px 5px 0 0',
    background: '#dc2626',
    color: '#fff',
    font: '700 14px/1.2 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    whiteSpace: 'nowrap',
  });
  focusBox.append(focusLabel);

  const card = document.createElement('div');
  Object.assign(card.style, {
    position: 'fixed',
    top: '16px',
    right: '16px',
    width: 'min(360px, calc(100vw - 32px))',
    padding: '14px 16px',
    borderRadius: '8px',
    border: '1px solid rgba(15, 23, 42, 0.18)',
    background: 'rgba(255,255,255,.96)',
    color: '#111827',
    boxShadow: '0 12px 36px rgba(15, 23, 42, 0.22)',
    font: '500 14px/1.45 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    pointerEvents: 'none',
  });

  const title = document.createElement('strong');
  title.textContent = 'FocusTrace · Foco automático';
  Object.assign(title.style, {
    display: 'block',
    marginBottom: '6px',
    fontSize: '16px',
  });

  const text = document.createElement('p');
  text.textContent = `Preparando ${total} elementos enfocables...`;
  Object.assign(text.style, {
    margin: '0 0 10px',
    color: '#4b5563',
  });

  const bar = document.createElement('div');
  Object.assign(bar.style, {
    height: '8px',
    overflow: 'hidden',
    borderRadius: '999px',
    background: '#e5e7eb',
  });

  const fill = document.createElement('div');
  Object.assign(fill.style, {
    width: '0%',
    height: '100%',
    borderRadius: 'inherit',
    background: '#2563eb',
    transition: 'width 120ms ease',
  });

  const updateFocusBox = (element: Element | null) => {
    if (!(element instanceof HTMLElement) && !(element instanceof SVGElement)) {
      focusBox.style.display = 'none';
      return;
    }
    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      focusBox.style.display = 'none';
      return;
    }
    focusBox.style.display = 'block';
    focusBox.style.left = `${Math.max(0, rect.left - 4)}px`;
    focusBox.style.top = `${Math.max(0, rect.top - 4)}px`;
    focusBox.style.width = `${Math.min(innerWidth, rect.width + 8)}px`;
    focusBox.style.height = `${Math.min(innerHeight, rect.height + 8)}px`;
  };

  const focusListener = (event: FocusEvent) => {
    updateFocusBox(event.target instanceof Element ? event.target : null);
  };
  document.addEventListener('focusin', focusListener, true);

  bar.append(fill);
  card.append(title, text, bar);
  root.append(focusBox, card);
  document.documentElement.append(root);

  return {
    update(current: number, nextTotal: number) {
      const percent = nextTotal > 0 ? Math.min(100, Math.round((current / nextTotal) * 100)) : 100;
      text.textContent = `Elemento ${current} de ${nextTotal}. El recuadro rojo indica el destino de foco actual.`;
      focusLabel.textContent = `Foco ${current}/${nextTotal}`;
      fill.style.width = `${percent}%`;
      updateFocusBox(document.activeElement);
    },
    dispose() {
      document.removeEventListener('focusin', focusListener, true);
      root.remove();
    },
  };
}

export function clearFocusWalkBackdropInPage(): void {
  document.querySelector('[data-focustrace-focus-walk-backdrop]')?.remove();
}
