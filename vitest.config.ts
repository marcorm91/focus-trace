import { defineConfig } from 'vitest/config';

const criticalCoverageThresholds = {
  lines: 60,
  functions: 60,
  branches: 50,
  statements: 60,
};

const criticalCoverageFiles = [
  'lib/audit/content-model.ts',
  'lib/audit/contrast.ts',
  'lib/audit/non-text-contrast.ts',
  'lib/audit/target-size.ts',
  'lib/runtime/causality.ts',
  'lib/runtime/context-change.ts',
  'lib/runtime/dialog-events.ts',
  'lib/runtime/dragging.ts',
  'lib/runtime/focus-events.ts',
  'lib/runtime/mutation-events.ts',
  'lib/runtime/status-messages.ts',
] as const;

export default defineConfig({
  test: {
    alias: { '#imports': 'wxt/browser' },
    coverage: {
      provider: 'v8',
      include: [
        'entrypoints/**/*.{ts,tsx}',
        'lib/**/*.{ts,tsx}',
        'shared/**/*.{ts,tsx}',
      ],
      reporter: ['text-summary'],
      thresholds: {
        lines: 53,
        functions: 52,
        branches: 43,
        statements: 50,
        ...Object.fromEntries(
          criticalCoverageFiles.map((file) => [file, criticalCoverageThresholds]),
        ),
      },
    },
  },
});
