import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('manual Trace evidence editing contract', () => {
  it('routes interaction deletion through the background session store', () => {
    const types = source('shared/types.ts');
    const background = source('entrypoints/background.ts');
    const actions = source('entrypoints/sidepanel/hooks/useTraceActions.ts');

    expect(types).toContain("type: 'FOCUSTRACE_DELETE_INTERACTION'");
    expect(background).toContain("message.type === 'FOCUSTRACE_DELETE_INTERACTION'");
    expect(background).toContain('removeSessionInteraction(current, message.interactionId)');
    expect(actions).toContain("type: 'FOCUSTRACE_DELETE_INTERACTION'");
    expect(actions).toContain('clearFocusPathInPage');
  });

  it('exposes deletion only for manual interactions after recording stops', () => {
    const view = source('entrypoints/sidepanel/views/RuntimeView.tsx');
    const editing = source('lib/runtime/trace-evidence-editing.ts');
    const session = source('lib/runtime/session-state.ts');

    expect(view).toContain('deletableManualInteractionIds(interactions, events)');
    expect(view).toContain("'Remove this action from Trace', 'Eliminar esta acción del Trace'");
    expect(view).toContain('!recording && deletableIds.has(interaction.id)');
    expect(view).toContain("'Remove this action from Trace?', '¿Eliminar esta acción del Trace?'");
    expect(editing).toContain("event.kind === 'focus-walk-start'");
    expect(editing).toContain("event.kind === 'focus-walk-end'");
    expect(session).toContain('if (state.recording || !isManualTraceInteractionId(state.events, interactionId)) return state;');
  });
});
