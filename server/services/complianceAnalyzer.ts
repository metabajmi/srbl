import { scanWithBrowser, validateUrl, BrowserScanResult } from '../scanner/browser';
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
} from '../scanner/extractors';
import { evaluateAllRules, calculateScore } from '../rules/pdpl-rules';
import {
  ScanExtractionResult,
  DeterministicScanResult,
  ExtractedCookie,
} from '@shared/schema';

export interface AnalysisOptions {
  timeout?: number;
  retryCount?: number;
}

const DEFAULT_OPTIONS: AnalysisOptions = {
  timeout: 30000,
  retryCount: 2,
};

export async function analyzeSite(
  url: string,
  options: AnalysisOptions = {}
): Promise<DeterministicScanResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const startTime = Date.now();
  const errors: string[] = [];
  
  console.log(`[Analyzer] Starting deterministic analysis for: ${url}`);
  
  const validation = validateUrl(url);
  if (!validation.valid) {
    console.error(`[Analyzer] Invalid URL: ${validation.error}`);
    return createErrorResult(url, startTime, [`Invalid URL: ${validation.error}`]);
  }
  
  const normalizedUrl = validation.normalizedUrl!;
  console.log(`[Analyzer] Normalized URL: ${normalizedUrl}`);
  
  let browserResult: BrowserScanResult | null = null;
  let attempts = 0;
  
  while (attempts < opts.retryCount! && !browserResult) {
    attempts++;
    console.log(`[Analyzer] Attempt ${attempts} of ${opts.retryCount}`);
    
    try {
      browserResult = await scanWithBrowser(normalizedUrl);
      
      if (browserResult.errors.length > 0 && browserResult.html.length === 0) {
        console.warn(`[Analyzer] Attempt ${attempts} failed: ${browserResult.errors.join(', ')}`);
        browserResult = null;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`[Analyzer] Attempt ${attempts} error: ${errorMsg}`);
      errors.push(errorMsg);
    }
  }
  
  if (!browserResult || browserResult.html.length === 0) {
    console.error('[Analyzer] All attempts failed');
    return createErrorResult(normalizedUrl, startTime, errors.length > 0 ? errors : ['Failed to load page']);
  }
  
  console.log('[Analyzer] Browser scan complete, extracting data...');
  
  const scripts = extractScripts(browserResult.html);
  const cookies = extractCookies(browserResult.cookies, browserResult.finalUrl);
  const trackers = detectTrackers(browserResult.html, scripts, cookies, browserResult.networkRequests);
  const forms = extractForms(browserResult.html);
  const thirdPartyServices = detectThirdPartyServices(browserResult.networkRequests, browserResult.finalUrl);
  const security = extractSecurityHeaders(browserResult.responseHeaders, browserResult.finalUrl);
  const privacyPolicy = detectPrivacyPolicy(browserResult.html, browserResult.finalUrl);
  const termsAndConditions = detectTerms(browserResult.html, browserResult.finalUrl);
  const cookieBanner = detectCookieBanner(browserResult.html);
  const contactInfo = detectContactInfo(browserResult.html);
  
  const extractionResult: ScanExtractionResult = {
    url: normalizedUrl,
    scan_timestamp: new Date().toISOString(),
    scan_duration_ms: browserResult.loadTime,
    html_length: browserResult.html.length,
    scripts,
    cookies,
    trackers,
    forms,
    third_party_services: thirdPartyServices,
    security,
    privacy_policy: privacyPolicy,
    terms_and_conditions: termsAndConditions,
    cookie_banner: cookieBanner,
    contact_info: contactInfo,
    scan_errors: browserResult.errors,
  };
  
  console.log('[Analyzer] Data extraction complete, evaluating rules...');
  
  const ruleResults = evaluateAllRules(extractionResult);
  const scoreResult = calculateScore(ruleResults.all);
  
  const firstPartyCookies = cookies.filter(c => !c.thirdParty);
  const thirdPartyCookies = cookies.filter(c => c.thirdParty);
  const secureCookies = cookies.filter(c => c.secure);
  const httpOnlyCookies = cookies.filter(c => c.httpOnly);
  const sessionCookies = cookies.filter(c => !c.expires);
  const persistentCookies = cookies.filter(c => c.expires);
  
  const cookiesByCategory: Record<string, number> = {};
  for (const cookie of cookies) {
    const category = cookie.category || 'unknown';
    cookiesByCategory[category] = (cookiesByCategory[category] || 0) + 1;
  }
  
  const sensitiveDataTypes = Array.from(new Set(
    forms
      .filter(f => ['id_number', 'financial', 'health'].includes(f.dataCategory))
      .map(f => f.dataCategory)
  ));
  
  const crossBorderTransfers = thirdPartyServices.filter(s => s.crossBorder);
  
  const securePercentage = cookies.length > 0 
    ? (secureCookies.length / cookies.length) * 100 
    : 100;
  
  let securityScore = 100;
  if (!security.https) securityScore -= 30;
  if (!security.hsts) securityScore -= 15;
  if (!security.csp) securityScore -= 10;
  if (securePercentage < 70) securityScore -= 15;
  securityScore = Math.max(0, securityScore);
  
  const scanDuration = Date.now() - startTime;
  console.log(`[Analyzer] Analysis complete in ${scanDuration}ms`);
  
  const result: DeterministicScanResult = {
    url: normalizedUrl,
    scan_timestamp: new Date().toISOString(),
    scan_duration_ms: scanDuration,
    
    privacy_policy: privacyPolicy,
    cookies: {
      total: cookies.length,
      first_party: firstPartyCookies.length,
      third_party: thirdPartyCookies.length,
      secure_cookies: secureCookies.length,
      http_only_cookies: httpOnlyCookies.length,
      session_cookies: sessionCookies.length,
      persistent_cookies: persistentCookies.length,
      by_category: cookiesByCategory,
      list: cookies,
    },
    tracking: trackers,
    personal_data_collection: {
      forms_count: forms.length,
      fields: forms,
      sensitive_data_types: sensitiveDataTypes,
    },
    data_transfers: {
      third_party_services: thirdPartyServices,
      cross_border_transfers: crossBorderTransfers,
    },
    security: {
      ...security,
      secure_cookie_percentage: securePercentage,
      overall_security_score: securityScore,
    },
    
    pdpl_violations: ruleResults.violations,
    pdpl_passed_rules: ruleResults.passed,
    
    overall_score: scoreResult.overall,
    compliance_level: scoreResult.level,
    score_breakdown: scoreResult.breakdown,
    
    scan_errors: [...browserResult.errors, ...errors],
    partial_analysis: browserResult.errors.length > 0,
  };
  
  console.log(`[Analyzer] Final result: Score=${result.overall_score}, Level=${result.compliance_level}, Violations=${result.pdpl_violations.length}`);
  
  return result;
}

function createErrorResult(url: string, startTime: number, errors: string[]): DeterministicScanResult {
  return {
    url,
    scan_timestamp: new Date().toISOString(),
    scan_duration_ms: Date.now() - startTime,
    
    privacy_policy: {
      found: false,
      detection_method: 'not_found',
      content_accessible: false,
      elements_found: [],
      elements_missing: [],
    },
    cookies: {
      total: 0,
      first_party: 0,
      third_party: 0,
      secure_cookies: 0,
      http_only_cookies: 0,
      session_cookies: 0,
      persistent_cookies: 0,
      by_category: {},
      list: [],
    },
    tracking: [],
    personal_data_collection: {
      forms_count: 0,
      fields: [],
      sensitive_data_types: [],
    },
    data_transfers: {
      third_party_services: [],
      cross_border_transfers: [],
    },
    security: {
      https: false,
      hsts: false,
      csp: false,
      xFrameOptions: false,
      xContentTypeOptions: false,
      referrerPolicy: false,
      secure_cookie_percentage: 0,
      overall_security_score: 0,
    },
    
    pdpl_violations: [{
      rule_id: 'SCAN-ERROR',
      rule_name: 'خطأ في الفحص',
      article: 'غير محدد',
      data_source: 'scanner',
      condition: 'يجب أن يتم الفحص بنجاح',
      result: 'unable_to_detect',
      explanation: `فشل الفحص: ${errors.join(', ')}`,
      severity: 'critical',
    }],
    pdpl_passed_rules: [],
    
    overall_score: 0,
    compliance_level: 'low',
    score_breakdown: {
      privacy_policy_score: 0,
      consent_score: 0,
      security_score: 0,
      transparency_score: 0,
    },
    
    scan_errors: errors,
    partial_analysis: true,
  };
}

export function convertToLegacyFormat(result: DeterministicScanResult): {
  scan: {
    overallScore: number;
    complianceLevel: string;
    hasPrivacyPolicy: boolean;
    privacyPolicyUrl: string | null;
    hasTermsAndConditions: boolean;
    termsAndConditionsUrl: string | null;
    hasCookieBanner: boolean;
    hasContactInfo: boolean;
    partialAnalysis: boolean;
  };
  issues: Array<{
    severity: string;
    category: string;
    title: string;
    description: string;
    remediation: string;
    articleReference?: string;
  }>;
} {
  const issues = result.pdpl_violations.map(v => ({
    severity: v.severity,
    category: v.rule_id.toLowerCase().includes('privacy') ? 'privacy_policy' :
              v.rule_id.toLowerCase().includes('cookie') || v.rule_id.toLowerCase().includes('consent') ? 'cookies' :
              v.rule_id.toLowerCase().includes('security') ? 'security' :
              v.rule_id.toLowerCase().includes('contact') ? 'contact_info' :
              v.rule_id.toLowerCase().includes('terms') ? 'terms_and_conditions' :
              v.rule_id.toLowerCase().includes('transfer') ? 'data_transfer' :
              v.rule_id.toLowerCase().includes('tracker') ? 'tracking' :
              'general',
    title: v.rule_name,
    description: v.explanation,
    remediation: getRemediation(v.rule_id),
    articleReference: v.article,
  }));
  
  return {
    scan: {
      overallScore: result.overall_score,
      complianceLevel: result.compliance_level,
      hasPrivacyPolicy: result.privacy_policy.found,
      privacyPolicyUrl: result.privacy_policy.url || null,
      hasTermsAndConditions: result.cookies.total > 0 ? true : false,
      termsAndConditionsUrl: null,
      hasCookieBanner: result.tracking.length > 0 ? result.pdpl_violations.filter(v => v.rule_id.includes('COOKIE')).length === 0 : true,
      hasContactInfo: result.pdpl_violations.filter(v => v.rule_id.includes('CONTACT')).length === 0,
      partialAnalysis: result.partial_analysis,
    },
    issues,
  };
}

function getRemediation(ruleId: string): string {
  const remediations: Record<string, string> = {
    'PDPL-ART12-PRIVACY-POLICY': 'قم بإنشاء صفحة سياسة خصوصية شاملة تتوافق مع متطلبات نظام حماية البيانات الشخصية',
    'PDPL-ART12-PRIVACY-ACCESSIBLE': 'تأكد من أن سياسة الخصوصية متاحة ويمكن الوصول إليها بسهولة',
    'PDPL-ART17-COOKIE-CONSENT': 'أضف لافتة موافقة للكوكيز تمنح المستخدم خيارات واضحة للقبول أو الرفض',
    'PDPL-ART17-CONSENT-MECHANISM': 'قم بتحسين آلية الموافقة لتوفير خيار رفض واضح وإمكانية تخصيص الموافقة',
    'PDPL-ART5-DATA-COLLECTION-TRANSPARENCY': 'قم بالإفصاح عن أنواع البيانات التي تجمعها وأغراض استخدامها في سياسة الخصوصية',
    'PDPL-ART29-DATA-TRANSFER': 'قم بالإفصاح عن نقل البيانات خارج المملكة وتوفير الضمانات الكافية',
    'PDPL-ART19-SECURITY-HTTPS': 'قم بتفعيل شهادة SSL/TLS لتشفير الاتصالات',
    'PDPL-ART19-SECURITY-HSTS': 'أضف رأس Strict-Transport-Security لتعزيز أمان HTTPS',
    'PDPL-ART19-COOKIE-SECURITY': 'تأكد من أن الكوكيز تستخدم علامات Secure و HttpOnly و SameSite',
    'PDPL-ART4-CONTACT-INFO': 'قم بإضافة معلومات اتصال واضحة للتواصل مع جهة التحكم في البيانات',
    'PDPL-ART12-TERMS': 'قم بإنشاء صفحة الشروط والأحكام',
    'PDPL-ART6-THIRD-PARTY-TRACKERS': 'قم بالإفصاح عن تقنيات التتبع المستخدمة والحصول على موافقة مسبقة',
  };
  
  return remediations[ruleId] || 'قم بمراجعة المتطلبات وتطبيق الإجراءات التصحيحية المناسبة';
}
