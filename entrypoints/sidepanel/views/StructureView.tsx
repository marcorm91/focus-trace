import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { StructureHint, StructureNode, StructureSnapshot } from '../../../lib/runtime/structure-map';
import { tr, type AppLanguage } from '../../../shared/i18n';
import type { ScanResult } from '../../../shared/types';
import { HeadingTreeView } from './HeadingTreeView';

type StructureMode = 'map' | 'headings' | 'semantics' | 'metrics';

type HintCopy = {
  title: string;
  description: string;
  suggestion?: string;
};

function branchIds(nodes: StructureNode[]): string[] {
  return nodes.flatMap((node) => [
    ...(node.children.length ? [node.id] : []),
    ...branchIds(node.children),
  ]);
}

function hintCopy(hint: StructureHint, language: AppLanguage): HintCopy {
  if (language !== 'es') {
    return {
      title: hint.title,
      description: hint.description,
      ...(hint.suggestion ? { suggestion: hint.suggestion } : {}),
    };
  }

  if (hint.title === 'Generic element used as a control') {
    return {
      title: 'Elemento genérico usado como control',
      description: 'Un <div> o <span> se está usando con comportamiento similar a un botón. Los controles nativos suelen aportar teclado y semántica con menos código personalizado.',
      suggestion: 'Valora usar <button> cuando la interacción sea una acción de botón.',
    };
  }
  if (hint.title === 'Repeated sibling structure') {
    return {
      title: 'Estructura repetida entre elementos hermanos',
      description: 'Este contenedor tiene tres o más elementos hermanos con una estructura muy similar. Según el contenido, podría representar una lista semántica.',
      suggestion: 'Valora <ul>/<ol> con <li> cuando los elementos repetidos formen una lista con significado.',
    };
  }
  if (hint.title === 'Navigation-like link group') {
    return {
      title: 'Grupo de enlaces con aspecto de navegación',
      description: 'La mayoría de elementos directos de este contenedor son enlaces. Si forman un bloque de navegación, un landmark puede hacer la estructura más comprensible.',
      suggestion: 'Valora <nav> o role="navigation" cuando el grupo sea realmente navegación del sitio o de la página.',
    };
  }
  if (hint.title === 'Deep generic wrapper chain') {
    return {
      title: 'Cadena profunda de contenedores genéricos',
      description: 'Hay cuatro o más <div> de un único hijo anidados antes de llegar a contenido con significado.',
      suggestion: 'Revisa si todos los wrappers son necesarios para layout, estilos o comportamiento.',
    };
  }
  if (hint.title === 'High <div> density') {
    return {
      title: 'Alta densidad de <div>',
      description: 'Una proporción elevada del DOM analizado está formada por contenedores <div>. No es un error por sí mismo, pero puede indicar oportunidades de mejorar la semántica.',
      suggestion: 'Revisa si HTML semántico puede sustituir contenedores genéricos cuando el contenido tenga una finalidad clara.',
    };
  }

  return { title: hint.title, description: hint.description, ...(hint.suggestion ? { suggestion: hint.suggestion } : {}) };
}

function StructureBranch({
  node,
  depth,
  language,
  collapsedIds,
  selectedId,
  onToggle,
  onSelect,
}: {
  node: StructureNode;
  depth: number;
  language: AppLanguage;
  collapsedIds: Set<string>;
  selectedId?: string;
  onToggle: (id: string) => void;
  onSelect: (node: StructureNode) => void;
}) {
  const hasChildren = node.children.length > 0;
  const expanded = hasChildren && !collapsedIds.has(node.id);
  const selected = selectedId === node.id;
  const style = { '--structure-depth': depth } as CSSProperties;
  const nodeName = `<${node.tag}>${node.count && node.count > 1 ? ` × ${node.count}` : ''}`;

  return (
    <div
      className="structure-tree-branch"
      role="treeitem"
      aria-level={depth + 1}
      aria-selected={selected}
      aria-expanded={hasChildren ? expanded : undefined}
    >
      <div className="structure-tree-row" style={style}>
        {hasChildren ? (
          <button
            className="structure-branch-toggle"
            type="button"
            aria-expanded={expanded}
            aria-label={expanded
              ? tr(language, `Collapse ${nodeName}`, `Contraer ${nodeName}`)
              : tr(language, `Expand ${nodeName}`, `Expandir ${nodeName}`)}
            onClick={() => onToggle(node.id)}
          >
            <span aria-hidden="true">{expanded ? '−' : '+'}</span>
          </button>
        ) : (
          <span className="structure-branch-toggle-spacer" aria-hidden="true" />
        )}
        <button className="structure-node" type="button" onClick={() => onSelect(node)}>
          <span className="structure-node-heading">
            <code>{nodeName}</code>
            {node.role && <small>role={node.role}</small>}
          </span>
          {node.label && <strong>{node.label}</strong>}
          {node.className && <small>.{node.className.replace(/\s+/g, '.')}</small>}
        </button>
      </div>

      {hasChildren && expanded && (
        <div className="structure-tree-children" role="group">
          {node.children.map((child) => (
            <StructureBranch
              key={child.id}
              node={child}
              depth={depth + 1}
              language={language}
              collapsedIds={collapsedIds}
              selectedId={selectedId}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MetricsView({ snapshot, language }: { snapshot: StructureSnapshot; language: AppLanguage }) {
  const { metrics } = snapshot;
  const items = [
    [tr(language, 'DOM elements', 'Elementos DOM'), metrics.totalElements],
    [tr(language, 'Semantic elements', 'Elementos semánticos'), metrics.semanticElements],
    ['<div>', metrics.divCount],
    [tr(language, 'Generic containers', 'Contenedores genéricos'), metrics.genericContainerCount],
    [tr(language, 'Generic ratio', 'Ratio genérico'), `${metrics.genericRatio}%`],
    [tr(language, 'Landmarks', 'Landmarks'), metrics.landmarkCount],
    [tr(language, 'Interactive elements', 'Elementos interactivos'), metrics.interactiveCount],
    [tr(language, 'Lists', 'Listas'), metrics.listCount],
    [tr(language, 'Maximum DOM depth', 'Profundidad DOM máxima'), metrics.maxDepth],
    [tr(language, 'Longest div chain', 'Cadena de div más larga'), metrics.maxGenericChain],
  ];

  return (
    <div className="structure-metrics" aria-label={tr(language, 'DOM structure metrics', 'Métricas de estructura DOM')}>
      {items.map(([label, value]) => (
        <div className="structure-metric" key={label}>
          <strong>{value}</strong>
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
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
      <h2>{busy ? tr(language, 'Building structure…', 'Generando estructura…') : tr(language, 'No structure snapshot yet', 'Todavía no hay snapshot de estructura')}</h2>
      <p>{tr(language, 'Structure is generated only when needed, so it does not continuously watch or recalculate the page DOM.', 'La estructura se genera solo cuando hace falta, por lo que no vigila ni recalcula continuamente el DOM de la página.')}</p>
      {!busy && (
        <button type="button" onClick={() => void onRefresh()}>
          {tr(language, 'Generate structure', 'Generar estructura')}
        </button>
      )}
    </div>
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
  const [mode, setMode] = useState<StructureMode>('map');
  const [selectedId, setSelectedId] = useState<string>();
  const collapsibleIds = useMemo(() => branchIds(snapshot?.roots ?? []), [snapshot?.roots]);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const componentScan = scan?.scope?.type === 'component';

  useEffect(() => {
    setCollapsedIds(new Set(collapsibleIds));
    setSelectedId(undefined);
  }, [collapsibleIds, snapshot?.capturedAt]);

  useEffect(() => {
    if (componentScan && mode === 'headings') setMode('map');
  }, [componentScan, mode]);

  const toggleBranch = (id: string) => {
    setCollapsedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectNode = (node: StructureNode) => {
    setSelectedId(node.id);
    void onLocate(node.selector);
  };

  const allCollapsed = collapsibleIds.length > 0 && collapsibleIds.every((id) => collapsedIds.has(id));

  return (
    <section className="panel structure-panel" aria-labelledby="structure-title">
      <div className="section-heading structure-heading">
        <div>
          <h2 id="structure-title">{tr(language, 'Structure', 'Estructura')}</h2>
          <p>{tr(
            language,
            'Understand the page through its DOM map, heading outline, semantics and composition metrics.',
            'Entiende la página mediante su mapa DOM, árbol de encabezados, semántica y métricas de composición.',
          )}</p>
        </div>
        <button className="structure-refresh" type="button" disabled={busy} onClick={() => void onRefresh()}>
          {busy
            ? tr(language, 'Refreshing…', 'Actualizando…')
            : snapshot
              ? tr(language, 'Refresh', 'Actualizar')
              : tr(language, 'Generate', 'Generar')}
        </button>
      </div>

      {snapshot && (
        <div className="structure-summary" aria-label={tr(language, 'Structure summary', 'Resumen de estructura')}>
          <span><strong>{snapshot.metrics.totalElements}</strong> {tr(language, 'DOM elements', 'elementos DOM')}</span>
          <span><strong>{snapshot.roots.length}</strong> {tr(language, 'root nodes', 'nodos raíz')}</span>
          <span><strong>{snapshot.hints.length}</strong> {tr(language, 'semantic hints', 'sugerencias semánticas')}</span>
        </div>
      )}

      {snapshot?.truncated && (
        <div className="notice structure-limit-note" role="status">
          <strong>{tr(language, 'Large DOM: snapshot limited', 'DOM grande: snapshot limitado')}</strong>
          <p>{tr(
            language,
            'FocusTrace stopped collecting after its safety limits. Metrics and the map still represent the sampled page without continuously processing the DOM.',
            'FocusTrace ha detenido la recogida al alcanzar sus límites de seguridad. Las métricas y el mapa siguen representando la muestra analizada sin procesar continuamente el DOM.',
          )}</p>
        </div>
      )}

      <div className="structure-mode-switcher" role="tablist" aria-label={tr(language, 'Structure views', 'Vistas de estructura')}>
        <button type="button" role="tab" aria-selected={mode === 'map'} className={mode === 'map' ? 'active' : ''} onClick={() => setMode('map')}>
          {tr(language, 'Map', 'Mapa')}
        </button>
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

      {mode === 'map' && (
        snapshot ? (
          <div className="structure-map-view" role="tabpanel">
            <div className="structure-tree-controls" role="group" aria-label={tr(language, 'Structure tree display', 'Visualización del árbol de estructura')}>
              <button type="button" disabled={collapsedIds.size === 0} onClick={() => setCollapsedIds(new Set())}>
                {tr(language, 'Expand all', 'Expandir todo')}
              </button>
              <button type="button" disabled={allCollapsed} onClick={() => setCollapsedIds(new Set(collapsibleIds))}>
                {tr(language, 'Collapse all', 'Contraer todo')}
              </button>
            </div>

            {snapshot.roots.length ? (
              <div className="structure-tree" role="tree" aria-label={tr(language, 'Page DOM structure', 'Estructura DOM de la página')}>
                {snapshot.roots.map((node) => (
                  <StructureBranch
                    key={node.id}
                    node={node}
                    depth={0}
                    language={language}
                    collapsedIds={collapsedIds}
                    selectedId={selectedId}
                    onToggle={toggleBranch}
                    onSelect={selectNode}
                  />
                ))}
              </div>
            ) : (
              <div className="notice">
                <strong>{tr(language, 'No relevant structure found', 'No se ha encontrado estructura relevante')}</strong>
                <p>{tr(language, 'The current document did not expose semantic or relevant structural nodes in the sampled DOM.', 'El documento actual no expone nodos semánticos o estructurales relevantes en el DOM analizado.')}</p>
              </div>
            )}
          </div>
        ) : <SnapshotEmpty busy={busy} language={language} onRefresh={onRefresh} />
      )}

      {mode === 'headings' && (
        <div className="structure-headings-view" role="tabpanel">
          <HeadingTreeView scan={scan} language={language} onLocate={onLocate} />
        </div>
      )}

      {mode === 'semantics' && (
        snapshot ? (
          <div className="structure-hints" role="tabpanel">
            <p className="structure-explainer">{tr(
              language,
              'These are heuristic suggestions, not automatic WCAG failures. Review the content intent before changing markup.',
              'Estas son sugerencias heurísticas, no fallos WCAG automáticos. Revisa la intención del contenido antes de cambiar el marcado.',
            )}</p>
            {snapshot.hints.length ? snapshot.hints.map((hint) => {
              const copy = hintCopy(hint, language);
              return (
                <article className={`structure-hint ${hint.tone}`} key={hint.id}>
                  <div>
                    <span className="structure-hint-tone">{hint.tone === 'review' ? tr(language, 'Review', 'Revisar') : tr(language, 'Suggestion', 'Sugerencia')}</span>
                    <h3>{copy.title}</h3>
                    <p>{copy.description}</p>
                    {copy.suggestion && <p className="structure-hint-suggestion">{copy.suggestion}</p>}
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
                <strong>{tr(language, 'No semantic hints in this sample', 'No hay sugerencias semánticas en esta muestra')}</strong>
                <p>{tr(language, 'The heuristics did not find the generic patterns currently checked by Structure.', 'Las heurísticas no han encontrado los patrones genéricos que Structure comprueba actualmente.')}</p>
              </div>
            )}
          </div>
        ) : <SnapshotEmpty busy={busy} language={language} onRefresh={onRefresh} />
      )}

      {mode === 'metrics' && (
        snapshot ? (
          <div role="tabpanel">
            <MetricsView snapshot={snapshot} language={language} />
            <p className="structure-explainer">{tr(
              language,
              'Metrics describe DOM composition; they are context for review, not a quality score.',
              'Las métricas describen la composición del DOM; sirven como contexto de revisión, no como una puntuación de calidad.',
            )}</p>
          </div>
        ) : <SnapshotEmpty busy={busy} language={language} onRefresh={onRefresh} />
      )}
    </section>
  );
}
