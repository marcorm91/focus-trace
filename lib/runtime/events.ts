import type { RuntimeCause, RuntimeCauseType } from '../../shared/types';

export function createRuntimeCause(type: RuntimeCauseType, summary: string): RuntimeCause {
  return { type, confidence: 'deterministic', summary };
}

export function createRuntimeEventId(now = Date.now(), random = Math.random()): string {
  return `${now.toString(36)}-${random.toString(36).slice(2, 8)}`;
}
