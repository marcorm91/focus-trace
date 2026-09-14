export type GuidedLocalizedText = {
  en: string;
  es: string;
};

export type GuidedManualAnswer =
  | 'acknowledged'
  | 'pass'
  | 'issue'
  | 'not-applicable'
  | 'uncertain';

export type GuidedOutcome =
  | 'guided-pass'
  | 'guided-issue'
  | 'guided-review'
  | 'not-applicable';

export type GuidedSessionStatus = 'active' | 'paused' | 'completed' | 'cancelled';

export interface GuidedStandardReference {
  type: 'WCAG' | 'ACT' | 'WAI-ARIA' | 'WAI-ARIA APG' | 'HTML';
  id: string;
  label: string;
  url: string;
  level?: 'A' | 'AA' | 'AAA';
}

export interface GuidedTestStepDefinition {
  id: string;
  title: GuidedLocalizedText;
  prompt: GuidedLocalizedText;
  answers: GuidedManualAnswer[];
}

export interface GuidedTestDefinition {
  id: string;
  title: GuidedLocalizedText;
  description: GuidedLocalizedText;
  references: GuidedStandardReference[];
  steps: GuidedTestStepDefinition[];
  coverage: 'guided-manual';
}

export interface GuidedEvidence {
  kind: 'page-context' | 'manual-answer' | 'manual-note';
  label: string;
  value: string;
  capturedAt: number;
}

export interface GuidedStepState {
  stepId: string;
  answer?: GuidedManualAnswer;
  answeredAt?: number;
  evidence: GuidedEvidence[];
}

export interface GuidedTestSession {
  version: 1;
  id: string;
  testId: string;
  pageUrl: string;
  pageTitle: string;
  startedAt: number;
  updatedAt: number;
  status: GuidedSessionStatus;
  currentStepIndex: number;
  steps: GuidedStepState[];
  outcome?: GuidedOutcome;
  completedAt?: number;
}

export const GUIDED_MAX_STEPS = 20;
export const GUIDED_MAX_EVIDENCE_PER_STEP = 4;
export const GUIDED_MAX_NOTE_LENGTH = 240;
const GUIDED_MAX_PAGE_URL_LENGTH = 500;
const GUIDED_MAX_PAGE_TITLE_LENGTH = 160;
const GUIDED_MAX_IDENTIFIER_LENGTH = 120;
const GUIDED_MAX_EVIDENCE_LABEL_LENGTH = 80;
const GUIDED_MAX_EVIDENCE_VALUE_LENGTH = 500;

const MANUAL_ANSWERS: GuidedManualAnswer[] = [
  'acknowledged',
  'pass',
  'issue',
  'not-applicable',
  'uncertain',
];
const SESSION_STATUSES: GuidedSessionStatus[] = ['active', 'paused', 'completed', 'cancelled'];
const GUIDED_OUTCOMES: GuidedOutcome[] = [
  'guided-pass',
  'guided-issue',
  'guided-review',
  'not-applicable',
];
const EVIDENCE_KINDS: GuidedEvidence['kind'][] = ['page-context', 'manual-answer', 'manual-note'];

const SENSITIVE_ASSIGNMENT = /\b(password|passwd|pwd|token|secret|api[_-]?key|authorization|cookie|session|value)\s*[:=]\s*([^\s,;]+)/gi;
const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const LONG_NUMBER = /\b(?:\d[ -]?){12,19}\b/g;

function cleanControlCharacters(value: string): string {
  return Array.from(value, (character) => {
    const code = character.charCodeAt(0);
    return code <= 8 || code === 11 || code === 12 || (code >= 14 && code <= 31) || code === 127
      ? ' '
      : character;
  }).join('');
}

export function redactGuidedText(value: string, limit = GUIDED_MAX_NOTE_LENGTH): string {
  return cleanControlCharacters(value)
    .replace(SENSITIVE_ASSIGNMENT, '$1=[redacted]')
    .replace(EMAIL, '[redacted-email]')
    .replace(LONG_NUMBER, '[redacted-number]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, limit);
}

export function normalizeGuidedPageUrl(value: string): string {
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`.slice(0, GUIDED_MAX_PAGE_URL_LENGTH);
  } catch {
    return value.split(/[?#]/, 1)[0]?.slice(0, GUIDED_MAX_PAGE_URL_LENGTH) ?? '';
  }
}

function boundedEvidence(evidence: GuidedEvidence[]): GuidedEvidence[] {
  return evidence
    .slice(-GUIDED_MAX_EVIDENCE_PER_STEP)
    .map((item) => ({
      ...item,
      label: redactGuidedText(item.label, GUIDED_MAX_EVIDENCE_LABEL_LENGTH),
      value: redactGuidedText(item.value),
    }));
}

function sessionId(testId: string, startedAt: number): string {
  return `${testId}:${startedAt.toString(36)}`;
}

export function startGuidedTest(
  definition: GuidedTestDefinition,
  page: { url: string; title?: string },
  now = Date.now(),
): GuidedTestSession {
  const steps = definition.steps.slice(0, GUIDED_MAX_STEPS);
  return {
    version: 1,
    id: sessionId(definition.id, now),
    testId: definition.id,
    pageUrl: normalizeGuidedPageUrl(page.url),
    pageTitle: redactGuidedText(page.title ?? '', GUIDED_MAX_PAGE_TITLE_LENGTH),
    startedAt: now,
    updatedAt: now,
    status: 'active',
    currentStepIndex: 0,
    steps: steps.map((step, index) => ({
      stepId: step.id,
      evidence: index === 0 ? [{
        kind: 'page-context',
        label: 'Page',
        value: normalizeGuidedPageUrl(page.url),
        capturedAt: now,
      }] : [],
    })),
  };
}

function deriveOutcome(steps: GuidedStepState[]): GuidedOutcome {
  const answers = steps.map((step) => step.answer).filter(Boolean) as GuidedManualAnswer[];
  if (answers.includes('issue')) return 'guided-issue';
  if (answers.includes('uncertain')) return 'guided-review';
  const substantive = answers.filter((answer) => answer !== 'acknowledged');
  if (substantive.length > 0 && substantive.every((answer) => answer === 'not-applicable')) {
    return 'not-applicable';
  }
  return 'guided-pass';
}

export function answerGuidedStep(
  session: GuidedTestSession,
  definition: GuidedTestDefinition,
  answer: GuidedManualAnswer,
  note = '',
  now = Date.now(),
): GuidedTestSession {
  if (session.status !== 'active') return session;
  const step = definition.steps[session.currentStepIndex];
  if (!step || !step.answers.includes(answer)) return session;

  const steps = session.steps.map((item, index) => {
    if (index !== session.currentStepIndex) return item;
    const evidence: GuidedEvidence[] = [
      ...item.evidence,
      {
        kind: 'manual-answer',
        label: 'Manual answer',
        value: answer,
        capturedAt: now,
      },
    ];
    const redactedNote = redactGuidedText(note);
    if (redactedNote) {
      evidence.push({
        kind: 'manual-note',
        label: 'Auditor note',
        value: redactedNote,
        capturedAt: now,
      });
    }
    return {
      ...item,
      answer,
      answeredAt: now,
      evidence: boundedEvidence(evidence),
    };
  });

  const lastStep = session.currentStepIndex >= Math.min(definition.steps.length, GUIDED_MAX_STEPS) - 1;
  return {
    ...session,
    steps,
    updatedAt: now,
    currentStepIndex: lastStep ? session.currentStepIndex : session.currentStepIndex + 1,
    ...(lastStep ? {
      status: 'completed' as const,
      completedAt: now,
      outcome: deriveOutcome(steps),
    } : {}),
  };
}

export function pauseGuidedTest(session: GuidedTestSession, now = Date.now()): GuidedTestSession {
  return session.status === 'active'
    ? { ...session, status: 'paused', updatedAt: now }
    : session;
}

export function resumeGuidedTest(session: GuidedTestSession, now = Date.now()): GuidedTestSession {
  return session.status === 'paused'
    ? { ...session, status: 'active', updatedAt: now }
    : session;
}

export function cancelGuidedTest(session: GuidedTestSession, now = Date.now()): GuidedTestSession {
  if (session.status === 'completed' || session.status === 'cancelled') return session;
  return { ...session, status: 'cancelled', updatedAt: now };
}

export function restartGuidedTest(
  definition: GuidedTestDefinition,
  session: GuidedTestSession,
  now = Date.now(),
): GuidedTestSession {
  return startGuidedTest(definition, { url: session.pageUrl, title: session.pageTitle }, now);
}

function isFiniteTimestamp(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isBoundedString(value: unknown, maxLength: number, allowEmpty = true): value is string {
  return typeof value === 'string'
    && value.length <= maxLength
    && (allowEmpty || value.length > 0);
}

function isGuidedAnswer(value: unknown): value is GuidedManualAnswer {
  return typeof value === 'string' && MANUAL_ANSWERS.includes(value as GuidedManualAnswer);
}

function isGuidedEvidence(value: unknown): value is GuidedEvidence {
  if (!value || typeof value !== 'object') return false;
  const evidence = value as Partial<GuidedEvidence>;
  return typeof evidence.kind === 'string'
    && EVIDENCE_KINDS.includes(evidence.kind as GuidedEvidence['kind'])
    && isBoundedString(evidence.label, GUIDED_MAX_EVIDENCE_LABEL_LENGTH)
    && isBoundedString(evidence.value, GUIDED_MAX_EVIDENCE_VALUE_LENGTH)
    && isFiniteTimestamp(evidence.capturedAt);
}

function isGuidedStepState(value: unknown): value is GuidedStepState {
  if (!value || typeof value !== 'object') return false;
  const step = value as Partial<GuidedStepState>;
  return isBoundedString(step.stepId, GUIDED_MAX_IDENTIFIER_LENGTH, false)
    && (step.answer == null || isGuidedAnswer(step.answer))
    && (step.answeredAt == null || isFiniteTimestamp(step.answeredAt))
    && Array.isArray(step.evidence)
    && step.evidence.length <= GUIDED_MAX_EVIDENCE_PER_STEP
    && step.evidence.every(isGuidedEvidence);
}

export function isRecoverableGuidedSession(value: unknown): value is GuidedTestSession {
  if (!value || typeof value !== 'object') return false;
  const session = value as Partial<GuidedTestSession>;
  if (session.version !== 1
    || !isBoundedString(session.id, GUIDED_MAX_IDENTIFIER_LENGTH, false)
    || !isBoundedString(session.testId, GUIDED_MAX_IDENTIFIER_LENGTH, false)
    || !isBoundedString(session.pageUrl, GUIDED_MAX_PAGE_URL_LENGTH, false)
    || !isBoundedString(session.pageTitle, GUIDED_MAX_PAGE_TITLE_LENGTH)
    || !isFiniteTimestamp(session.startedAt)
    || !isFiniteTimestamp(session.updatedAt)
    || typeof session.status !== 'string'
    || !SESSION_STATUSES.includes(session.status as GuidedSessionStatus)
    || !Number.isInteger(session.currentStepIndex)
    || !Array.isArray(session.steps)
    || session.steps.length === 0
    || session.steps.length > GUIDED_MAX_STEPS
    || session.steps.some((step) => !isGuidedStepState(step))
    || (session.currentStepIndex as number) < 0
    || (session.currentStepIndex as number) >= session.steps.length) {
    return false;
  }

  if (session.status === 'completed') {
    return typeof session.outcome === 'string'
      && GUIDED_OUTCOMES.includes(session.outcome as GuidedOutcome)
      && isFiniteTimestamp(session.completedAt);
  }

  return session.outcome == null && session.completedAt == null;
}
