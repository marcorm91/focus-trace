import { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { browser } from '#imports';
import { auditSummary, type AccessibilityAudit } from '../../lib/audit/multipage-audit';
import { readAuditPrintEvidence } from '../../lib/audit/multipage-audit-storage';
import { guidanceForIssue, reportFindingDescription } from '../../lib/report/finding-guidance';
import type { ReportVisualEvidence } from '../../lib/report/visual-evidence';
import { localizedScanIssue, localizedSeverity, tr, type AppLanguage } from '../../shared/i18n';
import { sortBySeverity } from '../../shared/severity';
import type { HeadingSignal, ScanIssue, StandardReference } from '../../shared/types';
import '../report-print/index.css';
import './index.css';

type PrintPageNumbers = Record<string, number>;

function initialPrintPageNumbers(audit: AccessibilityAudit): PrintPageNumbers {
  return Object.fromEntries(audit.pages.flatMap((_page, index) => {
    const pageId = `audit-page-${index + 1}`;
    const pageNumber = index + 3;
    return [
      [pageId, pageNumber],
      ...['headings', 'fail', 'review', 'warning'].map((section) => [`${pageId}-${section}`, pageNumber]),
    ];
  }));
}

function measuredPrintPageNumbers(audit: AccessibilityAudit): PrintPageNumbers | undefined {
  const report = document.querySelector<HTMLElement>('.audit-print-report:not(.audit-print-measure)');
  if (!report) return undefined;

  const clone = report.cloneNode(true) as HTMLElement;
  clone.classList.add('audit-print-measure');
  clone.setAttribute('aria-hidden', 'true');
  clone.setAttribute('inert', '');
  const ruler = document.createElement('div');
  ruler.className = 'audit-print-page-ruler';
  document.body.append(clone, ruler);

  try {
    const pageHeight = ruler.getBoundingClientRect().height;
    const cover = clone.querySelector<HTMLElement>('.audit-print-cover');
    const toc = clone.querySelector<HTMLElement>('.audit-print-toc');
    if (!cover || !toc || pageHeight <= 0) return undefined;

    const pageSpan = (element: HTMLElement) => Math.max(
      1,
      Math.ceil((element.getBoundingClientRect().height - 0.5) / pageHeight),
    );
    const pageNumbers: PrintPageNumbers = {};
    let nextPage = pageSpan(cover) + pageSpan(toc) + 1;

    audit.pages.forEach((_page, index) => {
      const pageId = `audit-page-${index + 1}`;
      const title = clone.querySelector<HTMLElement>(`#${pageId}`);
      const pageSection = title?.closest<HTMLElement>('.audit-print-page');
      if (!pageSection) return;

      const pageTop = pageSection.getBoundingClientRect().top;
      const fragmentShifts: Array<{ offset: number; added: number }> = [];
      let addedHeight = 0;
      const unbreakableBlocks = [...pageSection.querySelectorAll<HTMLElement>(
        '.print-finding, .print-heading-list li',
      )].sort((first, second) => first.getBoundingClientRect().top - second.getBoundingClientRect().top);
      for (const block of unbreakableBlocks) {
        const rect = block.getBoundingClientRect();
        if (rect.height >= pageHeight) continue;
        const offset = Math.max(0, rect.top - pageTop);
        const shiftedOffset = offset + addedHeight;
        const offsetWithinPage = shiftedOffset % pageHeight;
        if (offsetWithinPage <= 0 || offsetWithinPage + rect.height <= pageHeight) continue;
        const added = pageHeight - offsetWithinPage;
        addedHeight += added;
        fragmentShifts.push({ offset, added });
      }
      const adjustedOffset = (element: HTMLElement) => {
        const offset = Math.max(0, element.getBoundingClientRect().top - pageTop);
        const fragmentation = fragmentShifts
          .filter((shift) => shift.offset <= offset)
          .reduce((total, shift) => total + shift.added, 0);
        return offset + fragmentation;
      };
      pageNumbers[pageId] = nextPage;
      for (const section of ['headings', 'fail', 'review', 'warning']) {
        const sectionId = `${pageId}-${section}`;
        const sectionElement = clone.querySelector<HTMLElement>(`#${sectionId}`);
        if (!sectionElement) continue;
        const offset = adjustedOffset(sectionElement);
        pageNumbers[sectionId] = nextPage + Math.floor(offset / pageHeight);
      }
      nextPage += Math.max(
        1,
        Math.ceil((pageSection.getBoundingClientRect().height + addedHeight - 0.5) / pageHeight),
      );
    });

    return pageNumbers;
  } finally {
    clone.remove();
    ruler.remove();
  }
}

function referenceLabel(reference: StandardReference): string {
  return `${reference.type} ${reference.id}${reference.level ? ` (${reference.level})` : ''}`;
}

function headingSignalLabel(signal: HeadingSignal, language: AppLanguage): string {
  if (signal === 'empty') return tr(language, 'Empty', 'Vacío');
  if (signal === 'level-jump') return tr(language, 'Level jump', 'Salto de nivel');
  return tr(language, 'Multiple H1', 'Varios H1');
}

function formatDateTime(timestamp: number, language: AppLanguage): string {
  return new Intl.DateTimeFormat(language === 'es' ? 'es-ES' : 'en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(timestamp);
}

function Finding({
  issue,
  language,
  visual,
}: {
  issue: ScanIssue;
  language: AppLanguage;
  visual?: ReportVisualEvidence;
}) {
  const copy = localizedScanIssue(issue, language);
  const guidance = guidanceForIssue(issue, language);
  return (
    <article className={`print-finding tone-${issue.outcome} severity-${issue.severity}`}>
      <div className="print-finding-meta">
        <span className={`print-severity severity-${issue.severity}`}>{localizedSeverity(issue.severity, language)}</span>
        <code>{issue.ruleId}</code>
      </div>
      <h4>{copy.title}</h4>
      <p className="print-finding-description">{reportFindingDescription(issue, language)}</p>
      {issue.references.length > 0 && (
        <div className="print-references" aria-label={tr(language, 'Standards references', 'Referencias normativas')}>
          {issue.references.map((reference) => (
            <a href={reference.url} key={`${reference.type}-${reference.id}`}>{referenceLabel(reference)}</a>
          ))}
        </div>
      )}
      {copy.evidence && (
        <p className="print-evidence"><strong>{tr(language, 'Evidence:', 'Evidencia:')}</strong> {copy.evidence}</p>
      )}
      {visual && (
        <figure className={`print-visual-evidence tone-${visual.tone}`}>
          <img
            src={visual.dataUrl}
            alt={tr(language, 'Visual evidence crop for this finding', 'Recorte de evidencia visual de este hallazgo')}
          />
          <figcaption>{visual.selector}</figcaption>
        </figure>
      )}
      <div className="print-guidance">
        <div>
          <small>{tr(language, 'User impact', 'Impacto para el usuario')}</small>
          <p>{guidance.impact}</p>
        </div>
        <div>
          <small>{tr(language, 'Suggested fix', 'Propuesta de solución')}</small>
          <p>{guidance.remediation}</p>
        </div>
        <div>
          <small>{tr(language, 'How to verify', 'Cómo validarlo')}</small>
          <p>{guidance.validation}</p>
        </div>
      </div>
    </article>
  );
}

function AuditPrintReport({
  audit,
  language,
}: {
  audit: AccessibilityAudit;
  language: AppLanguage;
}) {
  const summary = useMemo(() => auditSummary(audit), [audit]);
  const version = browser.runtime.getManifest().version;
  const generatedAt = Date.now();
  const generatedLabel = formatDateTime(generatedAt, language);
  const [printPageNumbers, setPrintPageNumbers] = useState<PrintPageNumbers>(
    () => initialPrintPageNumbers(audit),
  );

  useEffect(() => {
    let cancelled = false;
    let frame = 0;
    const updatePageNumbers = () => {
      frame = window.requestAnimationFrame(() => {
        const measured = measuredPrintPageNumbers(audit);
        if (!cancelled && measured) setPrintPageNumbers(measured);
      });
    };
    updatePageNumbers();
    void document.fonts?.ready.then(updatePageNumbers);
    window.addEventListener('resize', updatePageNumbers);
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', updatePageNumbers);
    };
  }, [audit]);

  return (
    <>
      <div className="print-toolbar" role="region" aria-label={tr(language, 'PDF actions', 'Acciones PDF')}>
        <div>
          <strong>{tr(language, 'Audit PDF preview', 'Vista previa PDF de auditoría')}</strong>
          <span>{tr(language, 'Use the browser print dialog and choose Save as PDF.', 'Usa el diálogo de impresión del navegador y elige Guardar como PDF.')}</span>
        </div>
        <button type="button" onClick={() => window.print()}>
          <span aria-hidden="true">▤</span>
          {tr(language, 'Print / Save as PDF', 'Imprimir / Guardar como PDF')}
        </button>
      </div>

      <main className="report-page audit-print-report">
        <header className="print-cover audit-print-cover">
          <div className="print-brand">
            <img src="/icon/48.png" alt="" />
            <div>
              <strong>FocusTrace</strong>
              <span>{tr(language, 'Runtime accessibility debugger', 'Depurador de accesibilidad runtime')}</span>
            </div>
            <small>v{version}</small>
          </div>

          <div className="print-title-block">
            <p>{tr(language, 'Accessibility audit', 'Auditoría de accesibilidad')}</p>
            <h1>{audit.name}</h1>
            <span className="audit-print-sites">{audit.sites.join(' · ')}</span>
          </div>

          <div className="print-context">
            <span><strong>{tr(language, 'Standard', 'Estándar')}</strong>WCAG 2.2</span>
            <span><strong>{tr(language, 'Pages reviewed', 'Páginas revisadas')}</strong>{summary.pages}</span>
            <span><strong>{tr(language, 'Created', 'Creada')}</strong>{formatDateTime(audit.createdAt, language)}</span>
            <span><strong>{tr(language, 'Last update', 'Última actualización')}</strong>{formatDateTime(audit.updatedAt, language)}</span>
          </div>

          <div className="print-summary audit-print-summary">
            <div><strong>{summary.failures}</strong><span>{tr(language, 'Failures', 'Fallos')}</span></div>
            <div><strong>{summary.reviews}</strong><span>{tr(language, 'Reviews', 'Revisiones')}</span></div>
            <div><strong>{summary.warnings}</strong><span>{tr(language, 'Warnings', 'Avisos')}</span></div>
            <div><strong>{summary.pages}</strong><span>{tr(language, 'Pages', 'Páginas')}</span></div>
          </div>

          <p className="audit-print-scope-note">{tr(
            language,
            'This audit contains the latest saved full-page analysis for each URL. Repeated analyses of the same normalized URL replace the previous result instead of creating duplicate sections.',
            'Esta auditoría contiene el último análisis de página completa guardado para cada URL. Los análisis repetidos de la misma URL normalizada sustituyen el resultado anterior en lugar de crear secciones duplicadas.',
          )}</p>
        </header>

        <nav className="audit-print-toc" aria-labelledby="audit-toc-title">
          <div className="print-section-title">
            <span>00</span>
            <div>
              <h2 id="audit-toc-title">{tr(language, 'Audit index', 'Índice de la auditoría')}</h2>
              <p>{tr(
                language,
                'Reviewed pages and the result sections included for each one.',
                'Páginas revisadas y secciones de resultados incluidas en cada una.',
              )}</p>
            </div>
          </div>
          <ol>
            {audit.pages.map((page, index) => {
              const pageNumber = index + 1;
              const sections = [
                {
                  id: 'headings',
                  label: tr(language, 'Headings that need review', 'Encabezados que requieren revisión'),
                  count: (page.scan.headings ?? []).filter((heading) => heading.signals.length > 0).length,
                },
                { id: 'fail', label: tr(language, 'Failures', 'Fallos'), count: page.scan.issues.length },
                { id: 'review', label: tr(language, 'Review', 'Revisiones'), count: page.scan.review.length },
                { id: 'warning', label: tr(language, 'Warnings', 'Avisos'), count: page.scan.warnings?.length ?? 0 },
              ].filter((section) => section.count > 0);
              return (
                <li key={page.key}>
                  <a className="audit-print-toc-page-link" href={`#audit-page-${pageNumber}`}>
                    <span className="audit-print-toc-line">
                      <strong>{pageNumber}. {page.title || tr(language, 'Analyzed page', 'Página analizada')}</strong>
                      <span className="audit-print-toc-leader" aria-hidden="true" />
                      <span
                        className="audit-print-toc-number"
                        aria-label={tr(
                          language,
                          `Page ${printPageNumbers[`audit-page-${pageNumber}`] ?? pageNumber + 2}`,
                          `Página ${printPageNumbers[`audit-page-${pageNumber}`] ?? pageNumber + 2}`,
                        )}
                      >{printPageNumbers[`audit-page-${pageNumber}`] ?? pageNumber + 2}</span>
                    </span>
                    <small>{page.url}</small>
                  </a>
                  {sections.length > 0 && (
                    <ol>
                      {sections.map((section, sectionIndex) => (
                        <li key={section.id}>
                          <a href={`#audit-page-${pageNumber}-${section.id}`}>
                            <span>{pageNumber}.{sectionIndex + 1} {section.label}</span>
                            <span className="audit-print-toc-leader" aria-hidden="true" />
                            <span
                              className="audit-print-toc-number"
                              aria-label={tr(
                                language,
                                `Page ${printPageNumbers[`audit-page-${pageNumber}-${section.id}`] ?? printPageNumbers[`audit-page-${pageNumber}`] ?? pageNumber + 2}`,
                                `Página ${printPageNumbers[`audit-page-${pageNumber}-${section.id}`] ?? printPageNumbers[`audit-page-${pageNumber}`] ?? pageNumber + 2}`,
                              )}
                            >{printPageNumbers[`audit-page-${pageNumber}-${section.id}`] ?? printPageNumbers[`audit-page-${pageNumber}`] ?? pageNumber + 2}</span>
                          </a>
                        </li>
                      ))}
                    </ol>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>

        {audit.pages.map((page, index) => {
          const scan = page.scan;
          const headings = scan.headings ?? [];
          const headingReviews = headings.filter((heading) => heading.signals.length > 0);
          const groups = [
            { id: 'fail', label: tr(language, 'Failures', 'Fallos'), issues: sortBySeverity(scan.issues) },
            { id: 'review', label: tr(language, 'Review', 'Revisión'), issues: sortBySeverity(scan.review) },
            { id: 'warning', label: tr(language, 'Warnings', 'Avisos'), issues: sortBySeverity(scan.warnings ?? []) },
          ];
          const visualMap = new Map(
            page.visualEvidence?.visuals.map((visual) => [visual.selector, visual]) ?? [],
          );
          const visualByIssue = new Map<string, ReportVisualEvidence>();
          const usedVisualSelectors = new Set<string>();
          for (const group of groups) {
            for (const issue of group.issues) {
              const selector = issue.targets.find((target) => visualMap.has(target) && !usedVisualSelectors.has(target));
              if (!selector) continue;
              const visual = visualMap.get(selector);
              if (!visual) continue;
              visualByIssue.set(issue.id, visual);
              usedVisualSelectors.add(selector);
            }
          }
          const visualEvidence = page.visualEvidence;
          return (
            <section className="print-section audit-print-page" key={page.key} aria-labelledby={`audit-page-${index + 1}`}>
              <div className="print-section-title audit-print-page-title">
                <span>{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <h2 id={`audit-page-${index + 1}`}>{page.title || tr(language, 'Analyzed page', 'Página analizada')}</h2>
                  <a href={page.url}>{page.url}</a>
                  <p><strong>{tr(language, 'Review performed', 'Revisión realizada')}:</strong> {formatDateTime(page.reviewedAt, language)}</p>
                </div>
              </div>

              <div className="print-inline-metrics audit-print-page-metrics">
                <span><strong>{scan.issues.length}</strong> {tr(language, 'failures', 'fallos')}</span>
                <span><strong>{scan.review.length}</strong> {tr(language, 'reviews', 'revisiones')}</span>
                <span><strong>{scan.warnings?.length ?? 0}</strong> {tr(language, 'warnings', 'avisos')}</span>
                <span><strong>{headings.length}</strong> {tr(language, 'headings', 'encabezados')}</span>
              </div>

              {visualEvidence && visualEvidence.eligibleCount > 0 && visualEvidence.visuals.length > 0 && (
                <p className="print-visual-summary">
                  {tr(language, 'Visual evidence', 'Evidencia visual')}: {visualEvidence.visuals.length} {tr(language, 'saved crops', 'recortes guardados')}
                  {visualEvidence.limitReached ? ` · ${tr(language, 'per-page capture limit reached', 'límite de capturas por página alcanzado')}` : ''}
                  {visualEvidence.storageTrimmed ? ` · ${tr(language, 'older crops trimmed to protect local storage', 'recortes antiguos limitados para proteger el almacenamiento local')}` : ''}
                </p>
              )}

              {headingReviews.length > 0 && (
                <div className="audit-print-headings" id={`audit-page-${index + 1}-headings`}>
                  <h3>{tr(language, 'Headings that need review', 'Encabezados que requieren revisión')}</h3>
                  <ol className="print-heading-list">
                    {headingReviews.map((heading) => (
                      <li className="has-signal" key={heading.id}>
                        <span>H{heading.level}</span>
                        <strong>{heading.text || tr(language, 'Empty heading', 'Encabezado vacío')}</strong>
                        <small>{heading.signals.map((signal) => headingSignalLabel(signal, language)).join(' · ')}</small>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {groups.map((group) => (
                <div className="print-finding-group" id={`audit-page-${index + 1}-${group.id}`} key={group.id}>
                  <h3>{group.label} <span>{group.issues.length}</span></h3>
                  {group.issues.length
                    ? group.issues.map((issue) => (
                        <Finding
                          key={issue.id}
                          issue={issue}
                          language={language}
                          visual={visualByIssue.get(issue.id)}
                        />
                      ))
                    : <p className="print-empty">{tr(language, 'No findings in this group.', 'No hay hallazgos en este grupo.')}</p>}
                </div>
              ))}
            </section>
          );
        })}

        <footer className="print-footer">
          <p>{tr(
            language,
            'FocusTrace automated evidence supports accessibility review but does not constitute a complete WCAG conformance certificate. Manual review remains necessary.',
            'La evidencia automática de FocusTrace sirve de apoyo a la revisión de accesibilidad, pero no constituye un certificado completo de conformidad WCAG. Sigue siendo necesaria la revisión manual.',
          )}</p>
          <div><span>FocusTrace v{version}</span><span>{generatedLabel}</span></div>
        </footer>
      </main>
    </>
  );
}

function App() {
  const [audit, setAudit] = useState<AccessibilityAudit>();
  const [error, setError] = useState<string>();
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const language: AppLanguage = params.get('language') === 'es' ? 'es' : 'en';

  useEffect(() => {
    document.documentElement.lang = language;
    const token = params.get('evidence');
    if (!token) {
      setError(tr(language, 'The audit evidence is not available.', 'La evidencia de auditoría no está disponible.'));
      return;
    }
    void readAuditPrintEvidence(token).then((evidence) => {
      if (!evidence?.audit.pages.length) {
        setError(tr(language, 'The audit has no analyzed pages.', 'La auditoría no contiene páginas analizadas.'));
        return;
      }
      setAudit(evidence.audit);
      const date = new Date().toISOString().slice(0, 10);
      document.title = `FocusTrace-${evidence.audit.name}-${date}`;
    }).catch(() => {
      setError(tr(language, 'The audit could not be prepared.', 'No se pudo preparar la auditoría.'));
    });
  }, [language, params]);

  if (error) {
    return <main className="print-error"><img src="/icon/48.png" alt="" /><h1>FocusTrace</h1><p>{error}</p></main>;
  }
  if (!audit) return <main className="print-loading">FocusTrace…</main>;
  return <AuditPrintReport audit={audit} language={language} />;
}

createRoot(document.getElementById('root')!).render(<App />);
