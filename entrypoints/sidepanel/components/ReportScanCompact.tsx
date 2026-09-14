import { useEffect, useMemo, useState } from 'react';
import { browser } from '#imports';
import {
  applyFindingRecheck,
  evaluateFindingRecheck,
  findingNodeSignature,
  type FindingRecheckAttempt,
  type FindingRecheckState,
  type RecheckableScanIssue,
} from '../../../lib/audit/finding-recheck';
import { updateStoredMultipageAuditScan } from '../../../lib/audit/multipage-audit-storage';
import { resolveFindingTargetInPage } from '../../../lib/runtime/finding-recheck-page';
import { useRovingTabs } from '../../../lib/ui/roving-tabs';
import { localizedScanIssue, localizedSeverity, tr, type AppLanguage } from '../../../shared/i18n';
import type {
  ExtensionMessage,
  FindingOutcome,
  ScanIssue,
  ScanResult,
} from '../../../shared/types';
import { ReferenceList } from './Common';

type ReportFilter = FindingOutcome;

type ReportGroup = {
  id: ReportFilter;
  label: string;
  findings: ScanIssue[];
};

type LocateHandler = (selector: string) => void | Promise<void>;

type RecheckLiveState = {
  attempt?: FindingRecheckAttempt;
  error?: string;
};

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

function recheckStateLabel(state: FindingRecheckState, language: AppLanguage): string {
  if (state === 'resolved') return tr(language, 'Resolved', 'Resuelto');
  if (state === 'persistent') return tr(language, 'Still present', 'Sigue presente');
  if (state === 'changed') return tr(language, 'Changed', 'Ha cambiado');
  if (state === 'missing') return tr(language, 'Target missing', 'Elemento ausente');
  return tr(language, 'Inconclusive', 'No concluyente');
}

function formatRecheckTime(timestamp: number, language: AppLanguage): string {
  return new Intl.DateTimeFormat(language === 'es' ? 'es-ES' : 'en-GB', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(timestamp);
}

function sameDocumentUrl(left: string, right: string): boolean {
  try {
    const normalize = (value: string) => {
      const url = new URL(value);
      if (!/^#!?\//.test(url.hash)) url.hash = '';
      return url.href;
    };
    return normalize(left) === normalize(right);
  } catch {
    return left === right;
  }
}

function ReportRuleAccordion({
  issues,
  language,
  onLocate,
  recheckingFindingId,
  liveRechecks,
  onRecheck,
}: {
  issues: ScanIssue[];
  language: AppLanguage;
  onLocate?: LocateHandler | undefined;
  recheckingFindingId?: string | undefined;
  liveRechecks: Record<string, RecheckLiveState>;
  onRecheck?: ((issue: ScanIssue) => void | Promise<void>) | undefined;
}) {
  const [index, setIndex] = useState(0);
  const first = issues[0]!;
  const issue = issues[Math.min(index, issues.length - 1)]!;
  const copy = localizedScanIssue(issue, language);
  const target = issue.targets[0];
  const storedRecheck = (issue as RecheckableScanIssue).recheck?.latest;
  const live = liveRechecks[issue.id];
  const latestRecheck = live?.attempt ?? storedRecheck;
  const rechecking = recheckingFindingId === issue.id;

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
        {first.references.length > 0 && (
          <ReferenceList references={first.references} language={language} />
        )}
        {copy.evidence && <p className="report-rule-evidence">{copy.evidence}</p>}

        {issue.auditorNote && (
          <div className="report-auditor-note">
            <strong>{tr(language, 'Auditor note', 'Nota del auditor')}</strong>
            <p>{issue.auditorNote.text}</p>
          </div>
        )}

        {target && (
          <div className="report-rule-target">
            <code title={target}>{target}</code>
            <div className="report-rule-target-actions">
              {onLocate && (
                <button type="button" onClick={() => void onLocate(target)}>
                  {tr(language, 'Review on page', 'Revisar en la página')}
                </button>
              )}
              {onRecheck && (
                <button
                  type="button"
                  disabled={rechecking}
                  aria-describedby={latestRecheck || live?.error ? `recheck-status-${issue.id}` : undefined}
                  onClick={() => void onRecheck(issue)}
                >
                  {rechecking
                    ? tr(language, 'Rechecking…', 'Recomprobando…')
                    : tr(language, 'Recheck finding', 'Recomprobar hallazgo')}
                </button>
              )}
            </div>
          </div>
        )}

        {(latestRecheck || live?.error) && (
          <div
            id={`recheck-status-${issue.id}`}
            className={`finding-recheck-status${latestRecheck ? ` state-${latestRecheck.state}` : ' state-inconclusive'}`}
            role="status"
            aria-live="polite"
          >
            {latestRecheck ? (
              <>
                <div className="finding-recheck-heading">
                  <strong>{recheckStateLabel(latestRecheck.state, language)}</strong>
                  <time dateTime={new Date(latestRecheck.checkedAt).toISOString()}>
                    {formatRecheckTime(latestRecheck.checkedAt, language)}
                  </time>
                </div>
                <p>{latestRecheck.reason}</p>
                {latestRecheck.current?.evidence
                  && latestRecheck.current.evidence !== latestRecheck.original.evidence && (
                    <details className="finding-recheck-evidence">
                      <summary>{tr(language, 'Current evidence', 'Evidencia actual')}</summary>
                      <p>{latestRecheck.current.evidence}</p>
                    </details>
                  )}
                <small>{tr(
                  language,
                  'The original finding remains unchanged in this report; Recheck stores the latest observation separately.',
                  'El hallazgo original permanece sin cambios en este informe; Recomprobar guarda la última observación por separado.',
                )}</small>
              </>
            ) : (
              <p>{live?.error}</p>
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
  const [recheckingFindingId, setRecheckingFindingId] = useState<string>();
  const [liveRechecks, setLiveRechecks] = useState<Record<string, RecheckLiveState>>({});

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

  const recheckFinding = async (issue: ScanIssue) => {
    if (!onLocate || recheckingFindingId) return;
    setRecheckingFindingId(issue.id);
    setLiveRechecks((current) => ({ ...current, [issue.id]: {} }));

    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (tab?.id == null || !tab.url || !sameDocumentUrl(tab.url, scan.url)) {
        throw new Error(tr(
          language,
          'Open the page from this report before rechecking the finding.',
          'Abre la página de este informe antes de recomprobar el hallazgo.',
        ));
      }

      const signature = (issue as RecheckableScanIssue).recheck?.signature
        ?? findingNodeSignature(issue);
      if (!signature.locator) {
        throw new Error(tr(
          language,
          'This finding has no stable element locator and cannot be rechecked safely.',
          'Este hallazgo no tiene un localizador estable y no se puede recomprobar de forma segura.',
        ));
      }

      await browser.runtime.sendMessage({
        type: 'FOCUSTRACE_ENSURE_INJECTED',
        tabId: tab.id,
        mode: 'scan',
      } satisfies ExtensionMessage);

      const resolved = await browser.scripting.executeScript({
        target: { tabId: tab.id },
        func: resolveFindingTargetInPage,
        args: [signature],
      });
      const resolution = resolved[0]?.result;
      if (!resolution) throw new Error('FocusTrace could not resolve the finding target.');

      const currentScan = (await browser.tabs.sendMessage(tab.id, {
        type: 'FOCUSTRACE_RUN_SCAN',
        ...(scan.scope?.type === 'component' ? { scope: scan.scope } : {}),
      } satisfies ExtensionMessage)) as ScanResult;

      const latest = evaluateFindingRecheck(issue, currentScan, resolution);
      const nextScan = applyFindingRecheck(scan, issue.id, signature, latest);
      await browser.runtime.sendMessage({
        type: 'FOCUSTRACE_SAVE_SCAN',
        tabId: tab.id,
        scan: nextScan,
        memoryEvidence: [],
      } satisfies ExtensionMessage);
      await updateStoredMultipageAuditScan(nextScan).catch(() => false);

      setLiveRechecks((current) => ({
        ...current,
        [issue.id]: { attempt: latest },
      }));
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : String(reason);
      setLiveRechecks((current) => ({
        ...current,
        [issue.id]: { error: message },
      }));
    } finally {
      setRecheckingFindingId(undefined);
    }
  };

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
                    recheckingFindingId={recheckingFindingId}
                    liveRechecks={liveRechecks}
                    onRecheck={onLocate ? recheckFinding : undefined}
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
