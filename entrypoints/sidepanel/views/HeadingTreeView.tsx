import { useEffect, useMemo, useState } from 'react';
import { tr, type AppLanguage } from '../../../shared/i18n';
import type { HeadingSignal, HeadingSnapshot, ScanResult } from '../../../shared/types';
import { Empty } from '../components/Common';

function signalLabel(signal: HeadingSignal, language: AppLanguage): string {
  if (signal === 'empty') return tr(language, 'Empty heading', 'Encabezado vacío');
  if (signal === 'level-jump') return tr(language, 'Skipped level', 'Salto de nivel');
  return tr(language, 'Multiple H1', 'Varios H1');
}

function headingDetail(heading: HeadingSnapshot, language: AppLanguage): string {
  if (heading.signals.includes('empty')) {
    return tr(
      language,
      'This heading has no visible text. Review whether it should be removed or named.',
      'Este encabezado no tiene texto visible. Revisa si debe eliminarse o recibir contenido.',
    );
  }
  if (heading.signals.includes('level-jump')) {
    return tr(
      language,
      'The outline skips a heading level before this node. Review the content hierarchy.',
      'El esquema salta un nivel antes de este nodo. Revisa la jerarquía del contenido.',
    );
  }
  if (heading.signals.includes('multiple-h1')) {
    return tr(
      language,
      'There is more than one H1. Review the document structure; this is not treated as an automatic WCAG failure.',
      'Hay más de un H1. Revisa la estructura del documento; no se trata como un fallo WCAG automático.',
    );
  }
  return tr(
    language,
    'No structural signals were detected for this heading.',
    'No se han detectado señales estructurales en este encabezado.',
  );
}

export function HeadingTreeView({
  scan,
  language,
  onLocate,
}: {
  scan?: ScanResult | undefined;
  language: AppLanguage;
  onLocate: (selector: string) => void | Promise<void>;
}) {
  const headings = useMemo(() => scan?.headings ?? [], [scan?.headings]);
  const [selectedId, setSelectedId] = useState<string>();

  useEffect(() => {
    setSelectedId((current) =>
      current && headings.some((heading) => heading.id === current) ? current : undefined,
    );
  }, [headings]);

  if (!scan) {
    return (
      <Empty
        title={tr(language, 'No heading outline yet', 'Todavía no hay árbol de encabezados')}
        text={tr(
          language,
          'Analyze the current page to build its H1-H6 structure.',
          'Analiza la página actual para construir su estructura H1–H6.',
        )}
      />
    );
  }

  const selected = headings.find((heading) => heading.id === selectedId);
  const signalled = headings.filter((heading) => heading.signals.length > 0).length;
  const h1Count = headings.filter((heading) => heading.level === 1).length;

  return (
    <section className="panel heading-outline-panel" aria-labelledby="heading-outline-title">
      <div className="section-heading">
        <div>
          <h2 id="heading-outline-title">{tr(language, 'Heading outline', 'Árbol de encabezados')}</h2>
          <p>{tr(language, 'The visible H1-H6 structure in DOM order.', 'La estructura H1–H6 visible en orden DOM.')}</p>
        </div>
        <strong>{headings.length}</strong>
      </div>

      {headings.length === 0 ? (
        <div className="notice">
          <strong>{tr(language, 'No visible headings', 'No hay encabezados visibles')}</strong>
          <p>{tr(language, 'The page has no visible H1-H6 elements.', 'La página no contiene elementos H1–H6 visibles.')}</p>
        </div>
      ) : (
        <>
          <div className="heading-outline-summary" aria-label={tr(language, 'Heading summary', 'Resumen de encabezados')}>
            <span><strong>{h1Count}</strong> H1</span>
            <span><strong>{headings.length}</strong> {tr(language, 'nodes', 'nodos')}</span>
            <span><strong>{signalled}</strong> {tr(language, 'to review', 'a revisar')}</span>
          </div>

          <div className="heading-tree" role="tree" aria-label={tr(language, 'Page heading tree', 'Árbol de encabezados de la página')}>
            {headings.map((heading) => {
              const selectedHeading = heading.id === selectedId;
              const label = heading.text || tr(language, 'Empty heading', 'Encabezado vacío');
              return (
                <div
                  className={`heading-tree-row level-${heading.level} ${heading.signals.length ? 'has-signal' : ''}`}
                  role="treeitem"
                  aria-level={heading.level}
                  aria-selected={selectedHeading}
                  key={heading.id}
                >
                  <span className="heading-level" aria-hidden="true">H{heading.level}</span>
                  <button
                    type="button"
                    className="heading-node"
                    onClick={() => {
                      setSelectedId(heading.id);
                      void onLocate(heading.selector);
                    }}
                  >
                    <span>{label}</span>
                    {heading.signals.length > 0 && (
                      <small>{heading.signals.map((signal) => signalLabel(signal, language)).join(' · ')}</small>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {selected && (
            <div className="heading-selection" aria-live="polite">
              <div>
                <span>H{selected.level}</span>
                <strong>{selected.text || tr(language, 'Empty heading', 'Encabezado vacío')}</strong>
              </div>
              <p>{headingDetail(selected, language)}</p>
            </div>
          )}
        </>
      )}
    </section>
  );
}
