const STEP_CRITERIA: Record<string, Record<string, readonly string[]>> = {
  'FT-GUIDED-005': {
    'table-scope': ['1.3.1'],
    'table-groups': ['1.3.1'],
    'table-cell-association': ['1.3.1'],
  },
  'FT-GUIDED-006': {
    'form-instructions': ['3.3.2'],
    'form-error-identification': ['3.3.1'],
    'form-error-suggestion': ['3.3.3'],
    'form-error-prevention': ['3.3.4'],
  },
  'FT-GUIDED-007': {
    'resize-text-200': ['1.4.4'],
    'reflow-320': ['1.4.10'],
    'resize-reflow-operability': ['1.4.4', '1.4.10'],
  },
  'FT-GUIDED-008': {
    'media-captions': ['1.2.2'],
    'media-audio-video-only': ['1.2.1'],
    'media-visual-information': ['1.2.3', '1.2.5'],
  },
};

export function guidedStepCriteria(testId: string, stepId: string): readonly string[] {
  return STEP_CRITERIA[testId]?.[stepId] ?? [];
}
