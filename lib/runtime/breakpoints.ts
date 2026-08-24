import type {
  RuntimeBreakpointHit,
  RuntimeBreakpointId,
  RuntimeBreakpointSettings,
  RuntimeCause,
  RuntimeCauseType,
} from '../../shared/types';

export interface RuntimeBreakpointDefinition {
  id: RuntimeBreakpointId;
  causeType: RuntimeCauseType;
  label: string;
  description: string;
  defaultEnabled: boolean;
}

export const RUNTIME_BREAKPOINTS: readonly RuntimeBreakpointDefinition[] = [
  {
    id: 'focused-node-removed',
    causeType: 'FOCUSED_NODE_REMOVED',
    label: 'Focused node removed',
    description: 'Pause when the element that owns focus is removed from the DOM.',
    defaultEnabled: false,
  },
  {
    id: 'focus-fell-back-to-body',
    causeType: 'FOCUS_FELL_BACK_TO_BODY',
    label: 'Focus falls back to body',
    description: 'Pause when focus falls back to the document body after an interaction.',
    defaultEnabled: false,
  },
  {
    id: 'dialog-opened-without-focus',
    causeType: 'DIALOG_OPENED_WITHOUT_FOCUS',
    label: 'Dialog opens without focus',
    description: 'Pause when a dialog opens but focus is not established inside it.',
    defaultEnabled: false,
  },
  {
    id: 'modal-focus-escape',
    causeType: 'MODAL_FOCUS_ESCAPE',
    label: 'Focus escapes modal',
    description: 'Pause when focus moves outside an open modal dialog.',
    defaultEnabled: false,
  },
  {
    id: 'route-changed-without-focus-move',
    causeType: 'ROUTE_CHANGED_WITHOUT_FOCUS_MOVE',
    label: 'SPA route changes without focus',
    description: 'Pause when a route changes without a subsequent focus transition.',
    defaultEnabled: false,
  },
  {
    id: 'focused-element-became-hidden',
    causeType: 'FOCUSED_ELEMENT_BECAME_HIDDEN',
    label: 'Focused element becomes hidden',
    description: 'Pause when the focused element or an ancestor becomes hidden.',
    defaultEnabled: false,
  },
] as const;

export function defaultRuntimeBreakpointSettings(): RuntimeBreakpointSettings {
  return Object.fromEntries(
    RUNTIME_BREAKPOINTS.map((breakpoint) => [breakpoint.id, breakpoint.defaultEnabled]),
  ) as RuntimeBreakpointSettings;
}

export function normalizeRuntimeBreakpointSettings(
  value?: Partial<RuntimeBreakpointSettings> | null,
): RuntimeBreakpointSettings {
  const defaults = defaultRuntimeBreakpointSettings();
  if (!value) return defaults;

  for (const breakpoint of RUNTIME_BREAKPOINTS) {
    if (typeof value[breakpoint.id] === 'boolean') defaults[breakpoint.id] = value[breakpoint.id] as boolean;
  }

  return defaults;
}

export function runtimeBreakpointDefinition(
  id: RuntimeBreakpointId,
): RuntimeBreakpointDefinition {
  const definition = RUNTIME_BREAKPOINTS.find((breakpoint) => breakpoint.id === id);
  if (!definition) throw new Error(`Unknown runtime breakpoint: ${id}`);
  return definition;
}

export function enabledBreakpointsForCauses(
  causes: RuntimeCause[] | undefined,
  settings: RuntimeBreakpointSettings,
): RuntimeBreakpointDefinition[] {
  if (!causes?.length) return [];
  const causeTypes = new Set(causes.map((cause) => cause.type));
  return RUNTIME_BREAKPOINTS.filter(
    (breakpoint) => settings[breakpoint.id] && causeTypes.has(breakpoint.causeType),
  );
}

export function createRuntimeBreakpointHits(input: {
  causes?: RuntimeCause[];
  settings: RuntimeBreakpointSettings;
  eventId: string;
  timestamp: number;
  interactionId?: string;
}): RuntimeBreakpointHit[] {
  const causesByType = new Map((input.causes ?? []).map((cause) => [cause.type, cause]));

  return enabledBreakpointsForCauses(input.causes, input.settings).map((breakpoint) => {
    const matchedCause = causesByType.get(breakpoint.causeType);
    return {
      breakpointId: breakpoint.id,
      causeType: breakpoint.causeType,
      eventId: input.eventId,
      timestamp: input.timestamp,
      label: breakpoint.label,
      summary: matchedCause?.summary ?? breakpoint.description,
      ...(input.interactionId ? { interactionId: input.interactionId } : {}),
    };
  });
}
