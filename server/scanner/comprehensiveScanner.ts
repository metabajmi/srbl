import { scanWithBrowser, BrowserScanResult, NetworkRequest } from './browser';
import { discoverLegalPages, DiscoveredPage, fetchAndDiscoverSitemap, discoverLinksFromDOM, discoverFallbackPolicyUrls } from './pagesDiscovery';
import { parsePolicy, ParsedPolicy, analyzePolicyCompleteness } from './policyParser';
import { evaluatePDPLCompliance, createEvaluationContext, PDPLCheck, PDPLEvaluationResult } from './pdplEvaluator';
import { 
  analyzePolicyGaps, 
  auditPolicyCompliance, 
  GapAnalysisResult, 
  ComplianceAuditResult,
  PolicyGap,
  ComplianceAuditItem
} from './gapAnalyzer';
import { auditPrivacyPolicy, PrivacyPolicyAudit } from './privacyPolicyElementChecker';
import { checkTermsConditions, TermsConditionsAudit } from './termsConditionsChecker';
import {
  extractScripts,
  extractCookies,
  detectTrackers,
  extractForms,
  detectThirdPartyServices,
  extractSecurityHeaders,
  detectPrivacyPolicy,
  detectTerms,
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
  
  privacy_policy_audit?: {
    elementsFound: number;
    elementsPartial: number;
    elementsMissing: number;
    compliancePercentage: number;
    isComplete: boolean;
    elements: Array<{
      id: string;
      number: number;
      nameAr: string;
      nameEn: string;
      status: string;
      statusEn: string;
      evidence: string;
      notes: string;
      matchCount: number;
      matchedKeywords: string[];
    }>;
    summary: string;
  };
  
  terms_conditions_audit?: {
    modulesFound: number;
    modulesPartial: number;
    modulesMissing: number;
    compliancePercentage: number;
    isComplete: boolean;
    modules: Array<{
      moduleId: string;
      number: number;
      titleAr: string;
      titleEn: string;
      status: string;
      statusEn: string;
      evidence: string;
      notes: string;
      matchCount: number;
      matchedKeywords: string[];
      requirementAr: string;
    }>;
    summary: string;
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
  max_pages_to_crawl: 30, // Reduced for faster scans
  render_timeout_ms: 25000, // Reduced from 60s for faster scans
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
  
  // STEP 1: Discover links from the homepage HTML
  console.log(`\n[Scanner] ========== MULTI-PAGE SCANNING PROCESS ==========`);
  console.log(`[Scanner] STEP 1: Scanning homepage for policy links...`);
  const discoveredLinks = discoverLinksFromDOM(mainScanResult.html, mainScanResult.finalUrl);
  
  console.log(`\n[Scanner] STEP 2: Discovering legal pages via patterns...`);
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
  
  // STEP 2.5: If no policy pages found, try fallback URL probing
  const hasPrivacyPage = discoveredPages.pages.some(p => p.type === 'privacy');
  const hasTermsPage = discoveredPages.pages.some(p => p.type === 'terms');
  
  if (!hasPrivacyPage || !hasTermsPage) {
    console.log(`\n[Scanner] STEP 2.5: No policy links found on page, trying fallback URL probing...`);
    try {
      const fallbackPages = await discoverFallbackPolicyUrls(mainScanResult.finalUrl, mainScanResult.html);
      for (const fallbackPage of fallbackPages) {
        if (!discoveredPages.pages.some(p => p.url === fallbackPage.url)) {
          discoveredPages.pages.push(fallbackPage);
        }
      }
      console.log(`[Scanner] Fallback discovery added ${fallbackPages.length} pages`);
    } catch (error) {
      console.log(`[Scanner] Fallback discovery failed, continuing...`);
    }
  }
  
  const parsedPolicies: ParsedPolicy[] = [];
  const legalPageAnalyses: LegalPageAnalysis[] = [];
  
  if (fullConfig.fetch_policy_content) {
    const pagesToFetch = discoveredPages.pages
      .filter(p => p.type !== 'other' && p.confidence >= 0.7)
      .slice(0, fullConfig.max_pages_to_crawl);
    
    console.log(`\n[Scanner] STEP 3: Fetching ${pagesToFetch.length} policy pages (batched, 5 concurrent)...\n`);
    
    // Fetch policy pages with controlled concurrency (5 at a time for speed)
    const BATCH_SIZE = 5;
    
    for (let i = 0; i < pagesToFetch.length; i += BATCH_SIZE) {
      const batch = pagesToFetch.slice(i, i + BATCH_SIZE);
      console.log(`[Scanner] Batch ${Math.floor(i / BATCH_SIZE) + 1}: Fetching ${batch.length} pages...`);
      
      const batchPromises = batch.map(async (page) => {
        try {
          console.log(`[Scanner] ➤ Fetching: ${page.type.toUpperCase()} at ${page.url}`);
          const pageResult = await scanWithBrowser(page.url);
          console.log(`[Scanner]   ✓ Loaded ${page.type}: ${pageResult.html?.length || 0} bytes`);
          
          const parsed = parsePolicy(pageResult.html, page.url, page.type);
          const completeness = analyzePolicyCompleteness(parsed);
          
          return {
            success: true,
            page,
            parsed,
            analysis: {
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
            } as LegalPageAnalysis,
          };
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          console.error(`[Scanner] ✗ Failed ${page.type}: ${errorMsg}`);
          return { success: false, page, error: errorMsg };
        }
      });
      
      // Wait for batch to complete
      const batchResults = await Promise.all(batchPromises);
      
      // Process batch results
      for (const result of batchResults) {
        if (result.success && result.parsed && result.analysis) {
          parsedPolicies.push(result.parsed);
          legalPageAnalyses.push(result.analysis);
          console.log(`[Scanner]   ✓ Parsed: ${result.parsed.wordCount} words (${result.parsed.language})`);
        } else if (!result.success) {
          errors.push(`Failed to fetch ${result.page.type} page (${result.page.url}): ${result.error}`);
        }
      }
    }
    
    console.log(`[Scanner] Completed: ${parsedPolicies.length}/${pagesToFetch.length} pages fetched`);
  }
  
  const scripts = extractScripts(mainScanResult.html);
  const cookies = extractCookies(mainScanResult.cookies, mainScanResult.finalUrl);
  const tracking = detectTrackers(mainScanResult.html, scripts, cookies, mainScanResult.networkRequests);
  const thirdParties = detectThirdPartyServices(mainScanResult.networkRequests, mainScanResult.finalUrl);
  const security = extractSecurityHeaders(mainScanResult.responseHeaders || {}, mainScanResult.finalUrl);
  const contactInfo = detectContactInfo(mainScanResult.html);
  
  const evaluationContext = createEvaluationContext(
    parsedPolicies,
    null, // Cookie banner analysis removed - compliance based on Privacy Policy + Terms only
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
  
  // Run specialized 12-element privacy policy audit
  // Relaxed check: run if policy exists and has any meaningful content (wordCount > 10)
  const privacyPolicy = parsedPolicies.find(p => p.type === 'privacy');
  let privacyPolicyAudit: PrivacyPolicyAudit | undefined;
  if (privacyPolicy && privacyPolicy.fullText && privacyPolicy.wordCount > 10) {
    console.log(`\n[PrivacyElementCheck] Running 12-element privacy policy audit...`);
    console.log(`[PrivacyElementCheck] Policy text length: ${privacyPolicy.fullText.length} chars, words: ${privacyPolicy.wordCount}`);
    privacyPolicyAudit = auditPrivacyPolicy(privacyPolicy.fullText);
    console.log(`[PrivacyElementCheck] Results: Found=${privacyPolicyAudit.elementsFound}/12, Partial=${privacyPolicyAudit.elementsPartial}/12, Missing=${privacyPolicyAudit.elementsMissing}/12`);
    console.log(`[PrivacyElementCheck] Compliance: ${privacyPolicyAudit.compliancePercentage}%`);
  } else {
    console.log(`\n[PrivacyElementCheck] Skipped - no valid privacy policy found (policy: ${!!privacyPolicy}, wordCount: ${privacyPolicy?.wordCount || 0})`);
  }
  
  // Run specialized 12-module Terms & Conditions audit
  // Relaxed check: run if policy exists and has any meaningful content (wordCount > 10)
  const termsPolicy = parsedPolicies.find(p => p.type === 'terms');
  let termsConditionsAudit: TermsConditionsAudit | undefined;
  if (termsPolicy && termsPolicy.fullText && termsPolicy.wordCount > 10) {
    console.log(`\n[TermsConditionsCheck] Running 12-module T&C audit...`);
    console.log(`[TermsConditionsCheck] Terms text length: ${termsPolicy.fullText.length} chars, words: ${termsPolicy.wordCount}`);
    termsConditionsAudit = checkTermsConditions(termsPolicy.fullText);
    console.log(`[TermsConditionsCheck] Results: Found=${termsConditionsAudit.modulesFound}/12, Partial=${termsConditionsAudit.modulesPartial}/12, Missing=${termsConditionsAudit.modulesMissing}/12`);
    console.log(`[TermsConditionsCheck] Compliance: ${termsConditionsAudit.compliancePercentage}%`);
  } else {
    console.log(`\n[TermsConditionsCheck] Skipped - no valid terms policy found (policy: ${!!termsPolicy}, wordCount: ${termsPolicy?.wordCount || 0})`);
  }
  
  const scanDuration = Date.now() - startTime;
  
  // CRITICAL: Calculate overall score ONLY from Privacy Policy + Terms & Conditions (50% each)
  const privacyPolicyScore = privacyPolicyAudit?.compliancePercentage || 0;
  const termsConditionsScore = termsConditionsAudit?.compliancePercentage || 0;
  
  // Calculate combined score: 50% Privacy Policy + 50% Terms & Conditions ONLY
  let combinedScore: number;
  if (privacyPolicyAudit && termsConditionsAudit) {
    // Both policies exist - average them
    combinedScore = Math.round((privacyPolicyScore * 0.5) + (termsConditionsScore * 0.5));
  } else if (privacyPolicyAudit) {
    // Only privacy policy exists - use it at 100% weight
    combinedScore = privacyPolicyScore;
  } else if (termsConditionsAudit) {
    // Only terms exist - use it at 100% weight
    combinedScore = termsConditionsScore;
  } else {
    // No policies found - score is 0
    combinedScore = 0;
  }
  combinedScore = Math.max(0, Math.min(100, combinedScore)); // Clamp 0-100
  
  // Determine compliance level based on combined score
  const privacyPolicyMissingCount = privacyPolicyAudit?.elementsMissing || 12;
  const termsMissingCount = termsConditionsAudit?.modulesMissing || 12;
  const totalMissing = privacyPolicyMissingCount + termsMissingCount;
  
  let finalComplianceLevel: 'high' | 'medium' | 'low';
  if (combinedScore >= 85) {
    finalComplianceLevel = 'high';
  } else if (combinedScore >= 50) {
    finalComplianceLevel = 'medium';
  } else {
    finalComplianceLevel = 'low';
  }
  
  console.log(`\n[FinalScoring] Privacy Policy Score: ${privacyPolicyScore}% (50%)`);
  console.log(`[FinalScoring] Terms & Conditions Score: ${termsConditionsScore}% (50%)`);
  console.log(`[FinalScoring] Combined Score: ${combinedScore}%`);
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
    
    // Include 12-element privacy policy audit
    privacy_policy_audit: privacyPolicyAudit ? {
      elementsFound: privacyPolicyAudit.elementsFound,
      elementsPartial: privacyPolicyAudit.elementsPartial,
      elementsMissing: privacyPolicyAudit.elementsMissing,
      compliancePercentage: privacyPolicyAudit.compliancePercentage,
      isComplete: privacyPolicyAudit.isComplete,
      elements: privacyPolicyAudit.elements,
      summary: privacyPolicyAudit.summary,
    } : undefined,
    
    // Include 12-module Terms & Conditions audit
    terms_conditions_audit: termsConditionsAudit ? {
      modulesFound: termsConditionsAudit.modulesFound,
      modulesPartial: termsConditionsAudit.modulesPartial,
      modulesMissing: termsConditionsAudit.modulesMissing,
      compliancePercentage: termsConditionsAudit.compliancePercentage,
      isComplete: termsConditionsAudit.isComplete,
      modules: termsConditionsAudit.modules,
      summary: termsConditionsAudit.summary,
    } : undefined,
    
    overall_score: combinedScore,
    compliance_level: finalComplianceLevel,
    
    summary: {
      critical_issues: pdplEvaluation.critical_issues + privacyPolicyMissingCount,
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
