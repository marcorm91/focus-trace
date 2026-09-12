import type { AccessibleNameEvidence } from '../../shared/types';
import {
  accessibleNameDetails,
  accessibleNameDiagnostics,
  isProgrammaticallyHidden,
  selectorFor,
  semanticRole,
} from './dom';
import { scopedElements } from './scan-elements';

export type SpecializedAccessibleNameKind =
  | 'dialog'
  | 'meter'
  | 'progressbar'
  | 'tab'
  | 'tooltip'
  | 'treeitem'
  | 'summary';

export type SpecializedAccessibleNameFamily = 'wcag-control' | 'wcag-range' | 'aria-warning';

export interface SpecializedAccessibleNameEvaluation {
  element: Element;
  kind: SpecializedAccessibleNameKind;
  family: SpecializedAccessibleNameFamily;
  outcome: 'pass' | 'fail' | 'warning';
  evidence: AccessibleNameEvidence;
  detail: string;
}

type ScanRoot = Document | Element;

const SPECIALIZED_ROLES = new Set(['dialog', 'alertdialog', 'meter', 'progressbar', 'tab', 'tooltip', 'treeitem']);

function normalize(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function kindFor(element: Element): SpecializedAccessibleNameKind | undefined {
  switch (element.tagName) {
    case 'DIALOG': return 'dialog';
    case 'METER': return 'meter';
    case 'PROGRESS': return 'progressbar';
    case 'SUMMARY': return 'summary';
  }

  const role = semanticRole(element);
  if (!role || !SPECIALIZED_ROLES.has(role)) return undefined;
  if (role === 'alertdialog') return 'dialog';
  return role as Exclude<SpecializedAccessibleNameKind, 'summary'>;
}

function familyFor(kind: SpecializedAccessibleNameKind): SpecializedAccessibleNameFamily {
  if (kind === 'meter' || kind === 'progressbar') return 'wcag-range';
  if (kind === 'dialog' || kind === 'treeitem') return 'aria-warning';
  return 'wcag-control';
}

function exposedRole(element: Element, kind: SpecializedAccessibleNameKind): string {
  const role = semanticRole(element);
  if (role) return role;
  if (kind === 'summary') return 'button';
  return kind;
}

function descendantContentName(root: Element, kind: SpecializedAccessibleNameKind): string {
  const pieces: string[] = [];

  const visit = (node: Node): void => {
    if (node.nodeType === Node.TEXT_NODE) {
      pieces.push(node.textContent ?? '');
      return;
    }
    if (!(node instanceof Element)) return;
    if (isProgrammaticallyHidden(node)) return;

    if (kind === 'treeitem' && semanticRole(node) === 'group') return;
    if (kind === 'treeitem' && node !== root && semanticRole(node) === 'treeitem') return;

    if (
      node !== root
      && (node.hasAttribute('aria-labelledby')
        || node.hasAttribute('aria-label')
        || ['IMG', 'AREA', 'INPUT'].includes(node.tagName))
    ) {
      const childName = accessibleNameDetails(node).name;
      if (childName) {
        pieces.push(childName);
        return;
      }
    }

    for (const child of node.childNodes) visit(child);
  };

  for (const child of root.childNodes) visit(child);
  return normalize(pieces.join(' '));
}

function evidenceFor(element: Element, kind: SpecializedAccessibleNameKind): AccessibleNameEvidence {
  const diagnostics = accessibleNameDiagnostics(element);
  let name = diagnostics.name;
  let source = diagnostics.source;
  let candidates = [...diagnostics.candidates];

  const permitsContentName = kind === 'tab' || kind === 'tooltip' || kind === 'treeitem' || kind === 'summary';
  if (permitsContentName && (source === 'none' || (kind === 'treeitem' && source === 'subtree'))) {
    const contentName = descendantContentName(element, kind);
    if (contentName) {
      name = contentName;
      source = 'subtree';
      candidates = [
        ...candidates.filter((candidate) => candidate.source !== 'subtree'),
        {
          source: 'subtree',
          selector: selectorFor(element),
          value: contentName,
          used: true,
        },
      ];
    } else if (kind === 'treeitem' && source === 'subtree') {
      name = '';
      source = 'none';
      candidates = candidates.map((candidate) =>
        candidate.source === 'subtree' ? { ...candidate, value: '', used: false } : candidate,
      );
    }
  }

  return {
    name,
    source,
    role: exposedRole(element, kind),
    candidates,
  };
}

export function evaluateSpecializedAccessibleNames(root: ScanRoot): SpecializedAccessibleNameEvaluation[] {
  const evaluations: SpecializedAccessibleNameEvaluation[] = [];

  for (const element of scopedElements(root, 'dialog, meter, progress, summary, [role]')) {
    const kind = kindFor(element);
    if (!kind || isProgrammaticallyHidden(element)) continue;

    const evidence = evidenceFor(element, kind);
    const family = familyFor(kind);
    const hasName = Boolean(evidence.name);
    const outcome = hasName ? 'pass' : family === 'aria-warning' ? 'warning' : 'fail';
    const role = evidence.role ?? kind;

    evaluations.push({
      element,
      kind,
      family,
      outcome,
      evidence,
      detail: hasName
        ? `${role} accessible name = ${JSON.stringify(evidence.name)}; source = ${evidence.source}.`
        : `${role} accessible-name computation returned an empty string.`,
    });
  }

  return evaluations;
}
