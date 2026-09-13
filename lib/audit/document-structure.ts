import {
  DUPLICATE_SINGLETON_LANDMARK_RULE,
  EMPTY_HEADING_RULE,
  LANDMARK_COVERAGE_RULE,
  PAGE_LEVEL_ONE_HEADING_RULE,
  PARAGRAPH_AS_HEADING_RULE,
  REGION_NAME_RULE,
  TOP_LEVEL_LANDMARK_RULE,
  type DocumentStructureRuntimeRule,
} from '../../shared/document-structure-rules';
import { accessibleNameDetails, isMarkedDecorative, isProgrammaticallyHidden } from './dom';
import {
  landmarkRoleForElement,
  landmarkScopeOwner,
  nearestContainingLandmark,
  pageLandmarks,
  type LandmarkRole,
} from './landmarks';
import { scopedElements } from './scan-elements';
import { registeredExplicitAriaRole } from './standards-registry';

export type DocumentStructureOutcome = 'review' | 'warning';

export interface DocumentStructureSignal {
  rule: DocumentStructureRuntimeRule;
  outcome: DocumentStructureOutcome;
  element: Element;
  description: string;
  evidence: string;
}

const TOP_LEVEL_ROLES = new Set<LandmarkRole>(['banner', 'main', 'complementary', 'contentinfo']);
const CONTENT_SELECTOR = 'h1,h2,h3,h4,h5,h6,p,a,button,input,select,textarea,img,table,ul,ol,dl,video,audio,canvas,svg';

function normalizedText(value: string | null | undefined): string {
  return value?.replace(/\s+/g, ' ').trim() ?? '';
}

function headingLevel(element: Element): number | null {
  const explicit = element.hasAttribute('role') ? registeredExplicitAriaRole(element)?.name : undefined;
  if (explicit && explicit !== 'heading') return null;
  if (explicit === 'heading') {
    const level = Number.parseInt(element.getAttribute('aria-level') ?? '', 10);
    if (level > 0) return level;
  }
  return /^H[1-6]$/.test(element.tagName) ? Number(element.tagName.slice(1)) : null;
}

function paragraphLooksLikeHeading(element: HTMLParagraphElement): boolean {
  const text = normalizedText(element.textContent);
  if (!text || text.length > 120) return false;
  const style = getComputedStyle(element);
  const fontSize = Number.parseFloat(style.fontSize) || 16;
  const bodySize = Number.parseFloat(getComputedStyle(document.body).fontSize) || 16;
  const weight = Number.parseInt(style.fontWeight, 10) || (style.fontWeight === 'bold' ? 700 : 400);
  return weight >= 600 && fontSize >= Math.max(bodySize * 1.2, bodySize + 2);
}

function meaningfulContent(element: Element): boolean {
  if (isProgrammaticallyHidden(element)) return false;
  if (element instanceof HTMLImageElement) return !isMarkedDecorative(element);
  if (element instanceof HTMLInputElement && element.type === 'hidden') return false;
  return Boolean(normalizedText(element.textContent)) || /^(INPUT|SELECT|TEXTAREA|BUTTON|A|IMG|VIDEO|AUDIO|CANVAS|SVG|TABLE)$/.test(element.tagName);
}

function add(
  signals: DocumentStructureSignal[],
  rule: DocumentStructureRuntimeRule,
  outcome: DocumentStructureOutcome,
  element: Element,
  description: string,
  evidence: string,
) {
  signals.push({ rule, outcome, element, description, evidence });
}

function evaluateHeadings(signals: DocumentStructureSignal[]) {
  const headings = scopedElements(document, 'h1,h2,h3,h4,h5,h6,[role]')
    .filter((element) => headingLevel(element) != null && !isProgrammaticallyHidden(element));

  if (!headings.some((heading) => headingLevel(heading) === 1)) {
    add(signals, PAGE_LEVEL_ONE_HEADING_RULE, 'review', document.body ?? document.documentElement,
      'No exposed level-one heading was found.', 'No H1 or aria-level=1 heading.');
  }

  for (const heading of headings) {
    if (normalizedText(heading.textContent) || accessibleNameDetails(heading).name) continue;
    add(signals, EMPTY_HEADING_RULE, 'review', heading,
      'This exposed heading has no usable content.', `heading level=${headingLevel(heading)}`);
  }

  for (const paragraph of scopedElements(document, 'p')) {
    if (!(paragraph instanceof HTMLParagraphElement) || isProgrammaticallyHidden(paragraph) || !paragraphLooksLikeHeading(paragraph)) continue;
    const style = getComputedStyle(paragraph);
    add(signals, PARAGRAPH_AS_HEADING_RULE, 'review', paragraph,
      'This styled paragraph may be acting as a heading.', `${style.fontSize}/${style.fontWeight}: ${normalizedText(paragraph.textContent).slice(0, 120)}`);
  }
}

function evaluateLandmarkPlacement(signals: DocumentStructureSignal[]) {
  const landmarks = pageLandmarks();
  for (const landmark of landmarks) {
    const role = landmarkRoleForElement(landmark);
    if (!role || !TOP_LEVEL_ROLES.has(role)) continue;
    const parent = nearestContainingLandmark(landmark);
    if (parent) add(signals, TOP_LEVEL_LANDMARK_RULE, 'review', landmark,
      `${role} is nested inside ${parent.role}.`, `${role} inside ${parent.role}`);
  }

  for (const role of ['banner', 'contentinfo'] as const) {
    const byScope = new Map<Element | Document, Element[]>();
    for (const landmark of landmarks.filter((element) => landmarkRoleForElement(element) === role)) {
      const owner = landmarkScopeOwner(landmark);
      const group = byScope.get(owner) ?? [];
      group.push(landmark);
      byScope.set(owner, group);
    }
    for (const group of byScope.values()) {
      if (group.length <= 1) continue;
      for (const landmark of group) add(signals, DUPLICATE_SINGLETON_LANDMARK_RULE, 'review', landmark,
        `${group.length} ${role} landmarks share one scope.`, `${group.length} ${role} landmarks`);
    }
  }

  for (const element of scopedElements(document, '[role]')) {
    if (isProgrammaticallyHidden(element) || registeredExplicitAriaRole(element)?.name !== 'region' || accessibleNameDetails(element).name) continue;
    add(signals, REGION_NAME_RULE, 'warning', element,
      'Explicit region has no accessible name.', 'role=region; name empty');
  }
}

function evaluateLandmarkCoverage(signals: DocumentStructureSignal[]) {
  const uncovered = scopedElements(document, CONTENT_SELECTOR)
    .filter((element) => meaningfulContent(element) && !nearestContainingLandmark(element, true));
  const uncoveredSet = new Set(uncovered);
  const roots = uncovered.filter((element) => {
    let parent = element.parentElement;
    while (parent) {
      if (uncoveredSet.has(parent)) return false;
      parent = parent.parentElement;
    }
    return true;
  }).slice(0, 20);

  for (const element of roots) add(signals, LANDMARK_COVERAGE_RULE, 'review', element,
    'Visible content is outside exposed landmarks.', `${element.tagName.toLowerCase()} outside landmarks`);
}

export function evaluateDocumentStructure(): DocumentStructureSignal[] {
  const signals: DocumentStructureSignal[] = [];
  evaluateHeadings(signals);
  evaluateLandmarkPlacement(signals);
  evaluateLandmarkCoverage(signals);
  return signals;
}
