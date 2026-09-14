import { browser } from '#imports';
import {
  isRecoverableGuidedSession,
  normalizeGuidedPageUrl,
  type GuidedTestSession,
} from './framework';

const GUIDED_STORAGE_KEY = 'guided-tests:v1';
export const GUIDED_MAX_STORED_SESSIONS = 8;

interface GuidedSessionStore {
  version: 1;
  sessions: GuidedTestSession[];
}

function emptyStore(): GuidedSessionStore {
  return { version: 1, sessions: [] };
}

export function boundGuidedSessions(sessions: GuidedTestSession[]): GuidedTestSession[] {
  return [...sessions]
    .filter(isRecoverableGuidedSession)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, GUIDED_MAX_STORED_SESSIONS);
}

function parseStore(value: unknown): GuidedSessionStore {
  if (!value || typeof value !== 'object') return emptyStore();
  const candidate = value as Partial<GuidedSessionStore>;
  if (candidate.version !== 1 || !Array.isArray(candidate.sessions)) return emptyStore();
  return { version: 1, sessions: boundGuidedSessions(candidate.sessions) };
}

async function readStore(): Promise<GuidedSessionStore> {
  const stored = await browser.storage.session.get(GUIDED_STORAGE_KEY);
  return parseStore(stored[GUIDED_STORAGE_KEY]);
}

async function writeStore(store: GuidedSessionStore): Promise<void> {
  await browser.storage.session.set({
    [GUIDED_STORAGE_KEY]: {
      version: 1,
      sessions: boundGuidedSessions(store.sessions),
    } satisfies GuidedSessionStore,
  });
}

export async function loadGuidedSession(
  pageUrl: string,
  testId: string,
): Promise<GuidedTestSession | undefined> {
  const page = normalizeGuidedPageUrl(pageUrl);
  const store = await readStore();
  return store.sessions.find((session) => session.pageUrl === page && session.testId === testId);
}

export async function saveGuidedSession(session: GuidedTestSession): Promise<void> {
  const store = await readStore();
  const sessions = [
    session,
    ...store.sessions.filter((item) => !(item.pageUrl === session.pageUrl && item.testId === session.testId)),
  ];
  await writeStore({ version: 1, sessions });
}
