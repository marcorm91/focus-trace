import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('README language and instructions contract', () => {
  it('provides a visible English/Spanish README switcher in both documents', () => {
    const english = source('README.md');
    const spanish = source('README.es.md');

    expect(english).toContain('<strong>English</strong>');
    expect(english).toContain('href="./README.es.md"');
    expect(spanish).toContain('href="./README.md"');
    expect(spanish).toContain('<strong>Español</strong>');
    expect(spanish).toContain('## ¿Qué lo hace diferente?');
    expect(spanish).toContain('## Privacidad');
  });

  it('places Instructions between reset and settings in the topbar', () => {
    const app = source('entrypoints/sidepanel/App.tsx');
    const resetIndex = app.indexOf('className="reset-all-trigger"');
    const instructionsIndex = app.indexOf('className="instructions-trigger"');
    const settingsIndex = app.indexOf('className="settings-trigger"');

    expect(resetIndex).toBeGreaterThan(-1);
    expect(instructionsIndex).toBeGreaterThan(resetIndex);
    expect(settingsIndex).toBeGreaterThan(instructionsIndex);
    expect(app).toContain("tr(language, 'Instructions', 'Instrucciones')");
    expect(app).toContain("view === 'instructions'");
    expect(app).toContain('<InstructionsView language={language} />');
  });

  it('uses the same focused Back pattern as Settings and restores the workspace tab', () => {
    const focus = source('entrypoints/sidepanel/settings-focus.ts');
    const layout = source('entrypoints/sidepanel/workspace-layout.css');
    const policy = source('entrypoints/sidepanel/shared-control-policy.css');
    const instructions = source('entrypoints/sidepanel/views/InstructionsView.tsx');

    expect(focus).toContain("type FocusedSubview = 'settings' | 'instructions'");
    expect(focus).toContain('openFocusedInstructionsView');
    expect(focus).toContain('closeFocusedInstructionsView');
    expect(focus).toContain('ftFocusedSubviewReturn');
    expect(policy).toContain("html[data-ft-focused-subview-open]");
    expect(layout).toContain('.settings-back-trigger');
    expect(instructions).toContain('className="settings-back-trigger"');
    expect(instructions).toContain("tr(language, 'Back', 'Volver')");
  });

  it('documents the main workflows and result semantics in both interface languages', () => {
    const instructions = source('entrypoints/sidepanel/views/InstructionsView.tsx');

    expect(instructions).toContain("'How to use FocusTrace', 'Cómo usar FocusTrace'");
    expect(instructions).toContain("'Start here', 'Empieza aquí'");
    expect(instructions).toContain("'Review', 'Revisión'");
    expect(instructions).toContain("'Analyze a component', 'Analizar un componente'");
    expect(instructions).toContain("'Site Audit', 'Análisis de sitio'");
    expect(instructions).toContain('title="Trace"');
    expect(instructions).toContain("'Automate focus', 'Automatizar foco'");
    expect(instructions).toContain("'Headings', 'Encabezados'");
    expect(instructions).toContain("'Report', 'Informe'");
    expect(instructions).toContain('title="FocusTrace Memory"');
    expect(instructions).toContain("'Settings and privacy', 'Ajustes y privacidad'");
    expect(instructions).toContain('Failures are findings FocusTrace can determine');
    expect(instructions).toContain('Las revisiones necesitan contexto humano');
    expect(instructions).toContain('Warnings highlight risky HTML/ARIA authoring');
    expect(instructions).toContain('Los avisos señalan riesgos de autoría HTML/ARIA');
    expect(instructions).toContain('After stopping a manual Trace, you can remove a mistaken interaction.');
    expect(instructions).toContain('La leyenda de reglas se incluye al principio de las exportaciones PDF, TXT y Markdown');
  });

  it('explains FocusTrace identifiers, outcomes and report terminology from one shared source', () => {
    const instructions = source('entrypoints/sidepanel/views/InstructionsView.tsx');
    const legend = source('shared/rule-legend.ts');
    const css = source('entrypoints/sidepanel/instructions.css');
    const convention = source('docs/RULE_IDENTIFIERS.md');
    const runtimeAria = source('docs/RUNTIME_ARIA.md');

    expect(instructions).toContain("ruleLegendCopy(language)");
    for (const prefix of ['FT-WCAG-###', 'FT-WARN-###', 'FT-REVIEW-###', 'FT-RUNTIME-###', 'FT-RUNTIME-ARIA-###', 'FT-APG-###']) {
      expect(legend).toContain(`pattern: '${prefix}'`);
      expect(convention).toContain(`\`${prefix}\``);
    }
    expect(legend).toContain("'Family, result and severity are different.'");
    expect(legend).toContain("'Finding vs occurrence.'");
    expect(convention).toContain('Do **not** introduce a new prefix just because a new feature or component exists.');
    expect(convention).toContain('Tree/Grid runtime work should continue using `FT-RUNTIME-ARIA`');
    expect(convention).toContain('Accessibility Tree or assistive-technology observations');
    expect(convention).toContain('`docs/RUNTIME_ARIA.md` applies this policy');
    expect(runtimeAria).toContain('[`RULE_IDENTIFIERS.md`](RULE_IDENTIFIERS.md)');
    expect(runtimeAria).toContain('registered identifier families');
    expect(css).toContain('.instructions-legend');
    expect(css).toContain('grid-template-columns: minmax(126px, max-content) minmax(0, 1fr);');
  });

  it('keeps the instructions trigger centered and the intro text untruncated', () => {
    const css = source('entrypoints/sidepanel/instructions.css');
    const entry = source('entrypoints/sidepanel/index.css');

    expect(entry).toContain("url('./instructions.css') layer(components)");
    expect(css).toContain('.topbar-tools .instructions-trigger {');
    expect(css).toContain('place-items: center;');
    expect(css).toContain('cursor: pointer;');
    expect(css).toContain('.topbar-tools .instructions-trigger > span');
    expect(css).toContain('--ft-mask: url(');

    const headingRule = css.slice(css.indexOf('.instructions-heading p'), css.indexOf('.instructions-start,'));
    expect(headingRule).toContain('text-overflow: clip;');
    expect(headingRule).toContain('white-space: normal;');
    expect(headingRule).not.toContain('ellipsis');
  });

  it('renders the tool guide as native collapsible accordion sections', () => {
    const instructions = source('entrypoints/sidepanel/views/InstructionsView.tsx');
    const css = source('entrypoints/sidepanel/instructions.css');

    expect(instructions).toContain('<details className="instructions-card">');
    expect(instructions).toContain('<summary>{title}</summary>');
    expect(instructions).toContain('className="instructions-card-body"');
    expect(css).toContain('grid-template-columns: 1fr;');
    expect(css).toContain('.instructions-card > summary');
    expect(css).toContain('.instructions-card[open] > summary');
    expect(css).not.toContain('!important');
  });
});
