import {
  ELEMENT_INTERNALS_ARIA_PROPERTIES,
  ELEMENT_INTERNALS_BRIDGE_SCHEMA,
  ELEMENT_INTERNALS_KEY_ATTRIBUTE,
  ELEMENT_INTERNALS_REQUEST_ATTRIBUTE,
  ELEMENT_INTERNALS_REQUEST_EVENT,
  ELEMENT_INTERNALS_RESPONSE_ATTRIBUTE,
  type ElementInternalsBridgeResponse,
  type ElementInternalsLabelSnapshot,
  type ElementInternalsSemanticSnapshot,
} from '../../shared/element-internals-bridge';

const INSTALL_MARKER = '__focustraceElementInternalsBridgeV1';
const MAX_VALUE_LENGTH = 2048;
const MAX_LABELS = 16;
const MAX_SNAPSHOTS = 2000;

type BridgeWindow = Window & { [INSTALL_MARKER]?: boolean };
type InternalsRecord = Record<string, unknown>;

function normalized(value: unknown, maxLength = MAX_VALUE_LENGTH): string | undefined {
  if (typeof value !== 'string') return undefined;
  const result = value.replace(/\s+/g, ' ').trim();
  return result ? result.slice(0, maxLength) : undefined;
}

function readString(record: InternalsRecord, property: string): string | undefined {
  try {
    return normalized(record[property]);
  } catch {
    return undefined;
  }
}

function readLabels(internals: ElementInternals): { labels: ElementInternalsLabelSnapshot[]; formAssociated: boolean } {
  try {
    const labels = Array.from(internals.labels ?? []).slice(0, MAX_LABELS).map((label) => ({
      ...(label.id ? { id: label.id.slice(0, 512) } : {}),
      text: normalized(label.textContent) ?? '',
    }));
    // `labels` is available only to form-associated custom elements. An empty
    // NodeList is still meaningful evidence that the host is form-associated.
    return { labels, formAssociated: true };
  } catch {
    try {
      // The `form` getter follows the same form-associated restriction and lets
      // newer engines expose the capability even if `labels` is unavailable.
      void internals.form;
      return { labels: [], formAssociated: true };
    } catch {
      return { labels: [], formAssociated: false };
    }
  }
}

function snapshotFor(
  element: HTMLElement,
  internals: ElementInternals,
  key: string,
): ElementInternalsSemanticSnapshot {
  const record = internals as unknown as InternalsRecord;
  const aria: ElementInternalsSemanticSnapshot['aria'] = {};
  for (const [attribute, property] of Object.entries(ELEMENT_INTERNALS_ARIA_PROPERTIES)) {
    const value = readString(record, property);
    if (value != null) aria[attribute as keyof typeof aria] = value;
  }

  const { labels, formAssociated } = readLabels(internals);
  const role = readString(record, 'role');
  return {
    key,
    ...(role ? { role: role.slice(0, 128) } : {}),
    aria,
    labels,
    formAssociated,
  };
}

export function installElementInternalsMainWorldBridge(): boolean {
  const bridgeWindow = window as BridgeWindow;
  if (bridgeWindow[INSTALL_MARKER]) return true;

  const descriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'attachInternals');
  const original = descriptor?.value;
  if (typeof original !== 'function') return false;

  const captured = new WeakMap<HTMLElement, ElementInternals>();
  const wrapped = function attachInternals(this: HTMLElement): ElementInternals {
    const internals = Reflect.apply(original, this, []) as ElementInternals;
    captured.set(this, internals);
    return internals;
  };

  try {
    Object.defineProperty(HTMLElement.prototype, 'attachInternals', {
      ...descriptor,
      value: wrapped,
    });
  } catch {
    return false;
  }

  bridgeWindow[INSTALL_MARKER] = true;

  window.addEventListener(ELEMENT_INTERNALS_REQUEST_EVENT, () => {
    const root = document.documentElement;
    const requestId = root?.getAttribute(ELEMENT_INTERNALS_REQUEST_ATTRIBUTE);
    if (!root || !requestId) return;

    const snapshots: ElementInternalsSemanticSnapshot[] = [];
    const selector = `[${ELEMENT_INTERNALS_KEY_ATTRIBUTE}]`;
    for (const candidate of Array.from(document.querySelectorAll(selector)).slice(0, MAX_SNAPSHOTS)) {
      if (!(candidate instanceof HTMLElement)) continue;
      const internals = captured.get(candidate);
      if (!internals) continue;
      const key = candidate.getAttribute(ELEMENT_INTERNALS_KEY_ATTRIBUTE);
      if (!key || !key.startsWith(`${requestId}:`)) continue;
      snapshots.push(snapshotFor(candidate, internals, key));
    }

    const response: ElementInternalsBridgeResponse = {
      schema: ELEMENT_INTERNALS_BRIDGE_SCHEMA,
      requestId,
      snapshots,
    };
    try {
      root.setAttribute(ELEMENT_INTERNALS_RESPONSE_ATTRIBUTE, JSON.stringify(response));
    } catch {
      root.removeAttribute(ELEMENT_INTERNALS_RESPONSE_ATTRIBUTE);
    }
  });

  return true;
}
