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
    display: 'grid',
    placeItems: 'center',
    background: 'rgba(15, 23, 42, 0.48)',
    backdropFilter: 'blur(2px)',
    pointerEvents: 'auto',
  });

  const card = document.createElement('div');
  Object.assign(card.style, {
    width: 'min(420px, calc(100vw - 32px))',
    padding: '22px',
    borderRadius: '8px',
    border: '1px solid rgba(255, 255, 255, 0.18)',
    background: '#fff',
    color: '#111827',
    boxShadow: '0 24px 70px rgba(15, 23, 42, 0.35)',
    font: '500 14px/1.45 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  });

  const title = document.createElement('strong');
  title.textContent = 'FocusTrace esta simulando el foco';
  Object.assign(title.style, {
    display: 'block',
    marginBottom: '8px',
    fontSize: '16px',
  });

  const text = document.createElement('p');
  text.textContent = `Preparando ${total} elementos focusables...`;
  Object.assign(text.style, {
    margin: '0 0 14px',
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
  bar.append(fill);
  card.append(title, text, bar);
  root.append(card);
  document.documentElement.append(root);

  return {
    update(current: number, nextTotal: number) {
      const percent = nextTotal > 0 ? Math.min(100, Math.round((current / nextTotal) * 100)) : 100;
      text.textContent = `Elemento ${current} de ${nextTotal}. No interactues con la pagina hasta que termine.`;
      fill.style.width = `${percent}%`;
    },
    dispose() {
      root.remove();
    },
  };
}

export function clearFocusWalkBackdropInPage(): void {
  document.querySelector('[data-focustrace-focus-walk-backdrop]')?.remove();
}
