import { useEffect, useMemo, useState } from 'react';
import {
  buildAuditEvidenceBundle,
  focusArrivalTraces,
  renderAuditEvidenceJson,
  renderAuditEvidenceMarkdown,
} from '../../../lib/runtime/audit-evidence';
import {
  explanationForCause,
  humanRuntimeEventTitle,
  type ExplanationLevel,
} from '../../../lib/runtime/explanations';
import {
  focusGraphNodeById,
  focusGraphObservationsForNode,
  outgoingFocusEdges,
  type FocusGraph,
  type FocusGraphObservation,
  type FocusGraphNode,
} from '../../../lib/runtime/focus-graph';
import type { RuntimeEvent, RuntimeInteraction } from '../../../shared/types';
import { Empty, Metric, ReferenceList } from '../components/Common';

type GraphFilter = 'all' | 'signals';

interface FocusGraphViewProps {
  graph: FocusGraph;
  interactions: RuntimeInteraction[];
  level: ExplanationLevel;
  page?: { url?: string; title?: string };
}

function timeLabel(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
  }).format(timestamp);
}

function downloadText(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function safeFilename(value: string | undefined): string {
  const normalized = value?.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return normalized || 'session';
}

export function FocusGraphView({ graph, interactions, level, page }: FocusGraphViewProps) {
  const [filter, setFilter] = useState<GraphFilter>('all');
  const [selectedNodeId, setSelectedNodeId] = useState<string>();

  useEffect(() => {
    if (selectedNodeId && !focusGraphNodeById(graph, selectedNodeId)) setSelectedNodeId(undefined);
  }, [graph, selectedNodeId]);

  const visibleNodes = useMemo(
    () => graph.nodes.filter((node) => filter === 'all' || node.issueCount > 0),
    [filter, graph.nodes],
  );
  const selectedNode = selectedNodeId ? focusGraphNodeById(graph, selectedNodeId) : undefined;
  const selectedObservations = selectedNode
    ? focusGraphObservationsForNode(graph, selectedNode.id)
    : [];
  const selectedTraces = selectedNode ? focusArrivalTraces(selectedNode, interactions) : [];

  const exportEvidence = (format: 'markdown' | 'json') => {
    const bundle = buildAuditEvidenceBundle({ graph, interactions, page });
    const base = `focustrace-${safeFilename(page?.title)}`;
    if (format === 'markdown') {
      downloadText(`${base}.md`, renderAuditEvidenceMarkdown(bundle), 'text/markdown');
      return;
    }
    downloadText(`${base}.json`, renderAuditEvidenceJson(bundle), 'application/json');
  };

  if (graph.focusEvents === 0) {
    return (
      <section className="panel" aria-labelledby="graph-title">
        <div className="section-heading">
          <div><h2 id="graph-title">Focus graph</h2><p>Observed keyboard focus journey.</p></div>
        </div>
        <Empty title="No focus path yet" text="Record a journey and move through the interface with the keyboard to build the graph." />
      </section>
    );
  }

  return (
    <section className="panel" aria-labelledby="graph-title">
      <div className="section-heading">
        <div>
          <h2 id="graph-title">Focus graph</h2>
          <p>Observed focus destinations and transitions in this session.</p>
        </div>
      </div>

      <div className="metrics">
        <Metric label="Focus points" value={graph.nodes.length} />
        <Metric label="Transitions" value={graph.transitions} />
        <Metric label="Affected points" value={graph.affectedNodes} />
        <Metric label="Runtime signals" value={graph.observations.length} />
      </div>

      <div className="graph-toolbar" aria-label="Focus graph controls">
        <div className="graph-filter" role="group" aria-label="Graph filter">
          <button type="button" className={filter === 'all' ? 'active' : ''} aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>All focus points</button>
          <button type="button" className={filter === 'signals' ? 'active' : ''} aria-pressed={filter === 'signals'} onClick={() => setFilter('signals')}>Signals only</button>
        </div>
        <div className="graph-export" role="group" aria-label="Export evidence">
          <button type="button" onClick={() => exportEvidence('markdown')}>Export .md</button>
          <button type="button" onClick={() => exportEvidence('json')}>Export .json</button>
        </div>
      </div>

      {graph.observations.length > 0 && (
        <section className="graph-findings" aria-labelledby="graph-findings-title">
          <h3 id="graph-findings-title">Things to review</h3>
          <div className="graph-finding-list">
            {graph.observations.map((observation) => (
              <GraphObservationCard observation={observation} level={level} key={observation.id} />
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="graph-flow-title">
        <div className="subsection-heading">
          <h3 id="graph-flow-title">Observed focus flow</h3>
          <span>{visibleNodes.length}/{graph.nodes.length} points shown</span>
        </div>

        {visibleNodes.length === 0 ? (
          <Empty title="No affected focus points" text="No graph point in this recording has a deterministic runtime signal attached to it." />
        ) : (
          <ol className="focus-graph" aria-label="Observed focus graph">
            {visibleNodes.map((node, index) => (
              <FocusNodeRow
                graph={graph}
                node={node}
                index={index}
                selected={selectedNodeId === node.id}
                level={level}
                onSelect={() => setSelectedNodeId(node.id)}
                key={node.id}
              />
            ))}
          </ol>
        )}
      </section>

      {selectedNode && (
        <SelectedFocusPoint
          node={selectedNode}
          observations={selectedObservations}
          traces={selectedTraces}
          level={level}
          onClose={() => setSelectedNodeId(undefined)}
        />
      )}

      <div className="notice graph-scope-note">
        <strong>Observed journey, not a complete keyboard map</strong>
        <p>FocusTrace only shows focus destinations reached during this recording. A control that does not appear here is not automatically inaccessible or unreachable.</p>
      </div>
    </section>
  );
}

function FocusNodeRow({
  graph,
  node,
  index,
  selected,
  level,
  onSelect,
}: {
  graph: FocusGraph;
  node: FocusGraphNode;
  index: number;
  selected: boolean;
  level: ExplanationLevel;
  onSelect: () => void;
}) {
  const outgoing = outgoingFocusEdges(graph, node.id);
  return (
    <li className={`${node.issueCount ? 'focus-node affected' : 'focus-node'}${selected ? ' selected' : ''}`}>
      <div className="focus-node-index" aria-hidden="true">{index + 1}</div>
      <article>
        <div className="focus-node-heading">
          <button type="button" className="focus-node-select" aria-pressed={selected} onClick={onSelect}>
            <strong>{node.label}</strong>
            <small>{node.role} · visited {node.visits} time{node.visits === 1 ? '' : 's'}</small>
          </button>
          {node.issueCount > 0 && <span className="graph-issue-count">{node.issueCount} signal{node.issueCount === 1 ? '' : 's'}</span>}
        </div>

        {level === 'developer' && <code>{node.element.selector}</code>}

        {outgoing.length > 0 ? (
          <ul className="focus-edges" aria-label={`Observed next focus destinations from ${node.label}`}>
            {outgoing.map((edge) => {
              const target = focusGraphNodeById(graph, edge.to);
              return (
                <li key={edge.id}>
                  <span aria-hidden="true">→</span>
                  <span>{target?.label ?? edge.to}</span>
                  {edge.count > 1 && <small>×{edge.count}</small>}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="graph-end">No later focus destination was observed in this session.</p>
        )}
      </article>
    </li>
  );
}

function SelectedFocusPoint({
  node,
  observations,
  traces,
  level,
  onClose,
}: {
  node: FocusGraphNode;
  observations: FocusGraphObservation[];
  traces: ReturnType<typeof focusArrivalTraces>;
  level: ExplanationLevel;
  onClose: () => void;
}) {
  return (
    <section className="graph-inspector" aria-labelledby="selected-focus-title">
      <div className="graph-inspector-heading">
        <div>
          <p className="eyebrow">Selected focus point</p>
          <h3 id="selected-focus-title">{node.label}</h3>
        </div>
        <button type="button" onClick={onClose}>Close</button>
      </div>

      <div className="graph-node-summary">
        <span>{node.role}</span>
        <span>{node.visits} visit{node.visits === 1 ? '' : 's'}</span>
        <span>{node.incoming} incoming</span>
        <span>{node.outgoing} outgoing</span>
        {node.issueCount > 0 && <span>{node.issueCount} signal{node.issueCount === 1 ? '' : 's'}</span>}
      </div>
      {level === 'developer' && <code>{node.element.selector}</code>}

      {observations.length > 0 && (
        <div className="graph-selected-signals">
          <h3>Signals at this point</h3>
          {observations.map((observation) => (
            <GraphObservationCard observation={observation} level={level} key={observation.id} />
          ))}
        </div>
      )}

      <div>
        <h3>How focus got here</h3>
        {traces.length === 0 ? (
          <p className="graph-end">This focus arrival was observed outside a correlated user interaction.</p>
        ) : (
          <div className="arrival-traces">
            {traces.map((trace, index) => (
              <details key={trace.id} open={index === traces.length - 1}>
                <summary>
                  <span><strong>{trace.title}</strong><small>{trace.events.length} recorded step{trace.events.length === 1 ? '' : 's'}</small></span>
                  <time dateTime={new Date(trace.arrivedAt).toISOString()}>{timeLabel(trace.arrivedAt)}</time>
                </summary>
                <ol className="arrival-chain">
                  {trace.events.map((event) => (
                    <ArrivalEvent event={event} level={level} key={event.id} />
                  ))}
                </ol>
              </details>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function ArrivalEvent({ event, level }: { event: RuntimeEvent; level: ExplanationLevel }) {
  return (
    <li className={event.outcome ? 'has-signal' : ''}>
      {level === 'developer' && <time dateTime={new Date(event.timestamp).toISOString()}>{timeLabel(event.timestamp)}</time>}
      <div>
        <strong>{humanRuntimeEventTitle(event)}</strong>
        {level !== 'simple' && event.ruleId && <code>{event.ruleId}</code>}
        {level === 'developer' && event.element && <code>{event.element.selector}</code>}
        {level === 'developer' && event.fromUrl && event.toUrl && <p className="route">{event.fromUrl} → {event.toUrl}</p>}
      </div>
    </li>
  );
}

function GraphObservationCard({ observation, level }: { observation: FocusGraphObservation; level: ExplanationLevel }) {
  const explanation = explanationForCause(observation.causeType);
  return (
    <article className="graph-finding">
      <h3>{explanation.title}</h3>
      <p>{explanation.summary}</p>
      <p><strong>Impact:</strong> {explanation.impact}</p>
      <p><strong>What to review:</strong> {explanation.recommendation}</p>
      {level !== 'simple' && <p><strong>Accessibility:</strong> {explanation.accessibility}</p>}
      {level === 'developer' && (
        <p className="graph-technical"><code>{observation.causeType}</code>{observation.ruleId ? <> <code>{observation.ruleId}</code></> : null}</p>
      )}
      {level !== 'simple' && <ReferenceList references={observation.references} />}
    </article>
  );
}
