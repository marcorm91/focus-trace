import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SOURCE_ROOTS = ['shared', 'lib'];
const README_FILES = ['README.md', 'README.es.md'];
const RULE_ID_PATTERN = /\b(?:id|ruleId)\s*:\s*['"](FT-(?:(?:WCAG|WARN|REVIEW|APG)-\d{3}|RUNTIME(?:-ARIA)?-\d{3}))['"]/g;

const REQUIRED_HEADINGS = {
  'README.md': [
    '## Functional capability API',
    '### Static WCAG rules',
    '### Contextual and structural reviews',
    '### HTML and ARIA authoring warnings',
    '### Runtime WCAG rules',
    '### Runtime ARIA warnings',
    '### Modal dialog runtime guidance',
    '### APG widget runtime reviews',
    '### Structure',
    '### Trace tools',
    '### Focus Walk',
    '### Site Audit',
    '### FocusTrace Memory',
    '### Reports and export',
  ],
  'README.es.md': [
    '## API funcional de capacidades',
    '### Reglas WCAG estáticas',
    '### Revisiones contextuales y estructurales',
    '### Avisos de autoría HTML y ARIA',
    '### Reglas WCAG runtime',
    '### Avisos ARIA runtime',
    '### Guía runtime para diálogos modales',
    '### Revisiones runtime de widgets APG',
    '### Estructura',
    '### Herramientas de Trace',
    '### Focus Walk',
    '### Site Audit',
    '### FocusTrace Memory',
    '### Informes y exportación',
  ],
};

function sourceFiles(root) {
  const files = [];
  for (const entry of readdirSync(root)) {
    const path = join(root, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) files.push(...sourceFiles(path));
    else if (/\.(?:ts|tsx)$/.test(entry)) files.push(path);
  }
  return files;
}

function definedRuleIds() {
  const ids = new Set();
  for (const root of SOURCE_ROOTS) {
    for (const path of sourceFiles(root)) {
      const source = readFileSync(path, 'utf8');
      for (const match of source.matchAll(RULE_ID_PATTERN)) ids.add(match[1]);
    }
  }
  return [...ids].sort();
}

const ruleIds = definedRuleIds();
if (ruleIds.length === 0) {
  throw new Error('Capability catalog validation found no source-defined FocusTrace rule IDs.');
}

const errors = [];
for (const readmePath of README_FILES) {
  const readme = readFileSync(readmePath, 'utf8');
  const missingIds = ruleIds.filter((id) => !readme.includes(`\`${id}\``));
  if (missingIds.length > 0) {
    errors.push(`${readmePath} is missing rule IDs: ${missingIds.join(', ')}`);
  }

  for (const heading of REQUIRED_HEADINGS[readmePath]) {
    if (!readme.includes(heading)) errors.push(`${readmePath} is missing capability section: ${heading}`);
  }
}

if (errors.length > 0) {
  console.error('FocusTrace capability catalog is out of sync.');
  for (const error of errors) console.error(`- ${error}`);
  console.error('Update README.md and README.es.md together, then rerun npm run capabilities:validate.');
  process.exit(1);
}

console.log(`Capability catalog covers ${ruleIds.length} source-defined rule IDs in English and Spanish.`);
