import {
  componentContextLabel,
  componentPrimaryLabel,
  componentTypeLabel,
} from '../report/component-identity';
import { localizedScanIssue, localizedSeverity, type AppLanguage } from '../../shared/i18n';
import { localizedRuleSeverityRationale, ruleDefinitionForId } from '../../shared/rule-catalog';
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

function findingLines(finding: SiteAuditFindingAggregate, language: AppLanguage): string[] {
  const es = language === 'es';
  const issue = localizedScanIssue(finding.exampleIssue, language);
  const reference = finding.references[0];
  const component = finding.component;
  const rule = ruleDefinitionForId(finding.ruleId);
  const severityRationale = localizedRuleSeverityRationale(finding.ruleId, language);
  const output = [
    `- [${outcomeLabel(finding.outcome, language)}] [${localizedSeverity(finding.exampleIssue.severity, language).toUpperCase()}] ${finding.ruleId} · ${issue.title}`,
    `  ${line(es ? 'Impacto estimado' : 'Estimated impact', localizedSeverity(finding.exampleIssue.severity, language))}`,
    ...(severityRationale ? [`  ${line(es ? 'Por qué este impacto' : 'Why this impact', severityRationale)}`] : []),
    `  ${line(es ? 'Cobertura de muestra' : 'Sample coverage', `${finding.sampleCount}/${finding.totalSamples}`)}`,
    `  ${line(es ? 'Página representativa' : 'Representative page', finding.exampleUrl)}`,
  ];

  if (rule?.impactReferences.length) {
    output.push(`  ${line(
      es ? 'Referencia de impacto comparable' : 'Comparable impact reference',
      rule.impactReferences.map((impactReference) =>
        `${impactReference.source} ${impactReference.ruleId} (${localizedSeverity(impactReference.impact, language)}${impactReference.relation === 'partial' ? `; ${es ? 'alcance parcial' : 'partial scope'}` : ''})`,
      ).join(' · '),
    )}`);
  }

  if (component) {
    output.push(
      `  ${line(es ? 'Elemento' : 'Element', `${component.componentId} · ${componentTypeLabel(component, language)} · ${componentPrimaryLabel(component)}`)}`,
    );
    const context = componentContextLabel(component);
    if (context) output.push(`  ${line(es ? 'Contexto' : 'Context', context)}`);
  }

  output.push(`  ${line(es ? 'Descripción' : 'Description', issue.description)}`);
  if (issue.evidence) output.push(`  ${line(es ? 'Evidencia' : 'Evidence', issue.evidence)}`);
  if (reference) output.push(`  ${line(es ? 'Criterio/fuente' : 'Criterion/source', `${reference.type} ${reference.id}${reference.level ? ` (${reference.level})` : ''}`)}`);
  if (issue.contrast) {
    output.push(`  ${line(es ? 'Contraste' : 'Contrast', `${issue.contrast.ratio ?? 'review'}:1 / ${issue.contrast.requiredRatio}:1`)}`);
  }
  if (issue.accessibleName) {
    output.push(`  ${line(es ? 'Nombre accesible' : 'Accessible name', issue.accessibleName.name || '∅')}`);
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
