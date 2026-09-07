// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { evaluateLanguageParts } from '../lib/audit/language-parts';

function render(body: string) {
  document.open();
  document.write(`<!doctype html><html lang="en"><head><title>Test</title></head><body>${body}</body></html>`);
  document.close();
}

describe('WCAG 3.1.2 explicit language-part subset', () => {
  it('passes a declared content language with a known primary IANA subtag', () => {
    render('<p id="copy" lang="fr-CH">Bonjour tout le monde</p>');
    expect(evaluateLanguageParts()).toEqual([
      expect.objectContaining({ element: document.querySelector('#copy'), value: 'fr-CH', primary: 'fr', outcome: 'pass' }),
    ]);
  });

  it('fails a declared content language whose primary subtag is unknown', () => {
    render('<p id="copy" lang="English">Hello world</p>');
    expect(evaluateLanguageParts()).toEqual([
      expect.objectContaining({ element: document.querySelector('#copy'), value: 'English', primary: 'english', outcome: 'fail' }),
    ]);
  });

  it('keeps whitespace-only declared language applicable and failing', () => {
    render('<p id="copy" lang="   ">Hello world</p>');
    expect(evaluateLanguageParts()).toEqual([
      expect.objectContaining({ element: document.querySelector('#copy'), primary: '', outcome: 'fail' }),
    ]);
  });

  it('ignores an empty lang value and elements without inheriting human text', () => {
    render('<p lang="">No declared language</p><div id="wrapper" lang="English"><span lang="en">Nested override</span></div>');
    const evaluations = evaluateLanguageParts();
    expect(evaluations.some((entry) => entry.element.id === 'wrapper')).toBe(false);
    expect(evaluations).toHaveLength(1);
    expect(evaluations[0]).toMatchObject({ value: 'en', outcome: 'pass' });
  });

  it('does not reinterpret programming-language labels as human-language failures', () => {
    render('<pre lang="python"><code>print("hello")</code></pre><code lang="typescript">const answer = 42;</code>');
    expect(evaluateLanguageParts()).toEqual([]);
  });

  it('ignores text removed from rendering but keeps visible aria-hidden text in scope', () => {
    render('<p id="hidden" lang="English" style="display:none">Hidden</p><p id="visible" lang="English" aria-hidden="true">Visible text</p>');
    const evaluations = evaluateLanguageParts();
    expect(evaluations.some((entry) => entry.element.id === 'hidden')).toBe(false);
    expect(evaluations).toEqual([
      expect.objectContaining({ element: document.querySelector('#visible'), outcome: 'fail' }),
    ]);
  });

  it('ignores a declared language when an ancestor removes the whole fragment from rendering', () => {
    render('<section style="display:none"><p id="nested" lang="English">Hidden by ancestor</p></section>');
    expect(evaluateLanguageParts()).toEqual([]);
  });

  it('does not treat script or style source text as human-language content', () => {
    render('<script lang="English">window.example = true;</script><style lang="English">body { display: block; }</style>');
    expect(evaluateLanguageParts()).toEqual([]);
  });
});
