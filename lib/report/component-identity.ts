import type { AppLanguage } from '../../shared/i18n';
import type { RuntimeEvent, ScanIssue, ScanResult } from '../../shared/types';

export interface LiveComponentIdentity {
  selector: string;
  tag: string;
  id?: string;
  role?: string;
  name?: string;
  text?: string;
  context: string[];
}

export interface ReportComponentIdentity extends LiveComponentIdentity {
  componentId: string;
}

function cleanText(value: string | null | undefined, limit = 180): string | undefined {
  const normalized = value?.replace(/\s+/g, ' ').trim();
  if (!normalized) return undefined;
  return normalized.length > limit ? `${normalized.slice(0, limit - 1).trimEnd()}…` : normalized;
}

function selectorsFromScan(scan: ScanResult | undefined): string[] {
  if (!scan) return [];
  return [...scan.issues, ...scan.review, ...(scan.warnings ?? [])]
    .flatMap((issue) => issue.targets)
    .filter(Boolean);
}

export function reportComponentSelectors(scan: ScanResult | undefined, events: RuntimeEvent[]): string[] {
  const selectors = [
    ...selectorsFromScan(scan),
    ...events.flatMap((event) => [
      event.element?.selector,
      event.mutation?.target.selector,
    ].filter((selector): selector is string => Boolean(selector))),
  ];
  return [...new Set(selectors)];
}

export function collectComponentIdentitiesInPage(selectors: string[]): LiveComponentIdentity[] {
  const normalize = (value: string | null | undefined, limit = 180) => {
    const normalized = value?.replace(/\s+/g, ' ').trim();
    if (!normalized) return undefined;
    return normalized.length > limit ? `${normalized.slice(0, limit - 1).trimEnd()}…` : normalized;
  };

  const explicitRole = (element: Element) => normalize(element.getAttribute('role'), 60);
  const accessibleLabel = (element: Element) => {
    const ariaLabel = normalize(element.getAttribute('aria-label'));
    if (ariaLabel) return ariaLabel;
    const labelledby = element.getAttribute('aria-labelledby')?.trim();
    if (labelledby) {
      const label = labelledby
        .split(/\s+/)
        .map((id) => document.getElementById(id)?.textContent ?? '')
        .map((text) => normalize(text))
        .filter(Boolean)
        .join(' ');
      if (label) return normalize(label);
    }
    if (element instanceof HTMLInputElement) {
      const labels = [...(element.labels ?? [])].map((label) => normalize(label.textContent)).filter(Boolean).join(' ');
      if (labels) return normalize(labels);
      if (element.type === 'button' || element.type === 'submit' || element.type === 'reset') return normalize(element.value);
    }
    if (element instanceof HTMLImageElement) return normalize(element.alt);
    if (element.matches('button, a[href], summary, option, [role="button"], [role="link"]')) {
      return normalize(element.textContent);
    }
    return undefined;
  };

  const visibleText = (element: Element) => {
    if (element instanceof HTMLElement) return normalize(element.innerText || element.textContent);
    return normalize(element.textContent);
  };

  const headingContext = (element: Element): string[] => {
    const stack: Array<{ level: number; text: string }> = [];
    for (const heading of document.querySelectorAll('h1, h2, h3, h4, h5, h6')) {
      if (heading === element || heading.contains(element)) break;
      const position = heading.compareDocumentPosition(element);
      if (!(position & Node.DOCUMENT_POSITION_FOLLOWING)) continue;
      const text = normalize(heading.textContent, 100);
      if (!text) continue;
      const level = Number(heading.tagName.slice(1));
      while (stack.length && stack.at(-1)!.level >= level) stack.pop();
      stack.push({ level, text });
    }
    return stack.slice(-3).map((entry) => entry.text);
  };

  const landmarkContext = (element: Element): string | undefined => {
    const landmark = element.closest('main, nav, aside, header, footer, section, article, [role="main"], [role="navigation"], [role="region"], [role="complementary"]');
    if (!landmark) return undefined;
    const label = normalize(landmark.getAttribute('aria-label'))
      ?? normalize(landmark.getAttribute('aria-labelledby') ? document.getElementById(landmark.getAttribute('aria-labelledby')!)?.textContent : undefined)
      ?? normalize(landmark.querySelector(':scope > h1, :scope > h2, :scope > h3, :scope > h4, :scope > h5, :scope > h6')?.textContent, 100);
    return label;
  };

  return selectors.flatMap((selector) => {
    let element: Element | null = null;
    try {
      element = document.querySelector(selector);
    } catch {
      return [];
    }
    if (!element) return [];
    const context = headingContext(element);
    const landmark = landmarkContext(element);
    if (landmark && !context.includes(landmark)) context.unshift(landmark);
    return [{
      selector,
      tag: element.tagName.toLowerCase(),
      ...(element.id ? { id: element.id } : {}),
      ...(explicitRole(element) ? { role: explicitRole(element) } : {}),
      ...(accessibleLabel(element) ? { name: accessibleLabel(element) } : {}),
      ...(visibleText(element) ? { text: visibleText(element) } : {}),
      context: [...new Set(context)].slice(-4),
    }];
  });
}

function runtimeFallback(selector: string, events: RuntimeEvent[]): LiveComponentIdentity | undefined {
  const snapshot = events
    .flatMap((event) => [event.element, event.mutation?.target])
    .find((element) => element?.selector === selector);
  if (!snapshot) return undefined;
  return {
    selector,
    tag: snapshot.tag,
    ...(snapshot.id ? { id: snapshot.id } : {}),
    ...(snapshot.role ? { role: snapshot.role } : {}),
    ...(snapshot.name ? { name: snapshot.name } : {}),
    context: [],
  };
}

export function buildReportComponentIndex(
  scan: ScanResult | undefined,
  events: RuntimeEvent[],
  live: LiveComponentIdentity[] = [],
): Map<string, ReportComponentIdentity> {
  const liveMap = new Map(live.map((identity) => [identity.selector, identity]));
  const result = new Map<string, ReportComponentIdentity>();
  reportComponentSelectors(scan, events).forEach((selector, index) => {
    const resolved = liveMap.get(selector) ?? runtimeFallback(selector, events) ?? {
      selector,
      tag: 'element',
      context: [],
    };
    result.set(selector, {
      ...resolved,
      componentId: `E${String(index + 1).padStart(2, '0')}`,
    });
  });
  return result;
}

export function componentForIssue(
  issue: ScanIssue,
  components: Map<string, ReportComponentIdentity>,
): ReportComponentIdentity | undefined {
  return issue.targets.map((target) => components.get(target)).find(Boolean);
}

function typeLabel(component: ReportComponentIdentity, language: AppLanguage): string {
  const tag = component.tag.toLowerCase();
  const role = component.role?.toLowerCase();
  if (role === 'button' || tag === 'button') return language === 'es' ? 'Botón' : 'Button';
  if (role === 'link' || tag === 'a') return language === 'es' ? 'Enlace' : 'Link';
  if (/^h[1-6]$/.test(tag)) return language === 'es' ? 'Encabezado' : 'Heading';
  if (['input', 'select', 'textarea'].includes(tag) || ['textbox', 'combobox', 'checkbox', 'radio', 'switch', 'slider'].includes(role ?? '')) {
    return language === 'es' ? 'Campo' : 'Field';
  }
  if (tag === 'img' || role === 'img' || tag === 'svg') return language === 'es' ? 'Imagen / gráfico' : 'Image / graphic';
  if (tag === 'p') return language === 'es' ? 'Párrafo' : 'Paragraph';
  if (tag === 'li') return language === 'es' ? 'Elemento de lista' : 'List item';
  return component.role ? component.role : `<${component.tag}>`;
}

export function componentTypeLabel(component: ReportComponentIdentity, language: AppLanguage): string {
  return typeLabel(component, language);
}

export function componentPrimaryLabel(component: ReportComponentIdentity): string {
  return cleanText(component.name, 120)
    ?? cleanText(component.text, 120)
    ?? (component.id ? `#${component.id}` : undefined)
    ?? `<${component.tag}>`;
}

export function componentContextLabel(component: ReportComponentIdentity): string | undefined {
  return component.context.length ? component.context.join(' › ') : undefined;
}
