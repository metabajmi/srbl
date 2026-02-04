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
  detectionMethod: 'dom_element' | 'css_class' | 'text_content' | 'script_analysis' | 'not_found';
  evidence: string;
  bannerType: 'modal' | 'bottom_bar' | 'top_bar' | 'overlay' | 'corner' | 'unknown';
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
  { name: 'OneTrust', patterns: ['onetrust', 'optanon'], bannerIds: ['onetrust-consent-sdk', 'onetrust-banner-sdk'] },
  { name: 'CookieBot', patterns: ['cookiebot', 'cybot'], bannerIds: ['CybotCookiebotDialog'] },
  { name: 'CookieYes', patterns: ['cookieyes', 'cky-'], bannerIds: ['cky-consent-container'] },
  { name: 'TrustArc', patterns: ['trustarc', 'truste'], bannerIds: ['truste-consent-track'] },
  { name: 'Didomi', patterns: ['didomi'], bannerIds: ['didomi-consent-popup'] },
  { name: 'Complianz', patterns: ['complianz', 'cmplz'], bannerIds: ['cmplz-cookiebanner'] },
  { name: 'Termly', patterns: ['termly'], bannerIds: ['termly-consent-banner'] },
  { name: 'Iubenda', patterns: ['iubenda'], bannerIds: ['iubenda-cs-banner'] },
  { name: 'Usercentrics', patterns: ['usercentrics', 'uc-'], bannerIds: ['usercentrics-root'] },
  { name: 'Quantcast', patterns: ['quantcast'], bannerIds: ['qc-cmp-ui'] },
  { name: 'Osano', patterns: ['osano'], bannerIds: ['osano-cookie-consent'] },
  { name: 'CookieScript', patterns: ['cookie-script', 'cookiescript'], bannerIds: ['cookiescript_badge'] },
  { name: 'CookieFirst', patterns: ['cookiefirst'], bannerIds: ['cookiefirst-root'] },
];

const COOKIE_CATEGORIES = [
  { name: 'necessary', nameAr: 'ضرورية', keywords: ['necessary', 'essential', 'required', 'ضرورية', 'أساسية'] },
  { name: 'functional', nameAr: 'وظيفية', keywords: ['functional', 'preferences', 'وظيفية', 'تفضيلات'] },
  { name: 'analytics', nameAr: 'تحليلية', keywords: ['analytics', 'statistics', 'performance', 'تحليلية', 'إحصائيات', 'أداء'] },
  { name: 'marketing', nameAr: 'تسويقية', keywords: ['marketing', 'advertising', 'targeting', 'تسويقية', 'إعلانية'] },
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

// TODO: Re-enable Cookie Banner detection in V2 expansion plan
// TEMPORARY: Bypass Cookie Banner Analysis for Performance Optimization
// The original function performed deep DOM analysis which was time-consuming.
// When re-enabling, restore the full implementation from git history.
export function analyzeCookieBanner(html: string, networkCalls: string[] = [], initialCookies: string[] = []): CookieBannerAnalysis {
  console.log('[CookieBannerAnalyzer] BYPASSED - Returning placeholder result for performance optimization');
  
  return {
    present: false,
    detectionMethod: 'not_found',
    evidence: 'Skipped for optimization',
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
    complianceIssues: ['Cookie banner analysis skipped for performance'],
    score: 0,
  };
}
