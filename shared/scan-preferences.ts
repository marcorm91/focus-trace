export const SCAN_PREFERENCES_STORAGE_KEY = 'focustrace:scan-preferences';

export interface ScanPreferences {
  ignoreIframeContents: boolean;
}

export const DEFAULT_SCAN_PREFERENCES: ScanPreferences = {
  ignoreIframeContents: false,
};

export function normalizeScanPreferences(value: unknown): ScanPreferences {
  if (!value || typeof value !== 'object') return { ...DEFAULT_SCAN_PREFERENCES };
  const candidate = value as Partial<ScanPreferences>;
  return {
    ignoreIframeContents: candidate.ignoreIframeContents === true,
  };
}
