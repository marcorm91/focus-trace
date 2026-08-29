import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { syncActRules } from './act-sync.mjs';
import { syncAriaRegistry } from './aria-sync.mjs';
import { syncHtmlObsoleteCatalog } from './html-sync.mjs';
import { syncLanguageSubtags } from './language-sync.mjs';
import { syncStandardsSources } from './specs-sync.mjs';
import { syncWcagCatalog } from './wcag-sync.mjs';

export async function syncStandards({
  actOutput = 'generated/act-catalog.json',
  ariaOutput = 'generated/aria-registry.json',
  languageOutput = 'generated/language-subtags.json',
  wcagOutput = 'generated/wcag-catalog.json',
  htmlOutput = 'generated/html-obsolete-catalog.json',
  sourcesOutput = 'generated/standards-sources.json',
} = {}) {
  const [act, aria, language, wcag, html, sources] = await Promise.all([
    syncActRules(actOutput),
    syncAriaRegistry(ariaOutput),
    syncLanguageSubtags(languageOutput),
    syncWcagCatalog(wcagOutput),
    syncHtmlObsoleteCatalog(htmlOutput),
    syncStandardsSources(sourcesOutput),
  ]);
  return { act, aria, language, wcag, html, sources };
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  const { act, aria, language, wcag, html, sources } = await syncStandards();
  console.log(
    `Standards sync complete: WCAG ${wcag.summary.active} active criteria; ACT ${act.summary.total} rules (${act.summary.deprecated} deprecated); ARIA ${aria.summary.roles} roles, ${aria.summary.properties} states/properties; HTML ${html.summary.obsoleteElements} obsolete elements / ${html.summary.obsoleteAttributePairs} obsolete attribute pairs; IANA ${language.summary.languages} language subtags; ${sources.summary.sources} upstream specification fingerprints.`,
  );
}
