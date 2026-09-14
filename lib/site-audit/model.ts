import type { ReportComponentIdentity } from '../report/component-identity';
import type { FindingOutcome, ScanIssue, ScanResult } from '../../shared/types';

export const SITE_AUDIT_MAX_DISCOVERED_URLS = 500;
export const SITE_AUDIT_MAX_SCANNED_PAGES = 30;
export const SITE_AUDIT_SAMPLES_PER_FAMILY = 3;
export const SITE_AUDIT_MAX_EXCLUSIONS = 50;
export const SITE_AUDIT_BASELINE_VERSION = 1 as const;
export const SITE_AUDIT_MAX_BASELINES = 12;

export type SiteAuditStatus = 'idle' | 'discovering' | 'scanning' | 'complete' | 'cancelled' | 'error';
export type SiteAuditMode = 'automatic' | 'manual' | 'session';
export type SiteAuditDiscoveryReason =
  | 'root'
  | 'sitemap'
  | 'internal-link'
  | 'manual-selection'
  | 'current-session'
  | 'duplicate'
  | 'excluded-path'
  | 'safety-limit';

export interface SiteAuditDiscoveryDecision {
  url: string;
  status: 'included' | 'excluded';
  reason: SiteAuditDiscoveryReason;
}

export interface SiteAuditScopeSnapshot {
  mode: SiteAuditMode;
  maxDiscoveredUrls: number;
  maxScannedPages: number;
  samplesPerFamily: number;
  exclusionPrefixes: string[];
}

export interface SiteAuditDiscovery {
  origin: string;
  source: 'sitemap' | 'robots+sitemap' | 'links' | 'mixed' | 'manual' | 'session';
  urls: string[];
  sitemapUrls: string[];
  truncated: boolean;
  decisions?: SiteAuditDiscoveryDecision[];
  scope?: SiteAuditScopeSnapshot;
}

export interface SiteAuditRouteFamily {
  id: string;
  pattern: string;
  urls: string[];
  sampleUrls: string[];
}

export type SiteAuditSampleReason = 'family-first' | 'family-spread' | 'manual-selection' | 'current-session';

export type SiteHelpMechanismKind =
  | 'human-contact-details'
  | 'human-contact'
  | 'self-help'
  | 'automated-contact';

export interface SiteHelpMechanism {
  kind: SiteHelpMechanismKind;
  selector: string;
  label: string;
}

export interface SiteNavigationMechanism {
  selector: string;
  label?: string;
  destinations: string[];
}

export type SiteFunctionalIdentificationSource =
  | 'aria-label'
  | 'aria-labelledby'
  | 'text'
  | 'image-alt'
  | 'title';

export interface SiteFunctionalIdentification {
  selector: string;
  kind: 'link';
  functionKey: string;
  accessibleName: string;
  source: SiteFunctionalIdentificationSource;
  pageLanguage: string;
}

export interface SitePageStructure {
  fingerprint: string;
  canonical?: string;
  semanticTokens: string[];
  headingLevels: number[];
  interactiveCount: number;
  landmarkCount: number;
  helpMechanisms?: SiteHelpMechanism[];
  navigationMechanisms?: SiteNavigationMechanism[];
  functionalIdentifications?: SiteFunctionalIdentification[];
}

export interface SiteAuditPageResult {
  url: string;
  routeFamilyId: string;
  selectionReason?: SiteAuditSampleReason;
  scan?: ScanResult;
  structure?: SitePageStructure;
  components?: ReportComponentIdentity[];
  error?: string;
}

export interface SiteAuditFindingAggregate {
  key: string;
  ruleId: string;
  outcome: FindingOutcome;
  title: string;
  targetShape: string;
  pages: string[];
  sampleCount: number;
  totalSamples: number;
  commonToTemplate: boolean;
  references: ScanIssue['references'];
  exampleUrl: string;
  exampleSelector: string;
  exampleIssue: ScanIssue;
  component?: ReportComponentIdentity;
}

export interface SiteAuditTemplate {
  id: string;
  label: string;
  routePatterns: string[];
  discoveredUrls: string[];
  sampledPages: SiteAuditPageResult[];
  fingerprint?: string;
  findings: SiteAuditFindingAggregate[];
  failures: number;
  reviews: number;
  warnings: number;
}

export interface SiteAuditBaselineFinding {
  key: string;
  ruleId: string;
  title: string;
  routePattern: string;
  targetShape: string;
  outcome: FindingOutcome;
  severity: ScanIssue['severity'];
  sampleCount: number;
  totalSamples: number;
}

export interface SiteAuditBaseline {
  version: typeof SITE_AUDIT_BASELINE_VERSION;
  origin: string;
  generatedAt: number;
  scopeSignature: string;
  findings: SiteAuditBaselineFinding[];
}

export interface SiteAuditBaselineStore {
  version: typeof SITE_AUDIT_BASELINE_VERSION;
  baselines: SiteAuditBaseline[];
}

export type SiteAuditComparisonState = 'new' | 'persistent' | 'changed' | 'resolved';

export interface SiteAuditComparisonFinding extends SiteAuditBaselineFinding {
  state: SiteAuditComparisonState;
  previousOutcome?: FindingOutcome;
  previousSeverity?: ScanIssue['severity'];
}

export interface SiteAuditComparison {
  previousGeneratedAt: number;
  compatible: boolean;
  reason?: 'scope-changed';
  newCount: number;
  persistentCount: number;
  changedCount: number;
  resolvedCount: number;
  findings: SiteAuditComparisonFinding[];
}

export interface SiteAuditResult {
  origin: string;
  generatedAt: number;
  discovery: SiteAuditDiscovery;
  routeFamilies: SiteAuditRouteFamily[];
  pages: SiteAuditPageResult[];
  templates: SiteAuditTemplate[];
  scannedPages: number;
  failedPages: number;
  comparison?: SiteAuditComparison;
}
