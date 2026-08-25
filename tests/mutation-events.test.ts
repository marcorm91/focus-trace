import { describe, expect, it } from 'vitest';
import {
  createLiveRegionEvent,
  createMutationEvent,
  liveRegionDetail,
  mutationTitle,
} from '../lib/runtime/mutation-events';
import type { RuntimeMutationSnapshot } from '../shared/types';

const target = {
  tag: 'dialog',
  id: 'modal',
  selector: '#modal',
};

function mutation(kind: RuntimeMutationSnapshot['kind']): RuntimeMutationSnapshot {
  return { kind, target };
}

describe('runtime mutation event builders', () => {
  it('creates stable mutation titles', () => {
    expect(mutationTitle(mutation('node-added'))).toBe('DOM added → #modal');
    expect(mutationTitle(mutation('node-removed'))).toBe('DOM removed → #modal');
    expect(mutationTitle(mutation('attribute-changed'))).toBe('DOM attribute changed → #modal');
  });

  it('creates mutation events with target and mutation payload', () => {
    const snapshot = mutation('attribute-changed');

    expect(createMutationEvent(snapshot, 'aria-hidden changed.')).toMatchObject({
      kind: 'dom-mutation',
      severity: 'info',
      title: 'DOM attribute changed → #modal',
      detail: 'aria-hidden changed.',
      element: target,
      mutation: snapshot,
    });
  });

  it('normalizes live region text details', () => {
    expect(liveRegionDetail('  Saved\n successfully   ')).toBe('Saved successfully');
    expect(liveRegionDetail('   ')).toBeUndefined();
    expect(liveRegionDetail('a'.repeat(180))).toHaveLength(160);
  });

  it('creates live region events with optional detail', () => {
    expect(createLiveRegionEvent(target, 'Saved')).toMatchObject({
      kind: 'live-region',
      severity: 'info',
      title: 'Live region updated',
      detail: 'Saved',
      element: target,
    });

    expect(createLiveRegionEvent(target, '   ')).not.toHaveProperty('detail');
  });
});
