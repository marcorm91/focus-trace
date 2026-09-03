import { useMemo, useState } from 'react';
import { browser } from '#imports';
import { auditPageKey, auditSummary, type AccessibilityAudit } from '../../../lib/audit/multipage-audit';
import { storeAuditPrintEvidence } from '../../../lib/audit/multipage-audit-storage';
import type { StructureSnapshot } from '../../../lib/runtime/structure-evidence';
import { tr, type AppLanguage } from '../../../shared/i18n';
import type { RuntimeEvent, ScanResult } from '../../../shared/types';
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
}: {
  audit?: AccessibilityAudit | undefined;
  scan?: ScanResult | undefined;
  events: RuntimeEvent[];
  structureSnapshot?: StructureSnapshot | undefined;
  language: AppLanguage;
  onLocate: (selector: string) => void | Promise<void>;
}) {
  const [exportingAudit, setExportingAudit] = useState(false);
  const [openPageKeys, setOpenPageKeys] = useState<string[]>([]);
  const summary = useMemo(() => audit ? auditSummary(audit) : undefined, [audit]);
  const currentPageKey = scan ? auditPageKey(scan.url) : undefined;
  const hasAuditPages = Boolean(audit?.pages.length);

  const exportAuditPdf = async () => {
    if (!audit?.pages.length || exportingAudit) return;
    setExportingAudit(true);
    try {
      const evidence = await storeAuditPrintEvidence(audit);
      const params = new URLSearchParams({ language, evidence });
      await browser.tabs.create({
        url: browser.runtime.getURL(`/audit-print.html?${params.toString()}`),
      });
    } finally {
      setExportingAudit(false);
    }
  };

  const updatePageOpenState = (key: string, open: boolean) => {
    setOpenPageKeys((current) => {
      if (open) return current.includes(key) ? current : [...current, key];
      return current.filter((item) => item !== key);
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
                'Open any reviewed page to inspect the complete saved report. Re-analyzing the same URL replaces its previous result.',
                'Abre cualquier página revisada para consultar su informe completo guardado. Si vuelves a analizar la misma URL, se sustituye su resultado anterior.',
              )}</p>
            </div>
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

          <div className="audit-overview-metrics" aria-label={tr(language, 'Audit summary', 'Resumen de auditoría')}>
            <span><strong>{summary.pages}</strong>{tr(language, 'Pages', 'Páginas')}</span>
            <span><strong>{summary.failures}</strong>{tr(language, 'Failures', 'Fallos')}</span>
            <span><strong>{summary.reviews}</strong>{tr(language, 'Reviews', 'Revisiones')}</span>
            <span><strong>{summary.warnings}</strong>{tr(language, 'Warnings', 'Avisos')}</span>
          </div>

          <div className="audit-page-history" aria-label={tr(language, 'Reviewed pages', 'Páginas revisadas')}>
            {audit.pages.map((page, index) => {
              const active = currentPageKey === page.key;
              const open = openPageKeys.includes(page.key);
              const warnings = page.scan.warnings?.length ?? 0;
              return (
                <details
                  className={`audit-page-report${active ? ' is-current' : ''}`}
                  key={page.key}
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
                      {!active && (
                        <p className="audit-history-note">
                          {tr(
                            language,
                            'Saved report from this review. Runtime and page-location actions are only live for the page currently analyzed in the panel.',
                            'Informe guardado de esta revisión. Las acciones runtime y de localización sobre la página solo están activas para la página analizada actualmente en el panel.',
                          )}
                        </p>
                      )}
                      <SessionReportView
                        scan={page.scan}
                        events={active ? events : []}
                        structureSnapshot={active ? structureSnapshot : undefined}
                        language={language}
                        onLocate={active ? onLocate : () => undefined}
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
        <section className="panel report-empty-panel" aria-labelledby="report-empty-title">
          <div className="empty structure-empty report-empty-state">
            <h2 id="report-empty-title">{tr(language, 'No analysis data yet', 'Todavía no hay datos de análisis')}</h2>
            <p>{tr(
              language,
              'Analyze the current page to generate its report.',
              'Analiza la página actual para generar su informe.',
            )}</p>
          </div>
        </section>
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
