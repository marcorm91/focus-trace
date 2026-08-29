// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import {
  captureAriaWidgetProbes,
  evaluateAriaWidgetProbe,
} from '../lib/runtime/aria-widget-runtime';
import {
  captureCompositeWidgetProbes,
  evaluateCompositeWidgetProbe,
} from '../lib/runtime/composite-widget-runtime';
import { buildFocusGraph, buildObservedFocusPath } from '../lib/runtime/focus-graph';
import { buildFocusJourney } from '../lib/runtime/focus-journey';
import type { RuntimeEvent } from '../shared/types';

function render(body: string): void {
  document.open();
  document.write(`<!doctype html><html lang="en"><head><title>Composite runtime</title></head><body>${body}</body></html>`);
  document.close();
}

function element(selector: string): Element {
  const result = document.querySelector(selector);
  if (!result) throw new Error(`Missing fixture element ${selector}`);
  return result;
}

function probe(selector: string, key: string, kind: string) {
  return captureCompositeWidgetProbes(element(selector), { kind: 'keydown', key })
    .find((candidate) => candidate.kind === kind);
}

describe('runtime composite widget validation', () => {
  it('warns when a treeitem expanded state contradicts its child group', () => {
    render(`
      <div role="tree">
        <div id="parent" role="treeitem" tabindex="0" aria-expanded="false">
          Parent
          <div id="children" role="group">
            <div role="treeitem" tabindex="-1">Child</div>
          </div>
        </div>
      </div>
    `);

    (element('#parent') as HTMLElement).focus();
    const expanded = captureCompositeWidgetProbes(element('#parent'), { kind: 'click' })
      .find((candidate) => candidate.kind === 'tree-expanded-state');

    expect(evaluateCompositeWidgetProbe(expanded!)).toMatchObject({
      ruleId: 'FT-RUNTIME-ARIA-006',
      outcome: 'warning',
      severity: 'serious',
    });

    element('#children').setAttribute('hidden', '');
    expect(evaluateCompositeWidgetProbe(expanded!)).toBeUndefined();
  });

  it('reviews broken roving tabindex and tree arrow navigation independently', () => {
    render(`
      <div id="tree" role="tree">
        <div id="one" role="treeitem" tabindex="0">One</div>
        <div id="two" role="treeitem" tabindex="0">Two</div>
      </div>
    `);

    (element('#one') as HTMLElement).focus();
    const probes = captureCompositeWidgetProbes(element('#one'), { kind: 'keydown', key: 'ArrowDown' });
    const roving = probes.find((candidate) => candidate.kind === 'composite-roving-tabindex');
    const navigation = probes.find((candidate) => candidate.kind === 'tree-arrow-navigation');

    expect(evaluateCompositeWidgetProbe(roving!)).toMatchObject({ ruleId: 'FT-APG-011', outcome: 'review' });
    expect(evaluateCompositeWidgetProbe(navigation!)).toMatchObject({ ruleId: 'FT-APG-012', outcome: 'review' });

    element('#one').setAttribute('tabindex', '-1');
    (element('#two') as HTMLElement).focus();
    expect(evaluateCompositeWidgetProbe(roving!)).toBeUndefined();
    expect(evaluateCompositeWidgetProbe(navigation!)).toBeUndefined();
  });

  it('maps horizontal tree arrows to the declared orientation', () => {
    render(`
      <div id="tree" role="tree" aria-orientation="horizontal">
        <div id="one" role="treeitem" tabindex="0">One</div>
        <div id="two" role="treeitem" tabindex="-1">Two</div>
      </div>
    `);

    (element('#one') as HTMLElement).focus();
    const navigation = probe('#one', 'ArrowRight', 'tree-arrow-navigation');
    expect(evaluateCompositeWidgetProbe(navigation!)).toMatchObject({ ruleId: 'FT-APG-012' });

    (element('#two') as HTMLElement).focus();
    expect(evaluateCompositeWidgetProbe(navigation!)).toBeUndefined();
  });

  it('reviews multiple selected treeitems only for single-select trees', () => {
    render(`
      <div id="tree" role="tree">
        <div role="treeitem" tabindex="0" aria-selected="true">One</div>
        <div role="treeitem" tabindex="-1" aria-selected="true">Two</div>
      </div>
    `);

    const selection = captureCompositeWidgetProbes(element('#tree'), { kind: 'click' })
      .find((candidate) => candidate.kind === 'tree-selection');
    expect(evaluateCompositeWidgetProbe(selection!)).toMatchObject({ ruleId: 'FT-APG-014', outcome: 'review' });

    element('#tree').setAttribute('aria-multiselectable', 'true');
    expect(evaluateCompositeWidgetProbe(selection!)).toBeUndefined();
  });

  it('reviews grid arrow navigation only when the grid is managing the arrow key', () => {
    render(`
      <div id="grid" role="grid">
        <div role="row">
          <div id="a1" role="gridcell" tabindex="0">A1</div>
          <div id="a2" role="gridcell" tabindex="-1">A2</div>
        </div>
      </div>
    `);

    (element('#a1') as HTMLElement).focus();
    const navigation = probe('#a1', 'ArrowRight', 'grid-arrow-navigation');
    expect(evaluateCompositeWidgetProbe(navigation!)).toMatchObject({ ruleId: 'FT-APG-013', outcome: 'review' });

    element('#a1').setAttribute('tabindex', '-1');
    element('#a2').setAttribute('tabindex', '0');
    (element('#a2') as HTMLElement).focus();
    expect(evaluateCompositeWidgetProbe(navigation!)).toBeUndefined();
  });

  it('does not impose grid arrow navigation while an embedded editor consumes the key', () => {
    render(`
      <div id="grid" role="grid">
        <div role="row">
          <div role="gridcell"><input id="editor" value="Madrid"></div>
          <div role="gridcell" tabindex="-1">Next cell</div>
        </div>
      </div>
    `);

    (element('#editor') as HTMLInputElement).focus();
    expect(captureCompositeWidgetProbes(element('#editor'), { kind: 'keydown', key: 'ArrowRight' })).toEqual([]);
  });

  it('validates aria-activedescendant through nested aria-owns relationships', () => {
    render(`
      <div id="tree" role="tree" tabindex="0" aria-owns="external-group" aria-activedescendant="external-item"></div>
      <div id="external-group" role="group" aria-owns="external-item"></div>
      <div id="external-item" role="treeitem">External item</div>
    `);

    (element('#tree') as HTMLElement).focus();
    const active = captureAriaWidgetProbes(element('#tree'), { kind: 'keydown', key: 'ArrowDown' })
      .find((candidate) => candidate.kind === 'active-descendant');
    expect(evaluateAriaWidgetProbe(active!)).toBeUndefined();
  });

  it('reuses FT-RUNTIME-ARIA-005 for invalid tree active-descendant relationships', () => {
    render(`
      <div id="tree" role="tree" tabindex="0" aria-activedescendant="one">
        <div id="one" role="treeitem">One</div>
      </div>
    `);

    (element('#tree') as HTMLElement).focus();
    const active = captureAriaWidgetProbes(element('#tree'), { kind: 'keydown', key: 'ArrowDown' })
      .find((candidate) => candidate.kind === 'active-descendant');
    element('#tree').setAttribute('aria-activedescendant', 'missing');

    expect(evaluateAriaWidgetProbe(active!)).toMatchObject({
      ruleId: 'FT-RUNTIME-ARIA-005',
      outcome: 'warning',
    });
  });

  it('records a valid aria-activedescendant change as informational virtual focus', () => {
    render(`
      <div id="tree" role="tree" tabindex="0" aria-activedescendant="one">
        <div id="one" role="treeitem">One</div>
        <div id="two" role="treeitem">Two</div>
      </div>
    `);

    const tree = element('#tree') as HTMLElement;
    tree.focus();
    const transition = captureAriaWidgetProbes(tree, { kind: 'keydown', key: 'ArrowDown' })
      .find((candidate) => candidate.kind === 'active-descendant-transition');
    tree.setAttribute('aria-activedescendant', 'two');
    const observed = evaluateAriaWidgetProbe(transition!);

    expect(observed).toMatchObject({
      kind: 'virtual-focus',
      severity: 'info',
      element: { id: 'two', role: 'treeitem' },
    });
    expect(observed?.outcome).toBeUndefined();
    expect(observed?.ruleId).toBeUndefined();
  });

  it('includes virtual focus destinations in Journey, Graph and page path', () => {
    const events: RuntimeEvent[] = [
      {
        id: 'dom', timestamp: 1, kind: 'focus', severity: 'info', title: 'Focus tree',
        element: { tag: 'div', role: 'tree', selector: '#tree', name: 'Files' },
      },
      {
        id: 'virtual-1', timestamp: 2, kind: 'virtual-focus', severity: 'info', title: 'Virtual focus moved', interactionId: 'ix-1',
        element: { tag: 'div', role: 'treeitem', selector: '#one', name: 'One' },
      },
      {
        id: 'virtual-2', timestamp: 3, kind: 'virtual-focus', severity: 'info', title: 'Virtual focus moved', interactionId: 'ix-2',
        element: { tag: 'div', role: 'treeitem', selector: '#two', name: 'Two' },
      },
    ];

    const journey = buildFocusJourney(events);
    expect(journey.steps.map((step) => step.mode)).toEqual(['dom', 'virtual', 'virtual']);
    expect(journey.virtual).toBe(2);

    const graph = buildFocusGraph(events);
    expect(graph.nodes.map((node) => node.id)).toEqual(['#tree', '#one', '#two']);
    expect(graph.transitions).toBe(2);

    expect(buildObservedFocusPath(events).map((item) => item.id)).toEqual(['#tree', '#one', '#two']);
  });
});
