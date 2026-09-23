// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { composedSelectorFor, resolveComposedSelector, traverseComposedTree } from '../lib/audit/composed-tree';
import { runFocusTraceScan } from '../lib/audit/scan';
import { CLOSED_SHADOW_HOST_EVENT, CLOSED_SHADOW_REQUEST_EVENT } from '../shared/nested-context-bridge';

function render(): HTMLElement {
  document.body.innerHTML = '<main id="main"><div id="host"><button id="assigned" slot="action">Assigned</button></div><button id="outside">Outside</button></main>';
  return document.querySelector<HTMLElement>('#host')!;
}

describe('composed audit contexts (#236)', () => {
  it('traverses open roots and assigned slots exactly once', () => {
    const host = render();
    host.attachShadow({ mode: 'open' }).innerHTML = '<slot name="action"></slot><button id="inside">Inside</button>';
    const result = traverseComposedTree(document);
    expect(result.shadowRootsTraversed).toBe(1);
    expect(result.elements.filter((element) => element.id === 'assigned')).toHaveLength(1);
    expect(result.elements.some((element) => element.id === 'inside')).toBe(true);
    expect(result.coverageLimits).toEqual([]);
  });

  it('relocates elements across combined same-origin frame and shadow boundaries', () => {
    render();
    const frame = document.createElement('iframe');
    frame.id = 'frame';
    document.body.append(frame);
    frame.contentDocument!.body.innerHTML = '<div id="nested-host"></div>';
    const host = frame.contentDocument!.querySelector('#nested-host')!;
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = '<button id="nested">Nested</button>';
    const target = shadow.querySelector('button')!;
    const traversal = traverseComposedTree(document);
    expect(traversal.framesTraversed).toBe(1);
    expect(traversal.elements).toContain(target);
    expect(composedSelectorFor(target)).toBe('#frame |frame| #nested-host |shadow| #nested');
    expect(resolveComposedSelector(composedSelectorFor(target))).toBe(target);
  });

  it('keeps the iframe host but skips same-origin descendants when frame contents are disabled', () => {
    render();
    const frame = document.createElement('iframe');
    frame.id = 'frame';
    document.body.append(frame);
    frame.contentDocument!.body.innerHTML = '<button id="inside-frame">Inside frame</button>';

    const result = traverseComposedTree(document, { includeFrameContents: false });

    expect(result.elements).toContain(frame);
    expect(result.elements.some((element) => element.id === 'inside-frame')).toBe(false);
    expect(result.framesTraversed).toBe(0);
    expect(result.coverageLimits).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'frame-ignored', element: frame }),
    ]));
  });

  it('records an unavailable frame instead of certifying its descendants', () => {
    render();
    const frame = document.createElement('iframe');
    document.body.append(frame);
    Object.defineProperty(frame, 'contentDocument', { get: () => null });
    expect(traverseComposedTree(document).coverageLimits).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'frame-unavailable', element: frame }),
    ]));
  });

  it('retains the explicit limitation for a bridge-observed closed shadow root', () => {
    const host = render();
    host.attachShadow({ mode: 'closed' }).innerHTML = '<button>Hidden implementation</button>';
    const respond = () => host.dispatchEvent(new Event(CLOSED_SHADOW_HOST_EVENT, { bubbles: true }));
    window.addEventListener(CLOSED_SHADOW_REQUEST_EVENT, respond);
    try {
      expect(traverseComposedTree(document).coverageLimits).toEqual(expect.arrayContaining([
        expect.objectContaining({ kind: 'closed-shadow', element: host }),
      ]));
    } finally {
      window.removeEventListener(CLOSED_SHADOW_REQUEST_EVENT, respond);
    }
  });

  it('enforces shared traversal limits across shadow boundaries', () => {
    const host = render();
    host.attachShadow({ mode: 'open' }).innerHTML = '<div><button>Inside</button></div>';
    const result = traverseComposedTree(host, { maxElements: 2 });
    expect(result.elements).toHaveLength(2);
    expect(result.budgetExceeded).toBe(true);
    expect(result.coverageLimits.some((limit) => limit.kind === 'budget')).toBe(true);
  });

  it('scans the same unnamed shadow button in page and component scopes', () => {
    const host = render();
    host.attachShadow({ mode: 'open' }).innerHTML = '<button id="unnamed"></button>';
    const page = runFocusTraceScan();
    const component = runFocusTraceScan({ type: 'component', selector: '#host', tag: 'div' });
    const targets = (result: ReturnType<typeof runFocusTraceScan>) => result.issues
      .filter((finding) => finding.ruleId === 'FT-WCAG-003').flatMap((finding) => finding.targets);
    expect(targets(page)).toContain('#host |shadow| #unnamed');
    expect(targets(component)).toContain('#host |shadow| #unnamed');
    expect(component.issues.some((finding) => finding.targets.includes('#outside'))).toBe(false);
  });
});
