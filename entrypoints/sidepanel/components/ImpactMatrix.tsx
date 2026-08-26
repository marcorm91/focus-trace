import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { browser } from '#imports';
import { localizedSeverity, tr, type AppLanguage } from '../../../shared/i18n';
import { countBySeverity } from '../../../shared/severity';
import type { ExtensionMessage, FindingOutcome, ScanIssue, ScanResult, SessionState, Severity } from '../../../shared/types';
import './impact-matrix.css';

const DISPLAY_SEVERITIES: Severity[] = ['critical', 'serious', 'moderate', 'minor'];

type MatrixRow = {
  outcome: FindingOutcome;
  label: string;
  findings: ScanIssue[];
};

function outcomeLabel(outcome: FindingOutcome, language: AppLanguage): string {
  if (outcome === 'fail') return tr(language, 'Failures', 'Fallos');
  if (outcome === 'review') return tr(language, 'Review', 'Revisión');
  return tr(language, 'Warnings', 'Avisos');
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

function useMatrixHost(): Element | null {
  const [host, setHost] = useState<Element | null>(null);

  useEffect(() => {
    const sync = () => {
      const panel = document.querySelector('section.panel[aria-labelledby="scan-title"]');
      if (!panel) {
        setHost(null);
        return;
      }

      let target = panel.querySelector('[data-focustrace-impact-matrix-host]');
      if (!target) {
        target = document.createElement('div');
        target.setAttribute('data-focustrace-impact-matrix-host', 'true');
        const anchor = panel.querySelector('.severity-impact-summary, .notice, .scan-results-note, .scan-category-filter');
        panel.insertBefore(target, anchor ?? null);
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

export function ImpactMatrix({ language }: { language: AppLanguage }) {
  const scan = useActiveScan();
  const host = useMatrixHost();

  const rows = useMemo<MatrixRow[]>(() => scan ? [
    { outcome: 'fail', label: outcomeLabel('fail', language), findings: scan.issues },
    { outcome: 'review', label: outcomeLabel('review', language), findings: scan.review },
    { outcome: 'warning', label: outcomeLabel('warning', language), findings: scan.warnings ?? [] },
  ] : [], [language, scan]);

  const total = rows.reduce((sum, row) => sum + row.findings.length, 0);
  if (!host || total === 0) return null;

  return createPortal(
    <section className="impact-matrix" aria-labelledby="impact-matrix-title">
      <div className="impact-matrix-heading">
        <div>
          <strong id="impact-matrix-title">{tr(language, 'Impact by result', 'Impacto por resultado')}</strong>
          <small>{tr(
            language,
            'Outcome says what FocusTrace concluded; impact says how important the issue may be. Every finding appears in exactly one cell.',
            'El resultado indica qué concluyó FocusTrace; el impacto indica la importancia potencial. Cada hallazgo aparece en una única celda.',
          )}</small>
        </div>
        <span>{total} {tr(language, 'findings', 'hallazgos')}</span>
      </div>

      <div className="impact-matrix-scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">{tr(language, 'Result', 'Resultado')}</th>
              {DISPLAY_SEVERITIES.map((severity) => (
                <th scope="col" className={`severity-${severity}`} key={severity}>
                  {localizedSeverity(severity, language)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const counts = countBySeverity(row.findings);
              return (
                <tr className={`outcome-${row.outcome}`} key={row.outcome}>
                  <th scope="row">
                    <span>{row.label}</span>
                    <strong>{row.findings.length}</strong>
                  </th>
                  {DISPLAY_SEVERITIES.map((severity) => (
                    <td
                      className={`${counts[severity] ? 'has-findings' : 'is-empty'} severity-${severity}`}
                      title={tr(
                        language,
                        `${row.label}: ${counts[severity]} ${localizedSeverity(severity, language)} impact`,
                        `${row.label}: ${counts[severity]} de impacto ${localizedSeverity(severity, language)}`,
                      )}
                      key={severity}
                    >
                      {counts[severity]}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p>{tr(
        language,
        'Example: a skipped heading level is a Review with Minor impact, so it is counted under Review · Minor rather than disappearing from a failure-only counter.',
        'Ejemplo: un salto de nivel de encabezado es una Revisión de impacto Leve, por lo que se cuenta en Revisión · Leve y no desaparece de un contador limitado a fallos.',
      )}</p>
    </section>,
    host,
  );
}
