import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { syncActRules } from './act-sync.mjs';
import { syncAriaRegistry } from './aria-sync.mjs';

export async function syncStandards({
  actOutput = 'generated/act-catalog.json',
  ariaOutput = 'generated/aria-registry.json',
} = {}) {
  const [act, aria] = await Promise.all([
    syncActRules(actOutput),
    syncAriaRegistry(ariaOutput),
  ]);
  return { act, aria };
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  const { act, aria } = await syncStandards();
  console.log(
    `Standards sync complete: ACT ${act.summary.total} rules (${act.summary.deprecated} deprecated); ARIA ${aria.summary.roles} roles (${aria.summary.deprecatedRoles} deprecated).`,
  );
}
