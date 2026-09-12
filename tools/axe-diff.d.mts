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

interface AxeMappingV1 {
  schemaVersion: 1;
  mappings: AxeSeverityMapping[];
}

interface AxeMappingV2 {
  schemaVersion: 2;
  severityMappings: AxeSeverityMapping[];
}

export function axeDiffReport(
  before: AxeRegistry,
  after: AxeRegistry,
  mapping: AxeMappingV1 | AxeMappingV2,
): string;
