import { HOVER_FOCUS_CONTENT_RULE } from '../../shared/hover-focus-content-rules';
import type { ElementSnapshot, RuntimeEvent } from '../../shared/types';
import { snapshot } from './page-inspection';

type PendingRuntimeEvent = Omit<RuntimeEvent, 'id' | 'timestamp'>;

export type HoverFocusTriggerMode = 'hover' | 'focus';
export type HoverFocusRequirement = 'dismissible' | 'hoverable' | 'persistent';

export interface RectSnapshot {
  top: number;
  right: number;
  bottom: number;
  left: number;
  width: number;
  height: number;
}

interface VisibilityEntry {
  visible: boolean;
  rect?: RectSnapshot;
}

export type HoverFocusVisibilitySnapshot = Map<Element, VisibilityEntry>;

export interface HoverFocusObservation {
  key: string;
  mode: HoverFocusTriggerMode;
  trigger: Element;
  triggerSnapshot: ElementSnapshot;
  additionalContent: Element;
  additionalSnapshot: ElementSnapshot;
  rect: RectSnapshot;
  obscuresOtherContent: boolean;
  observedAt: number;
  pointerEnteredAdditional: boolean;
  lastPointer?: { x: number; y: number };
  dismissalAttemptAt?: number;
}

export interface HoverFocusTrackerOptions {
  maxElements?: number;
  maxActiveObservations?: number;
  proximityPx?: number;
  now?: () => number;
}

const DEFAULT_MAX_ELEMENTS = 3_000;
const DEFAULT_MAX_ACTIVE = 6;
const DEFAULT_PROXIMITY_PX = 96;
const DISMISSAL_GRACE_MS = 600;
const INACTIVE_RETENTION_MS = 1_000;
const MIN_OVERLAP_AREA = 36;
const NON_RENDERED_TAGS = new Set(['SCRIPT', 'STYLE', 'TEMPLATE', 'NOSCRIPT', 'META', 'LINK']);

function finite(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

export function rectSnapshot(rect: DOMRect | DOMRectReadOnly): RectSnapshot {
  return {
    top: finite(rect.top),
    right: finite(rect.right),
    bottom: finite(rect.bottom),
    left: finite(rect.left),
    width: Math.max(0, finite(rect.width)),
    height: Math.max(0, finite(rect.height)),
  };
}

function viewportWidth(): number {
  return typeof innerWidth === 'number' && innerWidth > 0 ? innerWidth : Number.POSITIVE_INFINITY;
}

function viewportHeight(): number {
  return typeof innerHeight === 'number' && innerHeight > 0 ? innerHeight : Number.POSITIVE_INFINITY;
}

export function visuallyVisibleEntry(element: Element): VisibilityEntry {
  if (!element.isConnected || NON_RENDERED_TAGS.has(element.tagName)) return { visible: false };

  const style = getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') {
    return { visible: false };
  }
  const opacity = Number.parseFloat(style.opacity || '1');
  if (Number.isFinite(opacity) && opacity <= 0.01) return { visible: false };

  const rect = rectSnapshot(element.getBoundingClientRect());
  if (rect.width <= 0.5 || rect.height <= 0.5) return { visible: false };
  if (rect.right <= 0 || rect.bottom <= 0 || rect.left >= viewportWidth() || rect.top >= viewportHeight()) {
    return { visible: false };
  }
  return { visible: true, rect };
}

export function captureHoverFocusVisibility(
  root: ParentNode = document,
  limit = DEFAULT_MAX_ELEMENTS,
): HoverFocusVisibilitySnapshot {
  const result: HoverFocusVisibilitySnapshot = new Map();
  const candidates: Element[] = [];
  if (root instanceof Element) candidates.push(root);
  for (const element of root.querySelectorAll('*')) {
    candidates.push(element);
    if (candidates.length >= limit) break;
  }
  for (const element of candidates) result.set(element, visuallyVisibleEntry(element));
  return result;
}

function rectDistance(a: RectSnapshot, b: RectSnapshot): number {
  const dx = Math.max(a.left - b.right, b.left - a.right, 0);
  const dy = Math.max(a.top - b.bottom, b.top - a.bottom, 0);
  return Math.hypot(dx, dy);
}

function overlapArea(a: RectSnapshot, b: RectSnapshot): number {
  const width = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
  const height = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  return width * height;
}

function pointInRect(x: number, y: number, rect: RectSnapshot): boolean {
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

function referencedIds(trigger: Element): Set<string> {
  const ids = new Set<string>();
  for (const attribute of ['aria-controls', 'aria-describedby', 'aria-details']) {
    for (const token of (trigger.getAttribute(attribute) ?? '').trim().split(/\s+/)) {
      if (token) ids.add(token);
    }
  }
  return ids;
}

function isExplicitlyRelated(trigger: Element, candidate: Element, ids: Set<string>): boolean {
  if (candidate.id && ids.has(candidate.id)) return true;
  for (const id of ids) {
    const related = trigger.ownerDocument.getElementById(id);
    if (related && (related === candidate || candidate.contains(related) || related.contains(candidate))) return true;
  }
  return false;
}

function isNearTrigger(triggerRect: RectSnapshot, candidateRect: RectSnapshot, proximityPx: number): boolean {
  return rectDistance(triggerRect, candidateRect) <= proximityPx;
}

function outermostNewlyVisible(
  candidates: Element[],
): Element[] {
  const candidateSet = new Set(candidates);
  return candidates.filter((candidate) => {
    let parent = candidate.parentElement;
    while (parent) {
      if (candidateSet.has(parent)) return false;
      parent = parent.parentElement;
    }
    return true;
  });
}

function obscuresBaselineContent(
  candidate: Element,
  candidateRect: RectSnapshot,
  baseline: HoverFocusVisibilitySnapshot,
): boolean {
  for (const [element, entry] of baseline) {
    if (!entry.visible || !entry.rect || element === candidate) continue;
    if (candidate.contains(element) || element.contains(candidate)) continue;
    if (overlapArea(candidateRect, entry.rect) >= MIN_OVERLAP_AREA) return true;
  }
  return false;
}

function triggerActive(observation: HoverFocusObservation): boolean {
  if (!observation.trigger.isConnected) return false;
  if (observation.mode === 'focus') {
    const active = observation.trigger.ownerDocument.activeElement;
    return active === observation.trigger || Boolean(active && observation.trigger.contains(active));
  }
  try {
    return observation.trigger.matches(':hover');
  } catch {
    return false;
  }
}

function detailFor(
  observation: HoverFocusObservation,
  requirement: HoverFocusRequirement,
  evidence: string,
): string {
  return [
    `mode=${observation.mode}`,
    `requirement=${requirement}`,
    `additional=${observation.additionalSnapshot.selector}`,
    `obscures=${observation.obscuresOtherContent ? 'yes' : 'no'}`,
    `evidence=${evidence}`,
  ].join(' · ');
}

export function createHoverFocusContentReview(
  observation: HoverFocusObservation,
  requirement: HoverFocusRequirement,
  evidence: string,
): PendingRuntimeEvent {
  return {
    kind: 'hover-focus-content',
    severity: HOVER_FOCUS_CONTENT_RULE.severity,
    title: `WCAG 1.4.13 · ${requirement} · ${observation.mode}`,
    outcome: 'review',
    ruleId: HOVER_FOCUS_CONTENT_RULE.id,
    references: HOVER_FOCUS_CONTENT_RULE.references,
    element: observation.triggerSnapshot,
    detail: detailFor(observation, requirement, evidence),
  };
}

export class HoverFocusContentTracker {
  private readonly maxElements: number;
  private readonly maxActiveObservations: number;
  private readonly proximityPx: number;
  private readonly now: () => number;
  private baseline: HoverFocusVisibilitySnapshot = new Map();
  private active = new Map<string, HoverFocusObservation>();

  constructor(options: HoverFocusTrackerOptions = {}) {
    this.maxElements = options.maxElements ?? DEFAULT_MAX_ELEMENTS;
    this.maxActiveObservations = options.maxActiveObservations ?? DEFAULT_MAX_ACTIVE;
    this.proximityPx = options.proximityPx ?? DEFAULT_PROXIMITY_PX;
    this.now = options.now ?? (() => Date.now());
  }

  reset(root: ParentNode = document): void {
    this.active.clear();
    this.baseline = captureHoverFocusVisibility(root, this.maxElements);
  }

  clear(): void {
    this.active.clear();
    this.baseline.clear();
  }

  get activeObservations(): readonly HoverFocusObservation[] {
    return [...this.active.values()];
  }

  observeTriggeredContent(
    trigger: Element,
    mode: HoverFocusTriggerMode,
    root: ParentNode = trigger.ownerDocument,
  ): HoverFocusObservation[] {
    if (!trigger.isConnected) return [];
    if (this.baseline.size === 0) this.baseline = captureHoverFocusVisibility(root, this.maxElements);

    const triggerEntry = visuallyVisibleEntry(trigger);
    if (!triggerEntry.visible || !triggerEntry.rect) return [];

    const current = captureHoverFocusVisibility(root, this.maxElements);
    const ids = referencedIds(trigger);
    const newlyVisible: Element[] = [];

    for (const [element, entry] of current) {
      if (!entry.visible || !entry.rect || element === trigger) continue;
      const before = this.baseline.get(element);
      if (before?.visible) continue;
      if (!isExplicitlyRelated(trigger, element, ids)
        && !isNearTrigger(triggerEntry.rect, entry.rect, this.proximityPx)) continue;
      newlyVisible.push(element);
    }

    const observations: HoverFocusObservation[] = [];
    for (const element of outermostNewlyVisible(newlyVisible)) {
      if (this.active.size >= this.maxActiveObservations) break;
      const entry = current.get(element);
      if (!entry?.visible || !entry.rect) continue;
      const triggerSnapshot = snapshot(trigger);
      const additionalSnapshot = snapshot(element);
      const key = `${mode}:${triggerSnapshot.selector}:${additionalSnapshot.selector}`;
      const observation: HoverFocusObservation = {
        key,
        mode,
        trigger,
        triggerSnapshot,
        additionalContent: element,
        additionalSnapshot,
        rect: entry.rect,
        obscuresOtherContent: obscuresBaselineContent(element, entry.rect, this.baseline),
        observedAt: this.now(),
        pointerEnteredAdditional: false,
      };
      this.active.set(key, observation);
      observations.push(observation);
    }

    this.baseline = current;
    return observations;
  }

  recordPointerPosition(x: number, y: number): PendingRuntimeEvent[] {
    const reviews: PendingRuntimeEvent[] = [];
    for (const observation of this.active.values()) {
      if (observation.mode !== 'hover') continue;
      observation.lastPointer = { x, y };
      const current = visuallyVisibleEntry(observation.additionalContent);
      if (current.visible && current.rect) {
        observation.rect = current.rect;
        if (pointInRect(x, y, current.rect)) observation.pointerEnteredAdditional = true;
        continue;
      }
      if (pointInRect(x, y, observation.rect)) {
        reviews.push(createHoverFocusContentReview(
          observation,
          'hoverable',
          'additional content disappeared while the trusted pointer moved into its last observed bounds',
        ));
        this.active.delete(observation.key);
        this.baseline.set(observation.additionalContent, { visible: false });
      }
    }
    return reviews;
  }

  markDismissalAttempt(): void {
    const now = this.now();
    for (const observation of this.active.values()) {
      if (visuallyVisibleEntry(observation.additionalContent).visible) observation.dismissalAttemptAt = now;
    }
  }

  dismissibilityReviews(): PendingRuntimeEvent[] {
    const reviews: PendingRuntimeEvent[] = [];
    const now = this.now();
    for (const observation of this.active.values()) {
      if (observation.dismissalAttemptAt == null) continue;
      const elapsed = now - observation.dismissalAttemptAt;
      if (elapsed > DISMISSAL_GRACE_MS * 3) {
        observation.dismissalAttemptAt = undefined;
        continue;
      }
      const current = visuallyVisibleEntry(observation.additionalContent);
      if (!current.visible) {
        this.active.delete(observation.key);
        this.baseline.set(observation.additionalContent, { visible: false });
        continue;
      }
      if (elapsed < 80) continue;
      observation.dismissalAttemptAt = undefined;
      if (!observation.obscuresOtherContent || !triggerActive(observation)) continue;
      reviews.push(createHoverFocusContentReview(
        observation,
        'dismissible',
        'Escape was pressed while overlapping additional content remained visible and the trigger state remained active; verify whether another mechanism can dismiss it without moving pointer hover or keyboard focus',
      ));
    }
    return reviews;
  }

  lifecycleReviews(): PendingRuntimeEvent[] {
    const reviews: PendingRuntimeEvent[] = [];
    const now = this.now();

    for (const observation of this.active.values()) {
      const current = visuallyVisibleEntry(observation.additionalContent);
      if (current.visible && current.rect) {
        observation.rect = current.rect;
        if (!triggerActive(observation)
          && !observation.pointerEnteredAdditional
          && now - observation.observedAt > INACTIVE_RETENTION_MS) {
          this.active.delete(observation.key);
        }
        continue;
      }

      this.baseline.set(observation.additionalContent, { visible: false });
      const recentlyDismissed = observation.dismissalAttemptAt != null
        && now - observation.dismissalAttemptAt <= DISMISSAL_GRACE_MS;
      if (recentlyDismissed) {
        this.active.delete(observation.key);
        continue;
      }

      const pointerInsideLastBounds = observation.mode === 'hover'
        && observation.lastPointer != null
        && pointInRect(observation.lastPointer.x, observation.lastPointer.y, observation.rect);
      if (pointerInsideLastBounds) {
        reviews.push(createHoverFocusContentReview(
          observation,
          'hoverable',
          'additional content disappeared while the trusted pointer was within its last observed bounds',
        ));
        this.active.delete(observation.key);
        continue;
      }

      if (triggerActive(observation)) {
        reviews.push(createHoverFocusContentReview(
          observation,
          'persistent',
          'additional content disappeared while its observed hover or focus trigger remained active and no dismissal attempt was observed',
        ));
      }
      this.active.delete(observation.key);
    }

    return reviews;
  }
}
