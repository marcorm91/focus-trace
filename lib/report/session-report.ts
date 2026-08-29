import { suggestAccessibleForeground } from '../audit/contrast';
import { groupRuntimeInteractions } from '../runtime/causality';
import {
  explanationForCause,
  humanInteractionTitle,
  humanRuntimeEventTitle,
} from '../runtime/explanations';
import { buildFocusJourney } from '../runtime/focus-journey';
import {
  buildFocusTransitionSemantics,
  focusTransitionSemanticCopy,
  primaryFocusTransitionSemantic,
  type FocusTransitionSemantic,
} from '../runtime/focus-transition-semantics';
import { localizedScanIssue, type AppLanguage } from '../../shared/i18n';
import { scanCategoryForIssue, type ScanCategory } from '../../shared/scan-categories';
import type {
  HeadingSignal,
  RuntimeEvent,
  RuntimeInteraction,
  ScanIssue,
  ScanResult,
  StandardReference,
} from '../../shared/types';

export type SessionSuggestionPriority = 'high' | 'medium' | 'low';
export type SessionSuggestionSource = 'analysis' | 'focus' | 'headings' | 'coverage';

export interface SessionSuggestion {
  id: string;
  priority: SessionSuggestionPriority;
  source: SessionSuggestionSource;
  title: string;
  detail: string;
}

export type ReportTraceTone = 'review' | 'handled' | 'observed';

export interface ReportTraceOccurrence {
  id: string;
  timestamp: number;
  interactionNumber?: number;
  trigger: string;
  chain: string[];
}

export interface ReportTraceStory {
  id: string;
  tone: ReportTraceTone;
  interactionNumber?: number;
  trigger: string;
  chain: string[];
  result: string;
  detail: string;
  impact?: string;
  recommendation?: string;
  selector?: string;
  references: StandardReference[];
  occurrenceCount: number;
  firstDetectedAt: number;
  lastDetectedAt: number;
  occurrences: ReportTraceOccurrence[];
}

export interface ReportCategorySummary {
  id: Exclude<ScanCategory, 'all'>;
  label: string;
  count: number;
}

export interface SessionReportModel {
  staticFindings: number;
  failures: number;
  reviews: number;
  warnings: number;
  runtimeFindings: number;
  runtimeOccurrences: number;
  causalInteractions: number;
  transitionReviews: number;
  handledTransitions: number;
  focusSteps: number;
  focusJumps: number;
  contrastFailures: number;
  categories: ReportCategorySummary[];
  traceStories: ReportTraceStory[];
  suggestions: SessionSuggestion[];
}

interface ReportTraceCandidate {
  identityKey: string;
  story: ReportTraceStory;
  representedEventIds: string[];
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

function categoryLabel(category: Exclude<ScanCategory, 'all'>, language: AppLanguage): string {
  if (category === 'contrast') return translated(language, 'Contrast', 'Contraste');
  if (category === 'names') return translated(language, 'Names & semantics', 'Nombres y semántica');
  if (category === 'forms') return translated(language, 'Forms', 'Formularios');
  if (category === 'structure') return translated(language, 'Structure', 'Estructura');
  if (category === 'keyboard') return translated(language, 'Keyboard', 'Teclado');
  if (category === 'aria') return 'ARIA';
  return translated(language, 'Other', 'Otros');
}

function recommendationForSemantic(
  semantic: FocusTransitionSemantic | undefined,
  language: AppLanguage,
): string | undefined {
  if (!semantic || semantic.tone !== 'review') return undefined;
  if (semantic.kind === 'focus-not-restored') {
    return translated(
      language,
      'When the dialog closes, return focus to the control that opened it or another logical destination.',
      'Al cerrar el diálogo, devuelve el foco al control que lo abrió o a otro destino lógico.',
    );
  }
  if (semantic.kind === 'focus-lost') {
    return translated(
      language,
      'Before removing or hiding the focused element, move focus to the next meaningful destination.',
      'Antes de eliminar u ocultar el elemento enfocado, mueve el foco al siguiente destino significativo.',
    );
  }
  if (semantic.kind === 'unexpected-jump') {
    return translated(
      language,
      'Review DOM order, tabindex values and any programmatic focus movement that may be skipping expected stops.',
      'Revisa el orden DOM, los valores tabindex y cualquier movimiento programático que pueda estar saltando paradas esperadas.',
    );
  }
  if (semantic.kind === 'modal-focus-escape') {
    return translated(
      language,
      'Keep keyboard focus inside the modal until it closes and preserve a logical tab sequence within it.',
      'Mantén el foco de teclado dentro del modal hasta que se cierre y conserva una secuencia de tabulación lógica.',
    );
  }
  if (semantic.kind === 'spa-focus-left-behind') {
    return translated(
      language,
      'After client-side navigation, move focus to a meaningful destination in the new view when the context changes.',
      'Tras la navegación del lado cliente, mueve el foco a un destino significativo de la nueva vista cuando cambie el contexto.',
    );
  }
  return undefined;
}

function uniqueStrings(values: string[]): string[] {
  const result: string[] = [];
  for (const value of values) {
    if (!value || result.at(-1) === value) continue;
    result.push(value);
  }
  return result;
}

function mergeReferences(left: StandardReference[], right: StandardReference[]): StandardReference[] {
  const result = [...left];
  const seen = new Set(left.map((reference) => `${reference.type}|${reference.id}|${reference.url}`));
  for (const reference of right) {
    const key = `${reference.type}|${reference.id}|${reference.url}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(reference);
  }
  return result;
}

function semanticIdentityContext(
  semantic: FocusTransitionSemantic | undefined,
  selector: string | undefined,
): string {
  if (!semantic) return selector ?? 'session';
  if (semantic.kind === 'loop-detected' && semantic.cycle?.length) return semantic.cycle.join('>');
  if (semantic.kind === 'unexpected-jump') {
    return `${semantic.from?.selector ?? 'unknown'}>${semantic.to?.selector ?? 'unknown'}`;
  }
  if (semantic.dialog?.selector) return semantic.dialog.selector;
  if (['focus-restored', 'focus-not-restored'].includes(semantic.kind) && semantic.trigger?.selector) {
    return semantic.trigger.selector;
  }
  return selector ?? 'session';
}

function candidateForInteraction(
  interaction: RuntimeInteraction,
  interactionNumber: number,
  semantics: FocusTransitionSemantic[],
  language: AppLanguage,
): ReportTraceCandidate | undefined {
  const matchingSemantics = semantics.filter((semantic) => semantic.interactionId === interaction.id);
  const semantic = primaryFocusTransitionSemantic(matchingSemantics);
  const cause = interaction.causes[0];
  const finding = interaction.events.find((event) => event.outcome != null);
  if (!semantic && !cause && !finding) return undefined;

  const semanticCopy = semantic ? focusTransitionSemanticCopy(semantic, language) : undefined;
  const causeCopy = cause ? explanationForCause(cause.type, language) : undefined;
  const trigger = humanInteractionTitle(interaction, language);
  const eventChain = interaction.events
    .filter((event) => event.id !== interaction.trigger?.id)
    .filter((event) => !['focus-walk-start', 'focus-walk-end'].includes(event.kind))
    .map((event) => humanRuntimeEventTitle(event, language));
  const chain = uniqueStrings([trigger, ...eventChain]).slice(0, 7);
  const tone: ReportTraceTone = semantic?.tone === 'positive'
    ? 'handled'
    : semantic?.tone === 'neutral'
      ? 'observed'
      : 'review';
  const referenceSource = finding?.references ?? interaction.events.find((event) => event.references?.length)?.references ?? [];
  const selector = semantic?.to?.selector
    ?? semantic?.from?.selector
    ?? finding?.element?.selector
    ?? interaction.trigger?.element?.selector;
  const timestamp = interaction.startedAt;
  const occurrence: ReportTraceOccurrence = {
    id: interaction.id,
    timestamp,
    interactionNumber,
    trigger,
    chain,
  };
  const identityKey = [
    `semantic:${semantic?.kind ?? 'none'}`,
    `rule:${finding?.ruleId ?? 'none'}`,
    `cause:${cause?.type ?? 'none'}`,
    `context:${semanticIdentityContext(semantic, selector)}`,
  ].join('|');

  return {
    identityKey,
    representedEventIds: finding ? [finding.id] : [],
    story: {
      id: `interaction-story-${interaction.id}`,
      tone,
      interactionNumber,
      trigger,
      chain,
      result: semanticCopy?.label ?? causeCopy?.title ?? (finding ? humanRuntimeEventTitle(finding, language) : undefined) ?? translated(language, 'Runtime signal', 'Señal runtime'),
      detail: semanticCopy?.detail ?? causeCopy?.summary ?? (language === 'en' ? finding?.detail : undefined) ?? translated(
        language,
        'Review the recorded runtime evidence for this interaction.',
        'Revisa la evidencia runtime registrada para esta interacción.',
      ),
      ...(causeCopy?.impact ? { impact: causeCopy.impact } : {}),
      ...(causeCopy?.recommendation
        ? { recommendation: causeCopy.recommendation }
        : recommendationForSemantic(semantic, language)
          ? { recommendation: recommendationForSemantic(semantic, language)! }
          : {}),
      ...(selector ? { selector } : {}),
      references: referenceSource,
      occurrenceCount: 1,
      firstDetectedAt: timestamp,
      lastDetectedAt: timestamp,
      occurrences: [occurrence],
    },
  };
}

function unlinkedRuntimeCandidates(
  events: RuntimeEvent[],
  representedEventIds: Set<string>,
  interactionsById: Map<string, RuntimeInteraction>,
  interactionNumbers: Map<string, number>,
  language: AppLanguage,
): ReportTraceCandidate[] {
  return events
    .filter((event) => event.outcome != null)
    .filter((event) => !representedEventIds.has(event.id))
    .map((event) => {
      const interaction = event.interactionId ? interactionsById.get(event.interactionId) : undefined;
      const interactionNumber = event.interactionId ? interactionNumbers.get(event.interactionId) : undefined;
      const eventTitle = humanRuntimeEventTitle(event, language);
      const trigger = interaction ? humanInteractionTitle(interaction, language) : eventTitle;
      const chain = interaction ? uniqueStrings([trigger, eventTitle]) : [eventTitle];
      const selector = event.element?.selector;
      const cause = event.causes?.[0];
      const occurrence: ReportTraceOccurrence = {
        id: event.id,
        timestamp: event.timestamp,
        ...(interactionNumber != null ? { interactionNumber } : {}),
        trigger,
        chain,
      };
      return {
        identityKey: [
          `event:${event.kind}`,
          `rule:${event.ruleId ?? 'none'}`,
          `cause:${cause?.type ?? 'none'}`,
          `context:${selector ?? 'session'}`,
        ].join('|'),
        representedEventIds: [event.id],
        story: {
          id: `event-story-${event.id}`,
          tone: 'review' as const,
          ...(interactionNumber != null ? { interactionNumber } : {}),
          trigger,
          chain,
          result: eventTitle,
          detail: language === 'en' && event.detail
            ? event.detail
            : translated(
              language,
              'Review this runtime finding in the recorded page context.',
              'Revisa este hallazgo runtime dentro del contexto grabado de la página.',
            ),
          ...(selector ? { selector } : {}),
          references: event.references ?? [],
          occurrenceCount: 1,
          firstDetectedAt: event.timestamp,
          lastDetectedAt: event.timestamp,
          occurrences: [occurrence],
        },
      };
    });
}

function consolidateTraceCandidates(candidates: ReportTraceCandidate[]): ReportTraceStory[] {
  const grouped = new Map<string, ReportTraceStory>();
  for (const candidate of candidates) {
    const existing = grouped.get(candidate.identityKey);
    if (!existing) {
      grouped.set(candidate.identityKey, { ...candidate.story, occurrences: [...candidate.story.occurrences] });
      continue;
    }

    const occurrences = [...existing.occurrences, ...candidate.story.occurrences]
      .sort((left, right) => left.timestamp - right.timestamp);
    existing.occurrences = occurrences;
    existing.occurrenceCount = occurrences.length;
    existing.firstDetectedAt = occurrences[0]?.timestamp ?? existing.firstDetectedAt;
    existing.lastDetectedAt = occurrences.at(-1)?.timestamp ?? existing.lastDetectedAt;
    existing.references = mergeReferences(existing.references, candidate.story.references);
  }
  return [...grouped.values()];
}

export function buildSessionSuggestions(
  scan: ScanResult | undefined,
  events: RuntimeEvent[],
  language: AppLanguage,
): SessionSuggestion[] {
  const suggestions: SessionSuggestion[] = [];

  for (const issue of uniqueIssues(scan?.issues ?? []).slice(0, 6)) {
    const localized = localizedScanIssue(issue, language);
    let detail = localized.description;
    if (issue.contrast?.foreground && issue.contrast.background) {
      const accessibleColor = suggestAccessibleForeground(
        issue.contrast.foreground,
        issue.contrast.background,
        issue.contrast.requiredRatio,
      );
      if (accessibleColor) {
        const isText = issue.contrast.kind === 'text' || issue.ruleId === 'FT-WCAG-010';
        detail = translated(
          language,
          `${localized.description} Suggested ${isText ? 'text' : 'visual'} color: ${accessibleColor.hex} (${accessibleColor.rgb}), producing ${accessibleColor.ratio}:1 against the recorded ${isText ? 'background' : 'adjacent color'}.`,
          `${localized.description} Color ${isText ? 'de texto' : 'visual'} sugerido: ${accessibleColor.hex} (${accessibleColor.rgb}), con un contraste de ${accessibleColor.ratio}:1 sobre ${isText ? 'el fondo' : 'el color adyacente'} registrado.`,
        );
      }
    }
    suggestions.push({
      id: `analysis-${issue.ruleId}`,
      priority: 'high',
      source: 'analysis',
      title: localized.title,
      detail,
    });
  }

  for (const issue of uniqueIssues(scan?.review ?? []).slice(0, 3)) {
    const localized = localizedScanIssue(issue, language);
    suggestions.push({
      id: `review-${issue.ruleId}`,
      priority: 'medium',
      source: 'analysis',
      title: localized.title,
      detail: localized.description,
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
      title: humanRuntimeEventTitle(event, language),
      detail: event.causes?.[0]
        ? explanationForCause(event.causes[0].type, language).recommendation
        : language === 'en' && event.detail
          ? event.detail
          : translated(
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

export function buildSessionReportModel(
  scan: ScanResult | undefined,
  events: RuntimeEvent[],
  language: AppLanguage,
): SessionReportModel {
  const interactions = groupRuntimeInteractions(events);
  const journey = buildFocusJourney(events);
  const transitionSemantics = buildFocusTransitionSemantics(events, interactions, journey);
  const representedEventIds = new Set<string>();
  const traceCandidates: ReportTraceCandidate[] = [];
  const interactionsById = new Map(interactions.map((interaction) => [interaction.id, interaction]));
  const interactionNumbers = new Map(interactions.map((interaction, index) => [interaction.id, index + 1]));

  interactions.forEach((interaction, index) => {
    if (!interaction.correlated) return;
    const candidate = candidateForInteraction(interaction, index + 1, transitionSemantics, language);
    if (!candidate) return;
    candidate.representedEventIds.forEach((eventId) => representedEventIds.add(eventId));
    traceCandidates.push(candidate);
  });
  traceCandidates.push(...unlinkedRuntimeCandidates(
    events,
    representedEventIds,
    interactionsById,
    interactionNumbers,
    language,
  ));
  const traceStories = consolidateTraceCandidates(traceCandidates);

  const allStaticFindings = scan
    ? [...scan.issues, ...scan.review, ...(scan.warnings ?? [])]
    : [];
  const categoryMap = new Map<Exclude<ScanCategory, 'all'>, number>();
  for (const issue of allStaticFindings) {
    const category = scanCategoryForIssue(issue);
    categoryMap.set(category, (categoryMap.get(category) ?? 0) + 1);
  }
  const categoryOrder: Array<Exclude<ScanCategory, 'all'>> = [
    'contrast', 'names', 'forms', 'structure', 'keyboard', 'aria', 'other',
  ];
  const categories = categoryOrder
    .map((id) => ({ id, label: categoryLabel(id, language), count: categoryMap.get(id) ?? 0 }))
    .filter((item) => item.count > 0);

  return {
    staticFindings: allStaticFindings.length,
    failures: scan?.issues.length ?? 0,
    reviews: scan?.review.length ?? 0,
    warnings: scan?.warnings?.length ?? 0,
    runtimeFindings: traceStories.filter((story) => story.tone === 'review').length,
    runtimeOccurrences: traceCandidates.filter((candidate) => candidate.story.tone === 'review').length,
    causalInteractions: interactions.filter((interaction) => interaction.causes.length > 0).length,
    transitionReviews: transitionSemantics.filter((semantic) => semantic.tone === 'review').length,
    handledTransitions: transitionSemantics.filter((semantic) => semantic.tone === 'positive').length,
    focusSteps: journey.steps.length,
    focusJumps: journey.jumps,
    contrastFailures: scan?.issues.filter((issue) => scanCategoryForIssue(issue) === 'contrast').length ?? 0,
    categories,
    traceStories,
    suggestions: buildSessionSuggestions(scan, events, language),
  };
}
