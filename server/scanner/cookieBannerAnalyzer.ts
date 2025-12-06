import * as cheerio from 'cheerio';

export interface CookieCategory {
  name: string;
  nameAr: string;
  detected: boolean;
  hasToggle: boolean;
  defaultEnabled: boolean;
}

export interface CookieBannerAnalysis {
  present: boolean;
  detectionMethod: 'css_class' | 'dom_element' | 'text_content' | 'script' | 'semantic' | 'not_found';
  evidence: string;
  
  bannerType: 'overlay' | 'bottom_bar' | 'top_bar' | 'modal' | 'corner' | 'unknown';
  
  hasAcceptButton: boolean;
  hasRejectButton: boolean;
  hasSettingsButton: boolean;
  hasCloseButton: boolean;
  
  acceptButtonText: string;
  rejectButtonText: string;
  settingsButtonText: string;
  
  granularControls: boolean;
  categories: CookieCategory[];
  
  blocking: boolean;
  blockingEvidence: string;
  
  preConsentCookies: string[];
  preConsentTrackers: string[];
  
  policyLinkPresent: boolean;
  policyLinkUrl: string;
  
  complianceIssues: string[];
  score: number;
}

const CONSENT_MANAGEMENT_PLATFORMS = [
  { name: 'OneTrust', patterns: ['onetrust', 'optanon', 'ot-sdk'], bannerIds: ['onetrust-banner-sdk', 'onetrust-consent-sdk'] },
  { name: 'CookieBot', patterns: ['cookiebot', 'cybot'], bannerIds: ['CybotCookiebotDialog'] },
  { name: 'CookieYes', patterns: ['cookieyes', 'cky-'], bannerIds: ['cky-consent-container'] },
  { name: 'Termly', patterns: ['termly'], bannerIds: ['termly-code-snippet-support'] },
  { name: 'iubenda', patterns: ['iubenda'], bannerIds: ['iubenda-cs-banner'] },
  { name: 'Complianz', patterns: ['complianz', 'cmplz'], bannerIds: ['cmplz-cookiebanner'] },
  { name: 'Didomi', patterns: ['didomi'], bannerIds: ['didomi-consent-popup'] },
  { name: 'UserCentrics', patterns: ['usercentrics'], bannerIds: ['usercentrics-root'] },
  { name: 'Quantcast', patterns: ['quantcast'], bannerIds: ['quantcast-choice'] },
  { name: 'TrustArc', patterns: ['trustarc', 'truste'], bannerIds: ['trustarc-banner'] },
  { name: 'Osano', patterns: ['osano'], bannerIds: ['osano-cm-window'] },
  { name: 'CookieScript', patterns: ['cookie-script', 'cookiescript'], bannerIds: ['cookiescript_badge'] },
  { name: 'Securiti', patterns: ['securiti'], bannerIds: [] },
  { name: 'MooveGDPR', patterns: ['moove_gdpr', 'moove-gdpr'], bannerIds: ['moove_gdpr_cookie_info_bar'] },
];

const COOKIE_CATEGORIES = [
  { name: 'necessary', nameAr: 'ضرورية', keywords: ['necessary', 'essential', 'required', 'strictly necessary', 'ضروري', 'أساسي'] },
  { name: 'analytics', nameAr: 'تحليلية', keywords: ['analytics', 'statistics', 'performance', 'تحليل', 'إحصائيات', 'أداء'] },
  { name: 'marketing', nameAr: 'تسويقية', keywords: ['marketing', 'advertising', 'targeting', 'تسويق', 'إعلان', 'استهداف'] },
  { name: 'functional', nameAr: 'وظيفية', keywords: ['functional', 'preferences', 'personalization', 'وظيفي', 'تفضيلات', 'تخصيص'] },
  { name: 'social_media', nameAr: 'وسائل التواصل', keywords: ['social media', 'social', 'التواصل الاجتماعي'] },
];

const TRACKING_SCRIPTS = [
  { name: 'Google Analytics', patterns: ['google-analytics.com', 'googletagmanager.com', 'gtag', 'ga.js', 'analytics.js'] },
  { name: 'Google Ads', patterns: ['googleadservices.com', 'googlesyndication.com', 'doubleclick.net', 'adservice.google'] },
  { name: 'Facebook Pixel', patterns: ['connect.facebook.net', 'facebook.com/tr', 'fbevents.js', 'fbq('] },
  { name: 'Meta Pixel', patterns: ['facebook.com/tr', 'meta.com'] },
  { name: 'Twitter Pixel', patterns: ['static.ads-twitter.com', 'platform.twitter.com/widgets'] },
  { name: 'LinkedIn Insight', patterns: ['snap.licdn.com', 'linkedin.com/px'] },
  { name: 'TikTok Pixel', patterns: ['analytics.tiktok.com', 'tiktok.com/i18n'] },
  { name: 'Snapchat Pixel', patterns: ['sc-static.net', 'snapchat.com/scevent'] },
  { name: 'Hotjar', patterns: ['static.hotjar.com', 'hotjar.com'] },
  { name: 'Clarity', patterns: ['clarity.ms'] },
  { name: 'Mixpanel', patterns: ['cdn.mxpnl.com', 'mixpanel.com'] },
  { name: 'Segment', patterns: ['cdn.segment.com', 'api.segment.io'] },
  { name: 'Amplitude', patterns: ['cdn.amplitude.com', 'amplitude.com'] },
  { name: 'Pinterest', patterns: ['pintrk', 'ct.pinterest.com'] },
  { name: 'Criteo', patterns: ['static.criteo.net', 'criteo.com'] },
];

function normalizeArabic(text: string): string {
  return text
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[\u064B-\u065F]/g, '')
    .toLowerCase()
    .trim();
}

export function analyzeCookieBanner(html: string, networkCalls: string[] = [], initialCookies: string[] = []): CookieBannerAnalysis {
  console.log('[CookieBannerAnalyzer] Starting deep analysis...');
  const $ = cheerio.load(html);
  
  type CheerioElement = ReturnType<typeof $> extends cheerio.Cheerio<infer T> ? T : never;
  
  const result: CookieBannerAnalysis = {
    present: false,
    detectionMethod: 'not_found',
    evidence: '',
    bannerType: 'unknown',
    hasAcceptButton: false,
    hasRejectButton: false,
    hasSettingsButton: false,
    hasCloseButton: false,
    acceptButtonText: '',
    rejectButtonText: '',
    settingsButtonText: '',
    granularControls: false,
    categories: [],
    blocking: false,
    blockingEvidence: '',
    preConsentCookies: [],
    preConsentTrackers: [],
    policyLinkPresent: false,
    policyLinkUrl: '',
    complianceIssues: [],
    score: 0,
  };
  
  let bannerElement: ReturnType<typeof $> | null = null;
  
  for (const cmp of CONSENT_MANAGEMENT_PLATFORMS) {
    for (const bannerId of cmp.bannerIds) {
      const el = $(`#${bannerId}`);
      if (el.length > 0) {
        result.present = true;
        result.detectionMethod = 'dom_element';
        result.evidence = `Found ${cmp.name} consent banner with ID: ${bannerId}`;
        bannerElement = el;
        break;
      }
    }
    if (result.present) break;
    
    for (const pattern of cmp.patterns) {
      const el = $(`[class*="${pattern}"], [id*="${pattern}"]`);
      if (el.length > 0) {
        result.present = true;
        result.detectionMethod = 'css_class';
        result.evidence = `Found ${cmp.name} consent elements matching: ${pattern}`;
        bannerElement = el.first();
        break;
      }
    }
    if (result.present) break;
  }
  
  if (!result.present) {
    const bannerSelectors = [
      '.cookie-banner', '.cookie-consent', '.cookie-notice', '.cookie-popup',
      '.consent-banner', '.consent-popup', '.privacy-banner', '.gdpr-banner',
      '#cookie-banner', '#cookie-consent', '#consent-banner',
      '[class*="cookie"][class*="banner"]', '[class*="cookie"][class*="consent"]',
      '[class*="consent"][class*="popup"]', '[class*="consent"][class*="modal"]',
    ];
    
    for (const selector of bannerSelectors) {
      const el = $(selector);
      if (el.length > 0) {
        result.present = true;
        result.detectionMethod = 'css_class';
        result.evidence = `Found banner element: ${selector}`;
        bannerElement = el.first();
        break;
      }
    }
  }
  
  if (!result.present) {
    const cookieTextPatterns = [
      'we use cookies', 'this site uses cookies', 'نستخدم ملفات تعريف الارتباط',
      'نستخدم الكوكيز', 'ملفات تعريف الارتباط', 'cookie policy', 'سياسة الكوكيز',
    ];
    
    const htmlLower = html.toLowerCase();
    for (const pattern of cookieTextPatterns) {
      if (htmlLower.includes(pattern.toLowerCase()) || normalizeArabic(html).includes(normalizeArabic(pattern))) {
        const candidates = $('div, section, aside').filter((_, el) => {
          const text = $(el).text().toLowerCase();
          return text.includes(pattern.toLowerCase()) && text.length < 2000;
        });
        
        if (candidates.length > 0) {
          const buttons = candidates.find('button, a[role="button"], input[type="button"]');
          if (buttons.length > 0) {
            result.present = true;
            result.detectionMethod = 'text_content';
            result.evidence = `Found cookie text "${pattern}" with action buttons`;
            bannerElement = candidates.first();
            break;
          }
        }
      }
    }
  }
  
  if (bannerElement && bannerElement.length > 0) {
    const style = bannerElement.attr('style') || '';
    const className = bannerElement.attr('class') || '';
    
    if (style.includes('position: fixed') || className.includes('fixed')) {
      if (style.includes('bottom') || className.includes('bottom')) {
        result.bannerType = 'bottom_bar';
      } else if (style.includes('top') || className.includes('top')) {
        result.bannerType = 'top_bar';
      } else {
        result.bannerType = 'overlay';
      }
    } else if (className.includes('modal') || className.includes('dialog')) {
      result.bannerType = 'modal';
    } else if (className.includes('corner')) {
      result.bannerType = 'corner';
    }
    
    const acceptPatterns = [
      'accept', 'agree', 'allow', 'ok', 'got it', 'continue', 'confirm',
      'قبول', 'أوافق', 'موافق', 'متابعة', 'حسناً', 'فهمت', 'نعم',
    ];
    const rejectPatterns = [
      'reject', 'decline', 'deny', 'refuse', 'no thanks',
      'رفض', 'لا', 'إلغاء', 'أرفض',
    ];
    const settingsPatterns = [
      'settings', 'preferences', 'customize', 'manage', 'options',
      'إعدادات', 'تفضيلات', 'تخصيص', 'خيارات', 'إدارة',
    ];
    
    const allButtons = bannerElement.find('button, a, [role="button"], input[type="submit"], input[type="button"]');
    
    allButtons.each((_, btn) => {
      const text = $(btn).text().toLowerCase().trim();
      const className = ($(btn).attr('class') || '').toLowerCase();
      const id = ($(btn).attr('id') || '').toLowerCase();
      const ariaLabel = ($(btn).attr('aria-label') || '').toLowerCase();
      const combined = text + ' ' + className + ' ' + id + ' ' + ariaLabel;
      
      for (const pattern of acceptPatterns) {
        if (combined.includes(pattern)) {
          result.hasAcceptButton = true;
          result.acceptButtonText = $(btn).text().trim().substring(0, 50);
          break;
        }
      }
      
      for (const pattern of rejectPatterns) {
        if (combined.includes(pattern)) {
          result.hasRejectButton = true;
          result.rejectButtonText = $(btn).text().trim().substring(0, 50);
          break;
        }
      }
      
      for (const pattern of settingsPatterns) {
        if (combined.includes(pattern)) {
          result.hasSettingsButton = true;
          result.settingsButtonText = $(btn).text().trim().substring(0, 50);
          break;
        }
      }
      
      if (combined.includes('close') || combined.includes('إغلاق') || combined.includes('×')) {
        result.hasCloseButton = true;
      }
    });
    
    if ($('#onetrust-accept-btn-handler').length > 0) {
      result.hasAcceptButton = true;
    }
    if ($('#onetrust-reject-all-handler').length > 0) {
      result.hasRejectButton = true;
    }
    if ($('#onetrust-pc-btn-handler').length > 0) {
      result.hasSettingsButton = true;
    }
    
    const toggles = bannerElement.find('input[type="checkbox"], [role="switch"], .toggle, .switch');
    if (toggles.length > 1) {
      result.granularControls = true;
    }
    
    for (const category of COOKIE_CATEGORIES) {
      const categoryEl: CookieCategory = {
        name: category.name,
        nameAr: category.nameAr,
        detected: false,
        hasToggle: false,
        defaultEnabled: false,
      };
      
      for (const keyword of category.keywords) {
        if (bannerElement.text().toLowerCase().includes(keyword)) {
          categoryEl.detected = true;
          
          const categorySection = bannerElement.find(`*:contains("${keyword}")`).first();
          if (categorySection.length > 0) {
            const toggle = categorySection.find('input[type="checkbox"], [role="switch"]');
            if (toggle.length > 0) {
              categoryEl.hasToggle = true;
              categoryEl.defaultEnabled = toggle.is(':checked') || toggle.attr('aria-checked') === 'true';
            }
          }
          break;
        }
      }
      
      if (categoryEl.detected) {
        result.categories.push(categoryEl);
      }
    }
    
    if (result.categories.length > 1 || result.hasSettingsButton) {
      result.granularControls = true;
    }
    
    const policyLink = bannerElement.find('a[href*="privacy"], a[href*="cookie"], a[href*="policy"]');
    if (policyLink.length > 0) {
      result.policyLinkPresent = true;
      result.policyLinkUrl = policyLink.first().attr('href') || '';
    }
  }
  
  for (const tracker of TRACKING_SCRIPTS) {
    for (const pattern of tracker.patterns) {
      const scriptMatch = $(`script[src*="${pattern}"]`).length > 0;
      const inlineMatch = $('script').filter((_, el) => {
        const content = $(el).html() || '';
        return content.includes(pattern);
      }).length > 0;
      
      if (scriptMatch || inlineMatch) {
        result.preConsentTrackers.push(tracker.name);
        break;
      }
    }
  }
  
  for (const call of networkCalls) {
    for (const tracker of TRACKING_SCRIPTS) {
      for (const pattern of tracker.patterns) {
        if (call.includes(pattern) && !result.preConsentTrackers.includes(tracker.name)) {
          result.preConsentTrackers.push(tracker.name);
        }
      }
    }
  }
  
  result.preConsentCookies = initialCookies.slice(0, 20);
  
  if (result.preConsentTrackers.length === 0 && result.present) {
    result.blocking = true;
    result.blockingEvidence = 'No tracking scripts detected before consent interaction';
  } else if (result.preConsentTrackers.length > 0) {
    result.blocking = false;
    result.blockingEvidence = `Detected ${result.preConsentTrackers.length} trackers loading before consent: ${result.preConsentTrackers.join(', ')}`;
  }
  
  if (result.present) {
    if (!result.hasRejectButton) {
      result.complianceIssues.push('Missing reject/decline option for cookies');
    }
    if (!result.granularControls) {
      result.complianceIssues.push('No granular cookie category controls');
    }
    if (!result.blocking && result.preConsentTrackers.length > 0) {
      result.complianceIssues.push('Tracking scripts load before user consent');
    }
    if (!result.policyLinkPresent) {
      result.complianceIssues.push('No link to cookie/privacy policy in banner');
    }
    if (result.preConsentCookies.length > 5) {
      result.complianceIssues.push(`${result.preConsentCookies.length} cookies set before consent`);
    }
  } else {
    result.complianceIssues.push('No cookie consent banner detected');
  }
  
  let score = 0;
  if (result.present) score += 20;
  if (result.hasAcceptButton) score += 10;
  if (result.hasRejectButton) score += 20;
  if (result.granularControls) score += 15;
  if (result.blocking) score += 20;
  if (result.policyLinkPresent) score += 5;
  if (result.categories.length >= 3) score += 10;
  
  result.score = Math.min(100, score);
  
  console.log(`[CookieBannerAnalyzer] Analysis complete. Score: ${result.score}, Issues: ${result.complianceIssues.length}`);
  
  return result;
}
