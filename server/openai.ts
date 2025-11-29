import OpenAI from "openai";
import * as cheerio from "cheerio";

// Initialize OpenAI with error handling
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error("WARNING: OPENAI_API_KEY is not set in environment variables");
}

// Initialize OpenAI client
const openai = new OpenAI({ 
  apiKey: apiKey || "missing-key"
});

export interface ComplianceAnalysisResult {
  overallScore: number;
  complianceLevel: "low" | "medium" | "high";
  findings: {
    hasPrivacyPolicy: boolean;
    privacyPolicyUrl?: string;
    hasTermsAndConditions: boolean;
    termsAndConditionsUrl?: string;
    hasCookieBanner: boolean;
    hasDataCollectionForms: boolean;
    hasContactInfo: boolean;
  };
  issues: Array<{
    severity: "critical" | "warning" | "suggestion";
    category: string;
    title: string;
    description: string;
    articleReference?: string;
    regulation?: string;
    remediation: string;
    affectedElement?: string;
    documentType?: "privacy_policy" | "terms" | "cookie_banner" | "consent";
    violatingText?: string;
    requirementId?: string;
  }>;
}

interface DetectedLinks {
  hasPrivacyPolicy: boolean;
  privacyPolicyUrl?: string;
  hasTermsAndConditions: boolean;
  termsAndConditionsUrl?: string;
  hasCookieBanner: boolean;
  hasContactInfo: boolean;
}

// Helper to resolve relative URLs to absolute
function resolveUrl(href: string, baseUrl: string): string {
  try {
    if (href.startsWith('http://') || href.startsWith('https://')) {
      return href;
    }
    const base = new URL(baseUrl);
    if (href.startsWith('/')) {
      return `${base.protocol}//${base.host}${href}`;
    }
    return new URL(href, baseUrl).href;
  } catch {
    return href;
  }
}

// Helper to check if a URL is a valid page link (not asset, mailto, tel, etc.)
function isValidPageUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim().toLowerCase();
  
  // Reject invalid patterns
  if (trimmed.startsWith('mailto:') || 
      trimmed.startsWith('tel:') || 
      trimmed.startsWith('javascript:') ||
      trimmed === '#' ||
      (trimmed.startsWith('#') && !trimmed.includes('/'))) {
    return false;
  }
  
  // Reject asset files (images, scripts, styles, fonts, etc.)
  const assetExtensions = /\.(jpg|jpeg|png|gif|svg|webp|ico|css|js|woff|woff2|ttf|eot|pdf|zip|mp4|mp3|avi|mov)(\?.*)?$/i;
  if (assetExtensions.test(trimmed)) {
    return false;
  }
  
  return true;
}

// URLs that are NOT actual privacy policies (settings, preferences, help pages)
const excludedPrivacyUrls = [
  'privacy-settings', 'privacy-preferences', 'privacy-center', 'privacy-controls',
  'privacy-options', 'privacy-dashboard', 'privacy-help', 'privacy-support',
  'manage-privacy', 'your-privacy', 'ads/privacy', 'cookie-settings',
  'إعدادات-الخصوصية', 'تفضيلات-الخصوصية'
];

// URLs that are NOT actual terms pages (settings, help pages)
const excludedTermsUrls = [
  'terms-settings', 'terms-help', 'terms-support', 'legal-help',
  'إعدادات-الشروط'
];

// Check if URL is an excluded non-policy page
function isExcludedUrl(url: string, excludeList: string[]): boolean {
  const lower = url.toLowerCase();
  return excludeList.some(excluded => lower.includes(excluded));
}

// Use cheerio for accurate DOM-based link detection
function detectLinksInHTML(htmlContent: string, baseUrl: string): DetectedLinks {
  const $ = cheerio.load(htmlContent);
  
  // Privacy policy - text matching (includes compound Arabic phrases)
  const privacyExactPhrases = [
    'privacy policy', 'privacy statement', 'privacy notice', 'data protection policy',
    'datenschutzerklärung', 'política de privacidad', 'politique de confidentialité',
    'سياسة الخصوصية', 'سياسه الخصوصيه', 'بيان الخصوصية', 'سياسة حماية البيانات',
    // Compound Arabic phrases (common on Saudi e-commerce sites)
    'سياسة الاستخدام والخصوصية', 'الخصوصية وشروط الاستخدام', 'سياسة الخصوصية وحماية البيانات',
    'إشعار الخصوصية', 'سياسة خصوصية', 'privacy & terms', 'privacy and terms'
  ];
  
  // Privacy - URL patterns that definitively indicate a policy page
  const privacyStrongUrlPatterns = [
    '/privacy-policy', '/privacypolicy', '/privacy-statement', '/privacy-notice',
    '/data-protection', '/datenschutz', '/سياسة-الخصوصية', '/privacy',
    // Shopify and e-commerce patterns
    '/policies/privacy-policy', '/policies/privacy', '/pages/privacy',
    '/ar/privacy', '/en/privacy', 'privacy-policy.html'
  ];
  
  // Terms - text matching (includes compound Arabic phrases)
  const termsExactPhrases = [
    'terms of service', 'terms and conditions', 'terms & conditions', 'terms of use',
    'user agreement', 'service agreement', 'legal terms', 'terms and conditions of use',
    'شروط الاستخدام', 'الشروط والأحكام', 'شروط الخدمة', 'اتفاقية المستخدم',
    // Compound Arabic phrases
    'سياسة الاستخدام والخصوصية', 'شروط وأحكام', 'الاستخدام والخصوصية',
    'سياسة الاستبدال والاسترجاع', 'سياسة الإرجاع', 'سياسة الاستبدال'
  ];
  
  // Terms - URL patterns that definitively indicate a terms page
  const termsStrongUrlPatterns = [
    '/terms-of-service', '/terms-and-conditions', '/tos', '/terms-of-use',
    '/terms', '/legal', '/user-agreement', '/service-agreement',
    '/الشروط-والأحكام', '/شروط-الاستخدام',
    // Shopify and e-commerce patterns
    '/policies/terms-of-service', '/policies/terms', '/pages/terms',
    '/policies/refund-policy', '/policies/shipping-policy',
    '/ar/terms', '/en/terms', 'terms.html'
  ];
  
  let privacyPolicyUrl: string | undefined;
  let termsUrl: string | undefined;
  let hasCookieBanner = false;
  let hasContactInfo = false;
  
  // Scan all anchor tags - require EXACT phrase matching or strong URL patterns
  $('a').each((_, element) => {
    const $el = $(element);
    const href = $el.attr('href') || '';
    const text = $el.text().toLowerCase().trim();
    const title = ($el.attr('title') || '').toLowerCase();
    const ariaLabel = ($el.attr('aria-label') || '').toLowerCase();
    
    if (!isValidPageUrl(href)) return;
    
    const hrefLower = href.toLowerCase();
    const fullUrl = resolveUrl(href, baseUrl);
    
    // Check for privacy policy - require EXACT phrase or strong URL pattern
    if (!privacyPolicyUrl) {
      // Skip excluded URLs (settings, preferences, help pages)
      if (isExcludedUrl(hrefLower, excludedPrivacyUrls)) {
        console.log(`[DOM] Skipping excluded privacy URL: ${href}`);
        return;
      }
      
      // Check for EXACT phrase match in anchor text (not partial "privacy" match)
      const hasExactPhraseMatch = privacyExactPhrases.some(phrase => 
        text.includes(phrase) || title.includes(phrase) || ariaLabel.includes(phrase)
      );
      
      // Check for strong URL pattern (definitively indicates a policy page)
      const hasStrongUrlPattern = privacyStrongUrlPatterns.some(pattern => 
        hrefLower.includes(pattern) || hrefLower.endsWith(pattern.replace('/', ''))
      );
      
      // Only accept if: exact phrase match OR strong URL pattern
      if (hasExactPhraseMatch || hasStrongUrlPattern) {
        privacyPolicyUrl = fullUrl;
        console.log(`[DOM] Found privacy policy: href="${href}", text="${text.substring(0,50)}", match=${hasExactPhraseMatch ? 'EXACT_PHRASE' : 'STRONG_URL'}`);
      }
    }
    
    // Check for terms & conditions - require EXACT phrase or strong URL pattern
    if (!termsUrl) {
      // Skip excluded URLs
      if (isExcludedUrl(hrefLower, excludedTermsUrls)) {
        console.log(`[DOM] Skipping excluded terms URL: ${href}`);
        return;
      }
      
      // Check for EXACT phrase match in anchor text
      const hasExactPhraseMatch = termsExactPhrases.some(phrase => 
        text.includes(phrase) || title.includes(phrase) || ariaLabel.includes(phrase)
      );
      
      // Check for strong URL pattern
      const hasStrongUrlPattern = termsStrongUrlPatterns.some(pattern => 
        hrefLower.includes(pattern) || hrefLower.endsWith(pattern.replace('/', ''))
      );
      
      // Only accept if: exact phrase match OR strong URL pattern
      if (hasExactPhraseMatch || hasStrongUrlPattern) {
        termsUrl = fullUrl;
        console.log(`[DOM] Found terms: href="${href}", text="${text.substring(0,50)}", match=${hasExactPhraseMatch ? 'EXACT_PHRASE' : 'STRONG_URL'}`);
      }
    }
  });
  
  // Cookie banner detection - comprehensive multi-method approach
  const htmlLowerContent = $.html().toLowerCase();
  
  // Method 1: Look for cookie management platform scripts (most reliable for dynamic banners)
  const cookieScriptPatterns = [
    // Major cookie consent platforms
    /onetrust/i, /cookiebot/i, /cookieconsent/i, /cookieyes/i,
    /osano/i, /iubenda/i, /trustarc/i, /quantcast/i,
    /didomi/i, /usercentrics/i, /complianz/i, /termly/i,
    /cookiepro/i, /cookielaw/i, /gdpr-cookie/i,
    // Common cookie script patterns
    /cookie-consent/i, /cookie-notice/i, /cookie-banner/i,
    /consent-manager/i, /privacy-consent/i, /cookie-policy/i,
    // JavaScript cookie management
    /cookieconsent\.min\.js/i, /cookie\.js/i, /gdpr\.js/i,
    /consent\.js/i, /cookie-consent\.js/i
  ];
  
  // Saudi/MENA e-commerce platforms with built-in cookie consent
  const ecommercePlatformsWithConsent = [
    // Zid platform (major Saudi e-commerce platform) - has built-in PDPL cookie consent
    { pattern: /assets\.zid\.store/i, name: 'Zid' },
    { pattern: /zidapi/i, name: 'Zid API' },
    // Salla platform (Saudi e-commerce) - has built-in cookie consent
    { pattern: /salla\.sa/i, name: 'Salla' },
    { pattern: /cdn\.salla\.network/i, name: 'Salla CDN' },
    // Shopify with MENA themes often include consent
    { pattern: /shopify.*pdpl/i, name: 'Shopify PDPL' },
    { pattern: /shopify.*cookie-consent/i, name: 'Shopify Cookie Consent' }
  ];
  
  let detectedPlatform: string | null = null;
  
  // Check scripts for cookie platforms
  $('script').each((_, el) => {
    const src = $(el).attr('src') || '';
    const scriptContent = $(el).html() || '';
    const combined = src + ' ' + scriptContent;
    
    if (cookieScriptPatterns.some(p => p.test(combined))) {
      hasCookieBanner = true;
      console.log(`[DOM] Found cookie platform script: ${src.substring(0, 100)}`);
      return false; // break
    }
    
    // Check for e-commerce platforms with built-in consent
    for (const platform of ecommercePlatformsWithConsent) {
      if (platform.pattern.test(src)) {
        detectedPlatform = platform.name;
        console.log(`[DOM] Detected ${platform.name} platform (has built-in cookie consent)`);
        break;
      }
    }
  });
  
  // If we detected a Saudi e-commerce platform, they typically have dynamic cookie consent
  if (!hasCookieBanner && detectedPlatform) {
    // Check for analytics/marketing scripts that require consent
    const hasAnalyticsScripts = $('script').toArray().some(el => {
      const src = $(el).attr('src') || '';
      const content = $(el).html() || '';
      return /tiktok|snapchat|facebook|google.*analytics|gtag|fbq|ttq|snaptr/i.test(src + content);
    });
    
    if (hasAnalyticsScripts) {
      hasCookieBanner = true;
      console.log(`[DOM] ${detectedPlatform} platform with analytics scripts - assuming dynamic cookie consent`);
    }
  }
  
  // Method 2: Look for cookie/consent related CSS or data attributes (works even for dynamically loaded banners)
  if (!hasCookieBanner) {
    const cookieSelectors = [
      '[class*="cookie"]', '[id*="cookie"]',
      '[class*="consent"]', '[id*="consent"]',
      '[class*="gdpr"]', '[id*="gdpr"]',
      '[class*="privacy-banner"]', '[id*="privacy-banner"]',
      '[class*="cookie-banner"]', '[id*="cookie-banner"]',
      '[class*="cookie-notice"]', '[id*="cookie-notice"]',
      '[data-cookieconsent]', '[data-consent]',
      '[class*="cookie-widget"]', '[id*="cookie-widget"]',
      '[class*="cookie-modal"]', '[id*="cookie-modal"]',
      '[class*="gdpr-banner"]', '[id*="gdpr-banner"]',
      // Additional Arabic-specific patterns
      '[class*="خصوصية"]', '[id*="خصوصية"]',
      '[class*="موافقة"]', '[id*="موافقة"]'
    ];
    
    for (const selector of cookieSelectors) {
      const elements = $(selector);
      if (elements.length > 0) {
        const text = elements.text().toLowerCase();
        // More relaxed matching - if it's in a cookie-named element, it's likely a cookie banner
        if (text.includes('cookie') || text.includes('كوكيز') || text.includes('consent') || 
            text.includes('موافق') || text.includes('قبول') || text.includes('أوافق') ||
            text.includes('ملفات تعريف') || text.includes('خصوصية') || text.includes('الارتباط') ||
            text.includes('قبول الكل') || text.includes('الإعدادات') || text.includes('تفضيلات')) {
          hasCookieBanner = true;
          console.log(`[DOM] Found cookie banner element: ${selector}`);
          break;
        }
      }
    }
  }
  
  // Method 3: Check for cookie-related text patterns in page (expanded Arabic patterns)
  if (!hasCookieBanner) {
    const bodyText = $('body').text();
    
    const cookieTextPatterns = [
      // Arabic patterns - comprehensive coverage for Saudi sites
      /نستخدم ملفات تعريف الارتباط/i,
      /ملفات تعريف الارتباط/i,
      /ملفات الكوكيز/i,
      /تقدّر خصوصيتك/i,
      /نقدر خصوصيتك/i,
      /نحترم خصوصيتك/i,
      /الموافقة على استخدام/i,
      /نستخدم بيانات/i,
      /قبول جميع/i,
      /قبول الكل/i,
      /رفض ملفات/i,
      /البيانات الشخصية/i,
      /وظائف مماثلة لمعالجة/i,
      /التحليل الإحصائي/i,
      /الإعلانات المخصصة/i,
      /تفضيلات الاستخدام/i,
      /إلغاؤها في أي وقت/i,
      /تعرّف على المزيد/i,
      /الشروط والأحكام/i,
      /إشعار قانوني/i,
      // English patterns
      /we use cookies/i,
      /cookie consent/i,
      /accept cookies/i,
      /accept all/i,
      /cookie preferences/i,
      /cookie policy/i,
      /this website uses cookies/i,
      /by continuing to use/i,
      /we value your privacy/i,
      /manage preferences/i
    ];
    
    if (cookieTextPatterns.some(p => p.test(bodyText) || p.test(htmlLowerContent))) {
      hasCookieBanner = true;
      console.log(`[DOM] Found cookie banner via text pattern match`);
    }
  }
  
  // Method 4: Check for accept/settings button pairs (common in cookie banners)
  if (!hasCookieBanner) {
    const buttonTexts: string[] = [];
    $('button, [role="button"], a[class*="accept"], a[class*="agree"], span[class*="button"]').each((_, el) => {
      buttonTexts.push($(el).text().trim().toLowerCase());
    });
    
    // Arabic and English patterns for accept/decline/settings buttons
    const acceptPatterns = /(accept|agree|ok|yes|موافق|أوافق|قبول|قبول الكل|نعم|✓)/i;
    const settingsPatterns = /(settings|preferences|manage|customize|الإعدادات|تفضيلات|إدارة)/i;
    const hasAcceptButton = buttonTexts.some((t: string) => acceptPatterns.test(t));
    const hasSettingsButton = buttonTexts.some((t: string) => settingsPatterns.test(t));
    
    // Accept + settings is also a common cookie banner pattern
    if (hasAcceptButton && hasSettingsButton) {
      hasCookieBanner = true;
      console.log(`[DOM] Found cookie banner via accept/settings button pair`);
    }
  }
  
  // Method 5: Check HTML structure for common banner implementations (fixed/sticky positioned)
  if (!hasCookieBanner) {
    const potentialBanners = $('[style*="position: fixed"], [style*="position: sticky"], [class*="fixed"], [class*="sticky"]').filter(function() {
      const text = $(this).text().toLowerCase();
      return text.length > 20 && text.length < 3000;
    });
    
    if (potentialBanners.length > 0) {
      const bannerText = potentialBanners.text().toLowerCase();
      if (bannerText.includes('cookie') || bannerText.includes('كوكيز') || 
          bannerText.includes('consent') || bannerText.includes('خصوصية') ||
          bannerText.includes('ملفات تعريف') || bannerText.includes('الارتباط')) {
        hasCookieBanner = true;
        console.log(`[DOM] Found cookie banner via fixed/sticky element`);
      }
    }
  }
  
  // Method 6: Check for inline styles or CSS that suggests cookie overlay
  if (!hasCookieBanner) {
    // Check for elements with z-index suggesting overlay (common for cookie banners)
    if (htmlLowerContent.includes('z-index: 9999') || htmlLowerContent.includes('z-index:9999') ||
        htmlLowerContent.includes('z-index: 999999') || htmlLowerContent.includes('z-index:999999')) {
      // Verify it's cookie related
      const highZElements = $('[style*="z-index: 9999"], [style*="z-index:9999"], [style*="z-index: 999999"]');
      highZElements.each((_, el) => {
        const text = $(el).text().toLowerCase();
        if (text.includes('cookie') || text.includes('كوكيز') || text.includes('خصوصية') ||
            text.includes('consent') || text.includes('قبول') || text.includes('موافق')) {
          hasCookieBanner = true;
          console.log(`[DOM] Found cookie banner via high z-index overlay`);
          return false;
        }
      });
    }
  }
  
  // Contact info detection
  const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
  const phonePattern = /\+?\d{1,3}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}/;
  const htmlText = $.text();
  
  hasContactInfo = emailPattern.test(htmlText) || phonePattern.test(htmlText);
  
  // Also check for mailto links
  if (!hasContactInfo) {
    hasContactInfo = $('a[href^="mailto:"]').length > 0;
  }
  
  // Check for contact page link
  if (!hasContactInfo) {
    $('a').each((_, el) => {
      const href = ($(el).attr('href') || '').toLowerCase();
      const text = $(el).text().toLowerCase();
      if (href.includes('contact') || text.includes('contact') || 
          text.includes('اتصل') || text.includes('تواصل')) {
        hasContactInfo = true;
        return false; // break
      }
    });
  }
  
  const result = {
    hasPrivacyPolicy: !!privacyPolicyUrl,
    privacyPolicyUrl,
    hasTermsAndConditions: !!termsUrl,
    termsAndConditionsUrl: termsUrl,
    hasCookieBanner,
    hasContactInfo,
  };
  
  console.log("[DOM] Detection results:", result);
  
  return result;
}

// Interface for deep policy content analysis results
export interface PolicyContentViolation {
  severity: "critical" | "warning" | "suggestion";
  category: string;
  title: string;
  description: string;
  articleReference: string;
  regulation: string;
  remediation: string;
  documentType: "privacy_policy" | "terms" | "cookie_banner" | "consent";
  violatingText?: string;
  requirementId?: string;
}

// List of realistic user agents for rotation
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
];

// Fetch policy page content with retry logic and better headers
async function fetchPolicyContent(policyUrl: string, retries = 3): Promise<string | null> {
  const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`[FETCH] Attempt ${attempt}/${retries} - Fetching: ${policyUrl}`);
      const controller = new AbortController();
      // Increase timeout: 30 seconds for first attempt, 45 for subsequent
      const timeoutMs = attempt === 1 ? 30000 : 45000;
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      
      const response = await fetch(policyUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'ar-SA,ar;q=0.9,en-US;q=0.8,en;q=0.7',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Cache-Control': 'max-age=0',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Upgrade-Insecure-Requests': '1',
        },
        redirect: 'follow',
      });
      clearTimeout(timeout);
      
      if (!response.ok) {
        console.log(`[FETCH] HTTP ${response.status} for ${policyUrl}`);
        // Retry on 403/429/5xx errors
        if ((response.status === 403 || response.status === 429 || response.status >= 500) && attempt < retries) {
          const delay = attempt * 2000; // Exponential backoff
          console.log(`[FETCH] Retrying in ${delay}ms...`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        return null;
      }
      
      const html = await response.text();
      if (html.length < 500) {
        console.log(`[FETCH] Response too short (${html.length} chars), might be blocked`);
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, 2000));
          continue;
        }
      }
      
      console.log(`[FETCH] Successfully fetched ${policyUrl}: ${html.length} chars`);
      return html;
    } catch (error: any) {
      console.log(`[FETCH] Attempt ${attempt} error: ${error.message}`);
      if (error.name === 'AbortError' && attempt < retries) {
        const delay = attempt * 3000;
        console.log(`[FETCH] Timeout, retrying in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      if (attempt === retries) {
        console.log(`[FETCH] All ${retries} attempts failed for ${policyUrl}`);
        return null;
      }
    }
  }
  return null;
}

// Extract clean text from HTML for policy analysis
function extractPolicyText(html: string): string {
  const $ = cheerio.load(html);
  
  // Remove script, style, nav, header, footer elements
  $('script, style, nav, header, footer, aside, [role="navigation"], [role="banner"]').remove();
  
  // Try to find main content area
  let mainContent = $('main, article, [role="main"], .content, .policy-content, .privacy-policy, .terms-content').first();
  
  if (mainContent.length === 0) {
    // Fallback to body
    mainContent = $('body');
  }
  
  // Get text and clean it
  let text = mainContent.text()
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim();
  
  // Limit to reasonable size for analysis
  if (text.length > 30000) {
    text = text.substring(0, 30000) + "\n... [تم اختصار المحتوى]";
  }
  
  return text;
}

// Deep analysis of privacy policy content against PDPL requirements
export async function analyzePrivacyPolicyContent(policyHtml: string, policyUrl: string): Promise<PolicyContentViolation[]> {
  if (!apiKey || apiKey === "missing-key") {
    console.warn("[POLICY_ANALYSIS] No API key, skipping deep privacy policy analysis");
    return [];
  }
  
  const policyText = extractPolicyText(policyHtml);
  if (policyText.length < 100) {
    console.log("[POLICY_ANALYSIS] Policy text too short for analysis");
    return [{
      severity: "critical",
      category: "privacy_policy",
      title: "محتوى سياسة الخصوصية غير كافٍ",
      description: "سياسة الخصوصية المكتشفة لا تحتوي على محتوى كافٍ للتحليل. قد تكون الصفحة فارغة أو تستخدم تقنيات تحميل ديناميكية.",
      articleReference: "المادة 12 من نظام حماية البيانات الشخصية",
      regulation: "يجب أن تكون سياسة الخصوصية شاملة ومفصلة",
      remediation: "تأكد من أن صفحة سياسة الخصوصية تحتوي على جميع العناصر المطلوبة قانونياً",
      documentType: "privacy_policy",
      requirementId: "pp_content"
    }];
  }
  
  console.log(`[POLICY_ANALYSIS] Analyzing privacy policy content (${policyText.length} chars)`);
  
  const systemPrompt = `أنت محلل قانوني متخصص في نظام حماية البيانات الشخصية السعودي (PDPL).
مهمتك تحليل محتوى سياسة الخصوصية بدقة وتحديد المخالفات المحددة للقانون.

## المتطلبات القانونية الإلزامية لسياسة الخصوصية (المادة 12 من PDPL):

### العناصر الإلزامية التي يجب فحصها:
1. **pp1: هوية جهة التحكم** - اسم الجهة الرسمي ونشاطها
2. **pp2: بيانات التواصل** - بريد إلكتروني، هاتف، عنوان للتواصل بشأن البيانات
3. **pp3: أنواع البيانات المجمعة** - تحديد واضح لفئات البيانات الشخصية
4. **pp4: أغراض المعالجة** - توضيح الأسباب المحددة لجمع كل نوع من البيانات
5. **pp5: المسوغ النظامي** - الأساس القانوني للمعالجة (موافقة، عقد، التزام نظامي)
6. **pp6: مشاركة البيانات** - الجهات التي تُشارَك معها البيانات وأسباب المشاركة
7. **pp7: النقل الدولي** - إذا كانت البيانات تُنقل خارج المملكة، يجب توضيح الدول والضمانات
8. **pp8: مدة الاحتفاظ** - المدة الزمنية للاحتفاظ بالبيانات ومعايير تحديدها
9. **pp9: حقوق صاحب البيانات** - يجب ذكر جميع الحقوق:
   - حق العلم (المادة 4 فقرة 1)
   - حق الوصول (المادة 4 فقرة 2)
   - حق الحصول على نسخة (المادة 4 فقرة 3)
   - حق التصحيح (المادة 4 فقرة 4)
   - حق الإتلاف (المادة 4 فقرة 5)
   - حق الاعتراض على المعالجة
   - حق سحب الموافقة
10. **pp10: آلية تقديم الشكاوى** - كيفية تقديم شكوى متعلقة بالخصوصية

## تعليمات التحليل:
- ابحث في النص عن كل عنصر من العناصر أعلاه
- إذا كان العنصر مفقوداً تماماً = مخالفة حرجة (critical)
- إذا كان العنصر موجوداً لكن غير واضح أو ناقص = تحذير (warning)
- إذا كان يمكن تحسين الصياغة = اقتراح (suggestion)
- اقتبس النص المخالف إن وجد (violatingText)
- حدد المادة القانونية المخالفة بدقة`;

  const userPrompt = `## تحليل سياسة الخصوصية

**رابط السياسة:** ${policyUrl}

**محتوى السياسة:**
${policyText}

---

## المطلوب:
حلل المحتوى أعلاه وحدد المخالفات لمتطلبات نظام حماية البيانات الشخصية السعودي.

لكل مخالفة، قدم:
- severity: critical/warning/suggestion
- requirementId: معرف المتطلب المخالف (pp1, pp2, pp3, إلخ)
- title: عنوان المخالفة بالعربية
- description: وصف تفصيلي للمشكلة
- violatingText: اقتباس من النص إذا كان هناك نص مخالف
- articleReference: المادة القانونية المخالفة
- remediation: كيفية إصلاح المخالفة

أجب بصيغة JSON فقط:
{
  "violations": [
    {
      "severity": "critical|warning|suggestion",
      "requirementId": "pp1|pp2|pp3|...",
      "title": "عنوان المخالفة",
      "description": "وصف تفصيلي",
      "violatingText": "اقتباس من النص أو null",
      "articleReference": "المادة X من PDPL",
      "remediation": "كيفية الإصلاح"
    }
  ],
  "summary": {
    "compliantElements": ["قائمة العناصر المتوافقة"],
    "partiallyCompliant": ["قائمة العناصر الجزئية"],
    "missingElements": ["قائمة العناصر المفقودة"]
  }
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      max_tokens: 4096,
      temperature: 0,
    });
    
    const result = JSON.parse(response.choices[0].message.content || "{}");
    console.log("[POLICY_ANALYSIS] Privacy policy analysis complete:", result.summary);
    
    // Transform violations to our format
    const violations: PolicyContentViolation[] = (result.violations || []).map((v: any) => ({
      severity: v.severity || "warning",
      category: "privacy_policy_content",
      title: v.title,
      description: v.description,
      articleReference: v.articleReference,
      regulation: "نظام حماية البيانات الشخصية",
      remediation: v.remediation,
      documentType: "privacy_policy" as const,
      violatingText: v.violatingText || undefined,
      requirementId: v.requirementId
    }));
    
    return violations;
  } catch (error: any) {
    console.error("[POLICY_ANALYSIS] Error analyzing privacy policy:", error.message);
    return [];
  }
}

// Deep analysis of terms & conditions content
export async function analyzeTermsContent(termsHtml: string, termsUrl: string): Promise<PolicyContentViolation[]> {
  if (!apiKey || apiKey === "missing-key") {
    console.warn("[TERMS_ANALYSIS] No API key, skipping deep terms analysis");
    return [];
  }
  
  const termsText = extractPolicyText(termsHtml);
  if (termsText.length < 100) {
    console.log("[TERMS_ANALYSIS] Terms text too short for analysis");
    return [{
      severity: "critical",
      category: "terms_and_conditions",
      title: "محتوى الشروط والأحكام غير كافٍ",
      description: "صفحة الشروط والأحكام لا تحتوي على محتوى كافٍ للتحليل.",
      articleReference: "نظام التجارة الإلكترونية - المادة 7",
      regulation: "يجب أن تكون الشروط والأحكام واضحة ومفصلة",
      remediation: "أضف محتوى شامل للشروط والأحكام",
      documentType: "terms",
      requirementId: "tc_content"
    }];
  }
  
  console.log(`[TERMS_ANALYSIS] Analyzing terms content (${termsText.length} chars)`);
  
  const systemPrompt = `أنت محلل قانوني متخصص في التجارة الإلكترونية والامتثال القانوني السعودي.
مهمتك تحليل محتوى الشروط والأحكام بدقة وتحديد المخالفات.

## المتطلبات الإلزامية للشروط والأحكام (نظام التجارة الإلكترونية ولوائحه):

### العناصر الإلزامية:
1. **tc1: سياسة الاستبدال والاسترجاع** - حق المستهلك في الاستبدال/الاسترجاع خلال 7 أيام (إلزامي)
2. **tc2: شروط الاستخدام** - قواعد استخدام الموقع والخدمات
3. **tc3: حدود المسؤولية** - توضيح مسؤولية كل طرف
4. **tc4: القانون الحاكم** - يجب أن يكون القانون السعودي هو الحاكم
5. **tc5: الاختصاص القضائي** - تحديد المحاكم المختصة
6. **tc6: حقوق الملكية الفكرية** - حماية المحتوى والعلامات التجارية
7. **tc7: الضمانات** - ضمان المنتجات والخدمات إن وجد
8. **tc8: إجراءات الشكاوى** - آلية التظلم وتقديم الشكاوى

### نقاط حرجة للمتاجر الإلكترونية (قائمة التقييم الذاتي):
- إتاحة إلغاء حساب العميل (حق إتلاف البيانات)
- إتاحة وقف الإعلانات الإلكترونية (إلغاء الاشتراك)
- الإفصاح عن السجل التجاري والرقم الضريبي

### شروط مخالفة للنظام (يجب الإبلاغ عنها):
- شروط تعفي البائع من المسؤولية كلياً
- شروط تحرم المستهلك من حق الاسترجاع
- شروط تفرض اختصاص محاكم أجنبية
- شروط تنتهك حقوق المستهلك`;

  const userPrompt = `## تحليل الشروط والأحكام

**رابط الصفحة:** ${termsUrl}

**المحتوى:**
${termsText}

---

## المطلوب:
حلل المحتوى وحدد المخالفات لنظام التجارة الإلكترونية ونظام حماية البيانات الشخصية.

أجب بصيغة JSON:
{
  "violations": [
    {
      "severity": "critical|warning|suggestion",
      "requirementId": "tc1|tc2|tc3|...",
      "title": "عنوان المخالفة",
      "description": "وصف تفصيلي",
      "violatingText": "اقتباس من النص أو null",
      "articleReference": "المادة القانونية",
      "remediation": "كيفية الإصلاح"
    }
  ],
  "summary": {
    "compliantElements": [],
    "missingElements": []
  }
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      max_tokens: 4096,
      temperature: 0,
    });
    
    const result = JSON.parse(response.choices[0].message.content || "{}");
    console.log("[TERMS_ANALYSIS] Terms analysis complete:", result.summary);
    
    const violations: PolicyContentViolation[] = (result.violations || []).map((v: any) => ({
      severity: v.severity || "warning",
      category: "terms_content",
      title: v.title,
      description: v.description,
      articleReference: v.articleReference,
      regulation: "نظام التجارة الإلكترونية",
      remediation: v.remediation,
      documentType: "terms" as const,
      violatingText: v.violatingText || undefined,
      requirementId: v.requirementId
    }));
    
    return violations;
  } catch (error: any) {
    console.error("[TERMS_ANALYSIS] Error analyzing terms:", error.message);
    return [];
  }
}

// Main function to perform deep content analysis on detected policies
// Now uses RAG-based analysis for grounded legal citations
export async function performDeepContentAnalysis(
  privacyPolicyUrl?: string,
  termsUrl?: string
): Promise<PolicyContentViolation[]> {
  const { performRAGBasedAnalysis } = await import("./legal-analyzer");
  const allViolations: PolicyContentViolation[] = [];
  
  let privacyHtml: string | null = null;
  let termsHtml: string | null = null;
  
  // Fetch content with improved reliability
  if (privacyPolicyUrl) {
    console.log("[DEEP_ANALYSIS] Fetching privacy policy content...");
    privacyHtml = await fetchPolicyContent(privacyPolicyUrl);
    if (!privacyHtml) {
      allViolations.push({
        severity: "warning",
        category: "privacy_policy_content",
        title: "تعذر الوصول إلى صفحة سياسة الخصوصية",
        description: `لم نتمكن من جلب محتوى سياسة الخصوصية من الرابط: ${privacyPolicyUrl}`,
        articleReference: "المادة 12 من PDPL",
        regulation: "يجب أن تكون سياسة الخصوصية متاحة ويمكن الوصول إليها",
        remediation: "تأكد من أن صفحة سياسة الخصوصية متاحة ويمكن الوصول إليها",
        documentType: "privacy_policy",
        requirementId: "pp_access"
      });
    }
  }
  
  if (termsUrl) {
    console.log("[DEEP_ANALYSIS] Fetching terms content...");
    termsHtml = await fetchPolicyContent(termsUrl);
    if (!termsHtml) {
      allViolations.push({
        severity: "warning",
        category: "terms_content",
        title: "تعذر الوصول إلى صفحة الشروط والأحكام",
        description: `لم نتمكن من جلب محتوى الشروط والأحكام من الرابط: ${termsUrl}`,
        articleReference: "نظام التجارة الإلكترونية",
        regulation: "يجب أن تكون الشروط والأحكام متاحة",
        remediation: "تأكد من أن صفحة الشروط والأحكام متاحة",
        documentType: "terms",
        requirementId: "tc_access"
      });
    }
  }
  
  // Perform RAG-based analysis with legal grounding
  console.log("[DEEP_ANALYSIS] Starting RAG-based legal analysis...");
  const ragViolations = await performRAGBasedAnalysis(
    privacyPolicyUrl,
    privacyHtml || undefined,
    termsUrl,
    termsHtml || undefined
  );
  
  // Convert RAG violations to PolicyContentViolation format
  for (const v of ragViolations) {
    allViolations.push({
      severity: v.severity,
      category: v.category,
      title: v.title,
      description: v.description,
      articleReference: v.articleReference,
      regulation: v.articleReference,
      remediation: v.remediation,
      documentType: v.documentType,
      violatingText: v.violatingText || undefined,
      requirementId: v.requirementId
    });
  }
  
  console.log(`[DEEP_ANALYSIS] Total violations found: ${allViolations.length}`);
  return allViolations;
}

// Analyze website content for compliance issues
export async function analyzeWebsiteCompliance(
  htmlContent: string,
  url: string
): Promise<ComplianceAnalysisResult> {
  // First: Direct HTML detection for better accuracy
  console.log("Starting direct HTML pattern detection...");
  const directDetection = detectLinksInHTML(htmlContent, url);
  
  // Check if API key is available
  if (!apiKey || apiKey === "missing-key") {
    console.warn("OpenAI API key not configured, using direct detection + mock analysis");
    // Return combined data: direct detection + mock issues
    return {
      overallScore: directDetection.hasPrivacyPolicy && directDetection.hasTermsAndConditions ? 65 : 35,
      complianceLevel: directDetection.hasPrivacyPolicy && directDetection.hasTermsAndConditions ? "medium" : "low",
      findings: {
        hasPrivacyPolicy: directDetection.hasPrivacyPolicy,
        privacyPolicyUrl: directDetection.privacyPolicyUrl,
        hasTermsAndConditions: directDetection.hasTermsAndConditions,
        termsAndConditionsUrl: directDetection.termsAndConditionsUrl,
        hasCookieBanner: directDetection.hasCookieBanner,
        hasDataCollectionForms: true,
        hasContactInfo: directDetection.hasContactInfo,
      },
      issues: [
        ...(!directDetection.hasPrivacyPolicy ? [{
          severity: "critical" as const,
          category: "privacy_policy",
          title: "سياسة الخصوصية غير موجودة",
          description: "لم يتم العثور على سياسة خصوصية في الموقع. يجب أن تحتوي جميع المواقع التي تجمع بيانات شخصية على سياسة خصوصية مفصلة.",
          articleReference: "المادة الثالثة عشرة",
          regulation: "نظام حماية البيانات الشخصية",
          remediation: "أضف صفحة سياسة خصوصية شاملة تشرح كيفية جمع واستخدام البيانات الشخصية",
          affectedElement: "الموقع بالكامل"
        }] : []),
        ...(!directDetection.hasTermsAndConditions ? [{
          severity: "critical" as const,
          category: "terms_and_conditions",
          title: "شروط الاستخدام غير موجودة",
          description: "لم يتم العثور على صفحة شروط وأحكام الاستخدام في الموقع.",
          articleReference: "المادة الرابعة عشرة",
          regulation: "نظام حماية البيانات الشخصية",
          remediation: "أضف صفحة شروط وأحكام واضحة تحدد حقوق والتزامات المستخدمين",
          affectedElement: "الموقع بالكامل"
        }] : []),
        {
          severity: "warning",
          category: "consent",
          title: "آلية موافقة غير واضحة",
          description: "لا توجد آلية واضحة للحصول على موافقة المستخدم قبل جمع البيانات",
          articleReference: "المادة السادسة",
          regulation: "نظام حماية البيانات الشخصية",
          remediation: "أضف نموذج موافقة صريحة قبل جمع أي بيانات شخصية",
          affectedElement: "نماذج جمع البيانات"
        },
        ...(!directDetection.hasCookieBanner ? [{
          severity: "suggestion" as const,
          category: "cookies",
          title: "لافتة الكوكيز غير موجودة",
          description: "يفضل إضافة لافتة لإعلام المستخدمين باستخدام ملفات تعريف الارتباط",
          articleReference: "المادة الثالثة عشرة",
          regulation: "نظام حماية البيانات الشخصية",
          remediation: "أضف لافتة كوكيز تسمح للمستخدمين بالتحكم في تفضيلاتهم",
          affectedElement: "الموقع بالكامل"
        }] : [])
      ]
    };
  }
  const systemPrompt = `أنت خبير متخصص في نظام حماية البيانات الشخصية السعودي (PDPL) الصادر بالمرسوم الملكي رقم م/19 ولوائحه التنفيذية.

## مهمتك:
تحليل محتوى المواقع الإلكترونية للتحقق من الامتثال لنظام حماية البيانات الشخصية السعودي (PDPL) وقائمة التقييم الذاتي للمتاجر الإلكترونية.

## المراجع القانونية الأساسية:

### قائمة التقييم الذاتي للمتاجر الإلكترونية (20 نقطة التزام):
1. توفير البيانات الأساسية للمتجر والمنتج والخدمة
2. إتاحة وسائل للتواصل وتقديم الشكوى (بالغ الأهمية)
3. توضيح إجراءات استقبال الشكوى ومعالجتها
4. الإفصاح عن سياسة الاستبدال والاسترجاع (بالغ الأهمية)
5. نظامية سياسة الاستبدال والاسترجاع
6. إتاحة إمكانية إلغاء حساب العميل (حق إتلاف البيانات)
7. إتاحة إمكانية وقف إرسال الإعلانات الإلكترونية (حق الانسحاب من التسويق)
16. الإفصاح عن رقم السجل التجاري
17. الإفصاح عن الرقم الضريبي
20. **الإفصاح عن سياسة الخصوصية وحماية بيانات المستهلك** (بالغ الأهمية)

### متطلبات سياسة الخصوصية (المادة 12 من PDPL):
يجب أن تشتمل سياسة الخصوصية على:
- اسم الجهة ونشاطها وبيانات التواصل
- البيانات الشخصية التي سيتم جمعها
- الغرض من جمع البيانات وطريقة جمعها
- كيفية معالجة البيانات وتخزينها ومدة الاحتفاظ بها
- حقوق صاحب البيانات الشخصية
- آلية تقديم الشكاوى والاعتراضات

### حقوق أصحاب البيانات (المادة 4 من PDPL):
- الحق في العلم (الفقرة 1)
- الحق في الوصول (الفقرة 2)
- الحق في الحصول على البيانات (الفقرة 3)
- الحق في التصحيح والتحديث (الفقرة 4)
- الحق في الإتلاف (الفقرة 5)

### متطلبات الموافقة (المادة 5-6 من PDPL):
- الموافقة الصريحة قبل جمع البيانات
- إمكانية سحب الموافقة
- توضيح الغرض من الجمع

## كلمات مفتاحية للبحث:
### سياسة الخصوصية:
- "سياسة الخصوصية", "حماية البيانات", "الخصوصية", "Privacy Policy", "Privacy", "Data Protection"
- روابط: /privacy, /privacy-policy, /سياسة-الخصوصية

### الشروط والأحكام:
- "الشروط والأحكام", "شروط الاستخدام", "شروط الخدمة", "Terms", "Terms & Conditions", "Terms of Service"
- "سياسة الاستبدال", "سياسة الاسترجاع", "سياسة الإرجاع"
- روابط: /terms, /terms-and-conditions, /الشروط-والأحكام

### ملفات تعريف الارتباط:
- "ملفات تعريف الارتباط", "الكوكيز", "Cookies"
- آلية موافقة صريحة (قبول/رفض)

## مهم جداً:
- ابحث بدقة في HTML عن الروابط والنصوص
- لا تفترض وجود شيء غير موجود
- إذا لم تجد سياسة خصوصية واضحة = hasPrivacyPolicy: false
- إذا لم تجد شروط واضحة = hasTermsAndConditions: false`;

  // Prepare HTML content: sample beginning, middle, and end for comprehensive analysis
  const prepareHtmlForAnalysis = (html: string): string => {
    const maxChars = 45000; // Increased for better coverage
    if (html.length <= maxChars) {
      return html;
    }
    // Sample three sections: beginning (header/nav), middle (content), end (footer)
    const sectionSize = 15000;
    const firstPart = html.substring(0, sectionSize);
    const middleStart = Math.floor((html.length - sectionSize) / 2);
    const middlePart = html.substring(middleStart, middleStart + sectionSize);
    const lastPart = html.substring(html.length - sectionSize);
    return `${firstPart}\n\n... [بداية المحتوى الأوسط] ...\n\n${middlePart}\n\n... [نهاية الصفحة] ...\n\n${lastPart}`;
  };
  
  const userPrompt = `## تحليل الامتثال لنظام حماية البيانات الشخصية السعودي (PDPL)

**الموقع:** ${url}

**محتوى HTML (الهيدر والفوتر مشمولان):**
${prepareHtmlForAnalysis(htmlContent)}

---

## المطلوب: فحص دقيق وشامل

### 1. سياسة الخصوصية (النقطة 20 من قائمة التقييم الذاتي - بالغ الأهمية)
ابحث عن:
- روابط تحتوي على: "سياسة الخصوصية", "الخصوصية", "حماية البيانات", "Privacy Policy", "Privacy"
- عناوين URL مثل: /privacy, /privacy-policy, /سياسة-الخصوصية
- صفحات منفصلة لسياسة الخصوصية في الهيدر أو الفوتر
**إذا لم تجد أي مما سبق بشكل واضح، اعتبر hasPrivacyPolicy = false**

### 2. الشروط والأحكام (النقطة 4-5 من قائمة التقييم الذاتي - بالغ الأهمية)
ابحث عن:
- روابط تحتوي على: "الشروط والأحكام", "شروط الاستخدام", "شروط الخدمة", "Terms", "Terms & Conditions"
- سياسة الاستبدال والاسترجاع (مطلوب للمتاجر الإلكترونية)
- عناوين URL مثل: /terms, /terms-and-conditions, /الشروط-والأحكام
**إذا لم تجد أي مما سبق بشكل واضح، اعتبر hasTermsAndConditions = false**

### 3. لافتة الكوكيز (المادة 5-6 من PDPL - الموافقة الصريحة)
ابحث عن:
- شريط إشعار ملفات تعريف الارتباط
- أزرار قبول/رفض الكوكيز
- آلية موافقة صريحة

### 4. معلومات الاتصال (النقطة 2 من قائمة التقييم الذاتي - بالغ الأهمية)
ابحث عن:
- بريد إلكتروني واضح للتواصل
- رقم هاتف
- عنوان فعلي
- نموذج اتصال

### 5. نماذج جمع البيانات
ابحث عن عناصر <form> تحتوي على:
- حقول بيانات شخصية (name, email, phone, address)
- هل توجد موافقة صريحة قبل الإرسال؟

---

## التقييم المطلوب:
- نسبة الامتثال (0-100) بناءً على وجود العناصر أعلاه
- مستوى الامتثال: "low" < 40، "medium" 40-70، "high" > 70

## قواعد مهمة:
1. كن دقيقاً جداً - لا تفترض وجود شيء غير موجود في HTML
2. ابحث في الهيدر والفوتر بعناية
3. إذا وجدت الرابط، استخرج URL الكامل
4. استخدم المراجع القانونية المحددة (المادة X من PDPL)

أجب بصيغة JSON فقط:
{
  "overallScore": number (0-100),
  "complianceLevel": "low" | "medium" | "high",
  "findings": {
    "hasPrivacyPolicy": boolean,
    "privacyPolicyUrl": "string or null",
    "hasTermsAndConditions": boolean,
    "termsAndConditionsUrl": "string or null",
    "hasCookieBanner": boolean,
    "hasDataCollectionForms": boolean,
    "hasContactInfo": boolean
  },
  "issues": [
    {
      "severity": "critical|warning|suggestion",
      "category": "privacy_policy|terms_and_conditions|data_collection|consent|security|user_rights|cookies|third_party|data_retention|general",
      "title": "عنوان المشكلة بالعربية",
      "description": "وصف تفصيلي",
      "articleReference": "المادة X من النظام",
      "regulation": "نص اللائحة المخالفة",
      "remediation": "كيفية المعالجة",
      "affectedElement": "العنصر المتأثر"
    }
  ]
}`;

  try {
    console.log("Calling OpenAI for detailed compliance analysis...");
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      max_tokens: 4096,
      temperature: 0,
      top_p: 0.1,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    console.log("OpenAI analysis results:", result.findings);
    console.log("DOM detection results:", directDetection);
    
    // HYBRID DETECTION: Combine OpenAI intelligence with reliable DOM detection
    // DOM detection is highly reliable for finding explicit links - trust it when found
    // OpenAI provides deeper content analysis and catches elements DOM might miss
    
    // Privacy Policy: Trust EITHER source - if DOM found a link, it definitely exists
    const hasPrivacyPolicy = directDetection.hasPrivacyPolicy || result.findings?.hasPrivacyPolicy || false;
    
    // Terms & Conditions: Trust EITHER source - if DOM found a link, it definitely exists  
    const hasTermsAndConditions = directDetection.hasTermsAndConditions || result.findings?.hasTermsAndConditions || false;
    
    // Cookie Banner: Trust EITHER source
    const hasCookieBanner = directDetection.hasCookieBanner || result.findings?.hasCookieBanner || false;
    
    // Contact Info: Trust EITHER source
    const hasContactInfo = directDetection.hasContactInfo || result.findings?.hasContactInfo || false;
    
    // Merge findings - prefer DOM-detected URLs when available (more reliable)
    const mergedFindings = {
      hasPrivacyPolicy,
      privacyPolicyUrl: directDetection.privacyPolicyUrl || result.findings?.privacyPolicyUrl,
      hasTermsAndConditions,
      termsAndConditionsUrl: directDetection.termsAndConditionsUrl || result.findings?.termsAndConditionsUrl,
      hasCookieBanner,
      hasDataCollectionForms: result.findings?.hasDataCollectionForms || false,
      hasContactInfo,
    };
    
    console.log("Hybrid detection - DOM found:", { 
      privacy: directDetection.hasPrivacyPolicy, 
      terms: directDetection.hasTermsAndConditions,
      cookie: directDetection.hasCookieBanner,
      contact: directDetection.hasContactInfo
    });
    console.log("Hybrid detection - OpenAI found:", result.findings);
    console.log("Final merged findings:", mergedFindings);
    
    // Remove issues for elements confirmed by EITHER DOM or OpenAI
    let issues = Array.isArray(result.issues) ? result.issues : [];
    
    // Remove privacy issues if privacy policy was found by either detection method
    if (hasPrivacyPolicy) {
      issues = issues.filter((issue: any) => issue.category !== "privacy_policy");
      console.log("Removed privacy_policy issues (element confirmed by hybrid detection)");
    }
    
    // Remove terms issues if terms were found by either detection method
    if (hasTermsAndConditions) {
      issues = issues.filter((issue: any) => issue.category !== "terms_and_conditions");
      console.log("Removed terms_and_conditions issues (element confirmed by hybrid detection)");
    }
    
    // Remove cookie issues if cookie banner was found by either detection method
    if (hasCookieBanner) {
      issues = issues.filter((issue: any) => issue.category !== "cookies");
      console.log("Removed cookies issues (element confirmed by hybrid detection)");
    }
    
    // Remove contact info issues if contact was found by either detection method
    if (hasContactInfo) {
      issues = issues.filter((issue: any) => 
        !issue.category?.includes("contact") && !issue.title?.includes("معلومات الاتصال")
      );
      console.log("Removed contact info issues (element confirmed by hybrid detection)");
    }
    
    // IMPORTANT: Filter out content-analysis issues from OpenAI detection
    // These will be handled more accurately by RAG-based deep analysis
    // Keep only structural/detection issues (missing elements, not content quality)
    issues = issues.filter((issue: any) => {
      // Keep cookie banner missing issues (structural) - this is a VALID check
      // Cookie banner is a homepage element that can be reliably detected
      if (!hasCookieBanner && 
          (issue.category === "cookies" || issue.title?.includes("كوكيز") || issue.title?.includes("لافتة"))) {
        console.log(`[FILTER] Keeping cookie banner issue (valid detection): ${issue.title}`);
        return true;
      }
      
      // Filter out data collection form issues - these are not true violations
      // Most websites don't have visible forms on the homepage
      if (issue.category === "data_collection" || issue.title?.includes("نماذج جمع")) {
        console.log(`[FILTER] Removed data_collection issue (not a true violation): ${issue.title}`);
        return false;
      }
      
      // Filter out content analysis issues - these are better handled by RAG
      if (issue.title?.includes("عدم توضيح") || 
          issue.title?.includes("عدم ذكر") || 
          issue.title?.includes("عدم وجود معلومات")) {
        console.log(`[FILTER] Removed OpenAI content issue (handled by RAG): ${issue.title}`);
        return false;
      }
      return true;
    });
    
    // Calculate deterministic score based on findings and issues
    // Start from 100 and deduct for missing elements and issues
    let deterministicScore = 100;
    
    // Deduct for missing mandatory compliance elements
    if (!mergedFindings.hasPrivacyPolicy) {
      deterministicScore -= 30; // Privacy Policy is critical
    }
    if (!mergedFindings.hasTermsAndConditions) {
      deterministicScore -= 30; // Terms & Conditions is critical
    }
    if (!mergedFindings.hasCookieBanner) {
      deterministicScore -= 10; // Cookie Banner is important
    }
    if (!mergedFindings.hasContactInfo) {
      deterministicScore -= 10; // Contact Info is important
    }
    
    // Additional deductions based on issue severity (from OpenAI analysis)
    const criticalCount = issues.filter((i: any) => i.severity === "critical").length;
    const warningCount = issues.filter((i: any) => i.severity === "warning").length;
    const suggestionCount = issues.filter((i: any) => i.severity === "suggestion").length;
    
    deterministicScore -= (criticalCount * 5); // -5 per critical issue
    deterministicScore -= (warningCount * 3);   // -3 per warning
    deterministicScore -= (suggestionCount * 1); // -1 per suggestion
    
    // DEEP CONTENT ANALYSIS: Fetch and analyze policy content for specific violations
    console.log("[DEEP_ANALYSIS] Starting deep content analysis...");
    const deepViolations = await performDeepContentAnalysis(
      mergedFindings.privacyPolicyUrl,
      mergedFindings.termsAndConditionsUrl
    );
    
    // Add deep analysis violations to issues
    const deepIssues = deepViolations.map(v => ({
      severity: v.severity,
      category: v.category,
      title: v.title,
      description: v.description,
      articleReference: v.articleReference,
      regulation: v.regulation,
      remediation: v.remediation,
      affectedElement: v.documentType === "privacy_policy" ? "سياسة الخصوصية" : "الشروط والأحكام",
      documentType: v.documentType,
      violatingText: v.violatingText,
      requirementId: v.requirementId
    }));
    
    // Combine all issues
    const allIssues = [...issues, ...deepIssues];
    console.log(`[DEEP_ANALYSIS] Added ${deepIssues.length} content violations to ${issues.length} detection issues`);
    
    // Recalculate score with deep violations
    const deepCriticalCount = deepIssues.filter((i: any) => i.severity === "critical").length;
    const deepWarningCount = deepIssues.filter((i: any) => i.severity === "warning").length;
    const deepSuggestionCount = deepIssues.filter((i: any) => i.severity === "suggestion").length;
    
    // Adjust score for deep violations (less severe deductions since policy exists)
    deterministicScore -= (deepCriticalCount * 3); // -3 per critical content violation
    deterministicScore -= (deepWarningCount * 2);   // -2 per warning
    deterministicScore -= (deepSuggestionCount * 1); // -1 per suggestion
    
    const finalScore = Math.max(0, Math.min(100, deterministicScore));
    const finalLevel = finalScore >= 70 ? "high" : finalScore >= 40 ? "medium" : "low";
    
    console.log(`Deterministic score: privacy=${mergedFindings.hasPrivacyPolicy?'✓':'-30'}, terms=${mergedFindings.hasTermsAndConditions?'✓':'-30'}, cookie=${mergedFindings.hasCookieBanner?'✓':'-10'}, contact=${mergedFindings.hasContactInfo?'✓':'-10'}, detection_issues=(critical:${criticalCount}×-5, warnings:${warningCount}×-3, suggestions:${suggestionCount}×-1), content_issues=(critical:${deepCriticalCount}×-3, warnings:${deepWarningCount}×-2, suggestions:${deepSuggestionCount}×-1), final=${finalScore}`);
    
    return {
      overallScore: finalScore,
      complianceLevel: finalLevel,
      findings: mergedFindings,
      issues: allIssues
    };
  } catch (error: any) {
    console.error("Error analyzing website compliance:", error);
    console.error("API Error details:", error.message);
    
    // Return direct detection + mock issues on API error
    console.warn("Using fallback: direct detection + mock issues due to OpenAI API error");
    return {
      overallScore: directDetection.hasPrivacyPolicy && directDetection.hasTermsAndConditions ? 65 : 35,
      complianceLevel: directDetection.hasPrivacyPolicy && directDetection.hasTermsAndConditions ? "medium" : "low",
      findings: {
        hasPrivacyPolicy: directDetection.hasPrivacyPolicy,
        privacyPolicyUrl: directDetection.privacyPolicyUrl,
        hasTermsAndConditions: directDetection.hasTermsAndConditions,
        termsAndConditionsUrl: directDetection.termsAndConditionsUrl,
        hasCookieBanner: directDetection.hasCookieBanner,
        hasDataCollectionForms: true,
        hasContactInfo: directDetection.hasContactInfo,
      },
      issues: [
        ...(!directDetection.hasPrivacyPolicy ? [{
          severity: "critical" as const,
          category: "privacy_policy",
          title: "سياسة الخصوصية غير موجودة",
          description: "لم يتم العثور على سياسة خصوصية واضحة في الموقع.",
          articleReference: "المادة الثالثة عشرة",
          regulation: "نظام حماية البيانات الشخصية",
          remediation: "أضف صفحة سياسة خصوصية شاملة",
          affectedElement: "الموقع بالكامل"
        }] : []),
        ...(!directDetection.hasTermsAndConditions ? [{
          severity: "critical" as const,
          category: "terms_and_conditions",
          title: "شروط الاستخدام غير موجودة",
          description: "لم يتم العثور على صفحة شروط وأحكام الاستخدام.",
          articleReference: "المادة الرابعة عشرة",
          regulation: "نظام حماية البيانات الشخصية",
          remediation: "أضف صفحة شروط وأحكام واضحة",
          affectedElement: "الموقع بالكامل"
        }] : []),
        {
          severity: "warning",
          category: "consent",
          title: "آلية موافقة غير واضحة",
          description: "لا توجد آلية واضحة للحصول على موافقة المستخدم",
          articleReference: "المادة السادسة",
          regulation: "نظام حماية البيانات الشخصية",
          remediation: "أضف نموذج موافقة صريحة",
          affectedElement: "نماذج جمع البيانات"
        }
      ]
    };
  }
}

// Generate a compliance report
export async function generateComplianceReport(
  scan: any,
  issues: any[],
  format: "pdf" | "html" | "json"
): Promise<{ content: string; fileName: string }> {
  const fileName = `compliance_report_${Date.now()}.${format}`;
  
  // Check if API key is available
  if (!apiKey || apiKey === "missing-key") {
    console.warn("OpenAI API key not configured, using mock report");
    return generateMockReport(scan, issues, format, fileName);
  }
  
  const reportPrompt = `أنشئ تقريراً مفصلاً عن الامتثال لقانون حماية البيانات الشخصية السعودي.

بيانات الفحص:
- الموقع: ${scan.url}
- تاريخ الفحص: ${scan.scanDate}
- نسبة الامتثال: ${scan.overallScore}%
- عدد المخالفات الحرجة: ${scan.criticalCount}
- عدد التحذيرات: ${scan.warningCount}
- عدد الاقتراحات: ${scan.suggestionCount}

المخالفات:
${JSON.stringify(issues, null, 2)}

أنشئ تقريراً شاملاً يتضمن:
1. ملخص تنفيذي
2. نتائج الفحص الرئيسية
3. تفاصيل كل مخالفة مع توصيات المعالجة
4. خطة عمل مقترحة للامتثال
5. المراجع القانونية

قدم التقرير بصيغة ${format === "html" ? "HTML" : format === "pdf" ? "نص منسق لـ PDF" : "JSON"}.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "أنت خبير في إعداد تقارير الامتثال القانونية. أنشئ تقارير احترافية وشاملة."
        },
        { role: "user", content: reportPrompt }
      ],
      max_tokens: 4096,
    });

    const content = response.choices[0].message.content || "";
    return { content, fileName };
  } catch (error: any) {
    console.error("Error generating report with OpenAI:", error.message);
    console.warn("Using fallback mock report due to OpenAI API error");
    return generateMockReport(scan, issues, format, fileName);
  }
}

// Generate mock report for testing
function generateMockReport(
  scan: any,
  issues: any[],
  format: "pdf" | "html" | "json",
  fileName: string
): { content: string; fileName: string } {
  if (format === "json") {
    return {
      content: JSON.stringify({
        title: "تقرير فحص سِرْبَال",
        url: scan.url,
        scanDate: scan.scanDate,
        overallScore: scan.overallScore,
        summary: {
          criticalCount: scan.criticalCount,
          warningCount: scan.warningCount,
          suggestionCount: scan.suggestionCount,
          totalIssues: scan.issuesCount
        },
        issues: issues,
        recommendations: [
          "إضافة سياسة خصوصية شاملة",
          "تحسين آليات الموافقة",
          "تعزيز أمن البيانات"
        ]
      }, null, 2),
      fileName
    };
  }
  
  if (format === "html") {
    const htmlContent = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>تقرير فحص سِرْبَال</title>
  <style>
    body { font-family: 'Cairo', Arial; direction: rtl; padding: 20px; }
    h1 { color: #333; }
    .summary { background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0; }
    .issue { border-right: 4px solid; padding: 10px; margin: 10px 0; }
    .critical { border-color: #dc2626; }
    .warning { border-color: #f97316; }
    .suggestion { border-color: #eab308; }
  </style>
</head>
<body>
  <h1>تقرير فحص سِرْبَال</h1>
  <div class="summary">
    <h2>ملخص الفحص</h2>
    <p>الموقع: ${scan.url}</p>
    <p>تاريخ الفحص: ${new Date(scan.scanDate).toLocaleDateString('ar-SA')}</p>
    <p>نسبة الامتثال: ${scan.overallScore}%</p>
    <p>المخالفات: ${scan.criticalCount} حرجة، ${scan.warningCount} تحذيرات، ${scan.suggestionCount} اقتراحات</p>
  </div>
  <h2>المخالفات المكتشفة</h2>
  ${issues.map(issue => `
    <div class="issue ${issue.severity}">
      <h3>${issue.title}</h3>
      <p>${issue.description}</p>
      <p><strong>المعالجة:</strong> ${issue.remediation}</p>
      ${issue.articleReference ? `<p><small>${issue.articleReference}</small></p>` : ''}
    </div>
  `).join('')}
</body>
</html>`;
    return { content: htmlContent, fileName };
  }
  
  // Default PDF format (text)
  const pdfContent = `تقرير فحص سِرْبَال
========================================

معلومات الفحص:
--------------
الموقع: ${scan.url}
تاريخ الفحص: ${new Date(scan.scanDate).toLocaleDateString('ar-SA')}
نسبة الامتثال: ${scan.overallScore}%

ملخص النتائج:
------------
- مخالفات حرجة: ${scan.criticalCount}
- تحذيرات: ${scan.warningCount}
- اقتراحات: ${scan.suggestionCount}
- إجمالي المشاكل: ${scan.issuesCount}

المخالفات المكتشفة:
-----------------
${issues.map((issue, i) => `
${i + 1}. ${issue.title}
   الخطورة: ${issue.severity === 'critical' ? 'حرجة' : issue.severity === 'warning' ? 'تحذير' : 'اقتراح'}
   الوصف: ${issue.description}
   المعالجة: ${issue.remediation}
   ${issue.articleReference ? `المرجع: ${issue.articleReference}` : ''}
`).join('\n')}

التوصيات:
--------
1. مراجعة وتحديث سياسة الخصوصية
2. تحسين آليات الحصول على موافقة المستخدمين
3. تعزيز إجراءات أمن البيانات
4. توضيح حقوق أصحاب البيانات

ملاحظة: هذا التقرير للمساعدة ولا يغني عن الاستشارة القانونية المتخصصة.`;

  return { content: pdfContent, fileName };
}

// Extract regulation references from PDFs
export async function extractRegulationReferences(
  issueDescription: string
): Promise<{ articles: string[]; details: string }> {
  const prompt = `بناءً على الوصف التالي لمخالفة امتثال:
"${issueDescription}"

حدد المواد المحددة من نظام حماية البيانات الشخصية السعودي التي تنطبق على هذه المخالفة.

قدم الإجابة بصيغة JSON:
{
  "articles": ["المادة X", "المادة Y"],
  "details": "تفاصيل المواد المنطبقة"
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "أنت خبير قانوني متخصص في نظام حماية البيانات الشخصية السعودي."
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      max_tokens: 1024,
    });

    return JSON.parse(response.choices[0].message.content || '{"articles": [], "details": ""}');
  } catch (error) {
    console.error("Error extracting regulation references:", error);
    return { articles: [], details: "" };
  }
}

import type { PolicyDocument } from "@shared/schema";

export async function generatePrivacyPolicy(data: Partial<PolicyDocument>): Promise<string> {
  if (!apiKey || apiKey === "missing-key") {
    console.warn("OpenAI API key not configured, using mock privacy policy");
    return generateMockPrivacyPolicy(data);
  }

  const formattedDate = data.lastUpdatedDate 
    ? new Date(data.lastUpdatedDate).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })
    : new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });

  // تنسيق فئات البيانات
  const dataCategories = Array.isArray(data.dataCategories) ? data.dataCategories : [];
  const dataCategoriesText = dataCategories.map((cat: any, index: number) => 
    `${index + 1}. ${cat.name} (${cat.required ? 'إلزامي' : 'اختياري'})
   - الغرض: ${cat.purpose}
   - المسوغ النظامي: ${cat.legalBasis === 'consent' ? 'موافقة العميل الصريحة' : 
      cat.legalBasis === 'contract' ? 'االلتزام بـ عقد خدمة' : 
      cat.legalBasis === 'legal_obligation' ? 'االلتزام بنظام/قانون' : 
      'مصلحة مشروعة'}`
  ).join('\n\n') || 'غير محدد';

  // تنسيق الأطراف الخارجية
  const thirdPartyDetails = Array.isArray(data.thirdPartyDetails) ? data.thirdPartyDetails : [];
  const thirdPartyText = thirdPartyDetails.map((party: any, index: number) =>
    `${index + 1}. ${party.party}
   - الغرض: ${party.purpose}
   ${party.safeguards ? `- الضمانات: ${party.safeguards}` : ''}`
  ).join('\n\n') || '';

  // تنسيق الإجراءات الأمنية
  const securityMeasures = Array.isArray(data.securityMeasures) ? data.securityMeasures : [];
  const securityMeasuresText = securityMeasures.map((measure: any, index: number) =>
    `${index + 1}. ${measure.description} (${measure.type === 'technical' ? 'تقني' : measure.type === 'organizational' ? 'تنظيمي' : 'مادي'})`
  ).join('\n') || '';

  // تنسيق الكوكيز
  const cookieTypes = Array.isArray(data.cookieTypes) ? data.cookieTypes : [];
  const cookieTypesText = cookieTypes.map((cookie: any, index: number) =>
    `${index + 1}. ${cookie.type}
   - الغرض: ${cookie.purpose}
   - المدة: ${cookie.duration}`
  ).join('\n\n') || '';

  const prompt = `أنشئ سياسة خصوصية شاملة ومتوافقة بنسبة 100% مع نظام حماية البيانات الشخصية السعودي (PDPL) للجهة التالية:

===== القسم الأول: هوية الجهة والمسؤولية =====

معلومات الجهة الأساسية:
- اسم الشركة/الجهة: ${data.companyName}
- نوع النشاط: ${data.businessType}
- صفة الجهة: ${data.entityType === 'government' ? 'جهة حكومية' : data.entityType === 'private' ? 'شركة/مؤسسة خاصة' : 'فرد يمارس نشاطاً تجارياً'}

بيانات الاتصال الرئيسية:
- البريد الإلكتروني: ${data.contactEmail}
- رقم الهاتف: ${data.contactPhone || 'غير محدد'}
- العنوان البريدي: ${data.contactAddress || 'غير محدد'}

معالجة البيانات الحساسة:
- هل يتطلب النشاط معالجة بيانات حساسة أو مراقبة مستمرة: ${data.processesSensitiveData === 'yes' ? 'نعم' : 'لا'}
${data.processesSensitiveData === 'yes' && data.dpoName ? `
مسؤول حماية البيانات الشخصية (DPO):
- الاسم: ${data.dpoName}
- البريد الإلكتروني: ${data.dpoEmail || data.contactEmail}
- رقم الهاتف: ${data.dpoPhone || 'غير محدد'}
- العنوان: ${data.dpoAddress || 'غير محدد'}` : ''}

===== القسم الثاني: جمع البيانات والأغراض النظامية =====

فئات البيانات الشخصية المجمعة:
${dataCategoriesText}

طريقة جمع البيانات: ${data.collectionMethod === 'direct' ? 'مباشرة من العميل فقط' : 
  data.collectionMethod === 'indirect' ? 'بشكل غير مباشر فقط' : 
  'بشكل مباشر وغير مباشر معاً'}

${data.collectionMethod === 'direct' || data.collectionMethod === 'both' ? `
تفاصيل الجمع المباشر:
${data.directCollectionDetails || 'غير محدد'}` : ''}

${data.collectionMethod === 'indirect' || data.collectionMethod === 'both' ? `
تفاصيل الجمع غير المباشر:
${data.indirectCollectionDetails || 'غير محدد'}

مصادر البيانات غير المباشرة:
${data.indirectDataSources || 'غير محدد'}` : ''}

===== القسم الثالث: معالجة البيانات ومشاركتها وأمنها =====

آليات معالجة البيانات:
${data.processingMethods || 'غير محدد'}

مشاركة البيانات مع أطراف خارجية: ${data.sharesWithThirdParties === 'yes' ? 'نعم' : 'لا'}
${data.sharesWithThirdParties === 'yes' && thirdPartyText ? `
تفاصيل الأطراف الخارجية:
${thirdPartyText}` : ''}

نقل البيانات خارج المملكة: ${data.transfersDataAbroad === 'yes' ? 'نعم' : 'لا'}
${data.transfersDataAbroad === 'yes' ? `
الدول/المناطق المستهدفة: ${data.transferDestinations || 'غير محدد'}
الضمانات المتبعة: ${data.transferSafeguards || 'غير محدد'}
الآلية المستخدمة: ${data.transferMechanism || 'غير محدد'}` : ''}

حقوق صاحب البيانات:
- طريقة ممارسة الحقوق: ${data.rightsExerciseMethod || 'غير محدد'}
- مدة الرد: ${data.rightsResponseTime || '30'} يوم
- قناة التواصل: ${data.rightsContactChannel || data.contactEmail}

تفاصيل الحقوق الفردية:
- حق الوصول: ${data.accessRightDetails || 'يمكن طلب الوصول للبيانات'}
- الحصول على نسخة: ${data.obtainCopyDetails || 'يمكن طلب نسخة'} (صيغة: ${data.obtainCopyFormat || 'PDF'})
  ${data.obtainCopyLimitations ? `القيود: ${data.obtainCopyLimitations}` : ''}
- التصحيح: ${data.correctionRightDetails || 'يمكن طلب تصحيح البيانات'} (مدة الرد: ${data.correctionResponseTime || '15'} يوم)
  إشعار: ${data.correctionNotificationMethod || 'بريد إلكتروني'}
- الحذف: شروط: ${data.deletionRightConditions || 'حسب القانون'} | استثناءات: ${data.deletionExceptions || 'التزامات قانونية'}
- الاعتراض: ${data.objectionRightDetails || 'يمكن الاعتراض على المعالجة'} (مدة التقييم: ${data.objectionEvaluationTime || '30'} يوم)
- سحب الموافقة: ${data.withdrawalConsentDetails || 'يمكن سحب الموافقة في أي وقت'}
  الطريقة: ${data.withdrawalConsentMethod || 'إعدادات الحساب'} | الأثر: ${data.withdrawalConsentImpact || 'قد تتوقف بعض الخدمات'}

التخزين والاحتفاظ:
- موقع التخزين: ${data.storageLocation || 'غير محدد'} (${data.storageLocationDetails || ''})
- مدة الاحتفاظ: ${data.retentionPeriod || 'حسب الحاجة'}
- المعايير المستخدمة: ${data.retentionCriteria || 'حسب القانون'}
- طريقة الإتلاف: ${data.deletionMethod || 'حذف آمن'}

الإجراءات الأمنية:
${securityMeasuresText}
${data.technicalMeasures ? `
إجراءات تقنية إضافية: ${data.technicalMeasures}` : ''}
${data.organizationalMeasures ? `
إجراءات تنظيمية إضافية: ${data.organizationalMeasures}` : ''}

الإخطار بانتهاك البيانات:
- العملية: ${data.breachNotificationProcess || 'إخطار فوري'}
- المدة الزمنية: ${data.breachNotificationTime || '72 ساعة'}

${data.usesCookies === 'yes' ? `
ملفات الارتباط (الكوكيز):
${cookieTypesText}
طريقة الإدارة: ${data.cookieManagementMethod || 'إعدادات المتصفح'}` : ''}

التحديثات:
طريقة الإشعار: ${data.updateNotificationMethod || 'بريد إلكتروني'}

الشكاوى:
- إجراءات تقديم الشكاوى: ${data.complaintProcedure || 'التواصل معنا'}
- مدة الرد: ${data.complaintResponseTime || '30'} يوم

تاريخ آخر تحديث للسياسة: ${formattedDate}

====================================

المطلوب:
أنشئ سياسة خصوصية شاملة واحترافية متوافقة 100% مع نظام حماية البيانات الشخصية السعودي (PDPL) واللائحة التنفيذية. يجب أن تتضمن السياسة الأقسام التالية بالترتيب:

1. **مقدمة والتزام بالخصوصية**
   - بيان التزام الجهة بحماية البيانات وفقاً للنظام السعودي
   - نطاق السياسة وتطبيقها

2. **معلومات عن جهة التحكم**
   - الاسم، النوع، البيانات الأساسية
   - بيانات التواصل الكاملة
   - مسؤول حماية البيانات (إذا كان موجوداً)

3. **جمع البيانات الشخصية**
   - فئات البيانات المجمعة مع الأغراض المحددة لكل فئة
   - طريقة الجمع (مباشرة/غير مباشرة)
   - المسوغات النظامية لكل فئة بيانات

4. **استخدام ومعالجة البيانات**
   - كيفية معالجة البيانات خلال دورة حياتها
   - الأغراض التفصيلية
   - الأساس القانوني

5. **مشاركة البيانات ونقلها**
   - الإفصاح للأطراف الخارجية (إن وجد)
   - نقل البيانات خارج المملكة (إن وجد)
   - الضمانات والآليات

6. **التخزين والاحتفاظ**
   - موقع التخزين
   - مدة الاحتفاظ والمعايير
   - طريقة الإتلاف

7. **أمن البيانات**
   - الإجراءات الأمنية التقنية
   - الإجراءات الأمنية التنظيمية
   - الإجراءات الأمنية المادية
   - الإخطار بانتهاك البيانات

8. **حقوق أصحاب البيانات**
   يجب تفصيل جميع الحقوق التالية:
   - الحق في العلم
   - الحق في الوصول إلى البيانات
   - الحق في الحصول على نسخة من البيانات
   - الحق في التصحيح
   - الحق في الإتلاف/الحذف
   - الحق في الاعتراض
   - الحق في سحب الموافقة
   - كيفية ممارسة كل حق

9. **ملفات تعريف الارتباط (إذا كانت مستخدمة)**
   - أنواع الكوكيز
   - الأغراض والمدة
   - كيفية الإدارة

10. **التحديثات على السياسة**
    - كيفية إشعار المستخدمين
    - تاريخ آخر تحديث

11. **الشكاوى والاعتراضات**
    - كيفية تقديم شكوى
    - مدة الرد
    - معلومات التواصل

12. **معلومات الهيئة السعودية للبيانات والذكاء الاصطناعي (سدايا)**
    - العنوان: المملكة العربية السعودية، الرياض
    - الموقع الإلكتروني: sdaia.gov.sa
    - منصة حوكمة البيانات الوطنية: dgp.sdaia.gov.sa
    - حق التقدم بشكوى للهيئة

13. **معلومات الاتصال النهائية**

مواصفات السياسة:
- استخدم لغة قانونية واضحة وبسيطة باللغة العربية
- اذكر المواد ذات الصلة من نظام حماية البيانات الشخصية السعودي
- كن شاملاً ومحدداً قدر الإمكان
- تأكد من التوافق الكامل مع PDPL واللائحة التنفيذية
- استخدم التنسيق المناسب مع عناوين واضحة وترقيم منظم`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "أنت خبير قانوني متخصص في صياغة سياسات الخصوصية المتوافقة مع نظام حماية البيانات الشخصية السعودي (PDPL) واللائحة التنفيذية. تتميز بقدرتك على إنشاء سياسات شاملة ودقيقة ومهنية."
        },
        { role: "user", content: prompt }
      ],
      max_tokens: 16000,
    });

    return response.choices[0].message.content || "";
  } catch (error: any) {
    console.error("Error generating privacy policy:", error.message);
    return generateMockPrivacyPolicy(data);
  }
}

function generateMockPrivacyPolicy(data: Partial<PolicyDocument>): string {
  const formattedDate = data.lastUpdatedDate 
    ? new Date(data.lastUpdatedDate).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })
    : new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
  
  const mockDataCategories = Array.isArray(data.dataCategories) ? data.dataCategories : [];
  const dataCategoriesText = mockDataCategories.map((cat: any) => `- ${cat.name}: ${cat.purpose}`).join('\n') || 'غير محدد';
    
  return `سياسة الخصوصية

آخر تحديث: ${formattedDate}

1. مقدمة والتزام بالخصوصية
نحن في ${data.companyName} نلتزم بحماية خصوصيتك وبياناتك الشخصية وفقاً لنظام حماية البيانات الشخصية السعودي.

نوع النشاط: ${data.businessType}
صفة الجهة: ${data.entityType === 'government' ? 'جهة حكومية' : data.entityType === 'private' ? 'شركة/مؤسسة خاصة' : 'فرد'}

2. كيف يتم جمع بياناتك الشخصية وما هو الغرض من جمعها؟

2.1 البيانات التي يتم جمعها
${dataCategoriesText}

2.2 طرق الجمع
${data.collectionMethod === 'direct' ? 'مباشرة من العميل' : data.collectionMethod === 'indirect' ? 'بشكل غير مباشر' : 'مباشرة وغير مباشرة'}

${data.indirectDataSources ? `2.3 مصادر البيانات غير المباشرة
${data.indirectDataSources}` : ''}

3. كيف نستخدم بياناتك الشخصية؟
نستخدم بياناتك للأغراض المحددة في كل فئة من فئات البيانات أعلاه.

${data.processingMethods ? `\nتفاصيل الاستخدام:
${data.processingMethods}` : ''}

4. كيف نفصح عن بياناتك الشخصية؟
مشاركة مع جهات خارجية: ${data.sharesWithThirdParties === 'yes' ? 'نعم' : 'لا'}
${data.sharesWithThirdParties === 'yes' ? 'قد نشارك بياناتك مع أطراف ثالثة موثوقة لتحسين خدماتنا.' : 'لا نشارك بياناتك مع أطراف ثالثة إلا بموافقتك الصريحة.'}

${data.thirdPartyDetails && data.sharesWithThirdParties === 'yes' ? `الجهات الخارجية:
${Array.isArray(data.thirdPartyDetails) ? (data.thirdPartyDetails as any[]).map((p: any) => `- ${p.party}: ${p.purpose}`).join('\n') : ''}` : ''}

5. المسوغات النظامية لجمع ومعالجة بياناتك الشخصية
نقوم بجمع ومعالجة بياناتك الشخصية بناءً على المسوغات النظامية التالية:
- موافقتك الصريحة
- تنفيذ العقد المبرم معك
- الالتزام بالتزام قانوني
- المصلحة المشروعة لنا أو لطرف ثالث
- حماية المصالح الحيوية

6. كيف نقوم بتخزين بياناتك الشخصية؟
${data.storageLocation ? `موقع التخزين: ${data.storageLocation}` : 'يتم تخزين بياناتك في خوادم آمنة.'}

مدة الاحتفاظ: ${data.retentionPeriod}

${data.securityMeasures ? `إجراءات الحماية: ${Array.isArray(data.securityMeasures) ? (data.securityMeasures as any[]).map((m: any) => m.description).join('، ') : ''}` : 'نطبق إجراءات أمنية متقدمة بما في ذلك التشفير والمراقبة المستمرة.'}

7. حقوقك فيما يتعلق بمعالجة بياناتك الشخصية
بموجب نظام حماية البيانات الشخصية السعودي، لديك الحقوق التالية:

- الحق في العلم: معرفة طرق جمع بياناتك ومعالجتها وحفظها والإفصاح عنها
- الحق في الوصول إلى بياناتك الشخصية: طلب الاطلاع على بياناتك وكيفية استخدامها
- الحق في طلب الحصول على بياناتك الشخصية: الحصول على نسخة من بياناتك بصيغة مقروءة
- الحق في تصحيح بياناتك الشخصية: طلب تصحيح البيانات غير الدقيقة أو غير الصحيحة
- الحق في إتلاف بياناتك الشخصية: طلب حذف بياناتك في ظروف معينة
- الحق في الرجوع عن موافقتك على معالجة بياناتك الشخصية: سحب الموافقة في أي وقت

${data.dpoName || data.dpoEmail ? `8. مسؤول حماية البيانات الشخصية
${data.dpoName ? `الاسم: ${data.dpoName}` : ''}
${data.dpoEmail ? `البريد الإلكتروني: ${data.dpoEmail}` : ''}
${data.dpoPhone ? `الهاتف: ${data.dpoPhone}` : ''}
${data.dpoAddress ? `العنوان: ${data.dpoAddress}` : ''}

يمكنك التواصل مع مسؤول حماية البيانات لأي استفسارات أو طلبات تتعلق ببياناتك الشخصية.` : ''}

9. كيف تقدم شكوى أو اعتراض؟
إذا كانت لديك أي شكاوى أو اعتراضات بخصوص معالجة بياناتك الشخصية، يمكنك التواصل معنا عبر:
- البريد الإلكتروني: ${data.contactEmail}
${data.contactPhone ? `- الهاتف: ${data.contactPhone}` : ''}
${data.contactAddress ? `- العنوان: ${data.contactAddress}` : ''}

سنقوم بالرد على شكواك في أقرب وقت ممكن وبما لا يتجاوز 30 يوماً.

10. عنوان الهيئة السعودية للبيانات والذكاء الاصطناعي
يمكنك تقديم شكوى إلى الهيئة السعودية للبيانات والذكاء الاصطناعي:
- العنوان: المملكة العربية السعودية، الرياض
- الموقع الإلكتروني: sdaia.gov.sa
- منصة حوكمة البيانات الوطنية: dgp.sdaia.gov.sa

11. تحديثات السياسة
قد نقوم بتحديث هذه السياسة من وقت لآخر. سيتم إشعارك بأي تغييرات جوهرية عبر البريد الإلكتروني أو من خلال إشعار على موقعنا.

12. معلومات الاتصال النهائية
للاستفسارات حول سياسة الخصوصية، يرجى التواصل معنا:
- الجهة: ${data.companyName}
- البريد الإلكتروني: ${data.contactEmail}
${data.contactPhone ? `- الهاتف: ${data.contactPhone}` : ''}
${data.contactAddress ? `- العنوان: ${data.contactAddress}` : ''}`;
}

export interface TermsDocumentData {
  companyName: string;
  websiteUrl: string;
  businessType: string;
  serviceDescription: string;
  hasUserAccounts: string;
  hasSubscriptions: string;
  paymentMethods?: string[];
  refundPolicy?: string;
  shippingPolicy?: string;
  returnPolicy?: string;
  deliveryTimeframe?: string;
  liabilityLimits?: string;
  governingLaw: string;
  disputeResolution?: string;
  contactEmail: string;
  contactPhone?: string;
  commercialRegistration?: string;
  taxNumber?: string;
  licenseNumber?: string;
  // Template-based generation
  templateSections?: any[];
  templateMetadata?: any;
}

export async function generateTermsAndConditions(data: TermsDocumentData): Promise<string> {
  if (!apiKey || apiKey === "missing-key") {
    console.warn("OpenAI API key not configured, using mock terms and conditions");
    return generateMockTermsAndConditions(data);
  }

  // ====================================
  // Build prompt with template sections
  // ====================================
  let prompt = `أنشئ شروطاً وأحكاماً متوافقة مع الأنظمة السعودية (نظام التجارة الإلكترونية ولائحته التنفيذية) للشركة التالية:

معلومات الشركة:
- اسم الشركة: ${data.companyName}
${data.commercialRegistration ? `- رقم السجل التجاري: ${data.commercialRegistration}` : ''}
${data.taxNumber ? `- الرقم الضريبي: ${data.taxNumber}` : ''}
${data.licenseNumber ? `- رقم الترخيص: ${data.licenseNumber}` : ''}
- الموقع الإلكتروني: ${data.websiteUrl}
- نوع النشاط: ${data.businessType}
- وصف الخدمة: ${data.serviceDescription}
- البريد الإلكتروني: ${data.contactEmail}
${data.contactPhone ? `- الهاتف: ${data.contactPhone}` : ''}

تفاصيل الخدمة:
- حسابات مستخدمين: ${data.hasUserAccounts}
- اشتراكات: ${data.hasSubscriptions}
${data.paymentMethods && data.paymentMethods.length > 0 ? `- طرق الدفع: ${data.paymentMethods.join(', ')}` : ''}
${data.shippingPolicy ? `- سياسة الشحن: ${data.shippingPolicy}` : ''}
${data.deliveryTimeframe ? `- مدة التوصيل: ${data.deliveryTimeframe}` : ''}
${data.returnPolicy ? `- سياسة الاسترجاع: ${data.returnPolicy}` : ''}
${data.refundPolicy ? `- سياسة الاسترداد: ${data.refundPolicy}` : ''}
${data.liabilityLimits ? `- حدود المسؤولية: ${data.liabilityLimits}` : ''}
- القانون الحاكم: ${data.governingLaw}
${data.disputeResolution ? `- حل النزاعات: ${data.disputeResolution}` : ''}
`;

  // ====================================
  // Add template sections as examples
  // ====================================
  if (data.templateSections && data.templateSections.length > 0) {
    prompt += `\n\n=== قوالب الأقسام المتاحة ===\n`;
    prompt += `استخدم الأقسام التالية كقوالب أساسية، واملأ {{المتغيرات}} بالمعلومات المناسبة:\n\n`;
    
    for (const section of data.templateSections) {
      prompt += `${section.heading}\n`;
      prompt += `${section.clauseText}\n`;
      
      if (section.legalBasis && section.legalBasis.length > 0) {
        const references = section.legalBasis.map((ref: any) => 
          `${ref.sourceCode} - المواد: ${ref.articles.join(', ')}`
        ).join('; ');
        prompt += `\nالمرجع القانوني: ${references}\n`;
      }
      prompt += `\n---\n\n`;
    }
  } else {
    // Fallback to default sections if no template
    prompt += `\nيجب أن تتضمن الشروط الأقسام التالية:
1. المقدمة وقبول الشروط
2. معلومات الممارس (وفقاً لنظام التجارة الإلكترونية)
3. الخدمات والمنتجات
4. الدفع والأسعار
5. الشحن والتوصيل (للتجارة الإلكترونية)
6. حق العدول والاسترجاع (7 أيام وفقاً للنظام)
7. المسؤولية والضمانات
8. تسوية النزاعات والقانون الواجب التطبيق
9. معلومات الاتصال
`;
  }

  prompt += `\nملاحظات مهمة:
- استخدم لغة قانونية واضحة وبسيطة باللغة العربية
- التزم بنظام التجارة الإلكترونية ولائحته التنفيذية
- وضح حق العدول خلال 7 أيام للمستهلك
- اذكر آليات تقديم الشكاوى (وزارة التجارة - بلاغ تجاري)
- استخدم تنسيق HTML بسيط مع عناوين <h2> للأقسام الرئيسية و <h3> للأقسام الفرعية
`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "أنت خبير قانوني متخصص في صياغة الشروط والأحكام المتوافقة مع القوانين السعودية."
        },
        { role: "user", content: prompt }
      ],
      max_tokens: 4096,
    });

    return response.choices[0].message.content || "";
  } catch (error: any) {
    console.error("Error generating terms and conditions:", error.message);
    return generateMockTermsAndConditions(data);
  }
}

function generateMockTermsAndConditions(data: TermsDocumentData): string {
  return `الشروط والأحكام

آخر تحديث: ${new Date().toLocaleDateString('ar-SA')}

1. القبول بالشروط
باستخدامك لموقع ${data.companyName} (${data.websiteUrl})، فإنك توافق على الالتزام بهذه الشروط والأحكام.

2. وصف الخدمة
نحن نقدم: ${data.serviceDescription}

3. ${data.hasUserAccounts === 'yes' ? 'حسابات المستخدمين' : 'استخدام الموقع'}
${data.hasUserAccounts === 'yes' ? 
  'يجب عليك إنشاء حساب للوصول إلى بعض ميزات الموقع. أنت مسؤول عن الحفاظ على سرية بيانات حسابك.' :
  'يمكنك استخدام الموقع دون الحاجة إلى إنشاء حساب.'}

4. حقوق الملكية الفكرية
جميع المحتويات على هذا الموقع هي ملك لـ ${data.companyName} ومحمية بموجب قوانين حقوق النشر.

5. ${data.hasSubscriptions === 'yes' ? 'الاشتراكات والمدفوعات' : 'الاستخدام المقبول'}
${data.hasSubscriptions === 'yes' ?
  `طرق الدفع المتاحة: ${data.paymentMethods?.join(', ') || 'سيتم تحديدها عند الاشتراك'}.
${data.refundPolicy || 'سياسة الاسترداد: وفقاً للضوابط المعلنة.'}` :
  'يجب استخدام الموقع بطريقة قانونية ومناسبة فقط.'}

6. حدود المسؤولية
${data.liabilityLimits || 'نقدم الخدمة كما هي دون ضمانات صريحة أو ضمنية.'}

7. القانون الحاكم
تخضع هذه الشروط لقوانين ${data.governingLaw}.

8. حل النزاعات
${data.disputeResolution || 'يتم حل أي نزاعات وفقاً للإجراءات القانونية المعمول بها في المملكة العربية السعودية.'}

9. الاتصال بنا
للاستفسارات:
البريد الإلكتروني: ${data.contactEmail}`;
}

// ==================== AI ASSISTANT FUNCTIONS ====================

/**
 * Generate embeddings for text using OpenAI's text-embedding-3-small model
 * Returns 1536-dimensional vector for semantic search
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  // Check if API key is available
  if (!apiKey || apiKey === "missing-key") {
    console.warn("OpenAI API key not configured, returning zero vector");
    // Return zero vector for testing (1536 dimensions)
    return new Array(1536).fill(0);
  }

  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
      encoding_format: "float",
    });

    return response.data[0].embedding;
  } catch (error: any) {
    console.error("Error generating embedding:", error.message);
    // Return zero vector on error
    return new Array(1536).fill(0);
  }
}

/**
 * Generate embeddings for multiple texts in batch
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  // Check if API key is available
  if (!apiKey || apiKey === "missing-key") {
    console.warn("OpenAI API key not configured, returning zero vectors");
    return texts.map(() => new Array(1536).fill(0));
  }

  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: texts,
      encoding_format: "float",
    });

    return response.data.map(item => item.embedding);
  } catch (error: any) {
    console.error("Error generating embeddings:", error.message);
    return texts.map(() => new Array(1536).fill(0));
  }
}

export interface RetrievedContext {
  id: string;
  title: string;
  content: string;
  category: string;
  similarity: number;
}

export interface ChatAssistantResponse {
  message: string;
  retrievedContext: RetrievedContext[];
}

/**
 * Generate chat response using RAG (Retrieval Augmented Generation)
 * @param userMessage - User's question
 * @param retrievedContext - Relevant knowledge base articles
 * @param conversationHistory - Previous messages for context
 */
export async function generateChatResponse(
  userMessage: string,
  retrievedContext: RetrievedContext[],
  conversationHistory: Array<{ role: string; content: string }> = []
): Promise<string> {
  // Check if API key is available
  if (!apiKey || apiKey === "missing-key") {
    console.warn("OpenAI API key not configured, using mock response");
    return `شكراً لسؤالك! للأسف، لم يتم تكوين مفتاح OpenAI API. هذا رد تجريبي.

بناءً على المعلومات المتاحة في قاعدة المعرفة، يمكنني مساعدتك بشأن:
- نظام حماية البيانات الشخصية (PDPL)
- إدارة الامتثال الداخلي
- توليد سياسات الخصوصية والشروط والأحكام

كيف يمكنني مساعدتك اليوم؟`;
  }

  // Prepare context from retrieved articles
  const contextText = retrievedContext
    .map((ctx, index) => {
      return `[${index + 1}] ${ctx.title}\n${ctx.content.substring(0, 500)}...\n`;
    })
    .join("\n");

  const systemPrompt = `أنت مساعد ذكي متخصص في نظام حماية البيانات الشخصية السعودي (PDPL). مهمتك هي مساعدة المستخدمين بالإجابة على أسئلتهم بناءً على قاعدة المعرفة المتوفرة.

**قواعد الإجابة:**
1. استخدم فقط المعلومات من السياق المُقدم (قاعدة المعرفة)
2. إذا لم تكن المعلومات متوفرة، أخبر المستخدم بذلك بوضوح
3. استخدم لغة واضحة وبسيطة بالعربية
4. كن مهذباً ومحترماً
5. إذا كان السؤال معقداً، قسم الإجابة إلى نقاط
6. أشر إلى المصادر عند الاقتباس من مقالات محددة

**السياق المتاح من قاعدة المعرفة:**
${contextText}

إذا لم يحتوي السياق على المعلومات الكافية للإجابة، أخبر المستخدم بذلك وانصحه بزيارة الهيئة السعودية للبيانات والذكاء الاصطناعي (SDAIA) للحصول على معلومات رسمية.`;

  try {
    // Build messages array with conversation history
    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: systemPrompt },
      ...conversationHistory.slice(-6).map(msg => ({ // Keep last 3 exchanges (6 messages)
        role: msg.role as "user" | "assistant",
        content: msg.content
      })),
      { role: "user", content: userMessage }
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      max_tokens: 1500,
      temperature: 0.7,
    });

    return response.choices[0].message.content || "عذراً، لم أتمكن من توليد إجابة.";
  } catch (error: any) {
    console.error("Error generating chat response:", error.message);
    throw new Error("فشل في توليد الرد. يرجى المحاولة مرة أخرى.");
  }
}