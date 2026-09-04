import { useMemo, useState } from 'react';
import { browser } from '#imports';
import { auditPageKey, auditSummary, type AccessibilityAudit } from '../../../lib/audit/multipage-audit';
import { storeAuditPrintEvidence } from '../../../lib/audit/multipage-audit-storage';
import type { StructureSnapshot } from '../../../lib/runtime/structure-evidence';
import { tr, type AppLanguage } from '../../../shared/i18n';
import type { RuntimeEvent, ScanResult } from '../../../shared/types';
import { Empty } from '../components/Common';
import { SessionReportView } from './SessionReportView';

function formatReviewTime(timestamp: number, language: AppLanguage): string {
  return new Intl.DateTimeFormat(language === 'es' ? 'es-ES' : 'en-GB', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(timestamp);
}

export function AuditReportWorkspace({
  audit,
  scan,
  events,
  structureSnapshot,
  language,
  onLocate,
  onDeletePage,
}: {
  audit?: AccessibilityAudit | undefined;
  scan?: ScanResult | undefined;
  events: RuntimeEvent[];
  structureSnapshot?: StructureSnapshot | undefined;
  language: AppLanguage;
  onLocate: (selector: string) => void | Promise<void>;
  onDeletePage: (auditId: string, pageKey: string) => void | Promise<void>;
}) {
  const [exportingAudit, setExportingAudit] = useState(false);
  const [deletingPageKey, setDeletingPageKey] = useState<string>();
  const [includeVisualEvidence, setIncludeVisualEvidence] = useState(true);
  const [openPageKey, setOpenPageKey] = useState<string>();
  const summary = useMemo(() => audit ? auditSummary(audit) : undefined, [audit]);
  const currentPageKey = scan ? auditPageKey(scan.url) : undefined;
  const hasAuditPages = Boolean(audit?.pages.length);
  const savedVisualCount = audit?.pages.reduce(
    (count, page) => count + (page.visualEvidence?.visuals.length ?? 0),
    0,
  ) ?? 0;

  const exportAuditPdf = async () => {
    if (!audit?.pages.length || exportingAudit) return;
    setExportingAudit(true);
    try {
      const evidence = await storeAuditPrintEvidence(audit, includeVisualEvidence);
      const params = new URLSearchParams({ language, evidence });
      await browser.tabs.create({
        url: browser.runtime.getURL(`/audit-print.html?${params.toString()}`),
      });
    } finally {
      setExportingAudit(false);
    }
  };

  const deletePage = async (pageKey: string, pageTitle: string) => {
    if (!audit || deletingPageKey) return;
    const confirmed = window.confirm(tr(
      language,
      `Delete the saved report for “${pageTitle}”? This removes its analysis and saved visual evidence from the current audit.`,
      `¿Eliminar el informe guardado de «${pageTitle}»? Se borrarán de la auditoría actual su análisis y la evidencia visual guardada.`,
    ));
    if (!confirmed) return;
    setDeletingPageKey(pageKey);
    try {
      await onDeletePage(audit.id, pageKey);
      setOpenPageKey((current) => current === pageKey ? undefined : current);
    } finally {
      setDeletingPageKey(undefined);
    }
  };

  const updatePageOpenState = (key: string, open: boolean) => {
    setOpenPageKey((current) => {
      if (open) return key;
      return current === key ? undefined : current;
    });
  };

  return (
    <div className="audit-report-workspace">
      {audit && summary && (
        <section className="panel audit-overview" aria-labelledby="audit-overview-title">
          <div className="audit-overview-heading">
            <div>
              <span className="report-kicker">{tr(language, 'Current audit', 'Auditoría actual')}</span>
              <h2 id="audit-overview-title">{audit.name}</h2>
              <p>{tr(
                language,
                'Open a reviewed page to inspect its saved report. Only one review is expanded at a time, and re-analyzing the same URL replaces its previous result.',
                'Abre una página revisada para consultar su informe guardado. Solo se despliega una revisión a la vez y, si vuelves a analizar la misma URL, se sustituye su resultado anterior.',
              )}</p>
            </div>
            <div className="audit-overview-actions">
              <label className="audit-visual-evidence-option">
                <input
                  type="checkbox"
                  checked={includeVisualEvidence}
                  disabled={savedVisualCount === 0 || exportingAudit}
                  onChange={(event) => setIncludeVisualEvidence(event.currentTarget.checked)}
                />
                <span>
                  <strong>{tr(language, 'Include saved images', 'Incluir imágenes guardadas')}</strong>
                  <small>{savedVisualCount > 0
                    ? tr(language, `${savedVisualCount} crops available`, `${savedVisualCount} recortes disponibles`)
                    : tr(language, 'Re-analyze pages to capture them', 'Vuelve a analizar las páginas para capturarlas')}</small>
                </span>
              </label>
              <button
                className="export-audit-report"
                type="button"
                disabled={!audit.pages.length || exportingAudit}
                onClick={() => void exportAuditPdf()}
              >
                {exportingAudit
                  ? tr(language, 'Preparing audit…', 'Preparando auditoría…')
                  : tr(language, 'Export audit PDF', 'Exportar auditoría PDF')}
              </button>
            </div>
          </div>

          <div className="audit-overview-metrics" aria-label={tr(language, 'Audit summary', 'Resumen de auditoría')}>
            <span><strong>{summary.pages}</strong>{tr(language, 'Pages', 'Páginas')}</span>
            <span><strong>{summary.failures}</strong>{tr(language, 'Failures', 'Fallos')}</span>
            <span><strong>{summary.reviews}</strong>{tr(language, 'Reviews', 'Revisiones')}</span>
            <span><strong>{summary.warnings}</strong>{tr(language, 'Warnings', 'Avisos')}</span>
          </div>

          <div className="audit-page-history" aria-label={tr(language, 'Reviewed pages', 'Páginas revisadas')}>
            {audit.pages.map((page, index) => {
              const active = currentPageKey === page.key;
              const open = openPageKey === page.key;
              const warnings = page.scan.warnings?.length ?? 0;
              return (
                <details
                  className={`audit-page-report${active ? ' is-current' : ' is-history'}`}
                  key={page.key}
                  open={open}
                  onToggle={(event) => updatePageOpenState(page.key, event.currentTarget.open)}
                >
                  <summary className="audit-page-summary">
                    <span className="audit-page-index">{String(index + 1).padStart(2, '0')}</span>
                    <span className="audit-page-copy">
                      <strong>{page.title || page.url}</strong>
                      <small>{page.url}</small>
                      <span>{tr(language, 'Review performed', 'Revisión realizada')}: {formatReviewTime(page.reviewedAt, language)}</span>
                    </span>
                    <span className="audit-page-counts" aria-label={tr(language, 'Page findings', 'Hallazgos de página')}>
                      <span><strong>{page.scan.issues.length}</strong>{tr(language, 'failures', 'fallos')}</span>
                      <span><strong>{page.scan.review.length}</strong>{tr(language, 'reviews', 'revisiones')}</span>
                      <span><strong>{warnings}</strong>{tr(language, 'warnings', 'avisos')}</span>
                    </span>
                  </summary>

                  {open && (
                    <div className="audit-page-report-body">
                      <div className="audit-page-actions">
                        <button
                          type="button"
                          disabled={Boolean(deletingPageKey)}
                          onClick={() => void deletePage(page.key, page.title || page.url)}
                        >
                          {deletingPageKey === page.key
                            ? tr(language, 'Deleting…', 'Eliminando…')
                            : tr(language, 'Delete saved report', 'Eliminar informe guardado')}
                        </button>
                      </div>
                      {!active && (
                        <p className="audit-history-note">
                          {tr(
                            language,
                            'Saved static review. Live page actions, current Trace and current Structure are intentionally not mixed into this historical page. Use Export audit PDF for its persisted visual evidence.',
                            'Revisión estática guardada. Las acciones sobre la página, el Trace actual y la Estructura actual no se mezclan con esta página histórica. Usa Exportar auditoría PDF para consultar su evidencia visual persistida.',
                          )}
                        </p>
                      )}
                      <SessionReportView
                        scan={page.scan}
                        events={active ? events : []}
                        structureSnapshot={active ? structureSnapshot : undefined}
                        language={language}
                        onLocate={onLocate}
                        livePage={active}
                        savedVisualEvidence={page.visualEvidence}
                      />
                    </div>
                  )}
                </details>
              );
            })}
          </div>
        </section>
      )}

      {!hasAuditPages && !scan && (
        <Empty
          title={tr(language, 'No analysis data yet', 'Todavía no hay datos de análisis')}
          text={tr(
            language,
            'Analyze the current page to generate its report.',
            'Analiza la página actual para generar su informe.',
          )}
        />
      )}

      {!hasAuditPages && scan && (
        <SessionReportView
          scan={scan}
          events={events}
          structureSnapshot={structureSnapshot}
          language={language}
          onLocate={onLocate}
        />
      )}
    </div>
  );
}
