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
import { SETTINGS_STORAGE_KEY, tr, type AppLanguage } from '../../shared/i18n';
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
import { SettingsView } from './views/SettingsView';

type View = 'scan' | 'focus' | 'runtime' | 'graph' | 'report' | 'about' | 'settings';

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

function locateScanTargetInPage(selector: string): { found: boolean; selector: string } {
  const existing = document.querySelector('[data-focustrace-scan-highlight]');
  existing?.remove();

  let target: Element | null = null;
  try {
    target = document.querySelector(selector);
  } catch {
    return { found: false, selector };
  }
  if (!target) return { found: false, selector };

  target.scrollIntoView({ block: 'center', inline: 'center', behavior: 'auto' });

  if (target instanceof HTMLElement) {
    const naturallyFocusable = target.matches(
      'a[href], button, input, select, textarea, summary, iframe, [contenteditable="true"], [tabindex]',
    );
    const previousTabindex = target.getAttribute('tabindex');
    if (!naturallyFocusable) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
    if (!naturallyFocusable) {
      if (previousTabindex == null) target.removeAttribute('tabindex');
      else target.setAttribute('tabindex', previousTabindex);
    }
  }

  const rect = target.getBoundingClientRect();
  const overlay = document.createElement('div');
  overlay.setAttribute('data-focustrace-scan-highlight', 'true');
  overlay.setAttribute('aria-hidden', 'true');
  Object.assign(overlay.style, {
    position: 'fixed',
    top: `${Math.max(0, rect.top - 3)}px`,
    left: `${Math.max(0, rect.left - 3)}px`,
    width: `${Math.max(0, rect.width + 6)}px`,
    height: `${Math.max(0, rect.height + 6)}px`,
    border: '3px solid #d93025',
    borderRadius: '4px',
    boxShadow: '0 0 0 4px rgba(217, 48, 37, 0.2)',
    pointerEvents: 'none',
    zIndex: '2147483647',
    boxSizing: 'border-box',
  });

  const badge = document.createElement('span');
  badge.textContent = 'FocusTrace';
  Object.assign(badge.style, {
    position: 'absolute',
    top: '-25px',
    left: '-3px',
    padding: '3px 7px',
    borderRadius: '4px 4px 0 0',
    background: '#d93025',
    color: '#fff',
    font: '600 12px/1.4 system-ui, sans-serif',
    whiteSpace: 'nowrap',
  });
  overlay.append(badge);
  document.documentElement.append(overlay);
  window.setTimeout(() => overlay.remove(), 4000);

  return { found: true, selector };
}

export default function App() {
  const [view, setView] = useState<View>('scan');
  const [explanationLevel, setExplanationLevel] = useState<ExplanationLevel>('simple');
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
      const result = results[0]?.result as { found?: boolean } | undefined;
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
  const focusPath = useMemo(() => buildObservedFocusPath(session.events), [session.events]);
  const focusPathSteps = focusPath.reduce((total, target) => total + target.orders.length, 0);
  const latestFocus = focusEvents.at(-1);

  const showFocusPath = useCallback(async (selectedSelector?: string) => {
    if (tabId == null || focusPath.length === 0) return;
    setError(undefined);

    try {
      const entries: FocusPathOverlayEntry[] = focusPath.map((target) => ({
        selector: target.element.selector,
        label: target.label,
        orders: target.orders,
      }));
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
  }, [focusPath, language, tabId]);

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
  const statusLabel = session.recording
    ? tr(language, 'Recording', 'Grabando')
    : session.pausedByBreakpoint
      ? tr(language, 'Paused', 'Pausado')
      : tr(language, 'Idle', 'Inactivo');

  const navigation: Array<{ id: Exclude<View, 'settings'>; label: string }> = [
    { id: 'scan', label: tr(language, 'Scan', 'Análisis') },
    { id: 'focus', label: tr(language, 'Focus', 'Foco') },
    { id: 'runtime', label: 'Runtime' },
    { id: 'graph', label: tr(language, 'Graph', 'Grafo') },
    { id: 'report', label: tr(language, 'Report', 'Informe') },
    { id: 'about', label: tr(language, 'About', 'Acerca de') },
  ];

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">{tr(language, 'Accessibility runtime debugger', 'Depurador de accesibilidad en tiempo de ejecución')}</p>
          <h1>FocusTrace</h1>
        </div>
        <div className="topbar-tools">
          <span className={`status ${session.recording ? 'live' : session.pausedByBreakpoint ? 'paused' : ''}`.trim()}>
            <span aria-hidden="true" /> {statusLabel}
          </span>
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

      <div className="actions" aria-label={tr(language, 'Primary actions', 'Acciones principales')}>
        <button className="primary" type="button" onClick={toggleRecording} disabled={busy || tabId == null}>
          {session.recording
            ? tr(language, 'Stop recording', 'Detener grabación')
            : session.pausedByBreakpoint
              ? tr(language, 'Resume recording', 'Reanudar grabación')
              : tr(language, 'Record interaction', 'Grabar interacción')}
        </button>
        <button type="button" onClick={runScan} disabled={busy || tabId == null}>
          {busy ? tr(language, 'Working…', 'Procesando…') : tr(language, 'Analyze page', 'Analizar página')}
        </button>
      </div>

      {error && <div className="error" role="alert">{error}</div>}

      {view !== 'about' && view !== 'settings' && (
        <ExplanationLevelControl value={explanationLevel} onChange={setExplanationLevel} language={language} />
      )}

      <nav className="tabs" aria-label={tr(language, 'FocusTrace sections', 'Secciones de FocusTrace')}>
        {navigation.map((item) => (
          <button
            key={item.id}
            type="button"
            className={view === item.id ? 'active' : ''}
            aria-current={view === item.id ? 'page' : undefined}
            onClick={() => setView(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {view === 'scan' && <ScanView scan={scan} level={explanationLevel} language={language} onLocate={locateScanTarget} />}
      {view === 'focus' && (
        <FocusView
          latest={latestFocus}
          count={focusEvents.length}
          pathSteps={focusPathSteps}
          pathVisible={focusPathVisible}
          recording={session.recording}
          onTogglePath={toggleFocusPath}
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
          language={language}
        />
      )}
      {view === 'about' && <AboutView language={language} />}
      {view === 'settings' && <SettingsView language={language} onLanguageChange={updateLanguage} />}
    </main>
  );
}
