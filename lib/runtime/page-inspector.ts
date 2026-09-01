import { localizedScanIssue, type AppLanguage } from '../../shared/i18n';
import type { FindingOutcome, RuntimeEvent, ScanIssue, ScanResult } from '../../shared/types';
import { humanRuntimeEventTitle } from './explanations';
import type { ObservedFocusPathTarget } from './focus-graph';
import type { FocusPathOverlayEntry, FocusPathOverlayTone } from './focus-path-overlay';
import { humanRuntimeEventDetail } from './runtime-presentation';

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

function outcomeToken(outcome: FindingOutcome, language: AppLanguage): string {
  if (outcome === 'fail') return translated(language, 'FAIL', 'FALLO');
  if (outcome === 'warning') return translated(language, 'WARNING', 'AVISO');
  return translated(language, 'REVIEW', 'REVISIÓN');
}

function scanFindingStatus(issue: ScanIssue, language: AppLanguage): string {
  return `${outcomeToken(issue.outcome, language)} · ${issue.ruleId}`;
}

function runtimeFindingStatus(event: RuntimeEvent, language: AppLanguage): string {
  const token = event.outcome
    ? outcomeToken(event.outcome, language)
    : event.severity.toUpperCase();
  return event.ruleId ? `${token} · ${event.ruleId}` : `${token} · Runtime`;
}

function findingSummary(count: number, language: AppLanguage): string {
  if (language === 'es') return count === 1 ? '1 hallazgo vinculado' : `${count} hallazgos vinculados`;
  return count === 1 ? '1 linked finding' : `${count} linked findings`;
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
      const localized = localizedScanIssue(primaryScan, language);
      status = scanFindingStatus(primaryScan, language);
      detail = `${localized.title}. ${localized.description}`;
    } else if (primaryRuntime) {
      const runtimeDetail = humanRuntimeEventDetail(primaryRuntime, language);
      status = runtimeFindingStatus(primaryRuntime, language);
      detail = `${humanRuntimeEventTitle(primaryRuntime, language)}${runtimeDetail ? `. ${runtimeDetail}` : ''}`;
    } else if (missingName) {
      status = translated(language, 'REVIEW · accessible name', 'REVISIÓN · nombre accesible');
      detail = translated(
        language,
        'This focus target has no captured accessible name.',
        'Este destino de foco no tiene un nombre accesible capturado.',
      );
    } else if (positiveTabindex) {
      status = translated(language, 'REVIEW · tabindex', 'REVISIÓN · tabindex');
      detail = translated(
        language,
        `tabindex="${target.element.attributes?.tabIndex}" changes the natural keyboard order.`,
        `tabindex="${target.element.attributes?.tabIndex}" altera el orden natural de teclado.`,
      );
    } else if (repeated) {
      status = translated(language, 'REVIEW · repeated focus', 'REVISIÓN · foco repetido');
      detail = translated(
        language,
        'This component appears more than once in the recorded focus path.',
        'Este componente aparece más de una vez en el recorrido de foco grabado.',
      );
    }

    const role = target.element.role || target.element.tag;
    const name = target.element.name?.trim() || translated(language, 'Unnamed', 'Sin nombre');
    const linkedFindingCount = scanFindings.length + runtimeFindings.length;

    return {
      selector: target.element.selector,
      label: target.label,
      orders: target.orders,
      tone,
      status,
      detail,
      meta: `${role} · ${name}`,
      findingCount: linkedFindingCount,
      findingSummary: findingSummary(linkedFindingCount, language),
    };
  });
}
