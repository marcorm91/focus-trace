import { outcomeLabel, type ExplanationLevel } from '../../../lib/runtime/explanations';
import type { ScanIssue, ScanResult } from '../../../shared/types';
import { Empty, Metric, ReferenceList } from '../components/Common';

export function ScanView({ scan, level }: { scan?: ScanResult | undefined; level: ExplanationLevel }) {
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
        <strong>{scan.issues.length} fail · {scanWarnings.length} warning</strong>
      </div>

      {level !== 'simple' && (
        <div className="engine-note">
          <strong>{scan.engine}</strong>
          <span>{scan.standard} · {scan.rulesRun} rule families</span>
        </div>
      )}

      <div className="metrics">
        <Metric label="Fail" value={scan.issues.length} />
        <Metric label="Review" value={scan.review.length} />
        <Metric label="Warning" value={scanWarnings.length} />
        <Metric label="Checks passed" value={scan.passes} />
      </div>

      {findings.length === 0 ? (
        <div className="notice">
          <strong>No automated findings</strong>
          <p>This does not mean the page conforms to WCAG 2.2. Manual testing is still needed.</p>
        </div>
      ) : (
        <div className="issue-list">
          {findings.slice(0, 40).map((issue) => <FindingCard issue={issue} level={level} key={issue.id} />)}
        </div>
      )}
    </section>
  );
}

function FindingCard({ issue, level }: { issue: ScanIssue; level: ExplanationLevel }) {
  return (
    <article className="issue">
      <div className="finding-meta">
        <span className={`outcome ${issue.outcome}`}>{outcomeLabel(issue.outcome, level)}</span>
        {level !== 'simple' && <span className={`severity ${issue.severity}`}>{issue.severity}</span>}
        {level !== 'simple' && <code>{issue.ruleId}</code>}
      </div>
      <h3>{issue.title}</h3>
      <p>{issue.description}</p>
      {level !== 'simple' && issue.evidence && (
        <p className="evidence"><strong>Evidence:</strong> {issue.evidence}</p>
      )}
      {level === 'developer' && <code>{issue.targets[0] ?? 'No target'}</code>}
      {level !== 'simple' && <ReferenceList references={issue.references} />}
    </article>
  );
}
