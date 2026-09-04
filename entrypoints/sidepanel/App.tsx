import { useCallback, useState } from 'react';
import { browser } from '#imports';
import { collectFocusMemoryEvidence } from '../../lib/focus-memory/visual-evidence';
import { type ExplanationLevel } from '../../lib/runtime/explanations';
import { clearFocusPathInPage } from '../../lib/runtime/focus-path-overlay';
import { clearHeadingOutlineInPage } from '../../lib/runtime/heading-overlay';
import { pickComponentInPage, type ComponentPickerResult } from '../../lib/runtime/component-picker';
import { locateScanTargetInPage } from '../../lib/runtime/scan-target-overlay';
import { collectStructureEvidenceInPage, type StructureSnapshot } from '../../lib/runtime/structure-evidence';
import { tr } from '../../shared/i18n';
import type {
  ExtensionMessage,
  FocusMemoryCapturedEvidence,
  SaveScanResponse,
  ScanResult,
  SessionState,
} from '../../shared/types';
import { localizedUserError } from '../../shared/user-facing-errors';
import { AuditScopeDialog } from './components/AuditScopeDialog';
import { SiteAuditLauncher } from './components/SiteAuditLauncher';
import { useMultipageAudit } from './hooks/useMultipageAudit';
import { usePageRuntimeAccess } from './hooks/usePageRuntimeAccess';
import { useSidepanelLanguage } from './hooks/useSidepanelLanguage';
import { useSidepanelSession } from './hooks/useSidepanelSession';
import { useTraceActions } from './hooks/useTraceActions';
import { AuditReportWorkspace } from './views/AuditReportWorkspace';
import { InstructionsView } from './views/InstructionsView';
import { ScanView } from './views/ScanView';
import { SettingsView } from './views/SettingsView';
import { StructureView } from './views/StructureView';
import { TraceView } from './views/TraceView';

type View = 'scan' | 'structure' | 'trace' | 'report' | 'instructions' | 'settings';

type NavigationItem = {
  id: 'scan' | 'structure' | 'trace' | 'report';
  label: string;
  icon: string;
};

export default function App() {
  const [view, setView] = useState<View>('scan');
  const explanationLevel: ExplanationLevel = 'developer';
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [focusPathVisible, setFocusPathVisible] = useState(false);
  const [selectedFocusSelector, setSelectedFocusSelector] = useState<string>();
  const [structureSnapshot, setStructureSnapshot] = useState<StructureSnapshot>();

  const { language, updateLanguage } = useSidepanelLanguage();
  const handleSessionError = useCallback((reason: unknown) => {
    setError(localizedUserError(reason, language, 'session'));
  }, [language]);
  const resetFocusPathState = useCallback(() => {
    setFocusPathVisible(false);
    setSelectedFocusSelector(undefined);
  }, []);
  const handleTabSelected = useCallback(() => {
    resetFocusPathState();
    setStructureSnapshot(undefined);
  }, [resetFocusPathState]);
  const { tabId, session, setSession, refresh } = useSidepanelSession({
    onError: handleSessionError,
    onTabSelected: handleTabSelected,
  });
  const { requestPageAccess, ensureInjected } = usePageRuntimeAccess(tabId);
  const {
    activeAudit,
    pendingScope,
    decisionPending,
    preparePageAnalysis,
    recordPageAnalysis,
    addPendingSiteToCurrentAudit,
    startPendingSiteAsNewAudit,
    cancelPendingAuditScope,
  } = useMultipageAudit();
  const scan = session.scan;
  const componentScan = scan?.scope?.type === 'component' ? scan.scope : undefined;
  const openTrace = useCallback(() => setView('trace'), []);

  const saveScan = useCallback(async (
    result: ScanResult,
    memoryEvidence: FocusMemoryCapturedEvidence[] = [],
  ) => {
    if (tabId == null) return;
    const response = (await browser.runtime.sendMessage({
      type: 'FOCUSTRACE_SAVE_SCAN',
      tabId,
      scan: result,
      memoryEvidence,
    } satisfies ExtensionMessage)) as SaveScanResponse | SessionState;
    const next = 'state' in response ? response.state : response;
    setSession(next);
    if ('warning' in response && response.warning === 'focus-memory-write-failed') {
      setError(tr(
        language,
        'The analysis was saved, but FocusTrace Memory could not record this observation.',
        'El análisis se ha guardado, pero FocusTrace Memory no ha podido registrar esta observación.',
      ));
    }
  }, [language, setSession, tabId]);

  const runScan = useCallback(async () => {
    if (tabId == null || decisionPending) return;
    setError(undefined);
    try {
      await requestPageAccess();
      const tab = await browser.tabs.get(tabId);
      if (!tab.url) throw new Error('FocusTrace could not resolve the current page URL.');
      const auditPlan = await preparePageAnalysis(tab.url);
      if (!auditPlan) return;

      setBusy(true);
      await ensureInjected();
      await browser.scripting.executeScript({
        target: { tabId },
        func: () => document.documentElement.removeAttribute('data-focustrace-scan-component'),
      }).catch(() => undefined);
      const result = (await browser.tabs.sendMessage(tabId, {
        type: 'FOCUSTRACE_RUN_SCAN',
      } satisfies ExtensionMessage)) as ScanResult;
      const memoryEvidence = await collectFocusMemoryEvidence(tabId, result).catch(() => []);
      await saveScan(result, memoryEvidence);
      try {
        await recordPageAnalysis(result, auditPlan);
      } catch {
        setError(tr(
          language,
          'The page analysis is ready, but the current audit could not be updated.',
          'El análisis de la página está listo, pero no se pudo actualizar la auditoría actual.',
        ));
      }
      setView('scan');
    } catch (reason) {
      setError(localizedUserError(reason, language, 'analysis'));
    } finally {
      setBusy(false);
    }
  }, [
    decisionPending,
    ensureInjected,
    language,
    preparePageAnalysis,
    recordPageAnalysis,
    requestPageAccess,
    saveScan,
    tabId,
  ]);

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
      const memoryEvidence = await collectFocusMemoryEvidence(tabId, result).catch(() => []);
      await saveScan(result, memoryEvidence);
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
        args: [selector, { tone: 'inspect', label: 'FocusTrace', focusTarget: false }],
      });
      const result = results[0]?.result;
      if (!result?.found) {
        setError(tr(
          language,
          'The element is no longer present on the page. Run the scan again.',
          'El elemento ya no está presente en la página. Vuelve a ejecutar el análisis.',
        ));
      } else if (!result.rendered) {
        setError(tr(
          language,
          'The element exists in the DOM but has no visual box on the page (for example, script or head content), so it cannot be highlighted.',
          'El elemento existe en el DOM, pero no tiene una caja visual en la página (por ejemplo, contenido script o head), por lo que no se puede resaltar.',
        ));
      }
    } catch (reason) {
      setError(localizedUserError(reason, language, 'page-action'));
    }
  }, [language, requestPageAccess, resetFocusPathState, tabId]);

  const refreshStructure = useCallback(async () => {
    if (tabId == null) return;
    setBusy(true);
    setError(undefined);
    try {
      await requestPageAccess();
      const results = await browser.scripting.executeScript({
        target: { tabId },
        func: collectStructureEvidenceInPage,
      });
      const snapshot = results[0]?.result as StructureSnapshot | undefined;
      if (!snapshot) throw new Error('FocusTrace could not collect the DOM structure snapshot.');
      setStructureSnapshot(snapshot);
    } catch (reason) {
      setError(localizedUserError(reason, language, 'analysis'));
    } finally {
      setBusy(false);
    }
  }, [language, requestPageAccess, tabId]);

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
    deleteTraceInteraction,
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
      setStructureSnapshot(undefined);
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
    { id: 'structure', label: tr(language, 'Structure', 'Estructura'), icon: '▦' },
    { id: 'trace', label: 'Trace', icon: '◎' },
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

      <AuditScopeDialog
        audit={pendingScope?.audit}
        site={pendingScope?.site}
        language={language}
        onAdd={addPendingSiteToCurrentAudit}
        onNew={startPendingSiteAsNewAudit}
        onCancel={cancelPendingAuditScope}
      />

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
          <button className="primary scan-action" type="button" onClick={() => void runScan()} disabled={busy || decisionPending || tabId == null}>
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
          <SiteAuditLauncher language={language} />
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
        <ScanView
          scan={scan}
          level={explanationLevel}
          language={language}
          onLocate={locateScanTarget}
          onAnalyzePage={runScan}
          onSelectComponent={runComponentScan}
        />
      )}
      {view === 'structure' && (
        <StructureView
          snapshot={structureSnapshot}
          scan={scan}
          language={language}
          busy={busy}
          onRefresh={refreshStructure}
          onLocate={locateScanTarget}
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
          onDeleteInteraction={deleteTraceInteraction}
        />
      )}
      {view === 'report' && (
        <AuditReportWorkspace
          audit={activeAudit}
          scan={scan}
          events={session.events}
          structureSnapshot={structureSnapshot}
          language={language}
          onLocate={locateScanTarget}
        />
      )}
      {view === 'instructions' && <InstructionsView language={language} />}
      {view === 'settings' && <SettingsView language={language} onLanguageChange={updateLanguage} />}
    </main>
  );
}
