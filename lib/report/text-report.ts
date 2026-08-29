import { suggestAccessibleForeground } from '../audit/contrast';
import { tr, type AppLanguage } from '../../shared/i18n';
import { ruleLegendCopy } from '../../shared/rule-legend';
import type { RuntimeEvent, ScanIssue, ScanResult } from '../../shared/types';
import {
  componentContextLabel,
  componentForIssue,
  componentPrimaryLabel,
  componentTypeLabel,
  type ReportComponentIdentity,
} from './component-identity';
import { buildSessionReportModel } from './session-report';

export interface TextSessionReportInput {
  scan?: ScanResult | undefined;
  events: RuntimeEvent[];
  language: AppLanguage;
  components?: ReportComponentIdentity[];
  generatedAt?: number;
}

function lineLabel(language: AppLanguage, english: string, spanish: string): string {
  return tr(language, english, spanish);
}

function heading(title: string): string[] {
  return ['', title, '='.repeat(title.length)];
}

function ruleLegendLines(language: AppLanguage): string[] {
  const legend = ruleLegendCopy(language);
  return [
    ...heading(legend.title.toUpperCase()),
    legend.intro,
    '',
    ...legend.items.map((item) => `- ${item.pattern}: ${item.description}`),
    '',
    ...legend.notes.flatMap((note) => [`${note.title} ${note.description}`, '']),
  ];
}

function contrastLines(issue: ScanIssue, language: AppLanguage): string[] {
  const contrast = issue.contrast;
  if (!contrast) return [];
  const lines = [
    ...(contrast.ratio != null
      ? [`   ${lineLabel(language, 'Contrast', 'Contraste')}: ${contrast.ratio}:1 / ${lineLabel(language, 'required', 'requerido')} ${contrast.requiredRatio}:1`]
      : [`   ${lineLabel(language, 'Contrast', 'Contraste')}: ${lineLabel(language, 'manual review required', 'requiere revisión manual')}`]),
    ...(contrast.foreground ? [`   ${lineLabel(language, 'Text color', 'Color de texto')}: ${contrast.foreground}`] : []),
    ...(contrast.background ? [`   ${lineLabel(language, 'Background', 'Fondo')}: ${contrast.background}`] : []),
  ];
  if (issue.outcome === 'fail' && contrast.foreground && contrast.background) {
    const suggestion = suggestAccessibleForeground(contrast.foreground, contrast.background, contrast.requiredRatio);
    if (suggestion) {
      lines.push(
        `   ${lineLabel(language, 'Suggested accessible color', 'Color accesible sugerido')}: ${suggestion.hex} · ${suggestion.rgb} · ${suggestion.ratio}:1`,
      );
    }
  }
  if (contrast.reason) lines.push(`   ${lineLabel(language, 'Review note', 'Nota de revisión')}: ${contrast.reason}`);
  return lines;
}

function componentLines(
  component: ReportComponentIdentity | undefined,
  language: AppLanguage,
): string[] {
  if (!component) return [];
  const context = componentContextLabel(component);
  return [
    `   ${lineLabel(language, 'Element', 'Elemento')}: ${component.componentId} · ${componentTypeLabel(component, language)}`,
    `   ${lineLabel(language, 'Name / text', 'Nombre / texto')}: ${componentPrimaryLabel(component)}`,
    ...(context ? [`   ${lineLabel(language, 'Context', 'Contexto')}: ${context}`] : []),
  ];
}

function issueLines(
  issues: ScanIssue[],
  category: string,
  language: AppLanguage,
  components: Map<string, ReportComponentIdentity>,
): string[] {
  if (issues.length === 0) return [`- ${category}: ${lineLabel(language, 'none', 'ninguno')}`];

  return issues.flatMap((issue, index) => {
    const references = issue.references
      .map((reference) => `${reference.type} ${reference.id}: ${reference.url}`)
      .join(' | ');
    const component = componentForIssue(issue, components);
    return [
      `${index + 1}. [${category}] ${issue.title}`,
      `   ${lineLabel(language, 'Rule', 'Regla')}: ${issue.ruleId}`,
      `   ${lineLabel(language, 'Severity', 'Gravedad')}: ${issue.severity}`,
      ...componentLines(component, language),
      `   ${lineLabel(language, 'Description', 'Descripción')}: ${issue.description}`,
      ...contrastLines(issue, language),
      ...(issue.evidence ? [`   ${lineLabel(language, 'Evidence', 'Evidencia')}: ${issue.evidence}`] : []),
      ...(references ? [`   ${lineLabel(language, 'References', 'Referencias')}: ${references}`] : []),
      '',
    ];
  });
}

function focusMode(events: RuntimeEvent[], language: AppLanguage): string {
  const hasFocus = events.some((event) => event.kind === 'focus');
  if (!hasFocus) return lineLabel(language, 'Not performed', 'No realizado');
  return events.some((event) => event.kind === 'focus-walk-start')
    ? lineLabel(language, 'Automatic focus walk', 'Recorrido automático de foco')
    : lineLabel(language, 'Manual keyboard recording', 'Grabación manual con teclado');
}

function headingSignal(
  signal: 'empty' | 'level-jump' | 'multiple-h1',
  language: AppLanguage,
): string {
  if (signal === 'empty') return lineLabel(language, 'empty heading', 'encabezado vacío');
  if (signal === 'level-jump') return lineLabel(language, 'skipped level', 'salto de nivel');
  return lineLabel(language, 'multiple H1', 'varios H1');
}

function safePageName(scan: ScanResult | undefined): string {
  if (!scan) return 'page';
  try {
    return new URL(scan.url).hostname.replace(/^www\./, '') || 'page';
  } catch {
    return 'page';
  }
}

export function buildTextReportFilename(scan: ScanResult | undefined, generatedAt = Date.now()): string {
  const page = safePageName(scan)
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'page';
  const date = new Date(generatedAt).toISOString().slice(0, 10);
  return `focus-trace-${page}-${date}.txt`;
}

export function buildTextSessionReport({
  scan,
  events,
  language,
  components = [],
  generatedAt = Date.now(),
}: TextSessionReportInput): string {
  const model = buildSessionReportModel(scan, events, language);
  const componentMap = new Map(components.map((component) => [component.selector, component]));
  const headings = scan?.headings ?? [];
  const componentScope = scan?.scope?.type === 'component' ? scan.scope : undefined;
  const title = lineLabel(
    language,
    'FOCUS TRACE - ACCESSIBILITY REPORT',
    'FOCUS TRACE - INFORME DE ACCESIBILIDAD',
  );
  const lines: string[] = [
    title,
    '='.repeat(title.length),
    `${lineLabel(language, 'Page', 'Página')}: ${scan?.title || lineLabel(language, 'Not analyzed', 'No analizada')}`,
    `URL: ${scan?.url ?? '—'}`,
    `${lineLabel(language, 'Generated', 'Generado')}: ${new Date(generatedAt).toISOString()}`,
    `${lineLabel(language, 'Standard', 'Estándar')}: ${scan?.standard ?? 'WCAG 2.2'}`,
    ...(componentScope ? [
      `${lineLabel(language, 'Static scope', 'Alcance estático')}: ${lineLabel(language, 'Component', 'Componente')}`,
      `${lineLabel(language, 'Component', 'Componente')}: ${componentScope.label || componentScope.tag}`,
      `${lineLabel(language, 'Component type', 'Tipo de componente')}: ${componentScope.tag}${componentScope.role ? ` · role=${componentScope.role}` : ''}`,
      `${lineLabel(language, 'Component selector', 'Selector del componente')}: ${componentScope.selector}`,
    ] : [`${lineLabel(language, 'Static scope', 'Alcance estático')}: ${lineLabel(language, 'Full page', 'Página completa')}`]),
  ];

  lines.push(...ruleLegendLines(language));
  lines.push(...heading(lineLabel(language, 'EXECUTIVE SUMMARY', 'RESUMEN EJECUTIVO')));
  lines.push(
    `${lineLabel(language, 'Static failures', 'Fallos estáticos')}: ${model.failures}`,
    `${lineLabel(language, 'Static reviews', 'Revisiones estáticas')}: ${model.reviews}`,
    `${lineLabel(language, 'Authoring warnings', 'Avisos de autoría')}: ${model.warnings}`,
    `${lineLabel(language, 'Runtime findings', 'Hallazgos runtime')}: ${model.runtimeFindings}`,
    `${lineLabel(language, 'Runtime occurrences', 'Ocurrencias runtime')}: ${model.runtimeOccurrences}`,
    `${lineLabel(language, 'Causal interactions', 'Interacciones causales')}: ${model.causalInteractions}`,
    `${lineLabel(language, 'Focus transition reviews', 'Transiciones de foco a revisar')}: ${model.transitionReviews}`,
    `${lineLabel(language, 'Handled focus transitions', 'Transiciones de foco correctas')}: ${model.handledTransitions}`,
    `${lineLabel(language, 'Focus journey', 'Recorrido de foco')}: ${focusMode(events, language)} · ${model.focusSteps} ${lineLabel(language, 'steps', 'pasos')}`,
  );
  if (componentScope) {
    lines.push(lineLabel(
      language,
      'Runtime evidence remains session-wide; the selected component scope applies only to the static scan in this version.',
      'La evidencia runtime sigue siendo de toda la sesión; en esta versión el componente seleccionado solo limita el análisis estático.',
    ));
  }
  if (model.categories.length) {
    lines.push('', lineLabel(language, 'Static findings by area:', 'Hallazgos estáticos por área:'));
    model.categories.forEach((category) => lines.push(`- ${category.label}: ${category.count}`));
  }

  lines.push(...heading(lineLabel(language, '1. HIGHEST PRIORITY', '1. MÁXIMA PRIORIDAD')));
  const highPriority = model.suggestions.filter((suggestion) => suggestion.priority === 'high').slice(0, 6);
  if (!highPriority.length) {
    lines.push(lineLabel(
      language,
      'No high-priority automated recommendation was produced. Manual review is still required.',
      'No se ha generado ninguna recomendación automática de prioridad alta. Sigue siendo necesaria una revisión manual.',
    ));
  } else {
    highPriority.forEach((suggestion, index) => {
      lines.push(`${index + 1}. ${suggestion.title}`, `   ${suggestion.detail}`, '');
    });
  }

  lines.push(...heading(lineLabel(language, '2. RUNTIME TRACE', '2. TRAZA RUNTIME')));
  if (!model.traceStories.length) {
    lines.push(lineLabel(
      language,
      'No significant correlated runtime story was recorded. Use Trace to capture real interactions.',
      'No se ha registrado ninguna historia runtime correlacionada significativa. Utiliza Trace para capturar interacciones reales.',
    ));
  } else {
    model.traceStories.forEach((story, index) => {
      const tone = story.tone === 'handled'
        ? lineLabel(language, 'HANDLED', 'CORRECTO')
        : story.tone === 'review'
          ? lineLabel(language, 'REVIEW', 'REVISAR')
          : lineLabel(language, 'OBSERVED', 'OBSERVADO');
      const component = story.selector ? componentMap.get(story.selector) : undefined;
      lines.push(
        `${index + 1}. [${tone}] ${story.interactionNumber ? `${lineLabel(language, 'Interaction', 'Interacción')} #${story.interactionNumber} · ` : ''}${story.trigger}`,
        ...componentLines(component, language),
        ...(story.occurrenceCount > 1
          ? [`   ${lineLabel(language, 'Occurrences', 'Ocurrencias')}: ${story.occurrenceCount}`]
          : []),
        `   ${lineLabel(language, 'Trace', 'Traza')}: ${story.chain.join(' → ')}`,
        `   ${lineLabel(language, 'Result', 'Resultado')}: ${story.result}`,
        `   ${story.detail}`,
        ...(story.impact ? [`   ${lineLabel(language, 'Impact', 'Impacto')}: ${story.impact}`] : []),
        ...(story.recommendation ? [`   ${lineLabel(language, 'Recommendation', 'Recomendación')}: ${story.recommendation}`] : []),
        ...(story.references.length
          ? [`   ${lineLabel(language, 'References', 'Referencias')}: ${story.references.map((reference) => `${reference.type} ${reference.id}: ${reference.url}`).join(' | ')}`]
          : []),
        '',
      );
    });
  }

  lines.push(...heading(componentScope
    ? lineLabel(language, '3. COMPONENT SCAN', '3. ANÁLISIS DE COMPONENTE')
    : lineLabel(language, '3. FULL PAGE SCAN', '3. BARRIDO COMPLETO DE PÁGINA')));
  if (!scan) {
    lines.push(lineLabel(language, 'The page analysis was not performed.', 'No se ha realizado el análisis de la página.'));
  } else {
    if (componentScope) {
      lines.push(
        `${lineLabel(language, 'Analyzed component', 'Componente analizado')}: ${componentScope.label || componentScope.tag}`,
        `${lineLabel(language, 'Selector', 'Selector')}: ${componentScope.selector}`,
        lineLabel(
          language,
          'Only applicable element-level checks were evaluated inside this DOM subtree. Page title, document language and global heading hierarchy were excluded from component findings.',
          'Solo se evaluaron dentro de este subtree del DOM las comprobaciones aplicables a elementos. El título de página, el idioma del documento y la jerarquía global de encabezados se excluyeron de los hallazgos del componente.',
        ),
        '',
      );
    }
    lines.push(
      `${scan.engine} · ${scan.standard} · ${scan.rulesRun} ${lineLabel(language, 'rule families', 'familias de reglas')}`,
      '',
      ...issueLines(scan.issues, lineLabel(language, 'FAILURE', 'FALLO'), language, componentMap),
      ...issueLines(scan.review, lineLabel(language, 'REVIEW', 'REVISAR'), language, componentMap),
      ...issueLines(scan.warnings ?? [], lineLabel(language, 'WARNING', 'AVISO'), language, componentMap),
    );
  }

  lines.push(...heading(lineLabel(language, '4. HEADING STRUCTURE', '4. ESTRUCTURA DE ENCABEZADOS')));
  if (componentScope) {
    lines.push(lineLabel(
      language,
      'Not evaluated for component scope because heading hierarchy depends on document context. Run a full-page analysis to include the document heading outline.',
      'No evaluada en el alcance de componente porque la jerarquía de encabezados depende del contexto del documento. Ejecuta un análisis de página completa para incluir el esquema de encabezados.',
    ));
  } else if (!scan) {
    lines.push(lineLabel(language, 'The heading outline was not collected.', 'No se ha recogido el árbol de encabezados.'));
  } else if (!headings.length) {
    lines.push(lineLabel(language, 'No visible H1-H6 headings were found.', 'No se han encontrado encabezados H1–H6 visibles.'));
  } else {
    headings.forEach((item) => {
      const indentation = '  '.repeat(item.level - 1);
      const signals = item.signals.length
        ? ` [${item.signals.map((signal) => headingSignal(signal, language)).join(', ')}]`
        : '';
      lines.push(`${indentation}- H${item.level}: ${item.text || lineLabel(language, 'Empty heading', 'Encabezado vacío')}${signals}`);
    });
  }

  lines.push(...heading(lineLabel(language, '5. RECOMMENDED IMPROVEMENTS', '5. SUGERENCIAS DE MEJORA')));
  if (!model.suggestions.length) {
    lines.push(lineLabel(
      language,
      'No immediate automated suggestions. A complete manual WCAG review is still required.',
      'No hay sugerencias automáticas inmediatas. Sigue siendo necesaria una revisión WCAG manual completa.',
    ));
  } else {
    model.suggestions.forEach((suggestion, index) => {
      const priority = suggestion.priority === 'high'
        ? lineLabel(language, 'HIGH', 'ALTA')
        : suggestion.priority === 'medium'
          ? lineLabel(language, 'MEDIUM', 'MEDIA')
          : lineLabel(language, 'COVERAGE', 'COBERTURA');
      lines.push(`${index + 1}. [${priority}] ${suggestion.title}`, `   ${suggestion.detail}`, '');
    });
  }

  lines.push(
    ...heading(lineLabel(language, 'SCOPE NOTE', 'NOTA DE ALCANCE')),
    lineLabel(
      language,
      'Automated checks and recorded runtime traces do not prove complete WCAG conformance. Manual review remains necessary.',
      'Las comprobaciones automáticas y las trazas runtime grabadas no demuestran el cumplimiento completo de WCAG. Sigue siendo necesaria una revisión manual.',
    ),
  );

  return `${lines.join('\r\n').trim()}\r\n`;
}
