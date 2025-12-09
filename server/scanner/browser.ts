import puppeteer, { Browser, Page, Cookie } from 'puppeteer';

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

export interface BrowserScanResult {
  html: string;
  cookies: BrowserCookie[];
  networkRequests: NetworkRequest[];
  consoleMessages: string[];
  errors: string[];
  finalUrl: string;
  responseHeaders: Record<string, string>;
  loadTime: number;
}

export interface NetworkRequest {
  url: string;
  method: string;
  resourceType: string;
  initiator?: string;
  headers: Record<string, string>;
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
    '--disable-web-security',
    '--disable-features=IsolateOrigins,site-per-process',
    '--disable-http2', // Fallback to HTTP/1.1 for sites with HTTP/2 issues
  ],
};

const PAGE_OPTIONS = {
  timeout: 60000,
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
  
  try {
    await page.setViewport({ width: 1920, height: 1080 });
    
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
    );
    
    await page.setExtraHTTPHeaders({
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Cache-Control': 'max-age=0',
    });
    
    page.on('console', (msg) => {
      consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
    });
    
    page.on('pageerror', (err) => {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`Page error: ${message}`);
    });
    
    await page.setRequestInterception(true);
    
    page.on('request', (request) => {
      networkRequests.push({
        url: request.url(),
        method: request.method(),
        resourceType: request.resourceType(),
        headers: request.headers(),
      });
      request.continue();
    });
    
    console.log(`[Scanner] Navigating to ${url}...`);
    let response;
    try {
      response = await page.goto(url, PAGE_OPTIONS);
    } catch (navError) {
      console.log(`[Scanner] Initial navigation failed, trying with shorter wait...`);
      try {
        response = await page.goto(url, { timeout: 30000, waitUntil: 'domcontentloaded' });
      } catch (retryError) {
        console.log(`[Scanner] Retry also failed, attempting to get partial content...`);
      }
    }
    
    if (response) {
      const headers = response.headers();
      responseHeaders = headers;
      console.log(`[Scanner] Page loaded with status: ${response.status()}`);
    }
    
    try {
      await page.waitForSelector('body', { timeout: 10000 });
    } catch (e) {
      console.log(`[Scanner] Body selector wait timed out, continuing anyway...`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
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
    
    const html = await page.content();
    console.log(`[Scanner] HTML content length: ${html.length} characters`);
    
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
