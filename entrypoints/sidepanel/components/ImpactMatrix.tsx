import { useMemo } from 'react';
import { localizedSeverity, tr, type AppLanguage } from '../../../shared/i18n';
import { countByOutcomeAndSeverity } from '../../../shared/severity';
import type { FindingOutcome, ScanIssue, ScanResult, Severity } from '../../../shared/types';
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

export function ImpactMatrix({ scan, language }: { scan: ScanResult; language: AppLanguage }) {
  const rows = useMemo<MatrixRow[]>(() => [
    { outcome: 'fail', label: outcomeLabel('fail', language), findings: scan.issues },
    { outcome: 'review', label: outcomeLabel('review', language), findings: scan.review },
    { outcome: 'warning', label: outcomeLabel('warning', language), findings: scan.warnings ?? [] },
  ], [language, scan]);
  const allFindings = useMemo(() => rows.flatMap((row) => row.findings), [rows]);
  const matrix = useMemo(() => countByOutcomeAndSeverity(allFindings), [allFindings]);
  const total = allFindings.length;

  if (total === 0) return null;

  return (
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
              <th scope="col" aria-label={tr(language, 'Result', 'Resultado')} />
              {DISPLAY_SEVERITIES.map((severity) => (
                <th scope="col" className={`severity-${severity}`} key={severity}>
                  {localizedSeverity(severity, language)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.outcome}>
                <th scope="row">
                  <span>{row.label}</span>
                  <strong>{row.findings.length}</strong>
                </th>
                {DISPLAY_SEVERITIES.map((severity) => {
                  const count = matrix[row.outcome][severity];
                  return (
                    <td
                      className={count ? 'has-findings' : 'is-empty'}
                      title={tr(
                        language,
                        `${row.label}: ${count} ${localizedSeverity(severity, language)} impact`,
                        `${row.label}: ${count} de impacto ${localizedSeverity(severity, language)}`,
                      )}
                      key={severity}
                    >
                      {count}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p>{tr(
        language,
        'Example: a skipped heading level is a Review with Minor impact, so it is counted under Review · Minor rather than disappearing from a failure-only counter.',
        'Ejemplo: un salto de nivel de encabezado es una Revisión de impacto Leve, por lo que se cuenta en Revisión · Leve y no desaparece de un contador limitado a fallos.',
      )}</p>
    </section>
  );
}
