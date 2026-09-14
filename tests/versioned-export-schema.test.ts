import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  FOCUSTRACE_EXPORT_SCHEMA_ID,
  FOCUSTRACE_EXPORT_SCHEMA_VERSION,
} from '../lib/report/versioned-export';

const schema = JSON.parse(readFileSync(
  new URL('../schemas/focustrace-export-v1.schema.json', import.meta.url),
  'utf8',
)) as {
  $id: string;
  required: string[];
  properties: Record<string, { const?: string; required?: string[] }>;
  $defs: Record<string, { required?: string[] }>;
};

describe('FocusTrace export v1 schema', () => {
  it('locks the stable schema identity, version and required interchange fields', () => {
    expect(schema.$id).toBe(FOCUSTRACE_EXPORT_SCHEMA_ID);
    expect(schema.properties.schemaVersion?.const).toBe(FOCUSTRACE_EXPORT_SCHEMA_VERSION);
    expect(schema.required).toEqual(expect.arrayContaining([
      '$schema',
      'schemaVersion',
      'kind',
      'generatedAt',
      'producer',
      'subject',
      'context',
      'summary',
      'findings',
    ]));
    expect(schema.properties.context?.required).toEqual(['scope', 'coverage']);
    expect(schema.$defs.finding?.required).toEqual(expect.arrayContaining([
      'id', 'ruleId', 'title', 'description', 'outcome', 'severity', 'source', 'references',
    ]));
  });
});
