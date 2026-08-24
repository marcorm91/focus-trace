import { useCallback, useEffect, useMemo, useState } from 'react';
import { browser } from '#imports';
import {
  defaultRuntimeBreakpointSettings,
  normalizeRuntimeBreakpointSettings,
} from '../../lib/runtime/breakpoints';
import { groupRuntimeInteractions } from '../../lib/runtime/causality';
import { type ExplanationLevel } from '../../lib/runtime/explanations';
import { buildFocusGraph } from '../../lib/runtime/focus-graph';
import type {
  ExtensionMessage,
  RuntimeBreakpointId,
  RuntimeBreakpointSettings,
  ScanResult,
  SessionState,
} from '../../shared/types';
import { ExplanationLevelControl } from './components/ExplanationLevelControl';
import { AboutView } from './views/AboutView';
import { FocusGraphView } from './views/FocusGraphView';
import { FocusView } from './views/FocusView';
import { ReportView } from './views/ReportView';
import { RuntimeView } from './views/RuntimeView';
import { ScanView } from './views/ScanView';

type View = 'scan' | 'focus' | 'runtime' | 'graph' | 'report' | 'about';

const EMPTY_SESSION: SessionState = {
  tabId: -1,
  recording: false,
  events: [],
  breakpoints: defaultRuntimeBreakpointSettings(),
};

async function activeTabId() {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (tab?.id == null) throw new Error('No active browser tab is available.');
  return tab.id;
}

export default function App() {
  const [view, setView] = useState<View>('scan');
  const [explanationLevel, setExplanationLevel] = useState<ExplanationLevel>('simple');
  const [tabId, setTabId] = useState<number>();
  const [session, setSession] = useState<SessionState>(EMPTY_SESSION);
  const [scan, setScan] = useState<ScanResult>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const refresh = useCallback(async (id: number) => {
    const state = (await browser.runtime.sendMessage({
      type: 'FOCUSTRACE_GET_SESSION',
      tabId: id,
    } satisfies ExtensionMessage)) as SessionState;
    setSession(state);
    setScan(state.scan);
  }, []);

  useEffect(() => {
    void activeTabId()
      .then(async (id) => {
        setTabId(id);
        await refresh(id);
      })
      .catch((reason) => setError(String(reason)));
  }, [refresh]);

  useEffect(() => {
    const listener = (message: ExtensionMessage) => {
      if (message.type !== 'FOCUSTRACE_SESSION_UPDATED' || message.state.tabId !== tabId) return;
      setSession(message.state);
      setScan(message.state.scan);
    };
    browser.runtime.onMessage.addListener(listener);
    return () => browser.runtime.onMessage.removeListener(listener);
  }, [tabId]);

  const ensureInjected = useCallback(async () => {
    if (tabId == null) throw new Error('No active tab selected.');
    await browser.runtime.sendMessage({
      type: 'FOCUSTRACE_ENSURE_INJECTED',
      tabId,
    } satisfies ExtensionMessage);
  }, [tabId]);

  const runScan = useCallback(async () => {
    if (tabId == null) return;
    setBusy(true);
    setError(undefined);
    try {
      await ensureInjected();
      const result = (await browser.tabs.sendMessage(tabId, {
        type: 'FOCUSTRACE_RUN_SCAN',
      } satisfies ExtensionMessage)) as ScanResult;
      setScan(result);
      const next = (await browser.runtime.sendMessage({
        type: 'FOCUSTRACE_SAVE_SCAN',
        tabId,
        scan: result,
      } satisfies ExtensionMessage)) as SessionState;
      setSession(next);
      setView('scan');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusy(false);
    }
  }, [ensureInjected, tabId]);

  const breakpointSettings = useMemo(
    () => normalizeRuntimeBreakpointSettings(session.breakpoints),
    [session.breakpoints],
  );

  const toggleRecording = useCallback(async () => {
    if (tabId == null) return;
    setBusy(true);
    setError(undefined);
    try {
      await ensureInjected();
      const enabled = !session.recording;
      const resumingFromBreakpoint = enabled && session.pausedByBreakpoint != null;
      if (enabled && !resumingFromBreakpoint) {
        await browser.runtime.sendMessage({ type: 'FOCUSTRACE_CLEAR_SESSION', tabId } satisfies ExtensionMessage);
      }
      const startedAt = enabled ? Date.now() : undefined;
      await browser.tabs.sendMessage(tabId, {
        type: 'FOCUSTRACE_SET_RECORDING',
        enabled,
        breakpoints: breakpointSettings,
      } satisfies ExtensionMessage);
      const next = (await browser.runtime.sendMessage({
        type: 'FOCUSTRACE_SET_RECORDING_STATE',
        tabId,
        enabled,
        ...(startedAt ? { startedAt } : {}),
      } satisfies ExtensionMessage)) as SessionState;
      setSession(next);
      setView('runtime');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusy(false);
    }
  }, [breakpointSettings, ensureInjected, session.pausedByBreakpoint, session.recording, tabId]);

  const setBreakpoint = useCallback(async (breakpointId: RuntimeBreakpointId, enabled: boolean) => {
    if (tabId == null) return;
    setError(undefined);
    const nextSettings: RuntimeBreakpointSettings = {
      ...normalizeRuntimeBreakpointSettings(session.breakpoints),
      [breakpointId]: enabled,
    };
    setSession((current) => ({ ...current, breakpoints: nextSettings }));

    try {
      await ensureInjected();
      await browser.tabs.sendMessage(tabId, {
        type: 'FOCUSTRACE_CONFIGURE_BREAKPOINTS',
        breakpoints: nextSettings,
      } satisfies ExtensionMessage);
      const next = (await browser.runtime.sendMessage({
        type: 'FOCUSTRACE_SAVE_BREAKPOINTS',
        tabId,
        breakpoints: nextSettings,
      } satisfies ExtensionMessage)) as SessionState;
      setSession(next);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    }
  }, [ensureInjected, session.breakpoints, tabId]);

  const focusEvents = useMemo(
    () => session.events.filter((event) => ['focus', 'focus-lost', 'focus-hidden', 'focus-obscured'].includes(event.kind)),
    [session.events],
  );
  const interactions = useMemo(() => groupRuntimeInteractions(session.events), [session.events]);
  const focusGraph = useMemo(() => buildFocusGraph(session.events), [session.events]);
  const latestFocus = focusEvents.at(-1);
  const runtimeFindings = session.events.filter((event) => event.outcome);
  const serious = runtimeFindings.filter((event) => ['critical', 'serious'].includes(event.severity)).length;
  const runtimeWarnings = runtimeFindings.filter((event) => ['moderate', 'minor'].includes(event.severity)).length;
  const causalFindings = runtimeFindings.filter((event) => event.causes?.length).length;
  const breakpointHits = session.events.reduce((total, event) => total + (event.breakpointHits?.length ?? 0), 0);
  const statusLabel = session.recording ? 'Recording' : session.pausedByBreakpoint ? 'Paused' : 'Idle';

  return (
    <main className="app-shell">
      <header className="topbar">
        <div><p className="eyebrow">Accessibility runtime debugger</p><h1>FocusTrace</h1></div>
        <span className={`status ${session.recording ? 'live' : session.pausedByBreakpoint ? 'paused' : ''}`.trim()}>
          <span aria-hidden="true" /> {statusLabel}
        </span>
      </header>

      <div className="actions" aria-label="Primary actions">
        <button className="primary" type="button" onClick={toggleRecording} disabled={busy || tabId == null}>
          {session.recording ? 'Stop recording' : session.pausedByBreakpoint ? 'Resume recording' : 'Record interaction'}
        </button>
        <button type="button" onClick={runScan} disabled={busy || tabId == null}>{busy ? 'Working…' : 'Analyze page'}</button>
      </div>

      {error && <div className="error" role="alert">{error}</div>}

      {view !== 'about' && (
        <ExplanationLevelControl value={explanationLevel} onChange={setExplanationLevel} />
      )}

      <nav className="tabs" aria-label="FocusTrace sections">
        {(['scan', 'focus', 'runtime', 'graph', 'report', 'about'] as const).map((item) => (
          <button
            key={item}
            type="button"
            className={view === item ? 'active' : ''}
            aria-current={view === item ? 'page' : undefined}
            onClick={() => setView(item)}
          >
            {item}
          </button>
        ))}
      </nav>

      {view === 'scan' && <ScanView scan={scan} level={explanationLevel} />}
      {view === 'focus' && <FocusView latest={latestFocus} count={focusEvents.length} level={explanationLevel} />}
      {view === 'runtime' && (
        <RuntimeView
          events={session.events}
          interactions={interactions}
          recording={session.recording}
          breakpointSettings={breakpointSettings}
          pausedByBreakpoint={session.pausedByBreakpoint}
          onBreakpointChange={setBreakpoint}
          level={explanationLevel}
        />
      )}
      {view === 'graph' && (
        <FocusGraphView
          graph={focusGraph}
          interactions={interactions}
          level={explanationLevel}
          page={scan ? { url: scan.url, title: scan.title } : undefined}
        />
      )}
      {view === 'report' && (
        <ReportView
          runtimeCount={session.events.length}
          interactionCount={interactions.filter((interaction) => interaction.correlated).length}
          runtimeFindings={runtimeFindings.length}
          causalFindings={causalFindings}
          breakpointHits={breakpointHits}
          focusPoints={focusGraph.nodes.length}
          graphSignals={focusGraph.observations.length}
          serious={serious}
          runtimeWarnings={runtimeWarnings}
          scan={scan}
          level={explanationLevel}
        />
      )}
      {view === 'about' && <AboutView />}
    </main>
  );
}
