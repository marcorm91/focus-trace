import { describe, expect, it } from 'vitest';
import {
  ensureRuntimeScripts,
  runtimeScriptsFor,
  type RuntimeScriptDescriptor,
} from '../lib/extension/runtime-injection';

function scriptFiles(mode: 'scan' | 'trace'): string[] {
  return runtimeScriptsFor(mode).map((script) => script.file);
}

describe('runtime content-script injection', () => {
  it('keeps static analysis on the core scan runtime', () => {
    expect(scriptFiles('scan')).toEqual(['/content-scripts/runtime.js']);
  });

  it('loads supplemental observers only for Trace', () => {
    expect(scriptFiles('trace')).toEqual([
      '/content-scripts/runtime.js',
      '/content-scripts/focus-visible.js',
      '/content-scripts/hover-focus-content.js',
    ]);
  });

  it('injects only missing scripts and reports whether the page changed', async () => {
    const ready = new Set<RuntimeScriptDescriptor['pingType']>(['FOCUSTRACE_PING']);
    const injected: string[] = [];
    const inject = async (file: RuntimeScriptDescriptor['file']) => {
      injected.push(file);
    };

    await expect(ensureRuntimeScripts(
      'trace',
      async (pingType) => ready.has(pingType),
      inject,
    )).resolves.toBe(true);
    expect(injected).toEqual([
      '/content-scripts/focus-visible.js',
      '/content-scripts/hover-focus-content.js',
    ]);

    await expect(ensureRuntimeScripts(
      'scan',
      async () => true,
      inject,
    )).resolves.toBe(false);
  });
});
