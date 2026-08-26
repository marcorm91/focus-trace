import type { ReactElement } from 'react';
import type { AppLanguage } from '../../shared/i18n';
import type { RuntimeEvent, ScanResult } from '../../shared/types';
import './views/HeadingTreeView';
import './views/SessionReportView';

// Scan review consumes the richer inspector result returned by onLocate.
// Headings and report views only trigger the same action and intentionally
// ignore that return value, so their public callback overload accepts it.
declare module './views/HeadingTreeView' {
  export function HeadingTreeView(props: {
    scan?: ScanResult | undefined;
    language: AppLanguage;
    onLocate: (selector: string) => any;
  }): ReactElement;
}

declare module './views/SessionReportView' {
  export function SessionReportView(props: {
    scan?: ScanResult | undefined;
    events: RuntimeEvent[];
    language: AppLanguage;
    onLocate: (selector: string) => any;
  }): ReactElement;
}
