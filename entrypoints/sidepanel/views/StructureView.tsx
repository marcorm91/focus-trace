import { useEffect, useState } from 'react';
import type {
  StructureHint,
  StructureMetricId,
  StructureMetricTarget,
  StructureSnapshot,
} from '../../../lib/runtime/structure-map';
import { tr, type AppLanguage } from '../../../shared/i18n';
import type { ScanResult } from '../../../shared/types';
import { HeadingTreeView } from './HeadingTreeView';

type StructureMode = 'headings' | 'semantics' | 'metrics';

type HintCopy = {
  title: string;
  description: string;
  suggestion?: string;
};

type MetricCopy = {
  label: string;
  description: string;
};

function hintCopy(hint: StructureHint, language: AppLanguage): HintCopy {
  if (language !== 'es') {
    return {
      title: hint.title,
      description: hint.description,
      ...(hint.suggestion ? { suggestion: hint.suggestion } : {}),
    };
  }

  if (hint.title === 'Generic element used as a button') {
    return {
      title: 'Elemento genérico usado como botón',
      description: `Se está usando un <${hint.element?.tag ?? 'div'}> con semántica de botón en lugar del elemento nativo.`,
      suggestion: 'Cuando la interacción sea una acción, valora utilizar <button>.',
    };
  }
  if (hint.title === 'Generic element used as a link') {
    return {
      title: 'Elemento genérico usado como enlace',
      description: `Se está usando un <${hint.element?.tag ?? 'div'}> con semántica de enlace.`,
      suggestion: 'Cuando la interacción navegue a otra ubicación, valora utilizar <a href="…">.',
    };
  }
  if (hint.title === 'Generic element used as a heading') {
    return {
      title: 'Elemento genérico usado como encabezado',
      description: `Se está usando un <${hint.element?.tag ?? 'div'}> con semántica de encabezado mediante ARIA.`,
      suggestion: 'Cuando la jerarquía del documento lo permita, valora utilizar un <h1>–<h6> nativo.',
    };
  }
  if (hint.title === 'Generic element with click handler') {
    return {
      title: 'Elemento genérico con evento de clic',
      description: `Se ha detectado un <${hint.element?.tag ?? 'div'}> con onclick sin utilizar un elemento interactivo nativo.`,
      suggestion: 'Utiliza <button> para acciones o <a href="…"> para navegación cuando corresponda.',
    };
  }
  if (hint.title === 'Generic element in the tab order') {
    return {
      title: 'Elemento genérico incluido en el orden de tabulación',
      description: `Un <${hint.element?.tag ?? 'div'}> entra directamente en el foco secuencial sin exponer un rol semántico.`,
      suggestion: 'Si es interactivo, valora sustituirlo por el elemento nativo que represente su función.',
    };
  }

  return {
    title: hint.title,
    description: hint.description,
    ...(hint.suggestion ? { suggestion: hint.suggestion } : {}),
  };
}

function metricCopy(id: StructureMetricId, language: AppLanguage): MetricCopy {
  const copies: Record<StructureMetricId, MetricCopy> = {
    headings: {
      label: tr(language, 'Headings', 'Encabezados'),
      description: tr(language, 'H1–H6 and role="heading".', 'H1–H6 y role="heading".'),
    },
    landmarks: {
      label: tr(language, 'Semantic regions', 'Regiones semánticas'),
      description: tr(language, 'Main page landmarks and equivalent ARIA roles.', 'Landmarks principales y roles ARIA equivalentes.'),
    },
    lists: {
      label: tr(language, 'Lists', 'Listas'),
      description: tr(language, 'UL, OL, DL and role="list".', 'UL, OL, DL y role="list".'),
    },
    forms: {
      label: tr(language, 'Forms', 'Formularios'),
      description: tr(language, 'Form regions in the document.', 'Regiones de formulario del documento.'),
    },
    buttons: {
      label: tr(language, 'Buttons', 'Botones'),
      description: tr(language, 'Native buttons and button roles.', 'Botones nativos y elementos con rol de botón.'),
    },
    links: {
      label: tr(language, 'Links', 'Enlaces'),
      description: tr(language, 'Native links and link roles.', 'Enlaces nativos y elementos con rol de enlace.'),
    },
    'form-controls': {
      label: tr(language, 'Form controls', 'Campos de formulario'),
      description: tr(language, 'Inputs, selects, textareas and equivalent roles.', 'Inputs, selects, textareas y roles equivalentes.'),
    },
    tables: {
      label: tr(language, 'Tables', 'Tablas'),
      description: tr(language, 'Tables, grids and treegrids.', 'Tablas, grids y treegrids.'),
    },
    images: {
      label: tr(language, 'Images', 'Imágenes'),
      description: tr(language, 'Images and elements exposing image semantics.', 'Imágenes y elementos con semántica de imagen.'),
    },
  };
  return copies[id];
}

function groupLocateSelector(metric: StructureMetricTarget, label: string): string {
  return `__focustrace_group__:${encodeURIComponent(JSON.stringify({ selector: metric.selector, label }))}`;
}

function SnapshotEmpty({
  busy,
  language,
  onRefresh,
}: {
  busy: boolean;
  language: AppLanguage;
  onRefresh: () => void | Promise<void>;
}) {
  return (
    <div className="empty structure-empty">
      <h2>{busy
        ? tr(language, 'Analyzing structure…', 'Analizando estructura…')
        : tr(language, 'Analyze structural semantics', 'Analizar semántica estructural')}</h2>
      <p>{tr(
        language,
        'This quick analysis looks only for accessibility-oriented structural metrics and a small set of semantic review opportunities.',
        'Este análisis rápido busca únicamente métricas estructurales relacionadas con accesibilidad y un conjunto reducido de oportunidades de mejora semántica.',
      )}</p>
      {!busy && (
        <button type="button" onClick={() => void onRefresh()}>
          {tr(language, 'Analyze structure', 'Analizar estructura')}
        </button>
      )}
    </div>
  );
}

function StructureMetricButton({
  metric,
  language,
  onLocate,
}: {
  metric: StructureMetricTarget;
  language: AppLanguage;
  onLocate: (selector: string) => void | Promise<void>;
}) {
  const copy = metricCopy(metric.id, language);
  return (
    <button
      className="structure-metric"
      type="button"
      disabled={metric.count === 0}
      aria-label={tr(
        language,
        `Locate ${metric.count} ${copy.label.toLocaleLowerCase()}`,
        `Localizar ${metric.count} ${copy.label.toLocaleLowerCase()}`,
      )}
      onClick={() => void onLocate(groupLocateSelector(metric, copy.label))}
    >
      <strong>{metric.count}</strong>
      <span>{copy.label}</span>
      <small>{copy.description}</small>
    </button>
  );
}

export function StructureView({
  snapshot,
  scan,
  language,
  busy,
  onRefresh,
  onLocate,
}: {
  snapshot?: StructureSnapshot;
  scan?: ScanResult;
  language: AppLanguage;
  busy: boolean;
  onRefresh: () => void | Promise<void>;
  onLocate: (selector: string) => void | Promise<void>;
}) {
  const componentScan = scan?.scope?.type === 'component';
  const [mode, setMode] = useState<StructureMode>(componentScan ? 'semantics' : 'headings');

  useEffect(() => {
    if (componentScan && mode === 'headings') setMode('semantics');
  }, [componentScan, mode]);

  return (
    <section className="panel structure-panel" aria-labelledby="structure-title">
      <div className="section-heading structure-heading">
        <div>
          <h2 id="structure-title">{tr(language, 'Structure', 'Estructura')}</h2>
          <p>{tr(
            language,
            'Review headings, semantic HTML opportunities and accessibility-oriented structural metrics.',
            'Revisa encabezados, oportunidades de HTML semántico y métricas estructurales orientadas a accesibilidad.',
          )}</p>
        </div>
      </div>

      <div className="structure-mode-switcher" role="tablist" aria-label={tr(language, 'Structure views', 'Vistas de estructura')}>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'headings'}
          className={mode === 'headings' ? 'active' : ''}
          disabled={componentScan}
          title={componentScan ? tr(language, 'Heading outline is available for full-page scans.', 'El esquema de encabezados está disponible en análisis de página completa.') : undefined}
          onClick={() => setMode('headings')}
        >
          {tr(language, 'Headings', 'Encabezados')}
        </button>
        <button type="button" role="tab" aria-selected={mode === 'semantics'} className={mode === 'semantics' ? 'active' : ''} onClick={() => setMode('semantics')}>
          {tr(language, 'Semantics', 'Semántica')}
        </button>
        <button type="button" role="tab" aria-selected={mode === 'metrics'} className={mode === 'metrics' ? 'active' : ''} onClick={() => setMode('metrics')}>
          {tr(language, 'Metrics', 'Métricas')}
        </button>
      </div>

      {mode === 'headings' && (
        <div className="structure-headings-view" role="tabpanel">
          <HeadingTreeView scan={scan} language={language} onLocate={onLocate} />
        </div>
      )}

      {mode === 'semantics' && (
        snapshot ? (
          <div className="structure-hints" role="tabpanel">
            <div className="structure-subview-heading">
              <p className="structure-explainer">{tr(
                language,
                'These are semantic review opportunities, not automatic WCAG failures. Each result includes the element details and CSS selector used to locate it.',
                'Estas son oportunidades de revisión semántica, no fallos WCAG automáticos. Cada resultado incluye los datos del elemento y el selector CSS utilizado para localizarlo.',
              )}</p>
              <button type="button" className="structure-refresh" disabled={busy} onClick={() => void onRefresh()}>
                {busy ? tr(language, 'Updating…', 'Actualizando…') : tr(language, 'Refresh', 'Actualizar')}
              </button>
            </div>

            {snapshot.hints.length ? snapshot.hints.map((hint) => {
              const copy = hintCopy(hint, language);
              const element = hint.element;
              return (
                <article className={`structure-hint ${hint.tone}`} key={hint.id}>
                  <div className="structure-hint-main">
                    <span className="structure-hint-tone">{hint.tone === 'review' ? tr(language, 'Review', 'Revisar') : tr(language, 'Suggestion', 'Sugerencia')}</span>
                    <h3>{copy.title}</h3>
                    <p>{copy.description}</p>
                    {copy.suggestion && <p className="structure-hint-suggestion">{copy.suggestion}</p>}

                    {element && (
                      <dl className="structure-element-details">
                        <div><dt>{tr(language, 'Element', 'Elemento')}</dt><dd><code>&lt;{element.tag}&gt;</code></dd></div>
                        {element.label && <div><dt>{tr(language, 'Text / label', 'Texto / etiqueta')}</dt><dd>{element.label}</dd></div>}
                        {element.role && <div><dt>Role</dt><dd><code>{element.role}</code></dd></div>}
                        {element.id && <div><dt>ID</dt><dd><code>{element.id}</code></dd></div>}
                        {element.className && <div><dt>{tr(language, 'Classes', 'Clases')}</dt><dd><code>{element.className}</code></dd></div>}
                        {element.tabindex && <div><dt>tabindex</dt><dd><code>{element.tabindex}</code></dd></div>}
                        {element.trigger && <div><dt>{tr(language, 'Detected by', 'Detectado por')}</dt><dd><code>{element.trigger}</code></dd></div>}
                        <div className="structure-selector-detail">
                          <dt>{tr(language, 'CSS selector', 'Selector CSS')}</dt>
                          <dd><code>{element.selector}</code></dd>
                        </div>
                      </dl>
                    )}
                  </div>
                  {hint.selector && (
                    <button type="button" onClick={() => void onLocate(hint.selector!)}>
                      {tr(language, 'Locate', 'Localizar')}
                    </button>
                  )}
                </article>
              );
            }) : (
              <div className="notice">
                <strong>{tr(language, 'No semantic opportunities found', 'No se han encontrado oportunidades semánticas')}</strong>
                <p>{tr(
                  language,
                  'The quick structural review did not find the generic interactive patterns checked by this view.',
                  'La revisión estructural rápida no ha encontrado los patrones interactivos genéricos que comprueba esta vista.',
                )}</p>
              </div>
            )}
          </div>
        ) : <SnapshotEmpty busy={busy} language={language} onRefresh={onRefresh} />
      )}

      {mode === 'metrics' && (
        snapshot ? (
          <div className="structure-metrics-view" role="tabpanel">
            <div className="structure-subview-heading">
              <p className="structure-explainer">{tr(
                language,
                'Select a metric to highlight those elements on the page.',
                'Selecciona una métrica para resaltar esos elementos en la página.',
              )}</p>
              <button type="button" className="structure-refresh" disabled={busy} onClick={() => void onRefresh()}>
                {busy ? tr(language, 'Updating…', 'Actualizando…') : tr(language, 'Refresh', 'Actualizar')}
              </button>
            </div>

            <div className="structure-metrics" aria-label={tr(language, 'Accessibility structure metrics', 'Métricas de estructura de accesibilidad')}>
              {snapshot.metricTargets.map((metric) => (
                <StructureMetricButton
                  key={metric.id}
                  metric={metric}
                  language={language}
                  onLocate={onLocate}
                />
              ))}
            </div>
          </div>
        ) : <SnapshotEmpty busy={busy} language={language} onRefresh={onRefresh} />
      )}

      {snapshot?.truncated && mode !== 'headings' && (
        <div className="notice structure-limit-note" role="status">
          <strong>{tr(language, 'Large DOM: analysis limited', 'DOM grande: análisis limitado')}</strong>
          <p>{tr(
            language,
            'Counts and semantic suggestions are based on the first elements processed by the Structure safety limit.',
            'Los recuentos y sugerencias semánticas se basan en los primeros elementos procesados hasta el límite de seguridad de Estructura.',
          )}</p>
        </div>
      )}
    </section>
  );
}
