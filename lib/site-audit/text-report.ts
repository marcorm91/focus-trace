import type { SiteAuditResult } from './model';

function line(title: string, value: string | number): string {
  return `${title}: ${value}`;
}

export function buildSiteAuditTextReport(result: SiteAuditResult, language: 'en' | 'es'): string {
  const es = language === 'es';
  const output: string[] = [
    es ? 'FOCUSTRACE - AUDITORÍA DE SITIO' : 'FOCUSTRACE - SITE AUDIT',
    '=================================',
    line(es ? 'Sitio' : 'Site', result.origin),
    line(es ? 'URLs descubiertas' : 'Discovered URLs', result.discovery.urls.length),
    line(es ? 'Plantillas/familias' : 'Templates/families', result.templates.length),
    line(es ? 'Páginas escaneadas' : 'Scanned pages', result.scannedPages),
    line(es ? 'Páginas no auditables' : 'Pages not scanned', result.failedPages),
    line(es ? 'Origen del descubrimiento' : 'Discovery source', result.discovery.source),
    '',
  ];

  for (const template of result.templates) {
    const successful = template.sampledPages.filter((page) => page.scan);
    const fingerprints = new Set(successful.flatMap((page) => page.structure?.fingerprint ? [page.structure.fingerprint] : []));
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
      line(es ? 'Revisiones agregadas' : 'Aggregated reviews', template.reviews),
      line(es ? 'Avisos agregados' : 'Aggregated warnings', template.warnings),
      '',
    );

    const common = template.findings.filter((finding) => finding.commonToTemplate);
    if (common.length) {
      output.push(es ? 'Comunes a todas las muestras:' : 'Common to every sample:');
      common.forEach((finding) => {
        const reference = finding.references[0];
        output.push(`- [${finding.outcome.toUpperCase()}] ${finding.ruleId} · ${finding.title}${reference ? ` · ${reference.type} ${reference.id}` : ''}`);
      });
      output.push('');
    }

    const variants = template.findings.filter((finding) => !finding.commonToTemplate);
    if (variants.length) {
      output.push(es ? 'Variaciones encontradas:' : 'Observed variations:');
      variants.forEach((finding) => {
        output.push(`- [${finding.outcome.toUpperCase()}] ${finding.ruleId} · ${finding.sampleCount}/${finding.totalSamples} ${es ? 'muestras' : 'samples'} · ${finding.title}`);
      });
      output.push('');
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
