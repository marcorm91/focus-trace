import {
  CLOSED_SHADOW_HOST_EVENT,
  CLOSED_SHADOW_REQUEST_EVENT,
  MAX_CLOSED_SHADOW_HOSTS,
} from '../../shared/nested-context-bridge';

const INSTALL_MARKER = '__focustraceClosedShadowBridgeV1';

type BridgeWindow = Window & { [INSTALL_MARKER]?: boolean };

export function installClosedShadowMainWorldBridge(): boolean {
  const bridgeWindow = window as BridgeWindow;
  if (bridgeWindow[INSTALL_MARKER]) return true;

  const descriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'attachShadow');
  const original = descriptor?.value;
  if (typeof original !== 'function') return false;

  const closedHosts = new Set<Element>();
  const wrapped = function attachShadow(this: Element, init: ShadowRootInit): ShadowRoot {
    const shadowRoot = Reflect.apply(original, this, [init]) as ShadowRoot;
    if (init?.mode === 'closed' && closedHosts.size < MAX_CLOSED_SHADOW_HOSTS) closedHosts.add(this);
    return shadowRoot;
  };

  try {
    Object.defineProperty(Element.prototype, 'attachShadow', {
      ...descriptor,
      value: wrapped,
    });
  } catch {
    return false;
  }

  bridgeWindow[INSTALL_MARKER] = true;
  window.addEventListener(CLOSED_SHADOW_REQUEST_EVENT, () => {
    for (const host of closedHosts) {
      if (!host.isConnected) {
        closedHosts.delete(host);
        continue;
      }
      try {
        host.dispatchEvent(new CustomEvent(CLOSED_SHADOW_HOST_EVENT, {
          bubbles: true,
          composed: true,
        }));
      } catch {
        // An individual detached/restricted host must not break the request.
      }
    }
  });

  return true;
}
