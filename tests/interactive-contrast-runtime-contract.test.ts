import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const runtimeSource = readFileSync(
  resolve(process.cwd(), 'entrypoints/focus-visible.content.ts'),
  'utf8',
);
const contrastSource = readFileSync(
  resolve(process.cwd(), 'lib/runtime/interactive-contrast.ts'),
  'utf8',
);
const presentationSource = readFileSync(
  resolve(process.cwd(), 'lib/runtime/runtime-presentation.ts'),
  'utf8',
);

describe('interactive contrast runtime contract', () => {
  it('observes trusted real pointer and keyboard states while Trace is recording', () => {
    expect(runtimeSource).toContain("ctx.addEventListener(document, 'pointerover'");
    expect(runtimeSource).toContain("scheduleInteractiveContrast(target, 'hover')");
    expect(runtimeSource).toContain("scheduleInteractiveContrast(target, 'active')");
    expect(runtimeSource).toContain("event.target.matches(':focus-visible')");
    expect(runtimeSource).toContain('activeSemanticContrastStates(target)');
    expect(runtimeSource).toContain('!event.isTrusted');
  });

  it('never manufactures hover or focus evidence with synthetic interaction', () => {
    expect(runtimeSource).not.toContain('dispatchEvent(');
    expect(runtimeSource).not.toContain('.focus()');
    expect(runtimeSource).not.toContain('element.focus(');
  });

  it('measures final rendered styles after a bounded transition settle window', () => {
    expect(runtimeSource).toContain('interactiveContrastSettleDelay(element)');
    expect(contrastSource).toContain('getComputedStyle(candidate)');
    expect(contrastSource).toContain('MAX_SETTLE_MS = 1_000');
    expect(contrastSource).toContain('evaluateTextContrastForElement(element, subject.pseudo)');
  });

  it('runs text and scoped non-text checks from the same trusted state probe', () => {
    expect(runtimeSource).toContain('interactiveTextContrastReviews(element, state)');
    expect(runtimeSource).toContain('interactiveNonTextContrastReviews(element, state)');
    expect(contrastSource).toContain('evaluateNonTextContrastForElement(root)');
    expect(contrastSource).toContain("ruleId: INTERACTIVE_NON_TEXT_CONTRAST_RULE.id");
    expect(contrastSource).toContain("'category=non-text'");
  });

  it('keeps the evidence conservative, WCAG-linked and distinct in Trace', () => {
    expect(contrastSource).toContain("outcome: 'review'");
    expect(contrastSource).toContain("ruleId: INTERACTIVE_TEXT_CONTRAST_RULE.id");
    expect(contrastSource).toContain("ruleId: INTERACTIVE_NON_TEXT_CONTRAST_RULE.id");
    expect(contrastSource).toContain("kind: 'contrast-state'");
    expect(contrastSource).not.toContain("outcome: 'fail'");
    expect(presentationSource).toContain("kind === 'contrast-state'");
    expect(presentationSource).toContain("'Interactive contrast', 'Contraste interactivo'");
    expect(presentationSource).toContain("event.kind === 'contrast-state'");
    expect(presentationSource).toContain("event.ruleId === 'FT-RUNTIME-016'");
    expect(presentationSource).toContain("'WCAG 1.4.11'");
  });
});