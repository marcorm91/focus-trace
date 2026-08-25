import { tr, type AppLanguage } from '../../shared/i18n';
import type { RuntimeEvent, ScanIssue, ScanResult } from '../../shared/types';
import { buildSessionSuggestions } from './session-report';

export interface TextSessionReportInput {
  scan?: ScanResult | undefined;
  events: RuntimeEvent[];
  language: AppLanguage;
  generatedAt?: number;
}

function lineLabel(language: AppLanguage, english: string, spanish: string): string {
  return tr(language, english, spanish);
}

function heading(title: string): string[] {
  return ['', title, '='.repeat(title.length)];
}

function issueLines(
  issues: ScanIssue[],
  category: string,
  language: AppLanguage,
): string[] {
  if (issues.length === 0) {
    return [`- ${category}: ${lineLabel(language, 'none', 'ninguno')}`];
  }

  return issues.flatMap((issue, index) => {
    const references = issue.references
      .map((reference) => `${reference.type} ${reference.id}: ${reference.url}`)
      .join(' | ');
    return [
      `${index + 1}. [${category}] ${issue.title}`,
      `   ${lineLabel(language, 'Rule', 'Regla')}: ${issue.ruleId}`,
      `   ${lineLabel(language, 'Severity', 'Gravedad')}: ${issue.severity}`,
      `   ${lineLabel(language, 'Description', 'Descripción')}: ${issue.description}`,
      ...(issue.evidence
        ? [`   ${lineLabel(language, 'Evidence', 'Evidencia')}: ${issue.evidence}`]
        : []),
      ...(references
        ? [`   ${lineLabel(language, 'References', 'Referencias')}: ${references}`]
        : []),
      '',
    ];
  });
}

function focusMode(events: RuntimeEvent[], language: AppLanguage): string {
  const hasFocus = events.some((event) => event.kind === 'focus');
  if (!hasFocus) return lineLabel(language, 'Not performed', 'No realizado');
  return events.some((event) => event.kind === 'focus-walk-start')
    ? lineLabel(language, 'Automatic Tab walk', 'Recorrido automático con Tab')
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
  generatedAt = Date.now(),
}: TextSessionReportInput): string {
  const focusEvents = events.filter((event) => event.kind === 'focus' && event.element);
  const focusFindings = events.filter((event) => event.outcome);
  const walkEnd = [...events].reverse().find((event) => event.kind === 'focus-walk-end');
  const headings = scan?.headings ?? [];
  const suggestions = buildSessionSuggestions(scan, events, language);
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
  ];

  lines.push(...heading(lineLabel(language, 'SUMMARY', 'RESUMEN')));
  lines.push(
    `${lineLabel(language, 'Analysis', 'Análisis')}: ${scan ? lineLabel(language, 'Completed', 'Completado') : lineLabel(language, 'Not performed', 'No realizado')}`,
    `${lineLabel(language, 'Focus', 'Foco')}: ${focusMode(events, language)}`,
    `${lineLabel(language, 'Headings', 'Encabezados')}: ${scan ? `${headings.length} ${lineLabel(language, 'nodes', 'nodos')}` : lineLabel(language, 'Not performed', 'No realizado')}`,
  );
  if (scan) {
    lines.push(
      `${lineLabel(language, 'Failures', 'Fallos')}: ${scan.issues.length}`,
      `${lineLabel(language, 'Needs review', 'Requiere revisión')}: ${scan.review.length}`,
      `${lineLabel(language, 'Warnings', 'Avisos')}: ${scan.warnings?.length ?? 0}`,
    );
  }

  lines.push(...heading(lineLabel(language, '1. AUTOMATED ANALYSIS', '1. ANÁLISIS AUTOMÁTICO')));
  if (!scan) {
    lines.push(lineLabel(language, 'The page analysis was not performed.', 'No se ha realizado el análisis de la página.'));
  } else {
    lines.push(
      `${scan.engine} · ${scan.standard} · ${scan.rulesRun} ${lineLabel(language, 'rule families', 'familias de reglas')}`,
      '',
      ...issueLines(scan.issues, lineLabel(language, 'FAILURE', 'FALLO'), language),
      ...issueLines(scan.review, lineLabel(language, 'REVIEW', 'REVISAR'), language),
      ...issueLines(scan.warnings ?? [], lineLabel(language, 'WARNING', 'AVISO'), language),
    );
  }

  lines.push(...heading(lineLabel(language, '2. KEYBOARD FOCUS JOURNEY', '2. RECORRIDO DE FOCO POR TECLADO')));
  lines.push(`${lineLabel(language, 'Mode', 'Modo')}: ${focusMode(events, language)}`);
  if (focusEvents.length === 0) {
    lines.push(lineLabel(
      language,
      'No manual or automatic focus evidence is included.',
      'No se incluye evidencia de foco manual ni automático.',
    ));
  } else {
    lines.push(
      `${lineLabel(language, 'Recorded steps', 'Pasos registrados')}: ${focusEvents.length}`,
      `${lineLabel(language, 'Runtime findings', 'Hallazgos runtime')}: ${focusFindings.length}`,
    );
    if (walkEnd?.focusWalk) {
      lines.push(
        `${lineLabel(language, 'Candidates', 'Candidatos')}: ${walkEnd.focusWalk.totalCandidates}`,
        `${lineLabel(language, 'Reached', 'Alcanzados')}: ${walkEnd.focusWalk.focusedSteps}`,
        `${lineLabel(language, 'Skipped', 'Omitidos')}: ${walkEnd.focusWalk.skipped}`,
      );
    }
    lines.push('');
    focusEvents.forEach((event, index) => {
      lines.push(
        `${index + 1}. ${event.element?.name || lineLabel(language, 'Unnamed component', 'Componente sin nombre')}`,
        `   ${lineLabel(language, 'Role', 'Rol')}: ${event.element?.role ?? event.element?.tag ?? '—'}`,
      );
    });
    if (focusFindings.length) {
      lines.push('', lineLabel(language, 'Focus findings:', 'Hallazgos de foco:'));
      focusFindings.forEach((event, index) => {
        lines.push(
          `${index + 1}. ${event.title}`,
          ...(event.detail ? [`   ${event.detail}`] : []),
        );
      });
    }
  }

  lines.push(...heading(lineLabel(language, '3. HEADING STRUCTURE', '3. ESTRUCTURA DE ENCABEZADOS')));
  if (!scan) {
    lines.push(lineLabel(language, 'The heading outline was not collected.', 'No se ha recogido el árbol de encabezados.'));
  } else if (!headings.length) {
    lines.push(lineLabel(language, 'No visible H1-H6 headings were found.', 'No se han encontrado encabezados H1–H6 visibles.'));
  } else {
    headings.forEach((item) => {
      const indentation = '  '.repeat(item.level - 1);
      const signals = item.signals.length
        ? ` [${item.signals.map((signal) => headingSignal(signal, language)).join(', ')}]`
        : '';
      lines.push(
        `${indentation}- H${item.level}: ${item.text || lineLabel(language, 'Empty heading', 'Encabezado vacío')}${signals}`,
      );
    });
  }

  lines.push(...heading(lineLabel(language, '4. RECOMMENDED IMPROVEMENTS', '4. SUGERENCIAS DE MEJORA')));
  if (!suggestions.length) {
    lines.push(lineLabel(
      language,
      'No immediate automated suggestions. A complete manual WCAG review is still required.',
      'No hay sugerencias automáticas inmediatas. Sigue siendo necesaria una revisión WCAG manual completa.',
    ));
  } else {
    suggestions.forEach((suggestion, index) => {
      const priority = suggestion.priority === 'high'
        ? lineLabel(language, 'HIGH', 'ALTA')
        : suggestion.priority === 'medium'
          ? lineLabel(language, 'MEDIUM', 'MEDIA')
          : lineLabel(language, 'COVERAGE', 'COBERTURA');
      lines.push(
        `${index + 1}. [${priority}] ${suggestion.title}`,
        `   ${suggestion.detail}`,
        '',
      );
    });
  }

  lines.push(
    ...heading(lineLabel(language, 'SCOPE NOTE', 'NOTA DE ALCANCE')),
    lineLabel(
      language,
      'Automated checks and recorded journeys do not prove complete WCAG conformance. Manual review remains necessary.',
      'Las comprobaciones automáticas y los recorridos grabados no demuestran el cumplimiento completo de WCAG. Sigue siendo necesaria una revisión manual.',
    ),
  );

  return `${lines.join('\r\n').trim()}\r\n`;
}
