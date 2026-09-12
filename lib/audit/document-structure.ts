import type { RuleDefinition } from '../../shared/rule-catalog';
import {
  DUPLICATE_SINGLETON_LANDMARK_RULE,
  EMPTY_HEADING_RULE,
  LANDMARK_COVERAGE_RULE,
  PAGE_LEVEL_ONE_HEADING_RULE,
  PARAGRAPH_AS_HEADING_RULE,
  REGION_NAME_RULE,
  TOP_LEVEL_LANDMARK_RULE,
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
  rule: RuleDefinition;
  outcome: DocumentStructureOutcome;
  element: Element;
  description: string;
  evidence: string;
}

const TOP_LEVEL_ROLES = new Set<LandmarkRole>(['banner', 'main', 'complementary', 'contentinfo']);
const CONTENT_SELECTOR = 'h1, h2, h3, h4, h5, h6, p, a, button, input, select, textarea, img, table, ul, ol, dl, video, audio, canvas, svg';

function normalizedText(value: string | null | undefined): string {
  return value?.replace(/\s+/g, ' ').trim() ?? '';
}

function headingLevel(element: Element): number | null {
  const explicit = element.hasAttribute('role') ? registeredExplicitAriaRole(element)?.name : undefined;
  if (explicit && explicit !== 'heading') return null;
  if (explicit === 'heading') {
    const raw = element.getAttribute('aria-level');
    if (raw) {
      const parsed = Number.parseInt(raw, 10);
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
  }
  if (/^H[1-6]$/.test(element.tagName)) return Number(element.tagName.slice(1));
  return null;
}

function headingHasUsableContent(element: Element): boolean {
  if (normalizedText(element.textContent)) return true;
  if (accessibleNameDetails(element).name) return true;
  for (const descendant of element.querySelectorAll('img[alt], [aria-label], [aria-labelledby], svg title')) {
    if (normalizedText(descendant.textContent) || accessibleNameDetails(descendant).name) return true;
  }
  return false;
}

function numericFontWeight(value: string): number {
  if (value === 'bold') return 700;
  if (value === 'normal') return 400;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 400;
}

function paragraphLooksLikeHeading(element: HTMLParagraphElement): boolean {
  const text = normalizedText(element.textContent);
  if (!text || text.length > 120 || element.closest('h1, h2, h3, h4, h5, h6, [role="heading"]')) return false;
  const style = getComputedStyle(element);
  const bodyStyle = document.body ? getComputedStyle(document.body) : style;
  const fontSize = Number.parseFloat(style.fontSize) || 16;
  const bodySize = Number.parseFloat(bodyStyle.fontSize) || 16;
  const weight = numericFontWeight(style.fontWeight);
  return weight >= 600 && fontSize >= Math.max(bodySize * 1.2, bodySize + 2);
}

function meaningfulContent(element: Element): boolean {
  if (isProgrammaticallyHidden(element)) return false;
  if (element instanceof HTMLImageElement) return !isMarkedDecorative(element);
  if (element instanceof HTMLInputElement && element.type.toLowerCase() === 'hidden') return false;
  if (['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON', 'A', 'IMG', 'VIDEO', 'AUDIO', 'CANVAS', 'SVG', 'TABLE'].includes(element.tagName)) return true;
  return Boolean(normalizedText(element.textContent));
}

function add(
  signals: DocumentStructureSignal[],
  rule: RuleDefinition,
  outcome: DocumentStructureOutcome,
  element: Element,
  description: string,
  evidence: string,
) {
  signals.push({ rule, outcome, element, description, evidence });
}

function evaluateHeadings(signals: DocumentStructureSignal[]) {
  const headings = scopedElements(document, 'h1, h2, h3, h4, h5, h6, [role]')
    .filter((element) => headingLevel(element) != null && !isProgrammaticallyHidden(element));

  if (!headings.some((heading) => headingLevel(heading) === 1)) {
    add(
      signals,
      PAGE_LEVEL_ONE_HEADING_RULE,
      'review',
      document.body ?? document.documentElement,
      'The page does not expose a visible level-one heading. Review whether a level-one heading should identify the primary page topic.',
      'No visible native H1 or role="heading" with aria-level="1" was detected.',
    );
  }

  for (const heading of headings) {
    if (headingHasUsableContent(heading)) continue;
    add(
      signals,
      EMPTY_HEADING_RULE,
      'review',
      heading,
      'This exposed heading does not contain text or another usable naming contribution. Review whether the heading is accidental, visually generated, or missing its intended content.',
      `Resolved heading level=${headingLevel(heading)}; no usable text or alternative contribution was detected.`,
    );
  }

  for (const paragraph of scopedElements(document, 'p')) {
    if (!(paragraph instanceof HTMLParagraphElement) || isProgrammaticallyHidden(paragraph) || !paragraphLooksLikeHeading(paragraph)) continue;
    const style = getComputedStyle(paragraph);
    add(
      signals,
      PARAGRAPH_AS_HEADING_RULE,
      'review',
      paragraph,
      'This short paragraph is visually styled like a heading but does not expose heading semantics. Review whether it represents a section heading and should use native heading markup.',
      `font-size=${style.fontSize}; font-weight=${style.fontWeight}; text=${JSON.stringify(normalizedText(paragraph.textContent).slice(0, 120))}.`,
    );
  }
}

function evaluateLandmarkPlacement(signals: DocumentStructureSignal[]) {
  const landmarks = pageLandmarks();
  for (const landmark of landmarks) {
    const role = landmarkRoleForElement(landmark);
    if (!role || !TOP_LEVEL_ROLES.has(role)) continue;
    const parent = nearestContainingLandmark(landmark);
    if (!parent) continue;
    add(
      signals,
      TOP_LEVEL_LANDMARK_RULE,
      'review',
      landmark,
      `The ${role} landmark is nested inside a ${parent.role} landmark. Review whether this page-level landmark should be moved to the top level of its document/application scope.`,
      `${role} landmark is contained by ${parent.role} landmark.`,
    );
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
      for (const landmark of group) {
        add(
          signals,
          DUPLICATE_SINGLETON_LANDMARK_RULE,
          'review',
          landmark,
          `This document scope exposes ${group.length} ${role} landmarks. Review whether one page-level ${role} region is sufficient or whether nested document/application scopes are intended.`,
          `${group.length} exposed ${role} landmarks share the same document/application scope.`,
        );
      }
    }
  }

  for (const element of scopedElements(document, '[role]')) {
    if (isProgrammaticallyHidden(element) || registeredExplicitAriaRole(element)?.name !== 'region') continue;
    if (accessibleNameDetails(element).name) continue;
    add(
      signals,
      REGION_NAME_RULE,
      'warning',
      element,
      'An explicitly authored region landmark has no accessible name. WAI-ARIA requires authors to provide a name that identifies the purpose of a region.',
      'role="region" resolved with an empty accessible name.',
    );
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

  for (const element of roots) {
    add(
      signals,
      LANDMARK_COVERAGE_RULE,
      'review',
      element,
      'This perceivable page content is not contained within an exposed landmark. Review whether the page can be organized so landmark navigation covers the relevant content.',
      `No banner, complementary, contentinfo, form, main, navigation, region or search landmark contains this ${element.tagName.toLowerCase()} element.`,
    );
  }
}

export function evaluateDocumentStructure(): DocumentStructureSignal[] {
  const signals: DocumentStructureSignal[] = [];
  evaluateHeadings(signals);
  evaluateLandmarkPlacement(signals);
  evaluateLandmarkCoverage(signals);
  return signals;
}

