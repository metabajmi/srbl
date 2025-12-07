import { scanWithBrowser, BrowserScanResult, NetworkRequest } from './browser';
import { discoverLegalPages, DiscoveredPage, fetchAndDiscoverSitemap } from './pagesDiscovery';
import { parsePolicy, ParsedPolicy, analyzePolicyCompleteness } from './policyParser';
import { analyzeCookieBanner, CookieBannerAnalysis } from './cookieBannerAnalyzer';
import { evaluatePDPLCompliance, createEvaluationContext, PDPLCheck, PDPLEvaluationResult } from './pdplEvaluator';
import { 
  analyzePolicyGaps, 
  auditPolicyCompliance, 
  GapAnalysisResult, 
  ComplianceAuditResult,
  PolicyGap,
  ComplianceAuditItem
} from './gapAnalyzer';
import {
  extractScripts,
  extractCookies,
  detectTrackers,
  extractForms,
  detectThirdPartyServices,
  extractSecurityHeaders,
  detectPrivacyPolicy,
  detectTerms,
  detectCookieBanner,
  detectContactInfo,
} from './extractors';

export interface ComprehensiveScanConfig {
  max_pages_to_crawl: number;
  render_timeout_ms: number;
  deep_scan: boolean;
  include_screenshots: boolean;
  fetch_policy_content: boolean;
}

export interface LegalPageAnalysis {
  url: string;
  type: 'privacy' | 'terms' | 'cookies' | 'refund' | 'other';
  found_by: string;
  title: string;
  word_count: number;
  language: 'ar' | 'en' | 'mixed';
  sections: Array<{
    title: string;
    text: string;
    mappings: string[];
  }>;
  completeness_score: number;
  missing_elements: string[];
  present_elements: string[];
}

export interface ComprehensiveScanResult {
  scanned_url: string;
  final_url: string;
  scan_date: string;
  scan_duration_ms: number;
  
  legal_pages: LegalPageAnalysis[];
  discovered_pages: DiscoveredPage[];
  
  cookie_banner: {
    present: boolean;
    banner_type: string;
    blocking: boolean;
    granular_controls: boolean;
    has_accept_button: boolean;
    has_reject_button: boolean;
    has_settings_button: boolean;
    categories: string[];
    pre_consent_trackers: string[];
    pre_consent_cookies: string[];
    compliance_issues: string[];
    evidence: string;
  };
  
  pdpl_checks: PDPLCheck[];
  
  security: {
    https: boolean;
    hsts: boolean;
    csp: boolean;
  };
  
  tracking: {
    technologies: string[];
    third_party_services: string[];
    cookies_count: number;
  };
  
  contact_info: {
    present: boolean;
    email?: string;
    phone?: string;
  };
  
  policy_gaps: {
    totalTrackersDetected: number;
    totalDisclosed: number;
    totalMissing: number;
    disclosureRate: number;
    gaps: PolicyGap[];
  };
  
  compliance_audit: {
    totalChecks: number;
    found: number;
    missing: number;
    partial: number;
    transparencyScore: number;
    items: ComplianceAuditItem[];
    compliant: boolean;
    criticalMissing: string[];
  };
  
  overall_score: number;
  compliance_level: 'high' | 'medium' | 'low';
  
  summary: {
    critical_issues: number;
    major_issues: number;
    minor_issues: number;
    passed_checks: number;
    total_checks: number;
    top_recommendations: string[];
    top_recommendations_ar: string[];
  };
  
  scan_errors: string[];
  js_render: boolean;
}

const DEFAULT_CONFIG: ComprehensiveScanConfig = {
  max_pages_to_crawl: 50,
  render_timeout_ms: 60000,
  deep_scan: true,
  include_screenshots: false,
  fetch_policy_content: true,
};

export async function runComprehensiveScan(
  url: string,
  config: Partial<ComprehensiveScanConfig> = {}
): Promise<ComprehensiveScanResult> {
  const startTime = Date.now();
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  const errors: string[] = [];
  
  console.log(`[ComprehensiveScan] Starting comprehensive scan for: ${url}`);
  console.log(`[ComprehensiveScan] Config:`, fullConfig);
  
  let mainScanResult: BrowserScanResult;
  
  try {
    mainScanResult = await scanWithBrowser(url);
    console.log(`[ComprehensiveScan] Main page scanned successfully`);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown scan error';
    console.error(`[ComprehensiveScan] Main scan failed: ${errorMsg}`);
    errors.push(`Main scan failed: ${errorMsg}`);
    
    return createErrorResult(url, errors, startTime);
  }
  
  const discoveredPages = discoverLegalPages(mainScanResult.html, mainScanResult.finalUrl);
  console.log(`[ComprehensiveScan] Discovered ${discoveredPages.pages.length} potential legal pages`);
  
  let sitemapPages: string[] = [];
  if (fullConfig.deep_scan) {
    try {
      sitemapPages = await fetchAndDiscoverSitemap(mainScanResult.finalUrl);
      console.log(`[ComprehensiveScan] Found ${sitemapPages.length} legal pages in sitemap`);
    } catch (error) {
      console.log(`[ComprehensiveScan] Sitemap fetch failed, continuing without it`);
    }
  }
  
  for (const sitemapUrl of sitemapPages) {
    if (!discoveredPages.pages.some(p => p.url === sitemapUrl)) {
      discoveredPages.pages.push({
        url: sitemapUrl,
        type: 'other',
        foundBy: 'sitemap',
        linkText: '',
        confidence: 0.7,
        depth: 0,
      });
    }
  }
  
  const parsedPolicies: ParsedPolicy[] = [];
  const legalPageAnalyses: LegalPageAnalysis[] = [];
  
  if (fullConfig.fetch_policy_content) {
    const pagesToFetch = discoveredPages.pages
      .filter(p => p.type !== 'other' && p.confidence >= 0.7)
      .slice(0, fullConfig.max_pages_to_crawl);
    
    for (const page of pagesToFetch) {
      try {
        console.log(`[ComprehensiveScan] Fetching policy page: ${page.url}`);
        const pageResult = await scanWithBrowser(page.url);
        
        const parsed = parsePolicy(pageResult.html, page.url, page.type);
        parsedPolicies.push(parsed);
        
        const completeness = analyzePolicyCompleteness(parsed);
        
        legalPageAnalyses.push({
          url: parsed.url,
          type: parsed.type,
          found_by: page.foundBy,
          title: parsed.title,
          word_count: parsed.wordCount,
          language: parsed.language,
          sections: parsed.sections.slice(0, 20).map(s => ({
            title: s.title,
            text: s.text.substring(0, 500),
            mappings: s.pdplMappings,
          })),
          completeness_score: completeness.score,
          missing_elements: completeness.missingElements,
          present_elements: completeness.presentElements,
        });
        
        console.log(`[ComprehensiveScan] Parsed ${parsed.type} policy: ${parsed.wordCount} words, ${parsed.sections.length} sections`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Failed to fetch ${page.type} page (${page.url}): ${errorMsg}`);
        console.error(`[ComprehensiveScan] Failed to fetch ${page.url}: ${errorMsg}`);
      }
    }
  }
  
  const cookieAnalysis = analyzeCookieBanner(
    mainScanResult.html,
    [],
    mainScanResult.cookies.map(c => c.name)
  );
  
  const scripts = extractScripts(mainScanResult.html);
  const cookies = extractCookies(mainScanResult.cookies, mainScanResult.finalUrl);
  const tracking = detectTrackers(mainScanResult.html, scripts, cookies, mainScanResult.networkRequests);
  const thirdParties = detectThirdPartyServices(mainScanResult.networkRequests, mainScanResult.finalUrl);
  const security = extractSecurityHeaders(mainScanResult.responseHeaders || {}, mainScanResult.finalUrl);
  const contactInfo = detectContactInfo(mainScanResult.html);
  
  const evaluationContext = createEvaluationContext(
    parsedPolicies,
    cookieAnalysis,
    discoveredPages.pages,
    {
      hasHttps: security.https,
      hasHsts: security.hsts,
      hasCsp: security.csp,
      hasContactInfo: contactInfo.found,
      contactEmail: contactInfo.email,
      contactPhone: contactInfo.phone,
      trackingTechnologies: tracking.map(t => t.name),
      thirdPartyServices: thirdParties.map(s => s.name),
      cookies: cookies.map(c => c.name),
    }
  );
  
  const pdplEvaluation = evaluatePDPLCompliance(evaluationContext);
  
  const failedChecks = pdplEvaluation.checks
    .filter(c => c.result === 'fail' || c.result === 'partial')
    .sort((a, b) => {
      const severityOrder = { critical: 0, major: 1, minor: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  
  const topRecommendations = failedChecks.slice(0, 5).map(c => c.recommendation);
  const topRecommendationsAr = failedChecks.slice(0, 5).map(c => c.recommendation_ar);
  
  // Run Gap Analysis and Compliance Audit
  const gapAnalysisResult = analyzePolicyGaps(
    tracking.map(t => ({ name: t.name })),
    parsedPolicies
  );
  
  const complianceAuditResult = auditPolicyCompliance(parsedPolicies);
  
  const scanDuration = Date.now() - startTime;
  
  // CRITICAL FIX: Calculate combined overall score that factors in compliance audit
  // Weight: 60% PDPL checks + 40% Compliance Audit transparency score
  const pdplScore = pdplEvaluation.overall_score;
  const auditScore = complianceAuditResult.transparencyScore;
  
  // If there are critical missing required sections, apply additional penalty
  const criticalMissingCount = complianceAuditResult.summary.criticalMissing.length;
  const criticalPenalty = criticalMissingCount * 5; // -5% per critical missing section
  
  let combinedScore = Math.round((pdplScore * 0.6) + (auditScore * 0.4) - criticalPenalty);
  combinedScore = Math.max(0, Math.min(100, combinedScore)); // Clamp 0-100
  
  // Determine compliance level based on combined score AND critical missing
  let finalComplianceLevel: 'high' | 'medium' | 'low';
  if (criticalMissingCount >= 3 || combinedScore < 50) {
    finalComplianceLevel = 'low';
  } else if (criticalMissingCount >= 1 || combinedScore < 80) {
    finalComplianceLevel = 'medium';
  } else {
    finalComplianceLevel = 'high';
  }
  
  console.log(`\n[FinalScoring] PDPL Checks Score: ${pdplScore}%`);
  console.log(`[FinalScoring] Compliance Audit Score: ${auditScore}%`);
  console.log(`[FinalScoring] Critical Missing Sections: ${criticalMissingCount} (-${criticalPenalty}% penalty)`);
  console.log(`[FinalScoring] Combined Score: (${pdplScore} × 0.6) + (${auditScore} × 0.4) - ${criticalPenalty} = ${combinedScore}%`);
  console.log(`[FinalScoring] Final Compliance Level: ${finalComplianceLevel.toUpperCase()}`);
  
  // Add recommendations from compliance audit to top recommendations
  const allRecommendations = [
    ...complianceAuditResult.summary.recommendations,
    ...topRecommendations
  ].slice(0, 7);
  
  const result: ComprehensiveScanResult = {
    scanned_url: url,
    final_url: mainScanResult.finalUrl,
    scan_date: new Date().toISOString(),
    scan_duration_ms: scanDuration,
    
    legal_pages: legalPageAnalyses,
    discovered_pages: discoveredPages.pages,
    
    cookie_banner: {
      present: cookieAnalysis.present,
      banner_type: cookieAnalysis.bannerType,
      blocking: cookieAnalysis.blocking,
      granular_controls: cookieAnalysis.granularControls,
      has_accept_button: cookieAnalysis.hasAcceptButton,
      has_reject_button: cookieAnalysis.hasRejectButton,
      has_settings_button: cookieAnalysis.hasSettingsButton,
      categories: cookieAnalysis.categories.map(c => c.name),
      pre_consent_trackers: cookieAnalysis.preConsentTrackers,
      pre_consent_cookies: cookieAnalysis.preConsentCookies,
      compliance_issues: cookieAnalysis.complianceIssues,
      evidence: cookieAnalysis.evidence,
    },
    
    pdpl_checks: pdplEvaluation.checks,
    
    security: {
      https: security.https,
      hsts: security.hsts,
      csp: security.csp,
    },
    
    tracking: {
      technologies: tracking.map(t => t.name),
      third_party_services: thirdParties.map(s => s.name),
      cookies_count: cookies.length,
    },
    
    contact_info: {
      present: contactInfo.found,
      email: contactInfo.email,
      phone: contactInfo.phone,
    },
    
    policy_gaps: {
      totalTrackersDetected: gapAnalysisResult.totalTrackersDetected,
      totalDisclosed: gapAnalysisResult.totalDisclosed,
      totalMissing: gapAnalysisResult.totalMissing,
      disclosureRate: gapAnalysisResult.disclosureRate,
      gaps: gapAnalysisResult.gaps,
    },
    
    compliance_audit: {
      totalChecks: complianceAuditResult.totalChecks,
      found: complianceAuditResult.found,
      missing: complianceAuditResult.missing,
      partial: complianceAuditResult.partial,
      transparencyScore: complianceAuditResult.transparencyScore,
      items: complianceAuditResult.items,
      compliant: complianceAuditResult.summary.compliant,
      criticalMissing: complianceAuditResult.summary.criticalMissing,
    },
    
    overall_score: combinedScore,
    compliance_level: finalComplianceLevel,
    
    summary: {
      critical_issues: pdplEvaluation.critical_issues + criticalMissingCount,
      major_issues: pdplEvaluation.major_issues,
      minor_issues: pdplEvaluation.minor_issues,
      passed_checks: pdplEvaluation.passed_checks,
      total_checks: pdplEvaluation.total_checks + complianceAuditResult.totalChecks,
      top_recommendations: allRecommendations,
      top_recommendations_ar: topRecommendationsAr,
    },
    
    scan_errors: errors,
    js_render: true,
  };
  
  console.log(`[ComprehensiveScan] Scan complete in ${scanDuration}ms. Score: ${result.overall_score}, Level: ${result.compliance_level}`);
  
  return result;
}

function createErrorResult(url: string, errors: string[], startTime: number): ComprehensiveScanResult {
  return {
    scanned_url: url,
    final_url: url,
    scan_date: new Date().toISOString(),
    scan_duration_ms: Date.now() - startTime,
    legal_pages: [],
    discovered_pages: [],
    cookie_banner: {
      present: false,
      banner_type: 'unknown',
      blocking: false,
      granular_controls: false,
      has_accept_button: false,
      has_reject_button: false,
      has_settings_button: false,
      categories: [],
      pre_consent_trackers: [],
      pre_consent_cookies: [],
      compliance_issues: ['Unable to analyze cookie banner due to scan failure'],
      evidence: '',
    },
    pdpl_checks: [],
    security: { https: false, hsts: false, csp: false },
    tracking: { technologies: [], third_party_services: [], cookies_count: 0 },
    contact_info: { present: false },
    policy_gaps: {
      totalTrackersDetected: 0,
      totalDisclosed: 0,
      totalMissing: 0,
      disclosureRate: 0,
      gaps: [],
    },
    compliance_audit: {
      totalChecks: 0,
      found: 0,
      missing: 0,
      partial: 0,
      transparencyScore: 0,
      items: [],
      compliant: false,
      criticalMissing: [],
    },
    overall_score: 0,
    compliance_level: 'low',
    summary: {
      critical_issues: 0,
      major_issues: 0,
      minor_issues: 0,
      passed_checks: 0,
      total_checks: 0,
      top_recommendations: ['Unable to complete scan. Please check the URL and try again.'],
      top_recommendations_ar: ['تعذر إكمال الفحص. يرجى التحقق من الرابط والمحاولة مرة أخرى.'],
    },
    scan_errors: errors,
    js_render: false,
  };
}
