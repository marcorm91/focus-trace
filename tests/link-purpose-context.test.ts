// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';
import { evaluateLinkPurposeContext } from '../lib/audit/link-purpose-context';
import { runFocusTraceScan } from '../lib/audit/scan';

function render(body: string): void {
  document.open();
  document.write(`<!doctype html><html lang="en"><head><title>Link purpose</title></head><body>${body}</body></html>`);
  document.close();
}

beforeEach(() => render(''));

describe('WCAG 2.4.4 link-purpose-in-context review evidence', () => {
  it('reviews a standalone link whose accessible name is a generic phrase', () => {
    render('<a id="more" href="/article">Read more</a>');

    expect(evaluateLinkPurposeContext()).toMatchObject([{
      status: 'review',
      element: document.querySelector('#more'),
      evidence: {
        kind: 'ambiguous-link-purpose',
        accessibleName: 'Read more',
        matchedPhrase: 'read more',
        contexts: [],
        contextTextObserved: false,
      },
    }]);
  });

  it('preserves same-sentence and paragraph context without treating it as an automatic pass', () => {
    render('<p id="product"><a id="details" href="/trailpro">Learn more</a> about the TrailPro backpack.</p>');

    expect(evaluateLinkPurposeContext()).toMatchObject([{
      status: 'review',
      element: document.querySelector('#details'),
      evidence: {
        contextTextObserved: true,
        contexts: expect.arrayContaining([
          { source: 'sentence', selector: '#product', text: 'Learn more about the TrailPro backpack.' },
          { source: 'paragraph', selector: '#product', text: 'Learn more about the TrailPro backpack.' },
        ]),
      },
    }]);
  });

  it('resolves aria-describedby text as explicit programmatic context', () => {
    render('<span id="invoice-description" hidden>Download the April invoice as PDF</span><a id="download" href="/invoice.pdf" aria-describedby="invoice-description">Here</a>');

    expect(evaluateLinkPurposeContext()).toMatchObject([{
      evidence: {
        contexts: expect.arrayContaining([{
          source: 'aria-describedby',
          selector: '#invoice-description',
          text: 'Download the April invoice as PDF',
        }]),
      },
    }]);
  });

  it('collects current and parent list-item context for nested lists', () => {
    render('<ul><li id="topic">Accessibility reports<ul><li id="entry"><a id="item-more" href="/report">More</a></li></ul></li></ul>');

    const contexts = evaluateLinkPurposeContext()[0]?.evidence.contexts;
    expect(contexts).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: 'parent-list-item', selector: '#topic' }),
    ]));
  });

  it('collects table-cell and associated native header context', () => {
    render('<table><thead><tr><th id="product-heading">Product</th><th id="action-heading">Action</th></tr></thead><tbody><tr><th id="trailpro">TrailPro</th><td id="action" headers="trailpro action-heading">TrailPro: <a id="table-more" href="/trailpro">Details</a></td></tr></tbody></table>');

    const contexts = evaluateLinkPurposeContext()[0]?.evidence.contexts;
    expect(contexts).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: 'table-cell', selector: '#action' }),
      expect.objectContaining({ source: 'table-header', selector: '#trailpro', text: 'TrailPro' }),
      expect.objectContaining({ source: 'table-header', selector: '#action-heading', text: 'Action' }),
    ]));
  });

  it('supports accented Spanish phrases and surrounding punctuation', () => {
    render('<a id="spanish" href="/guia">¡Más información!</a>');

    expect(evaluateLinkPurposeContext()).toMatchObject([{
      evidence: { accessibleName: '¡Más información!', matchedPhrase: 'mas informacion' },
    }]);
  });

  it('does not report descriptive, empty, hidden or role-overridden link names', () => {
    render(`
      <a href="/report">Download the annual report</a>
      <a href="/empty"><span aria-hidden="true">Read more</span></a>
      <a href="/hidden" style="display:none">Read more</a>
      <a href="/inert" inert>Read more</a>
      <a href="/action" role="button">Read more</a>
      <a href="/labelled" aria-label="Read more about shipping">Read more</a>
    `);

    expect(evaluateLinkPurposeContext()).toEqual([]);
  });

  it('includes an exposed custom element whose resolved semantic role is link', () => {
    render('<div id="custom-link" role="link" tabindex="0">Details</div>');

    expect(evaluateLinkPurposeContext()).toMatchObject([{
      element: document.querySelector('#custom-link'),
      evidence: { accessibleName: 'Details' },
    }]);
  });

  it('integrates REVIEW and keeps structured evidence JSON-safe', () => {
    render('<p id="story">A guide to accessible names. <a id="story-more" href="/guide">Read more</a>.</p>');

    const result = runFocusTraceScan();
    const issue = result.review.find((candidate) => candidate.ruleId === 'FT-REVIEW-027');
    const rule = result.ruleResults?.find((candidate) => candidate.ruleId === 'FT-REVIEW-027');

    expect(issue).toMatchObject({
      outcome: 'review',
      targets: ['#story-more'],
      linkPurposeContext: {
        kind: 'ambiguous-link-purpose',
        accessibleName: 'Read more',
        contextTextObserved: true,
      },
    });
    expect(JSON.parse(JSON.stringify(issue))).toMatchObject({
      linkPurposeContext: {
        contexts: expect.arrayContaining([expect.objectContaining({ source: 'paragraph', selector: '#story' })]),
      },
    });
    expect(rule).toMatchObject({
      applicable: 1,
      passed: 0,
      failures: 0,
      reviews: 1,
      warnings: 0,
      coverage: 'findings-only',
    });
  });

  it('keeps component analysis limited to links in the selected root', () => {
    render('<section id="component"><a id="inside" href="/inside">View</a></section><a id="outside" href="/outside">More</a>');

    const evaluations = evaluateLinkPurposeContext(document.querySelector('#component')!);

    expect(evaluations).toHaveLength(1);
    expect(evaluations[0]?.element).toBe(document.querySelector('#inside'));
  });

  it('does not read programmatic context outside a component root', () => {
    render('<p id="outside-context">A complete product description <span id="component"><a id="inside-more" href="/inside">More</a></span></p>');

    expect(evaluateLinkPurposeContext(document.querySelector('#component')!)[0]?.evidence).toMatchObject({
      contexts: [],
      contextTextObserved: false,
    });
  });

  it('bounds review output on link-heavy pages', () => {
    render(Array.from({ length: 60 }, (_, index) => `<a id="link-${index}" href="/${index}">More</a>`).join(''));

    expect(evaluateLinkPurposeContext()).toHaveLength(50);
  });
});
