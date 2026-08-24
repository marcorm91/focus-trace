import type { ExplanationLevel } from '../../../lib/runtime/explanations';
import type { ScanResult } from '../../../shared/types';
import { Metric } from '../components/Common';

export function ReportView({
  runtimeCount,
  interactionCount,
  runtimeFindings,
  causalFindings,
  breakpointHits,
  focusPoints,
  graphSignals,
  serious,
  runtimeWarnings,
  scan,
  level,
}: {
  runtimeCount: number;
  interactionCount: number;
  runtimeFindings: number;
  causalFindings: number;
  breakpointHits: number;
  focusPoints: number;
  graphSignals: number;
  serious: number;
  runtimeWarnings: number;
  scan?: ScanResult | undefined;
  level: ExplanationLevel;
}) {
  return (
    <section className="panel" aria-labelledby="report-title">
      <div className="section-heading">
        <div><h2 id="report-title">Session report</h2><p>Local summary for the current tab.</p></div>
      </div>
      <div className="metrics">
        <Metric label="Interactions" value={interactionCount} />
        <Metric label="Focus points" value={focusPoints} />
        <Metric label="Runtime findings" value={runtimeFindings} />
        <Metric label="Focus graph signals" value={graphSignals} />
        <Metric label="Breakpoint hits" value={breakpointHits} />
        {level === 'developer' && <Metric label="Runtime events" value={runtimeCount} />}
        {level !== 'simple' && <Metric label="Causal findings" value={causalFindings} />}
        {level !== 'simple' && <Metric label="Serious" value={serious} />}
        {level !== 'simple' && <Metric label="Runtime warnings" value={runtimeWarnings} />}
        <Metric label="Scan failures" value={scan?.issues.length ?? 0} />
        <Metric label="Needs review" value={scan?.review.length ?? 0} />
        <Metric label="Authoring warnings" value={scan?.warnings?.length ?? 0} />
      </div>
      <div className="notice">
        <strong>Evidence first</strong>
        <p>
          FocusTrace separates automated failures, items that need human review, standards warnings and runtime observations. Passing automated checks never proves full WCAG conformance.
        </p>
      </div>
      <div className="notice">
        <strong>Privacy first</strong>
        <p>FocusTrace analyzes the inspected page locally. No DOM, screenshots or session data are sent to a FocusTrace server or AI API.</p>
      </div>
    </section>
  );
}
