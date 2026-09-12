import {
  ELEMENT_INTERNALS_ARIA_PROPERTIES,
  ELEMENT_INTERNALS_BRIDGE_SCHEMA,
  ELEMENT_INTERNALS_KEY_ATTRIBUTE,
  ELEMENT_INTERNALS_REQUEST_ATTRIBUTE,
  ELEMENT_INTERNALS_REQUEST_EVENT,
  ELEMENT_INTERNALS_RESPONSE_ATTRIBUTE,
  type ElementInternalsAriaProperty,
  type ElementInternalsBridgeResponse,
  type ElementInternalsLabelSnapshot,
  type ElementInternalsSemanticSnapshot,
} from '../../shared/element-internals-bridge';
import type { ScanRoot } from './scan-elements';

const MAX_CUSTOM_ELEMENTS = 2000;
const MAX_LABELS = 16;
const MAX_VALUE_LENGTH = 2048;
const KNOWN_ARIA_PROPERTIES = new Set<string>(Object.keys(ELEMENT_INTERNALS_ARIA_PROPERTIES));

let snapshots = new WeakMap<Element, ElementInternalsSemanticSnapshot>();
let snapshotElements: Element[] = [];

function boundedString(value: unknown, max = MAX_VALUE_LENGTH): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized ? normalized.slice(0, max) : undefined;
}

function validLabel(value: unknown): ElementInternalsLabelSnapshot | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const record = value as Record<string, unknown>;
  const text = typeof record.text === 'string' ? record.text.replace(/\s+/g, ' ').trim().slice(0, MAX_VALUE_LENGTH) : '';
  const id = boundedString(record.id, 512);
  return { ...(id ? { id } : {}), text };
}

function validSnapshot(value: unknown, expectedKeys: Set<string>): ElementInternalsSemanticSnapshot | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const record = value as Record<string, unknown>;
  if (typeof record.key !== 'string' || !expectedKeys.has(record.key)) return undefined;

  const role = boundedString(record.role, 128);
  const aria: ElementInternalsSemanticSnapshot['aria'] = {};
  if (record.aria && typeof record.aria === 'object') {
    for (const [property, raw] of Object.entries(record.aria as Record<string, unknown>)) {
      if (!KNOWN_ARIA_PROPERTIES.has(property)) continue;
      const value = boundedString(raw);
      if (value != null) aria[property as ElementInternalsAriaProperty] = value;
    }
  }

  const labels = Array.isArray(record.labels)
    ? record.labels.slice(0, MAX_LABELS).map(validLabel).filter((label): label is ElementInternalsLabelSnapshot => label != null)
    : [];

  return {
    key: record.key,
    ...(role ? { role } : {}),
    aria,
    labels,
    formAssociated: record.formAssociated === true,
  };
}

function customElementCandidates(): Element[] {
  return Array.from(document.querySelectorAll('*'))
    .filter((element) => element.localName.includes('-'))
    .slice(0, MAX_CUSTOM_ELEMENTS);
}

export function refreshElementInternalsSnapshots(): number {
  snapshots = new WeakMap<Element, ElementInternalsSemanticSnapshot>();
  snapshotElements = [];

  const root = document.documentElement;
  if (!root) return 0;

  const candidates = customElementCandidates();
  if (!candidates.length) return 0;

  const requestId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  const previous = new Map<Element, string | null>();
  const byKey = new Map<string, Element>();

  for (const [index, element] of candidates.entries()) {
    const key = `${requestId}:${index}`;
    previous.set(element, element.getAttribute(ELEMENT_INTERNALS_KEY_ATTRIBUTE));
    element.setAttribute(ELEMENT_INTERNALS_KEY_ATTRIBUTE, key);
    byKey.set(key, element);
  }

  const previousRequest = root.getAttribute(ELEMENT_INTERNALS_REQUEST_ATTRIBUTE);
  const previousResponse = root.getAttribute(ELEMENT_INTERNALS_RESPONSE_ATTRIBUTE);
  root.setAttribute(ELEMENT_INTERNALS_REQUEST_ATTRIBUTE, requestId);
  root.removeAttribute(ELEMENT_INTERNALS_RESPONSE_ATTRIBUTE);

  try {
    window.dispatchEvent(new Event(ELEMENT_INTERNALS_REQUEST_EVENT));
    const raw = root.getAttribute(ELEMENT_INTERNALS_RESPONSE_ATTRIBUTE);
    if (!raw || raw.length > 2_000_000) return 0;

    const parsed = JSON.parse(raw) as Partial<ElementInternalsBridgeResponse>;
    if (parsed.schema !== ELEMENT_INTERNALS_BRIDGE_SCHEMA || parsed.requestId !== requestId || !Array.isArray(parsed.snapshots)) return 0;

    const expectedKeys = new Set(byKey.keys());
    for (const rawSnapshot of parsed.snapshots.slice(0, candidates.length)) {
      const snapshot = validSnapshot(rawSnapshot, expectedKeys);
      if (!snapshot) continue;
      const element = byKey.get(snapshot.key);
      if (!element) continue;
      snapshots.set(element, snapshot);
      snapshotElements.push(element);
    }
    return snapshotElements.length;
  } catch {
    return 0;
  } finally {
    for (const [element, oldValue] of previous) {
      if (oldValue == null) element.removeAttribute(ELEMENT_INTERNALS_KEY_ATTRIBUTE);
      else element.setAttribute(ELEMENT_INTERNALS_KEY_ATTRIBUTE, oldValue);
    }
    if (previousRequest == null) root.removeAttribute(ELEMENT_INTERNALS_REQUEST_ATTRIBUTE);
    else root.setAttribute(ELEMENT_INTERNALS_REQUEST_ATTRIBUTE, previousRequest);
    if (previousResponse == null) root.removeAttribute(ELEMENT_INTERNALS_RESPONSE_ATTRIBUTE);
    else root.setAttribute(ELEMENT_INTERNALS_RESPONSE_ATTRIBUTE, previousResponse);
  }
}

export function elementInternalsSnapshot(element: Element): ElementInternalsSemanticSnapshot | undefined {
  return snapshots.get(element);
}

export function elementInternalsElements(root: ScanRoot = document): Element[] {
  if (root instanceof Document) return [...snapshotElements];
  return snapshotElements.filter((element) => element === root || root.contains(element));
}

export function effectiveAriaValue(element: Element, property: ElementInternalsAriaProperty): string | null {
  if (element.hasAttribute(property)) return element.getAttribute(property);
  return snapshots.get(element)?.aria[property] ?? null;
}

export function hasEffectiveAriaValue(element: Element, property: ElementInternalsAriaProperty): boolean {
  return element.hasAttribute(property) || snapshots.get(element)?.aria[property] != null;
}

export function elementInternalsRole(element: Element): string | undefined {
  if (element.hasAttribute('role')) return undefined;
  return snapshots.get(element)?.role;
}

export function elementInternalsLabelText(element: Element): string {
  return snapshots.get(element)?.labels.map((label) => label.text).filter(Boolean).join(' ').replace(/\s+/g, ' ').trim() ?? '';
}
