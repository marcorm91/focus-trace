import { useCallback, useEffect, useMemo, useState } from 'react';
import { browser } from '#imports';
import { groupRuntimeInteractions, runtimeInteractionTitle } from '../../lib/runtime/causality';
import type {
  ExtensionMessage,
  RuntimeEvent,
  RuntimeInteraction,
  ScanIssue,
  ScanResult,
  SessionState,
  StandardReference,
} from '../../shared/types';

type View = 'scan' | 'focus' | 'runtime' | 'report';
const EMPTY_SESSION: SessionState = { tabId: -1, recording: false, events: [] };

function timeLabel(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
  }).format(timestamp);
}

async function activeTabId() {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (tab?.id == null) throw new Error('No active browser tab is available.');
  return tab.id;
}

export default function App() {
  const [view, setView] = useState<View>('scan');
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

  const toggleRecording = useCallback(async () => {
    if (tabId == null) return;
    setBusy(true);
    setError(undefined);
    try {
      await ensureInjected();
      const enabled = !session.recording;
      if (enabled) {
        await browser.runtime.sendMessage({
          type: 'FOCUSTRACE_CLEAR_SESSION',
          tabId,
        } satisfies ExtensionMessage);
      }
      const startedAt = enabled ? Date.now() : undefined;
      await browser.tabs.sendMessage(tabId, {
        type: 'FOCUSTRACE_SET_RECORDING',
        enabled,
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
  }, [ensureInjected, session.recording, tabId]);

  const focusEvents = useMemo(
    () =>
      session.events.filter((event) =>
        ['focus', 'focus-lost', 'focus-hidden', 'focus-obscured'].includes(event.kind),
      ),
    [session.events],
  );
  const interactions = useMemo(() => groupRuntimeInteractions(session.events), [session.events]);
  const latestFocus = focusEvents.at(-1);
  const runtimeFindings = session.events.filter((event) => event.outcome);
  const serious = runtimeFindings.filter((event) => ['critical', 'serious'].includes(event.severity)).length;
  const runtimeWarnings = runtimeFindings.filter((event) => ['moderate', 'minor'].includes(event.severity)).length;
  const causalFindings = runtimeFindings.filter((event) => event.causes?.length).length;

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">WCAG 2.2 runtime debugger</p>
          <h1>FocusTrace</h1>
        </div>
        <span className={session.recording ? 'status live' : 'status'}>
          <span aria-hidden="true" /> {session.recording ? 'Recording' : 'Idle'}
        </span>
      </header>

      <div className="actions" aria-label="Primary actions">
        <button className="primary" type="button" onClick={toggleRecording} disabled={busy || tabId == null}>
          {session.recording ? 'Stop recording' : 'Record interaction'}
        </button>
        <button type="button" onClick={runScan} disabled={busy || tabId == null}>
          {busy ? 'Working…' : 'Analyze page'}
        </button>
      </div>

      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}

      <nav className="tabs" aria-label="FocusTrace sections">
        {(['scan', 'focus', 'runtime', 'report'] as const).map((item) => (
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

      {view === 'scan' && <ScanView scan={scan} />}
      {view === 'focus' && <FocusView latest={latestFocus} count={focusEvents.length} />}
      {view === 'runtime' && (
        <RuntimeView events={session.events} interactions={interactions} recording={session.recording} />
      )}
      {view === 'report' && (
        <ReportView
          runtimeCount={session.events.length}
          interactionCount={interactions.filter((interaction) => interaction.correlated).length}
          runtimeFindings={runtimeFindings.length}
          causalFindings={causalFindings}
          serious={serious}
          runtimeWarnings={runtimeWarnings}
          scan={scan}
        />
      )}
    </main>
  );
}

function ScanView({ scan }: { scan?: ScanResult | undefined }) {
  if (!scan) {
    return <Empty title="No scan yet" text="Choose Analyze page to run the local FocusTrace WCAG rule engine." />;
  }
  const scanWarnings = scan.warnings ?? [];
  const findings = [...scan.issues, ...scan.review, ...scanWarnings];

  return (
    <section className="panel" aria-labelledby="scan-title">
      <div className="section-heading">
        <div>
          <h2 id="scan-title">Page scan</h2>
          <p title={scan.url}>{scan.title || scan.url}</p>
        </div>
        <strong>
          {scan.issues.length} fail · {scanWarnings.length} warning
        </strong>
      </div>
      <div className="engine-note">
        <strong>{scan.engine}</strong>
        <span>
          {scan.standard} · {scan.rulesRun} rule families
        </span>
      </div>
      <div className="metrics">
        <Metric label="Fail" value={scan.issues.length} />
        <Metric label="Review" value={scan.review.length} />
        <Metric label="Warning" value={scanWarnings.length} />
        <Metric label="Checks passed" value={scan.passes} />
        <Metric label="Rule families" value={scan.rulesRun} />
      </div>
      {findings.length === 0 ? (
        <div className="notice">
          <strong>No automated findings</strong>
          <p>
            This does not mean the page conforms to WCAG 2.2. Criteria that require human judgement still
            need manual testing.
          </p>
        </div>
      ) : (
        <div className="issue-list">
          {findings.slice(0, 40).map((issue) => (
            <FindingCard issue={issue} key={issue.id} />
          ))}
        </div>
      )}
    </section>
  );
}

function FindingCard({ issue }: { issue: ScanIssue }) {
  return (
    <article className="issue">
      <div className="finding-meta">
        <span className={`outcome ${issue.outcome}`}>{issue.outcome}</span>
        <span className={`severity ${issue.severity}`}>{issue.severity}</span>
        <code>{issue.ruleId}</code>
      </div>
      <h3>{issue.title}</h3>
      <p>{issue.description}</p>
      {issue.evidence && (
        <p className="evidence">
          <strong>Evidence:</strong> {issue.evidence}
        </p>
      )}
      <code>{issue.targets[0] ?? 'No target'}</code>
      <ReferenceList references={issue.references} />
    </article>
  );
}

function ReferenceList({ references }: { references?: StandardReference[] | undefined }) {
  if (!references?.length) return null;
  return (
    <ul className="references" aria-label="Standards references">
      {references.map((reference) => (
        <li key={`${reference.type}-${reference.id}`}>
          <a href={reference.url} target="_blank" rel="noreferrer">
            {reference.type} {reference.id}
            {reference.level ? ` · ${reference.level}` : ''}
          </a>
          {(reference.status === 'proposed' || reference.status === 'editor-draft') && (
            <span>{reference.status.replace('-', ' ')}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

function FocusView({ latest, count }: { latest?: RuntimeEvent | undefined; count: number }) {
  if (!latest) {
    return <Empty title="No focus events" text="Start recording and navigate the page with Tab, Shift+Tab and Enter." />;
  }

  return (
    <section className="panel" aria-labelledby="focus-title">
      <div className="section-heading">
        <div>
          <h2 id="focus-title">Focus inspector</h2>
          <p>{count} focus-related events recorded</p>
        </div>
      </div>
      <article className="focus-card">
        <div className="finding-meta">
          {latest.outcome && <span className={`outcome ${latest.outcome}`}>{latest.outcome}</span>}
          <span className={`severity ${latest.severity}`}>{latest.severity}</span>
          {latest.ruleId && <code>{latest.ruleId}</code>}
        </div>
        <h3>{latest.title}</h3>
        {latest.element && (
          <dl>
            <div>
              <dt>Selector</dt>
              <dd>
                <code>{latest.element.selector}</code>
              </dd>
            </div>
            <div>
              <dt>Name</dt>
              <dd>{latest.element.name ?? '—'}</dd>
            </div>
            <div>
              <dt>Role</dt>
              <dd>{latest.element.role ?? latest.element.tag}</dd>
            </div>
          </dl>
        )}
        {latest.detail && <p>{latest.detail}</p>}
        {latest.causes?.map((item) => (
          <p className="cause-line" key={item.type}>
            <strong>Cause:</strong> {item.summary}
          </p>
        ))}
        <ReferenceList references={latest.references} />
      </article>
    </section>
  );
}

function RuntimeView({
  events,
  interactions,
  recording,
}: {
  events: RuntimeEvent[];
  interactions: RuntimeInteraction[];
  recording: boolean;
}) {
  if (events.length === 0) {
    return (
      <section className="panel" aria-labelledby="runtime-title">
        <div className="section-heading">
          <div>
            <h2 id="runtime-title">Runtime timeline</h2>
            <p>{recording ? 'Use the inspected page normally.' : '0 events captured.'}</p>
          </div>
        </div>
        <Empty
          title="Timeline is empty"
          text="Record a user journey to correlate actions, DOM mutations, routes and focus changes."
        />
      </section>
    );
  }

  const indexed = interactions.map((interaction, index) => ({
    interaction,
    number: index + 1,
  }));

  return (
    <section className="panel" aria-labelledby="runtime-title">
      <div className="section-heading">
        <div>
          <h2 id="runtime-title">Runtime causality</h2>
          <p>
            {recording
              ? 'Use the inspected page normally.'
              : `${events.length} events · ${interactions.filter((item) => item.correlated).length} interactions.`}
          </p>
        </div>
      </div>

      <ol className="interaction-list">
        {[...indexed].reverse().map(({ interaction, number }) => (
          <li key={interaction.id} className={interaction.findings ? 'interaction has-finding' : 'interaction'}>
            <details open={interaction.findings > 0}>
              <summary>
                <span>
                  <strong>{interaction.correlated ? `Interaction #${number}` : 'Ambient event'}</strong>
                  <small>{runtimeInteractionTitle(interaction)}</small>
                </span>
                <span className="interaction-summary">
                  <time dateTime={new Date(interaction.startedAt).toISOString()}>
                    {timeLabel(interaction.startedAt)}
                  </time>
                  <small>
                    {interaction.events.length} event{interaction.events.length === 1 ? '' : 's'}
                    {interaction.findings ? ` · ${interaction.findings} finding${interaction.findings === 1 ? '' : 's'}` : ''}
                  </small>
                </span>
              </summary>

              {interaction.causes.length > 0 && (
                <div className="cause-box">
                  <strong>Root cause</strong>
                  {interaction.causes.map((item) => (
                    <p key={`${item.type}-${item.summary}`}>
                      <code>{item.type}</code> {item.summary}
                    </p>
                  ))}
                </div>
              )}

              <ol className="causal-chain">
                {interaction.events.map((event) => (
                  <RuntimeEventRow event={event} key={event.id} />
                ))}
              </ol>
            </details>
          </li>
        ))}
      </ol>
    </section>
  );
}

function RuntimeEventRow({ event }: { event: RuntimeEvent }) {
  return (
    <li className={event.outcome ? 'runtime-finding' : ''}>
      <time dateTime={new Date(event.timestamp).toISOString()}>{timeLabel(event.timestamp)}</time>
      <div>
        <div className="finding-meta">
          {event.outcome && <span className={`outcome ${event.outcome}`}>{event.outcome}</span>}
          <span className={`severity ${event.severity}`}>{event.kind}</span>
          {event.ruleId && <code>{event.ruleId}</code>}
        </div>
        <strong>{event.title}</strong>
        {event.detail && <p>{event.detail}</p>}
        {event.mutation?.attribute && (
          <p className="mutation-values">
            <code>{event.mutation.attribute}</code> {JSON.stringify(event.mutation.previousValue)} →{' '}
            {JSON.stringify(event.mutation.currentValue)}
          </p>
        )}
        {event.element && <code>{event.element.selector}</code>}
        {event.fromUrl && event.toUrl && (
          <p className="route">
            {event.fromUrl} → {event.toUrl}
          </p>
        )}
        <ReferenceList references={event.references} />
      </div>
    </li>
  );
}

function ReportView({
  runtimeCount,
  interactionCount,
  runtimeFindings,
  causalFindings,
  serious,
  runtimeWarnings,
  scan,
}: {
  runtimeCount: number;
  interactionCount: number;
  runtimeFindings: number;
  causalFindings: number;
  serious: number;
  runtimeWarnings: number;
  scan?: ScanResult | undefined;
}) {
  return (
    <section className="panel" aria-labelledby="report-title">
      <div className="section-heading">
        <div>
          <h2 id="report-title">Session report</h2>
          <p>Local summary for the current tab.</p>
        </div>
      </div>
      <div className="metrics">
        <Metric label="Interactions" value={interactionCount} />
        <Metric label="Runtime events" value={runtimeCount} />
        <Metric label="Runtime findings" value={runtimeFindings} />
        <Metric label="Causal findings" value={causalFindings} />
        <Metric label="Serious" value={serious} />
        <Metric label="Runtime warnings" value={runtimeWarnings} />
        <Metric label="Scan failures" value={scan?.issues.length ?? 0} />
        <Metric label="Needs review" value={scan?.review.length ?? 0} />
        <Metric label="Authoring warnings" value={scan?.warnings?.length ?? 0} />
      </div>
      <div className="notice">
        <strong>Evidence-first, not a conformance claim</strong>
        <p>
          FAIL means a FocusTrace automated rule found evidence matching its documented WCAG/ACT expectation.
          REVIEW needs human judgement. WARNING identifies standards-authoring risk such as deprecated or
          prohibited ARIA and is not automatically a WCAG failure. Runtime root causes are deterministic
          correlations from the recorded interaction, not AI-generated explanations.
        </p>
      </div>
      <div className="notice">
        <strong>Privacy first</strong>
        <p>
          FocusTrace analyzes the inspected page locally. No DOM, screenshots or session data are sent to a
          FocusTrace server or AI API.
        </p>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="metric">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function Empty({ title, text }: { title: string; text: string }) {
  return (
    <section className="empty">
      <h2>{title}</h2>
      <p>{text}</p>
    </section>
  );
}
