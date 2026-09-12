import {
  ARIA_REFERENCE_RULE,
  INVALID_ARIA_ROLE_RULE,
  REQUIRED_ARIA_PROPERTY_RULE,
  UNSUPPORTED_ARIA_PROPERTY_RULE,
} from '../../shared/aria-authoring-rules';
import { RULES, type RuleDefinition } from '../../shared/rule-catalog';
import {
  RANGE_INDICATOR_NAME_RULE,
  SPECIALIZED_ARIA_NAME_WARNING_RULE,
  SPECIALIZED_CONTROL_NAME_RULE,
} from '../../shared/specialized-accessible-name-rules';
import type { AccessibleNameEvidence, ScanIssue, ScanResult, ScanRuleResult } from '../../shared/types';
import { accessibleNameDiagnostics, selectorFor } from './dom';
import {
  effectiveAriaValue,
  elementInternalsElements,
  elementInternalsLabelText,
  elementInternalsRole,
  elementInternalsSnapshot,
  hasEffectiveAriaValue,
  refreshElementInternalsSnapshots,
} from './element-internals-bridge';
import { ariaRoleRecord, registeredExplicitAriaRole } from './standards-registry';
import type { ScanRoot } from './scan-elements';

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const FORM_FIELD_ROLES = new Set(['checkbox', 'combobox', 'listbox', 'menuitemcheckbox', 'menuitemradio', 'radio', 'searchbox', 'slider', 'spinbutton', 'switch', 'textbox']);
const NAME_FROM_CONTENT_ROLES = new Set(['button', 'checkbox', 'link', 'menuitem', 'menuitemcheckbox', 'menuitemradio', 'option', 'radio', 'switch', 'tab', 'treeitem']);
const SPECIALIZED_CONTROL_ROLES = new Set(['tab', 'tooltip']);
const RANGE_ROLES = new Set(['meter', 'progressbar']);
const WARNING_NAME_ROLES = new Set(['dialog', 'alertdialog', 'treeitem']);
const IDREF_PROPERTIES = new Set(['aria-activedescendant', 'aria-controls', 'aria-describedby', 'aria-details', 'aria-errormessage', 'aria-flowto', 'aria-labelledby', 'aria-owns']);

interface BridgedName {
  evidence: AccessibleNameEvidence;
  bridgeSource?: string;
}

function semanticRole(element: Element): string | null {
  return registeredExplicitAriaRole(element)?.name ?? elementInternalsRole(element) ?? null;
}

function textFromReferences(raw: string | null): string {
  if (!raw) return '';
  return raw
    .trim()
    .split(/\s+/)
    .map((id) => document.getElementById(id))
    .filter((target): target is Element => target != null)
    .map((target) => accessibleNameDiagnostics(target).name || target.textContent || '')
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function bridgedAccessibleName(element: Element, role: string): BridgedName {
  const dom = accessibleNameDiagnostics(element);
  if (dom.name) return { evidence: { ...dom } };

  const snapshot = elementInternalsSnapshot(element);
  if (!snapshot) return { evidence: { ...dom, role } };

  if (!element.hasAttribute('aria-labelledby')) {
    const labelledBy = snapshot.aria['aria-labelledby'];
    const value = textFromReferences(labelledBy ?? null);
    if (value) {
      return {
        bridgeSource: 'element-internals aria-labelledby',
        evidence: {
          name: value,
          source: 'element-internals-aria-labelledby',
          role,
          candidates: [{ source: 'element-internals-aria-labelledby', selector: selectorFor(element), value, used: true }],
        },
      };
    }
  }

  if (!element.hasAttribute('aria-label')) {
    const ariaLabel = snapshot.aria['aria-label']?.replace(/\s+/g, ' ').trim();
    if (ariaLabel) {
      return {
        bridgeSource: 'element-internals aria-label',
        evidence: {
          name: ariaLabel,
          source: 'element-internals-aria-label',
          role,
          candidates: [{ source: 'element-internals-aria-label', selector: selectorFor(element), value: ariaLabel, used: true }],
        },
      };
    }
  }

  const label = elementInternalsLabelText(element);
  if (label) {
    return {
      bridgeSource: 'ElementInternals.labels',
      evidence: {
        name: label,
        source: 'element-internals-label',
        role,
        candidates: [{ source: 'element-internals-label', selector: selectorFor(element), value: label, used: true }],
      },
    };
  }

  if (NAME_FROM_CONTENT_ROLES.has(role)) {
    const content = (element.textContent ?? '').replace(/\s+/g, ' ').trim();
    if (content) {
      return {
        bridgeSource: 'ElementInternals role + host text content',
        evidence: {
          name: content,
          source: 'subtree',
          role,
          candidates: [{ source: 'subtree', selector: selectorFor(element), value: content, used: true }],
        },
      };
    }
  }

  return { evidence: { ...dom, role } };
}

function nameRuleFor(role: string): { rule: RuleDefinition; outcome: 'fail' | 'warning' } | undefined {
  if (role === 'button') return { rule: RULES.buttonName, outcome: 'fail' };
  if (role === 'link') return { rule: RULES.linkName, outcome: 'fail' };
  if (role === 'img') return { rule: RULES.imageName, outcome: 'fail' };
  if (FORM_FIELD_ROLES.has(role)) return { rule: RULES.formFieldName, outcome: 'fail' };
  if (SPECIALIZED_CONTROL_ROLES.has(role)) return { rule: SPECIALIZED_CONTROL_NAME_RULE, outcome: 'fail' };
  if (RANGE_ROLES.has(role)) return { rule: RANGE_INDICATOR_NAME_RULE, outcome: 'fail' };
  if (WARNING_NAME_ROLES.has(role)) return { rule: SPECIALIZED_ARIA_NAME_WARNING_RULE, outcome: 'warning' };
  return undefined;
}

function finding(rule: RuleDefinition, outcome: 'fail' | 'warning', element: Element, role: string, name: BridgedName): ScanIssue {
  return {
    id: uid(),
    ruleId: rule.id,
    title: rule.title,
    description: outcome === 'fail'
      ? 'The custom element exposes this semantic role through ElementInternals, but its supported accessible-name computation is empty.'
      : 'The custom element exposes this ARIA semantic role through ElementInternals without a usable accessible name. FocusTrace keeps this as an authoring warning.',
    severity: rule.severity,
    outcome,
    targets: [selectorFor(element)],
    evidence: `role=${JSON.stringify(role)}; source=ElementInternals page-world bridge; accessible name=${JSON.stringify(name.evidence.name)}.`,
    accessibleName: name.evidence,
    references: rule.references,
  };
}

function ariaFinding(rule: RuleDefinition, element: Element, detail: string): ScanIssue {
  return {
    id: uid(),
    ruleId: rule.id,
    title: rule.title,
    description: 'FocusTrace observed this ARIA semantic through the normalized ElementInternals page-world bridge.',
    severity: rule.severity,
    outcome: 'warning',
    targets: [selectorFor(element)],
    evidence: `${detail} Source: ElementInternals page-world bridge.`,
    references: rule.references,
  };
}

function ruleResult(result: ScanResult, ruleId: string): ScanRuleResult | undefined {
  return result.ruleResults?.find((entry) => entry.ruleId === ruleId);
}

function adjustRuleResult(result: ScanResult, ruleId: string, delta: Partial<Pick<ScanRuleResult, 'applicable' | 'passed' | 'failures' | 'warnings'>>): void {
  const entry = ruleResult(result, ruleId);
  if (!entry) return;
  if (delta.applicable) entry.applicable += delta.applicable;
  if (delta.passed) entry.passed += delta.passed;
  if (delta.failures) entry.failures += delta.failures;
  if (delta.warnings) entry.warnings += delta.warnings;
}

function removeFalseNameFinding(result: ScanResult, ruleId: string, element: Element): boolean {
  const selector = selectorFor(element);
  const beforeIssues = result.issues.length;
  const beforeWarnings = result.warnings.length;
  result.issues = result.issues.filter((issue) => !(issue.ruleId === ruleId && issue.targets.includes(selector)));
  result.warnings = result.warnings.filter((issue) => !(issue.ruleId === ruleId && issue.targets.includes(selector)));
  const removed = beforeIssues - result.issues.length + beforeWarnings - result.warnings.length;
  if (!removed) return false;
  const entry = ruleResult(result, ruleId);
  if (entry) {
    entry.failures = Math.max(0, entry.failures - removed);
    entry.warnings = Math.max(0, entry.warnings - removed);
    entry.passed += 1;
  }
  result.passes += 1;
  return true;
}

function appendNameSemantics(result: ScanResult, element: Element, role: string): void {
  const contract = nameRuleFor(role);
  if (!contract) return;
  const name = bridgedAccessibleName(element, role);
  const existingApplicability = element.hasAttribute('role');

  if (name.evidence.name) {
    if (existingApplicability && removeFalseNameFinding(result, contract.rule.id, element)) return;
    if (!existingApplicability) {
      adjustRuleResult(result, contract.rule.id, { applicable: 1, passed: 1 });
      result.passes += 1;
    }
    return;
  }

  if (existingApplicability) return;
  const issue = finding(contract.rule, contract.outcome, element, role, name);
  if (contract.outcome === 'fail') result.issues.push(issue);
  else result.warnings.push(issue);
  adjustRuleResult(result, contract.rule.id, {
    applicable: 1,
    ...(contract.outcome === 'fail' ? { failures: 1 } : { warnings: 1 }),
  });
}

function appendAriaSemantics(result: ScanResult, element: Element, role: string): void {
  const roleRecord = ariaRoleRecord(role);
  if (!roleRecord) {
    if (!element.hasAttribute('role')) {
      result.warnings.push(ariaFinding(INVALID_ARIA_ROLE_RULE, element, `ElementInternals.role=${JSON.stringify(role)} does not resolve to a registered non-abstract ARIA role.`));
      adjustRuleResult(result, INVALID_ARIA_ROLE_RULE.id, { applicable: 1, warnings: 1 });
    }
    return;
  }

  const snapshot = elementInternalsSnapshot(element);
  if (!snapshot) return;
  const effectiveProperties = Object.entries(snapshot.aria).filter(([property]) => !element.hasAttribute(property));

  for (const [property, value] of effectiveProperties) {
    if (!roleRecord.supportedProperties.includes(property)) {
      result.warnings.push(ariaFinding(UNSUPPORTED_ARIA_PROPERTY_RULE, element, `${property}=${JSON.stringify(value)} is not supported by role=${JSON.stringify(role)}.`));
      adjustRuleResult(result, UNSUPPORTED_ARIA_PROPERTY_RULE.id, { applicable: 1, warnings: 1 });
    }

    if (IDREF_PROPERTIES.has(property)) {
      const ids = value.trim().split(/\s+/).filter(Boolean);
      const missing = ids.filter((id) => document.getElementById(id) == null);
      if (!ids.length || missing.length) {
        result.warnings.push(ariaFinding(ARIA_REFERENCE_RULE, element, !ids.length
          ? `${property} is empty.`
          : `${property} references missing ID${missing.length > 1 ? 's' : ''}: ${missing.map((id) => `#${id}`).join(', ')}.`));
        adjustRuleResult(result, ARIA_REFERENCE_RULE.id, { applicable: 1, warnings: 1 });
      }
    }
  }

  for (const property of roleRecord.requiredProperties) {
    if (hasEffectiveAriaValue(element, property as Parameters<typeof hasEffectiveAriaValue>[1])) continue;
    result.warnings.push(ariaFinding(REQUIRED_ARIA_PROPERTY_RULE, element, `role=${JSON.stringify(role)} requires ${property}, but neither an author attribute nor a captured ElementInternals reflection supplies it.`));
    adjustRuleResult(result, REQUIRED_ARIA_PROPERTY_RULE.id, { applicable: 1, warnings: 1 });
  }
}

export function appendElementInternalsSemantics(result: ScanResult, root: ScanRoot): void {
  refreshElementInternalsSnapshots(root);

  for (const element of elementInternalsElements(root)) {
    const snapshot = elementInternalsSnapshot(element);
    if (!snapshot) continue;

    const hidden = effectiveAriaValue(element, 'aria-hidden')?.trim().toLowerCase() === 'true';
    if (hidden) continue;

    const role = semanticRole(element);
    if (!role) continue;
    appendNameSemantics(result, element, role);
    appendAriaSemantics(result, element, role);
  }
}
