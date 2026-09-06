import { describe, expect, it } from 'vitest';
import { humanRuntimeEventTitle } from '../lib/runtime/explanations';
import { humanRuntimeEventDetail, runtimeEventKindLabel } from '../lib/runtime/runtime-presentation';
import { actionableRemediationText } from '../lib/report/actionable-remediation';
import type { RuntimeEvent } from '../shared/types';

const onFocusRoute: RuntimeEvent = {
  id: 'context-focus-1',
  timestamp: 100,
  kind: 'context-change',
  severity: 'moderate',
  title: 'Receiving focus may have initiated a change of context',
  detail: 'Receiving focus on #country was followed by a route change from /form to /checkout without a separate observed activation.',
  element: { tag: 'select', selector: '#country' },
  fromUrl: '/form',
  toUrl: '/checkout',
  contextChange: {
    triggerKind: 'focus',
    changeKind: 'route',
  },
  outcome: 'review',
  ruleId: 'FT-RUNTIME-008',
  references: [{
    type: 'WCAG',
    id: '3.2.1',
    label: 'On Focus',
    level: 'A',
    status: 'normative',
    url: 'https://www.w3.org/TR/WCAG22/#on-focus',
  }],
};

const onInputFocus: RuntimeEvent = {
  id: 'context-input-1',
  timestamp: 200,
  kind: 'context-change',
  severity: 'moderate',
  title: 'Changing a control may have initiated a change of context',
  detail: 'A trusted input event on #search was followed by focus moving programmatically to #results-heading.',
  element: { tag: 'input', selector: '#search' },
  inputEventType: 'input',
  contextChange: {
    triggerKind: 'input',
    changeKind: 'focus-move',
    inputEventType: 'input',
    destination: { tag: 'h2', selector: '#results-heading' },
  },
  outcome: 'review',
  ruleId: 'FT-RUNTIME-009',
  references: [{
    type: 'WCAG',
    id: '3.2.2',
    label: 'On Input',
    level: 'A',
    status: 'normative',
    url: 'https://www.w3.org/TR/WCAG22/#on-input',
  }],
};

describe('context-change runtime presentation', () => {
  it('localizes On Focus evidence while preserving technical route and selector evidence', () => {
    expect(runtimeEventKindLabel('context-change', 'es')).toBe('Cambio de contexto');
    expect(humanRuntimeEventTitle(onFocusRoute, 'es')).toContain('foco');

    const detail = humanRuntimeEventDetail(onFocusRoute, 'es');
    expect(detail).toContain('#country');
    expect(detail).toContain('/form');
    expect(detail).toContain('/checkout');
    expect(detail).toContain('WCAG 3.2.1');
  });

  it('localizes On Input evidence without exposing a control value', () => {
    expect(humanRuntimeEventTitle(onInputFocus, 'es')).toContain('control');
    const detail = humanRuntimeEventDetail(onInputFocus, 'es');
    expect(detail).toContain('#search');
    expect(detail).toContain('#results-heading');
    expect(detail).toContain('WCAG 3.2.2');
    expect(detail).not.toContain('secret');
  });

  it('presents non-sensitive setting-change events in both languages', () => {
    const event: RuntimeEvent = {
      id: 'input-1',
      timestamp: 1,
      kind: 'input-change',
      severity: 'info',
      title: 'Input changed',
      detail: 'A trusted input event changed this control. FocusTrace records the control identity and event type, not its value.',
      element: { tag: 'input', selector: '#password' },
      inputEventType: 'input',
    };

    expect(runtimeEventKindLabel('input-change', 'es')).toBe('Cambio de valor');
    expect(humanRuntimeEventTitle(event, 'en')).toContain('setting changed');
    expect(humanRuntimeEventTitle(event, 'es')).toContain('valor');
    expect(humanRuntimeEventDetail(event, 'es')).toContain('no guarda su valor');
  });

  it('provides equivalent bilingual remediation for both criteria', () => {
    const focusEn = actionableRemediationText('FT-RUNTIME-008', 'en');
    const focusEs = actionableRemediationText('FT-RUNTIME-008', 'es');
    const inputEn = actionableRemediationText('FT-RUNTIME-009', 'en');
    const inputEs = actionableRemediationText('FT-RUNTIME-009', 'es');

    expect(focusEn).toContain('explicit user activation');
    expect(focusEs).toContain('activación explícita');
    expect(inputEn).toContain('before the control is used');
    expect(inputEs).toContain('antes de utilizar el control');
    expect(inputEn).toContain('Verify:');
    expect(inputEs).toContain('Verifica:');
  });
});
