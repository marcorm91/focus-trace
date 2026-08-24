import {
  explanationForCause,
  humanRuntimeEventTitle,
  outcomeLabel,
  type ExplanationLevel,
} from '../../../lib/runtime/explanations';
import type { RuntimeEvent } from '../../../shared/types';
import { Empty, ReferenceList } from '../components/Common';

export function FocusView({
  latest,
  count,
  level,
}: {
  latest?: RuntimeEvent | undefined;
  count: number;
  level: ExplanationLevel;
}) {
  if (!latest) {
    return <Empty title="No focus events" text="Start recording and navigate the page with Tab, Shift+Tab and Enter." />;
  }

  const primaryCause = latest.causes?.[0];
  const explanation = primaryCause ? explanationForCause(primaryCause.type) : undefined;

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
          {latest.outcome && <span className={`outcome ${latest.outcome}`}>{outcomeLabel(latest.outcome, level)}</span>}
          {level !== 'simple' && <span className={`severity ${latest.severity}`}>{latest.severity}</span>}
          {level !== 'simple' && latest.ruleId && <code>{latest.ruleId}</code>}
        </div>

        <h3>{explanation?.title ?? humanRuntimeEventTitle(latest)}</h3>
        {explanation ? (
          <div className="human-explanation">
            <p>{explanation.summary}</p>
            <p><strong>Impact:</strong> {explanation.impact}</p>
            <p><strong>What to review:</strong> {explanation.recommendation}</p>
            {level !== 'simple' && <p><strong>Accessibility:</strong> {explanation.accessibility}</p>}
          </div>
        ) : latest.detail ? <p>{latest.detail}</p> : null}

        {latest.element && (
          <dl>
            <div><dt>Name</dt><dd>{latest.element.name ?? '—'}</dd></div>
            <div><dt>Role</dt><dd>{latest.element.role ?? latest.element.tag}</dd></div>
            {level === 'developer' && <div><dt>Selector</dt><dd><code>{latest.element.selector}</code></dd></div>}
          </dl>
        )}

        {level === 'developer' && latest.causes?.map((item) => (
          <p className="cause-line" key={item.type}><strong>{item.type}:</strong> {item.summary}</p>
        ))}
        {level !== 'simple' && <ReferenceList references={latest.references} />}
      </article>
    </section>
  );
}
