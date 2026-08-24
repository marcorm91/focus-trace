import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { syncActRules } from './act-sync.mjs';
import { syncAriaRegistry } from './aria-sync.mjs';
import { syncLanguageSubtags } from './language-sync.mjs';

export async function syncStandards({
  actOutput = 'generated/act-catalog.json',
  ariaOutput = 'generated/aria-registry.json',
  languageOutput = 'generated/language-subtags.json',
} = {}) {
  const [act, aria, language] = await Promise.all([
    syncActRules(actOutput),
    syncAriaRegistry(ariaOutput),
    syncLanguageSubtags(languageOutput),
  ]);
  return { act, aria, language };
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  const { act, aria, language } = await syncStandards();
  console.log(
    `Standards sync complete: ACT ${act.summary.total} rules (${act.summary.deprecated} deprecated); ARIA ${aria.summary.roles} roles, ${aria.summary.properties} states/properties (${aria.summary.deprecatedRoles} deprecated roles); IANA ${language.summary.languages} language subtags.`,
  );
}
