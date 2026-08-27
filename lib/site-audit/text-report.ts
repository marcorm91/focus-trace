import {
  componentContextLabel,
  componentPrimaryLabel,
  componentTypeLabel,
} from '../report/component-identity';
import { localizedScanIssue, localizedSeverity, type AppLanguage } from '../../shared/i18n';
import { localizedRuleSeverityRationale } from '../../shared/rule-catalog';
import { countBySeverity, severityRank } from '../../shared/severity';
import { remediationForIssue } from './remediation';
import type { SiteAuditFindingAggregate, SiteAuditResult } from './model';

function line(title: string, value: string | number): string {
  return `${title}: ${value}`;
}

function outcomeLabel(outcome: SiteAuditFindingAggregate['outcome'], language: AppLanguage): string {
  const es = language === 'es';
  if (outcome === 'fail') return es ? 'FALLO' : 'FAILURE';
  if (outcome === 'review') return es ? 'REVISIÓN' : 'REVIEW';
  return es ? 'AVISO' : 'WARNING';
}

function sortFindings(findings: SiteAuditFindingAggregate[]): SiteAuditFindingAggregate[] {
  return [...findings].sort(
    (left, right) => severityRank(right.exampleIssue.severity) - severityRank(left.exampleIssue.severity),
  );
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function findingLines(finding: SiteAuditFindingAggregate, language: AppLanguage): string[] {
  const es = language === 'es';
  const issue = localizedScanIssue(finding.exampleIssue, language);
  const component = finding.component;
  const severityRationale = localizedRuleSeverityRationale(finding.ruleId, language);
  const targets = unique(finding.exampleIssue.targets);
  const pages = unique(finding.pages);
  const output = [
    `- [${outcomeLabel(finding.outcome, language)}] [${localizedSeverity(finding.exampleIssue.severity, language).toUpperCase()}] ${finding.ruleId} · ${issue.title}`,
    `  ${line(es ? 'Impacto estimado' : 'Estimated impact', localizedSeverity(finding.exampleIssue.severity, language))}`,
    ...(severityRationale ? [`  ${line(es ? 'Por qué este impacto' : 'Why this impact', severityRationale)}`] : []),
    `  ${line(es ? 'Cobertura de muestra' : 'Sample coverage', `${finding.sampleCount}/${finding.totalSamples}`)}`,
    `  ${line(es ? 'Página representativa' : 'Representative page', finding.exampleUrl)}`,
    `  ${line(es ? 'Selector representativo' : 'Representative selector', finding.exampleSelector === 'page' ? (es ? 'página completa' : 'whole page') : finding.exampleSelector)}`,
  ];

  if (targets.length > 1) {
    output.push(`  ${es ? 'Destinos detectados en la página representativa' : 'Targets detected on the representative page'}:`);
    targets.forEach((target) => output.push(`    - ${target}`));
  }

  output.push(`  ${es ? 'Páginas donde se observó' : 'Observed on sampled pages'}:`);
  pages.forEach((url) => output.push(`    - ${url}`));

  if (component) {
    output.push(
      `  ${line(es ? 'Elemento' : 'Element', `${component.componentId} · ${componentTypeLabel(component, language)} · ${componentPrimaryLabel(component)}`)}`,
    );
    if (component.tag) output.push(`  ${line(es ? 'Etiqueta HTML' : 'HTML tag', component.tag)}`);
    if (component.role) output.push(`  ${line(es ? 'Rol' : 'Role', component.role)}`);
    const context = componentContextLabel(component);
    if (context) output.push(`  ${line(es ? 'Contexto' : 'Context', context)}`);
  }

  output.push(`  ${line(es ? 'Descripción' : 'Description', issue.description)}`);
  if (issue.evidence) output.push(`  ${line(es ? 'Evidencia' : 'Evidence', issue.evidence)}`);

  if (finding.references.length) {
    output.push(`  ${es ? 'Criterios/fuentes' : 'Criteria/sources'}:`);
    finding.references.forEach((reference) => {
      output.push(`    - ${reference.type} ${reference.id}${reference.level ? ` (${reference.level})` : ''} · ${reference.label} · ${reference.url}`);
    });
  }

  if (issue.contrast) {
    output.push(`  ${line(es ? 'Contraste medido' : 'Measured contrast', issue.contrast.ratio != null ? `${issue.contrast.ratio}:1` : (es ? 'revisión manual' : 'manual review'))}`);
    output.push(`  ${line(es ? 'Contraste requerido' : 'Required contrast', `${issue.contrast.requiredRatio}:1`)}`);
    if (issue.contrast.subject) output.push(`  ${line(es ? 'Señal medida' : 'Measured subject', issue.contrast.subject)}`);
    if (issue.contrast.kind) output.push(`  ${line(es ? 'Tipo de contraste' : 'Contrast kind', issue.contrast.kind)}`);
    if (issue.contrast.foreground) output.push(`  ${line(es ? 'Color frontal' : 'Foreground', issue.contrast.foreground)}`);
    if (issue.contrast.background) output.push(`  ${line(es ? 'Fondo/adyacente' : 'Background/adjacent', issue.contrast.background)}`);
    if (issue.contrast.fontSizePx != null) output.push(`  ${line(es ? 'Tamaño de texto' : 'Text size', `${issue.contrast.fontSizePx}px`)}`);
    if (issue.contrast.fontWeight != null) output.push(`  ${line(es ? 'Peso de fuente' : 'Font weight', issue.contrast.fontWeight)}`);
    if (issue.contrast.reason) output.push(`  ${line(es ? 'Contexto de medición' : 'Measurement context', issue.contrast.reason)}`);
  }

  if (issue.accessibleName) {
    output.push(`  ${line(es ? 'Nombre accesible calculado' : 'Computed accessible name', issue.accessibleName.name || '∅')}`);
    output.push(`  ${line(es ? 'Fuente del nombre' : 'Name source', issue.accessibleName.source || '—')}`);
    if (issue.accessibleName.role) output.push(`  ${line(es ? 'Rol calculado' : 'Computed role', issue.accessibleName.role)}`);
    if (issue.accessibleName.candidates.length) {
      output.push(`  ${es ? 'Fuentes de nombre inspeccionadas' : 'Inspected name sources'}:`);
      issue.accessibleName.candidates.forEach((candidate) => {
        const state = candidate.used ? (es ? 'utilizada' : 'used') : (es ? 'no utilizada' : 'not used');
        output.push(`    - ${candidate.source} · ${state} · ${candidate.selector} · ${candidate.value || '∅'}`);
      });
    }
  }

  output.push(`  ${line(es ? 'Solución sugerida' : 'Suggested fix', remediationForIssue(finding.exampleIssue, language))}`);
  return output;
}

export function buildSiteAuditTextReport(result: SiteAuditResult, language: AppLanguage): string {
  const es = language === 'es';
  const output: string[] = [
    es ? 'AUDITORÍA DE SITIO' : 'SITE AUDIT',
    '=================================',
    line(es ? 'Sitio' : 'Site', result.origin),
    line(es ? 'URLs descubiertas' : 'Discovered URLs', result.discovery.urls.length),
    line(es ? 'Plantillas/familias' : 'Templates/families', result.templates.length),
    line(es ? 'Páginas escaneadas' : 'Scanned pages', result.scannedPages),
    line(es ? 'Páginas no auditables' : 'Pages not scanned', result.failedPages),
    line(es ? 'Origen del descubrimiento' : 'Discovery source', result.discovery.source),
    '',
    es
      ? 'Nota de impacto: crítico, grave, moderado y leve son niveles de priorización de FocusTrace; no son niveles WCAG A/AA/AAA.'
      : 'Impact note: critical, serious, moderate and minor are FocusTrace prioritization levels; they are not WCAG A/AA/AAA levels.',
    '',
  ];

  for (const template of result.templates) {
    const successful = template.sampledPages.filter((page) => page.scan);
    const fingerprints = new Set(successful.flatMap((page) => page.structure?.fingerprint ? [page.structure.fingerprint] : []));
    const failureIssues = template.findings
      .filter((finding) => finding.outcome === 'fail')
      .map((finding) => finding.exampleIssue);
    const severityCounts = countBySeverity(failureIssues);
    output.push(
      `${template.id} · ${template.label}`,
      '-'.repeat(Math.min(72, template.label.length + 8)),
      line(es ? 'URLs representadas' : 'Represented URLs', template.discoveredUrls.length),
      line(es ? 'Muestras escaneadas' : 'Scanned samples', successful.length),
      line(
        es ? 'Consistencia estructural' : 'Structural consistency',
        successful.length <= 1
          ? (es ? 'muestra insuficiente para comparar' : 'not enough samples to compare')
          : fingerprints.size === 1
            ? `${successful.length}/${successful.length}`
            : `${fingerprints.size} ${es ? 'variantes detectadas' : 'variants detected'}`,
      ),
      line(es ? 'Fallos agregados' : 'Aggregated failures', template.failures),
      line(es ? 'Impacto de fallos' : 'Failure impact', `${localizedSeverity('critical', language)} ${severityCounts.critical} · ${localizedSeverity('serious', language)} ${severityCounts.serious} · ${localizedSeverity('moderate', language)} ${severityCounts.moderate} · ${localizedSeverity('minor', language)} ${severityCounts.minor}`),
      line(es ? 'Revisiones agregadas' : 'Aggregated reviews', template.reviews),
      line(es ? 'Avisos agregados' : 'Aggregated warnings', template.warnings),
      '',
    );

    const common = sortFindings(template.findings.filter((finding) => finding.commonToTemplate));
    if (common.length) {
      output.push(es ? 'Comunes a todas las muestras:' : 'Common to every sample:');
      common.forEach((finding) => output.push(...findingLines(finding, language), ''));
    }

    const variants = sortFindings(template.findings.filter((finding) => !finding.commonToTemplate));
    if (variants.length) {
      output.push(successful.length <= 1
        ? (es ? 'Hallazgos de la página muestreada:' : 'Findings in the sampled page:')
        : (es ? 'Variaciones encontradas:' : 'Observed variations:'));
      variants.forEach((finding) => output.push(...findingLines(finding, language), ''));
    }

    output.push(es ? 'Muestras:' : 'Samples:');
    template.sampledPages.forEach((page) => {
      output.push(`- ${page.url}${page.error ? ` · ERROR: ${page.error}` : ''}`);
    });
    output.push('');
  }

  output.push(
    es ? 'NOTA DE ALCANCE' : 'SCOPE NOTE',
    '-------------',
    es
      ? 'La auditoría de sitio utiliza muestras representativas y comprobaciones automáticas. Una plantilla sin hallazgos automáticos no demuestra conformidad WCAG completa; siguen siendo necesarias revisión manual y pruebas de estados runtime.'
      : 'Site Audit uses representative samples and automated checks. A template with no automated findings does not prove complete WCAG conformance; manual review and runtime-state testing are still required.',
  );

  return `${output.join('\r\n').trim()}\r\n`;
}

export function siteAuditFilename(result: SiteAuditResult): string {
  let host = 'site';
  try { host = new URL(result.origin).hostname.replace(/^www\./, '') || host; } catch { /* keep fallback */ }
  return `focus-trace-site-audit-${host}-${new Date(result.generatedAt).toISOString().slice(0, 10)}.txt`;
}
