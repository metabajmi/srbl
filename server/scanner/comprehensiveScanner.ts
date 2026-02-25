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
  
  // TODO: Re-enable sitemap discovery in V2 expansion plan
  // BYPASSED: Sitemap fetching (consumes 2-5 seconds network time)
  console.log(`[ComprehensiveScan] PERFORMANCE MODE: Sitemap discovery SKIPPED`);
  /*
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
  */
  
  // TODO: Re-enable fallback URL probing in V2 expansion plan
  // BYPASSED: Fallback URL probing (consumes 3-10 seconds with multiple HTTP requests)
  console.log(`[ComprehensiveScan] PERFORMANCE MODE: Fallback URL probing SKIPPED`);
  /*
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
  */
  
  const parsedPolicies: ParsedPolicy[] = [];
  const legalPageAnalyses: LegalPageAnalysis[] = [];
  
  if (fullConfig.fetch_policy_content) {
    // PERFORMANCE MODE: Only fetch PRIVACY POLICY (terms temporarily bypassed for speed)
    // TODO V2: Re-enable terms fetching by uncommenting termsPage below
    // Include low-confidence "السياسات" candidates (confidence >= 0.6) — they get verified after fetch
    const privacyPage = discoveredPages.pages
      .filter(p => p.type === 'privacy' && p.confidence >= 0.6)
      .sort((a, b) => b.confidence - a.confidence)[0];
    
    // TEMPORARILY BYPASSED: Terms page fetching (saves ~2-5 seconds)
    // const termsPage = discoveredPages.pages
    //   .filter(p => p.type === 'terms' && p.confidence >= 0.7)
    //   .sort((a, b) => b.confidence - a.confidence)[0];
    // const pagesToFetch = [privacyPage, termsPage].filter(Boolean);
    
    const pagesToFetch = [privacyPage].filter(Boolean);
    
    console.log(`\n[Scanner] STEP 3: PRIVACY-ONLY MODE - Fetching ${pagesToFetch.length} page (HTTP)...\n`);
    console.log(`[Scanner] ⚡ Terms page fetching BYPASSED for speed optimization`);
    
    // Fetch policy pages using lightweight HTTP fetch (NOT Puppeteer) in parallel
    const fetchPromises = pagesToFetch.map(async (page) => {
      try {
        console.log(`[Scanner] ➤ HTTP Fetching: ${page.type.toUpperCase()} at ${page.url}`);
        
        // Use lightweight HTTP fetch instead of Puppeteer
        const response = await fetch(page.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'ar,en;q=0.9',
          },
          signal: AbortSignal.timeout(10000), // 10 second timeout
        });
        
        const html = await response.text();
        console.log(`[Scanner]   ✓ HTTP Loaded ${page.type}: ${html.length} bytes`);
        
        const parsed = parsePolicy(html, page.url, page.type);
        const completeness = analyzePolicyCompleteness(parsed);

        // Content verification for low-confidence "السياسات" candidates
        // If page was discovered with low confidence (< 0.7), verify it actually has privacy content
        if (page.confidence < 0.7) {
          const d = parsed.detectedElements;
          const privacyIndicatorCount = [
            d.hasDataSubjectRights,
            d.hasLawfulBasis,
            d.hasRetentionPeriod,
            d.hasSecurityMeasures,
            d.hasContactInfo,
            d.hasThirdPartySharing,
          ].filter(Boolean).length;

          if (privacyIndicatorCount < 2 || parsed.wordCount < 80) {
            console.log(`[Scanner] ✗ Rejected low-confidence page "${parsed.title}" — only ${privacyIndicatorCount} privacy indicators, ${parsed.wordCount} words. Not a real privacy policy.`);
            return { success: false, page, error: 'Low-confidence page failed content verification' };
          }
          console.log(`[Scanner] ✓ Low-confidence "السياسات" page VERIFIED — ${privacyIndicatorCount} privacy indicators, ${parsed.wordCount} words.`);
        }
        
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
        console.error(`[Scanner] ✗ HTTP Failed ${page.type}: ${errorMsg}`);
        return { success: false, page, error: errorMsg };
      }
    });
    
    // Wait for all fetches to complete in parallel
    const results = await Promise.all(fetchPromises);
    
    // Process results
    for (const result of results) {
      if (result.success && result.parsed && result.analysis) {
        parsedPolicies.push(result.parsed);
        legalPageAnalyses.push(result.analysis);
        console.log(`[Scanner]   ✓ Parsed: ${result.parsed.wordCount} words (${result.parsed.language})`);
      } else if (!result.success) {
        errors.push(`Failed to fetch ${result.page.type} page (${result.page.url}): ${result.error}`);
      }
    }
    
    console.log(`[Scanner] Completed: ${parsedPolicies.length}/${pagesToFetch.length} pages fetched`);
  }
  
  // TODO: Re-enable heavy analysis features in V2 expansion plan
  // TEMPORARY: Bypass heavy checks for Performance Optimization
  // These features are temporarily disabled to speed up scans.
  // The scanner now focuses ONLY on Privacy Policy and Terms extraction.
  console.log('[ComprehensiveScan] PERFORMANCE MODE: Bypassing heavy checks (cookies, scripts, security, trackers)');
  
  // BYPASSED: Script extraction (was consuming time analyzing all scripts)
  // const scripts = extractScripts(mainScanResult.html);
  const scripts: Array<{ src: string; type: string; content: string }> = [];
  
  // BYPASSED: Cookie extraction (was parsing all cookies)
  // const cookies = extractCookies(mainScanResult.cookies, mainScanResult.finalUrl);
  const cookies: Array<{ name: string; domain: string; httpOnly: boolean; secure: boolean; sameSite: string; expires: string }> = [];
  
  // BYPASSED: Tracker detection (was analyzing scripts and network requests)
  // const tracking = detectTrackers(mainScanResult.html, scripts, cookies, mainScanResult.networkRequests);
  const tracking: Array<{ name: string; category: string }> = [];
  
  // BYPASSED: Third-party service detection (was analyzing network requests)
  // const thirdParties = detectThirdPartyServices(mainScanResult.networkRequests, mainScanResult.finalUrl);
  const thirdParties: Array<{ name: string; category: string }> = [];
  
  // BYPASSED: Security header extraction (was checking response headers)
  // const security = extractSecurityHeaders(mainScanResult.responseHeaders || {}, mainScanResult.finalUrl);
  const security = {
    https: mainScanResult.finalUrl.startsWith('https://'), // Quick check from URL only
    hsts: false, // Placeholder - skipped for performance
    csp: false,  // Placeholder - skipped for performance
  };
  
  // BYPASSED: Contact info detection (was parsing entire HTML)
  // const contactInfo = detectContactInfo(mainScanResult.html);
  const contactInfo = {
    found: false, // Placeholder - skipped for performance
    email: undefined as string | undefined,
    phone: undefined as string | undefined,
  };
  
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
  
  // TEMPORARILY BYPASSED: Gap Analysis (saves ~2-3 seconds)
  // TODO V2: Re-enable by uncommenting the line below
  // const gapAnalysisResult = analyzePolicyGaps(
  //   tracking.map(t => ({ name: t.name })),
  //   parsedPolicies
  // );
  console.log(`[Scanner] ⚡ Gap Analysis BYPASSED for speed optimization`);
  const gapAnalysisResult: GapAnalysisResult = {
    totalTrackersDetected: 0,
    totalDisclosed: 0,
    totalMissing: 0,
    totalGenericDisclosure: 0,
    disclosureRate: 100,
    gaps: [],
    summary: {
      highRiskGaps: 0,
      mediumRiskGaps: 0,
      lowRiskGaps: 0,
    },
  };
  
  const complianceAuditResult = auditPolicyCompliance(parsedPolicies);
  
  // Run specialized audits in PARALLEL for speed optimization
  const privacyPolicy = parsedPolicies.find(p => p.type === 'privacy');
  const termsPolicy = parsedPolicies.find(p => p.type === 'terms');
  
  // Create audit promises for parallel execution
  const auditPromises: Promise<void>[] = [];
  let privacyPolicyAudit: PrivacyPolicyAudit | undefined;
  let termsConditionsAudit: TermsConditionsAudit | undefined;
  
  // Privacy policy audit promise
  if (privacyPolicy && privacyPolicy.fullText && privacyPolicy.wordCount > 10) {
    auditPromises.push((async () => {
      console.log(`\n[PrivacyElementCheck] Running 12-element privacy policy audit...`);
      console.log(`[PrivacyElementCheck] Policy text length: ${privacyPolicy.fullText.length} chars, words: ${privacyPolicy.wordCount}`);
      privacyPolicyAudit = auditPrivacyPolicy(privacyPolicy.fullText);
      console.log(`[PrivacyElementCheck] Results: Found=${privacyPolicyAudit.elementsFound}/12, Partial=${privacyPolicyAudit.elementsPartial}/12, Missing=${privacyPolicyAudit.elementsMissing}/12`);
      console.log(`[PrivacyElementCheck] Compliance: ${privacyPolicyAudit.compliancePercentage}%`);
    })());
  } else {
    console.log(`\n[PrivacyElementCheck] Skipped - no valid privacy policy found (policy: ${!!privacyPolicy}, wordCount: ${privacyPolicy?.wordCount || 0})`);
  }
  
  // TEMPORARILY BYPASSED: Terms & Conditions audit (saves ~3-5 seconds)
  // TODO V2: Re-enable by uncommenting the block below
  /*
  if (termsPolicy && termsPolicy.fullText && termsPolicy.wordCount > 10) {
    auditPromises.push((async () => {
      console.log(`\n[TermsConditionsCheck] Running 12-module T&C audit...`);
      console.log(`[TermsConditionsCheck] Terms text length: ${termsPolicy.fullText.length} chars, words: ${termsPolicy.wordCount}`);
      termsConditionsAudit = checkTermsConditions(termsPolicy.fullText);
      console.log(`[TermsConditionsCheck] Results: Found=${termsConditionsAudit.modulesFound}/12, Partial=${termsConditionsAudit.modulesPartial}/12, Missing=${termsConditionsAudit.modulesMissing}/12`);
      console.log(`[TermsConditionsCheck] Compliance: ${termsConditionsAudit.compliancePercentage}%`);
    })());
  } else {
    console.log(`\n[TermsConditionsCheck] Skipped - no valid terms policy found (policy: ${!!termsPolicy}, wordCount: ${termsPolicy?.wordCount || 0})`);
  }
  */
  console.log(`[Scanner] ⚡ Terms & Conditions audit BYPASSED for speed optimization`);
  
  // Wait for all audits to complete in parallel
  await Promise.all(auditPromises);
  
  const scanDuration = Date.now() - startTime;
  
  // PERFORMANCE MODE: Score based on Privacy Policy ONLY (100% weight)
  // TODO V2: Re-enable 50/50 split with Terms & Conditions
  const privacyPolicyScore = privacyPolicyAudit?.compliancePercentage || 0;
  const termsConditionsScore = 0; // BYPASSED - terms analysis skipped for speed
  
  // Calculate score: 100% Privacy Policy (terms bypassed)
  let combinedScore: number;
  if (privacyPolicyAudit) {
    // Privacy policy exists - use it at 100% weight
    combinedScore = privacyPolicyScore;
  } else {
    // No privacy policy found - score is 0
    combinedScore = 0;
  }
  combinedScore = Math.max(0, Math.min(100, combinedScore)); // Clamp 0-100
  
  // Determine compliance level based on privacy policy score only
  const privacyPolicyMissingCount = privacyPolicyAudit?.elementsMissing || 12;
  const termsMissingCount = 0; // BYPASSED
  const totalMissing = privacyPolicyMissingCount;
  
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
