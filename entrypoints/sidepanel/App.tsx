import { useCallback, useState } from 'react';
import { browser } from '#imports';
import { type ExplanationLevel } from '../../lib/runtime/explanations';
import { clearFocusPathInPage } from '../../lib/runtime/focus-path-overlay';
import { clearHeadingOutlineInPage } from '../../lib/runtime/heading-overlay';
import { locateScanTargetInPage } from '../../lib/runtime/scan-target-overlay';
import { tr } from '../../shared/i18n';
import type {
  ExtensionMessage,
  ScanResult,
  SessionState,
} from '../../shared/types';
import { localizedUserError } from '../../shared/user-facing-errors';
import { usePageRuntimeAccess } from './hooks/usePageRuntimeAccess';
import { useSidepanelLanguage } from './hooks/useSidepanelLanguage';
import { useSidepanelSession } from './hooks/useSidepanelSession';
import { useTraceActions } from './hooks/useTraceActions';
import { AboutView } from './views/AboutView';
import { HeadingTreeView } from './views/HeadingTreeView';
import { ScanView } from './views/ScanView';
import { SessionReportView } from './views/SessionReportView';
import { SettingsView } from './views/SettingsView';
import { TraceView } from './views/TraceView';

type View = 'scan' | 'trace' | 'headings' | 'report' | 'about' | 'settings';

export default function App() {
  const [view, setView] = useState<View>('scan');
  const explanationLevel: ExplanationLevel = 'developer';
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [focusPathVisible, setFocusPathVisible] = useState(false);
  const [selectedFocusSelector, setSelectedFocusSelector] = useState<string>();

  const { language, updateLanguage } = useSidepanelLanguage();
  const handleSessionError = useCallback((reason: unknown) => {
    setError(localizedUserError(reason, language, 'session'));
  }, [language]);
  const resetFocusPathState = useCallback(() => {
    setFocusPathVisible(false);
    setSelectedFocusSelector(undefined);
  }, []);
  const { tabId, session, setSession, refresh } = useSidepanelSession({
    onError: handleSessionError,
    onTabSelected: resetFocusPathState,
  });
  const { requestPageAccess, ensureInjected } = usePageRuntimeAccess(tabId, language);
  const scan = session.scan;
  const openTrace = useCallback(() => setView('trace'), []);

  const runScan = useCallback(async () => {
    if (tabId == null) return;
    setBusy(true);
    setError(undefined);
    try {
      await ensureInjected();
      const result = (await browser.tabs.sendMessage(tabId, {
        type: 'FOCUSTRACE_RUN_SCAN',
      } satisfies ExtensionMessage)) as ScanResult;
      const next = (await browser.runtime.sendMessage({
        type: 'FOCUSTRACE_SAVE_SCAN',
        tabId,
        scan: result,
      } satisfies ExtensionMessage)) as SessionState;
      setSession(next);
      setView('report');
    } catch (reason) {
      setError(localizedUserError(reason, language, 'analysis'));
    } finally {
      setBusy(false);
    }
  }, [ensureInjected, language, setSession, tabId]);

  const locateScanTarget = useCallback(async (selector: string) => {
    if (tabId == null) return;
    setError(undefined);
    try {
      await requestPageAccess();
      await browser.scripting.executeScript({
        target: { tabId },
        func: clearFocusPathInPage,
      }).catch(() => undefined);
      resetFocusPathState();

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
      setError(localizedUserError(reason, language, 'page-action'));
    }
  }, [language, requestPageAccess, resetFocusPathState, tabId]);

  const {
    breakpointSettings,
    interactions,
    focusGraph,
    focusJourney,
    focusPathSteps,
    toggleRecording,
    runFocusWalk,
    setBreakpoint,
    toggleFocusPath,
    selectFocusPoint,
    clearFocusSelection,
  } = useTraceActions({
    tabId,
    session,
    scan,
    language,
    setSession,
    refresh,
    ensureInjected,
    requestPageAccess,
    setBusy,
    setError,
    focusPathVisible,
    setFocusPathVisible,
    setSelectedFocusSelector,
    resetFocusPathState,
    onOpenTrace: openTrace,
  });

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
      resetFocusPathState();
      setView('scan');
    } catch (reason) {
      setError(localizedUserError(reason, language, 'reset'));
    } finally {
      setBusy(false);
    }
  }, [busy, language, resetFocusPathState, setSession, tabId]);

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
            title={tr(language, 'Settings', 'Ajustes')}
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
