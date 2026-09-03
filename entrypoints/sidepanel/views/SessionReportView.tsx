import { useEffect, useMemo, useState } from 'react';
import { browser } from '#imports';
import {
  buildAuditEvidenceBundle,
  renderAuditEvidenceJson,
  renderAuditEvidenceMarkdown,
} from '../../../lib/runtime/audit-evidence';
import { groupRuntimeInteractions } from '../../../lib/runtime/causality';
import { buildFocusGraph } from '../../../lib/runtime/focus-graph';
import type { StructureHint, StructureSnapshot } from '../../../lib/runtime/structure-map';
import { type ReportComponentIdentity } from '../../../lib/report/component-identity';
import { buildSessionReportModel } from '../../../lib/report/session-report';
import { buildTextReportFilename, buildTextSessionReport } from '../../../lib/report/text-report';
import {
  captureReportVisualEvidence,
  collectReportComponents,
  storePrintableReportEvidence,
} from '../../../lib/report/visual-evidence';
import { tr, type AppLanguage } from '../../../shared/i18n';
import type { HeadingSignal, RuntimeEvent, ScanResult } from '../../../shared/types';
import { ReportComponentIdentityView } from '../components/ReportComponentIdentity';
import { ReportScanCompact } from '../components/ReportScanCompact';

function headingSignalLabel(signal: HeadingSignal, language: AppLanguage): string {
  if (signal === 'empty') return tr(language, 'Empty', 'Vacío');
  if (signal === 'level-jump') return tr(language, 'Level jump', 'Salto de nivel');
  return tr(language, 'Multiple H1', 'Varios H1');
}

function structureHintCopy(hint: StructureHint, language: AppLanguage): { title: string; description: string; suggestion?: string } {
  if (language !== 'es') {
    return {
      title: hint.title,
      description: hint.description,
      ...(hint.suggestion ? { suggestion: hint.suggestion } : {}),
    };
  }

  if (hint.title === 'Generic element used as a control') {
    return {
      title: 'Elemento genérico usado como control',
      description: 'Se está usando un <div> o <span> con comportamiento similar a un botón.',
      suggestion: 'Valora usar <button> cuando la interacción sea una acción de botón.',
    };
  }
  if (hint.title === 'Repeated sibling structure') {
    return {
      title: 'Estructura repetida entre elementos hermanos',
      description: 'Hay varios elementos hermanos con una estructura muy similar que podrían representar una lista semántica.',
      suggestion: 'Valora <ul>/<ol> con <li> cuando los elementos formen una lista con significado.',
    };
  }
  if (hint.title === 'Navigation-like link group') {
    return {
      title: 'Grupo de enlaces con aspecto de navegación',
      description: 'La mayoría de elementos directos del contenedor son enlaces y podrían formar un bloque de navegación.',
      suggestion: 'Valora <nav> o role="navigation" cuando el grupo sea realmente navegación del sitio o de la página.',
    };
  }
  if (hint.title === 'Deep generic wrapper chain') {
    return {
      title: 'Cadena profunda de contenedores genéricos',
      description: 'Hay cuatro o más <div> de un único hijo anidados antes de llegar a contenido con significado.',
      suggestion: 'Revisa si todos los contenedores son necesarios para layout, estilos o comportamiento.',
    };
  }
  if (hint.title === 'High <div> density') {
    return {
      title: 'Alta densidad de <div>',
      description: 'Una proporción elevada del DOM analizado está formada por contenedores <div>. No es un error por sí mismo, pero puede indicar oportunidades de mejorar la semántica.',
      suggestion: 'Revisa si HTML semántico puede sustituir contenedores genéricos cuando el contenido tenga una finalidad clara.',
    };
  }

  return {
    title: hint.title,
    description: hint.description,
    ...(hint.suggestion ? { suggestion: hint.suggestion } : {}),
  };
}

function suggestionSourceLabel(source: string, language: AppLanguage): string {
  const normalized = source.trim().toLocaleLowerCase();
  if (normalized === 'analysis' || normalized === 'análisis') return tr(language, 'Analysis', 'Análisis');
  if (normalized === 'focus' || normalized === 'runtime focus' || normalized === 'foco runtime') {
    return tr(language, 'Runtime focus', 'Foco runtime');
  }
  if (normalized === 'headings' || normalized === 'encabezados') return tr(language, 'Headings', 'Encabezados');
  if (normalized === 'coverage' || normalized === 'cobertura') return tr(language, 'Coverage', 'Cobertura');
  return source;
}

function downloadFile(filename: string, content: string, mimeType: string, includeBom = false): void {
  const parts = includeBom ? ['\uFEFF', content] : [content];
  const blob = new Blob(parts, { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function safeFilename(value: string | undefined): string {
  const normalized = value?.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return normalized || 'session';
}

export function SessionReportView({
  scan,
  events,
  structureSnapshot,
  language,
  onLocate,
}: {
  scan?: ScanResult | undefined;
  events: RuntimeEvent[];
  structureSnapshot?: StructureSnapshot | undefined;
  language: AppLanguage;
  onLocate: (selector: string) => void | Promise<void>;
}) {
  const model = useMemo(() => buildSessionReportModel(scan, events, language), [events, language, scan]);
  const graph = useMemo(() => buildFocusGraph(events), [events]);
  const interactions = useMemo(() => groupRuntimeInteractions(events), [events]);
  const headings = scan?.headings ?? [];
  const componentScope = scan?.scope?.type === 'component';
  const reportStructureSnapshot = componentScope ? undefined : structureSnapshot;
  const headingReviews = componentScope ? [] : headings.filter((heading) => heading.signals.length > 0);
  const structureHints = reportStructureSnapshot?.hints ?? [];
  const structureReviewCount = headingReviews.length + structureHints.length;
  const highPriority = model.suggestions.filter((suggestion) => suggestion.priority === 'high').slice(0, 4);
  const automatic = events.some((event) => event.kind === 'focus-walk-start');
  const [components, setComponents] = useState<ReportComponentIdentity[]>([]);
  const [includeVisualEvidence, setIncludeVisualEvidence] = useState(true);
  const [exportingPdf, setExportingPdf] = useState(false);
  const componentMap = useMemo(
    () => new Map(components.map((component) => [component.selector, component])),
    [components],
  );

  useEffect(() => {
    let cancelled = false;
    if (!scan) {
      setComponents([]);
      return () => { cancelled = true; };
    }
    void browser.tabs.query({ active: true, currentWindow: true })
      .then(([tab]) => tab?.id == null ? [] : collectReportComponents(tab.id, scan, events))
      .then((next) => {
        if (!cancelled) setComponents(next);
      })
      .catch(() => {
        if (!cancelled) setComponents([]);
      });
    return () => { cancelled = true; };
  }, [events, scan]);

  const downloadTextReport = () => {
    const generatedAt = Date.now();
    const text = buildTextSessionReport({ scan, events, language, components, generatedAt });
    downloadFile(buildTextReportFilename(scan, generatedAt), text, 'text/plain', true);
  };

  const downloadJourneyEvidence = (format: 'markdown' | 'json') => {
    const page = scan ? { url: scan.url, title: scan.title } : undefined;
    const bundle = buildAuditEvidenceBundle({
      graph,
      interactions,
      language,
      ...(page ? { page } : {}),
    });
    const base = `focustrace-${safeFilename(scan?.title || scan?.url)}`;
    if (format === 'markdown') {
      downloadFile(`${base}.md`, renderAuditEvidenceMarkdown(bundle, language), 'text/markdown');
      return;
    }
    downloadFile(`${base}.json`, renderAuditEvidenceJson(bundle), 'application/json');
  };

  const openPrintableReport = async () => {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (tab?.id == null || !scan) return;
    setExportingPdf(true);
    try {
      const freshComponents = await collectReportComponents(tab.id, scan, events);
      setComponents(freshComponents);
      const capture = includeVisualEvidence
        ? await captureReportVisualEvidence(tab.id, scan, freshComponents)
        : { visuals: [], limitReached: false };
      const token = await storePrintableReportEvidence({
        components: freshComponents,
        visuals: capture.visuals,
        visualEvidenceRequested: includeVisualEvidence,
        visualEvidenceLimitReached: capture.limitReached,
      });
      const params = new URLSearchParams({ tabId: String(tab.id), language, evidence: token });
      await browser.tabs.create({
        url: browser.runtime.getURL(`/report-print.html?${params.toString()}`),
      });
    } finally {
      setExportingPdf(false);
    }
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
        <div className="report-export-tools">
          <label className="report-visual-evidence-option">
            <input
              type="checkbox"
              checked={includeVisualEvidence}
              disabled={!scan || exportingPdf}
              onChange={(event) => setIncludeVisualEvidence(event.currentTarget.checked)}
            />
            <span>
              <strong>{tr(language, 'Include visual evidence', 'Incluir evidencia visual')}</strong>
              <small>{tr(
                language,
                'PDF only. Crops may contain visible page content.',
                'Solo PDF. Los recortes pueden contener contenido visible de la página.',
              )}</small>
            </span>
          </label>
          <div className="report-export-actions">
            <button className="export-pdf-report" type="button" disabled={!scan || exportingPdf} onClick={() => void openPrintableReport()}>
              <span aria-hidden="true">▤</span>
              {exportingPdf ? tr(language, 'Preparing PDF…', 'Preparando PDF…') : tr(language, 'Export PDF', 'Exportar PDF')}
            </button>
            <details className="report-more-formats">
              <summary>{tr(language, 'More formats', 'Más formatos')}</summary>
              <div className="report-format-options">
                <button className="export-text-report" type="button" disabled={!scan || exportingPdf} onClick={downloadTextReport}>
                  <span aria-hidden="true">↓</span>
                  {tr(language, 'Session report (.txt)', 'Informe de sesión (.txt)')}
                </button>
                <button type="button" disabled={graph.focusEvents === 0 || exportingPdf} onClick={() => downloadJourneyEvidence('markdown')}>
                  <span aria-hidden="true">↓</span>
                  {tr(language, 'Trace evidence (.md)', 'Evidencia de Trace (.md)')}
                </button>
                <button type="button" disabled={graph.focusEvents === 0 || exportingPdf} onClick={() => downloadJourneyEvidence('json')}>
                  <span aria-hidden="true">↓</span>
                  {tr(language, 'Trace evidence (.json)', 'Evidencia de Trace (.json)')}
                </button>
              </div>
              <small className="report-format-note">
                {tr(
                  language,
                  'TXT exports the session report. Markdown and JSON export the recorded Trace evidence.',
                  'TXT exporta el informe de sesión. Markdown y JSON exportan la evidencia grabada de Trace.',
                )}
              </small>
            </details>
          </div>
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
          <span>{tr(language, 'runtime findings', 'hallazgos runtime')}</span>
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
                <span className="report-section-index">!</span>
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
                    <span>{suggestionSourceLabel(suggestion.source, language)}</span>
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
                <span className="report-section-index">01</span>
                <div>
                  <h3 id="report-trace-title">{tr(language, 'Runtime trace', 'Traza runtime')}</h3>
                  <p>
                    {model.focusSteps > 0
                      ? automatic
                        ? tr(language, 'Automatic focus evidence plus correlated interactions.', 'Evidencia automática de foco e interacciones correlacionadas.')
                        : tr(language, 'Recorded interactions, focus movement and deterministic causes.', 'Interacciones grabadas, movimientos de foco y causas deterministas.')
                      : tr(language, 'No focus journey has been recorded yet.', 'Todavía no se ha grabado ningún recorrido de foco.')}
                  </p>
                </div>
                <span className="report-section-count">
                  {model.runtimeFindings} {tr(language, 'findings', 'hallazgos')}
                </span>
              </div>
            </div>

            <div className="report-inline-summary">
              <span><strong>{model.runtimeFindings}</strong> {tr(language, 'runtime findings', 'hallazgos runtime')}</span>
              <span><strong>{model.runtimeOccurrences}</strong> {tr(language, 'occurrences', 'ocurrencias')}</span>
              <span><strong>{model.focusSteps}</strong> {tr(language, 'focus steps', 'pasos de foco')}</span>
              <span><strong>{model.transitionReviews}</strong> {tr(language, 'transition reviews', 'transiciones a revisar')}</span>
              <span><strong>{model.handledTransitions}</strong> {tr(language, 'handled', 'correctas')}</span>
              <span><strong>{model.focusJumps}</strong> {tr(language, 'jumps', 'saltos')}</span>
            </div>

            {model.traceStories.length ? (
              <div className="trace-story-list">
                {model.traceStories.map((story) => {
                  const component = story.selector ? componentMap.get(story.selector) : undefined;
                  return (
                    <article className={`trace-story tone-${story.tone}`} key={story.id}>
                      <div className="trace-story-head">
                        <span>{story.tone === 'handled' ? '✓' : story.tone === 'review' ? '⚠' : '•'}</span>
                        <div>
                          <small>
                            {story.interactionNumber
                              ? `${tr(language, 'Interaction', 'Interacción')} #${story.interactionNumber}`
                              : tr(language, 'Runtime signal', 'Señal runtime')}
                            {story.occurrenceCount > 1
                              ? ` · ${story.occurrenceCount} ${tr(language, 'occurrences', 'ocurrencias')}`
                              : ''}
                          </small>
                          <strong>{story.trigger}</strong>
                        </div>
                      </div>
                      <ReportComponentIdentityView component={component} language={language} compact />
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
                      {story.occurrenceCount > 1 && (
                        <details className="trace-story-occurrences">
                          <summary>{tr(
                            language,
                            `View ${story.occurrenceCount} occurrences`,
                            `Ver ${story.occurrenceCount} ocurrencias`,
                          )}</summary>
                          <ol>
                            {story.occurrences.map((occurrence) => (
                              <li key={occurrence.id}>
                                <strong>{occurrence.interactionNumber
                                  ? `${tr(language, 'Interaction', 'Interacción')} #${occurrence.interactionNumber}`
                                  : tr(language, 'Runtime signal', 'Señal runtime')}</strong>
                                <span>{occurrence.chain.join(' → ')}</span>
                              </li>
                            ))}
                          </ol>
                        </details>
                      )}
                      {story.selector && (
                        <button type="button" onClick={() => void onLocate(story.selector!)}>
                          {tr(language, 'Locate evidence', 'Localizar evidencia')}
                        </button>
                      )}
                    </article>
                  );
                })}
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
                <span className="report-section-index">02</span>
                <div>
                  <h3 id="report-analysis-title">{tr(language, 'Full page scan', 'Barrido completo de página')}</h3>
                  <p>{scan.engine} · {scan.standard} · {scan.rulesRun} {tr(language, 'rule families', 'familias de reglas')}</p>
                </div>
                <span className="report-section-count">
                  {model.failures} {tr(language, 'failures', 'fallos')}
                </span>
              </div>
            </div>

            {model.categories.length > 0 && (
              <div className="report-category-summary">
                {model.categories.map((category) => (
                  <span key={category.id}><strong>{category.count}</strong>{category.label}</span>
                ))}
              </div>
            )}

            <ReportScanCompact scan={scan} language={language} />
          </section>

          <section className="report-section" aria-labelledby="report-structure-title">
            <div className="report-section-heading">
              <div>
                <span className="report-section-index">03</span>
                <div>
                  <h3 id="report-structure-title">{tr(language, 'Document structure', 'Estructura del documento')}</h3>
                  <p>{componentScope
                    ? tr(
                        language,
                        'Document-level structure is not mixed into a component-scoped report.',
                        'La estructura global del documento no se mezcla con un informe limitado a un componente.',
                      )
                    : reportStructureSnapshot
                      ? tr(
                          language,
                          'Structural summary and only the signals that need review.',
                          'Resumen estructural y únicamente las señales que requieren revisión.',
                        )
                      : tr(
                          language,
                          'Heading summary available. Generate Structure to add DOM metrics and semantic suggestions.',
                          'Resumen de encabezados disponible. Genera Estructura para añadir métricas del DOM y sugerencias semánticas.',
                        )}</p>
                </div>
                {!componentScope && (
                  <span className="report-section-count">
                    {structureReviewCount} {tr(language, 'to review', 'a revisar')}
                  </span>
                )}
              </div>
            </div>

            {componentScope ? (
              <p className="report-empty-line">{tr(
                language,
                'Run a full-page analysis to include document structure evidence.',
                'Ejecuta un análisis de página completa para incluir evidencia de la estructura del documento.',
              )}</p>
            ) : (
              <>
                <div className="report-inline-summary">
                  <span><strong>{headings.length}</strong> {tr(language, 'headings', 'encabezados')}</span>
                  <span><strong>{headingReviews.length}</strong> {tr(language, 'heading reviews', 'encabezados a revisar')}</span>
                  {reportStructureSnapshot && (
                    <>
                      <span><strong>{reportStructureSnapshot.metrics.totalElements}</strong> {tr(language, 'DOM elements', 'elementos DOM')}</span>
                      <span><strong>{reportStructureSnapshot.metrics.semanticElements}</strong> {tr(language, 'semantic elements', 'elementos semánticos')}</span>
                      <span><strong>{reportStructureSnapshot.metrics.landmarkCount}</strong> {tr(language, 'semantic regions', 'regiones semánticas')}</span>
                      <span><strong>{reportStructureSnapshot.metrics.listCount}</strong> {tr(language, 'lists', 'listas')}</span>
                      <span><strong>{reportStructureSnapshot.metrics.maxDepth}</strong> {tr(language, 'maximum depth', 'profundidad máxima')}</span>
                      <span><strong>{structureHints.length}</strong> {tr(language, 'structural suggestions', 'sugerencias estructurales')}</span>
                    </>
                  )}
                </div>

                {!reportStructureSnapshot && (
                  <div className="notice">
                    <strong>{tr(language, 'Structure metrics not generated', 'Métricas de estructura no generadas')}</strong>
                    <p>{tr(
                      language,
                      'Open Structure and generate the map if you want DOM composition and semantic suggestions included in this report.',
                      'Abre Estructura y genera el mapa si quieres incluir en este informe la composición del DOM y las sugerencias semánticas.',
                    )}</p>
                  </div>
                )}

                {headingReviews.length > 0 && (
                  <>
                    <p className="report-empty-line"><strong>{tr(language, 'Headings that need review', 'Encabezados que requieren revisión')}</strong></p>
                    <ol className="report-heading-list">
                      {headingReviews.map((heading) => (
                        <li className="has-signal" key={heading.id}>
                          <button type="button" onClick={() => void onLocate(heading.selector)}>
                            <span>H{heading.level}</span>
                            <strong>{heading.text || tr(language, 'Empty heading', 'Encabezado vacío')}</strong>
                            <small>{heading.signals.map((signal) => headingSignalLabel(signal, language)).join(' · ')}</small>
                          </button>
                        </li>
                      ))}
                    </ol>
                  </>
                )}

                {structureHints.length > 0 && (
                  <>
                    <p className="report-empty-line"><strong>{tr(language, 'Structural suggestions', 'Sugerencias estructurales')}</strong></p>
                    <ol className="suggestion-list report-structure-hints">
                      {structureHints.map((hint) => {
                        const copy = structureHintCopy(hint, language);
                        return (
                          <li className="priority-medium" key={hint.id}>
                            <div>
                              <span>{hint.tone === 'review' ? tr(language, 'Review', 'Revisar') : tr(language, 'Suggestion', 'Sugerencia')}</span>
                              <small>{tr(language, 'Structure', 'Estructura')}</small>
                            </div>
                            <strong>{copy.title}</strong>
                            <p>{copy.description}</p>
                            {copy.suggestion && <p>{copy.suggestion}</p>}
                          </li>
                        );
                      })}
                    </ol>
                  </>
                )}

                {reportStructureSnapshot && structureReviewCount === 0 && (
                  <p className="report-empty-line">{tr(
                    language,
                    'No structural review signals were found in the available evidence.',
                    'No se han detectado señales estructurales que requieran revisión en la evidencia disponible.',
                  )}</p>
                )}
              </>
            )}
          </section>

          <section className="report-section report-recommendations" aria-labelledby="report-suggestions-title">
            <div className="report-section-heading">
              <div>
                <span className="report-section-index">04</span>
                <div>
                  <h3 id="report-suggestions-title">{tr(language, 'Recommended next steps', 'Sugerencias de mejora')}</h3>
                  <p>{tr(language, 'Prioritized from static and runtime evidence.', 'Priorizadas a partir de evidencia estática y runtime.')}</p>
                </div>
                <span className="report-section-count">
                  {model.suggestions.length} {tr(language, 'suggestions', 'sugerencias')}
                </span>
              </div>
            </div>

            {model.suggestions.length ? (
              <ol className="suggestion-list">
                {model.suggestions.map((suggestion) => (
                  <li className={`priority-${suggestion.priority}`} key={suggestion.id}>
                    <div>
                      <span>{suggestion.priority === 'high' ? tr(language, 'High', 'Alta') : suggestion.priority === 'medium' ? tr(language, 'Medium', 'Media') : tr(language, 'Coverage', 'Cobertura')}</span>
                      <small>{suggestionSourceLabel(suggestion.source, language)}</small>
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
