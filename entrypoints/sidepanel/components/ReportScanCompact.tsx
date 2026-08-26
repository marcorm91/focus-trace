import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { browser } from '#imports';
import { locateScanTargetInPage } from '../../../lib/runtime/scan-target-overlay';
import { localizedScanIssue, tr, type AppLanguage } from '../../../shared/i18n';
import type { ExtensionMessage, FindingOutcome, ScanIssue, ScanResult, SessionState } from '../../../shared/types';

const PAGE_ACCESS_ORIGINS = ['http://*/*', 'https://*/*'];

type ReportFilter = FindingOutcome;

type ReportGroup = {
  id: ReportFilter;
  label: string;
  findings: ScanIssue[];
};

function languageFromDocument(): AppLanguage {
  return document.documentElement.lang === 'es' ? 'es' : 'en';
}

function useAppLanguage(): AppLanguage {
  const [language, setLanguage] = useState<AppLanguage>(languageFromDocument);

  useEffect(() => {
    const sync = () => setLanguage(languageFromDocument());
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    window.requestAnimationFrame(sync);
    return () => observer.disconnect();
  }, []);

  return language;
}

function useActiveScan(): ScanResult | undefined {
  const [activeTabId, setActiveTabId] = useState<number>();
  const [scan, setScan] = useState<ScanResult>();

  useEffect(() => {
    let cancelled = false;

    const load = async (tabId?: number) => {
      let resolvedTabId = tabId;
      if (resolvedTabId == null) {
        const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
        resolvedTabId = tab?.id;
      }
      if (resolvedTabId == null || cancelled) return;
      const state = (await browser.runtime.sendMessage({
        type: 'FOCUSTRACE_GET_SESSION',
        tabId: resolvedTabId,
      } satisfies ExtensionMessage)) as SessionState;
      if (cancelled) return;
      setActiveTabId(resolvedTabId);
      setScan(state.scan);
    };

    const activated = ({ tabId }: { tabId: number }) => {
      setActiveTabId(tabId);
      void load(tabId).catch(() => setScan(undefined));
    };
    const updated = (message: ExtensionMessage) => {
      if (message.type !== 'FOCUSTRACE_SESSION_UPDATED') return;
      if (activeTabId != null && message.state.tabId !== activeTabId) return;
      setScan(message.state.scan);
    };

    void load().catch(() => setScan(undefined));
    browser.tabs.onActivated.addListener(activated);
    browser.runtime.onMessage.addListener(updated);
    return () => {
      cancelled = true;
      browser.tabs.onActivated.removeListener(activated);
      browser.runtime.onMessage.removeListener(updated);
    };
  }, [activeTabId]);

  return scan;
}

function useReportHost(): Element | null {
  const [host, setHost] = useState<Element | null>(null);

  useEffect(() => {
    const sync = () => {
      const title = document.getElementById('report-analysis-title');
      const section = title?.closest('.report-section');
      if (!section) {
        setHost(null);
        return;
      }

      let target = section.querySelector('[data-focustrace-report-scan-host]');
      if (!target) {
        target = document.createElement('div');
        target.setAttribute('data-focustrace-report-scan-host', 'true');
        const firstLegacyGroup = section.querySelector('.report-group');
        section.insertBefore(target, firstLegacyGroup ?? null);
      }
      setHost(target);
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.getElementById('root') ?? document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return host;
}

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

async function locateReportTarget(selector: string): Promise<void> {
  const permission = await browser.permissions.request({ origins: PAGE_ACCESS_ORIGINS }).catch(() => false);
  if (!permission) return;
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (tab?.id == null || !tab.url || !/^https?:/i.test(tab.url)) return;
  await browser.scripting.executeScript({
    target: { tabId: tab.id },
    func: locateScanTargetInPage,
    args: [selector, { tone: 'inspect', label: 'FocusTrace', focusTarget: false }],
  });
}

function ReportRuleAccordion({
  issues,
  language,
  defaultOpen,
}: {
  issues: ScanIssue[];
  language: AppLanguage;
  defaultOpen: boolean;
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
    if (nextTarget) void locateReportTarget(nextTarget);
  };

  return (
    <details className={`report-rule-group outcome-${first.outcome}`} open={defaultOpen ? true : undefined}>
      <summary>
        <span className={`report-rule-outcome ${first.outcome}`}>{outcomeLabel(first.outcome, language)}</span>
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
            <button type="button" onClick={() => void locateReportTarget(target)}>
              {tr(language, 'Review on page', 'Revisar en la página')}
            </button>
          </div>
        )}
      </div>
    </details>
  );
}

export function ReportScanCompact() {
  const language = useAppLanguage();
  const scan = useActiveScan();
  const host = useReportHost();
  const [filter, setFilter] = useState<ReportFilter>('fail');

  const groups = useMemo<ReportGroup[]>(() => scan ? [
    { id: 'fail', label: outcomeLabel('fail', language), findings: scan.issues },
    { id: 'review', label: outcomeLabel('review', language), findings: scan.review },
    { id: 'warning', label: outcomeLabel('warning', language), findings: scan.warnings ?? [] },
  ] : [], [language, scan]);

  useEffect(() => {
    if (!scan) return;
    const selected = groups.find((group) => group.id === filter);
    if (selected?.findings.length) return;
    const fallback = groups.find((group) => group.findings.length > 0);
    if (fallback) setFilter(fallback.id);
  }, [filter, groups, scan]);

  if (!host || !scan) return null;

  const active = groups.find((group) => group.id === filter) ?? groups[0]!;
  const ruleGroups = groupedByRule(active.findings);

  return createPortal(
    <div className="report-compact-scan">
      <div className="report-compact-tabs" role="tablist" aria-label={tr(language, 'Report finding type', 'Tipo de hallazgo del informe')}>
        {groups.map((group) => (
          <button
            key={group.id}
            type="button"
            role="tab"
            aria-selected={filter === group.id}
            className={filter === group.id ? 'active' : ''}
            onClick={() => setFilter(group.id)}
          >
            <span>{group.label}</span>
            <strong>{group.findings.length}</strong>
          </button>
        ))}
      </div>

      {ruleGroups.length ? (
        <div className="report-rule-list">
          {ruleGroups.map((issues, index) => (
            <ReportRuleAccordion
              key={issues[0]!.ruleId}
              issues={issues}
              language={language}
              defaultOpen={index === 0}
            />
          ))}
        </div>
      ) : (
        <p className="report-empty-line">{tr(language, 'No findings in this group.', 'No hay hallazgos en este grupo.')}</p>
      )}
    </div>,
    host,
  );
}
