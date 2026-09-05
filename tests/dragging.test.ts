// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import {
  createDraggingReviewEvent,
  isPotentialDraggingTarget,
  RuntimeDragTracker,
} from '../lib/runtime/dragging';
import type { ElementSnapshot } from '../shared/types';

const element: ElementSnapshot = {
  tag: 'div',
  selector: '#sortable-item',
  name: 'Sortable item',
};

describe('runtime dragging review', () => {
  it('recognizes explicit drag semantics without treating generic elements as draggable', () => {
    document.body.innerHTML = `
      <div id="plain">Plain content</div>
      <div data-drag-handle><span id="handle-child">Move</span></div>
    `;

    expect(isPotentialDraggingTarget(document.querySelector('#handle-child')!)).toBe(true);
    expect(isPotentialDraggingTarget(document.querySelector('#plain')!)).toBe(false);
  });

  it('recognizes cursor and semantic naming hints used by custom drag controls', () => {
    document.body.innerHTML = `
      <div id="cursor-target" style="cursor: grab">Grab</div>
      <div id="card-reorder-handle">Reorder</div>
    `;

    expect(isPotentialDraggingTarget(document.querySelector('#cursor-target')!)).toBe(true);
    expect(isPotentialDraggingTarget(document.querySelector('#card-reorder-handle')!)).toBe(true);
  });

  it('ignores small pointer movement that does not establish a drag', () => {
    const tracker = new RuntimeDragTracker();
    tracker.start({
      pointerId: 1,
      interactionId: 'interaction-1',
      element,
      x: 10,
      y: 10,
    });
    tracker.move(1, 14, 13);

    expect(tracker.finish(1)).toBeUndefined();
  });

  it('records a real pointer path as a WCAG 2.5.7 review instead of a failure', () => {
    const tracker = new RuntimeDragTracker();
    tracker.start({
      pointerId: 7,
      interactionId: 'interaction-7',
      element,
      x: 20,
      y: 30,
    });
    tracker.move(7, 32, 30);

    const observation = tracker.finish(7);
    expect(observation).toMatchObject({
      interactionId: 'interaction-7',
      distancePx: 12,
    });

    const event = createDraggingReviewEvent(observation!);
    expect(event).toMatchObject({
      kind: 'dragging',
      ruleId: 'FT-RUNTIME-006',
      outcome: 'review',
      severity: 'moderate',
      element,
    });
    expect(event.references?.some((reference) => reference.type === 'WCAG' && reference.id === '2.5.7')).toBe(true);
  });

  it('ignores movement from a different pointer and reset clears the active path', () => {
    const tracker = new RuntimeDragTracker();
    tracker.start({
      pointerId: 5,
      interactionId: 'interaction-5',
      element,
      x: 0,
      y: 0,
    });
    tracker.move(99, 40, 0);
    expect(tracker.finish(99)).toBeUndefined();

    tracker.move(5, 40, 0);
    tracker.reset();
    expect(tracker.finish(5)).toBeUndefined();
  });

  it('cancels a pending path without producing a dragging review', () => {
    const tracker = new RuntimeDragTracker();
    tracker.start({
      pointerId: 3,
      interactionId: 'interaction-3',
      element,
      x: 0,
      y: 0,
    });
    tracker.move(3, 40, 0);
    tracker.cancel(3);

    expect(tracker.finish(3)).toBeUndefined();
  });
});
