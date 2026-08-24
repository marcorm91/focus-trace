export type Severity = 'critical' | 'serious' | 'moderate' | 'minor' | 'info';
export type FindingOutcome = 'fail' | 'review' | 'warning';
export type ConformanceLevel = 'A' | 'AA' | 'AAA';

export type RuntimeEventKind =
  | 'focus'
  | 'keydown'
  | 'click'
  | 'route'
  | 'focus-lost'
  | 'focus-obscured'
  | 'dialog-open'
  | 'dialog-close'
  | 'dialog-focus-escape'
  | 'live-region';

export interface StandardReference {
  type: 'WCAG' | 'ACT' | 'WAI-ARIA' | 'WAI-ARIA APG';
  id: string;
  label: string;
  url: string;
  level?: ConformanceLevel;
  status?: 'normative' | 'informative' | 'proposed' | 'editor-draft';
}

export interface ElementSnapshot {
  tag: string;
  id?: string;
  role?: string;
  name?: string;
  selector: string;
}

export interface RuntimeEvent {
  id: string;
  timestamp: number;
  kind: RuntimeEventKind;
  severity: Severity;
  title: string;
  detail?: string;
  element?: ElementSnapshot;
  fromUrl?: string;
  toUrl?: string;
  outcome?: FindingOutcome;
  ruleId?: string;
  references?: StandardReference[];
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

export interface SessionState {
  tabId: number;
  recording: boolean;
  startedAt?: number;
  events: RuntimeEvent[];
  scan?: ScanResult;
}

export type ExtensionMessage =
  | { type: 'FOCUSTRACE_EVENT'; event: RuntimeEvent }
  | { type: 'FOCUSTRACE_GET_SESSION'; tabId: number }
  | { type: 'FOCUSTRACE_CLEAR_SESSION'; tabId: number }
  | { type: 'FOCUSTRACE_ENSURE_INJECTED'; tabId: number }
  | { type: 'FOCUSTRACE_SESSION_UPDATED'; state: SessionState }
  | { type: 'FOCUSTRACE_SET_RECORDING'; enabled: boolean }
  | { type: 'FOCUSTRACE_SET_RECORDING_STATE'; tabId: number; enabled: boolean; startedAt?: number }
  | { type: 'FOCUSTRACE_RUN_SCAN' }
  | { type: 'FOCUSTRACE_SAVE_SCAN'; tabId: number; scan: ScanResult };
