import type { AppLanguage } from '../../shared/i18n';
import type { ComponentScanScope } from '../../shared/types';

export const COMPONENT_SCAN_SCOPE_ATTRIBUTE = 'data-focustrace-scan-component';

export interface ComponentPickerResult {
  cancelled: boolean;
  scope?: ComponentScanScope;
}

/**
 * IMPORTANT: keep this function self-contained.
 * Chromium serializes only `func` when passed to scripting.executeScript.
 */
export async function pickComponentInPage(language: AppLanguage): Promise<ComponentPickerResult> {
  document.querySelector('[data-focustrace-component-picker]')?.remove();

  const scopeAttribute = 'data-focustrace-scan-component';
  const es = language === 'es';
  const selectorFor = (element: Element): string => {
    if (element.id) return `#${CSS.escape(element.id)}`;
    const segments: string[] = [];
    let current: Element | null = element;
    while (current && current !== document.documentElement) {
      const tag = current.tagName.toLowerCase();
      const parent: HTMLElement | null = current.parentElement;
      if (!parent) {
        segments.unshift(tag);
        break;
      }
      const siblings = [...parent.children].filter((candidate) => candidate.tagName === current!.tagName);
      const position = siblings.indexOf(current) + 1;
      segments.unshift(siblings.length > 1 ? `${tag}:nth-of-type(${position})` : tag);
      current = parent;
      if (segments.length >= 7) break;
    }
    return segments.join(' > ');
  };

  const readableLabel = (element: Element): string | undefined => {
    const ariaLabel = element.getAttribute('aria-label')?.trim();
    if (ariaLabel) return ariaLabel.slice(0, 120);
    const labelledBy = element.getAttribute('aria-labelledby')?.trim();
    if (labelledBy) {
      const text = labelledBy
        .split(/\s+/)
        .map((id) => document.getElementById(id)?.textContent?.replace(/\s+/g, ' ').trim() ?? '')
        .filter(Boolean)
        .join(' ')
        .trim();
      if (text) return text.slice(0, 120);
    }
    const heading = element.matches('h1, h2, h3, h4, h5, h6')
      ? element
      : element.querySelector('h1, h2, h3, h4, h5, h6');
    const headingText = heading?.textContent?.replace(/\s+/g, ' ').trim();
    if (headingText) return headingText.slice(0, 120);
    const visible = element.textContent?.replace(/\s+/g, ' ').trim();
    return visible ? visible.slice(0, 120) : undefined;
  };

  const host = document.createElement('div');
  host.setAttribute('data-focustrace-component-picker', 'true');
  host.setAttribute('aria-hidden', 'true');
  Object.assign(host.style, {
    position: 'fixed',
    inset: '0',
    zIndex: '2147483647',
    pointerEvents: 'none',
    fontFamily: 'system-ui, sans-serif',
  });

  const box = document.createElement('div');
  Object.assign(box.style, {
    position: 'fixed',
    border: '3px solid #14589f',
    borderRadius: '8px',
    background: 'rgba(20, 88, 159, .08)',
    boxShadow: '0 0 0 5px rgba(20, 88, 159, .25)',
    transition: 'top .06s, left .06s, width .06s, height .06s',
  });

  const card = document.createElement('div');
  Object.assign(card.style, {
    position: 'fixed',
    left: '12px',
    bottom: '12px',
    maxWidth: 'min(520px, calc(100vw - 24px))',
    display: 'grid',
    gap: '3px',
    padding: '10px 12px',
    borderRadius: '9px',
    background: '#14589f',
    color: '#fff',
    boxShadow: '0 8px 26px rgba(0, 0, 0, .32)',
  });
  const title = document.createElement('strong');
  title.textContent = es ? 'Selecciona un componente' : 'Select a component';
  const detail = document.createElement('span');
  Object.assign(detail.style, { fontSize: '13px', opacity: '.96', overflowWrap: 'anywhere' });
  const help = document.createElement('small');
  help.textContent = es
    ? 'Click: seleccionar · ↑: contenedor padre · ↓: volver al elemento bajo el cursor · Esc: cancelar'
    : 'Click: select · ↑: parent container · ↓: return to hovered element · Esc: cancel';
  Object.assign(help.style, { fontSize: '12px', opacity: '.84' });
  card.append(title, detail, help);
  host.append(box, card);
  document.documentElement.append(host);

  let hovered: Element | null = null;
  let candidate: Element | null = null;

  const ignored = (element: Element | null) => !element || element === host || host.contains(element);
  const render = () => {
    if (!candidate) {
      box.style.display = 'none';
      detail.textContent = '';
      return;
    }
    const rect = candidate.getBoundingClientRect();
    box.style.display = 'block';
    box.style.top = `${Math.max(0, rect.top - 4)}px`;
    box.style.left = `${Math.max(0, rect.left - 4)}px`;
    box.style.width = `${Math.max(0, rect.width + 8)}px`;
    box.style.height = `${Math.max(0, rect.height + 8)}px`;
    const tag = candidate.tagName.toLowerCase();
    const role = candidate.getAttribute('role')?.trim();
    const label = readableLabel(candidate);
    detail.textContent = `${tag}${role ? ` · role=${role}` : ''}${label ? ` · ${label}` : ''}`;
  };

  return new Promise<ComponentPickerResult>((resolve) => {
    const cleanup = () => {
      document.removeEventListener('mousemove', onMove, true);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('scroll', render, true);
      window.removeEventListener('resize', render, true);
      host.remove();
    };
    const finish = (result: ComponentPickerResult) => {
      cleanup();
      resolve(result);
    };
    const onMove = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (ignored(target)) return;
      hovered = target;
      candidate = target;
      render();
    };
    const onClick = (event: MouseEvent) => {
      if (!candidate) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      const tag = candidate.tagName.toLowerCase();
      const role = candidate.getAttribute('role')?.trim();
      const label = readableLabel(candidate);
      const scope: ComponentScanScope = {
        type: 'component',
        selector: selectorFor(candidate),
        tag,
        ...(role ? { role } : {}),
        ...(label ? { label } : {}),
      };
      document.documentElement.setAttribute(scopeAttribute, JSON.stringify(scope));
      finish({ cancelled: false, scope });
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        finish({ cancelled: true });
        return;
      }
      if (event.key === 'ArrowUp' && candidate?.parentElement && candidate.parentElement !== document.documentElement) {
        event.preventDefault();
        candidate = candidate.parentElement;
        render();
        return;
      }
      if (event.key === 'ArrowDown' && hovered) {
        event.preventDefault();
        candidate = hovered;
        render();
      }
    };

    document.addEventListener('mousemove', onMove, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('scroll', render, true);
    window.addEventListener('resize', render, true);
  });
}
