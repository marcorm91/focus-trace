import { useMemo, useState } from 'react';
import { tr, type AppLanguage } from '../../../shared/i18n';
import {
  EN_301_549_WEB_STANDARD,
  WCAG_COVERAGE,
  type WcagCoverageMode,
} from '../../../shared/wcag-coverage';

function coverageLabel(mode: WcagCoverageMode, language: AppLanguage): string {
  if (mode === 'automated') return tr(language, 'Automated', 'Automático');
  if (mode === 'review') return tr(language, 'Review', 'Revisión');
  if (mode === 'runtime') return 'Runtime';
  if (mode === 'site-audit') return 'Site Audit';
  if (mode === 'manual') return tr(language, 'Manual', 'Manual');
  return tr(language, 'Not covered', 'No cubierto');
}

export function StandardsCoverageMatrix({ language }: { language: AppLanguage }) {
  const [scope, setScope] = useState<'aa' | 'all'>('aa');
  const [query, setQuery] = useState('');

  const scopedCriteria = useMemo(
    () => WCAG_COVERAGE.filter((criterion) => scope === 'all' || criterion.level !== 'AAA'),
    [scope],
  );
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visibleCriteria = useMemo(() => {
    if (!normalizedQuery) return scopedCriteria;
    return scopedCriteria.filter((criterion) => [
      criterion.id,
      criterion.title,
      criterion.level,
      ...criterion.ruleIds,
      ...criterion.actRuleIds,
      criterion.en301549?.clause ?? '',
    ].some((value) => value.toLocaleLowerCase().includes(normalizedQuery)));
  }, [normalizedQuery, scopedCriteria]);

  const assisted = scopedCriteria.filter((criterion) => criterion.implemented).length;
  const uncovered = scopedCriteria.length - assisted;
  const complete = scopedCriteria.filter((criterion) => criterion.completeness === 'complete').length;

  return (
    <section className="standards-coverage" aria-labelledby="standards-coverage-title">
      <div className="standards-coverage-heading">
        <div>
          <h3 id="standards-coverage-title">{tr(language, 'Standards coverage', 'Cobertura de estándares')}</h3>
          <p>{tr(
            language,
            'See exactly where FocusTrace provides automated, contextual, runtime or multi-page evidence—and where manual assessment is still required.',
            'Consulta exactamente dónde aporta FocusTrace evidencia automática, contextual, runtime o multipágina y dónde sigue siendo necesaria una evaluación manual.',
          )}</p>
        </div>
      </div>

      <div className="standards-coverage-summary" aria-label={tr(language, 'Coverage summary', 'Resumen de cobertura')}>
        <div><strong>{scopedCriteria.length}</strong><span>{tr(language, 'criteria in scope', 'criterios en alcance')}</span></div>
        <div><strong>{assisted}</strong><span>{tr(language, 'tool-assisted', 'con apoyo de la herramienta')}</span></div>
        <div><strong>{uncovered}</strong><span>{tr(language, 'without FocusTrace tooling', 'sin cobertura de FocusTrace')}</span></div>
        <div><strong>{complete}</strong><span>{tr(language, 'claimed complete', 'declarados completos')}</span></div>
      </div>

      <div className="standards-coverage-note" role="note">
        <strong>{tr(language, 'Coverage is not conformance.', 'Cobertura no significa conformidad.')}</strong>{' '}
        {tr(
          language,
          'A criterion marked Automated, Review, Runtime or Site Audit has FocusTrace evidence for a bounded part of that criterion. Manual remains present until every requirement branch and exception is explicitly proven by the coverage model.',
          'Un criterio marcado como Automático, Revisión, Runtime o Site Audit dispone de evidencia de FocusTrace para una parte acotada de ese criterio. Manual permanece indicado hasta que el modelo de cobertura pueda demostrar explícitamente todas sus condiciones y excepciones.',
        )}
      </div>

      <div className="standards-coverage-controls">
        <label>
          <span>{tr(language, 'Scope', 'Alcance')}</span>
          <select value={scope} onChange={(event) => setScope(event.target.value as 'aa' | 'all')}>
            <option value="aa">WCAG 2.2 A + AA / EN 301 549 §9</option>
            <option value="all">{tr(language, 'All active WCAG 2.2 criteria, including AAA', 'Todos los criterios WCAG 2.2 activos, incluido AAA')}</option>
          </select>
        </label>
        <label>
          <span>{tr(language, 'Filter criteria', 'Filtrar criterios')}</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={tr(language, 'Criterion, rule, ACT or EN clause', 'Criterio, regla, ACT o cláusula EN')}
          />
        </label>
      </div>

      <p className="standards-coverage-source">
        <strong>{EN_301_549_WEB_STANDARD.standard} {EN_301_549_WEB_STANDARD.version}</strong>{' · '}
        {tr(
          language,
          'Published ETSI web requirements. Clause 9.0 maps WCAG 2.2 Level AA to clauses 9.1–9.4 plus the conformance requirements in 9.6.',
          'Requisitos web publicados por ETSI. La cláusula 9.0 establece la equivalencia de WCAG 2.2 nivel AA con las cláusulas 9.1–9.4 y los requisitos de conformidad de 9.6.',
        )}{' '}
        <a href={EN_301_549_WEB_STANDARD.url} target="_blank" rel="noreferrer">
          {tr(language, 'Open standard', 'Abrir estándar')} <span aria-hidden="true">↗</span>
        </a>
      </p>

      <div className="standards-coverage-table-wrap">
        <table className="standards-coverage-table">
          <thead>
            <tr>
              <th scope="col">WCAG 2.2</th>
              <th scope="col">{tr(language, 'FocusTrace coverage', 'Cobertura FocusTrace')}</th>
              <th scope="col">EN 301 549</th>
            </tr>
          </thead>
          <tbody>
            {visibleCriteria.map((criterion) => (
              <tr key={criterion.id}>
                <th scope="row">
                  <a href={criterion.url} target="_blank" rel="noreferrer">{criterion.id}</a>
                  <span>{criterion.title}</span>
                  <small>{tr(language, 'Level', 'Nivel')} {criterion.level}</small>
                </th>
                <td>
                  <div className="standards-coverage-chips">
                    {criterion.coverage.map((mode) => (
                      <span className={`coverage-chip coverage-${mode}`} key={mode}>
                        {coverageLabel(mode, language)}
                      </span>
                    ))}
                  </div>
                  {criterion.ruleIds.length > 0 && (
                    <small>
                      FocusTrace: {criterion.ruleIds.join(', ')}
                      {criterion.actRuleIds.length > 0 ? ` · ACT: ${criterion.actRuleIds.join(', ')}` : ''}
                    </small>
                  )}
                </td>
                <td>
                  {criterion.en301549 ? (
                    <a href={criterion.en301549.url} target="_blank" rel="noreferrer">
                      § {criterion.en301549.clause}
                    </a>
                  ) : (
                    <span className="coverage-na">{tr(language, 'AAA: outside the Level AA clause 9 equivalence', 'AAA: fuera de la equivalencia de nivel AA de la cláusula 9')}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {visibleCriteria.length === 0 && (
        <p className="standards-coverage-empty">{tr(language, 'No criteria match this filter.', 'Ningún criterio coincide con este filtro.')}</p>
      )}
    </section>
  );
}
