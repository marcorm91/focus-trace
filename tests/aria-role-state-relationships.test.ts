import { beforeEach, describe, expect, it } from 'vitest';
import { evaluateAriaRoleStateRelationships } from '../lib/audit/aria-role-state-relationships';

function family(name: string) {
  return evaluateAriaRoleStateRelationships(document).filter((evaluation) => evaluation.family === name);
}

describe('ARIA role, state and relationship checks', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('role');
    document.body.removeAttribute('aria-hidden');
    document.body.removeAttribute('role');
    document.body.innerHTML = '';
  });

  it('fails only when the top-level body is explicitly aria-hidden=true', () => {
    expect(family('hidden-body')).toMatchObject([{ outcome: 'pass' }]);

    document.body.setAttribute('aria-hidden', 'true');
    expect(family('hidden-body')).toMatchObject([{
      outcome: 'fail',
      element: document.body,
    }]);

    document.body.setAttribute('aria-hidden', 'false');
    expect(family('hidden-body')).toMatchObject([{ outcome: 'pass' }]);
  });

  it('does not run the page-body rule for a component root', () => {
    document.body.innerHTML = '<section id="component"><button>Save</button></section>';
    const component = document.querySelector('#component')!;
    const evaluations = evaluateAriaRoleStateRelationships(component);
    expect(evaluations.some((evaluation) => evaluation.family === 'hidden-body')).toBe(false);
  });

  it('warns when native checked state is duplicated with aria-checked', () => {
    document.body.innerHTML = '<input id="choice" type="checkbox" checked aria-checked="false">';
    const warnings = family('host-constraint');
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatchObject({ outcome: 'warning' });
    expect(warnings[0]!.detail).toContain('already exposes its checked state natively');
  });

  it('warns for row-only treegrid properties outside treegrid and accepts the same authoring inside treegrid', () => {
    document.body.innerHTML = '<div id="bad" role="row" aria-level="2"></div><div role="treegrid"><div id="good" role="row" aria-level="2"></div></div>';
    const warnings = family('host-constraint');
    expect(warnings).toHaveLength(1);
    expect((warnings[0]!.element as HTMLElement).id).toBe('bad');
    expect(warnings[0]!.detail).toContain('treegrid');
  });

  it('applies conservative ARIA in HTML role constraints without duplicating invalid-role vocabulary checks', () => {
    document.body.innerHTML = '<button id="bad" role="heading">Title</button><button id="good" role="switch">Theme</button><br id="line" role="button">';
    const warnings = family('host-constraint');
    expect(warnings.map((warning) => (warning.element as HTMLElement).id).sort()).toEqual(['bad', 'line']);
  });

  it('reviews braille labels that have no observable non-braille accessible name', () => {
    document.body.innerHTML = '<button id="braille" aria-braillelabel="⠎⠁⠧⠑"></button>';
    const reviews = family('description-equivalence');
    expect(reviews).toHaveLength(1);
    expect(reviews[0]).toMatchObject({ outcome: 'review' });
    expect(reviews[0]!.detail).toContain('no non-braille accessible name');
  });

  it('reviews braille role descriptions without aria-roledescription and accepts an equivalent pair', () => {
    document.body.innerHTML = '<div id="bad" role="region" aria-brailleroledescription="⠗⠑⠛⠊⠕⠝"></div><div id="good" role="region" aria-roledescription="carousel" aria-brailleroledescription="⠉⠁⠗⠕⠥⠎⠑⠇"></div>';
    const evaluations = family('description-equivalence');
    const bad = evaluations.find((evaluation) => (evaluation.element as HTMLElement).id === 'bad');
    const good = evaluations.find((evaluation) => (evaluation.element as HTMLElement).id === 'good');
    expect(bad?.outcome).toBe('review');
    expect(bad?.detail).toContain('without a non-empty aria-roledescription');
    expect(good?.outcome).toBe('pass');
  });

  it('reviews aria-roledescription without a resolved semantic role and ignores hidden candidates', () => {
    document.body.innerHTML = '<div id="bad" aria-roledescription="carousel"></div><div id="hidden" hidden aria-roledescription="carousel"></div>';
    const evaluations = family('description-equivalence');
    expect(evaluations).toHaveLength(1);
    expect((evaluations[0]!.element as HTMLElement).id).toBe('bad');
    expect(evaluations[0]!.outcome).toBe('review');
  });
});
