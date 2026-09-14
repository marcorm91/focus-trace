import { describe, expect, it } from 'vitest';
import { SAMPLE_GUIDED_TEST } from '../lib/guided-tests/catalog';
import {
  answerGuidedStep,
  cancelGuidedTest,
  isRecoverableGuidedSession,
  pauseGuidedTest,
  redactGuidedText,
  restartGuidedTest,
  resumeGuidedTest,
  startGuidedTest,
} from '../lib/guided-tests/framework';
import { boundGuidedSessions, GUIDED_MAX_STORED_SESSIONS } from '../lib/guided-tests/storage';

describe('guided accessibility-test framework', () => {
  it('runs the sample workflow to a manual outcome without creating an automated result', () => {
    const started = startGuidedTest(
      SAMPLE_GUIDED_TEST,
      { url: 'https://example.test/page?secret=1#target', title: 'Example page' },
      100,
    );

    expect(started.status).toBe('active');
    expect(started.pageUrl).toBe('https://example.test/page');
    expect(started.currentStepIndex).toBe(0);

    const reviewed = answerGuidedStep(started, SAMPLE_GUIDED_TEST, 'acknowledged', '', 110);
    expect(reviewed.status).toBe('active');
    expect(reviewed.currentStepIndex).toBe(1);

    const completed = answerGuidedStep(
      reviewed,
      SAMPLE_GUIDED_TEST,
      'issue',
      'The green button on the right is the only identifier.',
      120,
    );
    expect(completed.status).toBe('completed');
    expect(completed.outcome).toBe('guided-issue');
    expect(completed.completedAt).toBe(120);
    expect(completed.steps[1]?.evidence.some((item) => item.kind === 'manual-note')).toBe(true);
  });

  it('supports pause, safe recovery, resume, cancel and restart', () => {
    const started = startGuidedTest(SAMPLE_GUIDED_TEST, { url: 'https://example.test/' }, 10);
    const paused = pauseGuidedTest(started, 20);
    expect(paused.status).toBe('paused');
    expect(isRecoverableGuidedSession(JSON.parse(JSON.stringify(paused)))).toBe(true);

    const resumed = resumeGuidedTest(paused, 30);
    expect(resumed.status).toBe('active');

    const cancelled = cancelGuidedTest(resumed, 40);
    expect(cancelled.status).toBe('cancelled');

    const restarted = restartGuidedTest(SAMPLE_GUIDED_TEST, cancelled, 50);
    expect(restarted.status).toBe('active');
    expect(restarted.id).not.toBe(cancelled.id);
    expect(restarted.steps.every((step) => step.answer == null)).toBe(true);
  });

  it('redacts common sensitive values before manual evidence is stored', () => {
    const value = redactGuidedText(
      'email marco@example.com password=hunter2 token=abc123 card 4111 1111 1111 1111',
    );
    expect(value).not.toContain('marco@example.com');
    expect(value).not.toContain('hunter2');
    expect(value).not.toContain('abc123');
    expect(value).not.toContain('4111 1111 1111 1111');
    expect(value).toContain('[redacted-email]');
    expect(value).toContain('[redacted-number]');
  });

  it('keeps stored guided sessions bounded and prefers the newest evidence', () => {
    const sessions = Array.from({ length: GUIDED_MAX_STORED_SESSIONS + 3 }, (_, index) => {
      const session = startGuidedTest(
        SAMPLE_GUIDED_TEST,
        { url: `https://example.test/${index}` },
        index + 1,
      );
      return { ...session, updatedAt: index + 1 };
    });

    const bounded = boundGuidedSessions(sessions);
    expect(bounded).toHaveLength(GUIDED_MAX_STORED_SESSIONS);
    expect(bounded[0]?.updatedAt).toBe(GUIDED_MAX_STORED_SESSIONS + 3);
  });

  it('keeps uncertain manual judgement separate as guided review evidence', () => {
    const started = startGuidedTest(SAMPLE_GUIDED_TEST, { url: 'https://example.test/' }, 1);
    const next = answerGuidedStep(started, SAMPLE_GUIDED_TEST, 'acknowledged', '', 2);
    const completed = answerGuidedStep(next, SAMPLE_GUIDED_TEST, 'uncertain', '', 3);
    expect(completed.outcome).toBe('guided-review');
  });
});
