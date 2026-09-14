from pathlib import Path

path = Path('entrypoints/sidepanel/views/SavedFlowRegressionPanel.tsx')
text = path.read_text()

old = """  const [runStartedAt, setRunStartedAt] = useState<number>();
  const [manualStep, setManualStep] = useState<SavedFlowStep>();"""
new = """  const [runStartedAt, setRunStartedAt] = useState<number>();
  const [runTabId, setRunTabId] = useState<number>();
  const [manualStep, setManualStep] = useState<SavedFlowStep>();"""
if old not in text:
    raise SystemExit('run state anchor missing')
text = text.replace(old, new, 1)

old = """    setRunState(failure ? 'failed' : 'complete');
    setManualStep(undefined);
    setMessage(failure"""
new = """    setRunState(failure ? 'failed' : 'complete');
    setManualStep(undefined);
    setRunStartedAt(undefined);
    setRunTabId(undefined);
    setMessage(failure"""
if old not in text:
    raise SystemExit('finish cleanup anchor missing')
text = text.replace(old, new, 1)

old = """  const startRun = async () => {
    if (!selected || recording || busy || !selected.steps.length) return;
    setBusy(true);
    setResults([]);
    setMessage(undefined);
    try {
      const tabId = await activeTabId();
      const startedAt = await startRegressionRecording(tabId, breakpoints);
      setRunStartedAt(startedAt);
      setRunIndex(0);
      await runFrom(selected, 0, startedAt, tabId);
    } catch {
      setRunState('failed');
      setMessage(tr(
        language,
        'Could not start the saved regression. The page may need access or the runtime may have changed.',
        'No se pudo iniciar la regresión guardada. Puede que la página necesite acceso o que el runtime haya cambiado.',
      ));
    } finally {
      setBusy(false);
    }
  };

  const continueManual = async () => {
    if (!selected || runStartedAt == null || runState !== 'manual-stop' || busy) return;
    setBusy(true);
    setMessage(undefined);
    try {
      const tabId = await activeTabId();
      setManualStep(undefined);
      await runFrom(selected, runIndex + 1, runStartedAt, tabId);
    } catch {
      await finish(await activeTabId(), selected, runStartedAt, savedFlowBrokenFlow(manualStep?.id ?? 'manual-step', 'The manual replay continuation failed.')).catch(() => undefined);
    } finally {
      setBusy(false);
    }
  };"""
new = """  const startRun = async () => {
    if (!selected || recording || busy || !selected.steps.length) return;
    setBusy(true);
    setResults([]);
    setMessage(undefined);
    let startedTabId: number | undefined;
    try {
      const tabId = await activeTabId();
      startedTabId = tabId;
      const startedAt = await startRegressionRecording(tabId, breakpoints);
      setRunStartedAt(startedAt);
      setRunTabId(tabId);
      setRunIndex(0);
      await runFrom(selected, 0, startedAt, tabId);
    } catch {
      if (startedTabId != null) {
        await stopRegressionRecording(startedTabId, breakpoints).catch(() => undefined);
      }
      setRunStartedAt(undefined);
      setRunTabId(undefined);
      setRunState('failed');
      setMessage(tr(
        language,
        'Could not start the saved regression. The page may need access or the runtime may have changed.',
        'No se pudo iniciar la regresión guardada. Puede que la página necesite acceso o que el runtime haya cambiado.',
      ));
    } finally {
      setBusy(false);
    }
  };

  const continueManual = async () => {
    if (!selected || runStartedAt == null || runTabId == null || runState !== 'manual-stop' || busy) return;
    setBusy(true);
    setMessage(undefined);
    try {
      const currentTabId = await activeTabId();
      if (currentTabId !== runTabId) {
        await finish(runTabId, selected, runStartedAt, savedFlowBrokenFlow(
          manualStep?.id ?? 'manual-step',
          'The active tab changed during the manual stop, so FocusTrace refused to continue the saved flow on a different page.',
        ));
        return;
      }
      setManualStep(undefined);
      await runFrom(selected, runIndex + 1, runStartedAt, runTabId);
    } catch {
      await finish(
        runTabId,
        selected,
        runStartedAt,
        savedFlowBrokenFlow(manualStep?.id ?? 'manual-step', 'The manual replay continuation failed.'),
      ).catch(() => undefined);
    } finally {
      setBusy(false);
    }
  };

  const cancelManualReplay = async () => {
    if (runTabId == null || runState !== 'manual-stop' || busy) return;
    setBusy(true);
    try {
      await stopRegressionRecording(runTabId, breakpoints).catch(() => undefined);
      setRunState('idle');
      setRunStartedAt(undefined);
      setRunTabId(undefined);
      setManualStep(undefined);
      setResults([]);
      setMessage(tr(language, 'Saved replay cancelled.', 'Replay guardado cancelado.'));
    } finally {
      setBusy(false);
    }
  };"""
if old not in text:
    raise SystemExit('run lifecycle anchor missing')
text = text.replace(old, new, 1)

old = """          <button type="button" disabled={busy} onClick={() => void continueManual()}>
            {tr(language, 'I performed this step — continue', 'He realizado este paso — continuar')}
          </button>"""
new = """          <div className="saved-flow-stop-actions">
            <button type="button" disabled={busy} onClick={() => void continueManual()}>
              {tr(language, 'I performed this step — continue', 'He realizado este paso — continuar')}
            </button>
            <button type="button" disabled={busy} onClick={() => void cancelManualReplay()}>
              {tr(language, 'Cancel replay', 'Cancelar replay')}
            </button>
          </div>"""
if old not in text:
    raise SystemExit('manual stop UI anchor missing')
text = text.replace(old, new, 1)
path.write_text(text)

css = Path('entrypoints/sidepanel/views/saved-flow-regression.css')
text = css.read_text()
anchor = """.saved-flow-stop p {
  margin: 0.45rem 0 0.7rem;
}
"""
addition = anchor + """
.saved-flow-stop-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
"""
if anchor not in text:
    raise SystemExit('saved-flow CSS anchor missing')
text = text.replace(anchor, addition, 1)
text = text.replace(
    "  .saved-flow-actions button,\n  .saved-flow-stop button,",
    "  .saved-flow-actions button,\n  .saved-flow-stop-actions button,",
    1,
)
css.write_text(text)
