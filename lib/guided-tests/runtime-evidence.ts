import type { RuntimeEvent, RuntimeEventKind } from '../../shared/types';
import type { GuidedEvidence } from './framework';

const MAX_RUNTIME_EVIDENCE = 2;

type GuidedRuntimeEvidencePolicy = {
  kinds: RuntimeEventKind[];
  ariaWidgetRuleIds?: string[];
};

const POLICY_BY_TEST: Record<string, GuidedRuntimeEvidencePolicy> = {
  'FT-GUIDED-002': {
    kinds: ['keydown', 'click', 'focus', 'focus-lost', 'focus-walk-start', 'focus-walk-end'],
  },
  'FT-GUIDED-003': {
    kinds: ['focus', 'virtual-focus', 'focus-hidden', 'focus-obscured', 'focus-lost', 'dialog-open', 'dialog-close', 'dialog-focus-escape'],
  },
  'FT-GUIDED-004': {
    kinds: ['keydown', 'focus', 'dialog-open', 'dialog-close', 'dialog-focus-escape'],
  },
  'FT-GUIDED-009': {
    kinds: ['keydown', 'focus', 'aria-widget'],
    ariaWidgetRuleIds: ['FT-APG-004', 'FT-RUNTIME-ARIA-002'],
  },
  'FT-GUIDED-010': {
    kinds: ['keydown', 'click', 'focus', 'aria-widget'],
    ariaWidgetRuleIds: ['FT-RUNTIME-ARIA-001'],
  },
  'FT-GUIDED-011': {
    kinds: ['keydown', 'focus', 'aria-widget'],
    ariaWidgetRuleIds: ['FT-APG-005', 'FT-APG-006'],
  },
  'FT-GUIDED-012': {
    kinds: ['keydown', 'focus', 'virtual-focus', 'aria-widget'],
    ariaWidgetRuleIds: ['FT-RUNTIME-ARIA-003', 'FT-RUNTIME-ARIA-004', 'FT-RUNTIME-ARIA-005', 'FT-APG-008', 'FT-APG-009', 'FT-APG-010'],
  },
  'FT-GUIDED-013': {
    kinds: ['keydown', 'focus', 'virtual-focus', 'aria-widget'],
    ariaWidgetRuleIds: ['FT-APG-008', 'FT-APG-011', 'FT-RUNTIME-ARIA-006', 'FT-APG-012', 'FT-APG-014', 'FT-RUNTIME-ARIA-005'],
  },
  'FT-GUIDED-014': {
    kinds: ['keydown', 'focus', 'virtual-focus', 'aria-widget'],
    ariaWidgetRuleIds: ['FT-APG-008', 'FT-APG-011', 'FT-APG-013', 'FT-RUNTIME-ARIA-005'],
  },
  'FT-GUIDED-015': {
    kinds: ['keydown', 'click', 'focus', 'dom-mutation'],
  },
  'FT-GUIDED-016': {
    kinds: ['keydown', 'focus', 'hover-focus-content'],
  },
};

function eventSummary(event: RuntimeEvent): string {
  const target = event.element?.selector ? ` @ ${event.element.selector}` : '';
  const outcome = event.outcome ? ` [${event.outcome}]` : '';
  return `${event.kind}: ${event.title}${target}${outcome}`;
}

function eventMatchesPolicy(event: RuntimeEvent, policy: GuidedRuntimeEvidencePolicy): boolean {
  if (!policy.kinds.includes(event.kind)) return false;
  if (event.kind !== 'aria-widget' || !policy.ariaWidgetRuleIds?.length) return true;
  return Boolean(event.ruleId && policy.ariaWidgetRuleIds.includes(event.ruleId));
}

export function hasGuidedRuntimeEvidence(testId: string): boolean {
  return Boolean(POLICY_BY_TEST[testId]?.kinds.length);
}

export function guidedRuntimeEvidence(
  events: RuntimeEvent[],
  testId: string,
  startedAt: number,
  now = Date.now(),
): GuidedEvidence[] {
  const policy = POLICY_BY_TEST[testId];
  if (!policy) return [];

  return events
    .filter((event) => event.timestamp >= startedAt && event.timestamp <= now && eventMatchesPolicy(event, policy))
    .slice(-MAX_RUNTIME_EVIDENCE)
    .map((event) => ({
      kind: 'runtime-observation' as const,
      label: 'Observed runtime event',
      value: eventSummary(event),
      capturedAt: event.timestamp,
    }));
}
