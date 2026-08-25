import { useCallback, useEffect, useMemo, useState } from 'react';
import { browser } from '#imports';
import {
  defaultRuntimeBreakpointSettings,
  normalizeRuntimeBreakpointSettings,
} from '../../lib/runtime/breakpoints';
import { groupRuntimeInteractions } from '../../lib/runtime/causality';
import { type ExplanationLevel } from '../../lib/runtime/explanations';
import {
  buildFocusGraph,
  buildObservedFocusPath,
} from '../../lib/runtime/focus-graph';
import {
  clearFocusPathInPage,
  showFocusPathInPage,
  type FocusPathOverlayEntry,
  type FocusPathOverlayResult,
} from '../../lib/runtime/focus-path-overlay';
import { buildPageInspectorEntries } from '../../lib/runtime/page-inspector';
import { locateScanTargetInPage, type ScanTargetHighlightResult } from '../../lib/runtime/scan-target-overlay';
import { SETTINGS_STORAGE_KEY, tr, type AppLanguage } from '../../shared/i18n';
import type {
  ExtensionMessage,
  FocusWalkResult,
  RuntimeBreakpointId,
  RuntimeBreakpointSettings,
  ScanResult,
  SessionState,
} from '../../shared/types';
import { AboutView } from './views/AboutView';
import { FocusGraphView } from './views/FocusGraphView';
import { HeadingTreeView } from './views/HeadingTreeView';
import { FocusView } from './views/FocusView';
import { SessionReportView } from './views/SessionReportView';
import { RuntimeView } from './views/RuntimeView';
import { ScanView } from './views/ScanView';
import { SettingsView } from './views/SettingsView';

type View = 'scan' | 'focus' | 'headings' | 'runtime' | 'graph' | 'report' | 'about' | 'settings';

const EMPTY_SESSION: SessionState = {
  tabId: -1,
  recording: false,
  events: [],
  breakpoints: defaultRuntimeBreakpointSettings(),
};

function defaultLanguage(): AppLanguage {
  try {
    return browser.i18n.getUILanguage().toLowerCase().startsWith('es') ? 'es' : 'en';
  } catch {
    return 'en';
  }
}

async function activeTabId() {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (tab?.id == null) throw new Error('No active browser tab is available.');
  return tab.id;
}

function waitForRuntimeFlush() {
  return new Promise((resolve) => setTimeout(resolve, 250));
}

export default function App() {
  const [view, setView] = useState<View>('scan');
  const explanationLevel: ExplanationLevel = 'developer';
  const [language, setLanguage] = useState<AppLanguage>(defaultLanguage);
  const [tabId, setTabId] = useState<number>();
  const [session, setSession] = useState<SessionState>(EMPTY_SESSION);
  const [scan, setScan] = useState<ScanResult>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [focusPathVisible, setFocusPathVisible] = useState(false);
  const [selectedFocusSelector, setSelectedFocusSelector] = useState<string>();

  const refresh = useCallback(async (id: number) => {
    const state = (await browser.runtime.sendMessage({
      type: 'FOCUSTRACE_GET_SESSION',
      tabId: id,
    } satisfies ExtensionMessage)) as SessionState;
    setSession(state);
    setScan(state.scan);
  }, []);

  const selectTab = useCallback(async (id: number) => {
    setTabId(id);
    setSession({ ...EMPTY_SESSION, tabId: id });
    setScan(undefined);
    setFocusPathVisible(false);
    setSelectedFocusSelector(undefined);
    await refresh(id);
  }, [refresh]);

  useEffect(() => {
    void browser.storage.local.get(SETTINGS_STORAGE_KEY).then((stored) => {
      const settings = stored[SETTINGS_STORAGE_KEY] as { language?: AppLanguage } | undefined;
      if (settings?.language === 'en' || settings?.language === 'es') setLanguage(settings.language);
    });
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    void activeTabId()
      .then(selectTab)
      .catch((reason) => setError(String(reason)));
  }, [selectTab]);

  useEffect(() => {
    const listener = ({ tabId: nextTabId }: { tabId: number }) => {
      void selectTab(nextTabId).catch((reason) => setError(String(reason)));
    };
    browser.tabs.onActivated.addListener(listener);
    return () => browser.tabs.onActivated.removeListener(listener);
  }, [selectTab]);

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
      setView('report');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusy(false);
    }
  }, [ensureInjected, tabId]);

  const locateScanTarget = useCallback(async (selector: string) => {
    if (tabId == null) return;
    setError(undefined);
    try {
      await browser.scripting.executeScript({
        target: { tabId },
        func: clearFocusPathInPage,
      }).catch(() => undefined);
      setFocusPathVisible(false);
      setSelectedFocusSelector(undefined);

      const results = await browser.scripting.executeScript({
        target: { tabId },
        func: locateScanTargetInPage,
        args: [selector],
      });
      const result = results[0]?.result as ScanTargetHighlightResult | undefined;
      if (!result?.found) {
        setError(tr(language, 'The element is no longer present on the page. Run the scan again.', 'El elemento ya no está presente en la página. Vuelve a ejecutar el análisis.'));
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    }
  }, [language, tabId]);

  const updateLanguage = useCallback(async (nextLanguage: AppLanguage) => {
    setLanguage(nextLanguage);
    await browser.storage.local.set({ [SETTINGS_STORAGE_KEY]: { language: nextLanguage } });
  }, []);

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
      if (enabled) {
        await browser.scripting.executeScript({
          target: { tabId },
          func: clearFocusPathInPage,
        }).catch(() => undefined);
        setFocusPathVisible(false);
        setSelectedFocusSelector(undefined);
      }
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
      setView(enabled ? 'focus' : 'report');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusy(false);
    }
  }, [breakpointSettings, ensureInjected, session.pausedByBreakpoint, session.recording, tabId]);

  const runFocusWalk = useCallback(async () => {
    if (tabId == null) return;
    setBusy(true);
    setError(undefined);
    let contentRecording = false;

    try {
      await ensureInjected();
      await browser.scripting.executeScript({
        target: { tabId },
        func: clearFocusPathInPage,
      }).catch(() => undefined);
      setFocusPathVisible(false);
      setSelectedFocusSelector(undefined);

      await browser.runtime.sendMessage({ type: 'FOCUSTRACE_CLEAR_SESSION', tabId } satisfies ExtensionMessage);
      await browser.tabs.sendMessage(tabId, {
        type: 'FOCUSTRACE_SET_RECORDING',
        enabled: true,
        breakpoints: breakpointSettings,
      } satisfies ExtensionMessage);
      contentRecording = true;
      const started = (await browser.runtime.sendMessage({
        type: 'FOCUSTRACE_SET_RECORDING_STATE',
        tabId,
        enabled: true,
        startedAt: Date.now(),
      } satisfies ExtensionMessage)) as SessionState;
      setSession(started);
      setView('focus');

      const result = (await browser.tabs.sendMessage(tabId, {
        type: 'FOCUSTRACE_RUN_FOCUS_WALK',
        options: { delayMs: 180, maxSteps: 80 },
      } satisfies ExtensionMessage)) as FocusWalkResult;

      await waitForRuntimeFlush();
      await browser.tabs.sendMessage(tabId, {
        type: 'FOCUSTRACE_SET_RECORDING',
        enabled: false,
        breakpoints: breakpointSettings,
      } satisfies ExtensionMessage);
      contentRecording = false;
      const stopped = (await browser.runtime.sendMessage({
        type: 'FOCUSTRACE_SET_RECORDING_STATE',
        tabId,
        enabled: false,
      } satisfies ExtensionMessage)) as SessionState;
      setSession(stopped);
      await waitForRuntimeFlush();
      await refresh(tabId);
      setView('report');
      if (result.focusedSteps === 0) {
        setError(tr(language, 'No keyboard-focusable elements were detected on this page.', 'No se han detectado elementos enfocables por teclado en esta página.'));
      }
    } catch (reason) {
      if (contentRecording) {
        await browser.tabs.sendMessage(tabId, {
          type: 'FOCUSTRACE_SET_RECORDING',
          enabled: false,
          breakpoints: breakpointSettings,
        } satisfies ExtensionMessage).catch(() => undefined);
        await browser.runtime.sendMessage({
          type: 'FOCUSTRACE_SET_RECORDING_STATE',
          tabId,
          enabled: false,
        } satisfies ExtensionMessage).catch(() => undefined);
      }
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusy(false);
    }
  }, [breakpointSettings, ensureInjected, language, refresh, tabId]);

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
  const focusPath = useMemo(() => buildObservedFocusPath(session.events), [session.events]);
  const focusPathSteps = focusPath.reduce((total, target) => total + target.orders.length, 0);
  const latestFocus = focusEvents.at(-1);

  const showFocusPath = useCallback(async (selectedSelector?: string) => {
    if (tabId == null || focusPath.length === 0) return;
    setError(undefined);

    try {
      const entries: FocusPathOverlayEntry[] = buildPageInspectorEntries(
        focusPath,
        scan,
        session.events,
        language,
      );
      const results = await browser.scripting.executeScript({
        target: { tabId },
        func: showFocusPathInPage,
        args: [entries, selectedSelector],
      });
      const result = results[0]?.result as FocusPathOverlayResult | undefined;
      if (!result?.found) {
        setFocusPathVisible(false);
        setSelectedFocusSelector(undefined);
        setError(tr(
          language,
          'The recorded focus elements are no longer present on the page.',
          'Los elementos de foco grabados ya no están presentes en la página.',
        ));
        return;
      }

      setFocusPathVisible(true);
      setSelectedFocusSelector(selectedSelector);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    }
  }, [focusPath, language, scan, session.events, tabId]);

  const hideFocusPath = useCallback(async () => {
    if (tabId == null) return;
    setError(undefined);

    try {
      await browser.scripting.executeScript({
        target: { tabId },
        func: clearFocusPathInPage,
      });
      setFocusPathVisible(false);
      setSelectedFocusSelector(undefined);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    }
  }, [tabId]);

  const toggleFocusPath = useCallback(async () => {
    if (focusPathVisible) {
      await hideFocusPath();
      return;
    }
    await showFocusPath();
  }, [focusPathVisible, hideFocusPath, showFocusPath]);

  const selectFocusPoint = useCallback(async (selector: string) => {
    await showFocusPath(selector);
  }, [showFocusPath]);

  const clearFocusSelection = useCallback(async () => {
    if (!focusPathVisible) {
      setSelectedFocusSelector(undefined);
      return;
    }
    await showFocusPath();
  }, [focusPathVisible, showFocusPath]);
  const runtimeFindings = session.events.filter((event) => event.outcome);
  const serious = runtimeFindings.filter((event) => ['critical', 'serious'].includes(event.severity)).length;
  const runtimeWarnings = runtimeFindings.filter((event) => ['moderate', 'minor'].includes(event.severity)).length;
  const causalFindings = runtimeFindings.filter((event) => event.causes?.length).length;
  const breakpointHits = session.events.reduce((total, event) => total + (event.breakpointHits?.length ?? 0), 0);
  const hasRecordedJourney = session.events.length > 0;
  const statusLabel = session.recording
    ? tr(language, 'Recording active', 'Grabación activa')
    : session.pausedByBreakpoint
      ? tr(language, 'Paused by breakpoint', 'Pausada por breakpoint')
      : hasRecordedJourney
        ? tr(language, 'Recording stopped', 'Grabación detenida')
        : tr(language, 'Ready', 'Listo');
  const statusDescription = session.recording
    ? tr(
        language,
        'Return to the page and use it normally. Recording continues when this panel loses focus.',
        'Vuelve a la página y úsala con normalidad. La grabación continúa aunque este panel pierda el foco.',
      )
    : session.pausedByBreakpoint
      ? tr(
          language,
          'The triggering event was saved. Continue when you are ready; the page itself was never paused.',
          'El evento que lo provocó ya está guardado. Continúa cuando quieras; la página nunca se ha pausado.',
        )
      : hasRecordedJourney
        ? tr(
            language,
            'Your recorded journey is kept below. Start a new recording when you want to replace it.',
            'El recorrido grabado se conserva abajo. Inicia una nueva grabación cuando quieras reemplazarlo.',
          )
        : tr(
            language,
            'Analyze the current page, record a journey or simulate focus to inspect keyboard navigation.',
            'Analiza la página actual, graba un recorrido o simula el foco para revisar la navegación por teclado.',
          );
  const sessionTone = session.recording ? 'live' : session.pausedByBreakpoint ? 'paused' : hasRecordedJourney ? 'stopped' : 'ready';

  const navigation: Array<{ id: 'scan' | 'focus' | 'headings' | 'report'; label: string; icon: string }> = [
    { id: 'scan', label: tr(language, 'Review', 'Revisión'), icon: '⌕' },
    { id: 'focus', label: tr(language, 'Focus', 'Foco'), icon: '◎' },
    { id: 'headings', label: tr(language, 'Headings', 'Encabezados'), icon: 'H' },
    { id: 'report', label: tr(language, 'Report', 'Informe'), icon: '▤' },
  ];

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">FT</span>
          <div>
            <h1>FocusTrace</h1>
            <p>{tr(language, 'Accessibility journey debugger', 'Depurador de recorridos accesibles')}</p>
          </div>
        </div>
        <div className="topbar-tools">
          <button
            className="settings-trigger"
            type="button"
            aria-pressed={view === 'settings'}
            aria-label={tr(language, 'Open settings', 'Abrir ajustes')}
            onClick={() => setView('settings')}
          >
            <span aria-hidden="true">⚙</span>
          </button>
        </div>
      </header>

      <section className="quick-start" aria-label={tr(language, 'Page tools', 'Herramientas de página')}>
        <div className="quick-start-copy">
          <span className={`status ${busy ? 'live' : 'ready'}`}>
            <span aria-hidden="true" />
            {busy
              ? tr(language, 'Working…', 'Procesando…')
              : scan
                ? tr(language, 'Analysis ready', 'Análisis listo')
                : tr(language, 'Ready', 'Listo')}
          </span>
          <p>
            {scan
              ? scan.title || scan.url
              : tr(
                  language,
                  'Analyze the current page or inspect its keyboard focus order.',
                  'Analiza la página actual o revisa su recorrido de foco por teclado.',
                )}
          </p>
        </div>
        <div className="quick-actions">
          <button className="primary scan-action" type="button" onClick={runScan} disabled={busy || tabId == null}>
            <span aria-hidden="true">⌕</span>
            {tr(language, 'Analyze this page', 'Analizar esta página')}
          </button>
          <button className="focus-walk-action" type="button" onClick={runFocusWalk} disabled={busy || tabId == null || session.recording}>
            <span aria-hidden="true">◎</span>
            {tr(language, 'Walk with Tab', 'Recorrer con Tab')}
          </button>
        </div>
      </section>

      {error && <div className="error" role="alert">{error}</div>}

      <nav className="tabs workspace-nav" aria-label={tr(language, 'FocusTrace sections', 'Secciones de FocusTrace')}>
        {navigation.map((item) => (
          <button
            key={item.id}
            type="button"
            className={view === item.id ? 'active' : ''}
            aria-current={view === item.id ? 'page' : undefined}
            onClick={() => setView(item.id)}
          >
            <span aria-hidden="true">{item.icon}</span>
            <strong>{item.label}</strong>
          </button>
        ))}
      </nav>

      {view === 'scan' && <ScanView scan={scan} level={explanationLevel} language={language} onLocate={locateScanTarget} />}
      {view === 'headings' && (
        <HeadingTreeView scan={scan} language={language} onLocate={locateScanTarget} />
      )}
      {view === 'focus' && (
        <FocusView
          latest={latestFocus}
          count={focusEvents.length}
          pathSteps={focusPathSteps}
          pathVisible={focusPathVisible}
          recording={session.recording}
          busy={busy}
          onTogglePath={toggleFocusPath}
          onToggleRecording={toggleRecording}
          level={explanationLevel}
          language={language}
        />
      )}
      {view === 'runtime' && (
        <RuntimeView
          events={session.events}
          interactions={interactions}
          recording={session.recording}
          breakpointSettings={breakpointSettings}
          pausedByBreakpoint={session.pausedByBreakpoint}
          onBreakpointChange={setBreakpoint}
          level={explanationLevel}
          language={language}
        />
      )}
      {view === 'graph' && (
        <FocusGraphView
          graph={focusGraph}
          interactions={interactions}
          level={explanationLevel}
          language={language}
          page={scan ? { url: scan.url, title: scan.title } : undefined}
          pathVisible={focusPathVisible}
          recording={session.recording}
          selectedPageNodeId={selectedFocusSelector}
          onTogglePath={toggleFocusPath}
          onSelectPageNode={selectFocusPoint}
          onClearPageNode={clearFocusSelection}
        />
      )}
      {view === 'report' && (
        <SessionReportView
          scan={scan}
          events={session.events}
          language={language}
          onLocate={locateScanTarget}
        />
      )}
      {view === 'about' && <AboutView language={language} />}
      {view === 'settings' && <SettingsView language={language} onLanguageChange={updateLanguage} />}
    </main>
  );
}
