import {
  buildFocusMemoryObservation,
  normalizeFocusMemoryStore,
  type FocusMemoryObservation,
} from '../../../shared/focus-memory';
import type { ScanResult } from '../../../shared/types';

export interface FocusMemorySnapshotFile {
  format: 'focustrace-memory-baseline';
  version: 1;
  exportedAt: string;
  analyzedAt: string;
  page: {
    url: string;
    title: string;
    scopeType: 'page' | 'component';
    scopeKey: string;
  };
  observation: FocusMemoryObservation;
}

export function downloadFocusMemorySnapshot(scan: ScanResult) {
  const observation = buildFocusMemoryObservation(scan);
  const snapshot: FocusMemorySnapshotFile = {
    format: 'focustrace-memory-baseline',
    version: 1,
    exportedAt: new Date().toISOString(),
    analyzedAt: new Date(scan.scannedAt).toISOString(),
    page: {
      url: scan.url,
      title: scan.title,
      scopeType: observation.scopeType,
      scopeKey: observation.scopeKey,
    },
    observation,
  };

  let host = 'page';
  try {
    host = new URL(scan.url).hostname || host;
  } catch {
    // Keep a stable generic filename for non-standard URLs.
  }
  const safeHost = host.replace(/[^a-z0-9.-]+/gi, '-').replace(/^-+|-+$/g, '') || 'page';
  const timestamp = new Date(scan.scannedAt).toISOString().replace(/[:.]/g, '-');
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json;charset=utf-8' });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = `focustrace-baseline-${safeHost}-${timestamp}.json`;
  anchor.hidden = true;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}

export function parseFocusMemorySnapshot(value: unknown): FocusMemorySnapshotFile {
  if (!value || typeof value !== 'object') throw new Error('invalid-snapshot');
  const candidate = value as Partial<FocusMemorySnapshotFile>;
  if (candidate.format !== 'focustrace-memory-baseline' || candidate.version !== 1) {
    throw new Error('invalid-snapshot');
  }
  if (typeof candidate.exportedAt !== 'string' || !Number.isFinite(Date.parse(candidate.exportedAt))) {
    throw new Error('invalid-snapshot');
  }

  const store = normalizeFocusMemoryStore({
    version: 1,
    observations: candidate.observation ? [candidate.observation] : [],
  });
  const observation = store.observations[0];
  if (!observation) throw new Error('invalid-snapshot');

  return {
    format: 'focustrace-memory-baseline',
    version: 1,
    exportedAt: candidate.exportedAt,
    analyzedAt: typeof candidate.analyzedAt === 'string'
      ? candidate.analyzedAt
      : new Date(observation.observedAt).toISOString(),
    page: candidate.page && typeof candidate.page === 'object'
      ? {
          url: typeof candidate.page.url === 'string' ? candidate.page.url : '',
          title: typeof candidate.page.title === 'string' ? candidate.page.title : '',
          scopeType: observation.scopeType,
          scopeKey: observation.scopeKey,
        }
      : {
          url: '',
          title: '',
          scopeType: observation.scopeType,
          scopeKey: observation.scopeKey,
        },
    observation,
  };
}
