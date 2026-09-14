import type { AuditProfile } from '../lib/audit/audit-profiles';
import type { FocusTraceCliBaseline } from '../lib/core/baseline';
import type {
  FocusTraceExportEnvelopeV1,
  FocusTraceExportFormat,
} from '../lib/report/versioned-export';

export interface CliBrowserRunInput {
  scope: 'page' | 'component';
  selector?: string;
  profile?: Partial<AuditProfile>;
  baseline?: unknown;
  format: FocusTraceExportFormat;
}

export interface CliBrowserRunOutput {
  rendered: string;
  envelope: FocusTraceExportEnvelopeV1;
  baseline: FocusTraceCliBaseline;
  baselineCompatible: boolean;
}

export interface FocusTraceCliBridge {
  run(input: CliBrowserRunInput): Promise<CliBrowserRunOutput>;
}
