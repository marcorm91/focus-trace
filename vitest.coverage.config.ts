import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: [
        'lib/audit/content-model.ts',
        'lib/audit/contrast.ts',
        'lib/audit/non-text-contrast.ts',
        'lib/audit/target-size.ts',
        'lib/runtime/causality.ts',
        'lib/runtime/dialog-events.ts',
        'lib/runtime/dragging.ts',
        'lib/runtime/focus-events.ts',
        'lib/runtime/mutation-events.ts',
        'lib/runtime/status-messages.ts',
      ],
      reporter: ['text-summary'],
      thresholds: {
        perFile: true,
        lines: 60,
        functions: 60,
        branches: 50,
        statements: 60,
      },
    },
  },
});
