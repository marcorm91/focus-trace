export type Severity = 'critical' | 'serious' | 'moderate' | 'minor' | 'info';
export type FindingOutcome = 'fail' | 'review' | 'warning';
export type ConformanceLevel = 'A' | 'AA' | 'AAA';

export type RuntimeEventKind =
  | 'focus'
  | 'keydown'
  | 'click'
  | 'route'
  | 'dom-mutation'
  | 'focus-lost'
  | 'focus-hidden'
  | 'focus-obscured'
  | 'dialog-open'
  | 'dialog-close'
  | 'dialog-focus-escape'
  | 'live-region'
  | 'focus-walk-start'
  | 'focus-walk-end';

export type RuntimeMutationKind = 'node-added' | 'node-removed' | 'attribute-changed';

export type RuntimeCauseType =
  | 'FOCUSED_NODE_REMOVED'
  | 'FOCUS_FELL_BACK_TO_BODY'
  | 'DIALOG_OPENED_WITHOUT_FOCUS'
  | 'MODAL_FOCUS_ESCAPE'
  | 'ROUTE_CHANGED_WITHOUT_FOCUS_MOVE'
  | 'FOCUSED_ELEMENT_BECAME_HIDDEN';

export type RuntimeBreakpointId =
  | 'focused-node-removed'
  | 'focus-fell-back-to-body'
  | 'dialog-opened-without-focus'
  | 'modal-focus-escape'
  | 'route-changed-without-focus-move'
  | 'focused-element-became-hidden';

export type RuntimeBreakpointSettings = Record<RuntimeBreakpointId, boolean>;

export interface StandardReference {
  type: 'WCAG' | 'ACT' | 'WAI-ARIA' | 'WAI-ARIA APG';
  id: string;
  label: string;
  url: string;
  level?: ConformanceLevel;
  status?: 'normative' | 'informative' | 'proposed' | 'editor-draft';
}

export interface ElementAttributesSnapshot {
  ariaLabel?: string;
  ariaLabelledby?: string;
  ariaDescribedby?: string;
  tabIndex?: number;
  href?: string;
  type?: string;
  disabled?: boolean;
}

export interface ElementSnapshot {
  tag: string;
  id?: string;
  role?: string;
  name?: string;
  selector: string;
  attributes?: ElementAttributesSnapshot;
}

export interface RuntimeMutationSnapshot {
  kind: RuntimeMutationKind;
  target: ElementSnapshot;
  attribute?: string;
  previousValue?: string | null;
  currentValue?: string | null;
}

export interface RuntimeCause {
  type: RuntimeCauseType;
  confidence: 'deterministic';
  summary: string;
}

export interface RuntimeBreakpointHit {
  breakpointId: RuntimeBreakpointId;
  causeType: RuntimeCauseType;
  eventId: string;
  timestamp: number;
  label: string;
  summary: string;
  interactionId?: string;
}

export interface RuntimeEvent {
  id: string;
  timestamp: number;
  kind: RuntimeEventKind;
  severity: Severity;
  title: string;
  interactionId?: string;
  detail?: string;
  element?: ElementSnapshot;
  mutation?: RuntimeMutationSnapshot;
  causes?: RuntimeCause[];
  breakpointHits?: RuntimeBreakpointHit[];
  fromUrl?: string;
  toUrl?: string;
  outcome?: FindingOutcome;
  ruleId?: string;
  references?: StandardReference[];
  focusWalk?: FocusWalkResult;
}

export interface RuntimeInteraction {
  id: string;
  correlated: boolean;
  startedAt: number;
  endedAt: number;
  trigger?: RuntimeEvent;
  events: RuntimeEvent[];
  findings: number;
  causes: RuntimeCause[];
  breakpointHits: RuntimeBreakpointHit[];
}

export interface AccessibleNameCandidateEvidence {
  source: string;
  selector: string;
  value: string;
  used: boolean;
}

export interface AccessibleNameEvidence {
  name: string;
  source: string;
  role: string | null;
  candidates: AccessibleNameCandidateEvidence[];
}

export interface ScanIssue {
  id: string;
  ruleId: string;
  title: string;
  description: string;
  severity: Severity;
  outcome: FindingOutcome;
  targets: string[];
  evidence?: string;
  accessibleName?: AccessibleNameEvidence;
  references: StandardReference[];
}

export interface ScanResult {
  engine: 'FocusTrace Rules';
  standard: 'WCAG 2.2';
  url: string;
  title: string;
  scannedAt: number;
  issues: ScanIssue[];
  review: ScanIssue[];
  warnings: ScanIssue[];
  passes: number;
  rulesRun: number;
}

export interface FocusWalkOptions {
  delayMs?: number;
  maxSteps?: number;
}

export interface FocusWalkResult {
  totalCandidates: number;
  focusedSteps: number;
  skipped: number;
  stopped: boolean;
}

export interface SessionState {
  tabId: number;
  recording: boolean;
  startedAt?: number;
  events: RuntimeEvent[];
  breakpoints?: RuntimeBreakpointSettings;
  pausedByBreakpoint?: RuntimeBreakpointHit;
  scan?: ScanResult;
}

export type ExtensionMessage =
  | { type: 'FOCUSTRACE_EVENT'; event: RuntimeEvent }
  | { type: 'FOCUSTRACE_GET_CONTENT_STATE' }
  | { type: 'FOCUSTRACE_GET_SESSION'; tabId: number }
  | { type: 'FOCUSTRACE_CLEAR_SESSION'; tabId: number }
  | { type: 'FOCUSTRACE_ENSURE_INJECTED'; tabId: number }
  | { type: 'FOCUSTRACE_SESSION_UPDATED'; state: SessionState }
  | { type: 'FOCUSTRACE_SET_RECORDING'; enabled: boolean; breakpoints?: RuntimeBreakpointSettings }
  | { type: 'FOCUSTRACE_SET_RECORDING_STATE'; tabId: number; enabled: boolean; startedAt?: number }
  | { type: 'FOCUSTRACE_CONFIGURE_BREAKPOINTS'; breakpoints: RuntimeBreakpointSettings }
  | { type: 'FOCUSTRACE_SAVE_BREAKPOINTS'; tabId: number; breakpoints: RuntimeBreakpointSettings }
  | { type: 'FOCUSTRACE_RUN_SCAN' }
  | { type: 'FOCUSTRACE_RUN_FOCUS_WALK'; options?: FocusWalkOptions }
  | { type: 'FOCUSTRACE_SAVE_SCAN'; tabId: number; scan: ScanResult };
