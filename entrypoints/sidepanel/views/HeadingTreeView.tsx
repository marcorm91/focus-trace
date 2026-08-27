import { useEffect, useMemo, useState } from 'react';
import { browser } from '#imports';
import {
  clearHeadingOutlineInPage,
  showHeadingOutlineInPage,
  type HeadingOverlayResult,
} from '../../../lib/runtime/heading-overlay';
import { tr, type AppLanguage } from '../../../shared/i18n';
import type { HeadingSignal, ScanResult } from '../../../shared/types';
import { Empty } from '../components/Common';

function signalLabel(signal: HeadingSignal, language: AppLanguage): string {
  if (signal === 'empty') return tr(language, 'Empty heading', 'Encabezado vacío');
  if (signal === 'level-jump') return tr(language, 'Skipped level', 'Salto de nivel');
  return tr(language, 'Multiple H1', 'Varios H1');
}

function headingDetail(heading: NonNullable<ScanResult['headings']>[number], language: AppLanguage): string {
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

async function activeTabId(): Promise<number> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (tab?.id == null) throw new Error('No active browser tab is available.');
  return tab.id;
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
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [overlayResult, setOverlayResult] = useState<HeadingOverlayResult>();
  const [overlayError, setOverlayError] = useState<string>();

  useEffect(() => {
    setSelectedId((current) =>
      current && headings.some((heading) => heading.id === current) ? current : undefined,
    );
  }, [headings]);

  useEffect(() => () => {
    void activeTabId()
      .then((tabId) => browser.scripting.executeScript({ target: { tabId }, func: clearHeadingOutlineInPage }))
      .catch(() => undefined);
  }, []);

  const toggleHeadingOverlay = async (enabled: boolean) => {
    setOverlayError(undefined);
    try {
      const tabId = await activeTabId();
      if (!enabled) {
        await browser.scripting.executeScript({ target: { tabId }, func: clearHeadingOutlineInPage });
        setOverlayVisible(false);
        setOverlayResult(undefined);
        return;
      }

      const results = await browser.scripting.executeScript({
        target: { tabId },
        func: showHeadingOutlineInPage,
      });
      const result = results[0]?.result as HeadingOverlayResult | undefined;
      setOverlayVisible(true);
      setOverlayResult(result);
    } catch {
      setOverlayVisible(false);
      setOverlayResult(undefined);
      setOverlayError(tr(
        language,
        'Could not draw the heading map on the current page.',
        'No se pudo dibujar el mapa de encabezados en la página actual.',
      ));
    }
  };

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
          <p>{tr(language, 'The exposed H1-H6 structure in DOM order.', 'La estructura H1–H6 expuesta en orden DOM.')}</p>
        </div>
        <strong>{headings.length}</strong>
      </div>

      <label className="heading-overlay-toggle">
        <input
          type="checkbox"
          checked={overlayVisible}
          onChange={(event) => void toggleHeadingOverlay(event.currentTarget.checked)}
        />
        <span>
          <strong>{tr(language, 'Show headings on page', 'Mostrar encabezados en página')}</strong>
          <small>{tr(
            language,
            'Draw H1-H6 boxes over the page. Hidden DOM headings are also marked using their nearest visible container.',
            'Dibuja recuadros H1–H6 sobre la página. También marca encabezados ocultos del DOM usando su contenedor visible más cercano.',
          )}</small>
        </span>
      </label>

      {overlayVisible && overlayResult && (
        <p className="heading-overlay-status" role="status">
          {tr(
            language,
            `${overlayResult.total} DOM headings mapped · ${overlayResult.hidden} hidden`,
            `${overlayResult.total} encabezados DOM marcados · ${overlayResult.hidden} ocultos`,
          )}
        </p>
      )}
      {overlayError && <p className="heading-overlay-error" role="alert">{overlayError}</p>}

      {headings.length === 0 ? (
        <div className="notice">
          <strong>{tr(language, 'No exposed headings', 'No hay encabezados expuestos')}</strong>
          <p>{tr(
            language,
            'The accessibility outline has no exposed H1-H6 elements. You can still enable the page map to reveal hidden DOM headings.',
            'El árbol de accesibilidad no contiene H1–H6 expuestos. Puedes activar igualmente el mapa para revelar encabezados ocultos del DOM.',
          )}</p>
        </div>
      ) : (
        <>
          <div className="heading-outline-summary" aria-label={tr(language, 'Heading summary', 'Resumen de encabezados')}>
            <span><strong>{h1Count}</strong> {tr(language, 'H1 count', 'Cantidad de H1')}</span>
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
