import { useMemo } from 'react';
import { browser } from '#imports';
import { suggestAccessibleForeground } from '../../../lib/audit/contrast';
import { buildSessionReportModel } from '../../../lib/report/session-report';
import { buildTextReportFilename, buildTextSessionReport } from '../../../lib/report/text-report';
import { localizedScanIssue, tr, type AppLanguage } from '../../../shared/i18n';
import type { HeadingSignal, RuntimeEvent, ScanIssue, ScanResult } from '../../../shared/types';
import './session-report.css';
import './report-export.css';

function headingSignalLabel(signal: HeadingSignal, language: AppLanguage): string {
  if (signal === 'empty') return tr(language, 'Empty', 'Vacío');
  if (signal === 'level-jump') return tr(language, 'Level jump', 'Salto de nivel');
  return tr(language, 'Multiple H1', 'Varios H1');
}

function findingGroup(
  scan: ScanResult,
  language: AppLanguage,
): Array<{ id: string; label: string; tone: string; issues: ScanIssue[] }> {
  return [
    { id: 'fail', label: tr(language, 'Failures', 'Fallos'), tone: 'fail', issues: scan.issues },
    { id: 'review', label: tr(language, 'Review', 'Revisar'), tone: 'review', issues: scan.review },
    { id: 'warning', label: tr(language, 'Warnings', 'Avisos'), tone: 'warning', issues: scan.warnings ?? [] },
  ];
}

function ContrastReportEvidence({ issue, language }: { issue: ScanIssue; language: AppLanguage }) {
  if (!issue.contrast) return null;
  const contrast = issue.contrast;
  const suggestion = issue.outcome === 'fail' && contrast.foreground && contrast.background
    ? suggestAccessibleForeground(contrast.foreground, contrast.background, contrast.requiredRatio)
    : undefined;

  return (
    <div className="report-contrast-evidence">
      <span>
        <small>{tr(language, 'Contrast', 'Contraste')}</small>
        <strong>{contrast.ratio != null ? `${contrast.ratio}:1` : tr(language, 'Review', 'Revisar')}</strong>
        <em>{tr(language, `Required ${contrast.requiredRatio}:1`, `Requerido ${contrast.requiredRatio}:1`)}</em>
      </span>
      {contrast.foreground && <code>{contrast.foreground}</code>}
      {contrast.background && <code>{contrast.background}</code>}
      {suggestion && (
        <span className="report-color-fix">
          <small>{tr(language, 'Suggested', 'Sugerido')}</small>
          <strong>{suggestion.hex}</strong>
          <em>{suggestion.rgb} · {suggestion.ratio}:1</em>
        </span>
      )}
      {contrast.reason && <p>{contrast.reason}</p>}
    </div>
  );
}

export function SessionReportView({
  scan,
  events,
  language,
  onLocate,
}: {
  scan?: ScanResult | undefined;
  events: RuntimeEvent[];
  language: AppLanguage;
  onLocate: (selector: string) => void | Promise<void>;
}) {
  const model = useMemo(() => buildSessionReportModel(scan, events, language), [events, language, scan]);
  const headings = scan?.headings ?? [];
  const focusEvents = events.filter((event) => event.kind === 'focus' && event.element);
  const highPriority = model.suggestions.filter((suggestion) => suggestion.priority === 'high').slice(0, 4);
  const automatic = events.some((event) => event.kind === 'focus-walk-start');

  const downloadTextReport = () => {
    const generatedAt = Date.now();
    const text = buildTextSessionReport({ scan, events, language, generatedAt });
    const blob = new Blob(['\uFEFF', text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = buildTextReportFilename(scan, generatedAt);
    anchor.style.display = 'none';
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const openPrintableReport = async () => {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (tab?.id == null) return;
    const params = new URLSearchParams({ tabId: String(tab.id), language });
    await browser.tabs.create({
      url: browser.runtime.getURL(`/report-print.html?${params.toString()}`),
    });
  };

  return (
    <section className="panel session-report trace-first-report" aria-labelledby="session-report-title">
      <div className="report-hero">
        <div>
          <span className="report-kicker">FocusTrace</span>
          <h2 id="session-report-title">{tr(language, 'Accessibility report', 'Informe de accesibilidad')}</h2>
          <p>
            {scan
              ? tr(
                  language,
                  'Static findings and runtime behavior combined into one actionable session report.',
                  'Hallazgos estáticos y comportamiento runtime combinados en un único informe accionable.',
                )
              : tr(language, 'Analyze the page to start the report.', 'Analiza la página para iniciar el informe.')}
          </p>
        </div>
        <div className="report-export-actions">
          <button className="export-text-report" type="button" disabled={!scan} onClick={downloadTextReport}>
            <span aria-hidden="true">↓</span>
            {tr(language, 'Download .txt', 'Descargar .txt')}
          </button>
          <button className="export-pdf-report" type="button" disabled={!scan} onClick={() => void openPrintableReport()}>
            <span aria-hidden="true">▤</span>
            {tr(language, 'Export PDF', 'Exportar PDF')}
          </button>
        </div>
      </div>

      <div className="report-scoreline" aria-label={tr(language, 'Executive summary', 'Resumen ejecutivo')}>
        <div className={model.failures ? 'is-alert' : ''}>
          <strong>{model.failures}</strong>
          <span>{tr(language, 'failures', 'fallos')}</span>
        </div>
        <div>
          <strong>{model.reviews}</strong>
          <span>{tr(language, 'reviews', 'revisiones')}</span>
        </div>
        <div className={model.runtimeFindings ? 'is-alert' : ''}>
          <strong>{model.runtimeFindings}</strong>
          <span>{tr(language, 'runtime', 'runtime')}</span>
        </div>
        <div>
          <strong>{model.focusSteps}</strong>
          <span>{tr(language, 'focus steps', 'pasos de foco')}</span>
        </div>
      </div>

      {scan && (
        <div className="report-context-line">
          <strong>{scan.title || scan.url}</strong>
          <span>{scan.standard}</span>
          <span>{model.staticFindings} {tr(language, 'static findings', 'hallazgos estáticos')}</span>
          <span>{model.causalInteractions} {tr(language, 'causal interactions', 'interacciones causales')}</span>
        </div>
      )}

      {!scan ? (
        <div className="notice">
          <strong>{tr(language, 'No analysis data yet', 'Todavía no hay datos de análisis')}</strong>
          <p>{tr(language, 'Run Analyze this page to generate the complete report.', 'Pulsa Analizar esta página para generar el informe completo.')}</p>
        </div>
      ) : (
        <>
          <section className="report-section report-priority" aria-labelledby="report-priority-title">
            <div className="report-section-heading">
              <div>
                <span>!</span>
                <div>
                  <h3 id="report-priority-title">{tr(language, 'Highest priority', 'Máxima prioridad')}</h3>
                  <p>{tr(language, 'The first things worth fixing from the evidence collected.', 'Lo primero que merece la pena corregir según la evidencia recogida.')}</p>
                </div>
              </div>
            </div>
            {highPriority.length ? (
              <ol className="report-priority-list">
                {highPriority.map((suggestion) => (
                  <li key={suggestion.id}>
                    <span>{suggestion.source}</span>
                    <strong>{suggestion.title}</strong>
                    <p>{suggestion.detail}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="report-empty-line">{tr(language, 'No high-priority automated recommendation was produced.', 'No se ha generado ninguna recomendación automática de prioridad alta.')}</p>
            )}
          </section>

          <section className="report-section report-trace-section" aria-labelledby="report-trace-title">
            <div className="report-section-heading">
              <div>
                <span>1</span>
                <div>
                  <h3 id="report-trace-title">{tr(language, 'Runtime trace', 'Traza runtime')}</h3>
                  <p>
                    {focusEvents.length
                      ? automatic
                        ? tr(language, 'Automatic Tab evidence plus correlated interactions.', 'Evidencia automática con Tab e interacciones correlacionadas.')
                        : tr(language, 'Recorded interactions, focus movement and deterministic causes.', 'Interacciones grabadas, movimientos de foco y causas deterministas.')
                      : tr(language, 'No focus journey has been recorded yet.', 'Todavía no se ha grabado ningún recorrido de foco.')}
                  </p>
                </div>
              </div>
            </div>

            <div className="report-inline-summary">
              <span><strong>{model.focusSteps}</strong> {tr(language, 'focus steps', 'pasos de foco')}</span>
              <span><strong>{model.transitionReviews}</strong> {tr(language, 'transition reviews', 'transiciones a revisar')}</span>
              <span><strong>{model.handledTransitions}</strong> {tr(language, 'handled', 'correctas')}</span>
              <span><strong>{model.focusJumps}</strong> {tr(language, 'jumps', 'saltos')}</span>
            </div>

            {model.traceStories.length ? (
              <div className="trace-story-list">
                {model.traceStories.map((story) => (
                  <article className={`trace-story tone-${story.tone}`} key={story.id}>
                    <div className="trace-story-head">
                      <span>{story.tone === 'handled' ? '✓' : story.tone === 'review' ? '⚠' : '•'}</span>
                      <div>
                        <small>{story.interactionNumber ? `${tr(language, 'Interaction', 'Interacción')} #${story.interactionNumber}` : tr(language, 'Runtime signal', 'Señal runtime')}</small>
                        <strong>{story.trigger}</strong>
                      </div>
                    </div>
                    <div className="trace-story-chain" aria-label={tr(language, 'Recorded event chain', 'Cadena de eventos registrada')}>
                      {story.chain.map((step, index) => (
                        <span key={`${story.id}-chain-${index}`}>
                          {index > 0 && <b aria-hidden="true">→</b>}
                          <em>{step}</em>
                        </span>
                      ))}
                    </div>
                    <div className="trace-story-result">
                      <small>{tr(language, 'Result', 'Resultado')}</small>
                      <strong>{story.result}</strong>
                      <p>{story.detail}</p>
                    </div>
                    {story.impact && (
                      <p className="trace-story-note"><strong>{tr(language, 'Impact', 'Impacto')}:</strong> {story.impact}</p>
                    )}
                    {story.recommendation && (
                      <p className="trace-story-recommendation"><strong>{tr(language, 'Recommendation', 'Recomendación')}:</strong> {story.recommendation}</p>
                    )}
                    {story.references.length > 0 && (
                      <p className="trace-story-references">
                        {story.references.map((reference) => `${reference.type} ${reference.id}`).join(' · ')}
                      </p>
                    )}
                    {story.selector && (
                      <button type="button" onClick={() => void onLocate(story.selector!)}>
                        {tr(language, 'Locate evidence', 'Localizar evidencia')}
                      </button>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <div className="report-pending">
                <strong>{tr(language, 'Trace evidence pending', 'Evidencia de Trace pendiente')}</strong>
                <p>{tr(language, 'Record a real interaction or use Automate focus to add runtime context to this report.', 'Graba una interacción real o utiliza Automatizar foco para añadir contexto runtime al informe.')}</p>
              </div>
            )}
          </section>

          <section className="report-section" aria-labelledby="report-analysis-title">
            <div className="report-section-heading">
              <div>
                <span>2</span>
                <div>
                  <h3 id="report-analysis-title">{tr(language, 'Full page scan', 'Barrido completo de página')}</h3>
                  <p>{scan.engine} · {scan.standard} · {scan.rulesRun} {tr(language, 'rule families', 'familias de reglas')}</p>
                </div>
              </div>
            </div>

            {model.categories.length > 0 && (
              <div className="report-category-summary">
                {model.categories.map((category) => (
                  <span key={category.id}><strong>{category.count}</strong>{category.label}</span>
                ))}
              </div>
            )}

            {findingGroup(scan, language).map((group) => (
              <details className="report-group" key={group.id} open={group.id === 'fail' && group.issues.length > 0}>
                <summary>
                  <span>{group.label}</span>
                  <strong>{group.issues.length}</strong>
                </summary>
                {group.issues.length ? (
                  <div className="report-finding-list">
                    {group.issues.map((issue) => {
                      const copy = localizedScanIssue(issue, language);
                      const target = issue.targets[0];
                      return (
                        <article className="report-finding" key={issue.id}>
                          <div>
                            <span className={`outcome ${group.tone}`}>{group.label}</span>
                            <code>{issue.ruleId}</code>
                          </div>
                          <h4>{copy.title}</h4>
                          <p>{copy.description}</p>
                          <ContrastReportEvidence issue={issue} language={language} />
                          {copy.evidence && <p className="evidence">{copy.evidence}</p>}
                          {target && (
                            <button type="button" onClick={() => void onLocate(target)}>
                              {tr(language, 'Review on page', 'Revisar en la página')}
                            </button>
                          )}
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <p className="report-empty-line">{tr(language, 'No findings in this group.', 'No hay hallazgos en este grupo.')}</p>
                )}
              </details>
            ))}
          </section>

          <section className="report-section" aria-labelledby="report-headings-title">
            <div className="report-section-heading">
              <div>
                <span>3</span>
                <div>
                  <h3 id="report-headings-title">{tr(language, 'Heading structure', 'Estructura de encabezados')}</h3>
                  <p>{tr(language, 'Visible H1-H6 elements in DOM order.', 'Elementos H1–H6 visibles en orden DOM.')}</p>
                </div>
              </div>
            </div>

            {headings.length ? (
              <ol className="report-heading-list">
                {headings.map((heading) => (
                  <li className={heading.signals.length ? 'has-signal' : ''} key={heading.id} style={{ marginInlineStart: `${(heading.level - 1) * 12}px` }}>
                    <button type="button" onClick={() => void onLocate(heading.selector)}>
                      <span>H{heading.level}</span>
                      <strong>{heading.text || tr(language, 'Empty heading', 'Encabezado vacío')}</strong>
                      {heading.signals.length > 0 && <small>{heading.signals.map((signal) => headingSignalLabel(signal, language)).join(' · ')}</small>}
                    </button>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="report-empty-line">{tr(language, 'No visible headings were found.', 'No se han encontrado encabezados visibles.')}</p>
            )}
          </section>

          <section className="report-section report-recommendations" aria-labelledby="report-suggestions-title">
            <div className="report-section-heading">
              <div>
                <span>4</span>
                <div>
                  <h3 id="report-suggestions-title">{tr(language, 'Recommended next steps', 'Sugerencias de mejora')}</h3>
                  <p>{tr(language, 'Prioritized from static and runtime evidence.', 'Priorizadas a partir de evidencia estática y runtime.')}</p>
                </div>
              </div>
            </div>

            {model.suggestions.length ? (
              <ol className="suggestion-list">
                {model.suggestions.map((suggestion) => (
                  <li className={`priority-${suggestion.priority}`} key={suggestion.id}>
                    <div>
                      <span>{suggestion.priority === 'high' ? tr(language, 'High', 'Alta') : suggestion.priority === 'medium' ? tr(language, 'Medium', 'Media') : tr(language, 'Coverage', 'Cobertura')}</span>
                      <small>{suggestion.source}</small>
                    </div>
                    <strong>{suggestion.title}</strong>
                    <p>{suggestion.detail}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="notice">
                <strong>{tr(language, 'No immediate suggestions', 'Sin sugerencias inmediatas')}</strong>
                <p>{tr(language, 'Manual WCAG review is still required.', 'Sigue siendo necesaria una revisión WCAG manual.')}</p>
              </div>
            )}
          </section>

          <p className="report-scope-note">
            {tr(
              language,
              'FocusTrace combines deterministic automated evidence and recorded runtime behavior. This report is not a complete WCAG conformance certificate.',
              'FocusTrace combina evidencia automática determinista y comportamiento runtime registrado. Este informe no es un certificado completo de conformidad WCAG.',
            )}
          </p>
        </>
      )}
    </section>
  );
}
