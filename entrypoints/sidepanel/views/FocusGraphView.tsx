import { explanationForCause, type ExplanationLevel } from '../../../lib/runtime/explanations';
import {
  focusGraphNodeById,
  outgoingFocusEdges,
  type FocusGraph,
  type FocusGraphObservation,
} from '../../../lib/runtime/focus-graph';
import { Empty, Metric, ReferenceList } from '../components/Common';

export function FocusGraphView({ graph, level }: { graph: FocusGraph; level: ExplanationLevel }) {
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
          {graph.repeatedTransitions > 0 && <span>{graph.repeatedTransitions} repeated path{graph.repeatedTransitions === 1 ? '' : 's'}</span>}
        </div>

        <ol className="focus-graph" aria-label="Observed focus graph">
          {graph.nodes.map((node, index) => {
            const outgoing = outgoingFocusEdges(graph, node.id);
            return (
              <li className={node.issueCount ? 'focus-node affected' : 'focus-node'} key={node.id}>
                <div className="focus-node-index" aria-hidden="true">{index + 1}</div>
                <article>
                  <div className="focus-node-heading">
                    <span>
                      <strong>{node.label}</strong>
                      <small>{node.role} · visited {node.visits} time{node.visits === 1 ? '' : 's'}</small>
                    </span>
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
          })}
        </ol>
      </section>

      <div className="notice graph-scope-note">
        <strong>Observed journey, not a complete keyboard map</strong>
        <p>FocusTrace only shows focus destinations reached during this recording. A control that does not appear here is not automatically inaccessible or unreachable.</p>
      </div>
    </section>
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
