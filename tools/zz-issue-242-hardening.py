from pathlib import Path

path = Path('lib/runtime/saved-flow.ts')
text = path.read_text()
old = "export function compareSavedFlowFindings(\n  baseline: SavedFlowBaselineFinding[],\n  current: SavedFlowCurrentFinding[],\n): SavedFlowRegressionResult[] {"
new = "export function compareSavedFlowFindings(\n  baseline: SavedFlowBaselineFinding[],\n  current: SavedFlowCurrentFinding[],\n  complete = true,\n): SavedFlowRegressionResult[] {"
if old not in text:
    raise SystemExit('saved-flow function anchor missing')
text = text.replace(old, new, 1)
old = """    if (exactIndex < 0) {
      results.push({ state: 'resolved', ruleId: original.ruleId, baseline: original, reason: 'The saved finding was not observed in the current replay evidence.' });
      continue;
    }"""
new = """    if (exactIndex < 0) {
      if (complete) {
        results.push({ state: 'resolved', ruleId: original.ruleId, baseline: original, reason: 'The saved finding was not observed after the complete replay finished.' });
      }
      continue;
    }"""
if old not in text:
    raise SystemExit('saved-flow resolved anchor missing')
path.write_text(text.replace(old, new, 1))

path = Path('tests/saved-flow.test.ts')
text = path.read_text()
anchor = "  it('extracts only current runtime findings and exposes explicit flow failure states', () => {"
test = """  it('does not infer resolved findings from an incomplete replay', () => {
    const baseline: SavedFlowBaselineFinding[] = [
      { id: 'a', ruleId: 'FT-RUNTIME-001', kind: 'focus-obscured', outcome: 'fail', target: { locator: '#a', tag: 'button' } },
      { id: 'b', ruleId: 'FT-RUNTIME-002', kind: 'focus-lost', outcome: 'review', target: { locator: '#b', tag: 'a' } },
    ];
    const current: SavedFlowCurrentFinding[] = [
      { ruleId: 'FT-RUNTIME-001', kind: 'focus-obscured', outcome: 'fail', target: { locator: '#a', tag: 'button' } },
    ];

    const results = compareSavedFlowFindings(baseline, current, false);
    expect(results.map((result) => result.state)).toEqual(['persistent']);
  });

"""
if anchor not in text:
    raise SystemExit('saved-flow test anchor missing')
path.write_text(text.replace(anchor, test + anchor, 1))

replay = Path('entrypoints/sidepanel/views/ReplayView.tsx')
text = replay.read_text()
text = text.replace(
    "import type { RuntimeBreakpointSettings, RuntimeEvent, RuntimeInteraction } from '../../../shared/types';",
    "import type { RuntimeEvent, RuntimeInteraction } from '../../../shared/types';",
    1,
)
text = text.replace("\nimport { SavedFlowRegressionPanel } from './SavedFlowRegressionPanel';", "", 1)
text = text.replace("  recording,\n  breakpoints,\n  level,", "  recording,\n  level,", 1)
text = text.replace("  recording: boolean;\n  breakpoints: RuntimeBreakpointSettings;\n  level: ExplanationLevel;", "  recording: boolean;\n  level: ExplanationLevel;", 1)
panel = """      <SavedFlowRegressionPanel
        events={events}
        interactions={interactions}
        recording={recording}
        breakpoints={breakpoints}
        language={language}
      />

"""
if panel not in text:
    raise SystemExit('Replay panel anchor missing')
replay.write_text(text.replace(panel, '', 1))

trace = Path('entrypoints/sidepanel/views/TraceView.tsx')
text = trace.read_text()
import_anchor = "import { RuntimeView } from './RuntimeView';"
if import_anchor not in text:
    raise SystemExit('Trace import anchor missing')
text = text.replace(import_anchor, import_anchor + "\nimport { SavedFlowRegressionPanel } from './SavedFlowRegressionPanel';", 1)
text = text.replace(
    "              recording={recording}\n              breakpoints={breakpointSettings}\n              level={level}",
    "              recording={recording}\n              level={level}",
    1,
)
close_anchor = """          {mode === 'replay' && (
            <ReplayView
              events={events}
              interactions={interactions}
              journey={journey}
              semantics={transitionSemantics}
              recording={recording}
              level={level}
              language={language}
              onSelectFocusTarget={onSelectStep}
              onClearFocusTarget={onClearSelection}
            />
          )}
        </div>"""
replacement = """          {mode === 'replay' && (
            <ReplayView
              events={events}
              interactions={interactions}
              journey={journey}
              semantics={transitionSemantics}
              recording={recording}
              level={level}
              language={language}
              onSelectFocusTarget={onSelectStep}
              onClearFocusTarget={onClearSelection}
            />
          )}
          <SavedFlowRegressionPanel
            events={events}
            interactions={interactions}
            recording={recording}
            breakpoints={breakpointSettings}
            language={language}
          />
        </div>"""
if close_anchor not in text:
    raise SystemExit('Trace Replay container anchor missing')
trace.write_text(text.replace(close_anchor, replacement, 1))

panel_path = Path('entrypoints/sidepanel/views/SavedFlowRegressionPanel.tsx')
text = panel_path.read_text()
text = text.replace(
    "    const comparison = compareSavedFlowFindings(flow.baselineFindings, current);",
    "    const comparison = compareSavedFlowFindings(flow.baselineFindings, current, !failure);",
    1,
)
panel_path.write_text(text)
