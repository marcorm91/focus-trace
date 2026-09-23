import {
  EMBEDDED_CONTENT_UNEVALUATED_REVIEW_RULE,
  FRAME_ACCESSIBLE_NAME_RULE,
  FRAME_FOCUSABLE_CONTENT_RULE,
  FRAME_NAME_UNIQUENESS_REVIEW_RULE,
  OBJECT_ALTERNATIVE_RULE,
} from '../../shared/embedded-content-rules';
import type { RuleDefinition } from '../../shared/rule-catalog';
import type { AccessibleNameEvidence } from '../../shared/types';
import { accessibleNameDiagnostics, isMarkedDecorative, isProgrammaticallyHidden } from './dom';
import { composedCoverageLimits, scopedElements } from './scan-elements';

type ScanRoot = Document | Element;

export interface EmbeddedContentEvaluation {
  element: Element;
  rule: RuleDefinition;
  outcome: 'pass' | 'fail' | 'review';
  detail: string;
  accessibleName?: AccessibleNameEvidence;
}

interface FrameInspection {
  status: 'available' | 'unavailable';
  reason: string;
  document?: Document;
}

function normalize(value: string | null | undefined): string {
  return value?.replace(/\s+/g, ' ').trim() ?? '';
}

function isFrame(element: Element): boolean {
  return element.tagName === 'IFRAME' || element.tagName === 'FRAME';
}

function frameDocument(element: Element): Document | null {
  try {
    return (element as Element & { contentDocument?: Document | null }).contentDocument ?? null;
  } catch {
    return null;
  }
}

function sandboxPreventsSameOrigin(element: Element): boolean {
  if (!element.hasAttribute('sandbox')) return false;
  return !normalize(element.getAttribute('sandbox'))
    .toLowerCase()
    .split(/\s+/)
    .includes('allow-same-origin');
}

function expectedSameOrigin(element: Element): boolean {
  if (sandboxPreventsSameOrigin(element)) return false;
  if (element.hasAttribute('srcdoc')) return true;

  const raw = normalize(element.getAttribute('src'));
  if (!raw || raw === 'about:blank' || raw.startsWith('#')) return true;

  try {
    const url = new URL(raw, element.ownerDocument.baseURI);
    if (url.protocol === 'about:') return true;
    return url.origin === element.ownerDocument.defaultView?.location.origin;
  } catch {
    return false;
  }
}

function inspectFrame(element: Element): FrameInspection {
  if (!expectedSameOrigin(element)) {
    return {
      status: 'unavailable',
      reason: sandboxPreventsSameOrigin(element)
        ? 'sandboxed frame without allow-same-origin; embedded descendants were not inspected.'
        : 'cross-origin or opaque frame; embedded descendants were not inspected.',
    };
  }

  const embeddedDocument = frameDocument(element);
  if (!embeddedDocument?.documentElement) {
    return {
      status: 'unavailable',
      reason: 'same-origin frame document is not currently available; embedded descendants were not inspected.',
    };
  }

  return {
    status: 'available',
    reason: 'same-origin embedded document was available for bounded local inspection.',
    document: embeddedDocument,
  };
}

function isCssHiddenInDocument(element: Element): boolean {
  let current: Element | null = element;
  const view = element.ownerDocument.defaultView;
  while (current) {
    if (current.hasAttribute('hidden')) return true;
    if (current.closest('[inert]')) return true;
    try {
      const style = view?.getComputedStyle(current);
      if (style?.display === 'none') return true;
      if (style?.visibility === 'hidden' || style?.visibility === 'collapse') return true;
    } catch {
      return false;
    }
    current = current.parentElement;
  }
  return false;
}

function isDisabled(element: Element): boolean {
  return element.hasAttribute('disabled') || element.getAttribute('aria-disabled')?.trim().toLowerCase() === 'true';
}

function isSequentialFocusCandidate(element: Element): boolean {
  if (isCssHiddenInDocument(element) || isDisabled(element)) return false;

  const tabindex = element.getAttribute('tabindex');
  if (tabindex != null) {
    const parsed = Number.parseInt(tabindex, 10);
    return Number.isFinite(parsed) && parsed >= 0;
  }

  const tag = element.tagName.toLowerCase();
  if ((tag === 'a' || tag === 'area') && element.hasAttribute('href')) return true;
  if (['button', 'select', 'textarea', 'iframe', 'frame'].includes(tag)) return true;
  if (tag === 'input') return normalize(element.getAttribute('type')).toLowerCase() !== 'hidden';
  if ((tag === 'audio' || tag === 'video') && element.hasAttribute('controls')) return true;
  if (tag === 'summary') return true;
  if (element.getAttribute('contenteditable')?.trim().toLowerCase() === 'true') return true;
  return false;
}

function firstFocusableDescendant(embeddedDocument: Document): Element | undefined {
  for (const element of scopedElements(embeddedDocument, '*')) {
    if (isSequentialFocusCandidate(element)) return element;
  }
  return undefined;
}

function evaluateObjects(root: ScanRoot): EmbeddedContentEvaluation[] {
  const evaluations: EmbeddedContentEvaluation[] = [];

  for (const element of scopedElements(root, 'object[data]')) {
    if (isProgrammaticallyHidden(element)) continue;
    const name = accessibleNameDiagnostics(element);
    if (isMarkedDecorative(element) || name.name) {
      evaluations.push({
        element,
        rule: OBJECT_ALTERNATIVE_RULE,
        outcome: 'pass',
        detail: name.name
          ? `object accessible name = ${JSON.stringify(name.name)}; source = ${name.source}.`
          : 'object is explicitly presentational.',
        accessibleName: name,
      });
      continue;
    }

    evaluations.push({
      element,
      rule: OBJECT_ALTERNATIVE_RULE,
      outcome: 'fail',
      detail: 'object[data] has no non-empty aria-label, aria-labelledby or title-based accessible name and is not explicitly presentational.',
      accessibleName: name,
    });
  }

  return evaluations;
}

function evaluateFrames(root: ScanRoot): EmbeddedContentEvaluation[] {
  const evaluations: EmbeddedContentEvaluation[] = [];
  const frames = scopedElements(root, 'iframe, frame').filter((element) => isFrame(element) && !isProgrammaticallyHidden(element));
  const ignoredFrames = new Set(
    composedCoverageLimits(root)
      .filter((limit) => limit.kind === 'frame-ignored' && limit.element)
      .map((limit) => limit.element!),
  );
  const named: Array<{ element: Element; normalized: string; name: string }> = [];

  for (const element of frames) {
    const name = accessibleNameDiagnostics(element);
    const decorative = isMarkedDecorative(element);

    if (decorative || name.name) {
      evaluations.push({
        element,
        rule: FRAME_ACCESSIBLE_NAME_RULE,
        outcome: 'pass',
        detail: decorative
          ? 'frame is explicitly presentational.'
          : `frame accessible name = ${JSON.stringify(name.name)}; source = ${name.source}.`,
        accessibleName: name,
      });
      if (name.name) named.push({ element, name: name.name, normalized: name.name.toLocaleLowerCase() });
    } else {
      evaluations.push({
        element,
        rule: FRAME_ACCESSIBLE_NAME_RULE,
        outcome: 'fail',
        detail: 'frame accessible-name computation returned an empty string.',
        accessibleName: name,
      });
    }

    if (ignoredFrames.has(element)) continue;

    const inspection = inspectFrame(element);
    evaluations.push({
      element,
      rule: EMBEDDED_CONTENT_UNEVALUATED_REVIEW_RULE,
      outcome: inspection.status === 'available' ? 'pass' : 'review',
      detail: inspection.reason,
    });

    const tabindex = element.getAttribute('tabindex');
    const parsedTabindex = tabindex == null ? Number.NaN : Number.parseInt(tabindex, 10);
    if (!Number.isFinite(parsedTabindex) || parsedTabindex >= 0) continue;
    if (inspection.status !== 'available' || !inspection.document) continue;

    const focusable = firstFocusableDescendant(inspection.document);
    evaluations.push({
      element,
      rule: FRAME_FOCUSABLE_CONTENT_RULE,
      outcome: focusable ? 'fail' : 'pass',
      detail: focusable
        ? `frame tabindex=${parsedTabindex}; a sequentially focusable embedded descendant was detected (${focusable.tagName.toLowerCase()}). Embedded text and attributes were not copied into evidence.`
        : `frame tabindex=${parsedTabindex}; no sequentially focusable embedded descendant was detected during bounded local inspection.`,
    });
  }

  const counts = new Map<string, number>();
  for (const entry of named) counts.set(entry.normalized, (counts.get(entry.normalized) ?? 0) + 1);

  for (const entry of named) {
    const duplicates = counts.get(entry.normalized) ?? 0;
    evaluations.push({
      element: entry.element,
      rule: FRAME_NAME_UNIQUENESS_REVIEW_RULE,
      outcome: duplicates > 1 ? 'review' : 'pass',
      detail: duplicates > 1
        ? `${duplicates} exposed frames share accessible name ${JSON.stringify(entry.name)}. Review whether those frames have an equivalent purpose.`
        : `frame accessible name ${JSON.stringify(entry.name)} is unique among exposed frames in this scan scope.`,
    });
  }

  return evaluations;
}

function evaluateNestedCoverageLimits(root: ScanRoot): EmbeddedContentEvaluation[] {
  return composedCoverageLimits(root)
    .filter((limit) => (limit.kind === 'closed-shadow' || limit.kind === 'budget') && limit.element)
    .map((limit) => ({
      element: limit.element!,
      rule: EMBEDDED_CONTENT_UNEVALUATED_REVIEW_RULE,
      outcome: 'review' as const,
      detail: limit.detail,
    }));
}

export function evaluateEmbeddedContent(root: ScanRoot): EmbeddedContentEvaluation[] {
  return [
    ...evaluateObjects(root),
    ...evaluateFrames(root),
    ...evaluateNestedCoverageLimits(root),
  ];
}
