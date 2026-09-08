import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('focus-visible runtime wiring', () => {
  it('uses active-tab PNG captures without persisting visual frames', () => {
    const background = source('entrypoints/background.ts');
    const probe = source('entrypoints/focus-visible.content.ts');

    expect(background).toContain("message.type === 'FOCUSTRACE_CAPTURE_VIEWPORT'");
    expect(background).toContain('!tab.active');
    expect(background).toContain("captureVisibleTab(tab.windowId, { format: 'png' })");
    expect(probe).toContain("type: 'FOCUSTRACE_CAPTURE_VIEWPORT'");
    expect(probe).not.toContain('browser.storage');
    expect(probe).not.toContain('dataUrl?:');
  });

  it('requires trusted real Tab focus and the ACT one-second stability window', () => {
    const probe = source('entrypoints/focus-visible.content.ts');
    expect(probe).toContain('!event.isTrusted');
    expect(probe).toContain("event.key !== 'Tab'");
    expect(probe).toContain('const FOCUSED_STABILITY_MS = 1_000');
    expect(probe).toContain('document.activeElement !== element');
    expect(probe).toContain('focusWalkCandidates(document)');
  });

  it('keeps automatic Focus Walk separate from the pixel review', () => {
    const automaticWalk = source('entrypoints/runtime.content.ts');
    const probe = source('entrypoints/focus-visible.content.ts');
    expect(automaticWalk).not.toContain('FOCUSTRACE_CAPTURE_VIEWPORT');
    expect(probe).not.toContain('FOCUSTRACE_RUN_FOCUS_WALK');
  });

  it('requires paired stable captures and drops changed viewport geometry', () => {
    const probe = source('entrypoints/focus-visible.content.ts');
    expect(probe).toContain('const CAPTURE_PAIR_GAP_MS = 120');
    expect(probe).toContain('const first = await captureViewport()');
    expect(probe).toContain('const second = await captureViewport()');
    expect(probe).toContain('viewportStateMatches(before, after)');
    expect(probe).toContain("comparison.outcome === 'unchanged'");
  });
});
