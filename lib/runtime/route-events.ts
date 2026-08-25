import { RULES } from '../../shared/rule-catalog';
import type { ElementSnapshot, RuntimeEvent } from '../../shared/types';
import { createRuntimeCause as cause } from './events';

type PendingRuntimeEvent = Omit<RuntimeEvent, 'id' | 'timestamp'>;

export function createRouteChangeEvent(fromUrl: string, toUrl: string): PendingRuntimeEvent {
  return {
    kind: 'route',
    severity: 'info',
    title: 'SPA/navigation URL change detected',
    fromUrl,
    toUrl,
  };
}

interface RouteFocusUnchangedEventInput {
  fromUrl: string;
  toUrl: string;
  activeSelector: string;
  focusRemained: boolean;
  activeElement?: ElementSnapshot;
}

export function createRouteFocusUnchangedEvent({
  fromUrl,
  toUrl,
  activeSelector,
  focusRemained,
  activeElement,
}: RouteFocusUnchangedEventInput): PendingRuntimeEvent {
  return {
    kind: 'route',
    severity: RULES.spaFocusUnchanged.severity,
    outcome: 'review',
    ruleId: RULES.spaFocusUnchanged.id,
    references: RULES.spaFocusUnchanged.references,
    title: RULES.spaFocusUnchanged.title,
    detail: `The URL changed from ${fromUrl} to ${toUrl}, but no focus transition was observed. Focus ${
      focusRemained ? 'remained on' : 'ended on'
    } ${activeSelector}. Review whether users are left at a meaningful location in the new view.`,
    ...(activeElement ? { element: activeElement } : {}),
    fromUrl,
    toUrl,
    causes: [
      cause(
        'ROUTE_CHANGED_WITHOUT_FOCUS_MOVE',
        'The SPA route changed without a subsequent focus transition.',
      ),
    ],
  };
}

interface RouteTitleUnchangedEventInput {
  fromUrl: string;
  toUrl: string;
  title: string;
}

export function createRouteTitleUnchangedEvent({
  fromUrl,
  toUrl,
  title,
}: RouteTitleUnchangedEventInput): PendingRuntimeEvent {
  return {
    kind: 'route',
    severity: RULES.spaTitleUnchanged.severity,
    outcome: 'review',
    ruleId: RULES.spaTitleUnchanged.id,
    references: RULES.spaTitleUnchanged.references,
    title: RULES.spaTitleUnchanged.title,
    detail: `The URL changed from ${fromUrl} to ${toUrl}, but document.title remained ${JSON.stringify(
      title,
    )}. Review whether the new SPA view represents a distinct page/topic that needs a descriptive title.`,
    fromUrl,
    toUrl,
  };
}
