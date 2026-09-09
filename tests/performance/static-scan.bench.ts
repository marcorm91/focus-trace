// @vitest-environment jsdom

import { bench, describe } from 'vitest';
import { runFocusTraceScan } from '../../lib/audit/scan';

const FIXTURE_SIZES = [1_000, 5_000, 10_000] as const;

function renderFixture(size: number): void {
  const elements = Array.from(
    { length: size },
    (_, index) => `<span data-index="${index}">Item ${index}</span>`,
  ).join('');
  document.open();
  document.write(`<!doctype html><html lang="en"><head><title>Scan benchmark</title></head><body><main><h1>Scan benchmark</h1>${elements}</main></body></html>`);
  document.close();
}

for (const size of FIXTURE_SIZES) {
  describe(`${size.toLocaleString('en-US')} generated elements`, () => {
    bench('full-page static scan', () => {
      if (document.querySelectorAll('[data-index]').length !== size) {
        throw new Error(`Expected ${size} generated elements in the benchmark fixture.`);
      }
      runFocusTraceScan();
    }, {
      iterations: 1,
      setup: () => renderFixture(size),
      teardown: () => {
        document.body.innerHTML = '';
      },
      time: 0,
      warmupIterations: 0,
      warmupTime: 0,
    });
  });
}
