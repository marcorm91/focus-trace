import type { ElementSnapshot, RuntimeEvent } from '../../shared/types';
import { RULES } from '../../shared/rule-catalog';

type PendingRuntimeEvent = Omit<RuntimeEvent, 'id' | 'timestamp'>;

const DRAG_DISTANCE_PX = 8;
const DRAG_CURSOR_TOKENS = new Set([
  'grab',
  'grabbing',
  'move',
  'col-resize',
  'row-resize',
  'ew-resize',
  'ns-resize',
  'nesw-resize',
  'nwse-resize',
]);

export interface DragObservation {
  interactionId: string;
  element: ElementSnapshot;
  distancePx: number;
}

interface PendingDrag {
  pointerId: number;
  interactionId: string;
  element: ElementSnapshot;
  startX: number;
  startY: number;
  maxDistancePx: number;
}

export function isPotentialDraggingTarget(element: Element): boolean {
  const candidate = element.closest([
    '[draggable="true"]',
    '[aria-grabbed]',
    '[data-draggable]',
    '[data-drag-handle]',
    '[data-sortable]',
    '[data-reorder]',
    '[role="slider"]',
    '[role="scrollbar"]',
  ].join(', '));
  if (candidate) return true;

  const style = getComputedStyle(element);
  if (DRAG_CURSOR_TOKENS.has(style.cursor)) return true;
  if (style.touchAction === 'none') return true;

  const semanticHint = [element.id, element.className]
    .filter((value): value is string => typeof value === 'string')
    .join(' ')
    .toLowerCase();
  return /(?:^|[-_\s])(drag|draggable|handle|sortable|reorder|resize)(?:$|[-_\s])/.test(semanticHint);
}

export class RuntimeDragTracker {
  private pending?: PendingDrag;

  start(input: {
    pointerId: number;
    interactionId: string;
    element: ElementSnapshot;
    x: number;
    y: number;
  }): void {
    this.pending = {
      pointerId: input.pointerId,
      interactionId: input.interactionId,
      element: input.element,
      startX: input.x,
      startY: input.y,
      maxDistancePx: 0,
    };
  }

  move(pointerId: number, x: number, y: number): void {
    if (!this.pending || this.pending.pointerId !== pointerId) return;
    const distance = Math.hypot(x - this.pending.startX, y - this.pending.startY);
    this.pending.maxDistancePx = Math.max(this.pending.maxDistancePx, distance);
  }

  finish(pointerId: number): DragObservation | undefined {
    if (!this.pending || this.pending.pointerId !== pointerId) return undefined;
    const pending = this.pending;
    this.pending = undefined;
    if (pending.maxDistancePx < DRAG_DISTANCE_PX) return undefined;
    return {
      interactionId: pending.interactionId,
      element: pending.element,
      distancePx: pending.maxDistancePx,
    };
  }

  cancel(pointerId?: number): void {
    if (pointerId == null || this.pending?.pointerId === pointerId) this.pending = undefined;
  }

  reset(): void {
    this.pending = undefined;
  }
}

export function createDraggingReviewEvent(observation: DragObservation): PendingRuntimeEvent {
  const rule = RULES.draggingMovement;
  return {
    kind: 'dragging',
    severity: rule.severity,
    title: rule.title,
    outcome: 'review',
    ruleId: rule.id,
    references: rule.references,
    element: observation.element,
    detail: `Observed pointer movement of approximately ${Math.round(observation.distancePx)} CSS px. Review whether the same functionality is available without a dragging movement.`,
  };
}
