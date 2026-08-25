import type { AppLanguage } from '../../shared/i18n';
import type { HeadingSignal, RuntimeEvent, ScanIssue, ScanResult } from '../../shared/types';

export type SessionSuggestionPriority = 'high' | 'medium' | 'low';
export type SessionSuggestionSource = 'analysis' | 'focus' | 'headings' | 'coverage';

export interface SessionSuggestion {
  id: string;
  priority: SessionSuggestionPriority;
  source: SessionSuggestionSource;
  title: string;
  detail: string;
}

function translated(language: AppLanguage, english: string, spanish: string): string {
  return language === 'es' ? spanish : english;
}

function uniqueIssues(issues: ScanIssue[]): ScanIssue[] {
  const seen = new Set<string>();
  return issues.filter((issue) => {
    if (seen.has(issue.ruleId)) return false;
    seen.add(issue.ruleId);
    return true;
  });
}

function headingSignalCount(scan: ScanResult | undefined, signal: HeadingSignal): number {
  return scan?.headings?.filter((heading) => heading.signals.includes(signal)).length ?? 0;
}

export function buildSessionSuggestions(
  scan: ScanResult | undefined,
  events: RuntimeEvent[],
  language: AppLanguage,
): SessionSuggestion[] {
  const suggestions: SessionSuggestion[] = [];

  for (const issue of uniqueIssues(scan?.issues ?? []).slice(0, 5)) {
    suggestions.push({
      id: `analysis-${issue.ruleId}`,
      priority: 'high',
      source: 'analysis',
      title: issue.title,
      detail: issue.description,
    });
  }

  for (const issue of uniqueIssues(scan?.review ?? []).slice(0, 3)) {
    suggestions.push({
      id: `review-${issue.ruleId}`,
      priority: 'medium',
      source: 'analysis',
      title: issue.title,
      detail: issue.description,
    });
  }

  const runtimeFindings = events.filter((event) => event.outcome);
  const seenRuntime = new Set<string>();
  for (const event of runtimeFindings) {
    const key = event.ruleId ?? event.title;
    if (seenRuntime.has(key)) continue;
    seenRuntime.add(key);
    suggestions.push({
      id: `focus-${event.id}`,
      priority: ['critical', 'serious'].includes(event.severity) ? 'high' : 'medium',
      source: 'focus',
      title: event.title,
      detail: event.detail ?? translated(
        language,
        'Review the focused component in the recorded page context.',
        'Revisa el componente enfocado dentro del contexto grabado de la página.',
      ),
    });
  }

  const multipleH1 = headingSignalCount(scan, 'multiple-h1');
  if (multipleH1 > 0) {
    suggestions.push({
      id: 'headings-multiple-h1',
      priority: 'medium',
      source: 'headings',
      title: translated(language, 'Review the main heading structure', 'Revisar la estructura de encabezados principales'),
      detail: translated(
        language,
        `${multipleH1} H1 nodes were found. Confirm that each one represents a valid main section; this is not an automatic WCAG failure.`,
        `Se han encontrado ${multipleH1} nodos H1. Confirma que cada uno representa una sección principal válida; no es un fallo WCAG automático.`,
      ),
    });
  }

  const jumps = headingSignalCount(scan, 'level-jump');
  if (jumps > 0) {
    suggestions.push({
      id: 'headings-level-jump',
      priority: 'medium',
      source: 'headings',
      title: translated(language, 'Review skipped heading levels', 'Revisar saltos de nivel en encabezados'),
      detail: translated(
        language,
        `${jumps} heading level jump${jumps === 1 ? '' : 's'} may make the document hierarchy harder to understand.`,
        `Hay ${jumps} salto${jumps === 1 ? '' : 's'} de nivel que puede${jumps === 1 ? '' : 'n'} dificultar la comprensión de la jerarquía.`,
      ),
    });
  }

  const empty = headingSignalCount(scan, 'empty');
  if (empty > 0) {
    suggestions.push({
      id: 'headings-empty',
      priority: 'high',
      source: 'headings',
      title: translated(language, 'Remove or name empty headings', 'Eliminar o completar encabezados vacíos'),
      detail: translated(
        language,
        `${empty} empty heading${empty === 1 ? '' : 's'} provide no useful document structure.`,
        `Hay ${empty} encabezado${empty === 1 ? '' : 's'} vacío${empty === 1 ? '' : 's'} que no aporta${empty === 1 ? '' : 'n'} estructura útil.`,
      ),
    });
  }

  const focusEvents = events.filter((event) => event.kind === 'focus');
  if (focusEvents.length === 0) {
    suggestions.push({
      id: 'coverage-focus',
      priority: 'low',
      source: 'coverage',
      title: translated(language, 'Complete a keyboard focus journey', 'Completar un recorrido de foco por teclado'),
      detail: translated(
        language,
        'No manual or automatic focus journey is included in this report yet.',
        'Este informe todavía no incluye un recorrido de foco manual ni automático.',
      ),
    });
  }

  const priorityOrder: Record<SessionSuggestionPriority, number> = { high: 0, medium: 1, low: 2 };
  return suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
}
