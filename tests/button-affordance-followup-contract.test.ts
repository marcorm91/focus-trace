import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('button affordance follow-up', () => {
  it('keeps the analysis-ready badge aligned to the right of the current page label', () => {
    const css = source('entrypoints/sidepanel/button-affordance-followup.css');

    expect(css).toContain('.quick-start-copy {');
    expect(css).toContain('grid-template-columns: minmax(0, 1fr) auto;');
    expect(css).toContain('.quick-start-copy > p {');
    expect(css).toContain('grid-column: 1;');
    expect(css).toContain('.quick-start-copy > .status {');
    expect(css).toContain('grid-column: 2;');
    expect(css).toContain('justify-self: end;');
    expect(css).toContain('@media (max-width: 420px)');
  });

  it('renders workspace navigation as explicit buttons instead of flat cards', () => {
    const css = source('entrypoints/sidepanel/button-affordance-followup.css');

    expect(css).toContain('.workspace-nav.tabs button {');
    expect(css).toContain('border: 1.5px solid var(--ft-border);');
    expect(css).toContain('box-shadow: var(--ft-shadow-sm);');
    expect(css).toContain('cursor: pointer;');
    expect(css).toContain('.workspace-nav.tabs button:not(:disabled):hover {');
    expect(css).toContain('.workspace-nav.tabs button:not(:disabled):active {');
    expect(css).toContain('.workspace-nav.tabs button.active {');
  });

  it('gives the LinkedIn contact link the same button affordance language', () => {
    const css = source('entrypoints/sidepanel/button-affordance-followup.css');
    const settings = source('entrypoints/sidepanel/views/SettingsView.tsx');
    const index = source('entrypoints/sidepanel/index.css');

    expect(settings).toContain('className="settings-contact-link"');
    expect(css).toContain('.settings-contact-link {');
    expect(css).toContain('background: var(--ft-surface);');
    expect(css).toContain('color: var(--ft-ink);');
    expect(css).toContain('box-shadow: var(--ft-shadow-sm);');
    expect(css).toContain('.settings-contact-link:hover {');
    expect(css).toContain('.settings-contact-link:active {');
    expect(index).toContain("@import url('./button-affordance-followup.css') layer(policy);");
    expect(css).not.toContain('!important');
  });
});
