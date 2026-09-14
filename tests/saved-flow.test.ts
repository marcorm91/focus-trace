import { describe, expect, it } from 'vitest';
import {
  buildSavedUserFlow,
  compareSavedFlowFindings,
  savedFlowActionPolicy,
  savedFlowBrokenFlow,
  savedFlowCurrentFindings,
  savedFlowMissingElement,
  type SavedFlowBaselineFinding,
  type SavedFlowCurrentFinding,
} from '../lib/runtime/saved-flow';
import type { RuntimeEvent, RuntimeInteraction } from '../shared/types';

function event(overrides: Partial<RuntimeEvent> & Pick<RuntimeEvent, 'id' | 'kind'>): RuntimeEvent {
  return {
    timestamp: 1,
    severity: 'info',
    title: overrides.kind,
    ...overrides,
  };
}

function interaction(events: RuntimeEvent[]): RuntimeInteraction {
  return {
    id: 'ix-1',
    correlated: true,
    startedAt: 1,
    endedAt: 2,
    events,
    findings: events.filter((item) => item.outcome).length,
    causes: [],
    breakpointHits: [],
  };
}

describe('saved user-flow regressions', () => {
  it('stores a redacted bounded journey without field values or page text', () => {
    const events = [
      event({
        id: 'key-safe',
        kind: 'keydown',
        interactionId: 'ix-1',
        title: 'Key: ArrowDown',
        element: { tag: 'div', role: 'listbox', selector: '#cities', name: 'Private city selector', className: 'customer-123' },
      }),
      event({
        id: 'input',
        kind: 'input-change',
        interactionId: 'ix-1',
        title: 'Input changed',
        element: { tag: 'input', id: 'password', role: 'textbox', selector: '#password', name: 'Secret password' },
      }),
      event({
        id: 'route',
        kind: 'route',
        interactionId: 'ix-1',
        title: 'Route changed',
        fromUrl: 'https://example.test/account?token=abc#private',
        toUrl: 'https://example.test/settings?user=42#profile',
      }),
    ];

    const flow = buildSavedUserFlow({
      id: 'flow-1',
      name: '  Account flow  ',
      events,
      interactions: [interaction(events)],
      sourceUrl: 'https://example.test/account?token=abc#private',
      now: 100,
    });

    expect(flow.name).toBe('Account flow');
    expect(flow.sourceRoute).toBe('https://example.test/account?[redacted]#[redacted]');
    expect(flow.steps[0]).toMatchObject({ type: 'action', policy: 'auto', key: 'ArrowDown' });
    expect(flow.steps[1]).toMatchObject({ type: 'action', policy: 'manual-stop', sourceEventKind: 'input-change' });
    expect(JSON.stringify(flow)).not.toContain('Private city selector');
    expect(JSON.stringify(flow)).not.toContain('Secret password');
    expect(JSON.stringify(flow)).not.toContain('customer-123');
    expect(JSON.stringify(flow)).not.toContain('token=abc');
    expect(JSON.stringify(flow)).not.toContain('user=42');
    expect(JSON.stringify(flow)).not.toContain('password":"');
  });

  it('uses manual stops for ambiguous or potentially destructive actions', () => {
    expect(savedFlowActionPolicy(event({ id: 'click', kind: 'click', title: 'Click → Delete' }))).toBe('manual-stop');
    expect(savedFlowActionPolicy(event({ id: 'enter', kind: 'keydown', title: 'Key: Enter' }))).toBe('manual-stop');
    expect(savedFlowActionPolicy(event({ id: 'space', kind: 'keydown', title: 'Key: Space' }))).toBe('manual-stop');
    expect(savedFlowActionPolicy(event({ id: 'tab', kind: 'keydown', title: 'Key: Tab' }))).toBe('manual-stop');
    expect(savedFlowActionPolicy(event({ id: 'escape', kind: 'keydown', title: 'Key: Escape' }))).toBe('auto');
    expect(savedFlowActionPolicy(event({ id: 'arrow', kind: 'keydown', title: 'Key: ArrowRight' }))).toBe('auto');
  });

  it('stores focus, route and dialog transitions as checkpoints', () => {
    const events = [
      event({ id: 'focus', kind: 'focus', element: { tag: 'button', selector: '#open', name: 'Open dialog' } }),
      event({ id: 'open', kind: 'dialog-open', mutation: { kind: 'node-added', target: { tag: 'div', role: 'dialog', selector: '#dialog', name: 'Settings' } } }),
      event({ id: 'close', kind: 'dialog-close', element: { tag: 'div', role: 'dialog', selector: '#dialog', name: 'Settings' } }),
      event({ id: 'route', kind: 'route', fromUrl: '/start?q=secret', toUrl: '/done#private' }),
    ];
    const flow = buildSavedUserFlow({ id: 'flow', name: 'Dialog', events, interactions: [], now: 10 });
    const checkpoints = flow.steps.filter((step) => step.type === 'checkpoint');

    expect(checkpoints.map((step) => step.checkpoint)).toEqual(['focus', 'dialog-open', 'dialog-close', 'route']);
    expect(JSON.stringify(checkpoints)).not.toContain('Open dialog');
    expect(JSON.stringify(checkpoints)).not.toContain('Settings');
    expect(JSON.stringify(checkpoints)).not.toContain('secret');
    expect(JSON.stringify(checkpoints)).not.toContain('private');
  });

  it('distinguishes persistent, changed, resolved and new findings', () => {
    const baseline: SavedFlowBaselineFinding[] = [
      { id: 'a', ruleId: 'FT-RUNTIME-001', kind: 'focus-obscured', outcome: 'fail', target: { locator: '#a', tag: 'button' } },
      { id: 'b', ruleId: 'FT-RUNTIME-002', kind: 'dialog-open', outcome: 'review', target: { locator: '#b', tag: 'div', role: 'dialog' } },
      { id: 'c', ruleId: 'FT-RUNTIME-003', kind: 'focus-lost', outcome: 'review', target: { locator: '#c', tag: 'a' } },
    ];
    const current: SavedFlowCurrentFinding[] = [
      { ruleId: 'FT-RUNTIME-001', kind: 'focus-obscured', outcome: 'fail', target: { locator: '#a', tag: 'button' } },
      { ruleId: 'FT-RUNTIME-002', kind: 'dialog-open', outcome: 'warning', target: { locator: '#b', tag: 'div', role: 'dialog' } },
      { ruleId: 'FT-RUNTIME-999', kind: 'focus-hidden', outcome: 'fail', target: { locator: '#new', tag: 'input' } },
    ];

    const results = compareSavedFlowFindings(baseline, current);
    expect(results.map((result) => result.state)).toEqual(['persistent', 'changed', 'resolved', 'new']);
  });

  it('extracts only current runtime findings and exposes explicit flow failure states', () => {
    const events = [
      event({ id: 'info', kind: 'focus', element: { tag: 'button', selector: '#a' } }),
      event({ id: 'finding', kind: 'focus-hidden', outcome: 'fail', ruleId: 'FT-RUNTIME-004', element: { tag: 'button', selector: '#a', name: 'Sensitive label' } }),
    ];
    const findings = savedFlowCurrentFindings(events);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ ruleId: 'FT-RUNTIME-004', outcome: 'fail' });
    expect(JSON.stringify(findings)).not.toContain('Sensitive label');
    expect(savedFlowMissingElement('step-1', 'missing')).toMatchObject({ state: 'missing-element', stepId: 'step-1' });
    expect(savedFlowBrokenFlow('step-2', 'route mismatch')).toMatchObject({ state: 'broken-flow', stepId: 'step-2' });
  });
});
