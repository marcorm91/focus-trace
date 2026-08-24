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
import { localeFor, tr, type AppLanguage } from '../../../shared/i18n';
import type { RuntimeEvent, RuntimeInteraction } from '../../../shared/types';
import { Empty, Metric, ReferenceList } from '../components/Common';

type GraphFilter = 'all' | 'signals';

interface FocusGraphViewProps {
  graph: FocusGraph;
  interactions: RuntimeInteraction[];
  level: ExplanationLevel;
  language: AppLanguage;
  page?: { url?: string; title?: string };
  pathVisible: boolean;
  recording: boolean;
  selectedPageNodeId?: string;
  onTogglePath: () => void | Promise<void>;
  onSelectPageNode: (selector: string) => void | Promise<void>;
  onClearPageNode: () => void | Promise<void>;
}

function timeLabel(timestamp: number, language: AppLanguage): string {
  return new Intl.DateTimeFormat(localeFor(language), {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
  }).format(timestamp);
}

function focusOrderLabel(orders: number[]): string {
  const visible = orders.slice(0, 4);
  const remaining = orders.length - visible.length;
  return `${visible.join(' · ')}${remaining > 0 ? ` +${remaining}` : ''}`;
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

export function FocusGraphView({
  graph,
  interactions,
  level,
  language,
  page,
  pathVisible,
  recording,
  selectedPageNodeId,
  onTogglePath,
  onSelectPageNode,
  onClearPageNode,
}: FocusGraphViewProps) {
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
  const selectedTraces = selectedNode ? focusArrivalTraces(selectedNode, interactions, language) : [];

  const exportEvidence = (format: 'markdown' | 'json') => {
    const bundle = buildAuditEvidenceBundle({ graph, interactions, page, language });
    const base = `focustrace-${safeFilename(page?.title)}`;
    if (format === 'markdown') {
      downloadText(`${base}.md`, renderAuditEvidenceMarkdown(bundle, language), 'text/markdown');
      return;
    }
    downloadText(`${base}.json`, renderAuditEvidenceJson(bundle), 'application/json');
  };

  if (graph.focusEvents === 0) {
    return (
      <section className="panel" aria-labelledby="graph-title">
        <div className="section-heading">
          <div>
            <h2 id="graph-title">{tr(language, 'Focus graph', 'Grafo de foco')}</h2>
            <p>{tr(language, 'Observed keyboard focus journey.', 'Recorrido de foco de teclado observado.')}</p>
          </div>
        </div>
        <Empty
          title={tr(language, 'No focus path yet', 'Todavía no hay recorrido de foco')}
          text={tr(
            language,
            'Record a journey and move through the interface with the keyboard to build the graph.',
            'Graba un recorrido y navega por la interfaz con el teclado para construir el grafo.',
          )}
        />
      </section>
    );
  }

  return (
    <section className="panel" aria-labelledby="graph-title">
      <div className="section-heading">
        <div>
          <h2 id="graph-title">{tr(language, 'Focus graph', 'Grafo de foco')}</h2>
          <p>{tr(language, 'Observed focus destinations and transitions in this session.', 'Destinos y transiciones de foco observados en esta sesión.')}</p>
        </div>
      </div>

      <div className="metrics">
        <Metric label={tr(language, 'Focus points', 'Puntos de foco')} value={graph.nodes.length} />
        <Metric label={tr(language, 'Transitions', 'Transiciones')} value={graph.transitions} />
        <Metric label={tr(language, 'Affected points', 'Puntos afectados')} value={graph.affectedNodes} />
        <Metric label={tr(language, 'Runtime signals', 'Señales runtime')} value={graph.observations.length} />
      </div>

      <div className="graph-toolbar" aria-label={tr(language, 'Focus graph controls', 'Controles del grafo de foco')}>
        <div className="graph-filter" role="group" aria-label={tr(language, 'Graph filter', 'Filtro del grafo')}>
          <button type="button" className={filter === 'all' ? 'active' : ''} aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>
            {tr(language, 'All focus points', 'Todos los puntos de foco')}
          </button>
          <button type="button" className={filter === 'signals' ? 'active' : ''} aria-pressed={filter === 'signals'} onClick={() => setFilter('signals')}>
            {tr(language, 'Signals only', 'Solo señales')}
          </button>
        </div>
        <div className="graph-export" role="group" aria-label={tr(language, 'Export evidence', 'Exportar evidencia')}>
          <button type="button" onClick={() => exportEvidence('markdown')}>Export .md</button>
          <button type="button" onClick={() => exportEvidence('json')}>Export .json</button>
        </div>
        <button
          className="focus-path-toggle"
          type="button"
          aria-pressed={pathVisible}
          disabled={recording}
          title={recording
            ? tr(language, 'Stop recording before showing the page overlay.', 'Detén la grabación antes de mostrar el resaltado en la página.')
            : undefined}
          onClick={() => void onTogglePath()}
        >
          <span className="focus-path-swatch" aria-hidden="true">1</span>
          {pathVisible
            ? tr(language, 'Hide path on page', 'Ocultar recorrido en la página')
            : tr(language, 'Show path on page', 'Mostrar recorrido en la página')}
        </button>
      </div>

      {graph.observations.length > 0 && (
        <section className="graph-findings" aria-labelledby="graph-findings-title">
          <h3 id="graph-findings-title">{tr(language, 'Things to review', 'Aspectos que revisar')}</h3>
          <div className="graph-finding-list">
            {graph.observations.map((observation) => (
              <GraphObservationCard observation={observation} level={level} language={language} key={observation.id} />
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="graph-flow-title">
        <div className="subsection-heading">
          <h3 id="graph-flow-title">{tr(language, 'Observed focus flow', 'Flujo de foco observado')}</h3>
          <span>
            {tr(
              language,
              `${visibleNodes.length}/${graph.nodes.length} points shown`,
              `${visibleNodes.length}/${graph.nodes.length} puntos mostrados`,
            )}
          </span>
        </div>

        {visibleNodes.length === 0 ? (
          <Empty
            title={tr(language, 'No affected focus points', 'No hay puntos de foco afectados')}
            text={tr(
              language,
              'No graph point in this recording has a deterministic runtime signal attached to it.',
              'Ningún punto del grafo de esta grabación tiene asociada una señal runtime determinista.',
            )}
          />
        ) : (
          <ol className="focus-graph" aria-label={tr(language, 'Observed focus graph', 'Grafo de foco observado')}>
            {visibleNodes.map((node) => (
              <FocusNodeRow
                graph={graph}
                node={node}
                selected={selectedNodeId === node.id || selectedPageNodeId === node.id}
                level={level}
                language={language}
                onSelect={() => {
                  setSelectedNodeId(node.id);
                  if (!recording) void onSelectPageNode(node.id);
                }}
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
          language={language}
          onClose={() => {
            setSelectedNodeId(undefined);
            void onClearPageNode();
          }}
        />
      )}

      <div className="notice graph-scope-note">
        <strong>{tr(language, 'Observed journey, not a complete keyboard map', 'Recorrido observado, no un mapa completo del teclado')}</strong>
        <p>
          {tr(
            language,
            'FocusTrace only shows focus destinations reached during this recording. A control that does not appear here is not automatically inaccessible or unreachable.',
            'FocusTrace solo muestra los destinos de foco alcanzados durante esta grabación. Que un control no aparezca aquí no significa automáticamente que sea inaccesible o inalcanzable.',
          )}
        </p>
      </div>
    </section>
  );
}

function FocusNodeRow({
  graph,
  node,
  selected,
  level,
  language,
  onSelect,
}: {
  graph: FocusGraph;
  node: FocusGraphNode;
  selected: boolean;
  level: ExplanationLevel;
  language: AppLanguage;
  onSelect: () => void;
}) {
  const outgoing = outgoingFocusEdges(graph, node.id);
  return (
    <li className={`${node.issueCount ? 'focus-node affected' : 'focus-node'}${selected ? ' selected' : ''}`}>
      <div
        className="focus-node-index"
        aria-label={tr(
          language,
          `Observed focus positions: ${node.focusOrders.join(', ')}`,
          `Posiciones de foco observadas: ${node.focusOrders.join(', ')}`,
        )}
      >
        {focusOrderLabel(node.focusOrders)}
      </div>
      <article>
        <div className="focus-node-heading">
          <button type="button" className="focus-node-select" aria-pressed={selected} onClick={onSelect}>
            <strong>{node.label}</strong>
            <small>
              {node.role} · {tr(language, `visited ${node.visits} time${node.visits === 1 ? '' : 's'}`, `visitado ${node.visits} vez${node.visits === 1 ? '' : 'es'}`)}
            </small>
          </button>
          {node.issueCount > 0 && (
            <span className="graph-issue-count">
              {tr(language, `${node.issueCount} signal${node.issueCount === 1 ? '' : 's'}`, `${node.issueCount} señal${node.issueCount === 1 ? '' : 'es'}`)}
            </span>
          )}
        </div>

        {level === 'developer' && <code>{node.element.selector}</code>}

        {outgoing.length > 0 ? (
          <ul className="focus-edges" aria-label={tr(language, `Observed next focus destinations from ${node.label}`, `Siguientes destinos de foco observados desde ${node.label}`)}>
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
          <p className="graph-end">{tr(language, 'No later focus destination was observed in this session.', 'No se observó ningún destino de foco posterior en esta sesión.')}</p>
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
  language,
  onClose,
}: {
  node: FocusGraphNode;
  observations: FocusGraphObservation[];
  traces: ReturnType<typeof focusArrivalTraces>;
  level: ExplanationLevel;
  language: AppLanguage;
  onClose: () => void;
}) {
  return (
    <section className="graph-inspector" aria-labelledby="selected-focus-title">
      <div className="graph-inspector-heading">
        <div>
          <p className="eyebrow">{tr(language, 'Selected focus point', 'Punto de foco seleccionado')}</p>
          <h3 id="selected-focus-title">{node.label}</h3>
        </div>
        <button type="button" onClick={onClose}>{tr(language, 'Close', 'Cerrar')}</button>
      </div>

      <div className="graph-node-summary">
        <span>{node.role}</span>
        <span>{tr(language, `${node.visits} visit${node.visits === 1 ? '' : 's'}`, `${node.visits} visita${node.visits === 1 ? '' : 's'}`)}</span>
        <span>{tr(language, `${node.incoming} incoming`, `${node.incoming} entradas`)}</span>
        <span>{tr(language, `${node.outgoing} outgoing`, `${node.outgoing} salidas`)}</span>
        {node.issueCount > 0 && <span>{tr(language, `${node.issueCount} signal${node.issueCount === 1 ? '' : 's'}`, `${node.issueCount} señal${node.issueCount === 1 ? '' : 'es'}`)}</span>}
      </div>
      {level === 'developer' && <code>{node.element.selector}</code>}

      {observations.length > 0 && (
        <div className="graph-selected-signals">
          <h3>{tr(language, 'Signals at this point', 'Señales en este punto')}</h3>
          {observations.map((observation) => (
            <GraphObservationCard observation={observation} level={level} language={language} key={observation.id} />
          ))}
        </div>
      )}

      <div>
        <h3>{tr(language, 'How focus got here', 'Cómo llegó el foco hasta aquí')}</h3>
        {traces.length === 0 ? (
          <p className="graph-end">{tr(language, 'This focus arrival was observed outside a correlated user interaction.', 'Esta llegada de foco se observó fuera de una interacción de usuario correlacionada.')}</p>
        ) : (
          <div className="arrival-traces">
            {traces.map((trace, index) => (
              <details key={trace.id} open={index === traces.length - 1}>
                <summary>
                  <span>
                    <strong>{trace.title}</strong>
                    <small>{tr(language, `${trace.events.length} recorded step${trace.events.length === 1 ? '' : 's'}`, `${trace.events.length} paso${trace.events.length === 1 ? '' : 's'} registrado${trace.events.length === 1 ? '' : 's'}`)}</small>
                  </span>
                  <time dateTime={new Date(trace.arrivedAt).toISOString()}>{timeLabel(trace.arrivedAt, language)}</time>
                </summary>
                <ol className="arrival-chain">
                  {trace.events.map((event) => (
                    <ArrivalEvent event={event} level={level} language={language} key={event.id} />
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

function ArrivalEvent({ event, level, language }: { event: RuntimeEvent; level: ExplanationLevel; language: AppLanguage }) {
  return (
    <li className={event.outcome ? 'has-signal' : ''}>
      {level === 'developer' && <time dateTime={new Date(event.timestamp).toISOString()}>{timeLabel(event.timestamp, language)}</time>}
      <div>
        <strong>{humanRuntimeEventTitle(event, language)}</strong>
        {level !== 'simple' && event.ruleId && <code>{event.ruleId}</code>}
        {level === 'developer' && event.element && <code>{event.element.selector}</code>}
        {level === 'developer' && event.fromUrl && event.toUrl && <p className="route">{event.fromUrl} → {event.toUrl}</p>}
      </div>
    </li>
  );
}

function GraphObservationCard({
  observation,
  level,
  language,
}: {
  observation: FocusGraphObservation;
  level: ExplanationLevel;
  language: AppLanguage;
}) {
  const explanation = explanationForCause(observation.causeType, language);
  return (
    <article className="graph-finding">
      <h3>{explanation.title}</h3>
      <p>{explanation.summary}</p>
      <p><strong>{tr(language, 'Impact:', 'Impacto:')}</strong> {explanation.impact}</p>
      <p><strong>{tr(language, 'What to review:', 'Qué revisar:')}</strong> {explanation.recommendation}</p>
      {level !== 'simple' && <p><strong>{tr(language, 'Accessibility:', 'Accesibilidad:')}</strong> {explanation.accessibility}</p>}
      {level === 'developer' && (
        <p className="graph-technical"><code>{observation.causeType}</code>{observation.ruleId ? <> <code>{observation.ruleId}</code></> : null}</p>
      )}
      {level !== 'simple' && <ReferenceList references={observation.references} language={language} />}
    </article>
  );
}
