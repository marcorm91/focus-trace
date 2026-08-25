import type { AppLanguage } from '../../shared/i18n';
import type { FindingOutcome, RuntimeEvent, ScanIssue, ScanResult } from '../../shared/types';
import type { ObservedFocusPathTarget } from './focus-graph';
import type { FocusPathOverlayEntry, FocusPathOverlayTone } from './focus-path-overlay';

function selectorsOverlap(target: string, selector: string, id?: string): boolean {
  if (target === selector) return true;
  if (target.startsWith(`${selector} `) || target.startsWith(`${selector} >`)) return true;
  if (selector.startsWith(`${target} `) || selector.startsWith(`${target} >`)) return true;
  return Boolean(id && target.includes(`#${id}`));
}

function scanFindingsForTarget(scan: ScanResult | undefined, target: ObservedFocusPathTarget): ScanIssue[] {
  if (!scan) return [];
  return [...scan.issues, ...scan.review, ...(scan.warnings ?? [])].filter((issue) =>
    issue.targets.some((selector) =>
      selectorsOverlap(selector, target.element.selector, target.element.id),
    ),
  );
}

function runtimeFindingsForTarget(events: RuntimeEvent[], target: ObservedFocusPathTarget): RuntimeEvent[] {
  return events.filter((event) =>
    Boolean(
      event.outcome &&
      event.element &&
      selectorsOverlap(event.element.selector, target.element.selector, target.element.id),
    ),
  );
}

function translated(language: AppLanguage, english: string, spanish: string): string {
  return language === 'es' ? spanish : english;
}

function outcomeToken(outcome: FindingOutcome): string {
  if (outcome === 'fail') return 'FAIL';
  if (outcome === 'warning') return 'WARNING';
  return 'REVIEW';
}

function scanFindingStatus(issue: ScanIssue): string {
  return `${outcomeToken(issue.outcome)} · ${issue.ruleId}`;
}

function runtimeFindingStatus(event: RuntimeEvent): string {
  const token = event.outcome ? outcomeToken(event.outcome) : event.severity.toUpperCase();
  return event.ruleId ? `${token} · ${event.ruleId}` : `${token} · Runtime`;
}

export function buildPageInspectorEntries(
  focusPath: ObservedFocusPathTarget[],
  scan: ScanResult | undefined,
  events: RuntimeEvent[],
  language: AppLanguage,
): FocusPathOverlayEntry[] {
  return focusPath.map((target) => {
    const scanFindings = scanFindingsForTarget(scan, target);
    const runtimeFindings = runtimeFindingsForTarget(events, target);
    const missingName = !target.element.name?.trim();
    const positiveTabindex = (target.element.attributes?.tabIndex ?? 0) > 0;
    const repeated = target.orders.length > 1;
    const failedScan = scanFindings.some((issue) => issue.outcome === 'fail');
    const failedRuntime = runtimeFindings.some((event) => event.outcome === 'fail');

    let tone: FocusPathOverlayTone = 'ok';
    if (failedScan || failedRuntime) tone = 'fail';
    else if (scanFindings.length || runtimeFindings.length || missingName || positiveTabindex || repeated) tone = 'review';

    const primaryScan = scanFindings.find((issue) => issue.outcome === 'fail') ?? scanFindings[0];
    const primaryRuntime = runtimeFindings.find((event) => event.outcome === 'fail') ?? runtimeFindings[0];

    let status = translated(language, 'No signals', 'Sin señales');
    let detail = translated(
      language,
      'The component has an accessible name and no linked findings were detected.',
      'El componente tiene nombre accesible y no se han detectado hallazgos vinculados.',
    );

    if (primaryScan) {
      status = scanFindingStatus(primaryScan);
      detail = `${primaryScan.title}. ${primaryScan.description}`;
    } else if (primaryRuntime) {
      status = runtimeFindingStatus(primaryRuntime);
      detail = `${primaryRuntime.title}${primaryRuntime.detail ? `. ${primaryRuntime.detail}` : ''}`;
    } else if (missingName) {
      status = translated(language, 'REVIEW · accessible name', 'REVIEW · nombre accesible');
      detail = translated(
        language,
        'This focus target has no captured accessible name.',
        'Este destino de foco no tiene un nombre accesible capturado.',
      );
    } else if (positiveTabindex) {
      status = 'REVIEW · tabindex';
      detail = translated(
        language,
        `tabindex="${target.element.attributes?.tabIndex}" changes the natural keyboard order.`,
        `tabindex="${target.element.attributes?.tabIndex}" altera el orden natural de teclado.`,
      );
    } else if (repeated) {
      status = translated(language, 'REVIEW · repeated focus', 'REVIEW · foco repetido');
      detail = translated(
        language,
        'This component appears more than once in the recorded focus path.',
        'Este componente aparece más de una vez en el recorrido de foco grabado.',
      );
    }

    const role = target.element.role || target.element.tag;
    const name = target.element.name?.trim() || translated(language, 'Unnamed', 'Sin nombre');

    return {
      selector: target.element.selector,
      label: target.label,
      orders: target.orders,
      tone,
      status,
      detail,
      meta: `${role} · ${name}`,
      findingCount: scanFindings.length + runtimeFindings.length,
    };
  });
}
