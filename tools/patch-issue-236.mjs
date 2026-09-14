import { readFileSync, writeFileSync } from 'node:fs';

function read(path) { return readFileSync(path, 'utf8'); }
function write(path, content) { writeFileSync(path, content); }
function replaceOnce(source, oldValue, newValue, label) {
  if (!source.includes(oldValue)) throw new Error(`Missing patch target: ${label}`);
  return source.replace(oldValue, newValue);
}

// dom.ts: preserve the public selectorFor API while making its implementation
// context-aware, and use the owning document/window for nested-frame evidence.
{
  const path = 'lib/audit/dom.ts';
  let source = read(path);
  source = replaceOnce(
    source,
    "import { registeredExplicitAriaRole } from './standards-registry';\n",
    "import { composedSelectorFor } from './composed-tree';\nimport { registeredExplicitAriaRole } from './standards-registry';\n",
    'dom import',
  );
  const start = source.indexOf('function selectorResolvesOnlyTo');
  const end = source.indexOf('function normalise');
  if (start < 0 || end < 0 || end <= start) throw new Error('Could not locate legacy selectorFor block');
  source = `${source.slice(0, start)}export function selectorFor(element: Element): string {\n  return composedSelectorFor(element);\n}\n\nfunction computedStyleFor(element: Element): CSSStyleDeclaration {\n  const view = element.ownerDocument.defaultView;\n  return view?.getComputedStyle(element) ?? getComputedStyle(element);\n}\n\n${source.slice(end)}`;
  source = source.replaceAll('document.getElementById(id)', 'element.ownerDocument.getElementById(id)');
  source = source.replaceAll('getComputedStyle(current)', 'computedStyleFor(current)');
  source = source.replaceAll('getComputedStyle(element)', 'computedStyleFor(element)');
  // Undo the helper self-rewrite if replaceAll touched it.
  source = source.replace('return view?.computedStyleFor(element) ?? computedStyleFor(element);', 'return view?.getComputedStyle(element) ?? getComputedStyle(element);');
  write(path, source);
}

// scan-base.ts: component scope and containment must understand boundary paths.
{
  const path = 'lib/audit/scan-base.ts';
  let source = read(path);
  source = replaceOnce(
    source,
    "import { evaluateTextContrastForElement, textContrastSubjectsForElement } from './contrast';\n",
    "import { resolveComposedSelector } from './composed-tree';\nimport { evaluateTextContrastForElement, textContrastSubjectsForElement } from './contrast';\n",
    'scan-base import',
  );
  source = replaceOnce(
    source,
    "  return root instanceof Document || root === element || root.contains(element);",
    "  return root instanceof Document || scopedElements(root, '*').includes(element);",
    'scan-base contains',
  );
  source = replaceOnce(
    source,
    "    const focusable = [container, ...container.querySelectorAll('*')].find((element) => isSequentiallyFocusable(element));",
    "    const focusable = scopedElements(container, '*').find((element) => isSequentiallyFocusable(element));",
    'aria-hidden descendants',
  );
  source = replaceOnce(
    source,
    "  const root = scope ? document.querySelector(scope.selector) : document;",
    "  const root = scope ? resolveComposedSelector(scope.selector) : document;",
    'scan-base component root',
  );
  write(path, source);
}

// scan.ts: supplemental rule families and issue snapshots resolve the same path.
{
  const path = 'lib/audit/scan.ts';
  let source = read(path);
  source = replaceOnce(
    source,
    "import { evaluateAdvancedAria, type AriaValidationSignalKind } from './aria-validator';\n",
    "import { evaluateAdvancedAria, type AriaValidationSignalKind } from './aria-validator';\nimport { resolveComposedSelector } from './composed-tree';\n",
    'scan import',
  );
  source = replaceOnce(
    source,
    "    return document.querySelector(target) ?? undefined;",
    "    return resolveComposedSelector(target) ?? undefined;",
    'issue target resolution',
  );
  source = replaceOnce(
    source,
    "  const root = componentScope ? document.querySelector(componentScope.selector) : document;",
    "  const root = componentScope ? resolveComposedSelector(componentScope.selector) : document;",
    'scan component root',
  );
  write(path, source);
}

// embedded-content.ts: owner-document origin resolution plus explicit closed/budget boundaries.
{
  const path = 'lib/audit/embedded-content.ts';
  let source = read(path);
  source = replaceOnce(
    source,
    "import { scopedElements } from './scan-elements';",
    "import { composedCoverageLimits, scopedElements } from './scan-elements';",
    'embedded scan-elements import',
  );
  source = source.replace('const url = new URL(raw, document.baseURI);', 'const url = new URL(raw, element.ownerDocument.baseURI);');
  source = source.replace("return url.origin === location.origin;", "return url.origin === element.ownerDocument.defaultView?.location.origin;");
  source = replaceOnce(
    source,
    "  for (const element of embeddedDocument.querySelectorAll('*')) {",
    "  for (const element of scopedElements(embeddedDocument, '*')) {",
    'frame focus traversal',
  );
  source = replaceOnce(
    source,
    "export function evaluateEmbeddedContent(root: ScanRoot): EmbeddedContentEvaluation[] {\n  return [\n    ...evaluateObjects(root),\n    ...evaluateFrames(root),\n  ];\n}\n",
    `function evaluateNestedCoverageLimits(root: ScanRoot): EmbeddedContentEvaluation[] {\n  return composedCoverageLimits(root)\n    .filter((limit) => (limit.kind === 'closed-shadow' || limit.kind === 'budget') && limit.element)\n    .map((limit) => ({\n      element: limit.element!,\n      rule: EMBEDDED_CONTENT_UNEVALUATED_REVIEW_RULE,\n      outcome: 'review' as const,\n      detail: limit.detail,\n    }));\n}\n\nexport function evaluateEmbeddedContent(root: ScanRoot): EmbeddedContentEvaluation[] {\n  return [\n    ...evaluateObjects(root),\n    ...evaluateFrames(root),\n    ...evaluateNestedCoverageLimits(root),\n  ];\n}\n`,
    'nested coverage evaluations',
  );
  write(path, source);
}

// Broaden FT-REVIEW-039 from frame-only to any inaccessible nested audit context.
{
  const path = 'shared/embedded-content-rules.ts';
  let source = read(path);
  source = source.replace("title: 'Embedded frame content was not evaluated'", "title: 'Nested audit context was not evaluated'");
  source = source.replace(
    "A cross-origin, sandboxed or unavailable embedded document creates an explicit coverage boundary: FocusTrace can still inspect the frame element, but it cannot claim that the nested document is clean.",
    "A closed shadow root, cross-origin frame, sandboxed frame or traversal-budget boundary prevents complete local inspection, so FocusTrace must expose that boundary instead of claiming the nested content is clean.",
  );
  source = source.replace(
    "Un documento incrustado cross-origin, aislado por sandbox o no disponible crea un límite explícito de cobertura: FocusTrace puede inspeccionar el elemento frame, pero no puede afirmar que el documento anidado esté libre de problemas.",
    "Un shadow root cerrado, un frame cross-origin o aislado por sandbox, o un límite del presupuesto de recorrido impiden una inspección local completa, por lo que FocusTrace debe exponer ese límite en vez de afirmar que el contenido anidado está libre de problemas.",
  );
  write(path, source);
}

// embedded-content-scan-extension wording now covers shadow and frame boundaries.
{
  const path = 'lib/audit/embedded-content-scan-extension.ts';
  let source = read(path);
  source = source.replace(
    "FocusTrace could inspect the frame element but could not evaluate the embedded document. Nested content must not be reported as clean when that inspection boundary exists.",
    "FocusTrace reached a nested audit boundary it could not traverse completely. Closed shadow content, inaccessible frame descendants or content beyond the shared traversal budget must not be reported as clean.",
  );
  write(path, source);
}

// focus-walk.ts: use the same composed scope and candidate traversal.
{
  const path = 'lib/runtime/focus-walk.ts';
  let source = read(path);
  source = replaceOnce(
    source,
    "import { isSequentiallyFocusable, selectorFor } from '../audit/dom';\n",
    "import { resolveComposedSelector } from '../audit/composed-tree';\nimport { isSequentiallyFocusable, selectorFor } from '../audit/dom';\nimport { scopedElements } from '../audit/scan-elements';\n",
    'focus-walk imports',
  );
  source = source.replace('    return document.querySelector(parsed.selector);', '    return resolveComposedSelector(parsed.selector);');
  source = replaceOnce(
    source,
    "  const descendants = [...effectiveRoot.querySelectorAll(FOCUSABLE_SELECTOR)];\n  const all = effectiveRoot instanceof Element && effectiveRoot.matches(FOCUSABLE_SELECTOR)\n    ? [effectiveRoot, ...descendants]\n    : descendants;",
    "  const all = effectiveRoot instanceof Document || effectiveRoot instanceof Element\n    ? scopedElements(effectiveRoot, FOCUSABLE_SELECTOR)\n    : [...effectiveRoot.querySelectorAll(FOCUSABLE_SELECTOR)];",
    'focus-walk candidates',
  );
  write(path, source);
}

console.log('Issue #236 integration patches applied.');
