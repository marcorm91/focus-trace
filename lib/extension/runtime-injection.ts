import type { RuntimeInjectionMode } from '../../shared/types';

export interface RuntimeScriptDescriptor {
  readonly pingType:
    | 'FOCUSTRACE_PING'
    | 'FOCUSTRACE_FOCUS_VISIBLE_PING'
    | 'FOCUSTRACE_HOVER_FOCUS_PING';
  readonly file:
    | '/content-scripts/runtime.js'
    | '/content-scripts/focus-visible.js'
    | '/content-scripts/hover-focus-content.js';
}

const SCAN_RUNTIME_SCRIPT: RuntimeScriptDescriptor = {
  pingType: 'FOCUSTRACE_PING',
  file: '/content-scripts/runtime.js',
};

const SCAN_RUNTIME_SCRIPTS: readonly RuntimeScriptDescriptor[] = [SCAN_RUNTIME_SCRIPT];

const TRACE_RUNTIME_SCRIPTS: readonly RuntimeScriptDescriptor[] = [
  SCAN_RUNTIME_SCRIPT,
  {
    pingType: 'FOCUSTRACE_FOCUS_VISIBLE_PING',
    file: '/content-scripts/focus-visible.js',
  },
  {
    pingType: 'FOCUSTRACE_HOVER_FOCUS_PING',
    file: '/content-scripts/hover-focus-content.js',
  },
];

export function runtimeScriptsFor(
  mode: RuntimeInjectionMode,
): readonly RuntimeScriptDescriptor[] {
  return mode === 'trace' ? TRACE_RUNTIME_SCRIPTS : SCAN_RUNTIME_SCRIPTS;
}

export async function ensureRuntimeScripts(
  mode: RuntimeInjectionMode,
  isReady: (pingType: RuntimeScriptDescriptor['pingType']) => Promise<boolean>,
  inject: (file: RuntimeScriptDescriptor['file']) => Promise<void>,
): Promise<boolean> {
  const results = await Promise.all(runtimeScriptsFor(mode).map(async (script) => {
    if (await isReady(script.pingType)) return false;
    await inject(script.file);
    return true;
  }));

  return results.some(Boolean);
}
