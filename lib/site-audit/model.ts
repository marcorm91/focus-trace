import type { FindingOutcome, ScanIssue, ScanResult } from '../../shared/types';

export const SITE_AUDIT_MAX_DISCOVERED_URLS = 500;
export const SITE_AUDIT_MAX_SCANNED_PAGES = 30;
export const SITE_AUDIT_SAMPLES_PER_FAMILY = 3;

export type SiteAuditStatus = 'idle' | 'discovering' | 'scanning' | 'complete' | 'cancelled' | 'error';

export interface SiteAuditDiscovery {
  origin: string;
  source: 'sitemap' | 'robots+sitemap' | 'links' | 'mixed';
  urls: string[];
  sitemapUrls: string[];
  truncated: boolean;
}

export interface SiteAuditRouteFamily {
  id: string;
  pattern: string;
  urls: string[];
  sampleUrls: string[];
}

export interface SitePageStructure {
  fingerprint: string;
  canonical?: string;
  semanticTokens: string[];
  headingLevels: number[];
  interactiveCount: number;
  landmarkCount: number;
}

export interface SiteAuditPageResult {
  url: string;
  routeFamilyId: string;
  scan?: ScanResult;
  structure?: SitePageStructure;
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

export interface SiteAuditResult {
  origin: string;
  generatedAt: number;
  discovery: SiteAuditDiscovery;
  routeFamilies: SiteAuditRouteFamily[];
  pages: SiteAuditPageResult[];
  templates: SiteAuditTemplate[];
  scannedPages: number;
  failedPages: number;
}
