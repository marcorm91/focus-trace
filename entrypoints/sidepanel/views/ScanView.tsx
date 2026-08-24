import { useEffect, useMemo, useState } from 'react';
import { outcomeLabel, type ExplanationLevel } from '../../../lib/runtime/explanations';
import {
  localizedScanIssue,
  localizedSeverity,
  tr,
  type AppLanguage,
} from '../../../shared/i18n';
import type { FindingOutcome, ScanIssue, ScanResult } from '../../../shared/types';
import { Empty, Metric, ReferenceList } from '../components/Common';

type ScanFilter = FindingOutcome;

export function ScanView({
  scan,
  level,
  language,
  onLocate,
}: {
  scan?: ScanResult | undefined;
  level: ExplanationLevel;
  language: AppLanguage;
  onLocate: (selector: string) => void | Promise<void>;
}) {
  const [filter, setFilter] = useState<ScanFilter>('fail');

  const scanWarnings = scan?.warnings ?? [];
  const groups = useMemo(() => ({
    fail: scan?.issues ?? [],
    review: scan?.review ?? [],
    warning: scanWarnings,
  }), [scan?.issues, scan?.review, scanWarnings]);

  useEffect(() => {
    if (!scan) return;
    if (groups[filter].length > 0) return;
    if (groups.fail.length) setFilter('fail');
    else if (groups.review.length) setFilter('review');
    else if (groups.warning.length) setFilter('warning');
  }, [filter, groups, scan]);

  if (!scan) {
    return (
      <Empty
        title={tr(language, 'No scan yet', 'Todavía no hay análisis')}
        text={tr(
          language,
          'Choose Analyze page to run the local FocusTrace WCAG rule engine.',
          'Pulsa Analizar página para ejecutar localmente el motor de reglas WCAG de FocusTrace.',
        )}
      />
    );
  }

  const findings = groups[filter];
  const totalFindings = scan.issues.length + scan.review.length + scanWarnings.length;
  const tabs: Array<{ id: ScanFilter; label: string; count: number }> = [
    { id: 'fail', label: tr(language, 'Failures', 'Fallos'), count: scan.issues.length },
    { id: 'review', label: tr(language, 'Review', 'Revisión'), count: scan.review.length },
    { id: 'warning', label: tr(language, 'Warnings', 'Avisos'), count: scanWarnings.length },
  ];

  return (
    <section className="panel" aria-labelledby="scan-title">
      <div className="section-heading">
        <div>
          <h2 id="scan-title">{tr(language, 'Page scan', 'Análisis de página')}</h2>
          <p title={scan.url}>{scan.title || scan.url}</p>
        </div>
        <strong>
          {tr(
            language,
            `${scan.issues.length} fail · ${scanWarnings.length} warning`,
            `${scan.issues.length} fallo · ${scanWarnings.length} aviso`,
          )}
        </strong>
      </div>

      {level !== 'simple' && (
        <div className="engine-note">
          <strong>{scan.engine}</strong>
          <span>
            {scan.standard} · {scan.rulesRun} {tr(language, 'rule families', 'familias de reglas')}
          </span>
        </div>
      )}

      <div className="metrics">
        <Metric label={tr(language, 'Fail', 'Fallos')} value={scan.issues.length} />
        <Metric label={tr(language, 'Review', 'Revisión')} value={scan.review.length} />
        <Metric label={tr(language, 'Warning', 'Avisos')} value={scanWarnings.length} />
        <Metric label={tr(language, 'Checks passed', 'Comprobaciones superadas')} value={scan.passes} />
      </div>

      {totalFindings === 0 ? (
        <div className="notice">
          <strong>{tr(language, 'No automated findings', 'Sin hallazgos automáticos')}</strong>
          <p>
            {tr(
              language,
              'This does not mean the page conforms to WCAG 2.2. Manual testing is still needed.',
              'Esto no significa que la página cumpla WCAG 2.2. Sigue siendo necesaria una revisión manual.',
            )}
          </p>
        </div>
      ) : (
        <>
          <div className="scan-filter-tabs" role="tablist" aria-label={tr(language, 'Scan result type', 'Tipo de resultado del análisis')}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                id={`scan-tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={filter === tab.id}
                aria-controls={`scan-panel-${tab.id}`}
                className={filter === tab.id ? 'active' : ''}
                onClick={() => setFilter(tab.id)}
              >
                <span>{tab.label}</span>
                <strong>{tab.count}</strong>
              </button>
            ))}
          </div>

          <div
            id={`scan-panel-${filter}`}
            role="tabpanel"
            aria-labelledby={`scan-tab-${filter}`}
            className="scan-results-panel"
          >
            {findings.length === 0 ? (
              <div className="scan-filter-empty">
                {tr(language, 'No findings in this category.', 'No hay resultados en esta categoría.')}
              </div>
            ) : (
              <div className="issue-list">
                {findings.map((issue) => (
                  <FindingCard
                    issue={issue}
                    level={level}
                    language={language}
                    onLocate={onLocate}
                    key={issue.id}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}

function FindingCard({
  issue,
  level,
  language,
  onLocate,
}: {
  issue: ScanIssue;
  level: ExplanationLevel;
  language: AppLanguage;
  onLocate: (selector: string) => void | Promise<void>;
}) {
  const copy = localizedScanIssue(issue, language);
  const target = issue.targets[0];

  return (
    <article className="issue scan-issue">
      <div className="finding-meta">
        <span className={`outcome ${issue.outcome}`}>{outcomeLabel(issue.outcome, level, language)}</span>
        {level !== 'simple' && <span className={`severity ${issue.severity}`}>{localizedSeverity(issue.severity, language)}</span>}
        {level !== 'simple' && <code>{issue.ruleId}</code>}
      </div>
      <h3>{copy.title}</h3>
      <p>{copy.description}</p>
      {level !== 'simple' && copy.evidence && (
        <p className="evidence">
          <strong>{tr(language, 'Evidence:', 'Evidencia:')}</strong> {copy.evidence}
        </p>
      )}
      {level === 'developer' && <code>{target ?? tr(language, 'No target', 'Sin destino')}</code>}
      {level !== 'simple' && <ReferenceList references={issue.references} language={language} />}
      {target && (
        <button className="locate-finding" type="button" onClick={() => void onLocate(target)}>
          <span aria-hidden="true">⌖</span>
          {tr(language, 'Locate on page', 'Localizar en la página')}
        </button>
      )}
    </article>
  );
}
