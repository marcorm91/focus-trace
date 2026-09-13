import { RULES } from '../../shared/rule-catalog';
import type { AccessibleNameEvidence, ScanIssue, ScanResult } from '../../shared/types';
import { accessibleNameDiagnostics, isProgrammaticallyHidden, selectorFor, semanticRole } from './dom';
import { scopedElements } from './scan-elements';

type ScanRoot = Document | Element;

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const SVG_IMAGE_ROLES = new Set(['img', 'image', 'graphics-symbol', 'graphics-document']);

function normalize(value: string | null | undefined): string {
  return value?.replace(/\s+/g, ' ').trim() ?? '';
}

function directSvgTitle(element: Element): Element | undefined {
  if (element.namespaceURI !== 'http://www.w3.org/2000/svg') return undefined;
  return [...element.children].find((child) => child.namespaceURI === 'http://www.w3.org/2000/svg' && child.localName === 'title');
}

function imageNameEvidence(element: Element): AccessibleNameEvidence {
  const diagnostics = accessibleNameDiagnostics(element);
  if (diagnostics.name) return diagnostics;

  const title = directSvgTitle(element);
  const titleText = normalize(title?.textContent);
  if (!title || !titleText) return diagnostics;

  return {
    ...diagnostics,
    name: titleText,
    source: 'subtree',
    candidates: [
      ...diagnostics.candidates,
      {
        source: 'subtree',
        selector: selectorFor(title),
        value: titleText,
        used: true,
      },
    ],
  };
}

function issueFor(element: Element, evidence: AccessibleNameEvidence): ScanIssue {
  return {
    id: uid(),
    ruleId: RULES.imageName.id,
    title: RULES.imageName.title,
    description: 'This exposed image-role graphic has an empty accessible name and is not marked decorative.',
    severity: RULES.imageName.severity,
    outcome: 'fail',
    targets: [selectorFor(element)],
    evidence: 'No non-empty accessible name was detected for this specialized image role.',
    accessibleName: evidence,
    references: RULES.imageName.references,
  };
}

export function reconcileSpecializedImageAlternatives(result: ScanResult, root: ScanRoot): void {
  const ruleResult = result.ruleResults?.find((entry) => entry.ruleId === RULES.imageName.id);
  if (!ruleResult) return;

  for (const element of scopedElements(root, '[role]')) {
    if (isProgrammaticallyHidden(element)) continue;
    const role = semanticRole(element);
    if (!role || !SVG_IMAGE_ROLES.has(role)) continue;

    const svg = element.namespaceURI === 'http://www.w3.org/2000/svg';
    const alreadyHandledByBaseRule = role === 'img';
    const evidence = imageNameEvidence(element);
    const target = selectorFor(element);

    if (alreadyHandledByBaseRule) {
      if (!svg || !evidence.name) continue;
      const before = result.issues.length;
      result.issues = result.issues.filter((issue) => !(issue.ruleId === RULES.imageName.id && issue.targets.includes(target)));
      const removed = before - result.issues.length;
      if (removed > 0) {
        ruleResult.failures = Math.max(0, ruleResult.failures - removed);
        ruleResult.passed += removed;
        result.passes += removed;
      }
      continue;
    }

    // Native <img> elements are already handled by the base image rule. The
    // cases below extend the same rule to ARIA image/graphics roles that the
    // base semantic-role filter intentionally does not classify as role=img.
    if (element instanceof HTMLImageElement) continue;

    ruleResult.applicable += 1;
    if (evidence.name) {
      ruleResult.passed += 1;
      result.passes += 1;
    } else {
      ruleResult.failures += 1;
      result.issues.push(issueFor(element, evidence));
    }
  }
}
