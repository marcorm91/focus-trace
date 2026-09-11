export type Severity = 'critical' | 'serious' | 'moderate' | 'minor' | 'info';
export type FindingOutcome = 'fail' | 'review' | 'warning';
export type ConformanceLevel = 'A' | 'AA' | 'AAA';

export type RuntimeEventKind =
  | 'focus'
  | 'virtual-focus'
  | 'keydown'
  | 'click'
  | 'input-change'
  | 'dragging'
  | 'contrast-state'
  | 'hover-focus-content'
  | 'route'
  | 'dom-mutation'
  | 'focus-lost'
  | 'focus-hidden'
  | 'focus-obscured'
  | 'dialog-open'
  | 'dialog-close'
  | 'dialog-focus-escape'
  | 'aria-widget'
  | 'live-region'
  | 'status-message'
  | 'context-change'
  | 'focus-walk-start'
  | 'focus-walk-end';

export type RuntimeMutationKind = 'node-added' | 'node-removed' | 'attribute-changed';
export type RuntimeInputEventType = 'input' | 'change';
export type RuntimeContextChangeTriggerKind = 'focus' | 'input';
export type RuntimeContextChangeKind = 'focus-move' | 'route' | 'dialog-open';

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
export type RuntimeInjectionMode = 'scan' | 'trace';

export interface StandardReference {
  type: 'HTML' | 'WCAG' | 'ACT' | 'WAI-ARIA' | 'WAI-ARIA APG';
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
  className?: string;
  selector: string;
  tabOrderIndex?: number;
  tabOrderSize?: number;
  attributes?: ElementAttributesSnapshot;
}

export interface RuntimeMutationSnapshot {
  kind: RuntimeMutationKind;
  target: ElementSnapshot;
  attribute?: string;
  previousValue?: string | null;
  currentValue?: string | null;
}

export interface RuntimeContextChangeEvidence {
  triggerKind: RuntimeContextChangeTriggerKind;
  changeKind: RuntimeContextChangeKind;
  inputEventType?: RuntimeInputEventType;
  destination?: ElementSnapshot;
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

export interface AuditorNote {
  text: string;
  updatedAt: number;
}

export interface RuntimeEvent {
  id: string;
  timestamp: number;
  kind: RuntimeEventKind;
  severity: Severity;
  title: string;
  interactionId?: string;
  focusIntent?: 'forward' | 'backward' | 'programmatic';
  detail?: string;
  element?: ElementSnapshot;
  mutation?: RuntimeMutationSnapshot;
  causes?: RuntimeCause[];
  breakpointHits?: RuntimeBreakpointHit[];
  fromUrl?: string;
  toUrl?: string;
  inputEventType?: RuntimeInputEventType;
  contextChange?: RuntimeContextChangeEvidence;
  outcome?: FindingOutcome;
  ruleId?: string;
  references?: StandardReference[];
  focusWalk?: FocusWalkResult;
  auditorNote?: AuditorNote;
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

export interface ContrastEvidence {
  kind?: 'text' | 'ui-boundary' | 'graphic' | 'focus-indicator';
  subject?: string;
  ratio?: number;
  requiredRatio: number;
  foreground?: string;
  background?: string;
  fontSizePx?: number;
  fontWeight?: number;
  largeText?: boolean;
  reason?: string;
}

export interface ContrastStateReviewEvidence {
  state: string;
  kind: 'text' | 'non-text';
  selector: string;
  properties: string[];
  candidateCount: number;
}

export interface ReflowEvidence {
  kind: 'document-overflow' | 'clipped-content';
  axis: 'horizontal' | 'vertical';
  writingMode: string;
  viewportWidth: number;
  viewportHeight: number;
  scrollWidth: number;
  scrollHeight: number;
  overflowPixels?: number;
  clippedBy?: string;
  clippedPixels?: number;
  clipping?: 'partial' | 'complete';
}

export interface UseOfColorEvidence {
  kind: 'inline-link';
  contextSelector: string;
  surroundingTextSelector: string;
  linkColor: string;
  surroundingTextColor: string;
  contrastRatio: number;
  requiredRatio: 3;
  persistentVisualCue: 'none-observed';
}

export interface PauseStopHideEvidence {
  kind: 'moving-or-blinking' | 'moving-or-scrolling';
  source: 'web-animation' | 'marquee' | 'autoplay-video';
  automaticStart: 'observed' | 'declared' | 'unknown';
  parallelContent: 'observed';
  durationMs: number | null;
  thresholdMs: 5000;
  repeatsIndefinitely: boolean;
  animatedProperties: string[];
  animationNames: string[];
  controlMechanism: 'candidate-observed' | 'none-observed';
  controlSelectors: string[];
}

export type LinkPurposeContextSource =
  | 'aria-describedby'
  | 'sentence'
  | 'paragraph'
  | 'list-item'
  | 'parent-list-item'
  | 'table-cell'
  | 'table-header'
  | 'block-container';

export interface LinkPurposeContextSnippet {
  source: LinkPurposeContextSource;
  selector: string;
  text: string;
}

export interface LinkPurposeContextEvidence {
  kind: 'ambiguous-link-purpose';
  accessibleName: string;
  matchedPhrase: string;
  contexts: LinkPurposeContextSnippet[];
  contextTextObserved: boolean;
}

export interface ScanIssue {
  id: string;
  ruleId: string;
  title: string;
  description: string;
  severity: Severity;
  outcome: FindingOutcome;
  targets: string[];
  element?: ElementSnapshot;
  context?: ElementSnapshot;
  evidence?: string;
  accessibleName?: AccessibleNameEvidence;
  contrast?: ContrastEvidence;
  contrastState?: ContrastStateReviewEvidence;
  reflow?: ReflowEvidence;
  useOfColor?: UseOfColorEvidence;
  pauseStopHide?: PauseStopHideEvidence;
  linkPurposeContext?: LinkPurposeContextEvidence;
  references: StandardReference[];
  auditorNote?: AuditorNote;
}

export type HeadingSignal = 'empty' | 'level-jump' | 'multiple-h1';

export interface HeadingSnapshot {
  id: string;
  level: 1 | 2 | 3 | 4 | 5 | 6;
  text: string;
  selector: string;
  signals: HeadingSignal[];
}

export interface PageScanScope {
  type: 'page';
}

export interface ComponentScanScope {
  type: 'component';
  selector: string;
  tag: string;
  role?: string;
  label?: string;
}

export type ScanScope = PageScanScope | ComponentScanScope;

export interface ScanRuleResult {
  ruleId: string;
  applicable: number;
  passed: number;
  failures: number;
  reviews: number;
  warnings: number;
  coverage?: 'complete' | 'findings-only';
}

export interface ScanResult {
  engine: 'FocusTrace Rules';
  standard: 'WCAG 2.2';
  url: string;
  title: string;
  scannedAt: number;
  scope?: ScanScope;
  issues: ScanIssue[];
  review: ScanIssue[];
  warnings: ScanIssue[];
  headings?: HeadingSnapshot[];
  ruleResults?: ScanRuleResult[];
  passes: number;
  rulesRun: number;
}

export interface FocusMemoryCapturedEvidence {
  issueIndex: number;
  locator: string;
  dataUrl?: string;
  capturedAt?: number;
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

export interface SaveScanResponse {
  state: SessionState;
  warning?: 'focus-memory-write-failed';
}

export type AuditorNoteTarget =
  | { kind: 'scan-finding'; findingId: string }
  | { kind: 'runtime-event'; eventId: string };

export type AuditorNotePersistenceWarning =
  | 'focus-memory-write-failed'
  | 'multipage-audit-write-failed';

export interface SaveAuditorNoteResponse {
  state: SessionState;
  warnings?: AuditorNotePersistenceWarning[];
}

export type ExtensionMessage =
  | { type: 'FOCUSTRACE_EVENT'; event: RuntimeEvent }
  | { type: 'FOCUSTRACE_EVENTS'; events: RuntimeEvent[] }
  | { type: 'FOCUSTRACE_GET_CONTENT_STATE' }
  | { type: 'FOCUSTRACE_GET_SESSION'; tabId: number }
  | { type: 'FOCUSTRACE_FLUSH_SESSION'; tabId: number }
  | { type: 'FOCUSTRACE_FLUSH_CONTENT_EVENTS' }
  | { type: 'FOCUSTRACE_CLEAR_SESSION'; tabId: number }
  | { type: 'FOCUSTRACE_DELETE_INTERACTION'; tabId: number; interactionId: string }
  | { type: 'FOCUSTRACE_SAVE_AUDITOR_NOTE'; tabId: number; target: AuditorNoteTarget; text: string }
  | { type: 'FOCUSTRACE_RESET_TAB'; tabId: number }
  | { type: 'FOCUSTRACE_ENSURE_INJECTED'; tabId: number; mode: RuntimeInjectionMode }
  | { type: 'FOCUSTRACE_SESSION_UPDATED'; state: SessionState }
  | { type: 'FOCUSTRACE_SET_RECORDING'; enabled: boolean; breakpoints?: RuntimeBreakpointSettings }
  | { type: 'FOCUSTRACE_SET_RECORDING_STATE'; tabId: number; enabled: boolean; startedAt?: number }
  | { type: 'FOCUSTRACE_CONFIGURE_BREAKPOINTS'; breakpoints: RuntimeBreakpointSettings }
  | { type: 'FOCUSTRACE_SAVE_BREAKPOINTS'; tabId: number; breakpoints: RuntimeBreakpointSettings }
  | { type: 'FOCUSTRACE_RUN_SCAN'; scope?: ComponentScanScope }
  | { type: 'FOCUSTRACE_RUN_FOCUS_WALK'; options?: FocusWalkOptions }
  | { type: 'FOCUSTRACE_SAVE_SCAN'; tabId: number; scan: ScanResult; memoryEvidence?: FocusMemoryCapturedEvidence[] };
