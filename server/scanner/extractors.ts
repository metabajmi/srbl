import * as cheerio from 'cheerio';
import { BrowserCookie, NetworkRequest } from './browser';
import {
  ExtractedCookie,
  ExtractedScript,
  DetectedTracker,
  ExtractedFormField,
  ThirdPartyService,
  SecurityHeaders,
  PrivacyPolicyResult,
  TermsResult,
  CookieBannerResult,
  ContactInfoResult,
} from '@shared/schema';

const TRACKER_SIGNATURES: Record<string, { name: string; type: DetectedTracker['type']; vendor: string }> = {
  'google-analytics.com': { name: 'Google Analytics', type: 'analytics', vendor: 'Google' },
  'googletagmanager.com': { name: 'Google Tag Manager', type: 'analytics', vendor: 'Google' },
  'gtag': { name: 'Google Analytics 4', type: 'analytics', vendor: 'Google' },
  'ga.js': { name: 'Google Analytics (Legacy)', type: 'analytics', vendor: 'Google' },
  'analytics.js': { name: 'Google Universal Analytics', type: 'analytics', vendor: 'Google' },
  'facebook.com/tr': { name: 'Meta Pixel', type: 'advertising', vendor: 'Meta' },
  'connect.facebook.net': { name: 'Meta Pixel', type: 'advertising', vendor: 'Meta' },
  'fbq': { name: 'Meta Pixel', type: 'advertising', vendor: 'Meta' },
  'tiktok.com': { name: 'TikTok Pixel', type: 'advertising', vendor: 'TikTok' },
  'ttq': { name: 'TikTok Pixel', type: 'advertising', vendor: 'TikTok' },
  'snap.licdn.com': { name: 'LinkedIn Insight Tag', type: 'advertising', vendor: 'LinkedIn' },
  'ads.linkedin.com': { name: 'LinkedIn Ads', type: 'advertising', vendor: 'LinkedIn' },
  'twitter.com/i/adsct': { name: 'Twitter/X Pixel', type: 'advertising', vendor: 'X Corp' },
  'ads-twitter.com': { name: 'Twitter/X Ads', type: 'advertising', vendor: 'X Corp' },
  'twq': { name: 'Twitter/X Pixel', type: 'advertising', vendor: 'X Corp' },
  'hotjar.com': { name: 'Hotjar', type: 'heatmap', vendor: 'Hotjar' },
  'hj': { name: 'Hotjar', type: 'heatmap', vendor: 'Hotjar' },
  'clarity.ms': { name: 'Microsoft Clarity', type: 'heatmap', vendor: 'Microsoft' },
  'mouseflow.com': { name: 'Mouseflow', type: 'heatmap', vendor: 'Mouseflow' },
  'fullstory.com': { name: 'FullStory', type: 'heatmap', vendor: 'FullStory' },
  'mixpanel.com': { name: 'Mixpanel', type: 'analytics', vendor: 'Mixpanel' },
  'segment.com': { name: 'Segment', type: 'analytics', vendor: 'Twilio' },
  'segment.io': { name: 'Segment', type: 'analytics', vendor: 'Twilio' },
  'amplitude.com': { name: 'Amplitude', type: 'analytics', vendor: 'Amplitude' },
  'heap.io': { name: 'Heap Analytics', type: 'analytics', vendor: 'Heap' },
  'intercom.io': { name: 'Intercom', type: 'other', vendor: 'Intercom' },
  'crisp.chat': { name: 'Crisp Chat', type: 'other', vendor: 'Crisp' },
  'tawk.to': { name: 'Tawk.to', type: 'other', vendor: 'Tawk.to' },
  'doubleclick.net': { name: 'Google Ads', type: 'advertising', vendor: 'Google' },
  'googlesyndication.com': { name: 'Google AdSense', type: 'advertising', vendor: 'Google' },
  'googleadservices.com': { name: 'Google Ads Conversion', type: 'advertising', vendor: 'Google' },
  'adroll.com': { name: 'AdRoll', type: 'advertising', vendor: 'AdRoll' },
  'criteo.com': { name: 'Criteo', type: 'advertising', vendor: 'Criteo' },
  'taboola.com': { name: 'Taboola', type: 'advertising', vendor: 'Taboola' },
  'outbrain.com': { name: 'Outbrain', type: 'advertising', vendor: 'Outbrain' },
  'pinterest.com/ct': { name: 'Pinterest Tag', type: 'advertising', vendor: 'Pinterest' },
  'snapchat.com': { name: 'Snapchat Pixel', type: 'advertising', vendor: 'Snap Inc' },
};

const COOKIE_CATEGORIES: Record<string, ExtractedCookie['category']> = {
  '_ga': 'analytics',
  '_gid': 'analytics',
  '_gat': 'analytics',
  '_gcl': 'marketing',
  '_fbp': 'marketing',
  '_fbc': 'marketing',
  '_ttp': 'marketing',
  '_tt_': 'marketing',
  '_hjid': 'analytics',
  '_hjSession': 'analytics',
  '_clck': 'analytics',
  '_clsk': 'analytics',
  'PHPSESSID': 'necessary',
  'JSESSIONID': 'necessary',
  'session': 'necessary',
  'csrf': 'necessary',
  'XSRF': 'necessary',
  '__stripe': 'necessary',
  'wp-': 'necessary',
  'wc_': 'necessary',
  'cart': 'necessary',
};

const PERSONAL_DATA_PATTERNS: Record<string, ExtractedFormField['dataCategory']> = {
  'name': 'name',
  'fname': 'name',
  'firstname': 'name',
  'first_name': 'name',
  'lname': 'name',
  'lastname': 'name',
  'last_name': 'name',
  'fullname': 'name',
  'full_name': 'name',
  'email': 'email',
  'mail': 'email',
  'e-mail': 'email',
  'phone': 'phone',
  'tel': 'phone',
  'mobile': 'phone',
  'telephone': 'phone',
  'address': 'address',
  'street': 'address',
  'city': 'address',
  'zip': 'address',
  'postal': 'address',
  'country': 'address',
  'national_id': 'id_number',
  'id_number': 'id_number',
  'passport': 'id_number',
  'ssn': 'id_number',
  'credit_card': 'financial',
  'card_number': 'financial',
  'cvv': 'financial',
  'expiry': 'financial',
  'iban': 'financial',
  'bank': 'financial',
  'health': 'health',
  'medical': 'health',
  'blood': 'health',
  'allergy': 'health',
};

export function extractScripts(html: string): ExtractedScript[] {
  console.log('[Extractor] Extracting scripts...');
  const $ = cheerio.load(html);
  const scripts: ExtractedScript[] = [];
  
  $('script').each((_, el) => {
    const $el = $(el);
    const src = $el.attr('src');
    const content = $el.html() || undefined;
    const isInHead = $el.parents('head').length > 0;
    
    scripts.push({
      type: src ? 'external' : 'inline',
      src: src || undefined,
      content: !src ? content : undefined,
      async: $el.attr('async') !== undefined,
      defer: $el.attr('defer') !== undefined,
      position: isInHead ? 'head' : 'body',
    });
  });
  
  console.log(`[Extractor] Found ${scripts.length} scripts`);
  return scripts;
}

export function extractCookies(browserCookies: BrowserCookie[], pageUrl: string): ExtractedCookie[] {
  console.log('[Extractor] Processing cookies...');
  const url = new URL(pageUrl);
  const pageDomain = url.hostname;
  
  const cookies: ExtractedCookie[] = browserCookies.map(c => {
    const cookieDomain = c.domain.startsWith('.') ? c.domain.slice(1) : c.domain;
    const isThirdParty = !pageDomain.endsWith(cookieDomain) && cookieDomain !== pageDomain;
    
    let category: ExtractedCookie['category'] = 'unknown';
    for (const [pattern, cat] of Object.entries(COOKIE_CATEGORIES)) {
      if (c.name.toLowerCase().includes(pattern.toLowerCase())) {
        category = cat;
        break;
      }
    }
    
    return {
      name: c.name,
      value: c.value.substring(0, 50) + (c.value.length > 50 ? '...' : ''),
      domain: c.domain,
      path: c.path,
      expires: c.expires > 0 ? new Date(c.expires * 1000).toISOString() : undefined,
      httpOnly: c.httpOnly,
      secure: c.secure,
      sameSite: c.sameSite || 'None',
      thirdParty: isThirdParty,
      category,
    };
  });
  
  console.log(`[Extractor] Processed ${cookies.length} cookies (${cookies.filter(c => c.thirdParty).length} third-party)`);
  return cookies;
}

export function detectTrackers(
  html: string, 
  scripts: ExtractedScript[], 
  cookies: ExtractedCookie[],
  networkRequests: NetworkRequest[]
): DetectedTracker[] {
  console.log('[Extractor] Detecting tracking technologies...');
  const trackers: DetectedTracker[] = [];
  const detectedNames = new Set<string>();
  
  for (const script of scripts) {
    const content = script.src || script.content || '';
    for (const [pattern, info] of Object.entries(TRACKER_SIGNATURES)) {
      if (content.toLowerCase().includes(pattern.toLowerCase()) && !detectedNames.has(info.name)) {
        detectedNames.add(info.name);
        trackers.push({
          name: info.name,
          type: info.type,
          detected_via: 'script',
          evidence: script.src || `Inline script contains "${pattern}"`,
          thirdParty: script.type === 'external',
          vendor: info.vendor,
        });
      }
    }
  }
  
  for (const cookie of cookies) {
    for (const [pattern, info] of Object.entries(TRACKER_SIGNATURES)) {
      if (cookie.name.toLowerCase().includes(pattern.toLowerCase()) && !detectedNames.has(info.name)) {
        detectedNames.add(info.name);
        trackers.push({
          name: info.name,
          type: info.type,
          detected_via: 'cookie',
          evidence: `Cookie: ${cookie.name}`,
          thirdParty: cookie.thirdParty,
          vendor: info.vendor,
        });
      }
    }
  }
  
  for (const request of networkRequests) {
    for (const [pattern, info] of Object.entries(TRACKER_SIGNATURES)) {
      if (request.url.toLowerCase().includes(pattern.toLowerCase()) && !detectedNames.has(info.name)) {
        detectedNames.add(info.name);
        trackers.push({
          name: info.name,
          type: info.type,
          detected_via: 'network',
          evidence: request.url,
          thirdParty: true,
          vendor: info.vendor,
        });
      }
    }
  }
  
  console.log(`[Extractor] Detected ${trackers.length} tracking technologies`);
  return trackers;
}

export function extractForms(html: string): ExtractedFormField[] {
  console.log('[Extractor] Extracting form fields...');
  const $ = cheerio.load(html);
  const fields: ExtractedFormField[] = [];
  
  $('input, textarea, select').each((_, el) => {
    const $el = $(el);
    const name = $el.attr('name') || $el.attr('id') || '';
    const type = $el.attr('type') || 'text';
    const placeholder = $el.attr('placeholder') || '';
    const id = $el.attr('id');
    
    if (type === 'hidden' || type === 'submit' || type === 'button' || type === 'reset') {
      return;
    }
    
    const $form = $el.closest('form');
    const formAction = $form.attr('action') || undefined;
    const formMethod = $form.attr('method') || undefined;
    
    let dataCategory: ExtractedFormField['dataCategory'] = 'other';
    const searchText = (name + ' ' + placeholder + ' ' + (id || '')).toLowerCase();
    
    for (const [pattern, category] of Object.entries(PERSONAL_DATA_PATTERNS)) {
      if (searchText.includes(pattern)) {
        dataCategory = category;
        break;
      }
    }
    
    if (type === 'email') dataCategory = 'email';
    if (type === 'tel') dataCategory = 'phone';
    
    fields.push({
      name,
      type,
      id,
      placeholder,
      required: $el.attr('required') !== undefined,
      dataCategory,
      formAction,
      formMethod,
    });
  });
  
  console.log(`[Extractor] Found ${fields.length} form fields`);
  return fields;
}

export function detectThirdPartyServices(networkRequests: NetworkRequest[], pageUrl: string): ThirdPartyService[] {
  console.log('[Extractor] Detecting third-party services...');
  const url = new URL(pageUrl);
  const pageDomain = url.hostname;
  const services: ThirdPartyService[] = [];
  const seenDomains = new Set<string>();
  
  const SERVICE_TYPES: Record<string, { name: string; type: ThirdPartyService['type']; country?: string }> = {
    'googleapis.com': { name: 'Google APIs', type: 'cdn', country: 'US' },
    'gstatic.com': { name: 'Google Static', type: 'cdn', country: 'US' },
    'cloudflare.com': { name: 'Cloudflare', type: 'cdn', country: 'US' },
    'cdnjs.cloudflare.com': { name: 'Cloudflare CDN', type: 'cdn', country: 'US' },
    'jsdelivr.net': { name: 'jsDelivr', type: 'cdn' },
    'unpkg.com': { name: 'unpkg', type: 'cdn' },
    'stripe.com': { name: 'Stripe', type: 'payment', country: 'US' },
    'paypal.com': { name: 'PayPal', type: 'payment', country: 'US' },
    'checkout.com': { name: 'Checkout.com', type: 'payment', country: 'UK' },
    'google-analytics.com': { name: 'Google Analytics', type: 'analytics', country: 'US' },
    'googletagmanager.com': { name: 'Google Tag Manager', type: 'analytics', country: 'US' },
    'facebook.com': { name: 'Facebook', type: 'social', country: 'US' },
    'twitter.com': { name: 'Twitter/X', type: 'social', country: 'US' },
    'linkedin.com': { name: 'LinkedIn', type: 'social', country: 'US' },
    'instagram.com': { name: 'Instagram', type: 'social', country: 'US' },
    'youtube.com': { name: 'YouTube', type: 'social', country: 'US' },
    'doubleclick.net': { name: 'Google Ads', type: 'advertising', country: 'US' },
    'googlesyndication.com': { name: 'Google AdSense', type: 'advertising', country: 'US' },
    'adroll.com': { name: 'AdRoll', type: 'advertising', country: 'US' },
    'criteo.com': { name: 'Criteo', type: 'advertising', country: 'FR' },
    'hotjar.com': { name: 'Hotjar', type: 'analytics', country: 'MT' },
    'clarity.ms': { name: 'Microsoft Clarity', type: 'analytics', country: 'US' },
    'intercom.io': { name: 'Intercom', type: 'other', country: 'US' },
    'zendesk.com': { name: 'Zendesk', type: 'other', country: 'US' },
    'tawk.to': { name: 'Tawk.to', type: 'other' },
    'sentry.io': { name: 'Sentry', type: 'other', country: 'US' },
    'datadog.com': { name: 'Datadog', type: 'analytics', country: 'US' },
  };
  
  for (const request of networkRequests) {
    try {
      const reqUrl = new URL(request.url);
      const domain = reqUrl.hostname;
      
      if (domain === pageDomain || domain.endsWith(`.${pageDomain}`) || pageDomain.endsWith(`.${domain}`)) {
        continue;
      }
      
      if (seenDomains.has(domain)) continue;
      seenDomains.add(domain);
      
      let serviceInfo: { name: string; type: ThirdPartyService['type']; country?: string } | null = null;
      for (const [pattern, info] of Object.entries(SERVICE_TYPES)) {
        if (domain.includes(pattern)) {
          serviceInfo = info;
          break;
        }
      }
      
      if (!serviceInfo) {
        serviceInfo = { name: domain, type: 'other' };
      }
      
      const crossBorder = serviceInfo.country !== undefined && serviceInfo.country !== 'SA';
      
      services.push({
        name: serviceInfo.name,
        domain,
        type: serviceInfo.type,
        dataShared: serviceInfo.type !== 'cdn',
        crossBorder,
        country: serviceInfo.country,
      });
    } catch {
    }
  }
  
  console.log(`[Extractor] Detected ${services.length} third-party services`);
  return services;
}

export function extractSecurityHeaders(headers: Record<string, string>, url: string): SecurityHeaders {
  console.log('[Extractor] Extracting security headers...');
  const isHttps = url.startsWith('https://');
  
  const hstsHeader = headers['strict-transport-security'] || '';
  const hsts = hstsHeader.length > 0;
  let hstsMaxAge: number | undefined;
  const hstsMatch = hstsHeader.match(/max-age=(\d+)/i);
  if (hstsMatch) {
    hstsMaxAge = parseInt(hstsMatch[1], 10);
  }
  
  const cspHeader = headers['content-security-policy'] || '';
  const csp = cspHeader.length > 0;
  
  const referrerHeader = headers['referrer-policy'] || '';
  
  const result: SecurityHeaders = {
    https: isHttps,
    hsts,
    hstsMaxAge,
    csp,
    cspValue: csp ? cspHeader : undefined,
    xFrameOptions: 'x-frame-options' in headers,
    xContentTypeOptions: headers['x-content-type-options']?.toLowerCase() === 'nosniff',
    referrerPolicy: referrerHeader.length > 0,
    referrerPolicyValue: referrerHeader || undefined,
  };
  
  console.log(`[Extractor] Security: HTTPS=${isHttps}, HSTS=${hsts}, CSP=${csp}`);
  return result;
}

export function detectPrivacyPolicy(html: string, finalUrl: string): PrivacyPolicyResult {
  console.log('[Extractor] Detecting privacy policy...');
  const $ = cheerio.load(html);
  
  const arabicPatterns = [
    'سياسة الخصوصية',
    'سياسه الخصوصيه',
    'الخصوصية',
    'حماية البيانات',
    'حماية المعلومات',
    'البيانات الشخصية',
  ];
  
  const englishPatterns = [
    'privacy policy',
    'privacy notice',
    'privacy statement',
    'data protection',
    'data privacy',
  ];
  
  const urlPatterns = [
    /privacy/i,
    /خصوصية/,
    /khosoosiya/i,
    /data-protection/i,
  ];
  
  let found = false;
  let url: string | undefined;
  let detectionMethod: PrivacyPolicyResult['detection_method'] = 'not_found';
  
  $('a').each((_, el) => {
    if (found) return;
    
    const $el = $(el);
    const href = $el.attr('href');
    const text = $el.text().toLowerCase().trim();
    
    for (const pattern of [...arabicPatterns, ...englishPatterns]) {
      if (text.includes(pattern.toLowerCase())) {
        found = true;
        url = href ? new URL(href, finalUrl).href : undefined;
        detectionMethod = 'link_text';
        return false;
      }
    }
    
    if (href) {
      for (const pattern of urlPatterns) {
        if (pattern.test(href)) {
          found = true;
          url = new URL(href, finalUrl).href;
          detectionMethod = 'url_pattern';
          return false;
        }
      }
    }
  });
  
  const requiredElements = [
    'controller_identity',
    'data_types',
    'processing_purposes',
    'legal_basis',
    'data_sharing',
    'retention_period',
    'security_measures',
    'subject_rights',
    'contact_info',
    'policy_updates',
  ];
  
  const elementsFound: string[] = [];
  const elementsMissing: string[] = [...requiredElements];
  
  const result: PrivacyPolicyResult = {
    found,
    url,
    detection_method: detectionMethod,
    content_accessible: found,
    content_length: found ? html.length : undefined,
    elements_found: elementsFound,
    elements_missing: elementsMissing,
  };
  
  console.log(`[Extractor] Privacy policy found: ${found}`);
  return result;
}

export function detectTerms(html: string, finalUrl: string): TermsResult {
  console.log('[Extractor] Detecting terms and conditions...');
  const $ = cheerio.load(html);
  
  const arabicPatterns = [
    'الشروط والأحكام',
    'شروط الاستخدام',
    'شروط الخدمة',
    'الشروط والاحكام',
    'اتفاقية الاستخدام',
  ];
  
  const englishPatterns = [
    'terms and conditions',
    'terms of service',
    'terms of use',
    'terms & conditions',
    'user agreement',
  ];
  
  const urlPatterns = [
    /terms/i,
    /conditions/i,
    /شروط/,
    /احكام/,
    /tos/i,
  ];
  
  let found = false;
  let url: string | undefined;
  let detectionMethod: TermsResult['detection_method'] = 'not_found';
  
  $('a').each((_, el) => {
    if (found) return;
    
    const $el = $(el);
    const href = $el.attr('href');
    const text = $el.text().toLowerCase().trim();
    
    for (const pattern of [...arabicPatterns, ...englishPatterns]) {
      if (text.includes(pattern.toLowerCase())) {
        found = true;
        url = href ? new URL(href, finalUrl).href : undefined;
        detectionMethod = 'link_text';
        return false;
      }
    }
    
    if (href) {
      for (const pattern of urlPatterns) {
        if (pattern.test(href)) {
          found = true;
          url = new URL(href, finalUrl).href;
          detectionMethod = 'url_pattern';
          return false;
        }
      }
    }
  });
  
  const result: TermsResult = {
    found,
    url,
    detection_method: detectionMethod,
    content_accessible: found,
    content_length: found ? html.length : undefined,
  };
  
  console.log(`[Extractor] Terms found: ${found}`);
  return result;
}

export function detectCookieBanner(html: string): CookieBannerResult {
  console.log('[Extractor] Detecting cookie banner...');
  const $ = cheerio.load(html);
  
  const bannerClasses = [
    'cookie-banner', 'cookie-consent', 'cookie-notice', 'cookie-popup',
    'gdpr-banner', 'gdpr-consent', 'consent-banner', 'consent-popup',
    'privacy-banner', 'cc-banner', 'cookieconsent', 'cookie-law',
    'cookies-banner', 'cookies-notice', 'cookies-popup', 'cookie-modal',
    'cookie-dialog', 'cookie-alert', 'cookie-bar', 'cookie-message',
    'cookie-disclaimer', 'cookie-warning', 'cookie-info', 'cookie-notification',
    'cky-consent', 'cky-banner', 'termly-consent', 'iubenda-cs-container',
    'cmplz-cookiebanner', 'moove-gdpr', 'cli-modal', 'catapult-cookie-bar',
  ];
  
  const bannerIds = [
    'cookie-banner', 'cookie-consent', 'gdpr-banner', 'consent-banner',
    'cookie-notice', 'privacy-banner', 'cookieconsent', 'cc-popup',
    'cookies-banner', 'cookie-modal', 'cookie-dialog', 'cookie-alert',
    'cookie-bar', 'cookie-message', 'CybotCookiebotDialog',
    'onetrust-consent-sdk', 'onetrust-banner-sdk', 'ot-sdk-container',
    'cky-consent-container', 'termly-code-snippet-support',
    'iubenda-cs-banner', 'cmplz-cookiebanner', 'cookie-law-info-bar',
  ];
  
  const textPatterns = [
    'نستخدم ملفات تعريف الارتباط',
    'نستخدم الكوكيز',
    'ملفات الارتباط',
    'ملفات تعريف الإرتباط',
    'سياسة ملفات تعريف الارتباط',
    'سياسة الكوكيز',
    'الكوكيز',
    'we use cookies',
    'this website uses cookies',
    'this site uses cookies',
    'our website uses cookies',
    'cookie policy',
    'accept cookies',
    'accept all cookies',
    'cookies help us',
    'cookies to improve',
    'by continuing to use',
    'consent to cookies',
    'cookie preferences',
    'manage cookies',
  ];
  
  let found = false;
  let detectionMethod: CookieBannerResult['detection_method'] = 'not_found';
  let hasAcceptButton = false;
  let hasRejectButton = false;
  let hasSettingsOption = false;
  let evidence: string | undefined;
  
  for (const className of bannerClasses) {
    const el = $(`.${className}`);
    if (el.length > 0) {
      found = true;
      detectionMethod = 'css_class';
      evidence = `Found element with class: ${className}`;
      break;
    }
  }
  
  if (!found) {
    for (const id of bannerIds) {
      const el = $(`#${id}`);
      if (el.length > 0) {
        found = true;
        detectionMethod = 'dom_element';
        evidence = `Found element with id: ${id}`;
        break;
      }
    }
  }
  
  if (!found) {
    const htmlLower = html.toLowerCase();
    for (const pattern of textPatterns) {
      if (htmlLower.includes(pattern.toLowerCase())) {
        found = true;
        detectionMethod = 'text_content';
        evidence = `Found text: "${pattern}"`;
        break;
      }
    }
  }
  
  if (!found) {
    const cookieScripts = [
      'cookieconsent',
      'cookie-consent',
      'onetrust',
      'cookiebot',
      'quantcast',
      'trustarc',
      'usercentrics',
      'termly',
      'iubenda',
      'complianz',
      'cmplz',
      'moove_gdpr',
      'cookie-law-info',
      'cli_cookie',
      'catapult-cookie',
      'osano',
      'cookie-script',
      'cookieyes',
      'cky-consent',
      'securiti',
      'didomi',
    ];
    
    $('script').each((_, el) => {
      const src = $(el).attr('src') || '';
      const content = $(el).html() || '';
      const combined = (src + ' ' + content).toLowerCase();
      
      for (const scriptPattern of cookieScripts) {
        if (combined.includes(scriptPattern)) {
          found = true;
          detectionMethod = 'script';
          evidence = `Found cookie consent script: ${scriptPattern}`;
          return false;
        }
      }
    });
  }
  
  if (found) {
    const acceptPatterns = ['قبول', 'accept', 'agree', 'موافق', 'ok', 'allow'];
    const rejectPatterns = ['رفض', 'reject', 'decline', 'deny', 'refuse'];
    const settingsPatterns = ['تخصيص', 'إعدادات', 'settings', 'preferences', 'customize', 'manage'];
    
    $('button, a, [role="button"]').each((_, el) => {
      const text = $(el).text().toLowerCase().trim();
      
      for (const pattern of acceptPatterns) {
        if (text.includes(pattern)) hasAcceptButton = true;
      }
      for (const pattern of rejectPatterns) {
        if (text.includes(pattern)) hasRejectButton = true;
      }
      for (const pattern of settingsPatterns) {
        if (text.includes(pattern)) hasSettingsOption = true;
      }
    });
  }
  
  let consentMechanism: CookieBannerResult['consent_mechanism'] = 'none';
  if (found) {
    if (hasAcceptButton && hasRejectButton) {
      consentMechanism = 'opt_in';
    } else if (hasAcceptButton && !hasRejectButton) {
      consentMechanism = 'implied';
    } else {
      consentMechanism = 'opt_out';
    }
  }
  
  const result: CookieBannerResult = {
    found,
    detection_method: detectionMethod,
    has_accept_button: hasAcceptButton,
    has_reject_button: hasRejectButton,
    has_settings_option: hasSettingsOption,
    consent_mechanism: consentMechanism,
    evidence,
  };
  
  console.log(`[Extractor] Cookie banner found: ${found}`);
  return result;
}

export function detectContactInfo(html: string): ContactInfoResult {
  console.log('[Extractor] Detecting contact information...');
  const $ = cheerio.load(html);
  const htmlText = $.text();
  
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const phoneRegex = /(?:\+966|00966|0)?(?:5[0-9]|1[0-9])\d{7}/g;
  const saudiPhoneRegex = /(?:\+?966|0)?[15][0-9]{8}/g;
  
  const emails = htmlText.match(emailRegex) || [];
  const phones = htmlText.match(phoneRegex) || htmlText.match(saudiPhoneRegex) || [];
  
  const detectionMethods: string[] = [];
  let email: string | undefined;
  let phone: string | undefined;
  let address: string | undefined;
  let formFound = false;
  
  if (emails.length > 0) {
    email = emails[0];
    detectionMethods.push('email_regex');
  }
  
  if (phones.length > 0) {
    phone = phones[0];
    detectionMethods.push('phone_regex');
  }
  
  const contactForm = $('form').filter((_, el) => {
    const action = $(el).attr('action') || '';
    const className = $(el).attr('class') || '';
    const id = $(el).attr('id') || '';
    const combined = (action + className + id).toLowerCase();
    return combined.includes('contact') || combined.includes('اتصل') || combined.includes('تواصل');
  });
  
  if (contactForm.length > 0) {
    formFound = true;
    detectionMethods.push('contact_form');
  }
  
  const contactLinks = $('a[href*="contact"], a[href*="about"], a[href*="اتصل"], a[href*="تواصل"]');
  if (contactLinks.length > 0) {
    detectionMethods.push('contact_link');
  }
  
  const found = email !== undefined || phone !== undefined || formFound;
  
  const result: ContactInfoResult = {
    found,
    email,
    phone,
    address,
    form_found: formFound,
    detection_methods: detectionMethods,
  };
  
  console.log(`[Extractor] Contact info found: ${found}`);
  return result;
}
