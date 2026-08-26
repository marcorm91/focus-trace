import { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { browser } from '#imports';
import { suggestAccessibleForeground } from '../../lib/audit/contrast';
import { buildSessionReportModel } from '../../lib/report/session-report';
import { localizedScanIssue, tr, type AppLanguage } from '../../shared/i18n';
import type {
  ExtensionMessage,
  HeadingSignal,
  ScanIssue,
  SessionState,
  StandardReference,
} from '../../shared/types';
import './style.css';

interface LoadedReport {
  session: SessionState;
  language: AppLanguage;
  generatedAt: number;
  version: string;
}

function referenceLabel(reference: StandardReference): string {
  return `${reference.type} ${reference.id}${reference.level ? ` (${reference.level})` : ''}`;
}

function headingSignalLabel(signal: HeadingSignal, language: AppLanguage): string {
  if (signal === 'empty') return tr(language, 'Empty', 'Vacío');
  if (signal === 'level-jump') return tr(language, 'Level jump', 'Salto de nivel');
  return tr(language, 'Multiple H1', 'Varios H1');
}

function suggestionSourceLabel(source: string, language: AppLanguage): string {
  if (source === 'analysis') return tr(language, 'Analysis', 'Análisis');
  if (source === 'focus') return tr(language, 'Runtime focus', 'Foco runtime');
  if (source === 'headings') return tr(language, 'Headings', 'Encabezados');
  return tr(language, 'Coverage', 'Cobertura');
}

function findingGroup(scan: NonNullable<SessionState['scan']>, language: AppLanguage) {
  return [
    { id: 'fail', label: tr(language, 'Failures', 'Fallos'), issues: scan.issues },
    { id: 'review', label: tr(language, 'Review', 'Revisión'), issues: scan.review },
    { id: 'warning', label: tr(language, 'Warnings', 'Avisos'), issues: scan.warnings ?? [] },
  ] as const;
}

function ContrastEvidence({ issue, language }: { issue: ScanIssue; language: AppLanguage }) {
  if (!issue.contrast) return null;
  const contrast = issue.contrast;
  const suggestion = issue.outcome === 'fail' && contrast.foreground && contrast.background
    ? suggestAccessibleForeground(contrast.foreground, contrast.background, contrast.requiredRatio)
    : undefined;

  return (
    <div className="print-contrast">
      <div>
        <span>{tr(language, 'Measured contrast', 'Contraste medido')}</span>
        <strong>{contrast.ratio != null ? `${contrast.ratio}:1` : tr(language, 'Review', 'Revisar')}</strong>
        <small>{tr(language, `Required ${contrast.requiredRatio}:1`, `Requerido ${contrast.requiredRatio}:1`)}</small>
      </div>
      {contrast.foreground && (
        <div>
          <span>{tr(language, 'Foreground', 'Primer plano')}</span>
          <code>{contrast.foreground}</code>
        </div>
      )}
      {contrast.background && (
        <div>
          <span>{tr(language, 'Background / adjacent', 'Fondo / adyacente')}</span>
          <code>{contrast.background}</code>
        </div>
      )}
      {suggestion && (
        <div className="print-contrast-suggestion">
          <span>{tr(language, 'Suggested accessible color', 'Color accesible sugerido')}</span>
          <strong>{suggestion.hex}</strong>
          <small>{suggestion.rgb} · {suggestion.ratio}:1</small>
        </div>
      )}
    </div>
  );
}

function Finding({ issue, label, language }: { issue: ScanIssue; label: string; language: AppLanguage }) {
  const copy = localizedScanIssue(issue, language);
  return (
    <article className={`print-finding tone-${issue.outcome}`}>
      <div className="print-finding-meta">
        <span>{label}</span>
        <code>{issue.ruleId}</code>
        <span>{issue.severity}</span>
      </div>
      <h4>{copy.title}</h4>
      <p>{copy.description}</p>
      {issue.references.length > 0 && (
        <div className="print-references" aria-label={tr(language, 'Standards references', 'Referencias normativas')}>
          {issue.references.map((reference) => (
            <a href={reference.url} key={`${reference.type}-${reference.id}`}>{referenceLabel(reference)}</a>
          ))}
        </div>
      )}
      <ContrastEvidence issue={issue} language={language} />
      {copy.evidence && <p className="print-evidence"><strong>{tr(language, 'Evidence:', 'Evidencia:')}</strong> {copy.evidence}</p>}
    </article>
  );
}

function PrintableReport({ report }: { report: LoadedReport }) {
  const { session, language, generatedAt, version } = report;
  const scan = session.scan!;
  const model = useMemo(
    () => buildSessionReportModel(scan, session.events, language),
    [language, scan, session.events],
  );
  const highPriority = model.suggestions.filter((suggestion) => suggestion.priority === 'high').slice(0, 6);
  const headings = scan.headings ?? [];
  const generatedLabel = new Intl.DateTimeFormat(language === 'es' ? 'es-ES' : 'en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(generatedAt);

  return (
    <>
      <div className="print-toolbar" role="region" aria-label={tr(language, 'PDF actions', 'Acciones PDF')}>
        <div>
          <strong>{tr(language, 'PDF preview', 'Vista previa PDF')}</strong>
          <span>{tr(language, 'Use the browser print dialog and choose Save as PDF.', 'Usa el diálogo de impresión del navegador y elige Guardar como PDF.')}</span>
        </div>
        <button type="button" onClick={() => window.print()}>
          <span aria-hidden="true">▤</span>
          {tr(language, 'Print / Save as PDF', 'Imprimir / Guardar como PDF')}
        </button>
      </div>

      <main className="report-page">
        <header className="print-cover">
          <div className="print-brand">
            <img src="/icon/48.png" alt="" />
            <div>
              <strong>FocusTrace</strong>
              <span>{tr(language, 'Runtime accessibility debugger', 'Depurador de accesibilidad runtime')}</span>
            </div>
            <small>v{version}</small>
          </div>
          <div className="print-title-block">
            <p>{tr(language, 'Accessibility report', 'Informe de accesibilidad')}</p>
            <h1>{scan.title || tr(language, 'Analyzed page', 'Página analizada')}</h1>
            <a href={scan.url}>{scan.url}</a>
          </div>
          <div className="print-context">
            <span><strong>{tr(language, 'Standard', 'Estándar')}</strong>{scan.standard}</span>
            <span><strong>{tr(language, 'Generated', 'Generado')}</strong>{generatedLabel}</span>
            <span><strong>{tr(language, 'Engine', 'Motor')}</strong>{scan.engine}</span>
            <span><strong>{tr(language, 'Rules executed', 'Reglas ejecutadas')}</strong>{scan.rulesRun}</span>
          </div>
        </header>

        <section className="print-section" aria-labelledby="summary-title">
          <div className="print-section-title">
            <span>00</span>
            <div><h2 id="summary-title">{tr(language, 'Executive summary', 'Resumen ejecutivo')}</h2></div>
          </div>
          <div className="print-score-grid">
            <div className={model.failures ? 'is-fail' : ''}><strong>{model.failures}</strong><span>{tr(language, 'Failures', 'Fallos')}</span></div>
            <div><strong>{model.reviews}</strong><span>{tr(language, 'Review', 'Revisión')}</span></div>
            <div><strong>{model.warnings}</strong><span>{tr(language, 'Warnings', 'Avisos')}</span></div>
            <div className={model.runtimeFindings ? 'is-review' : ''}><strong>{model.runtimeFindings}</strong><span>Runtime</span></div>
            <div><strong>{model.focusSteps}</strong><span>{tr(language, 'Focus steps', 'Pasos de foco')}</span></div>
          </div>
          <div className="print-category-row">
            {model.categories.map((category) => <span key={category.id}><strong>{category.count}</strong> {category.label}</span>)}
          </div>
        </section>

        <section className="print-section print-priority" aria-labelledby="priority-title">
          <div className="print-section-title">
            <span>!</span>
            <div>
              <h2 id="priority-title">{tr(language, 'Highest priority', 'Máxima prioridad')}</h2>
              <p>{tr(language, 'The first issues worth addressing from the collected evidence.', 'Los primeros puntos que merece la pena abordar según la evidencia recogida.')}</p>
            </div>
          </div>
          {highPriority.length ? (
            <ol className="print-suggestion-list">
              {highPriority.map((suggestion) => (
                <li key={suggestion.id}>
                  <small>{suggestionSourceLabel(suggestion.source, language)}</small>
                  <strong>{suggestion.title}</strong>
                  <p>{suggestion.detail}</p>
                </li>
              ))}
            </ol>
          ) : <p className="print-empty">{tr(language, 'No high-priority automated recommendation was produced.', 'No se ha generado ninguna recomendación automática de prioridad alta.')}</p>}
        </section>

        <section className="print-section" aria-labelledby="runtime-title">
          <div className="print-section-title">
            <span>01</span>
            <div>
              <h2 id="runtime-title">{tr(language, 'Runtime trace', 'Traza runtime')}</h2>
              <p>{tr(language, 'Recorded interactions, focus movement and interpreted runtime evidence.', 'Interacciones grabadas, movimiento del foco y evidencia runtime interpretada.')}</p>
            </div>
          </div>
          <div className="print-inline-metrics">
            <span><strong>{model.focusSteps}</strong> {tr(language, 'focus steps', 'pasos de foco')}</span>
            <span><strong>{model.transitionReviews}</strong> {tr(language, 'to review', 'a revisar')}</span>
            <span><strong>{model.handledTransitions}</strong> {tr(language, 'handled', 'gestionadas')}</span>
            <span><strong>{model.focusJumps}</strong> {tr(language, 'jumps', 'saltos')}</span>
          </div>
          {model.traceStories.length ? (
            <div className="print-trace-list">
              {model.traceStories.map((story) => (
                <article className={`print-trace-story tone-${story.tone}`} key={story.id}>
                  <div className="print-trace-head">
                    <span>{story.tone === 'handled' ? '✓' : story.tone === 'review' ? '!' : '•'}</span>
                    <div>
                      <small>{story.interactionNumber ? `${tr(language, 'Interaction', 'Interacción')} #${story.interactionNumber}` : tr(language, 'Runtime signal', 'Señal runtime')}</small>
                      <strong>{story.trigger}</strong>
                    </div>
                  </div>
                  <p className="print-chain">{story.chain.join(' → ')}</p>
                  <div className="print-trace-result">
                    <strong>{story.result}</strong>
                    <p>{story.detail}</p>
                  </div>
                  {story.impact && <p><strong>{tr(language, 'Impact:', 'Impacto:')}</strong> {story.impact}</p>}
                  {story.recommendation && <p><strong>{tr(language, 'Recommendation:', 'Recomendación:')}</strong> {story.recommendation}</p>}
                  {story.references.length > 0 && <p className="print-reference-line">{story.references.map(referenceLabel).join(' · ')}</p>}
                </article>
              ))}
            </div>
          ) : <p className="print-empty">{tr(language, 'No runtime trace was recorded for this report.', 'No se ha registrado una traza runtime para este informe.')}</p>}
        </section>

        <section className="print-section" aria-labelledby="scan-title">
          <div className="print-section-title">
            <span>02</span>
            <div>
              <h2 id="scan-title">{tr(language, 'Full page scan', 'Barrido completo de página')}</h2>
              <p>{scan.rulesRun} {tr(language, 'rule families executed.', 'familias de reglas ejecutadas.')}</p>
            </div>
          </div>
          {findingGroup(scan, language).map((group) => (
            <div className="print-finding-group" key={group.id}>
              <h3>{group.label} <span>{group.issues.length}</span></h3>
              {group.issues.length
                ? group.issues.map((issue) => <Finding issue={issue} label={group.label} language={language} key={issue.id} />)
                : <p className="print-empty">{tr(language, 'No findings in this group.', 'No hay hallazgos en este grupo.')}</p>}
            </div>
          ))}
        </section>

        <section className="print-section" aria-labelledby="headings-title">
          <div className="print-section-title">
            <span>03</span>
            <div>
              <h2 id="headings-title">{tr(language, 'Heading structure', 'Estructura de encabezados')}</h2>
              <p>{tr(language, 'H1–H6 elements captured in document order.', 'Elementos H1–H6 capturados en orden de documento.')}</p>
            </div>
          </div>
          {headings.length ? (
            <ol className="print-heading-list">
              {headings.map((heading) => (
                <li className={heading.signals.length ? 'has-signal' : ''} key={heading.id} style={{ marginInlineStart: `${(heading.level - 1) * 14}px` }}>
                  <span>H{heading.level}</span>
                  <strong>{heading.text || tr(language, 'Empty heading', 'Encabezado vacío')}</strong>
                  {heading.signals.length > 0 && <small>{heading.signals.map((signal) => headingSignalLabel(signal, language)).join(' · ')}</small>}
                </li>
              ))}
            </ol>
          ) : <p className="print-empty">{tr(language, 'No headings were captured.', 'No se han capturado encabezados.')}</p>}
        </section>

        <section className="print-section" aria-labelledby="recommendations-title">
          <div className="print-section-title">
            <span>04</span>
            <div>
              <h2 id="recommendations-title">{tr(language, 'Recommended next steps', 'Sugerencias de mejora')}</h2>
              <p>{tr(language, 'Prioritized from static and runtime evidence.', 'Priorizadas a partir de evidencia estática y runtime.')}</p>
            </div>
          </div>
          {model.suggestions.length ? (
            <ol className="print-recommendation-list">
              {model.suggestions.map((suggestion) => (
                <li key={suggestion.id}>
                  <div><span>{suggestion.priority}</span><small>{suggestionSourceLabel(suggestion.source, language)}</small></div>
                  <strong>{suggestion.title}</strong>
                  <p>{suggestion.detail}</p>
                </li>
              ))}
            </ol>
          ) : <p className="print-empty">{tr(language, 'No automated recommendations were produced.', 'No se han generado recomendaciones automáticas.')}</p>}
        </section>

        <footer className="print-footer">
          <p>{tr(
            language,
            'FocusTrace combines deterministic automated evidence and recorded runtime behavior. This report is not a complete WCAG conformance certificate and manual review is still required.',
            'FocusTrace combina evidencia automática determinista y comportamiento runtime registrado. Este informe no es un certificado completo de conformidad WCAG y sigue siendo necesaria una revisión manual.',
          )}</p>
          <div><span>FocusTrace v{version}</span><span>{generatedLabel}</span></div>
        </footer>
      </main>
    </>
  );
}

function App() {
  const [report, setReport] = useState<LoadedReport>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabId = Number(params.get('tabId'));
    const language: AppLanguage = params.get('language') === 'es' ? 'es' : 'en';
    document.documentElement.lang = language;

    if (!Number.isInteger(tabId) || tabId < 0) {
      setError(tr(language, 'The source tab for this report is not available.', 'La pestaña de origen de este informe no está disponible.'));
      return;
    }

    void browser.runtime.sendMessage({
      type: 'FOCUSTRACE_GET_SESSION',
      tabId,
    } satisfies ExtensionMessage).then((session) => {
      const state = session as SessionState;
      if (!state.scan) {
        setError(tr(language, 'No page analysis is available for this report.', 'No hay un análisis de página disponible para este informe.'));
        return;
      }
      const generatedAt = Date.now();
      const version = browser.runtime.getManifest().version;
      setReport({ session: state, language, generatedAt, version });
      let host = 'report';
      try { host = new URL(state.scan.url).hostname || 'report'; } catch { /* keep fallback */ }
      const date = new Date(generatedAt).toISOString().slice(0, 10);
      document.title = `FocusTrace-${host}-${date}`;
    }).catch((reason) => {
      setError(reason instanceof Error ? reason.message : String(reason));
    });
  }, []);

  if (error) {
    return <main className="print-error"><img src="/icon/48.png" alt="" /><h1>FocusTrace</h1><p>{error}</p></main>;
  }
  if (!report) return <main className="print-loading">FocusTrace…</main>;
  return <PrintableReport report={report} />;
}

createRoot(document.getElementById('root')!).render(<App />);
