import { useMemo, useState } from 'react';
import { browser } from '#imports';
import { auditPageKey, auditSummary, type AccessibilityAudit } from '../../../lib/audit/multipage-audit';
import { storeAuditPrintEvidence } from '../../../lib/audit/multipage-audit-storage';
import type { StructureSnapshot } from '../../../lib/runtime/structure-map';
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
}: {
  audit?: AccessibilityAudit | undefined;
  scan?: ScanResult | undefined;
  events: RuntimeEvent[];
  structureSnapshot?: StructureSnapshot | undefined;
  language: AppLanguage;
  onLocate: (selector: string) => void | Promise<void>;
}) {
  const [exportingAudit, setExportingAudit] = useState(false);
  const summary = useMemo(() => audit ? auditSummary(audit) : undefined, [audit]);
  const currentPageKey = scan ? auditPageKey(scan.url) : undefined;

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
                'Each analyzed URL appears once. Re-analyzing a page replaces its saved result and review time.',
                'Cada URL analizada aparece una sola vez. Si vuelves a analizar una página, se sustituye su resultado guardado y su hora de revisión.',
              )}</p>
            </div>
            <button
              className="export-audit-report"
              type="button"
              disabled={!audit.pages.length || exportingAudit}
              onClick={() => void exportAuditPdf()}
            >
              <span aria-hidden="true">▤</span>
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

          <ol className="audit-page-list">
            {audit.pages.map((page, index) => {
              const active = currentPageKey === page.key;
              return (
                <li className={active ? 'is-current' : ''} key={page.key}>
                  <span className="audit-page-index">{String(index + 1).padStart(2, '0')}</span>
                  <div className="audit-page-copy">
                    <strong>{page.title || page.url}</strong>
                    <small>{page.url}</small>
                    <span>{tr(language, 'Review performed', 'Revisión realizada')}: {formatReviewTime(page.reviewedAt, language)}</span>
                  </div>
                  <div className="audit-page-counts" aria-label={tr(language, 'Page findings', 'Hallazgos de página')}>
                    <span><strong>{page.scan.issues.length}</strong>{tr(language, 'failures', 'fallos')}</span>
                    <span><strong>{page.scan.review.length}</strong>{tr(language, 'reviews', 'revisiones')}</span>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {!scan ? (
        <Empty
          title={tr(language, 'No analysis data yet', 'Todavía no hay datos de análisis')}
          text={tr(
            language,
            'Analyze the current page to generate its report.',
            'Analiza la página actual para generar su informe.',
          )}
        />
      ) : (
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
