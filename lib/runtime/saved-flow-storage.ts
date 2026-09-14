import { browser } from '#imports';
import {
  MAX_SAVED_FLOW_FINDINGS,
  MAX_SAVED_FLOW_STEPS,
  SAVED_FLOW_VERSION,
  type SavedUserFlow,
} from './saved-flow';

export const SAVED_FLOW_STORAGE_KEY = 'focustrace.savedFlows.v1';
export const MAX_SAVED_FLOWS = 20;

interface SavedFlowStore {
  version: typeof SAVED_FLOW_VERSION;
  flows: SavedUserFlow[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeFlow(value: unknown): SavedUserFlow | undefined {
  if (!isRecord(value) || value.version !== SAVED_FLOW_VERSION) return undefined;
  if (typeof value.id !== 'string' || typeof value.name !== 'string') return undefined;
  if (typeof value.createdAt !== 'number' || typeof value.updatedAt !== 'number') return undefined;
  if (!Array.isArray(value.steps) || !Array.isArray(value.baselineFindings)) return undefined;
  return {
    ...(value as unknown as SavedUserFlow),
    name: value.name.replace(/\s+/g, ' ').trim().slice(0, 80) || 'Saved accessibility flow',
    steps: (value.steps as SavedUserFlow['steps']).slice(0, MAX_SAVED_FLOW_STEPS),
    baselineFindings: (value.baselineFindings as SavedUserFlow['baselineFindings']).slice(0, MAX_SAVED_FLOW_FINDINGS),
  };
}

export function normalizeSavedFlowStore(value: unknown): SavedFlowStore {
  if (!isRecord(value) || value.version !== SAVED_FLOW_VERSION || !Array.isArray(value.flows)) {
    return { version: SAVED_FLOW_VERSION, flows: [] };
  }
  const flows = value.flows
    .map(normalizeFlow)
    .filter((flow): flow is SavedUserFlow => Boolean(flow))
    .sort((left, right) => right.updatedAt - left.updatedAt)
    .slice(0, MAX_SAVED_FLOWS);
  return { version: SAVED_FLOW_VERSION, flows };
}

async function readStore(): Promise<SavedFlowStore> {
  const stored = await browser.storage.local.get(SAVED_FLOW_STORAGE_KEY);
  return normalizeSavedFlowStore(stored[SAVED_FLOW_STORAGE_KEY]);
}

async function writeStore(store: SavedFlowStore): Promise<void> {
  if (!store.flows.length) {
    await browser.storage.local.remove(SAVED_FLOW_STORAGE_KEY);
    return;
  }
  await browser.storage.local.set({ [SAVED_FLOW_STORAGE_KEY]: store });
}

export async function listSavedUserFlows(): Promise<SavedUserFlow[]> {
  return (await readStore()).flows;
}

export async function saveUserFlow(flow: SavedUserFlow): Promise<SavedUserFlow[]> {
  const store = await readStore();
  const previous = store.flows.find((candidate) => candidate.id === flow.id);
  const nextFlow: SavedUserFlow = {
    ...flow,
    createdAt: previous?.createdAt ?? flow.createdAt,
    updatedAt: Date.now(),
    steps: flow.steps.slice(0, MAX_SAVED_FLOW_STEPS),
    baselineFindings: flow.baselineFindings.slice(0, MAX_SAVED_FLOW_FINDINGS),
  };
  const flows = [nextFlow, ...store.flows.filter((candidate) => candidate.id !== flow.id)]
    .sort((left, right) => right.updatedAt - left.updatedAt)
    .slice(0, MAX_SAVED_FLOWS);
  await writeStore({ version: SAVED_FLOW_VERSION, flows });
  return flows;
}

export async function deleteSavedUserFlow(flowId: string): Promise<SavedUserFlow[]> {
  const store = await readStore();
  const flows = store.flows.filter((flow) => flow.id !== flowId);
  await writeStore({ version: SAVED_FLOW_VERSION, flows });
  return flows;
}

export async function clearSavedUserFlows(): Promise<void> {
  await browser.storage.local.remove(SAVED_FLOW_STORAGE_KEY);
}
