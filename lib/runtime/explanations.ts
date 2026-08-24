import type { FindingOutcome, RuntimeCauseType, RuntimeEvent, RuntimeInteraction } from '../../shared/types';

export type ExplanationLevel = 'simple' | 'accessibility' | 'developer';

export interface RuntimeCauseExplanation {
  title: string;
  summary: string;
  impact: string;
  recommendation: string;
  accessibility: string;
}

const CAUSE_EXPLANATIONS: Record<RuntimeCauseType, RuntimeCauseExplanation> = {
  FOCUSED_NODE_REMOVED: {
    title: 'Focus was lost after an element disappeared',
    summary: 'The control that had keyboard focus was removed during the interaction.',
    impact: 'Keyboard and screen reader users may lose their place and may not know where to continue.',
    recommendation: 'Move focus to the next logical control or to the newly displayed content after the update.',
    accessibility: 'Review focus order and focus management after dynamic content changes. WCAG 2.4.3 may be relevant.',
  },
  FOCUS_FELL_BACK_TO_BODY: {
    title: 'Focus fell back to the page instead of a useful control',
    summary: 'After the interface changed, browser focus ended on the document body.',
    impact: 'Keyboard users can lose their current position and may need to restart navigation from an unexpected place.',
    recommendation: 'Choose a meaningful focus destination after the interaction completes.',
    accessibility: 'Review whether the resulting focus order preserves meaning and operability under WCAG 2.4.3.',
  },
  DIALOG_OPENED_WITHOUT_FOCUS: {
    title: 'The dialog opened but focus stayed outside it',
    summary: 'A dialog became available without moving keyboard focus into the dialog.',
    impact: 'Keyboard and screen reader users may continue interacting with content behind the dialog or miss the dialog entirely.',
    recommendation: 'When a modal dialog opens, place focus on an appropriate control or meaningful element inside it.',
    accessibility: 'The WAI-ARIA APG modal dialog pattern expects focus to move inside the dialog when it opens.',
  },
  MODAL_FOCUS_ESCAPE: {
    title: 'Focus moved outside the open modal',
    summary: 'Keyboard focus left a modal dialog while the dialog remained open.',
    impact: 'Users can reach background content that should be unavailable while the modal is active.',
    recommendation: 'Keep keyboard focus within the modal until it closes, while preserving a logical tab order inside it.',
    accessibility: 'Review the modal focus loop against the WAI-ARIA APG modal dialog pattern.',
  },
  ROUTE_CHANGED_WITHOUT_FOCUS_MOVE: {
    title: 'The view changed but keyboard focus did not',
    summary: 'The SPA route changed without an observed focus transition to the new view.',
    impact: 'Keyboard and screen reader users may remain at a location that no longer represents what is on screen.',
    recommendation: 'When the navigation changes context, move focus to a meaningful location in the new view when appropriate.',
    accessibility: 'This is workflow-dependent. Review focus order and context after client-side navigation under WCAG 2.4.3.',
  },
  FOCUSED_ELEMENT_BECAME_HIDDEN: {
    title: 'The element with focus became hidden',
    summary: 'The focused element, or one of its ancestors, became hidden while focus was still associated with it.',
    impact: 'Keyboard users may be focused on something they cannot see or operate reliably, and assistive technology may lose the expected context.',
    recommendation: 'Move focus before hiding the focused content, or keep the focused target available until focus has moved safely.',
    accessibility: 'Review focus order and programmatic visibility. WCAG 2.4.3 and 4.1.2 may be relevant depending on the pattern.',
  },
};

export function explanationForCause(type: RuntimeCauseType): RuntimeCauseExplanation {
  return CAUSE_EXPLANATIONS[type];
}

function quotedTarget(event: RuntimeEvent): string | undefined {
  const target = event.element?.name?.trim() || event.element?.role || event.element?.tag;
  return target ? `“${target}”` : undefined;
}

export function humanRuntimeEventTitle(event: RuntimeEvent): string {
  const target = quotedTarget(event);

  switch (event.kind) {
    case 'focus':
      return target ? `Focus moved to ${target}` : 'Focus moved';
    case 'keydown': {
      const key = event.title.replace(/^Key:\s*/, '');
      return target ? `Pressed ${key} on ${target}` : `Pressed ${key}`;
    }
    case 'click':
      return target ? `Activated ${target}` : 'Activated a control';
    case 'route':
      return event.causes?.some((cause) => cause.type === 'ROUTE_CHANGED_WITHOUT_FOCUS_MOVE')
        ? 'The view changed but keyboard focus did not'
        : 'The page view changed';
    case 'dom-mutation':
      return 'Page content changed';
    case 'focus-lost':
      return 'Keyboard focus was lost';
    case 'focus-hidden':
      return 'The focused element became hidden';
    case 'focus-obscured':
      return 'The focused control may be covered by other content';
    case 'dialog-open':
      return event.outcome ? 'A dialog opened without receiving focus' : 'A dialog opened';
    case 'dialog-close':
      return event.outcome ? 'Focus may not have returned after the dialog closed' : 'The dialog closed';
    case 'dialog-focus-escape':
      return 'Focus moved outside the open modal';
    case 'live-region':
      return 'A screen reader announcement region updated';
    default:
      return event.title;
  }
}

export function humanInteractionTitle(interaction: RuntimeInteraction): string {
  const trigger = interaction.trigger;
  if (!trigger) {
    const cause = interaction.causes[0];
    return cause ? explanationForCause(cause.type).title : humanRuntimeEventTitle(interaction.events[0]!);
  }

  const target = trigger.element?.name?.trim() || trigger.element?.role || trigger.element?.tag;
  const quoted = target ? `“${target}”` : 'a control';

  if (trigger.kind === 'click') return `Activated ${quoted}`;
  if (trigger.kind === 'keydown') {
    const key = trigger.title.replace(/^Key:\s*/, '');
    if (key === 'Enter' || key === 'Space') return `Activated ${quoted} with the keyboard`;
    if (key === 'Tab') return `Pressed Tab on ${quoted}`;
    return `Pressed ${key} on ${quoted}`;
  }

  return humanRuntimeEventTitle(trigger);
}

export function outcomeLabel(outcome: FindingOutcome, level: ExplanationLevel): string {
  if (level !== 'simple') return outcome;
  if (outcome === 'fail') return 'issue';
  if (outcome === 'review') return 'needs review';
  return 'warning';
}

export function explanationLevelDescription(level: ExplanationLevel): string {
  if (level === 'simple') return 'Plain-language impact and next steps. Technical identifiers stay hidden.';
  if (level === 'accessibility') return 'Adds standards references, outcomes and audit evidence.';
  return 'Shows selectors, event details, mutations, routes and internal cause identifiers.';
}
