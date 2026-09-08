import { useMemo, useState } from 'react';
import { browser } from '#imports';
import { requestActivePageAccess } from '../../../lib/extension/page-access';
import {
  inspectScanTargetInPage,
  type ScanTargetInspectionNode,
  type ScanTargetInspectionResult,
} from '../../../lib/runtime/scan-target-inspection';
import { scanTargetLocator } from '../../../lib/runtime/scan-target-overlay';
import { tr, type AppLanguage } from '../../../shared/i18n';

export interface TargetInspectorElement {
  tag: string;
  selector?: string;
  role?: string;
  id?: string;
  className?: string;
  name?: string;
  label?: string;
}

type LocateHandler = (selector: string) => void | Promise<void>;

function fallbackTarget(selector: string): TargetInspectorElement {
  const tail = selector.split(/\s*>\s*|\s+/).filter(Boolean).at(-1) ?? selector;
  const tag = tail.match(/^([a-zA-Z][\w-]*)/)?.[1]?.toLowerCase() ?? 'element';
  const id = tail.match(/#([\w-]+)/)?.[1];
  return { tag, selector, ...(id ? { id } : {}) };
}

function nodeFromInspection(node: ScanTargetInspectionNode): TargetInspectorElement {
  return {
    tag: node.tag,
    selector: node.selector,
    ...(node.role ? { role: node.role } : {}),
    ...(node.id ? { id: node.id } : {}),
    ...(node.className ? { className: node.className } : {}),
    ...(node.label ? { label: node.label } : {}),
  };
}

function NodeSummary({ node }: { node: TargetInspectorElement }) {
  const readableName = node.name || node.label;
  return (
    <div className="target-inspector-node">
      <div className="target-inspector-node-heading">
        <code>&lt;{node.tag}&gt;</code>
        {node.role && <span>role=<code>{JSON.stringify(node.role)}</code></span>}
      </div>
      {readableName && <strong>{readableName}</strong>}
      {(node.id || node.className) && (
        <small>
          {node.id && <code>#{node.id}</code>}
          {node.className && <code>.{node.className.trim().split(/\s+/).join('.')}</code>}
        </small>
      )}
    </div>
  );
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

export function TargetInspector({
  selector,
  element,
  context,
  language,
  onLocate,
  ruleId,
  occurrence,
  total,
  locateLabel,
}: {
  selector: string;
  element?: TargetInspectorElement | undefined;
  context?: TargetInspectorElement | undefined;
  language: AppLanguage;
  onLocate?: LocateHandler | undefined;
  ruleId?: string | undefined;
  occurrence?: number | undefined;
  total?: number | undefined;
  locateLabel?: string | undefined;
}) {
  const [inspection, setInspection] = useState<ScanTargetInspectionResult>();
  const [htmlOpen, setHtmlOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [copied, setCopied] = useState(false);

  const targetNode = useMemo(
    () => inspection?.target ? nodeFromInspection(inspection.target) : element ?? fallbackTarget(selector),
    [element, inspection?.target, selector],
  );
  const contextNode = useMemo(
    () => inspection?.context ? nodeFromInspection(inspection.context) : context,
    [context, inspection?.context],
  );

  const overlayLabel = useMemo(() => {
    if (!ruleId) return 'FocusTrace';
    if (occurrence && total && total > 1) {
      return `${ruleId} · ${occurrence} ${tr(language, 'of', 'de')} ${total}`;
    }
    return ruleId;
  }, [language, occurrence, ruleId, total]);

  const toggleHtml = async () => {
    if (htmlOpen) {
      setHtmlOpen(false);
      return;
    }

    setBusy(true);
    setError(undefined);
    const pageAccess = requestActivePageAccess().catch(() => undefined);
    try {
      const tab = await pageAccess;
      if (!tab) throw new Error('No active page access');
      const results = await browser.scripting.executeScript({
        target: { tabId: tab.id },
        func: inspectScanTargetInPage,
        args: [selector],
      });
      const next = results[0]?.result as ScanTargetInspectionResult | undefined;
      if (!next?.found || !next.target) {
        setError(tr(
          language,
          'The element is no longer present on the page. Run the analysis again.',
          'El elemento ya no está presente en la página. Vuelve a ejecutar el análisis.',
        ));
        return;
      }
      setInspection(next);
      setHtmlOpen(true);
    } catch {
      setError(tr(
        language,
        'FocusTrace could not read the current HTML for this element.',
        'FocusTrace no ha podido leer el HTML actual de este elemento.',
      ));
    } finally {
      setBusy(false);
    }
  };

  const copySelector = async () => {
    if (!await copyText(selector)) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="target-inspector">
      <div className="target-inspector-primary">
        <small className="target-inspector-kicker">{tr(language, 'Affected element', 'Elemento afectado')}</small>
        <NodeSummary node={targetNode} />
      </div>

      {contextNode && (
        <div className="target-inspector-context">
          <small>{tr(language, 'Inside / related container', 'Dentro de / contenedor relacionado')}</small>
          <NodeSummary node={contextNode} />
        </div>
      )}

      {onLocate && (
        <div className="target-inspector-actions">
          <button
            type="button"
            onClick={() => void onLocate(scanTargetLocator(selector, overlayLabel))}
          >
            {locateLabel ?? tr(language, 'Review on page', 'Revisar en la página')}
          </button>
          <button type="button" disabled={busy} aria-expanded={htmlOpen} onClick={() => void toggleHtml()}>
            {busy
              ? tr(language, 'Reading HTML…', 'Leyendo HTML…')
              : htmlOpen
                ? tr(language, 'Hide HTML', 'Ocultar HTML')
                : tr(language, 'View HTML', 'Ver HTML')}
          </button>
        </div>
      )}

      {error && <p className="target-inspector-error" role="status">{error}</p>}

      {htmlOpen && inspection?.html && (
        <div className="target-inspector-html">
          <small>{tr(language, 'Current bounded HTML context', 'Contexto HTML actual limitado')}</small>
          <pre><code>{inspection.html}</code></pre>
        </div>
      )}

      <details className="target-inspector-technical">
        <summary>{tr(language, 'Technical selector', 'Selector técnico')}</summary>
        <div>
          <code title={selector}>{selector}</code>
          <button type="button" onClick={() => void copySelector()}>
            {copied ? tr(language, 'Copied', 'Copiado') : tr(language, 'Copy', 'Copiar')}
          </button>
        </div>
      </details>
    </div>
  );
}
