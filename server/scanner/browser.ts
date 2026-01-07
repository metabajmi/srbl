import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Browser, Page, Cookie } from 'puppeteer';

// Add stealth plugin to evade bot detection
puppeteer.use(StealthPlugin());

let browserInstance: Browser | null = null;

export interface BrowserCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires: number;
  size: number;
  httpOnly: boolean;
  secure: boolean;
  session: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
  priority?: 'Low' | 'Medium' | 'High';
  sameParty?: boolean;
  sourceScheme?: 'Unset' | 'NonSecure' | 'Secure';
}

export interface DynamicCookieBannerResult {
  found: boolean;
  selector: string | null;
  text: string;
}

export interface BrowserScanResult {
  html: string;
  cookies: BrowserCookie[];
  networkRequests: NetworkRequest[];
  consoleMessages: string[];
  errors: string[];
  finalUrl: string;
  responseHeaders: Record<string, string>;
  loadTime: number;
  dynamicCookieBanner?: DynamicCookieBannerResult;
}

export interface NetworkRequest {
  url: string;
  method: string;
  resourceType: string;
  initiator?: string;
  headers: Record<string, string>;
}

// Randomize user agent to avoid fingerprinting
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15',
];

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function randomDelay(min: number, max: number): Promise<void> {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(resolve => setTimeout(resolve, delay));
}

const BROWSER_OPTIONS = {
  headless: true,
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--disable-gpu',
    '--window-size=1920,1080',
    '--disable-blink-features=AutomationControlled',
    '--disable-features=IsolateOrigins,site-per-process',
    '--disable-web-security',
    '--disable-features=VizDisplayCompositor',
    '--ignore-certificate-errors',
    '--lang=ar-SA,ar,en-US,en',
  ],
};

const PAGE_OPTIONS = {
  timeout: 20000, // Reduced from 45s for faster scans
  waitUntil: 'domcontentloaded' as const,
};

export async function getBrowser(): Promise<Browser> {
  if (!browserInstance || !browserInstance.connected) {
    console.log('[Scanner] Launching new Puppeteer browser instance...');
    browserInstance = await puppeteer.launch(BROWSER_OPTIONS);
    console.log('[Scanner] Browser launched successfully');
  }
  return browserInstance;
}

export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    console.log('[Scanner] Closing browser instance...');
    await browserInstance.close();
    browserInstance = null;
    console.log('[Scanner] Browser closed');
  }
}

export async function scanWithBrowser(url: string): Promise<BrowserScanResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  const consoleMessages: string[] = [];
  const networkRequests: NetworkRequest[] = [];
  let responseHeaders: Record<string, string> = {};
  
  console.log(`[Scanner] Starting browser scan for: ${url}`);
  
  const browser = await getBrowser();
  const page = await browser.newPage();
  
  // Set default timeouts for all operations
  page.setDefaultNavigationTimeout(PAGE_OPTIONS.timeout);
  page.setDefaultTimeout(PAGE_OPTIONS.timeout);
  
  try {
    await page.setViewport({ width: 1920, height: 1080 });
    
    const userAgent = getRandomUserAgent();
    await page.setUserAgent(userAgent);
    console.log(`[Scanner] Using User-Agent: ${userAgent.substring(0, 50)}...`);
    
    await page.setExtraHTTPHeaders({
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'ar-SA,ar;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Cache-Control': 'max-age=0',
      'sec-ch-ua': '"Chromium";v="131", "Not_A Brand";v="24"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
    });
    
    // Emulate real browser properties to bypass bot detection
    await page.evaluateOnNewDocument(() => {
      // Override webdriver flag
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      
      // Add realistic plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => [
          { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
          { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
          { name: 'Native Client', filename: 'internal-nacl-plugin' },
        ],
      });
      
      // Add realistic languages
      Object.defineProperty(navigator, 'languages', { get: () => ['ar-SA', 'ar', 'en-US', 'en'] });
      
      // Override permissions query
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters: any) =>
        parameters.name === 'notifications'
          ? Promise.resolve({ state: 'prompt' } as PermissionStatus)
          : originalQuery(parameters);
    });
    
    page.on('console', (msg) => {
      consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
    });
    
    page.on('pageerror', (err) => {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`Page error: ${message}`);
    });
    
    await page.setRequestInterception(true);
    
    // Resource types to block for faster scanning (we only need text content)
    const BLOCKED_RESOURCE_TYPES = ['image', 'media', 'font'];
    const BLOCKED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico', '.mp4', '.mp3', '.wav', '.ogg', '.webm', '.woff', '.woff2', '.ttf', '.eot', '.otf'];
    
    // Known tracking/analytics patterns to block (SAFE - these never contain policy content)
    const BLOCKED_TRACKERS = [
      'google-analytics.com', 'googletagmanager.com', 'doubleclick.net',
      'facebook.com/tr', 'facebook.net/signals', 'connect.facebook.net',
      'hotjar.com', 'intercom.io', 'segment.com', 'mixpanel.com',
      'mouseflow.com', 'fullstory.com', 'crazyegg.com', 'optimizely.com',
      'amplitude.com', 'heap.io', 'clarity.ms', 'mparticle.com',
      'tiktok.com/i18n', 'snap.licdn.com', 'bat.bing.com', 'adservice.google'
    ];
    
    // Extract main domain to ensure we never block it
    const mainDomain = new URL(url).hostname.replace(/^www\./, '');
    
    page.on('request', (request) => {
      const resourceType = request.resourceType();
      const reqUrl = request.url().toLowerCase();
      const reqDomain = new URL(reqUrl).hostname.replace(/^www\./, '');
      
      // NEVER block main domain resources
      if (reqDomain === mainDomain || reqDomain.endsWith('.' + mainDomain)) {
        networkRequests.push({
          url: request.url(),
          method: request.method(),
          resourceType: resourceType,
          headers: request.headers(),
        });
        request.continue();
        return;
      }
      
      // Block non-text resources to speed up scanning
      if (BLOCKED_RESOURCE_TYPES.includes(resourceType) || 
          BLOCKED_EXTENSIONS.some(ext => reqUrl.includes(ext))) {
        request.abort();
        return;
      }
      
      // Block known trackers/analytics (SAFE - these never contain policy content)
      if (BLOCKED_TRACKERS.some(tracker => reqUrl.includes(tracker))) {
        request.abort();
        return;
      }
      
      // Track the request for analysis
      networkRequests.push({
        url: request.url(),
        method: request.method(),
        resourceType: resourceType,
        headers: request.headers(),
      });
      request.continue();
    });
    
    // Add random delay before navigation to appear more human-like
    await randomDelay(500, 1500);
    
    console.log(`[Scanner] Navigating to ${url}...`);
    let response;
    
    // Smart Timeout: Race between fast navigation and timeout with content verification
    const FAST_TIMEOUT = 7000; // 7 seconds for fast path
    const FULL_TIMEOUT = 20000; // Full timeout as fallback
    const MIN_CONTENT_LENGTH = 500; // Minimum content to consider page loaded
    
    const timeoutPromise = (ms: number) => new Promise<'timeout'>((resolve) => 
      setTimeout(() => resolve('timeout'), ms)
    );
    
    console.log(`[Scanner] Attempting fast navigation (${FAST_TIMEOUT}ms timeout)...`);
    
    let navigationSuccess = false;
    
    // Fast path: try to load with networkidle2 but race against timeout
    try {
      const fastResult = await Promise.race([
        page.goto(url, { timeout: FULL_TIMEOUT, waitUntil: 'networkidle2' }),
        timeoutPromise(FAST_TIMEOUT)
      ]);
      
      if (fastResult === 'timeout') {
        // Timeout triggered - check if we have enough content
        const contentLength = await page.evaluate(() => document.body?.innerText?.length || 0);
        console.log(`[Scanner] Fast timeout triggered, content length: ${contentLength} chars`);
        
        if (contentLength >= MIN_CONTENT_LENGTH) {
          // Enough content loaded, proceed with what we have
          console.log(`[Scanner] ✓ Sufficient content loaded, proceeding with scan`);
          response = null; // We can still scan the page
          navigationSuccess = true;
        } else {
          // Not enough content, wait for full load
          console.log(`[Scanner] Insufficient content, waiting for full load...`);
          try {
            response = await page.waitForNavigation({ timeout: FULL_TIMEOUT - FAST_TIMEOUT, waitUntil: 'load' });
            navigationSuccess = true;
            console.log(`[Scanner] ✓ Full navigation completed`);
          } catch (e) {
            // Even if this fails, check content again
            const finalContent = await page.evaluate(() => document.body?.innerText?.length || 0);
            if (finalContent >= MIN_CONTENT_LENGTH) {
              navigationSuccess = true;
              console.log(`[Scanner] ✓ Recovered with ${finalContent} chars of content`);
            }
          }
        }
      } else {
        response = fastResult;
        navigationSuccess = true;
        console.log(`[Scanner] ✓ Fast navigation completed successfully`);
      }
    } catch (navError) {
      console.log(`[Scanner] Initial navigation failed, trying fallback strategies...`);
      
      // Fallback: try simpler strategies
      const fallbackStrategies = [
        { name: 'domcontentloaded', timeout: 10000, waitUntil: 'domcontentloaded' as const },
        { name: 'load', timeout: 8000, waitUntil: 'load' as const },
      ];
      
      for (const strategy of fallbackStrategies) {
        try {
          console.log(`[Scanner] Trying fallback: ${strategy.name}`);
          response = await page.goto(url, { timeout: strategy.timeout, waitUntil: strategy.waitUntil });
          navigationSuccess = true;
          console.log(`[Scanner] ✓ Fallback ${strategy.name} succeeded`);
          break;
        } catch (e) {
          console.log(`[Scanner] Fallback ${strategy.name} failed`);
        }
      }
    }
    
    if (!navigationSuccess) {
      console.log(`[Scanner] All navigation strategies failed, returning empty result...`);
      return {
        html: '',
        cookies: [],
        networkRequests,
        consoleMessages,
        errors: ['Navigation timeout - site may be blocking automated access or loading slowly'],
        finalUrl: url,
        responseHeaders,
        loadTime: Date.now() - startTime,
      };
    }
    
    if (response) {
      const headers = response.headers();
      responseHeaders = headers;
      console.log(`[Scanner] Page loaded with status: ${response.status()}`);
    }
    
    try {
      await page.waitForSelector('body', { timeout: 2000 });
    } catch (e) {
      console.log(`[Scanner] Body selector wait timed out, continuing anyway...`);
    }
    
    // Wait for JavaScript-rendered content (SPA sites) - optimized for performance
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check for Cloudflare challenge and wait for it to resolve
    const isCloudflareChallenge = await page.evaluate(() => {
      const title = document.title?.toLowerCase() || '';
      const bodyText = document.body?.innerText || '';
      return (
        title.includes('just a moment') ||
        title.includes('checking your browser') ||
        bodyText.includes('يتم الآن التحقق من أنك إنسان') ||
        bodyText.includes('challenges.cloudflare.com') ||
        bodyText.includes('Enable JavaScript and cookies to continue')
      );
    });
    
    if (isCloudflareChallenge) {
      console.log(`[Scanner] ⚠️ Cloudflare challenge detected, attempting bypass...`);
      
      // Simulate human behavior to try to pass bot detection
      try {
        await page.mouse.move(Math.random() * 800 + 100, Math.random() * 400 + 100);
        await new Promise(resolve => setTimeout(resolve, 200));
        await page.mouse.move(Math.random() * 800 + 100, Math.random() * 400 + 100);
        
        const turnstileFrame = page.frames().find(f => f.url().includes('challenges.cloudflare.com'));
        if (turnstileFrame) {
          console.log(`[Scanner] Found Turnstile frame, attempting to interact...`);
          try { await turnstileFrame.click('input[type="checkbox"]'); } catch (e) {}
        }
      } catch (e) {}
      
      // Wait up to 12 seconds for Cloudflare to complete challenge (balanced for performance)
      for (let i = 0; i < 12; i++) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Occasional mouse movement to appear more human
        if (i % 3 === 0) {
          try { await page.mouse.move(Math.random() * 800 + 100, Math.random() * 400 + 100); } catch (e) {}
        }
        
        try {
          const html = await page.content();
          const stillChallenge = (
            html.includes('يتم الآن التحقق من أنك إنسان') ||
            html.includes('challenges.cloudflare.com') ||
            html.includes('Just a moment...') ||
            html.includes('Enable JavaScript and cookies to continue')
          );
          
          if (!stillChallenge && html.length > 50000) {
            console.log(`[Scanner] ✓ Cloudflare bypassed after ${i + 1}s (${html.length} bytes)`);
            await new Promise(resolve => setTimeout(resolve, 500));
            break;
          }
          
          if (i % 5 === 4) {
            console.log(`[Scanner] Still waiting for Cloudflare... (${i + 1}s, ${html.length} bytes)`);
          }
        } catch (e) {
          console.log(`[Scanner] Page navigating... (${i + 1}s)`);
        }
      }
    }
    
    // Brief settle time after page load (optimized for performance)
    await randomDelay(300, 500);
    
    // Simulate minimal human-like behavior for bot detection bypass (optimized for speed)
    try {
      // Single mouse movement
      await page.mouse.move(
        Math.floor(Math.random() * 800) + 100,
        Math.floor(Math.random() * 400) + 100
      );
      
      // Scroll to trigger lazy-loaded content
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
        window.scrollTo(0, 0);
      });
      await randomDelay(100, 200);
      
      console.log(`[Scanner] Human-like behavior simulation completed`);
    } catch (e) {
      console.log(`[Scanner] Human-like behavior simulation skipped`);
    }
    
    const finalUrl = page.url();
    console.log(`[Scanner] Final URL after redirects: ${finalUrl}`);
    
    // Detect failed page load (about:blank, chrome-error, etc.)
    if (finalUrl === 'about:blank' || finalUrl.startsWith('chrome-error://')) {
      console.log(`[Scanner] Page load failed - returning empty result`);
      return {
        html: '',
        cookies: [],
        networkRequests,
        consoleMessages,
        errors: ['Page failed to load - connection blocked or timed out'],
        finalUrl: url,
        responseHeaders,
        loadTime: Date.now() - startTime,
      };
    }
    
    const rawCookies = await page.cookies();
    const cookies: BrowserCookie[] = rawCookies.map(c => ({
      name: c.name,
      value: c.value,
      domain: c.domain,
      path: c.path,
      expires: c.expires ?? -1,
      size: c.size ?? 0,
      httpOnly: c.httpOnly ?? false,
      secure: c.secure ?? false,
      session: c.session ?? false,
      sameSite: c.sameSite as BrowserCookie['sameSite'],
      priority: c.priority as BrowserCookie['priority'],
      sameParty: c.sameParty,
      sourceScheme: c.sourceScheme as BrowserCookie['sourceScheme'],
    }));
    console.log(`[Scanner] Collected ${cookies.length} cookies`);
    
    let html = await page.content();
    console.log(`[Scanner] HTML content length: ${html.length} characters`);
    
    // For SPA sites (Nuxt.js/Next.js), try to extract content from state objects and main content area
    const spaContent = await page.evaluate(() => {
      let extractedContent = '';
      
      // Try Nuxt.js state
      if ((window as any).__NUXT__) {
        try {
          const nuxtData = JSON.stringify((window as any).__NUXT__);
          if (nuxtData.length > 1000) {
            extractedContent = nuxtData;
          }
        } catch (e) {}
      }
      
      // Try Next.js state
      const nextDataEl = document.getElementById('__NEXT_DATA__');
      if (nextDataEl && nextDataEl.textContent) {
        try {
          const nextData = nextDataEl.textContent;
          if (nextData.length > 1000) {
            extractedContent = nextData;
          }
        } catch (e) {}
      }
      
      // Try to find main content area for policy content
      // Start with selectors most likely to contain policy text
      const mainContentSelectors = [
        'main', 'article', '.content', '.main-content', '#content', '#main',
        '[role="main"]', '.page-content', '.article-content', '.post-content',
        '.policy-content', '.privacy-content', '.terms-content'
      ];
      
      let mainContent = '';
      for (let s = 0; s < mainContentSelectors.length; s++) {
        try {
          const el = document.querySelector(mainContentSelectors[s]);
          if (el && (el as HTMLElement).innerText && (el as HTMLElement).innerText.length > 500) {
            mainContent = (el as HTMLElement).innerText;
            break;
          }
        } catch (e) {}
      }
      
      // Fallback: get body text but exclude navigation
      if (!mainContent || mainContent.length < 500) {
        const body = document.body ? document.body.cloneNode(true) : null;
        if (body) {
          const toRemove = (body as HTMLElement).querySelectorAll('nav, header, footer, .nav, .header, .footer, .menu, .navigation, .sidebar');
          for (let j = 0; j < toRemove.length; j++) {
            toRemove[j].remove();
          }
          mainContent = (body as HTMLElement).innerText || '';
        }
      }
      
      return { spaState: extractedContent, mainContent };
    });
    
    // If we found main content, inject it for the parser
    if (spaContent.mainContent.length > 500) {
      console.log(`[Scanner] SPA main content detected: ${spaContent.mainContent.length} chars`);
      // Escape HTML entities to prevent XSS
      const safeContent = spaContent.mainContent
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
      html = html.replace('</body>', `<div id="__SPA_CONTENT__" style="display:none">${safeContent}</div></body>`);
    }
    
    if (spaContent.spaState.length > 1000) {
      console.log(`[Scanner] SPA state object found: ${spaContent.spaState.length} chars`);
      html = html.replace('</body>', `<script id="__SPA_STATE__" type="application/json">${spaContent.spaState}</script></body>`);
    }
    
    // Wait for JavaScript-injected cookie banners to appear
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check for dynamically injected cookie banner in live DOM
    const dynamicCookieBanner = await page.evaluate(() => {
      const bannerSelectors = [
        // Common cookie banner classes
        '[class*="cookie-banner"]', '[class*="cookie-consent"]', '[class*="cookie-notice"]',
        '[class*="gdpr-banner"]', '[class*="consent-banner"]', '[class*="privacy-banner"]',
        '[class*="cookieconsent"]', '[class*="cc-banner"]', '[class*="cookie-popup"]',
        '[class*="cookie-modal"]', '[class*="cookie-dialog"]', '[class*="cookie-alert"]',
        '[class*="cookies-banner"]', '[class*="cookies-notice"]', '[class*="consent-popup"]',
        // Common cookie banner IDs
        '#cookie-banner', '#cookie-consent', '#gdpr-banner', '#consent-banner',
        '#cookieconsent', '#CybotCookiebotDialog', '#onetrust-consent-sdk',
        '#onetrust-banner-sdk', '#ot-sdk-container', '#cky-consent-container',
        '#iubenda-cs-banner', '#cmplz-cookiebanner', '#cookie-law-info-bar',
        '#didomi-consent-popup', '#usercentrics-root', '#sp-cc',
        // Arabic-specific
        '[class*="ملفات-الارتباط"]', '[class*="الكوكيز"]',
      ];
      
      for (const selector of bannerSelectors) {
        try {
          const el = document.querySelector(selector) as HTMLElement | null;
          if (el && (el.offsetParent !== null || el.style.display !== 'none')) { // Check if visible
            return {
              found: true,
              selector,
              text: el.innerText?.substring(0, 200) || ''
            };
          }
        } catch (e) {
          continue;
        }
      }
      
      // Check for cookie consent text in any visible element
      const cookieKeywords = [
        'نستخدم ملفات تعريف الارتباط', 'نستخدم الكوكيز', 'ملفات الارتباط',
        'سياسة ملفات تعريف الارتباط', 'قبول الكوكيز', 'إعدادات الكوكيز',
        'we use cookies', 'this website uses cookies', 'cookie policy',
        'accept cookies', 'cookie preferences', 'manage cookies'
      ];
      
      const allText = document.body?.innerText?.toLowerCase() || '';
      for (const keyword of cookieKeywords) {
        if (allText.includes(keyword.toLowerCase())) {
          // Try to find the element containing this text
          const elements = Array.from(document.querySelectorAll('div, section, aside, dialog, [role="dialog"], [role="alertdialog"]'));
          for (let i = 0; i < elements.length; i++) {
            const el = elements[i] as HTMLElement;
            const elText = el.innerText?.toLowerCase() || '';
            if (elText.includes(keyword.toLowerCase()) && 
                (elText.includes('قبول') || elText.includes('accept') || elText.includes('موافق'))) {
              return {
                found: true,
                selector: 'text_match',
                text: keyword
              };
            }
          }
        }
      }
      
      return { found: false, selector: null, text: '' };
    });
    
    if (dynamicCookieBanner.found) {
      console.log(`[Scanner] Dynamic cookie banner detected via: ${dynamicCookieBanner.selector}`);
    }
    
    const loadTime = Date.now() - startTime;
    console.log(`[Scanner] Scan completed in ${loadTime}ms`);
    
    return {
      html,
      cookies,
      networkRequests,
      consoleMessages,
      errors,
      finalUrl,
      responseHeaders,
      loadTime,
      dynamicCookieBanner,
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Scanner] Error during scan: ${errorMessage}`);
    errors.push(errorMessage);
    
    return {
      html: '',
      cookies: [],
      networkRequests,
      consoleMessages,
      errors,
      finalUrl: url,
      responseHeaders,
      loadTime: Date.now() - startTime,
    };
    
  } finally {
    await page.close();
    console.log('[Scanner] Page closed');
  }
}

/**
 * Clean HTML content by removing non-text elements that add noise without value
 * Preserves all text content including footer, navigation, and policy links
 */
export function cleanHtmlForAnalysis(html: string): string {
  if (!html) return '';
  
  let cleaned = html;
  
  // Remove SVG elements (vector graphics - no text value)
  cleaned = cleaned.replace(/<svg[\s\S]*?<\/svg>/gi, '');
  
  // Remove path elements (SVG paths)
  cleaned = cleaned.replace(/<path[^>]*\/?>/gi, '');
  
  // Remove canvas elements
  cleaned = cleaned.replace(/<canvas[\s\S]*?<\/canvas>/gi, '');
  
  // Remove inline style blocks (CSS - no text value for analysis)
  cleaned = cleaned.replace(/<style[\s\S]*?<\/style>/gi, '');
  
  // Remove script blocks (JavaScript - no text value)
  cleaned = cleaned.replace(/<script[\s\S]*?<\/script>/gi, '');
  
  // Remove base64 encoded data (embedded images/fonts)
  cleaned = cleaned.replace(/data:[^;]+;base64,[a-zA-Z0-9+/=]+/gi, '');
  
  // Remove inline base64 in attributes
  cleaned = cleaned.replace(/src="data:[^"]+"/gi, 'src=""');
  cleaned = cleaned.replace(/href="data:[^"]+"/gi, 'href=""');
  
  // Remove empty tags that may have contained removed content
  cleaned = cleaned.replace(/<(\w+)[^>]*>\s*<\/\1>/gi, '');
  
  // Collapse multiple whitespace
  cleaned = cleaned.replace(/\s{3,}/g, ' ');
  
  return cleaned;
}

export function validateUrl(url: string): { valid: boolean; error?: string; normalizedUrl?: string } {
  try {
    if (!url || typeof url !== 'string') {
      return { valid: false, error: 'URL is required' };
    }
    
    let normalizedUrl = url.trim();
    
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = 'https://' + normalizedUrl;
    }
    
    const parsed = new URL(normalizedUrl);
    
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, error: 'Only HTTP and HTTPS protocols are allowed' };
    }
    
    const hostname = parsed.hostname.toLowerCase();
    
    const blockedHosts = ['localhost', '127.0.0.1', '0.0.0.0', '::1'];
    if (blockedHosts.includes(hostname)) {
      return { valid: false, error: 'Local addresses are not allowed' };
    }
    
    const privateRanges = [
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^192\.168\./,
    ];
    if (privateRanges.some((range) => range.test(hostname))) {
      return { valid: false, error: 'Private IP addresses are not allowed' };
    }
    
    return { valid: true, normalizedUrl };
    
  } catch (error) {
    return { valid: false, error: 'Invalid URL format' };
  }
}
