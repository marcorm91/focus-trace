import { isProgrammaticallyHidden, selectorFor, semanticRole } from '../audit/dom';
import { RULES } from '../../shared/rule-catalog';
import type { RuntimeEvent } from '../../shared/types';
import { snapshot } from './page-inspection';

type PendingRuntimeEvent = Omit<RuntimeEvent, 'id' | 'timestamp'>;

const MAX_STATUS_TEXT_LENGTH = 240;
const MAX_CANDIDATES_PER_MUTATION = 8;

const STRONG_STRUCTURE_SIGNAL = /(?:^|[-_\s])(status|toast|snackbar|notification|notice|feedback|flash|success|error|warning|progress|loading|busy)(?:$|[-_\s])/i;
const WEAK_STRUCTURE_SIGNAL = /(?:^|[-_\s])(message|result)(?:$|[-_\s])/i;
const STATUS_TEXT_SIGNAL = /^(?:saved|save complete|success|successful|successfully|updated|added|removed|deleted|sent|submitted|complete|completed|done|error|errors|invalid|failed|failure|loading|searching|processing|saving|sending|uploading|downloading|please wait|waiting|no results|\d+[\d.,]*\s+(?:results?|items?)|progress|guardad[oa]s?|guardado correctamente|éxito|correctamente|actualizad[oa]s?|añadid[oa]s?|agregad[oa]s?|eliminad[oa]s?|enviad[oa]s?|completad[oa]s?|hecho|errores|inválid[oa]s?|no válido|no válida|falló|fallo|cargando|buscando|procesando|guardando|enviando|subiendo|descargando|espera|esperando|sin resultados|no hay resultados|\d+[\d.,]*\s+(?:resultados?|elementos?|artículos?)|progreso)(?:\b|\s|[.!:,-])/i;

const EXCLUDED_CONTAINER_ROLES = new Set([
  'dialog',
  'alertdialog',
  'button',
  'link',
  'menu',
  'menubar',
  'menuitem',
  'tab',
  'tabpanel',
  'listbox',
  'option',
  'tree',
  'treeitem',
  'grid',
  'treegrid',
]);

const INTERACTIVE_SELECTOR = [
  'button',
  'a[href]',
  'input',
  'select',
  'textarea',
  'summary',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function normalizedText(element: Element): string {
  return (element.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, MAX_STATUS_TEXT_LENGTH + 1);
}

function statusStructureText(element: Element): string {
  return [
    element.id,
    element.getAttribute('class'),
    element.getAttribute('data-testid'),
    element.getAttribute('data-test'),
    element.getAttribute('data-role'),
    element.getAttribute('data-status'),
  ].filter(Boolean).join(' ');
}

function isRendered(element: Element): boolean {
  if (!element.isConnected || isProgrammaticallyHidden(element)) return false;
  const style = getComputedStyle(element);
  return style.display !== 'none'
    && style.visibility !== 'hidden'
    && style.visibility !== 'collapse'
    && Number.parseFloat(style.opacity || '1') > 0.01;
}

function isExcludedContainer(element: Element): boolean {
  const role = semanticRole(element);
  if (role && EXCLUDED_CONTAINER_ROLES.has(role)) return true;
  if (element.matches(INTERACTIVE_SELECTOR)) return true;
  if (element.closest('dialog, [role="dialog"], [role="alertdialog"]')) return true;
  return element.querySelector(INTERACTIVE_SELECTOR) != null;
}

function statusSignalScore(element: Element, text: string): number {
  const structure = statusStructureText(element);
  let score = 0;
  if (STRONG_STRUCTURE_SIGNAL.test(structure)) score += 2;
  else if (WEAK_STRUCTURE_SIGNAL.test(structure)) score += 1;
  if (STATUS_TEXT_SIGNAL.test(text)) score += 2;
  return score;
}

export function isPotentialStatusMessage(element: Element): boolean {
  const text = normalizedText(element);
  if (!text || text.length > MAX_STATUS_TEXT_LENGTH) return false;
  if (!isRendered(element) || isExcludedContainer(element)) return false;
  return statusSignalScore(element, text) >= 2;
}

export function findPotentialStatusMessages(root: Node): Element[] {
  const rootElement = root instanceof Element ? root : root.parentElement;
  if (!rootElement) return [];

  const candidates = [rootElement, ...rootElement.querySelectorAll('*')]
    .filter((element): element is Element => element instanceof Element)
    .filter(isPotentialStatusMessage);

  const unique: Element[] = [];
  for (const candidate of candidates) {
    if (unique.some((existing) => existing.contains(candidate) && normalizedText(existing) === normalizedText(candidate))) {
      continue;
    }
    unique.push(candidate);
    if (unique.length >= MAX_CANDIDATES_PER_MUTATION) break;
  }
  return unique;
}

function hasLiveRegionSemantics(element: Element): boolean {
  const liveOwner = element.closest('[role="status"], [role="alert"], [role="log"], [role="progressbar"], progress, [aria-live]');
  if (liveOwner) {
    const ariaLive = liveOwner.getAttribute('aria-live')?.trim().toLowerCase();
    if (ariaLive !== 'off') return true;
  }

  if (element.closest('[aria-busy="true"]')) return true;

  if (element.id) {
    const escapedId = typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
      ? CSS.escape(element.id)
      : element.id.replace(/(["\\])/g, '\\$1');
    try {
      if (document.querySelector(`[aria-errormessage~="${escapedId}"]`)) return true;
    } catch {
      // Unusual IDs can be impossible to represent safely in a selector.
    }
  }

  return false;
}

export function hasProgrammaticStatusExposure(element: Element): boolean {
  return hasLiveRegionSemantics(element);
}

export function statusMessageFingerprint(element: Element): string {
  return `${selectorFor(element)}|${normalizedText(element).toLowerCase()}`;
}

export function createStatusMessageReviewEvent(element: Element): PendingRuntimeEvent | undefined {
  if (!isPotentialStatusMessage(element) || hasProgrammaticStatusExposure(element)) return undefined;

  const text = normalizedText(element);
  const rule = RULES.statusMessageExposure;
  return {
    kind: 'status-message',
    severity: rule.severity,
    title: rule.title,
    detail: `Observed status-like text “${text}” after an interaction, but no live-region/status semantics or aria-errormessage relationship were found. FocusTrace keeps this as REVIEW because deciding whether the content is a WCAG status message requires context.`,
    element: snapshot(element),
    outcome: 'review',
    ruleId: rule.id,
    references: rule.references,
  };
}
