import { useEffect, useMemo, useState } from 'react';
import { useRovingTabs } from '../../../lib/ui/roving-tabs';
import { localizedScanIssue, localizedSeverity, tr, type AppLanguage } from '../../../shared/i18n';
import type { FindingOutcome, ScanIssue, ScanResult } from '../../../shared/types';

type ReportFilter = FindingOutcome;

type ReportGroup = {
  id: ReportFilter;
  label: string;
  findings: ScanIssue[];
};

type LocateHandler = (selector: string) => void | Promise<void>;

function groupedByRule(findings: ScanIssue[]): ScanIssue[][] {
  const groups = new Map<string, ScanIssue[]>();
  for (const issue of findings) {
    const existing = groups.get(issue.ruleId);
    if (existing) existing.push(issue);
    else groups.set(issue.ruleId, [issue]);
  }
  return [...groups.values()];
}

function outcomeLabel(outcome: FindingOutcome, language: AppLanguage): string {
  if (outcome === 'fail') return tr(language, 'Failures', 'Fallos');
  if (outcome === 'review') return tr(language, 'Review', 'Revisión');
  return tr(language, 'Warnings', 'Avisos');
}

function ReportRuleAccordion({
  issues,
  language,
  onLocate,
}: {
  issues: ScanIssue[];
  language: AppLanguage;
  onLocate?: LocateHandler | undefined;
}) {
  const [index, setIndex] = useState(0);
  const first = issues[0]!;
  const issue = issues[Math.min(index, issues.length - 1)]!;
  const copy = localizedScanIssue(issue, language);
  const target = issue.targets[0];

  useEffect(() => {
    if (index < issues.length) return;
    setIndex(Math.max(0, issues.length - 1));
  }, [index, issues.length]);

  const moveTo = (next: number) => {
    const bounded = Math.max(0, Math.min(issues.length - 1, next));
    setIndex(bounded);
    const nextTarget = issues[bounded]?.targets[0];
    if (nextTarget && onLocate) void onLocate(nextTarget);
  };

  return (
    <details className={`report-rule-group outcome-${first.outcome} severity-${first.severity}`}>
      <summary>
        <span className={`severity-badge severity-${first.severity}`}>
          {localizedSeverity(first.severity, language)}
        </span>
        <span className="report-rule-title">
          <strong>{localizedScanIssue(first, language).title}</strong>
          <small>{first.ruleId}</small>
        </span>
        <span className="report-rule-count" aria-label={tr(language, `${issues.length} affected elements`, `${issues.length} elementos afectados`)}>{issues.length}</span>
        <span className="report-rule-chevron" aria-hidden="true" />
      </summary>

      <div className="report-rule-body">
        {issues.length > 1 && (
          <div className="report-rule-pager" aria-label={tr(language, 'Affected element navigation', 'Navegación entre elementos afectados')}>
            <button
              type="button"
              disabled={index === 0}
              aria-label={tr(language, 'Previous affected element', 'Elemento afectado anterior')}
              onClick={() => moveTo(index - 1)}
            />
            <strong>{index + 1} {tr(language, 'of', 'de')} {issues.length}</strong>
            <button
              type="button"
              disabled={index >= issues.length - 1}
              aria-label={tr(language, 'Next affected element', 'Siguiente elemento afectado')}
              onClick={() => moveTo(index + 1)}
            />
          </div>
        )}

        <p className="report-rule-description">{copy.description}</p>
        {copy.evidence && <p className="report-rule-evidence">{copy.evidence}</p>}

        {target && (
          <div className="report-rule-target">
            <code title={target}>{target}</code>
            {onLocate && (
              <button type="button" onClick={() => void onLocate(target)}>
                {tr(language, 'Review on page', 'Revisar en la página')}
              </button>
            )}
          </div>
        )}
      </div>
    </details>
  );
}

export function ReportScanCompact({
  scan,
  language,
  onLocate,
}: {
  scan: ScanResult;
  language: AppLanguage;
  onLocate?: LocateHandler | undefined;
}) {
  const [filter, setFilter] = useState<ReportFilter>('fail');

  const groups = useMemo<ReportGroup[]>(() => [
    { id: 'fail', label: outcomeLabel('fail', language), findings: scan.issues },
    { id: 'review', label: outcomeLabel('review', language), findings: scan.review },
    { id: 'warning', label: outcomeLabel('warning', language), findings: scan.warnings ?? [] },
  ], [language, scan]);
  const reportTabProps = useRovingTabs({
    options: groups.map((group) => ({ id: group.id, disabled: group.findings.length === 0 })),
    selected: filter,
    onSelect: setFilter,
  });

  useEffect(() => {
    const selected = groups.find((group) => group.id === filter);
    if (selected?.findings.length) return;
    const fallback = groups.find((group) => group.findings.length > 0);
    if (fallback) setFilter(fallback.id);
  }, [filter, groups]);

  const active = groups.find((group) => group.id === filter) ?? groups[0]!;
  const ruleGroups = groupedByRule(active.findings);

  return (
    <div className="report-compact-scan">
      <div className="report-compact-tabs" role="tablist" aria-label={tr(language, 'Report finding type', 'Tipo de hallazgo del informe')}>
        {groups.map((group) => (
          <button
            key={group.id}
            id={`report-compact-tab-${group.id}`}
            type="button"
            role="tab"
            aria-selected={filter === group.id}
            aria-controls={`report-compact-panel-${group.id}`}
            className={filter === group.id ? 'active' : ''}
            disabled={group.findings.length === 0}
            {...reportTabProps(group.id)}
            onClick={() => setFilter(group.id)}
          >
            <span>{group.label}</span>
            <strong>{group.findings.length}</strong>
          </button>
        ))}
      </div>

      {groups.map((group) => (
        <div
          key={`panel-${group.id}`}
          id={`report-compact-panel-${group.id}`}
          role="tabpanel"
          aria-labelledby={`report-compact-tab-${group.id}`}
          hidden={filter !== group.id}
        >
          {filter === group.id && (
            ruleGroups.length ? (
              <div className="report-rule-list">
                {ruleGroups.map((issues) => (
                  <ReportRuleAccordion
                    key={issues[0]!.ruleId}
                    issues={issues}
                    language={language}
                    onLocate={onLocate}
                  />
                ))}
              </div>
            ) : (
              <p className="report-empty-line">{tr(language, 'No findings in this group.', 'No hay hallazgos en este grupo.')}</p>
            )
          )}
        </div>
      ))}
    </div>
  );
}
