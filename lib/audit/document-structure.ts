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
  containingLandmarkRole,
  landmarkRoleForElement,
  landmarkScopeOwner,
  pageLandmarks,
  type LandmarkRole,
} from './landmarks';
import { scopedElements } from './scan-elements';
import { registeredExplicitAriaRole } from './standards-registry';

export interface DocumentStructureSignal {
  rule: DocumentStructureRuntimeRule;
  outcome: 'review' | 'warning';
  element: Element;
  description: string;
  evidence: string;
}

const text = (value: string | null | undefined) => value?.replace(/\s+/g, ' ').trim() ?? '';

function headingLevel(element: Element): number | null {
  const role = element.hasAttribute('role') ? registeredExplicitAriaRole(element)?.name : undefined;
  if (role && role !== 'heading') return null;
  if (role === 'heading') {
    const level = Number.parseInt(element.getAttribute('aria-level') ?? '', 10);
    if (level > 0) return level;
  }
  return /^H[1-6]$/.test(element.tagName) ? Number(element.tagName[1]) : null;
}

function headingHasContent(element: Element): boolean {
  if (text(element.textContent) || accessibleNameDetails(element).name) return true;
  for (const child of element.querySelectorAll('img[alt],[aria-label],[aria-labelledby],svg title')) {
    if (text(child.textContent) || accessibleNameDetails(child).name) return true;
  }
  return false;
}

function paragraphLooksLikeHeading(element: HTMLParagraphElement): boolean {
  const value = text(element.textContent);
  if (!value || value.length > 120 || element.closest('h1,h2,h3,h4,h5,h6,[role="heading"]')) return false;
  const style = getComputedStyle(element);
  const size = Number.parseFloat(style.fontSize) || 16;
  const bodySize = Number.parseFloat(getComputedStyle(document.body).fontSize) || 16;
  const weight = Number.parseInt(style.fontWeight, 10) || (style.fontWeight === 'bold' ? 700 : 400);
  return weight >= 600 && size >= Math.max(bodySize * 1.2, bodySize + 2);
}

function meaningful(element: Element): boolean {
  if (isProgrammaticallyHidden(element)) return false;
  if (element instanceof HTMLImageElement) return !isMarkedDecorative(element);
  if (element instanceof HTMLInputElement && element.type === 'hidden') return false;
  return Boolean(text(element.textContent)) || /^(INPUT|SELECT|TEXTAREA|BUTTON|A|IMG|VIDEO|AUDIO|CANVAS|SVG|TABLE)$/.test(element.tagName);
}

export function evaluateDocumentStructure(): DocumentStructureSignal[] {
  const signals: DocumentStructureSignal[] = [];
  const add = (
    rule: DocumentStructureRuntimeRule,
    outcome: 'review' | 'warning',
    element: Element,
    description: string,
    evidence: string,
  ) => signals.push({ rule, outcome, element, description, evidence });

  const headings = scopedElements(document, 'h1,h2,h3,h4,h5,h6,[role]')
    .filter((element) => headingLevel(element) != null && !isProgrammaticallyHidden(element));
  if (!headings.some((heading) => headingLevel(heading) === 1)) {
    add(PAGE_LEVEL_ONE_HEADING_RULE, 'review', document.body ?? document.documentElement,
      'No exposed level-one heading was found.', 'No H1 or aria-level=1 heading.');
  }
  for (const heading of headings) {
    if (!headingHasContent(heading)) add(EMPTY_HEADING_RULE, 'review', heading,
      'This exposed heading has no usable content.', `heading level=${headingLevel(heading)}`);
  }
  for (const paragraph of scopedElements(document, 'p')) {
    if (!(paragraph instanceof HTMLParagraphElement) || isProgrammaticallyHidden(paragraph) || !paragraphLooksLikeHeading(paragraph)) continue;
    const style = getComputedStyle(paragraph);
    add(PARAGRAPH_AS_HEADING_RULE, 'review', paragraph,
      'This styled paragraph may be acting as a heading.', `${style.fontSize}/${style.fontWeight}: ${text(paragraph.textContent).slice(0, 120)}`);
  }

  const landmarks = pageLandmarks();
  for (const landmark of landmarks) {
    const role = landmarkRoleForElement(landmark);
    if (!role || !(['banner', 'main', 'complementary', 'contentinfo'] as LandmarkRole[]).includes(role)) continue;
    const parentRole = containingLandmarkRole(landmark);
    if (parentRole) add(TOP_LEVEL_LANDMARK_RULE, 'review', landmark,
      `${role} is nested inside ${parentRole}.`, `${role} inside ${parentRole}`);
  }
  for (const role of ['banner', 'contentinfo'] as const) {
    const matches = landmarks.filter((element) => landmarkRoleForElement(element) === role);
    for (const landmark of matches) {
      const owner = landmarkScopeOwner(landmark);
      const count = matches.filter((element) => landmarkScopeOwner(element) === owner).length;
      if (count > 1) add(DUPLICATE_SINGLETON_LANDMARK_RULE, 'review', landmark,
        `${count} ${role} landmarks share one scope.`, `${count} ${role} landmarks`);
    }
  }
  for (const element of scopedElements(document, '[role]')) {
    if (!isProgrammaticallyHidden(element) && registeredExplicitAriaRole(element)?.name === 'region' && !accessibleNameDetails(element).name) {
      add(REGION_NAME_RULE, 'warning', element, 'Explicit region has no accessible name.', 'role=region; name empty');
    }
  }

  const uncovered = scopedElements(document, 'h1,h2,h3,h4,h5,h6,p,a,button,input,select,textarea,img,table,ul,ol,dl,video,audio,canvas,svg')
    .filter((element) => meaningful(element) && !containingLandmarkRole(element, true));
  const set = new Set(uncovered);
  for (const element of uncovered) {
    let parent = element.parentElement;
    while (parent && !set.has(parent)) parent = parent.parentElement;
    if (parent) continue;
    add(LANDMARK_COVERAGE_RULE, 'review', element,
      'Visible content is outside exposed landmarks.', `${element.tagName.toLowerCase()} outside landmarks`);
    if (signals.filter(({ rule }) => rule === LANDMARK_COVERAGE_RULE).length >= 20) break;
  }

  return signals;
}
