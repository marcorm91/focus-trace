export interface AxeParitySummary {
  total: number;
  equivalent: number;
  partial: number;
  superset: number;
  overlap: number;
  missing: number;
  'not-applicable': number;
  covered: number;
}

export interface AxeClassification {
  axeRuleId: string;
  relationship: string;
  focusTraceRuleIds: string[];
  rationale: string;
  standards: string[];
  evidenceKey: string;
}

export function validateAxeRegistry(registry: unknown): Set<string>;
export function summarizeAxeParity(classifications: AxeClassification[]): AxeParitySummary;
export function loadAxeClassifications(mapping: unknown, root?: string): Promise<AxeClassification[]>;
export function validateAxeMappings(
  mapping: unknown,
  axeRuleIds: Set<string>,
  classifications: AxeClassification[],
  expectedRelease: string,
  root?: string,
): AxeParitySummary;
