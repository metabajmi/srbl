import * as cheerio from 'cheerio';
import pLimit from 'p-limit';

export interface DiscoveredPage {
  url: string;
  type: 'privacy' | 'terms' | 'cookies' | 'refund' | 'other';
  foundBy: 'footer' | 'sitemap' | 'link_text' | 'nav' | 'internal_link';
  linkText: string;
  confidence: number;
  depth: number;
}

export interface PageDiscoveryResult {
  pages: DiscoveredPage[];
  sitemap: string | null;
  footerLinks: string[];
  errors: string[];
}

const PRIVACY_PATTERNS = {
  urls: [
    /privacy[-_]?policy/i,
    /privacy/i,
    /policy[-_]?privacy/i,
    /data[-_]?protection/i,
    /سياسة[-_]?الخصوصية/i,
    /الخصوصية/i,
    /خصوصية/i,
  ],
  text: [
    'privacy policy', 'privacy', 'data protection', 'data privacy',
    'سياسة الخصوصية', 'الخصوصية', 'خصوصية', 'حماية البيانات',
    'سياسه الخصوصيه', 'بيان الخصوصية',
  ],
};

const TERMS_PATTERNS = {
  urls: [
    /terms[-_]?(and[-_]?)?conditions/i,
    /terms[-_]?of[-_]?service/i,
    /terms[-_]?of[-_]?use/i,
    /terms/i,
    /conditions/i,
    /tos/i,
    /الشروط[-_]?والأحكام/i,
    /شروط[-_]?الاستخدام/i,
    /الشروط/i,
  ],
  text: [
    'terms and conditions', 'terms of service', 'terms of use', 'terms',
    'conditions', 'user agreement', 'legal terms',
    'الشروط والأحكام', 'شروط الاستخدام', 'الشروط', 'شروط الخدمة',
    'اتفاقية الاستخدام', 'الاحكام والشروط',
  ],
};

const COOKIES_PATTERNS = {
  urls: [
    /cookie[-_]?policy/i,
    /cookies/i,
    /cookie[-_]?consent/i,
    /cookie[-_]?settings/i,
    /سياسة[-_]?الكوكيز/i,
    /ملفات[-_]?تعريف[-_]?الارتباط/i,
  ],
  text: [
    'cookie policy', 'cookies', 'cookie settings', 'cookie preferences',
    'سياسة الكوكيز', 'ملفات تعريف الارتباط', 'سياسة ملفات الارتباط',
    'ملفات الكوكيز', 'الكوكيز',
  ],
};

const REFUND_PATTERNS = {
  urls: [
    /return[-_]?policy/i,
    /refund[-_]?policy/i,
    /exchange[-_]?policy/i,
    /سياسة[-_]?الاسترجاع/i,
    /سياسة[-_]?الاستبدال/i,
    /الارجاع/i,
  ],
  text: [
    'return policy', 'refund policy', 'exchange policy', 'returns',
    'سياسة الاسترجاع', 'سياسة الاستبدال', 'الإرجاع', 'استرجاع',
    'سياسة الإرجاع والاستبدال', 'شروط الارجاع',
  ],
};

function normalizeArabic(text: string): string {
  return text
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[\u064B-\u065F]/g, '')
    .toLowerCase()
    .trim();
}

function normalizeUrl(url: string, baseUrl: string): string | null {
  try {
    if (url.startsWith('javascript:') || url.startsWith('mailto:') || url.startsWith('tel:')) {
      return null;
    }
    const fullUrl = new URL(url, baseUrl);
    if (fullUrl.protocol !== 'http:' && fullUrl.protocol !== 'https:') {
      return null;
    }
    return fullUrl.href;
  } catch {
    return null;
  }
}

// Extract the base domain name without TLD
// e.g., "help.salla.sa" → "salla", "www.salla.com" → "salla"
function extractBaseDomainName(hostname: string): string {
  // Remove common subdomains
  const parts = hostname.split('.');
  if (parts.length <= 2) {
    return parts[0]; // e.g., "salla.com" → "salla"
  }
  
  // Check for common subdomains
  const commonSubdomains = ['www', 'help', 'support', 'docs', 'blog', 'shop', 'store', 'app', 'api', 'm', 'mobile'];
  if (commonSubdomains.includes(parts[0].toLowerCase())) {
    return parts[1]; // e.g., "help.salla.sa" → "salla"
  }
  
  // For 3+ parts, assume format is "subdomain.brand.tld" or "subdomain.brand.co.tld"
  // Return the second-to-last non-TLD part
  const commonTLDs = ['com', 'sa', 'org', 'net', 'gov', 'edu', 'io', 'co', 'me'];
  for (let i = parts.length - 2; i >= 0; i--) {
    if (!commonTLDs.includes(parts[i].toLowerCase())) {
      return parts[i];
    }
  }
  
  return parts[0];
}

function isSameDomain(url1: string, url2: string): boolean {
  try {
    const u1 = new URL(url1);
    const u2 = new URL(url2);
    
    // Exact match or subdomain match
    if (u1.hostname === u2.hostname || 
        u1.hostname.endsWith('.' + u2.hostname) || 
        u2.hostname.endsWith('.' + u1.hostname)) {
      return true;
    }
    
    // Check if base domain name matches (for cross-TLD domains like salla.com → help.salla.sa)
    const base1 = extractBaseDomainName(u1.hostname);
    const base2 = extractBaseDomainName(u2.hostname);
    
    if (base1.toLowerCase() === base2.toLowerCase() && base1.length >= 3) {
      console.log(`[Domain] Allowing cross-TLD domain: ${u1.hostname} ↔ ${u2.hostname} (base: ${base1})`);
      return true;
    }
    
    return false;
  } catch {
    return false;
  }
}

export function discoverLinksFromDOM(html: string, baseUrl: string): { 
  privacyLinks: Array<{ url: string; text: string; confidence: number }>; 
  termsLinks: Array<{ url: string; text: string; confidence: number }>;
  cookiesLinks: Array<{ url: string; text: string; confidence: number }>;
  refundLinks: Array<{ url: string; text: string; confidence: number }>;
} {
  const $ = cheerio.load(html);
  
  const privacyLinks: Array<{ url: string; text: string; confidence: number }> = [];
  const termsLinks: Array<{ url: string; text: string; confidence: number }> = [];
  const cookiesLinks: Array<{ url: string; text: string; confidence: number }> = [];
  const refundLinks: Array<{ url: string; text: string; confidence: number }> = [];
  
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const text = $(el).text().trim();
    const normalized = normalizeUrl(href, baseUrl);
    
    if (!normalized || !isSameDomain(normalized, baseUrl)) return;
    
    // Check Privacy
    for (const pattern of PRIVACY_PATTERNS.urls) {
      if (pattern.test(href)) {
        privacyLinks.push({ url: normalized, text, confidence: 0.95 });
        return;
      }
    }
    for (const keyword of PRIVACY_PATTERNS.text) {
      if (text.toLowerCase().includes(keyword.toLowerCase())) {
        privacyLinks.push({ url: normalized, text, confidence: 0.8 });
        return;
      }
    }
    
    // Check Terms
    for (const pattern of TERMS_PATTERNS.urls) {
      if (pattern.test(href)) {
        termsLinks.push({ url: normalized, text, confidence: 0.95 });
        return;
      }
    }
    for (const keyword of TERMS_PATTERNS.text) {
      if (text.toLowerCase().includes(keyword.toLowerCase())) {
        termsLinks.push({ url: normalized, text, confidence: 0.8 });
        return;
      }
    }
    
    // Check Cookies
    for (const pattern of COOKIES_PATTERNS.urls) {
      if (pattern.test(href)) {
        cookiesLinks.push({ url: normalized, text, confidence: 0.95 });
        return;
      }
    }
    
    // Check Refund
    for (const pattern of REFUND_PATTERNS.urls) {
      if (pattern.test(href)) {
        refundLinks.push({ url: normalized, text, confidence: 0.9 });
        return;
      }
    }
  });
  
  // Log discovered links
  console.log(`\n[LinkDiscovery] ========== LINKS FOUND ON HOMEPAGE ==========`);
  if (privacyLinks.length > 0) {
    console.log(`[LinkDiscovery] PRIVACY POLICY LINKS (${privacyLinks.length}):`);
    privacyLinks.forEach((link, i) => {
      console.log(`  ${i + 1}. ${link.text || '(no text)'} → ${link.url} [confidence: ${(link.confidence * 100).toFixed(0)}%]`);
    });
  } else {
    console.log(`[LinkDiscovery] ❌ NO PRIVACY POLICY LINKS FOUND`);
  }
  
  if (termsLinks.length > 0) {
    console.log(`[LinkDiscovery] TERMS & CONDITIONS LINKS (${termsLinks.length}):`);
    termsLinks.forEach((link, i) => {
      console.log(`  ${i + 1}. ${link.text || '(no text)'} → ${link.url} [confidence: ${(link.confidence * 100).toFixed(0)}%]`);
    });
  } else {
    console.log(`[LinkDiscovery] ❌ NO TERMS LINKS FOUND`);
  }
  
  if (cookiesLinks.length > 0) {
    console.log(`[LinkDiscovery] COOKIES POLICY LINKS (${cookiesLinks.length}):`);
    cookiesLinks.forEach((link, i) => {
      console.log(`  ${i + 1}. ${link.text || '(no text)'} → ${link.url}`);
    });
  }
  
  if (refundLinks.length > 0) {
    console.log(`[LinkDiscovery] REFUND POLICY LINKS (${refundLinks.length}):`);
    refundLinks.forEach((link, i) => {
      console.log(`  ${i + 1}. ${link.text || '(no text)'} → ${link.url}`);
    });
  }
  console.log(`[LinkDiscovery] ${'='.repeat(50)}\n`);
  
  return { privacyLinks, termsLinks, cookiesLinks, refundLinks };
}

function classifyPage(url: string, linkText: string): { type: DiscoveredPage['type']; confidence: number } {
  const urlLower = url.toLowerCase();
  const textNormalized = normalizeArabic(linkText);
  const urlNormalized = normalizeArabic(urlLower);
  
  let bestMatch: { type: DiscoveredPage['type']; confidence: number } = { type: 'other', confidence: 0 };
  
  for (const pattern of PRIVACY_PATTERNS.urls) {
    if (pattern.test(urlLower)) {
      if (bestMatch.confidence < 0.9) {
        bestMatch = { type: 'privacy', confidence: 0.9 };
      }
    }
  }
  for (const text of PRIVACY_PATTERNS.text) {
    if (textNormalized.includes(normalizeArabic(text)) || urlNormalized.includes(normalizeArabic(text))) {
      if (bestMatch.confidence < 0.95) {
        bestMatch = { type: 'privacy', confidence: 0.95 };
      }
    }
  }
  
  for (const pattern of TERMS_PATTERNS.urls) {
    if (pattern.test(urlLower)) {
      if (bestMatch.confidence < 0.9 && bestMatch.type !== 'privacy') {
        bestMatch = { type: 'terms', confidence: 0.9 };
      }
    }
  }
  for (const text of TERMS_PATTERNS.text) {
    if (textNormalized.includes(normalizeArabic(text)) || urlNormalized.includes(normalizeArabic(text))) {
      if (bestMatch.confidence < 0.95 && bestMatch.type !== 'privacy') {
        bestMatch = { type: 'terms', confidence: 0.95 };
      }
    }
  }
  
  for (const pattern of COOKIES_PATTERNS.urls) {
    if (pattern.test(urlLower)) {
      if (bestMatch.confidence < 0.9 && bestMatch.type === 'other') {
        bestMatch = { type: 'cookies', confidence: 0.9 };
      }
    }
  }
  for (const text of COOKIES_PATTERNS.text) {
    if (textNormalized.includes(normalizeArabic(text)) || urlNormalized.includes(normalizeArabic(text))) {
      if (bestMatch.confidence < 0.95 && bestMatch.type === 'other') {
        bestMatch = { type: 'cookies', confidence: 0.95 };
      }
    }
  }
  
  for (const pattern of REFUND_PATTERNS.urls) {
    if (pattern.test(urlLower)) {
      if (bestMatch.confidence < 0.85 && bestMatch.type === 'other') {
        bestMatch = { type: 'refund', confidence: 0.85 };
      }
    }
  }
  for (const text of REFUND_PATTERNS.text) {
    if (textNormalized.includes(normalizeArabic(text)) || urlNormalized.includes(normalizeArabic(text))) {
      if (bestMatch.confidence < 0.9 && bestMatch.type === 'other') {
        bestMatch = { type: 'refund', confidence: 0.9 };
      }
    }
  }
  
  return bestMatch;
}

export function discoverLegalPages(html: string, baseUrl: string): PageDiscoveryResult {
  console.log('[Discovery] Starting legal page discovery...');
  const $ = cheerio.load(html);
  const discovered: DiscoveredPage[] = [];
  const seenUrls = new Set<string>();
  const errors: string[] = [];
  const footerLinks: string[] = [];
  
  function addPage(url: string, linkText: string, foundBy: DiscoveredPage['foundBy'], depth: number) {
    const normalizedUrl = normalizeUrl(url, baseUrl);
    if (!normalizedUrl || seenUrls.has(normalizedUrl)) return;
    if (!isSameDomain(normalizedUrl, baseUrl)) return;
    
    const { type, confidence } = classifyPage(normalizedUrl, linkText);
    if (type !== 'other' || confidence > 0) {
      seenUrls.add(normalizedUrl);
      discovered.push({
        url: normalizedUrl,
        type,
        foundBy,
        linkText: linkText.trim().substring(0, 100),
        confidence,
        depth,
      });
      console.log(`[Discovery] Found ${type} page: ${normalizedUrl} (confidence: ${confidence})`);
    }
  }
  
  $('footer a, [role="contentinfo"] a, .footer a, #footer a').each((_, el) => {
    const href = $(el).attr('href');
    const text = $(el).text().trim();
    if (href) {
      const normalizedUrl = normalizeUrl(href, baseUrl);
      if (normalizedUrl) {
        footerLinks.push(normalizedUrl);
        addPage(href, text, 'footer', 0);
      }
    }
  });
  
  $('nav a, [role="navigation"] a, .nav a, .menu a, .navbar a, header a').each((_, el) => {
    const href = $(el).attr('href');
    const text = $(el).text().trim();
    if (href) {
      addPage(href, text, 'nav', 0);
    }
  });
  
  $('a').each((_, el) => {
    const href = $(el).attr('href');
    const text = $(el).text().trim();
    if (href && text) {
      const { type, confidence } = classifyPage(href, text);
      if (type !== 'other' && confidence >= 0.8) {
        addPage(href, text, 'link_text', 0);
      }
    }
  });
  
  const legalKeywords = [
    'legal', 'policy', 'policies', 'terms', 'privacy', 'cookie', 'sitemap',
    'قانوني', 'سياسة', 'سياسات', 'شروط', 'خصوصية', 'كوكيز',
  ];
  
  $('a').each((_, el) => {
    const href = $(el).attr('href');
    const text = $(el).text().trim().toLowerCase();
    if (href) {
      const hrefLower = href.toLowerCase();
      for (const keyword of legalKeywords) {
        if (hrefLower.includes(keyword) || text.includes(keyword)) {
          addPage(href, text, 'internal_link', 1);
          break;
        }
      }
    }
  });
  
  discovered.sort((a, b) => {
    const typeOrder = { privacy: 0, terms: 1, cookies: 2, refund: 3, other: 4 };
    if (typeOrder[a.type] !== typeOrder[b.type]) {
      return typeOrder[a.type] - typeOrder[b.type];
    }
    return b.confidence - a.confidence;
  });
  
  const uniqueByType = new Map<string, DiscoveredPage>();
  for (const page of discovered) {
    const key = page.type;
    if (!uniqueByType.has(key) || uniqueByType.get(key)!.confidence < page.confidence) {
      uniqueByType.set(key, page);
    }
  }
  
  console.log(`[Discovery] Discovered ${discovered.length} potential legal pages`);
  
  return {
    pages: discovered,
    sitemap: null,
    footerLinks,
    errors,
  };
}

export async function fetchAndDiscoverSitemap(baseUrl: string): Promise<string[]> {
  const sitemapUrls: string[] = [];
  const sitemapLocations = ['/sitemap.xml', '/sitemap_index.xml', '/sitemap/sitemap.xml'];
  
  for (const path of sitemapLocations) {
    try {
      const sitemapUrl = new URL(path, baseUrl).href;
      const response = await fetch(sitemapUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PDPLBot/1.0)' },
        signal: AbortSignal.timeout(10000),
      });
      
      if (response.ok) {
        const xml = await response.text();
        const $ = cheerio.load(xml, { xmlMode: true });
        
        $('loc').each((_, el) => {
          const loc = $(el).text().trim();
          if (loc) {
            const { type } = classifyPage(loc, '');
            if (type !== 'other') {
              sitemapUrls.push(loc);
            }
          }
        });
        
        if (sitemapUrls.length > 0) {
          console.log(`[Discovery] Found ${sitemapUrls.length} legal pages in sitemap`);
          break;
        }
      }
    } catch (error) {
      continue;
    }
  }
  
  return sitemapUrls;
}

// Known policy URLs for popular Saudi Arabian domains
// These are used when Cloudflare or anti-bot protection blocks discovery
export const KNOWN_DOMAIN_POLICIES: Record<string, { 
  privacy?: string; 
  terms?: string; 
  cookies?: string;
  hasCookieBanner?: boolean;
  cookieBannerType?: 'full' | 'basic';
}> = {
  'salla.com': {
    privacy: 'https://salla.com/privacy/',
    terms: 'https://salla.com/terms/',
    hasCookieBanner: true,
    cookieBannerType: 'full', // Has accept/reject
  },
  'noon.com': {
    privacy: 'https://www.noon.com/saudi-ar/privacy-policy/',
    terms: 'https://www.noon.com/saudi-ar/terms-of-use/',
  },
  'jarir.com': {
    privacy: 'https://www.jarir.com/sa-ar/privacy-policy',
    terms: 'https://www.jarir.com/sa-ar/terms-conditions',
  },
  'extra.com': {
    privacy: 'https://www.extra.com/ar-sa/privacy-policy',
    terms: 'https://www.extra.com/ar-sa/terms-and-conditions',
  },
  'namshi.com': {
    privacy: 'https://www.namshi.com/saudi-ar/privacy/',
    terms: 'https://www.namshi.com/saudi-ar/terms/',
  },
  'stcpay.com.sa': {
    privacy: 'https://stcpay.com.sa/privacy-policy',
    terms: 'https://stcpay.com.sa/terms-conditions',
  },
};

const PLATFORM_FALLBACK_PATHS: Record<string, { privacy: string[]; terms: string[]; refund: string[] }> = {
  shopify: {
    privacy: ['/policies/privacy-policy', '/pages/privacy-policy', '/ar/policies/privacy-policy'],
    terms: ['/policies/terms-of-service', '/pages/terms-of-service', '/ar/policies/terms-of-service'],
    refund: ['/policies/refund-policy', '/pages/refund-policy', '/ar/policies/refund-policy'],
  },
  magento: {
    privacy: ['/privacy-policy', '/privacy-policy-cookie-restriction-mode', '/ar/privacy-policy'],
    terms: ['/terms-and-conditions', '/terms-of-use', '/ar/terms-and-conditions'],
    refund: ['/return-policy', '/returns', '/ar/return-policy'],
  },
  woocommerce: {
    privacy: ['/privacy-policy', '/privacy', '/ar/privacy-policy'],
    terms: ['/terms-and-conditions', '/terms', '/ar/terms-and-conditions'],
    refund: ['/refund-policy', '/returns-refunds', '/ar/refund-policy'],
  },
  generic: {
    privacy: [
      '/privacy/', '/privacy-policy', '/privacy', '/pages/privacy-policy', '/pages/privacy',
      '/ar/privacy-policy', '/SA_ar/privacy-policy', '/policies/privacy-policy',
      '/سياسة-الخصوصية', '/privacy-policy.html', '/legal/privacy', '/en/privacy/'
    ],
    terms: [
      '/terms/', '/terms-and-conditions', '/terms', '/pages/terms-and-conditions', '/pages/terms',
      '/ar/terms-and-conditions', '/SA_ar/terms-and-conditions', '/policies/terms-of-service',
      '/الشروط-والأحكام', '/terms.html', '/legal/terms', '/en/terms/'
    ],
    refund: [
      '/refund-policy', '/return-policy', '/pages/refund-policy', '/pages/return-policy',
      '/ar/refund-policy', '/SA_ar/refund-policy', '/policies/refund-policy',
      '/سياسة-الاسترجاع', '/returns', '/shipping-returns'
    ],
  },
};

function detectPlatform(html: string): string {
  const htmlLower = html.toLowerCase();
  if (htmlLower.includes('shopify') || htmlLower.includes('cdn.shopify')) return 'shopify';
  if (htmlLower.includes('magento') || htmlLower.includes('mage-')) return 'magento';
  if (htmlLower.includes('woocommerce') || htmlLower.includes('wc-')) return 'woocommerce';
  return 'generic';
}

export async function discoverFallbackPolicyUrls(baseUrl: string, html: string): Promise<DiscoveredPage[]> {
  const platform = detectPlatform(html);
  console.log(`[FallbackDiscovery] Detected platform: ${platform}`);
  
  const discovered: DiscoveredPage[] = [];
  const seenUrls = new Set<string>();
  
  // FIRST: Check for known domain policies (for sites with anti-bot protection)
  try {
    const urlObj = new URL(baseUrl);
    const hostname = urlObj.hostname.replace(/^www\./, '');
    
    // Check if this domain has known policy URLs
    for (const [domain, policies] of Object.entries(KNOWN_DOMAIN_POLICIES)) {
      if (hostname.includes(domain) || domain.includes(hostname.split('.')[0])) {
        console.log(`[FallbackDiscovery] ✓ Found known domain: ${domain}`);
        
        if (policies.privacy) {
          discovered.push({
            url: policies.privacy,
            type: 'privacy',
            foundBy: 'internal_link',
            linkText: `(known domain: ${domain})`,
            confidence: 0.95,
            depth: 0,
          });
          seenUrls.add(policies.privacy);
          console.log(`[FallbackDiscovery] ✓ Known privacy URL: ${policies.privacy}`);
        }
        
        if (policies.terms) {
          discovered.push({
            url: policies.terms,
            type: 'terms',
            foundBy: 'internal_link',
            linkText: `(known domain: ${domain})`,
            confidence: 0.95,
            depth: 0,
          });
          seenUrls.add(policies.terms);
          console.log(`[FallbackDiscovery] ✓ Known terms URL: ${policies.terms}`);
        }
        
        if (policies.cookies) {
          discovered.push({
            url: policies.cookies,
            type: 'cookies',
            foundBy: 'internal_link',
            linkText: `(known domain: ${domain})`,
            confidence: 0.95,
            depth: 0,
          });
          seenUrls.add(policies.cookies);
        }
        
        // Return early if we found known domain policies
        if (discovered.length > 0) {
          console.log(`[FallbackDiscovery] Using ${discovered.length} known domain policies`);
          return discovered;
        }
      }
    }
  } catch (error) {
    console.warn(`[FallbackDiscovery] Error checking known domains: ${error}`);
  }
  
  // SECOND: Try standard fallback paths
  const fallbackPaths = PLATFORM_FALLBACK_PATHS[platform] || PLATFORM_FALLBACK_PATHS.generic;
  const genericPaths = PLATFORM_FALLBACK_PATHS.generic;
  
  const allPaths = {
    privacy: Array.from(new Set([...fallbackPaths.privacy, ...genericPaths.privacy])),
    terms: Array.from(new Set([...fallbackPaths.terms, ...genericPaths.terms])),
    refund: Array.from(new Set([...fallbackPaths.refund, ...genericPaths.refund])),
  };
  
  async function probeUrl(path: string, type: DiscoveredPage['type']): Promise<boolean> {
    try {
      const fullUrl = new URL(path, baseUrl).href;
      if (seenUrls.has(fullUrl)) return false;
      
      const response = await fetch(fullUrl, {
        method: 'HEAD',
        headers: { 
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(5000),
        redirect: 'follow',
      });
      
      // Accept 200 OK or 403 (Cloudflare challenge - page exists but blocked)
      if (response.ok || response.status === 200 || response.status === 403) {
        seenUrls.add(fullUrl);
        discovered.push({
          url: fullUrl,
          type,
          foundBy: 'internal_link',
          linkText: `(fallback: ${path})`,
          confidence: response.status === 403 ? 0.8 : 0.7, // Higher confidence if Cloudflare blocks (page likely exists)
          depth: 0,
        });
        console.log(`[FallbackDiscovery] ✓ Found ${type} at: ${fullUrl} (status: ${response.status})`);
        return true;
      }
    } catch (error) {
    }
    return false;
  }
  
  console.log(`[FallbackDiscovery] Probing standard policy URLs for ${platform} (parallel with concurrency limit)...`);
  
  // Limit concurrent requests to avoid rate-limiting/WAF triggers
  const limit = pLimit(4);
  
  // Parallel probe function with concurrency control that returns first success
  async function probeUrlsParallel(paths: string[], type: DiscoveredPage['type']): Promise<void> {
    const results = await Promise.allSettled(
      paths.map((path) => limit(async () => {
        try {
          const fullUrl = new URL(path, baseUrl).href;
          if (seenUrls.has(fullUrl)) return null;
          
          const response = await fetch(fullUrl, {
            method: 'HEAD',
            headers: { 
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            },
            signal: AbortSignal.timeout(4000), // Balanced timeout for reliability
            redirect: 'follow',
          });
          
          if (response.ok || response.status === 200 || response.status === 403) {
            return { fullUrl, path, status: response.status };
          }
        } catch (error) {
          // Ignore errors
        }
        return null;
      }))
    );
    
    // Take only the first successful result
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        const { fullUrl, path, status } = result.value;
        if (!seenUrls.has(fullUrl)) {
          seenUrls.add(fullUrl);
          discovered.push({
            url: fullUrl,
            type,
            foundBy: 'internal_link',
            linkText: `(fallback: ${path})`,
            confidence: status === 403 ? 0.8 : 0.7,
            depth: 0,
          });
          console.log(`[FallbackDiscovery] ✓ Found ${type} at: ${fullUrl} (status: ${status})`);
          break; // Only keep first match
        }
      }
    }
  }
  
  // Probe all categories in parallel (each category limited to 4 concurrent requests)
  await Promise.all([
    probeUrlsParallel(allPaths.privacy, 'privacy'),
    probeUrlsParallel(allPaths.terms, 'terms'),
    probeUrlsParallel(allPaths.refund, 'refund'),
  ]);
  
  console.log(`[FallbackDiscovery] Discovered ${discovered.length} pages via fallback probing`);
  return discovered;
}
