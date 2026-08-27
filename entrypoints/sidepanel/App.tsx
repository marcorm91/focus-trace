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
import { buildFocusJourney } from '../../lib/runtime/focus-journey';
import { clearHeadingOutlineInPage } from '../../lib/runtime/heading-overlay';
import { buildPageInspectorEntries } from '../../lib/runtime/page-inspector';
import { locateScanTargetInPage } from '../../lib/runtime/scan-target-overlay';
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
import { HeadingTreeView } from './views/HeadingTreeView';
import { ScanView } from './views/ScanView';
import { SessionReportView } from './views/SessionReportView';
import { SettingsView } from './views/SettingsView';
import { TraceView } from './views/TraceView';

type View = 'scan' | 'trace' | 'headings' | 'report' | 'about' | 'settings';

const PAGE_ACCESS_ORIGINS = ['http://*/*', 'https://*/*'];

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

async function requestPageAccess(language: AppLanguage) {
  const granted = await browser.permissions.request({ origins: PAGE_ACCESS_ORIGINS });
  if (granted) return;
  throw new Error(tr(
    language,
    'FocusTrace needs access to web pages to analyze the DOM, trace focus and highlight elements. Grant page access and try again.',
    'FocusTrace necesita acceso a las páginas web para analizar el DOM, trazar el foco y resaltar elementos. Concede el acceso y vuelve a intentarlo.',
  ));
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
    await requestPageAccess(language);
    await browser.runtime.sendMessage({
      type: 'FOCUSTRACE_ENSURE_INJECTED',
      tabId,
    } satisfies ExtensionMessage);
  }, [language, tabId]);

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
      await requestPageAccess(language);
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
      const result = results[0]?.result;
      if (!result?.found) {
        setError(tr(
          language,
          'The element is no longer present on the page. Run the scan again.',
          'El elemento ya no está presente en la página. Vuelve a ejecutar el análisis.',
        ));
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
      setView('trace');
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
      setView('trace');

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
      setView('trace');

      if (result.focusedSteps === 0) {
        setError(tr(
          language,
          'No keyboard-focusable elements were detected on this page.',
          'No se han detectado elementos enfocables por teclado en esta página.',
        ));
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

  const interactions = useMemo(() => groupRuntimeInteractions(session.events), [session.events]);
  const focusGraph = useMemo(() => buildFocusGraph(session.events), [session.events]);
  const focusJourney = useMemo(() => buildFocusJourney(session.events), [session.events]);
  const focusPath = useMemo(() => buildObservedFocusPath(session.events), [session.events]);
  const focusPathSteps = focusPath.reduce((total, target) => total + target.orders.length, 0);

  const showFocusPath = useCallback(async (selectedSelector?: string) => {
    if (tabId == null || focusPath.length === 0) return;
    setError(undefined);

    try {
      await requestPageAccess(language);
      const entries: FocusPathOverlayEntry[] = buildPageInspectorEntries(
        focusPath,
        scan,
        session.events,
        language,
      );
      const results = await browser.scripting.executeScript({
        target: { tabId },
        func: showFocusPathInPage,
        args: [entries, selectedSelector ?? null],
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

  const resetEverything = useCallback(async () => {
    if (tabId == null || busy) return;
    const confirmed = window.confirm(tr(
      language,
      'Start over? This clears the current page analysis, Trace, Replay, focus journey and breakpoint state. Language and interface size are kept.',
      '¿Empezar de cero? Se borrarán el análisis actual, Trace, Replay, recorrido de foco y estado de breakpoints. Se conservarán el idioma y el tamaño de interfaz.',
    ));
    if (!confirmed) return;

    setBusy(true);
    setError(undefined);
    try {
      const next = (await browser.runtime.sendMessage({
        type: 'FOCUSTRACE_RESET_TAB',
        tabId,
      } satisfies ExtensionMessage)) as SessionState;

      await browser.scripting.executeScript({ target: { tabId }, func: clearFocusPathInPage }).catch(() => undefined);
      await browser.scripting.executeScript({ target: { tabId }, func: clearHeadingOutlineInPage }).catch(() => undefined);
      await browser.scripting.executeScript({
        target: { tabId },
        func: () => {
          document.querySelector('[data-focustrace-scan-highlight]')?.remove();
          document.querySelector('[data-focustrace-focus-walk-backdrop]')?.remove();
        },
      }).catch(() => undefined);

      setSession(next);
      setScan(undefined);
      setFocusPathVisible(false);
      setSelectedFocusSelector(undefined);
      setView('scan');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusy(false);
    }
  }, [busy, language, tabId]);

  const navigation: Array<{ id: 'scan' | 'trace' | 'headings' | 'report'; label: string; icon: string }> = [
    { id: 'scan', label: tr(language, 'Review', 'Revisión'), icon: '⌕' },
    { id: 'trace', label: 'Trace', icon: '◎' },
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
            <p>{tr(language, 'Runtime accessibility debugger', 'Depurador de accesibilidad runtime')}</p>
          </div>
        </div>
        <div className="topbar-tools">
          <button
            className="reset-all-trigger"
            type="button"
            disabled={busy || tabId == null}
            title={tr(language, 'Clear all data for the current tab and start over', 'Borrar todos los datos de la pestaña actual y empezar de cero')}
            aria-label={tr(language, 'Start over', 'Empezar de cero')}
            onClick={() => void resetEverything()}
          >
            <span aria-hidden="true">↻</span>
          </button>
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
          <span className={`status ${session.recording ? 'live' : busy ? 'live' : 'ready'}`}>
            <span aria-hidden="true" />
            {session.recording
              ? tr(language, 'Trace recording', 'Grabando traza')
              : busy
                ? tr(language, 'Working…', 'Procesando…')
                : scan
                  ? tr(language, 'Analysis ready', 'Análisis listo')
                  : tr(language, 'Ready', 'Listo')}
          </span>
          <p>
            {session.recording
              ? tr(
                  language,
                  'Return to the page and interact normally. Recording continues while this panel is not focused.',
                  'Vuelve a la página e interactúa con normalidad. La grabación continúa aunque este panel no tenga el foco.',
                )
              : scan
                ? scan.title || scan.url
                : tr(
                    language,
                    'Analyze the page or trace a real keyboard journey.',
                    'Analiza la página o traza un recorrido real con teclado.',
                  )}
          </p>
        </div>
        <div className="quick-actions">
          <button className="primary scan-action" type="button" onClick={runScan} disabled={busy || tabId == null}>
            <span aria-hidden="true">⌕</span>
            {tr(language, 'Analyze this page', 'Analizar esta página')}
          </button>
          <button
            className="focus-walk-action"
            type="button"
            title={tr(language, 'Automatically walk through keyboard focus targets', 'Recorrer automáticamente los destinos de foco por teclado')}
            onClick={runFocusWalk}
            disabled={busy || tabId == null || session.recording}
          >
            <span aria-hidden="true">◎</span>
            {tr(language, 'Automate focus', 'Automatizar foco')}
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

      {view === 'scan' && (
        <ScanView scan={scan} level={explanationLevel} language={language} onLocate={locateScanTarget} />
      )}
      {view === 'trace' && (
        <TraceView
          journey={focusJourney}
          graph={focusGraph}
          events={session.events}
          interactions={interactions}
          pathSteps={focusPathSteps}
          pathVisible={focusPathVisible}
          recording={session.recording}
          busy={busy}
          selectedSelector={selectedFocusSelector}
          breakpointSettings={breakpointSettings}
          pausedByBreakpoint={session.pausedByBreakpoint}
          level={explanationLevel}
          language={language}
          page={scan ? { url: scan.url, title: scan.title } : undefined}
          onTogglePath={toggleFocusPath}
          onToggleRecording={toggleRecording}
          onSelectStep={selectFocusPoint}
          onClearSelection={clearFocusSelection}
          onBreakpointChange={setBreakpoint}
        />
      )}
      {view === 'headings' && (
        <HeadingTreeView scan={scan} language={language} onLocate={locateScanTarget} />
      )}
      {view === 'report' && (
        <SessionReportView scan={scan} events={session.events} language={language} onLocate={locateScanTarget} />
      )}
      {view === 'about' && <AboutView language={language} />}
      {view === 'settings' && <SettingsView language={language} onLanguageChange={updateLanguage} />}
    </main>
  );
}