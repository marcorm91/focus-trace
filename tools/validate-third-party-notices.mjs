import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  const root = process.cwd();
  const registry = JSON.parse(await readFile(resolve(root, 'generated/axe-rule-severities.json'), 'utf8'));
  const notice = await readFile(resolve(root, 'generated/axe-rule-severities.NOTICE.md'), 'utf8');
  const thirdParty = await readFile(resolve(root, 'THIRD_PARTY_NOTICES.md'), 'utf8');

  const repository = registry.source?.repository;
  const release = registry.source?.release;
  const tag = registry.source?.tag;

  assert(repository === 'dequelabs/axe-core', 'axe notice validation requires dequelabs/axe-core as the benchmark source.');
  assert(typeof release === 'string' && release.length > 0, 'axe notice validation requires a recorded release.');
  assert(typeof tag === 'string' && /^v\d+\.\d+\.\d+/.test(tag), 'axe notice validation requires a stable release tag.');

  const licenseUrl = `https://github.com/${repository}/blob/${tag}/LICENSE`;
  for (const [name, text] of [['snapshot notice', notice], ['third-party notices', thirdParty]]) {
    assert(text.includes(repository), `${name} must identify ${repository}.`);
    assert(text.includes(release), `${name} must identify axe-core release ${release}.`);
    assert(text.includes(tag), `${name} must identify axe-core tag ${tag}.`);
    assert(text.includes('MPL-2.0'), `${name} must identify the MPL-2.0 license.`);
    assert(text.includes(licenseUrl), `${name} must link to the pinned upstream license.`);
    assert(text.includes('Deque Systems, Inc.'), `${name} must preserve the Deque trademark attribution.`);
  }

  assert(thirdParty.includes('not affiliated with'), 'third-party notices must state that FocusTrace is not affiliated with Deque.');
  assert(thirdParty.includes('development-only'), 'third-party notices must identify the axe snapshot as development-only benchmark data.');

  console.log(`Third-party notices validated for axe-core ${release} (${tag}).`);
}

await main();
