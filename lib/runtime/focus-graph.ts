import type {
  ElementSnapshot,
  RuntimeCauseType,
  RuntimeEvent,
  StandardReference,
} from '../../shared/types';

export interface FocusGraphNode {
  id: string;
  label: string;
  role: string;
  element: ElementSnapshot;
  visits: number;
  firstSeenAt: number;
  lastSeenAt: number;
  incoming: number;
  outgoing: number;
  issueCount: number;
  causeTypes: RuntimeCauseType[];
  focusOrders: number[];
  focusEventIds: string[];
  interactionIds: string[];
}

export interface FocusGraphEdge {
  id: string;
  from: string;
  to: string;
  count: number;
  firstSeenAt: number;
  lastSeenAt: number;
  interactionIds: string[];
}

export interface FocusGraphObservation {
  id: string;
  causeType: RuntimeCauseType;
  timestamp: number;
  eventId: string;
  interactionId?: string;
  nodeId?: string;
  ruleId?: string;
  references?: StandardReference[];
}

export interface FocusGraph {
  nodes: FocusGraphNode[];
  edges: FocusGraphEdge[];
  observations: FocusGraphObservation[];
  focusEvents: number;
  transitions: number;
  repeatedTransitions: number;
  affectedNodes: number;
}

export interface ObservedFocusPathTarget {
  id: string;
  label: string;
  element: ElementSnapshot;
  orders: number[];
  firstSeenAt: number;
  lastSeenAt: number;
}

function nodeId(element: ElementSnapshot): string {
  return element.selector;
}

export function focusGraphNodeLabel(element: ElementSnapshot): string {
  return element.name?.trim() || element.role || element.tag;
}

function focusGraphNodeRole(element: ElementSnapshot): string {
  return element.role || element.tag;
}

function pushUnique<T>(values: T[], value: T): void {
  if (!values.includes(value)) values.push(value);
}

export function buildObservedFocusPath(events: RuntimeEvent[]): ObservedFocusPathTarget[] {
  const targets = new Map<string, ObservedFocusPathTarget>();
  let order = 0;

  for (const event of events) {
    if (event.kind !== 'focus' || !event.element) continue;
    order += 1;

    const id = nodeId(event.element);
    const existing = targets.get(id);
    if (existing) {
      existing.orders.push(order);
      existing.lastSeenAt = event.timestamp;
      existing.element = event.element;
      existing.label = focusGraphNodeLabel(event.element);
      continue;
    }

    targets.set(id, {
      id,
      label: focusGraphNodeLabel(event.element),
      element: event.element,
      orders: [order],
      firstSeenAt: event.timestamp,
      lastSeenAt: event.timestamp,
    });
  }

  return [...targets.values()];
}

export function buildFocusGraph(events: RuntimeEvent[]): FocusGraph {
  const nodes = new Map<string, FocusGraphNode>();
  const edges = new Map<string, FocusGraphEdge>();
  const observations: FocusGraphObservation[] = [];
  let previousFocusNodeId: string | undefined;
  let focusEvents = 0;

  const ensureNode = (element: ElementSnapshot, timestamp: number): FocusGraphNode => {
    const id = nodeId(element);
    const existing = nodes.get(id);
    if (existing) {
      existing.lastSeenAt = Math.max(existing.lastSeenAt, timestamp);
      return existing;
    }

    const created: FocusGraphNode = {
      id,
      label: focusGraphNodeLabel(element),
      role: focusGraphNodeRole(element),
      element,
      visits: 0,
      firstSeenAt: timestamp,
      lastSeenAt: timestamp,
      incoming: 0,
      outgoing: 0,
      issueCount: 0,
      causeTypes: [],
      focusOrders: [],
      focusEventIds: [],
      interactionIds: [],
    };
    nodes.set(id, created);
    return created;
  };

  for (const event of events) {
    if (event.kind === 'focus' && event.element) {
      focusEvents += 1;
      const current = ensureNode(event.element, event.timestamp);
      current.visits += 1;
      current.lastSeenAt = event.timestamp;
      current.focusOrders.push(focusEvents);
      pushUnique(current.focusEventIds, event.id);
      if (event.interactionId) pushUnique(current.interactionIds, event.interactionId);

      if (previousFocusNodeId && previousFocusNodeId !== current.id) {
        const edgeId = `${previousFocusNodeId}→${current.id}`;
        const existing = edges.get(edgeId);
        if (existing) {
          existing.count += 1;
          existing.lastSeenAt = event.timestamp;
          if (event.interactionId) pushUnique(existing.interactionIds, event.interactionId);
        } else {
          const interactionIds = event.interactionId ? [event.interactionId] : [];
          edges.set(edgeId, {
            id: edgeId,
            from: previousFocusNodeId,
            to: current.id,
            count: 1,
            firstSeenAt: event.timestamp,
            lastSeenAt: event.timestamp,
            interactionIds,
          });
          nodes.get(previousFocusNodeId)!.outgoing += 1;
          current.incoming += 1;
        }
      }

      previousFocusNodeId = current.id;
    }

    if (!event.causes?.length) continue;
    const relatedNode = event.element ? ensureNode(event.element, event.timestamp) : undefined;

    for (const cause of event.causes) {
      if (relatedNode) {
        relatedNode.issueCount += 1;
        pushUnique(relatedNode.causeTypes, cause.type);
      }
      observations.push({
        id: `${event.id}:${cause.type}`,
        causeType: cause.type,
        timestamp: event.timestamp,
        eventId: event.id,
        ...(event.interactionId ? { interactionId: event.interactionId } : {}),
        ...(relatedNode ? { nodeId: relatedNode.id } : {}),
        ...(event.ruleId ? { ruleId: event.ruleId } : {}),
        ...(event.references ? { references: event.references } : {}),
      });
    }
  }

  const nodeList = [...nodes.values()].sort((a, b) => a.firstSeenAt - b.firstSeenAt);
  const edgeList = [...edges.values()].sort((a, b) => a.firstSeenAt - b.firstSeenAt);

  return {
    nodes: nodeList,
    edges: edgeList,
    observations,
    focusEvents,
    transitions: edgeList.reduce((total, edge) => total + edge.count, 0),
    repeatedTransitions: edgeList.filter((edge) => edge.count > 1).length,
    affectedNodes: nodeList.filter((node) => node.issueCount > 0).length,
  };
}

export function outgoingFocusEdges(graph: FocusGraph, nodeIdValue: string): FocusGraphEdge[] {
  return graph.edges.filter((edge) => edge.from === nodeIdValue);
}

export function incomingFocusEdges(graph: FocusGraph, nodeIdValue: string): FocusGraphEdge[] {
  return graph.edges.filter((edge) => edge.to === nodeIdValue);
}

export function focusGraphNodeById(graph: FocusGraph, nodeIdValue: string): FocusGraphNode | undefined {
  return graph.nodes.find((node) => node.id === nodeIdValue);
}

export function focusGraphObservationsForNode(
  graph: FocusGraph,
  nodeIdValue: string,
): FocusGraphObservation[] {
  return graph.observations.filter((observation) => observation.nodeId === nodeIdValue);
}
