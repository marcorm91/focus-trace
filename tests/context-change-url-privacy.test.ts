import { describe, expect, it } from 'vitest';
import { RuntimeContextChangeTracker } from '../lib/runtime/context-change';

describe('context-change URL privacy', () => {
  it('keeps raw URL comparison transient while persisting only redacted route evidence', () => {
    const tracker = new RuntimeContextChangeTracker();
    tracker.recordFocus({
      element: { tag: 'input', selector: '#route-trigger' },
      timestamp: 100,
      interactionId: 'ix-route',
    });

    const finding = tracker.recordRouteChange(
      'https://app.test/view?q=private@example.com#secret-before',
      'https://app.test/view?q=another-private@example.com#secret-after',
      180,
    );

    expect(finding).toMatchObject({
      interactionId: 'ix-route',
      event: {
        ruleId: 'FT-RUNTIME-008',
        fromUrl: 'https://app.test/view?[redacted]#[redacted]',
        toUrl: 'https://app.test/view?[redacted]#[redacted]',
      },
    });

    const serialized = JSON.stringify(finding);
    expect(serialized).not.toContain('private@example.com');
    expect(serialized).not.toContain('another-private@example.com');
    expect(serialized).not.toContain('secret-before');
    expect(serialized).not.toContain('secret-after');
  });
});
