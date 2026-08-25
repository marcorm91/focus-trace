import { describe, expect, it } from 'vitest';
import {
  createRouteChangeEvent,
  createRouteFocusUnchangedEvent,
  createRouteTitleUnchangedEvent,
} from '../lib/runtime/route-events';

describe('runtime route event builders', () => {
  it('creates an informational route change event', () => {
    expect(createRouteChangeEvent('https://app.test/home', 'https://app.test/settings')).toMatchObject({
      kind: 'route',
      severity: 'info',
      title: 'SPA/navigation URL change detected',
      fromUrl: 'https://app.test/home',
      toUrl: 'https://app.test/settings',
    });
  });

  it('creates a review event when route focus does not move', () => {
    const event = createRouteFocusUnchangedEvent({
      fromUrl: 'https://app.test/home',
      toUrl: 'https://app.test/settings',
      activeSelector: '#menu',
      focusRemained: true,
      activeElement: {
        tag: 'button',
        id: 'menu',
        selector: '#menu',
        name: 'Menu',
      },
    });

    expect(event).toMatchObject({
      kind: 'route',
      severity: 'moderate',
      outcome: 'review',
      ruleId: 'FT-RUNTIME-004',
      title: 'SPA route changed without moving focus',
      fromUrl: 'https://app.test/home',
      toUrl: 'https://app.test/settings',
      element: {
        tag: 'button',
        id: 'menu',
        selector: '#menu',
        name: 'Menu',
      },
      causes: [
        {
          type: 'ROUTE_CHANGED_WITHOUT_FOCUS_MOVE',
          confidence: 'deterministic',
          summary: 'The SPA route changed without a subsequent focus transition.',
        },
      ],
    });
    expect(event.detail).toContain('Focus remained on #menu');
  });

  it('creates a review event when route title does not change', () => {
    const event = createRouteTitleUnchangedEvent({
      fromUrl: 'https://app.test/home',
      toUrl: 'https://app.test/settings',
      title: 'Dashboard',
    });

    expect(event).toMatchObject({
      kind: 'route',
      severity: 'moderate',
      outcome: 'review',
      ruleId: 'FT-RUNTIME-003',
      title: 'SPA route changed without a document title change',
      fromUrl: 'https://app.test/home',
      toUrl: 'https://app.test/settings',
    });
    expect(event.detail).toContain('document.title remained "Dashboard"');
  });
});
