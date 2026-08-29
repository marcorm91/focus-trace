import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchWithRetry, normaliseText, sha256, writeJson } from './standards-utils.mjs';

const DEFAULT_OUTPUT = 'generated/standards-sources.json';

export const MONITORED_SPECS = [
  { id: 'wcag22', label: 'WCAG 2.2', authority: 'W3C', url: 'https://www.w3.org/TR/WCAG22/', role: 'normative' },
  { id: 'wcag22-understanding', label: 'Understanding WCAG 2.2', authority: 'W3C', url: 'https://www.w3.org/WAI/WCAG22/Understanding/', role: 'informative' },
  { id: 'wcag22-techniques', label: 'Techniques for WCAG 2.2', authority: 'W3C', url: 'https://www.w3.org/WAI/WCAG22/Techniques/', role: 'informative' },
  { id: 'html', label: 'HTML Living Standard', authority: 'WHATWG', url: 'https://html.spec.whatwg.org/multipage/', role: 'normative' },
  { id: 'html-obsolete', label: 'HTML obsolete features', authority: 'WHATWG', url: 'https://html.spec.whatwg.org/multipage/obsolete.html', role: 'normative' },
  { id: 'wai-aria', label: 'WAI-ARIA editor draft', authority: 'W3C', url: 'https://w3c.github.io/aria/', role: 'normative' },
  { id: 'accname', label: 'Accessible Name and Description Computation 1.2', authority: 'W3C', url: 'https://www.w3.org/TR/accname-1.2/', role: 'normative' },
  { id: 'html-aam', label: 'HTML Accessibility API Mappings 1.0', authority: 'W3C', url: 'https://www.w3.org/TR/html-aam-1.0/', role: 'normative' },
  { id: 'core-aam', label: 'Core Accessibility API Mappings 1.2', authority: 'W3C', url: 'https://www.w3.org/TR/core-aam-1.2/', role: 'normative' },
  { id: 'apg', label: 'ARIA Authoring Practices Guide', authority: 'W3C', url: 'https://www.w3.org/WAI/ARIA/apg/', role: 'informative' },
  { id: 'mime-sniff', label: 'MIME Sniffing Living Standard', authority: 'WHATWG', url: 'https://mimesniff.spec.whatwg.org/', role: 'normative' },
  {
    id: 'iana-language-subtags',
    label: 'IANA Language Subtag Registry',
    authority: 'IANA',
    url: 'https://www.iana.org/assignments/language-subtag-registry/language-subtag-registry',
    fallbackUrl: 'https://raw.githubusercontent.com/Masterain98/IANA-BCP47/main/src/iana_bcp47/language-subtag-registry.txt',
    role: 'normative',
  },
];

function stableBody(value = '') {
  return normaliseText(
    value
      .replace(/<!--([\s\S]*?)-->/g, ' ')
      .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
      .replace(/\s+/g, ' '),
  );
}

async function fetchSpec(spec) {
  try {
    const response = await fetchWithRetry(spec.url, { headers: { 'User-Agent': 'FocusTrace-Spec-Monitor' } });
    return { response, resolvedUrl: spec.url, usedFallback: false };
  } catch (error) {
    if (!spec.fallbackUrl) throw error;
    const response = await fetchWithRetry(spec.fallbackUrl, { headers: { 'User-Agent': 'FocusTrace-Spec-Monitor' } });
    return { response, resolvedUrl: spec.fallbackUrl, usedFallback: true };
  }
}

async function fingerprint(spec) {
  const { response, resolvedUrl, usedFallback } = await fetchSpec(spec);
  const body = await response.text();
  const stable = stableBody(body);
  if (stable.length < 100) throw new Error(`Monitored specification ${spec.id} returned unexpectedly little content.`);
  return {
    id: spec.id,
    label: spec.label,
    authority: spec.authority,
    url: spec.url,
    role: spec.role,
    contentHash: sha256(stable),
    ...(spec.fallbackUrl ? { fallbackUrl: spec.fallbackUrl } : {}),
    ...(usedFallback ? { resolvedUrl, usedFallback: true } : {}),
    ...(response.headers.get('etag') ? { etag: response.headers.get('etag') } : {}),
    ...(response.headers.get('last-modified') ? { lastModified: response.headers.get('last-modified') } : {}),
  };
}

export async function syncStandardsSources(outputPath = DEFAULT_OUTPUT) {
  const sources = await Promise.all(MONITORED_SPECS.map((spec) => fingerprint(spec)));
  const registry = {
    schemaVersion: 1,
    summary: {
      sources: sources.length,
      normative: sources.filter((source) => source.role === 'normative').length,
      informative: sources.filter((source) => source.role === 'informative').length,
    },
    sources: sources.sort((a, b) => a.id.localeCompare(b.id)),
  };
  await writeJson(outputPath, registry);
  return registry;
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  const output = process.argv[2] ?? DEFAULT_OUTPUT;
  const registry = await syncStandardsSources(output);
  console.log(`Standards source monitor synced: ${registry.summary.sources} upstream specifications.`);
}
