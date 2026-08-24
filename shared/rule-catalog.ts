import type { Severity, StandardReference } from './types';

export interface RuleDefinition {
  id: string;
  title: string;
  severity: Severity;
  references: StandardReference[];
}

const wcag = (id: string, label: string, level: 'A' | 'AA' | 'AAA', anchor: string): StandardReference => ({
  type: 'WCAG',
  id,
  label,
  level,
  status: 'normative',
  url: `https://www.w3.org/TR/WCAG22/#${anchor}`,
});

const act = (id: string, label: string): StandardReference => ({
  type: 'ACT',
  id,
  label,
  status: 'proposed',
  url: `https://www.w3.org/WAI/standards-guidelines/act/rules/${id}/proposed/`,
});

const apgDialog: StandardReference = {
  type: 'WAI-ARIA APG',
  id: 'dialog-modal',
  label: 'Dialog (Modal) Pattern',
  status: 'informative',
  url: 'https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/',
};

export const RULES = {
  pageTitle: { id: 'FT-WCAG-001', title: 'HTML page has a non-empty title', severity: 'serious', references: [wcag('2.4.2', 'Page Titled', 'A', 'page-titled'), act('2779a5', 'HTML page has non-empty title')] },
  imageName: { id: 'FT-WCAG-002', title: 'Image has an accessible name or is marked decorative', severity: 'serious', references: [wcag('1.1.1', 'Non-text Content', 'A', 'non-text-content'), act('23a2a8', 'Image has non-empty accessible name')] },
  buttonName: { id: 'FT-WCAG-003', title: 'Button has a non-empty accessible name', severity: 'critical', references: [wcag('4.1.2', 'Name, Role, Value', 'A', 'name-role-value'), act('97a4e1', 'Button has non-empty accessible name')] },
  formFieldName: { id: 'FT-WCAG-004', title: 'Form field has a non-empty accessible name', severity: 'critical', references: [wcag('4.1.2', 'Name, Role, Value', 'A', 'name-role-value'), act('e086e5', 'Form field has non-empty accessible name')] },
  linkName: { id: 'FT-WCAG-005', title: 'Link has a non-empty accessible name', severity: 'serious', references: [wcag('4.1.2', 'Name, Role, Value', 'A', 'name-role-value'), wcag('2.4.4', 'Link Purpose (In Context)', 'A', 'link-purpose-in-context'), act('c487ae', 'Link has non-empty accessible name')] },
  ariaHiddenFocusable: { id: 'FT-WCAG-006', title: 'aria-hidden content contains a sequentially focusable element', severity: 'critical', references: [wcag('4.1.2', 'Name, Role, Value', 'A', 'name-role-value'), act('6cfa84', 'Element with aria-hidden has no content in sequential focus navigation')] },
  positiveTabindex: { id: 'FT-REVIEW-001', title: 'Positive tabindex may create an unexpected focus order', severity: 'moderate', references: [wcag('2.4.3', 'Focus Order', 'A', 'focus-order')] },
  headingJump: { id: 'FT-REVIEW-002', title: 'Heading levels skip a level', severity: 'minor', references: [wcag('1.3.1', 'Info and Relationships', 'A', 'info-and-relationships'), wcag('2.4.6', 'Headings and Labels', 'AA', 'headings-and-labels')] },
  focusLost: { id: 'FT-RUNTIME-001', title: 'Focused element removed during interaction', severity: 'serious', references: [wcag('2.4.3', 'Focus Order', 'A', 'focus-order')] },
  focusObscured: { id: 'FT-RUNTIME-002', title: 'Focused component may be completely obscured', severity: 'serious', references: [wcag('2.4.11', 'Focus Not Obscured (Minimum)', 'AA', 'focus-not-obscured-minimum')] },
  spaTitleUnchanged: { id: 'FT-RUNTIME-003', title: 'SPA route changed without a document title change', severity: 'moderate', references: [wcag('2.4.2', 'Page Titled', 'A', 'page-titled')] },
  dialogInitialFocus: { id: 'FT-APG-001', title: 'Dialog opened while focus remained outside', severity: 'serious', references: [apgDialog] },
  dialogFocusEscape: { id: 'FT-APG-002', title: 'Focus escaped an open modal dialog', severity: 'serious', references: [apgDialog] },
  dialogRestoreFocus: { id: 'FT-APG-003', title: 'Dialog closed without restoring focus to a logical target', severity: 'moderate', references: [apgDialog] },
} satisfies Record<string, RuleDefinition>;
