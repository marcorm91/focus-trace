import { useEffect, useMemo, useState } from 'react';
import { colorToHex, colorToRgb, parseCssColor, suggestAccessibleForeground } from '../../../lib/audit/contrast';
import { outcomeLabel, type ExplanationLevel } from '../../../lib/runtime/explanations';
import { scanCategoryForIssue, type ScanCategory } from '../../../shared/scan-categories';
import {
  localizedScanIssue,
  localizedSeverity,
  tr,
  type AppLanguage,
} from '../../../shared/i18n';
import type { FindingOutcome, ScanIssue, ScanResult } from '../../../shared/types';
import { Empty, Metric, ReferenceList } from '../components/Common';

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

  const scanWarnings = scan?.warnings ?? [];
  const groups = useMemo(() => ({
    fail: scan?.issues ?? [],
    review: scan?.review ?? [],
    warning: scanWarnings,
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

  const filteredGroups = useMemo(() => {
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
    if (filteredGroups[filter].length > 0) return;
    if (filteredGroups.fail.length) setFilter('fail');
    else if (filteredGroups.review.length) setFilter('review');
    else if (filteredGroups.warning.length) setFilter('warning');
  }, [filter, filteredGroups, scan]);

  useEffect(() => {
    if (category === 'all') return;
    if ((categoryCounts.get(category) ?? 0) > 0) return;
    setCategory('all');
  }, [category, categoryCounts]);

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

  const findings = filteredGroups[filter];
  const totalFindings = allFindings.length;
  const tabs: Array<{ id: ScanFilter; label: string; count: number }> = [
    { id: 'fail', label: tr(language, 'Failures', 'Fallos'), count: filteredGroups.fail.length },
    { id: 'review', label: tr(language, 'Review', 'Revisión'), count: filteredGroups.review.length },
    { id: 'warning', label: tr(language, 'Warnings', 'Avisos'), count: filteredGroups.warning.length },
  ];
  const visibleCategories = CATEGORY_ORDER.filter((candidate) =>
    candidate === 'all' || (categoryCounts.get(candidate) ?? 0) > 0,
  );

  return (
    <section className="panel" aria-labelledby="scan-title">
      <div className="section-heading">
        <div>
          <h2 id="scan-title">{tr(language, 'Full page scan', 'Barrido completo de página')}</h2>
          <p title={scan.url}>{scan.title || scan.url}</p>
        </div>
        <strong>
          {tr(
            language,
            `${scan.issues.length} fail · ${scan.review.length} review · ${scanWarnings.length} warning`,
            `${scan.issues.length} fallo · ${scan.review.length} revisión · ${scanWarnings.length} aviso`,
          )}
        </strong>
      </div>

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
  const [colorFormat, setColorFormat] = useState<ColorFormat>('hex');
  const [copiedKey, setCopiedKey] = useState<string>();

  const suggestion = useMemo(() => {
    if (issue.outcome !== 'fail' || issue.ruleId !== 'FT-WCAG-010') return undefined;
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
    <article className="issue scan-issue">
      <div className="finding-meta">
        <span className={`outcome ${issue.outcome}`}>{outcomeLabel(issue.outcome, level, language)}</span>
        {level !== 'simple' && <span className={`severity ${issue.severity}`}>{localizedSeverity(issue.severity, language)}</span>}
        {level !== 'simple' && <code>{issue.ruleId}</code>}
      </div>
      <h3>{copy.title}</h3>
      <p>{copy.description}</p>

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
                <dt>{tr(language, 'Current text', 'Texto actual')}</dt>
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
                <dt>{tr(language, 'Background', 'Fondo')}</dt>
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
              <p>
                {tr(
                  language,
                  'FocusTrace adjusts the current color toward black or white and picks the smallest sRGB change that reaches the required ratio. It does not claim a global perceptual nearest color.',
                  'FocusTrace ajusta el color actual hacia negro o blanco y elige el menor cambio sRGB que alcanza el ratio requerido. No pretende ser el color perceptualmente más cercano posible.',
                )}
              </p>
            </div>
          )}

          {issue.contrast.reason && <p>{issue.contrast.reason}</p>}
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
