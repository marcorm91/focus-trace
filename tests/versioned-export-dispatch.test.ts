import { describe, expect, it } from 'vitest';
import {
  buildSessionExport,
  exportFileExtension,
  renderVersionedExport,
  type FocusTraceExportFormat,
} from '../lib/report/versioned-export';
import type { ScanResult } from '../shared/types';

const scan: ScanResult = {
  engine: 'FocusTrace Rules',
  standard: 'WCAG 2.2',
  url: 'https://example.test/',
  title: 'Example',
  scannedAt: 1,
  issues: [],
  review: [],
  warnings: [],
  passes: 1,
  rulesRun: 1,
};

describe('versioned export dispatcher', () => {
  it('renders every public automation format with its stable extension', () => {
    const envelope = buildSessionExport({ scan, events: [], generatedAt: 2 });
    const formats: FocusTraceExportFormat[] = ['json', 'html', 'csv', 'sarif', 'junit'];
    const extensions = formats.map((format) => exportFileExtension(format));

    expect(extensions).toEqual(['json', 'html', 'csv', 'sarif.json', 'junit.xml']);
    for (const format of formats) expect(renderVersionedExport(envelope, format).length).toBeGreaterThan(20);
  });
});
