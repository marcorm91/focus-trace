import { useEffect, useMemo, useState } from 'react';
import { colorToHex, colorToRgb, parseCssColor, suggestAccessibleForeground } from '../../../lib/audit/contrast';
import { reportFindingDescription } from '../../../lib/report/finding-guidance';
import { outcomeLabel, type ExplanationLevel } from '../../../lib/runtime/explanations';
import { scanCategoryForIssue, type ScanCategory } from '../../../shared/scan-categories';
import { countBySeverity, SEVERITY_ORDER, sortBySeverity, type SeverityFilter } from '../../../shared/severity';
import {
  localizedScanIssue,
  localizedSeverity,
  tr,
  type AppLanguage,
} from '../../../shared/i18n';
import type { FindingOutcome, ScanIssue, ScanResult, Severity } from '../../../shared/types';
import { Empty, ReferenceList } from '../components/Common';
import { FindingGuidance } from '../components/FindingGuidance';
import { ImpactMatrix } from '../components/ImpactMatrix';
import { SiteAuditLauncher } from '../components/SiteAuditLauncher';

type ScanFilter = FindingOutcome;
type ColorFormat = 'hex' | 'rgb';

const CATEGORY_ORDER: ScanCategory[] = ['all', 'contrast', 'names', 'forms', 'structure', 'keyboard', 'aria', 'other'];

function categoryLabel(category: ScanCategory, language: AppLanguage): string {
  if (category === 'all') return tr(language, 'All findings', 'Todos');
  if (category === 'contrast') return tr(language, 'Contrast', 'Contraste');
  if (category === 'names') return tr(language, 'Names & semantics', 'Nombres y semántica');
  if (category === 'forms') return tr(language, 'Forms', 'Formularios');
  if (category === 'structure') return tr(language, 'Structure', 'Estructura');
  if (category === 'keyboard') return tr(language, 'Keyboard', 'Teclado');
  if (category === 'aria') return 'ARIA';
  return tr(language, 'Other', 'Otros');
}

function severityImpactDescription(severity: Severity, language: AppLanguage): string {
  if (severity === 'critical') return tr(
    language,
    'Estimated impact: can prevent access to a key control or task.',
    'Impacto estimado: puede impedir acceder a un control o una tarea clave.',
  );
  if (severity === 'serious') return tr(
    language,
    'Estimated impact: substantial barrier that can make a task significantly harder.',
    'Impacto estimado: barrera importante que puede dificultar de forma considerable una tarea.',
  );
  if (severity === 'moderate') return tr(
    language,
    'Estimated impact: meaningful difficulty that is usually not completely blocking.',
    'Impacto estimado: dificultad relevante que normalmente no bloquea por completo la tarea.',
  );
  if (severity === 'minor') return tr(
    language,
    'Estimated impact: limited or localized accessibility barrier.',
    'Impacto estimado: barrera de accesibilidad limitada o localizada.',
  );
  return tr(language, 'Informational signal.', 'Señal informativa.');
}

function contrastSubjectLabel(issue: ScanIssue, language: AppLanguage): string {
  if (issue.contrast?.kind === 'text' || issue.ruleId === 'FT-WCAG-010') return tr(language, 'Current text', 'Texto actual');
  const subject = issue.contrast?.subject;
  if (subject === 'icon fill') return tr(language, 'Icon fill', 'Relleno del icono');
  if (subject === 'icon stroke') return tr(language, 'Icon stroke', 'Trazo del icono');
  if (subject === 'component fill') return tr(language, 'Component fill', 'Relleno del componente');
  if (subject === 'component border') return tr(language, 'Component border', 'Borde del componente');
  if (subject === 'observed focus outline') return tr(language, 'Focus outline', 'Contorno de foco');
  if (subject === 'observed focus indicator') return tr(language, 'Focus indicator', 'Indicador de foco');
  return tr(language, 'Visual cue', 'Señal visual');
}

function formattedColor(value: string, format: ColorFormat): string {
  const parsed = parseCssColor(value);
  if (!parsed) return value;
  return format === 'hex' ? colorToHex(parsed) : colorToRgb(parsed);
}

async function copyText(value: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Fall through to the legacy copy path for extension environments where
    // the Clipboard API is unavailable despite a direct user gesture.
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand('copy');
    textarea.remove();
    return copied;
  } catch {
    return false;
  }
}

function groupedByCriterion(findings: ScanIssue[]): ScanIssue[][] {
  const groups = new Map<string, ScanIssue[]>();
  for (const issue of findings) {
    const existing = groups.get(issue.ruleId);
    if (existing) existing.push(issue);
    else groups.set(issue.ruleId, [issue]);
  }
  return [...groups.values()];
}

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
  const [category, setCategory] = useState<ScanCategory>('all');
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');

  const scanWarnings = scan?.warnings ?? [];
  const groups = useMemo(() => ({
    fail: sortBySeverity(scan?.issues ?? []),
    review: sortBySeverity(scan?.review ?? []),
    warning: sortBySeverity(scanWarnings),
  }), [scan?.issues, scan?.review, scanWarnings]);

  const allFindings = useMemo(
    () => [...groups.fail, ...groups.review, ...groups.warning],
    [groups],
  );

  const categoryCounts = useMemo(() => {
    const counts = new Map<ScanCategory, number>([['all', allFindings.length]]);
    for (const issue of allFindings) {
      const issueCategory = scanCategoryForIssue(issue);
      counts.set(issueCategory, (counts.get(issueCategory) ?? 0) + 1);
    }
    return counts;
  }, [allFindings]);

  const categoryFilteredGroups = useMemo(() => {
    if (category === 'all') return groups;
    const includesCategory = (issue: ScanIssue) => scanCategoryForIssue(issue) === category;
    return {
      fail: groups.fail.filter(includesCategory),
      review: groups.review.filter(includesCategory),
      warning: groups.warning.filter(includesCategory),
    };
  }, [category, groups]);

  useEffect(() => {
    if (!scan) return;
    if (categoryFilteredGroups[filter].length > 0) return;
    if (categoryFilteredGroups.fail.length) setFilter('fail');
    else if (categoryFilteredGroups.review.length) setFilter('review');
    else if (categoryFilteredGroups.warning.length) setFilter('warning');
  }, [filter, categoryFilteredGroups, scan]);

  useEffect(() => {
    if (category === 'all') return;
    if ((categoryCounts.get(category) ?? 0) > 0) return;
    setCategory('all');
  }, [category, categoryCounts]);

  useEffect(() => {
    if (severityFilter === 'all') return;
    if (categoryFilteredGroups[filter].some((issue) => issue.severity === severityFilter)) return;
    setSeverityFilter('all');
  }, [categoryFilteredGroups, filter, severityFilter]);

  if (!scan) {
    return (
      <>
        <div className="site-audit-entry"><SiteAuditLauncher language={language} /></div>
        <Empty
          title={tr(language, 'No scan yet', 'Todavía no hay análisis')}
          text={tr(
            language,
            'Choose Analyze page to run the local FocusTrace WCAG rule engine.',
            'Pulsa Analizar página para ejecutar localmente el motor de reglas WCAG de FocusTrace.',
          )}
        />
      </>
    );
  }

  const currentOutcomeFindings = categoryFilteredGroups[filter];
  const severityCounts = countBySeverity(currentOutcomeFindings);
  const findings = severityFilter === 'all'
    ? currentOutcomeFindings
    : currentOutcomeFindings.filter((issue) => issue.severity === severityFilter);
  const criterionGroups = groupedByCriterion(findings);
  const totalFindings = allFindings.length;
  const tabs: Array<{ id: ScanFilter; label: string; count: number }> = [
    { id: 'fail', label: tr(language, 'Failures', 'Fallos'), count: categoryFilteredGroups.fail.length },
    { id: 'review', label: tr(language, 'Review', 'Revisión'), count: categoryFilteredGroups.review.length },
    { id: 'warning', label: tr(language, 'Warnings', 'Avisos'), count: categoryFilteredGroups.warning.length },
  ];
  const visibleCategories = CATEGORY_ORDER.filter((candidate) =>
    candidate === 'all' || (categoryCounts.get(candidate) ?? 0) > 0,
  );
  const visibleSeverityFilters = SEVERITY_ORDER.filter((severity) => severityCounts[severity] > 0);

  return (
    <section className="panel" aria-labelledby="scan-title">
      <div className="section-heading">
        <div>
          <h2 id="scan-title">{tr(language, 'Full page scan', 'Barrido completo de página')}</h2>
          <p title={scan.url}>{scan.title || scan.url}</p>
        </div>
        <div className="scan-heading-actions">
          <SiteAuditLauncher language={language} />
        </div>
      </div>

      <ImpactMatrix scan={scan} language={language} />

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
          <div className="scan-category-filter">
            <strong>{tr(language, 'Filter by area', 'Filtrar por área')}</strong>
            <div role="group" aria-label={tr(language, 'Accessibility area', 'Área de accesibilidad')}>
              {visibleCategories.map((candidate) => (
                <button
                  key={candidate}
                  type="button"
                  className={category === candidate ? 'active' : ''}
                  aria-pressed={category === candidate}
                  onClick={() => setCategory(candidate)}
                >
                  <span>{categoryLabel(candidate, language)}</span>
                  <strong>{categoryCounts.get(candidate) ?? 0}</strong>
                </button>
              ))}
            </div>
          </div>

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

          <div className="scan-severity-filter">
            <strong>{tr(language, 'Filter by impact', 'Filtrar por impacto')}</strong>
            <small>{tr(
              language,
              'Impact prioritizes findings inside the selected result type; it does not change whether something is a failure or a review.',
              'El impacto prioriza hallazgos dentro del tipo de resultado seleccionado; no cambia si algo es un fallo o una revisión.',
            )}</small>
            <div role="group" aria-label={tr(language, 'Finding impact', 'Impacto del hallazgo')}>
              <button
                type="button"
                aria-pressed={severityFilter === 'all'}
                onClick={() => setSeverityFilter('all')}
              >
                <span>{tr(language, 'All impacts', 'Todos')}</span>
                <strong>{currentOutcomeFindings.length}</strong>
              </button>
              {visibleSeverityFilters.map((severity) => (
                <button
                  key={severity}
                  type="button"
                  className={`severity-${severity}`}
                  aria-pressed={severityFilter === severity}
                  title={severityImpactDescription(severity, language)}
                  onClick={() => setSeverityFilter(severity)}
                >
                  <span>{localizedSeverity(severity, language)}</span>
                  <strong>{severityCounts[severity]}</strong>
                </button>
              ))}
            </div>
          </div>

          <div
            id={`scan-panel-${filter}`}
            role="tabpanel"
            aria-labelledby={`scan-tab-${filter}`}
            className="scan-results-panel"
          >
            {criterionGroups.length === 0 ? (
              <div className="scan-filter-empty">
                {severityFilter === 'all'
                  ? tr(language, 'No findings in this category.', 'No hay resultados en esta categoría.')
                  : tr(language, 'No findings with this impact level.', 'No hay hallazgos con este nivel de impacto.')}
              </div>
            ) : (
              <div className="scan-rule-list">
                {criterionGroups.map((issues, index) => (
                  <FindingRuleAccordion
                    issues={issues}
                    level={level}
                    language={language}
                    onLocate={onLocate}
                    defaultOpen={index === 0}
                    key={issues[0]!.ruleId}
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

function FindingRuleAccordion({
  issues,
  level,
  language,
  onLocate,
  defaultOpen,
}: {
  issues: ScanIssue[];
  level: ExplanationLevel;
  language: AppLanguage;
  onLocate: (selector: string) => void | Promise<void>;
  defaultOpen: boolean;
}) {
  const [index, setIndex] = useState(0);
  const first = issues[0]!;
  const issue = issues[Math.min(index, issues.length - 1)]!;
  const copy = localizedScanIssue(first, language);

  useEffect(() => {
    if (index < issues.length) return;
    setIndex(Math.max(0, issues.length - 1));
  }, [index, issues.length]);

  return (
    <details className={`scan-rule-group outcome-${first.outcome} severity-${first.severity}`} open={defaultOpen ? true : undefined}>
      <summary>
        <span className="scan-rule-statuses">
          <span className={`scan-rule-outcome ${first.outcome}`}>{outcomeLabel(first.outcome, level, language)}</span>
          <span
            className={`severity-badge severity-${first.severity}`}
            title={severityImpactDescription(first.severity, language)}
          >
            {localizedSeverity(first.severity, language)}
          </span>
        </span>
        <span className="scan-rule-title">
          <strong>{copy.title}</strong>
          <small>{first.ruleId}</small>
        </span>
        <span className="scan-rule-count" aria-label={tr(language, `${issues.length} affected elements`, `${issues.length} elementos afectados`)}>{issues.length}</span>
        <span className="scan-rule-chevron" aria-hidden="true">⌄</span>
      </summary>

      <div className="scan-rule-body">
        {level !== 'simple' && first.references.length > 0 && (
          <ReferenceList references={first.references} language={language} />
        )}

        {issues.length > 1 && (
          <div className="scan-occurrence-pager" aria-label={tr(language, 'Affected element navigation', 'Navegación entre elementos afectados')}>
            <button
              type="button"
              disabled={index === 0}
              aria-label={tr(language, 'Previous affected element', 'Elemento afectado anterior')}
              onClick={() => setIndex((current) => Math.max(0, current - 1))}
            >
              ‹
            </button>
            <strong>{index + 1} {tr(language, 'of', 'de')} {issues.length}</strong>
            <button
              type="button"
              disabled={index >= issues.length - 1}
              aria-label={tr(language, 'Next affected element', 'Siguiente elemento afectado')}
              onClick={() => setIndex((current) => Math.min(issues.length - 1, current + 1))}
            >
              ›
            </button>
          </div>
        )}

        <FindingCard issue={issue} level={level} language={language} onLocate={onLocate} />
      </div>
    </details>
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
  const description = reportFindingDescription(issue, language);
  const target = issue.targets[0];
  const [colorFormat, setColorFormat] = useState<ColorFormat>('hex');
  const [copiedKey, setCopiedKey] = useState<string>();

  const suggestion = useMemo(() => {
    if (issue.outcome !== 'fail') return undefined;
    const contrast = issue.contrast;
    if (!contrast?.foreground || !contrast.background) return undefined;
    return suggestAccessibleForeground(contrast.foreground, contrast.background, contrast.requiredRatio);
  }, [issue]);

  const copyColor = async (value: string, key: string) => {
    const copied = await copyText(value);
    if (!copied) return;
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey((current) => current === key ? undefined : current), 1200);
  };

  return (
    <article className="scan-occurrence">
      <p className="scan-occurrence-description">{description}</p>

      {target && (
        <div className="finding-location">
          <div>
            <small>{tr(language, 'Element location', 'Ubicación del elemento')}</small>
            <code title={target}>{target}</code>
          </div>
          <button
            type="button"
            aria-label={tr(language, 'Highlight element on page', 'Destacar elemento en la página')}
            title={tr(language, 'Highlight element on page', 'Destacar elemento en la página')}
            onClick={() => void onLocate(target)}
          >
            <span aria-hidden="true">&lt;/&gt;</span>
          </button>
        </div>
      )}

      {issue.contrast && (
        <div className={`contrast-evidence ${issue.outcome}`}>
          <div className="contrast-ratio">
            <span>{tr(language, 'Contrast', 'Contraste')}</span>
            <strong>{issue.contrast.ratio != null ? `${issue.contrast.ratio}:1` : tr(language, 'Review', 'Revisar')}</strong>
            <small>{tr(language, `Required ${issue.contrast.requiredRatio}:1`, `Requerido ${issue.contrast.requiredRatio}:1`)}</small>
          </div>

          {(issue.contrast.foreground || suggestion) && (
            <div className="contrast-format" role="group" aria-label={tr(language, 'Color format', 'Formato de color')}>
              <button type="button" className={colorFormat === 'hex' ? 'active' : ''} aria-pressed={colorFormat === 'hex'} onClick={() => setColorFormat('hex')}>HEX</button>
              <button type="button" className={colorFormat === 'rgb' ? 'active' : ''} aria-pressed={colorFormat === 'rgb'} onClick={() => setColorFormat('rgb')}>RGB</button>
            </div>
          )}

          <dl>
            {issue.contrast.foreground && (
              <div>
                <dt>{contrastSubjectLabel(issue, language)}</dt>
                <dd className="contrast-color-value">
                  <span className="contrast-swatch" style={{ backgroundColor: issue.contrast.foreground }} aria-hidden="true" />
                  <code>{formattedColor(issue.contrast.foreground, colorFormat)}</code>
                  <button type="button" className="copy-color" onClick={() => void copyColor(formattedColor(issue.contrast!.foreground!, colorFormat), 'current')}>
                    {copiedKey === 'current' ? tr(language, 'Copied', 'Copiado') : tr(language, 'Copy', 'Copiar')}
                  </button>
                </dd>
              </div>
            )}
            {issue.contrast.background && (
              <div>
                <dt>{issue.contrast.kind === 'text' || issue.ruleId === 'FT-WCAG-010' ? tr(language, 'Background', 'Fondo') : tr(language, 'Adjacent color', 'Color adyacente')}</dt>
                <dd className="contrast-color-value">
                  <span className="contrast-swatch" style={{ backgroundColor: issue.contrast.background }} aria-hidden="true" />
                  <code>{formattedColor(issue.contrast.background, colorFormat)}</code>
                  <button type="button" className="copy-color" onClick={() => void copyColor(formattedColor(issue.contrast!.background!, colorFormat), 'background')}>
                    {copiedKey === 'background' ? tr(language, 'Copied', 'Copiado') : tr(language, 'Copy', 'Copiar')}
                  </button>
                </dd>
              </div>
            )}
            {level !== 'simple' && issue.contrast.fontSizePx != null && (
              <div>
                <dt>{tr(language, 'Text size', 'Tamaño')}</dt>
                <dd>{issue.contrast.fontSizePx}px · {issue.contrast.largeText ? tr(language, 'large text', 'texto grande') : tr(language, 'normal text', 'texto normal')}</dd>
              </div>
            )}
            {level === 'developer' && issue.contrast.fontWeight != null && (
              <div>
                <dt>{tr(language, 'Font weight', 'Peso de fuente')}</dt>
                <dd>{issue.contrast.fontWeight}</dd>
              </div>
            )}
          </dl>

          {suggestion && (
            <div className="contrast-suggestion">
              <div>
                <strong>{tr(language, 'Suggested accessible color', 'Color accesible sugerido')}</strong>
                <small>
                  {tr(
                    language,
                    `Smallest ${suggestion.direction} adjustment found · ${suggestion.ratio}:1`,
                    `Menor ajuste hacia ${suggestion.direction === 'darker' ? 'oscuro' : 'claro'} encontrado · ${suggestion.ratio}:1`,
                  )}
                </small>
              </div>
              <div className="contrast-suggestion-value">
                <span className="contrast-swatch contrast-swatch-large" style={{ backgroundColor: suggestion.rgb }} aria-hidden="true" />
                <code>{colorFormat === 'hex' ? suggestion.hex : suggestion.rgb}</code>
                <button type="button" className="copy-color primary" onClick={() => void copyColor(colorFormat === 'hex' ? suggestion.hex : suggestion.rgb, 'suggestion')}>
                  {copiedKey === 'suggestion' ? tr(language, 'Copied', 'Copiado') : tr(language, 'Copy', 'Copiar')}
                </button>
              </div>
            </div>
          )}

          {issue.contrast.reason && issue.outcome !== 'review' && <p>{issue.contrast.reason}</p>}
        </div>
      )}

      {level !== 'simple' && copy.evidence && (
        <p className="evidence">
          <strong>{tr(language, 'Evidence:', 'Evidencia:')}</strong> {copy.evidence}
        </p>
      )}

      {level !== 'simple' && issue.accessibleName && (
        <details className="name-computation">
          <summary>{tr(language, 'Accessible name calculation', 'Cálculo del nombre accesible')}</summary>
          <dl>
            <div>
              <dt>{tr(language, 'Computed name', 'Nombre calculado')}</dt>
              <dd>{issue.accessibleName.name || tr(language, 'Empty', 'Vacío')}</dd>
            </div>
            <div>
              <dt>{tr(language, 'Resolved role', 'Rol resuelto')}</dt>
              <dd><code>{issue.accessibleName.role ?? tr(language, 'None', 'Ninguno')}</code></dd>
            </div>
            <div>
              <dt>{tr(language, 'Winning source', 'Fuente utilizada')}</dt>
              <dd><code>{issue.accessibleName.source}</code></dd>
            </div>
          </dl>
          {level === 'developer' && (
            <div className="name-candidates">
              <strong>{tr(language, 'Candidates inspected', 'Candidatos inspeccionados')}</strong>
              {issue.accessibleName.candidates.length ? (
                <ul>
                  {issue.accessibleName.candidates.map((candidate, index) => (
                    <li className={candidate.used ? 'used' : ''} key={`${candidate.selector}-${candidate.source}-${index}`}>
                      <span><code>{candidate.source}</code>{candidate.used && <b>{tr(language, 'Used', 'Usado')}</b>}</span>
                      <span>{candidate.value || tr(language, 'Empty', 'Vacío')}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>{tr(language, 'No naming candidates were present.', 'No había candidatos de nombre.')}</p>
              )}
            </div>
          )}
        </details>
      )}

      <FindingGuidance issue={issue} language={language} />
    </article>
  );
}
