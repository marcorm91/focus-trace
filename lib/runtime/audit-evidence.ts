import { explanationForCause, humanInteractionTitle, humanRuntimeEventTitle } from './explanations';
import type { FocusGraph, FocusGraphNode } from './focus-graph';
import type { RuntimeEvent, RuntimeInteraction } from '../../shared/types';

export interface FocusArrivalTrace {
  id: string;
  interactionId: string;
  correlated: boolean;
  title: string;
  arrivedAt: number;
  arrivalEventId: string;
  events: RuntimeEvent[];
}

export interface AuditEvidenceBundle {
  schemaVersion: 1;
  product: 'FocusTrace';
  generatedAt: string;
  scope: 'recorded-journey';
  page?: { url?: string; title?: string };
  summary: {
    focusPoints: number;
    focusEvents: number;
    transitions: number;
    affectedPoints: number;
    runtimeSignals: number;
    interactions: number;
  };
  focusPoints: Array<{
    label: string;
    role: string;
    selector: string;
    visits: number;
    signalCount: number;
    causes: string[];
  }>;
  signals: Array<{
    title: string;
    summary: string;
    impact: string;
    recommendation: string;
    causeType: string;
    timestamp: number;
    nodeId?: string;
    interactionId?: string;
    ruleId?: string;
    references: string[];
  }>;
  interactions: Array<{
    id: string;
    correlated: boolean;
    title: string;
    startedAt: number;
    endedAt: number;
    findings: number;
    causes: string[];
    events: Array<{
      id: string;
      timestamp: number;
      kind: string;
      title: string;
      selector?: string;
      ruleId?: string;
      outcome?: string;
    }>;
  }>;
}

export function focusArrivalTraces(node: FocusGraphNode, interactions: RuntimeInteraction[]): FocusArrivalTrace[] {
  const focusEventIds = new Set(node.focusEventIds);
  const traces: FocusArrivalTrace[] = [];

  for (const interaction of interactions) {
    interaction.events.forEach((event, index) => {
      if (!focusEventIds.has(event.id)) return;
      traces.push({
        id: `${interaction.id}:${event.id}`,
        interactionId: interaction.id,
        correlated: interaction.correlated,
        title: humanInteractionTitle(interaction),
        arrivedAt: event.timestamp,
        arrivalEventId: event.id,
        events: interaction.events.slice(0, index + 1),
      });
    });
  }

  return traces.sort((a, b) => a.arrivedAt - b.arrivedAt);
}

export function buildAuditEvidenceBundle(input: {
  graph: FocusGraph;
  interactions: RuntimeInteraction[];
  page?: { url?: string; title?: string };
  generatedAt?: string;
}): AuditEvidenceBundle {
  const { graph, interactions } = input;
  return {
    schemaVersion: 1,
    product: 'FocusTrace',
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    scope: 'recorded-journey',
    ...(input.page?.url || input.page?.title ? { page: input.page } : {}),
    summary: {
      focusPoints: graph.nodes.length,
      focusEvents: graph.focusEvents,
      transitions: graph.transitions,
      affectedPoints: graph.affectedNodes,
      runtimeSignals: graph.observations.length,
      interactions: interactions.filter((interaction) => interaction.correlated).length,
    },
    focusPoints: graph.nodes.map((node) => ({
      label: node.label,
      role: node.role,
      selector: node.element.selector,
      visits: node.visits,
      signalCount: node.issueCount,
      causes: [...node.causeTypes],
    })),
    signals: graph.observations.map((observation) => {
      const explanation = explanationForCause(observation.causeType);
      return {
        title: explanation.title,
        summary: explanation.summary,
        impact: explanation.impact,
        recommendation: explanation.recommendation,
        causeType: observation.causeType,
        timestamp: observation.timestamp,
        ...(observation.nodeId ? { nodeId: observation.nodeId } : {}),
        ...(observation.interactionId ? { interactionId: observation.interactionId } : {}),
        ...(observation.ruleId ? { ruleId: observation.ruleId } : {}),
        references: (observation.references ?? []).map((reference) =>
          `${reference.type} ${reference.id}${reference.level ? ` · ${reference.level}` : ''} — ${reference.url}`,
        ),
      };
    }),
    interactions: interactions.map((interaction) => ({
      id: interaction.id,
      correlated: interaction.correlated,
      title: humanInteractionTitle(interaction),
      startedAt: interaction.startedAt,
      endedAt: interaction.endedAt,
      findings: interaction.findings,
      causes: interaction.causes.map((cause) => cause.type),
      events: interaction.events.map((event) => ({
        id: event.id,
        timestamp: event.timestamp,
        kind: event.kind,
        title: humanRuntimeEventTitle(event),
        ...(event.element?.selector ? { selector: event.element.selector } : {}),
        ...(event.ruleId ? { ruleId: event.ruleId } : {}),
        ...(event.outcome ? { outcome: event.outcome } : {}),
      })),
    })),
  };
}

export function renderAuditEvidenceMarkdown(bundle: AuditEvidenceBundle): string {
  const lines = [
    '# FocusTrace accessibility evidence',
    '',
    `Generated: ${bundle.generatedAt}`,
    'Scope: recorded journey only',
  ];

  if (bundle.page?.title || bundle.page?.url) {
    lines.push('', '## Page', '', `- Title: ${bundle.page?.title || '—'}`, `- URL: ${bundle.page?.url || '—'}`);
  }

  lines.push(
    '',
    '## Summary',
    '',
    `- Focus points observed: ${bundle.summary.focusPoints}`,
    `- Focus events: ${bundle.summary.focusEvents}`,
    `- Focus transitions: ${bundle.summary.transitions}`,
    `- Affected focus points: ${bundle.summary.affectedPoints}`,
    `- Runtime signals: ${bundle.summary.runtimeSignals}`,
    `- Correlated interactions: ${bundle.summary.interactions}`,
  );

  if (bundle.signals.length) {
    lines.push('', '## Things to review');
    bundle.signals.forEach((signal, index) => {
      lines.push('', `### ${index + 1}. ${signal.title}`, '', signal.summary, '', `**Impact:** ${signal.impact}`, '', `**What to review:** ${signal.recommendation}`);
      if (signal.ruleId) lines.push('', `Rule: ${signal.ruleId}`);
      if (signal.nodeId) lines.push(`Target: ${signal.nodeId}`);
      signal.references.forEach((reference) => lines.push(`Reference: ${reference}`));
    });
  }

  lines.push('', '## Observed focus points');
  bundle.focusPoints.forEach((point, index) => {
    lines.push('', `### ${index + 1}. ${point.label}`, '', `- Role/type: ${point.role}`, `- Visits: ${point.visits}`, `- Signals: ${point.signalCount}`, `- Selector: ${point.selector}`);
  });

  lines.push('', '---', '', 'This export contains evidence from the recorded FocusTrace journey. It is not a complete keyboard map and is not a WCAG conformance claim.');
  return `${lines.join('\n')}\n`;
}

export function renderAuditEvidenceJson(bundle: AuditEvidenceBundle): string {
  return `${JSON.stringify(bundle, null, 2)}\n`;
}
