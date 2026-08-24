import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { fetchWithRetry, normaliseText, writeJson } from './standards-utils.mjs';

const ARIA_REPOSITORY = 'w3c/aria';
const ARIA_REF = 'main';
const ROLE_INFO_URL = `https://raw.githubusercontent.com/${ARIA_REPOSITORY}/${ARIA_REF}/common/script/roleInfo.js`;
const SPEC_URL = `https://raw.githubusercontent.com/${ARIA_REPOSITORY}/${ARIA_REF}/index.html`;
const DEFAULT_OUTPUT = 'generated/aria-registry.json';

export function parseRoleInfoSource(source) {
  const sandbox = Object.create(null);
  vm.runInNewContext(source, sandbox, { timeout: 1_000, filename: 'w3c-roleInfo.js' });
  if (!sandbox.roleInfo || typeof sandbox.roleInfo !== 'object') {
    throw new Error('W3C roleInfo.js did not expose a roleInfo object.');
  }
  return sandbox.roleInfo;
}

export function ariaVersionFromSpec(specHtml) {
  const title = specHtml.match(/<title>\s*Accessible Rich Internet Applications \(WAI-ARIA\)\s+([0-9.]+)\s*<\/title>/i);
  return title?.[1] ?? 'unknown';
}

function roleSection(specHtml, roleName) {
  const opening = `<div class="role" id="${roleName}">`;
  const start = specHtml.indexOf(opening);
  if (start < 0) return '';
  const next = specHtml.indexOf('<div class="role" id="', start + opening.length);
  return specHtml.slice(start, next >= 0 ? next : undefined);
}

export function deprecatedRoleVersion(specHtml, roleName) {
  const section = roleSection(specHtml, roleName);
  if (!section) return null;
  const descriptionStart = section.indexOf('<div class="role-description">');
  if (descriptionStart < 0) return null;
  const tableStart = section.indexOf('<table', descriptionStart);
  const description = section.slice(descriptionStart, tableStart >= 0 ? tableStart : Math.min(section.length, descriptionStart + 6_000));
  const match = normaliseText(description).match(/\[Deprecated in ARIA\s+([0-9.]+)\]/i);
  return match?.[1] ?? null;
}

function normaliseProperty(property) {
  return {
    name: property.name,
    kind: property.is,
    required: Boolean(property.required),
    disallowed: Boolean(property.disallowed),
    deprecated: Boolean(property.deprecated),
  };
}

export function buildAriaRegistry(roleInfo, specHtml) {
  const version = ariaVersionFromSpec(specHtml);
  const roles = Object.values(roleInfo)
    .map((role) => {
      const deprecatedVersion = deprecatedRoleVersion(specHtml, role.name);
      const properties = [...(role.allprops ?? [])]
        .map(normaliseProperty)
        .sort((a, b) => a.name.localeCompare(b.name));

      return {
        name: role.name,
        parentRoles: [...(role.parentRoles ?? [])].sort(),
        deprecated: Boolean(deprecatedVersion),
        deprecatedVersion,
        properties,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const deprecatedRolePropertyPairs = roles.reduce(
    (total, role) => total + role.properties.filter((property) => property.deprecated).length,
    0,
  );
  const disallowedRolePropertyPairs = roles.reduce(
    (total, role) => total + role.properties.filter((property) => property.disallowed).length,
    0,
  );
  const requiredRolePropertyPairs = roles.reduce(
    (total, role) => total + role.properties.filter((property) => property.required).length,
    0,
  );

  return {
    schemaVersion: 1,
    source: {
      repository: ARIA_REPOSITORY,
      ref: ARIA_REF,
      version,
      roleInfo: 'common/script/roleInfo.js',
      specification: 'index.html',
    },
    summary: {
      roles: roles.length,
      deprecatedRoles: roles.filter((role) => role.deprecated).length,
      deprecatedRolePropertyPairs,
      disallowedRolePropertyPairs,
      requiredRolePropertyPairs,
    },
    roles,
  };
}

export async function syncAriaRegistry(outputPath = DEFAULT_OUTPUT) {
  const headers = { 'User-Agent': 'FocusTrace-ARIA-Sync' };
  const [roleInfoResponse, specResponse] = await Promise.all([
    fetchWithRetry(ROLE_INFO_URL, { headers }),
    fetchWithRetry(SPEC_URL, { headers }),
  ]);

  const roleInfoSource = await roleInfoResponse.text();
  const specHtml = await specResponse.text();
  const registry = buildAriaRegistry(parseRoleInfoSource(roleInfoSource), specHtml);
  await writeJson(outputPath, registry);
  return registry;
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  const output = process.argv[2] ?? DEFAULT_OUTPUT;
  const registry = await syncAriaRegistry(output);
  console.log(
    `ARIA registry synced: ${registry.summary.roles} roles, ${registry.summary.deprecatedRoles} deprecated roles, ${registry.summary.deprecatedRolePropertyPairs} deprecated role/property pairs.`,
  );
}
