interface AxeRegistryRule {
  id: string;
  impact: 'critical' | 'serious' | 'moderate' | 'minor' | null;
}

interface AxeRegistry {
  source: { tag?: string | null };
  summary: {
    total: number;
    critical: number;
    serious: number;
    moderate: number;
    minor: number;
  };
  rules: AxeRegistryRule[];
}

interface AxeSeverityMapping {
  focusTraceRuleId: string;
  axeRuleIds: string[];
}

interface AxeMapping {
  schemaVersion: number;
  mappings?: AxeSeverityMapping[];
  severityMappings?: AxeSeverityMapping[];
}

export function axeDiffReport(
  before: AxeRegistry,
  after: AxeRegistry,
  mapping: AxeMapping,
): string;
