import { useCallback, useState } from 'react';
import { browser } from '#imports';
import { type ExplanationLevel } from '../../lib/runtime/explanations';
import { clearFocusPathInPage } from '../../lib/runtime/focus-path-overlay';
import { clearHeadingOutlineInPage } from '../../lib/runtime/heading-overlay';
import { pickComponentInPage, type ComponentPickerResult } from '../../lib/runtime/component-picker';
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
import { InstructionsView } from './views/InstructionsView';
import { ScanView } from './views/ScanView';
import { SessionReportView } from './views/SessionReportView';
import { SettingsView } from './views/SettingsView';
import { TraceView } from './views/TraceView';

type View = 'scan' | 'trace' | 'headings' | 'report' | 'about' | 'instructions' | 'settings';

type NavigationItem = {
  id: 'scan' | 'trace' | 'headings' | 'report';
  label: string;
  icon: string;
  disabled?: boolean;
  title?: string;
};

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
  const componentScan = scan?.scope?.type === 'component' ? scan.scope : undefined;
  const openTrace = useCallback(() => setView('trace'), []);

  const saveScan = useCallback(async (result: ScanResult) => {
    if (tabId == null) return;
    const next = (await browser.runtime.sendMessage({
      type: 'FOCUSTRACE_SAVE_SCAN',
      tabId,
      scan: result,
    } satisfies ExtensionMessage)) as SessionState;
    setSession(next);
  }, [setSession, tabId]);

  const runScan = useCallback(async () => {
    if (tabId == null) return;
    setBusy(true);
    setError(undefined);
    try {
      await ensureInjected();
      await browser.scripting.executeScript({
        target: { tabId },
        func: () => document.documentElement.removeAttribute('data-focustrace-scan-component'),
      }).catch(() => undefined);
      const result = (await browser.tabs.sendMessage(tabId, {
        type: 'FOCUSTRACE_RUN_SCAN',
      } satisfies ExtensionMessage)) as ScanResult;
      await saveScan(result);
      setView('scan');
    } catch (reason) {
      setError(localizedUserError(reason, language, 'analysis'));
    } finally {
      setBusy(false);
    }
  }, [ensureInjected, language, saveScan, tabId]);

  const runComponentScan = useCallback(async () => {
    if (tabId == null || session.recording) return;
    setBusy(true);
    setError(undefined);
    try {
      await ensureInjected();
      const pickerResults = await browser.scripting.executeScript({
        target: { tabId },
        func: pickComponentInPage,
        args: [language],
      });
      const picked = pickerResults[0]?.result as ComponentPickerResult | undefined;
      if (!picked || picked.cancelled || !picked.scope) return;

      const result = (await browser.tabs.sendMessage(tabId, {
        type: 'FOCUSTRACE_RUN_SCAN',
      } satisfies ExtensionMessage)) as ScanResult;
      if (result.scope?.type !== 'component') {
        throw new Error('FocusTrace component scope handoff failed.');
      }
      await saveScan(result);
      setView('scan');
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : String(reason);
      if (message.includes('Selected scan component is no longer present')) {
        setError(tr(
          language,
          'The selected component changed or disappeared before it could be analyzed. Select it again.',
          'El componente seleccionado cambió o desapareció antes de poder analizarse. Vuelve a seleccionarlo.',
        ));
      } else if (message.includes('component scope handoff failed')) {
        setError(tr(
          language,
          'FocusTrace could not keep the selected component scope. Select the component again.',
          'FocusTrace no ha podido conservar el alcance del componente seleccionado. Vuelve a seleccionarlo.',
        ));
      } else {
        setError(localizedUserError(reason, language, 'analysis'));
      }
    } finally {
      setBusy(false);
    }
  }, [ensureInjected, language, saveScan, session.recording, tabId]);

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
          document.querySelector('[data-focustrace-component-picker]')?.remove();
          document.documentElement.removeAttribute('data-focustrace-scan-component');
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

  const navigation: NavigationItem[] = [
    { id: 'scan', label: tr(language, 'Review', 'Revisión'), icon: '⌕' },
    { id: 'trace', label: 'Trace', icon: '◎' },
    {
      id: 'headings',
      label: tr(language, 'Headings', 'Encabezados'),
      icon: 'H',
      disabled: Boolean(componentScan),
      ...(componentScan
        ? {
            title: tr(
              language,
              'Heading outline is available for full-page scans.',
              'El esquema de encabezados está disponible en análisis de página completa.',
            ),
          }
        : {}),
    },
    { id: 'report', label: tr(language, 'Report', 'Informe'), icon: '▤' },
  ];

  const currentAnalysisLabel = componentScan
    ? `${tr(language, 'Component', 'Componente')}: ${componentScan.label || componentScan.tag}`
    : scan?.title || scan?.url;

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
            className="instructions-trigger"
            type="button"
            aria-pressed={view === 'instructions'}
            title={tr(language, 'Instructions', 'Instrucciones')}
            aria-label={tr(language, 'Open instructions', 'Abrir instrucciones')}
            onClick={() => setView('instructions')}
          >
            <span aria-hidden="true">?</span>
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
              : currentAnalysisLabel
                ? currentAnalysisLabel
                : tr(
                    language,
                    'Analyze the page, select a component or trace a real keyboard journey.',
                    'Analiza la página, selecciona un componente o traza un recorrido real con teclado.',
                  )}
          </p>
        </div>
        <div className="quick-actions">
          <button className="primary scan-action" type="button" onClick={() => void runScan()} disabled={busy || tabId == null}>
            <span aria-hidden="true">⌕</span>
            {tr(language, 'Analyze this page', 'Analizar esta página')}
          </button>
          <button
            className="component-scan-action"
            type="button"
            title={tr(
              language,
              'Select a DOM region and analyze only that component.',
              'Selecciona una región del DOM y analiza únicamente ese componente.',
            )}
            onClick={() => void runComponentScan()}
            disabled={busy || tabId == null || session.recording}
          >
            <span aria-hidden="true">▱</span>
            {tr(language, 'Select component', 'Seleccionar componente')}
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
            disabled={item.disabled}
            title={item.title}
            onClick={() => setView(item.id)}
          >
            <span aria-hidden="true">{item.icon}</span>
            <strong>{item.label}</strong>
          </button>
        ))}
      </nav>

      {view === 'scan' && (
        <ScanView
          scan={scan}
          level={explanationLevel}
          language={language}
          onLocate={locateScanTarget}
          onAnalyzePage={runScan}
          onSelectComponent={runComponentScan}
        />
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
      {view === 'instructions' && <InstructionsView language={language} />}
      {view === 'settings' && <SettingsView language={language} onLanguageChange={updateLanguage} />}
    </main>
  );
}
