import {
  evaluateTextContrastForElement,
  textContrastSubjectsForElement,
} from '../audit/contrast';
import {
  isInactiveContrastElement,
  observedContrastStates,
  type ContrastStateName,
} from '../audit/contrast-state-coverage';
import { isProgrammaticallyHidden } from '../audit/dom';
import { INTERACTIVE_TEXT_CONTRAST_RULE } from '../../shared/interactive-contrast-rules';
import type { RuntimeEvent } from '../../shared/types';
import { snapshot } from './page-inspection';

type PendingRuntimeEvent = Omit<RuntimeEvent, 'id' | 'timestamp'>;
export type RuntimeContrastState = ContrastStateName;

const MAX_TEXT_CANDIDATES = 80;
const MAX_REVIEWS_PER_STATE = 8;
const MIN_SETTLE_MS = 34;
const MAX_SETTLE_MS = 1_000;
const SETTLE_PADDING_MS = 34;
const SEMANTIC_STATES = new Set<RuntimeContrastState>([
  'checked',
  'unchecked',
  'expanded',
  'collapsed',
  'selected',
  'unselected',
  'pressed',
  'unpressed',
]);

function cssTimeMs(token: string): number {
  const value = token.trim().toLowerCase();
  if (!value) return 0;
  if (value.endsWith('ms')) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  }
  if (value.endsWith('s')) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? Math.max(0, parsed * 1_000) : 0;
  }
  return 0;
}

function transitionTotalMs(style: CSSStyleDeclaration): number {
  const durations = style.transitionDuration.split(',').map(cssTimeMs);
  const delays = style.transitionDelay.split(',').map(cssTimeMs);
  const count = Math.max(durations.length, delays.length);
  let maximum = 0;
  for (let index = 0; index < count; index += 1) {
    const duration = durations[index % Math.max(1, durations.length)] ?? 0;
    const delay = delays[index % Math.max(1, delays.length)] ?? 0;
    maximum = Math.max(maximum, duration + delay);
  }
  return maximum;
}

function boundedElements(root: Element, limit = MAX_TEXT_CANDIDATES): Element[] {
  const result = [root];
  if (limit <= 1) return result;
  for (const element of root.querySelectorAll('*')) {
    result.push(element);
    if (result.length >= limit) break;
  }
  return result;
}

export function interactiveContrastSettleDelay(element: Element): number {
  let transitionMs = 0;
  for (const candidate of boundedElements(element, 16)) {
    transitionMs = Math.max(transitionMs, transitionTotalMs(getComputedStyle(candidate)));
  }
  return Math.min(MAX_SETTLE_MS, Math.max(MIN_SETTLE_MS, Math.ceil(transitionMs + SETTLE_PADDING_MS)));
}

function interactiveContrastStateIsActive(
  element: Element,
  state: RuntimeContrastState,
): boolean {
  return observedContrastStates(element).includes(state);
}

export function activeSemanticContrastStates(element: Element): RuntimeContrastState[] {
  return observedContrastStates(element).filter((state) => SEMANTIC_STATES.has(state));
}

function neutralContrastDetail(input: {
  state: RuntimeContrastState;
  subject: string;
  ratio: number;
  requiredRatio: number;
  foreground?: string;
  background?: string;
  fontSizePx?: number;
  fontWeight?: number;
}): string {
  const tokens = [
    `state=${input.state}`,
    `subject=${input.subject}`,
    `ratio=${input.ratio.toFixed(2)}:1`,
    `required=${input.requiredRatio}:1`,
  ];
  if (input.foreground) tokens.push(`foreground=${input.foreground}`);
  if (input.background) tokens.push(`background=${input.background}`);
  if (input.fontSizePx != null) tokens.push(`font-size=${Number(input.fontSizePx.toFixed(2))}px`);
  if (input.fontWeight != null) tokens.push(`font-weight=${input.fontWeight}`);
  return tokens.join(' · ');
}

/**
 * Evaluates only the currently rendered state. The caller is responsible for
 * observing a trusted user interaction and waiting for the state transition to
 * settle before calling this function.
 *
 * Even when the measured ratio is deterministic, the runtime signal remains a
 * REVIEW because FocusTrace has observed one bounded interaction state rather
 * than proving every possible state and WCAG applicability branch.
 */
export function interactiveTextContrastReviews(
  root: Element,
  state: RuntimeContrastState,
): PendingRuntimeEvent[] {
  if (!root.isConnected || !interactiveContrastStateIsActive(root, state)) return [];

  const reviews: PendingRuntimeEvent[] = [];
  for (const element of boundedElements(root)) {
    if (reviews.length >= MAX_REVIEWS_PER_STATE) break;
    if (isProgrammaticallyHidden(element) || isInactiveContrastElement(element)) continue;

    for (const subject of textContrastSubjectsForElement(element)) {
      const evaluation = evaluateTextContrastForElement(element, subject.pseudo);
      if (evaluation.status !== 'fail' || evaluation.ratio == null || evaluation.requiredRatio == null) continue;

      const elementSnapshot = snapshot(element);
      reviews.push({
        kind: 'contrast-state',
        severity: INTERACTIVE_TEXT_CONTRAST_RULE.severity,
        title: `WCAG 1.4.3 · ${state} · ${evaluation.ratio.toFixed(2)}:1`,
        outcome: 'review',
        ruleId: INTERACTIVE_TEXT_CONTRAST_RULE.id,
        references: INTERACTIVE_TEXT_CONTRAST_RULE.references,
        element: elementSnapshot,
        detail: neutralContrastDetail({
          state,
          subject: subject.subject,
          ratio: evaluation.ratio,
          requiredRatio: evaluation.requiredRatio,
          foreground: evaluation.foreground,
          background: evaluation.background,
          fontSizePx: evaluation.fontSizePx,
          fontWeight: evaluation.fontWeight,
        }),
      });
    }
  }
  return reviews;
}
