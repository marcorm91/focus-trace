import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { browser } from '#imports';
import {
  clearHeadingOutlineInPage,
  showHeadingOutlineInPage,
  type HeadingOverlayResult,
} from '../../../lib/runtime/heading-overlay';
import { tr, type AppLanguage } from '../../../shared/i18n';
import type { HeadingSignal, ScanResult } from '../../../shared/types';
import { Empty } from '../components/Common';

type HeadingSnapshot = NonNullable<ScanResult['headings']>[number];

type HeadingTreeNode = {
  heading: HeadingSnapshot;
  children: HeadingTreeNode[];
};

function signalLabel(signal: HeadingSignal, language: AppLanguage): string {
  if (signal === 'empty') return tr(language, 'Empty heading', 'Encabezado vacío');
  if (signal === 'level-jump') return tr(language, 'Skipped level', 'Salto de nivel');
  return tr(language, 'Multiple H1', 'Varios H1');
}

function buildHeadingForest(headings: HeadingSnapshot[]): HeadingTreeNode[] {
  const roots: HeadingTreeNode[] = [];
  const stack: HeadingTreeNode[] = [];

  for (const heading of headings) {
    const node: HeadingTreeNode = { heading, children: [] };
    while (stack.length > 0 && stack[stack.length - 1]!.heading.level >= heading.level) {
      stack.pop();
    }

    const parent = stack[stack.length - 1];
    if (parent) parent.children.push(node);
    else roots.push(node);
    stack.push(node);
  }

  return roots;
}

function branchIds(nodes: HeadingTreeNode[]): string[] {
  return nodes.flatMap((node) => [
    ...(node.children.length > 0 ? [node.heading.id] : []),
    ...branchIds(node.children),
  ]);
}

async function activeTabId(): Promise<number> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (tab?.id == null) throw new Error('No active browser tab is available.');
  return tab.id;
}

function HeadingBranch({
  node,
  depth,
  language,
  selectedId,
  collapsedIds,
  onSelect,
  onToggle,
}: {
  node: HeadingTreeNode;
  depth: number;
  language: AppLanguage;
  selectedId?: string;
  collapsedIds: Set<string>;
  onSelect: (heading: HeadingSnapshot) => void;
  onToggle: (headingId: string) => void;
}) {
  const { heading, children } = node;
  const hasChildren = children.length > 0;
  const expanded = hasChildren && !collapsedIds.has(heading.id);
  const selectedHeading = heading.id === selectedId;
  const label = heading.text || tr(language, 'Empty heading', 'Encabezado vacío');
  const rowStyle = { '--heading-depth': depth } as CSSProperties;

  return (
    <div
      className={`heading-tree-branch level-${heading.level} ${heading.signals.length ? 'has-signal' : ''}`}
      role="treeitem"
      aria-level={depth + 1}
      aria-selected={selectedHeading}
      aria-expanded={hasChildren ? expanded : undefined}
    >
      <div
        className={`heading-tree-row level-${heading.level} ${heading.signals.length ? 'has-signal' : ''}`}
        style={rowStyle}
      >
        {hasChildren ? (
          <button
            type="button"
            className="heading-branch-toggle"
            aria-expanded={expanded}
            aria-label={expanded
              ? tr(language, `Collapse heading branch: ${label}`, `Contraer rama de encabezado: ${label}`)
              : tr(language, `Expand heading branch: ${label}`, `Expandir rama de encabezado: ${label}`)}
            onClick={() => onToggle(heading.id)}
          >
            <span aria-hidden="true">{expanded ? '−' : '+'}</span>
          </button>
        ) : (
          <span className="heading-branch-toggle-spacer" aria-hidden="true" />
        )}
        <span className="heading-level" aria-hidden="true">H{heading.level}</span>
        <button
          type="button"
          className="heading-node"
          onClick={() => onSelect(heading)}
        >
          <span>{label}</span>
          {heading.signals.length > 0 && (
            <small>{heading.signals.map((signal) => signalLabel(signal, language)).join(' · ')}</small>
          )}
        </button>
      </div>

      {hasChildren && expanded && (
        <div className="heading-tree-children" role="group">
          {children.map((child) => (
            <HeadingBranch
              node={child}
              depth={depth + 1}
              language={language}
              selectedId={selectedId}
              collapsedIds={collapsedIds}
              onSelect={onSelect}
              onToggle={onToggle}
              key={child.heading.id}
            />
          ))}
        </div>
      )}
    </div>
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
  const headingForest = useMemo(() => buildHeadingForest(headings), [headings]);
  const collapsibleIds = useMemo(() => branchIds(headingForest), [headingForest]);
  const [selectedId, setSelectedId] = useState<string>();
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => new Set(collapsibleIds));
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [overlayResult, setOverlayResult] = useState<HeadingOverlayResult>();
  const [overlayError, setOverlayError] = useState<string>();

  useEffect(() => {
    setSelectedId((current) =>
      current && headings.some((heading) => heading.id === current) ? current : undefined,
    );
  }, [headings]);

  useEffect(() => {
    setCollapsedIds(new Set(collapsibleIds));
  }, [collapsibleIds, scan?.scannedAt]);

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

  const toggleBranch = (headingId: string) => {
    setCollapsedIds((current) => {
      const next = new Set(current);
      if (next.has(headingId)) next.delete(headingId);
      else next.add(headingId);
      return next;
    });
  };

  const selectHeading = (heading: HeadingSnapshot) => {
    setSelectedId(heading.id);
    void onLocate(heading.selector);
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

  const signalled = headings.filter((heading) => heading.signals.length > 0).length;
  const h1Count = headings.filter((heading) => heading.level === 1).length;
  const allCollapsed = collapsibleIds.length > 0 && collapsibleIds.every((id) => collapsedIds.has(id));

  return (
    <section className="panel heading-outline-panel" aria-labelledby="heading-outline-title">
      <div className="section-heading">
        <div>
          <h2 id="heading-outline-title">{tr(language, 'Heading outline', 'Árbol de encabezados')}</h2>
          <p>{tr(language, 'The exposed H1-H6 structure in DOM order.', 'La estructura H1–H6 expuesta en orden DOM.')}</p>
        </div>
        <strong>{headings.length}</strong>
      </div>

      <label className={`heading-overlay-toggle${overlayVisible ? ' is-selected' : ''}`}>
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

          {collapsibleIds.length > 0 && (
            <div className="heading-tree-controls" role="group" aria-label={tr(language, 'Heading tree display', 'Visualización del árbol de encabezados')}>
              <button
                type="button"
                disabled={collapsedIds.size === 0}
                onClick={() => setCollapsedIds(new Set())}
              >
                {tr(language, 'Expand all', 'Expandir todo')}
              </button>
              <button
                type="button"
                disabled={allCollapsed}
                onClick={() => setCollapsedIds(new Set(collapsibleIds))}
              >
                {tr(language, 'Collapse all', 'Contraer todo')}
              </button>
            </div>
          )}

          <div className="heading-tree" role="tree" aria-label={tr(language, 'Page heading tree', 'Árbol de encabezados de la página')}>
            {headingForest.map((node) => (
              <HeadingBranch
                node={node}
                depth={0}
                language={language}
                selectedId={selectedId}
                collapsedIds={collapsedIds}
                onSelect={selectHeading}
                onToggle={toggleBranch}
                key={node.heading.id}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
