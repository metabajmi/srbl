import * as cheerio from 'cheerio';

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

function isSameDomain(url1: string, url2: string): boolean {
  try {
    const u1 = new URL(url1);
    const u2 = new URL(url2);
    return u1.hostname === u2.hostname || 
           u1.hostname.endsWith('.' + u2.hostname) || 
           u2.hostname.endsWith('.' + u1.hostname);
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
