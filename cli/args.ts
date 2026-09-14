import type { FocusTraceExportFormat } from '../lib/report/versioned-export';

export const DEFAULT_CLI_TIMEOUT_MS = 30_000;

export interface FocusTraceCliOptions {
  target?: string;
  profilePath?: string;
  scope: 'page' | 'component';
  selector?: string;
  format: FocusTraceExportFormat;
  outputPath?: string;
  baselinePath?: string;
  saveBaselinePath?: string;
  timeoutMs: number;
  headed: boolean;
  exitZero: boolean;
  help: boolean;
}

export class CliUsageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CliUsageError';
  }
}

const FORMATS: FocusTraceExportFormat[] = ['json', 'html', 'csv', 'sarif', 'junit'];

function nextValue(args: string[], index: number, option: string): string {
  const value = args[index + 1];
  if (!value || value.startsWith('--')) throw new CliUsageError(`${option} requires a value.`);
  return value;
}

function parseTimeout(value: string): number {
  const timeout = Number(value);
  if (!Number.isInteger(timeout) || timeout < 1_000 || timeout > 300_000) {
    throw new CliUsageError('--timeout must be an integer between 1000 and 300000 milliseconds.');
  }
  return timeout;
}

export function parseCliArgs(args: string[]): FocusTraceCliOptions {
  const options: FocusTraceCliOptions = {
    scope: 'page',
    format: 'json',
    timeoutMs: DEFAULT_CLI_TIMEOUT_MS,
    headed: false,
    exitZero: false,
    help: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]!;
    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }
    if (arg === '--headed') {
      options.headed = true;
      continue;
    }
    if (arg === '--exit-zero') {
      options.exitZero = true;
      continue;
    }
    if (arg === '--profile') {
      options.profilePath = nextValue(args, index, arg);
      index += 1;
      continue;
    }
    if (arg === '--selector') {
      options.selector = nextValue(args, index, arg);
      index += 1;
      continue;
    }
    if (arg === '--output') {
      options.outputPath = nextValue(args, index, arg);
      index += 1;
      continue;
    }
    if (arg === '--baseline') {
      options.baselinePath = nextValue(args, index, arg);
      index += 1;
      continue;
    }
    if (arg === '--save-baseline') {
      options.saveBaselinePath = nextValue(args, index, arg);
      index += 1;
      continue;
    }
    if (arg === '--timeout') {
      options.timeoutMs = parseTimeout(nextValue(args, index, arg));
      index += 1;
      continue;
    }
    if (arg === '--scope') {
      const scope = nextValue(args, index, arg);
      if (scope !== 'page' && scope !== 'component') {
        throw new CliUsageError('--scope must be "page" or "component".');
      }
      options.scope = scope;
      index += 1;
      continue;
    }
    if (arg === '--format') {
      const format = nextValue(args, index, arg) as FocusTraceExportFormat;
      if (!FORMATS.includes(format)) {
        throw new CliUsageError(`--format must be one of: ${FORMATS.join(', ')}.`);
      }
      options.format = format;
      index += 1;
      continue;
    }
    if (arg.startsWith('-')) throw new CliUsageError(`Unknown option: ${arg}`);
    if (options.target) throw new CliUsageError('Only one audit target may be supplied.');
    options.target = arg;
  }

  if (!options.help && !options.target) throw new CliUsageError('A URL or local HTML path is required.');
  if (options.scope === 'component' && !options.selector) {
    throw new CliUsageError('--scope component requires --selector.');
  }
  if (options.scope === 'page' && options.selector) {
    throw new CliUsageError('--selector can only be used with --scope component.');
  }
  return options;
}

export function cliHelp(): string {
  return `FocusTrace CLI\n\nUsage:\n  npm run cli -- <url-or-html-path> [options]\n\nOptions:\n  --profile <file>         Audit profile JSON; defaults to the complete profile\n  --scope <page|component> Audit a page or one component\n  --selector <css>         CSS selector required for component scope\n  --format <format>        json, html, csv, sarif or junit (default: json)\n  --output <file>          Write the rendered export to a file instead of stdout\n  --baseline <file>        Compare against a local FocusTrace CLI baseline\n  --save-baseline <file>   Save the current local baseline\n  --timeout <ms>           Navigation timeout from 1000 to 300000 (default: 30000)\n  --headed                 Show the local Chromium window\n  --exit-zero              Do not return exit code 1 when deterministic FAIL exists\n  -h, --help               Show this help\n`;
}
