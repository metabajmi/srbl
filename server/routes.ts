import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import path from "path";
import fs from "fs";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";
import { storage } from "./storage";
import { 
  insertComplianceScanSchema, 
  insertPolicyDocumentSchema, 
  insertConsentRecordSchema, 
  insertTermsDocumentSchema, 
  insertComplianceTaskSchema,
  insertCmpSettingsSchema,
  insertCmpScriptSchema,
  insertRopaEntrySchema,
  insertDsarRequestSchema,
  insertDpiaAssessmentSchema,
  updateRopaEntrySchema,
  updateDsarRequestSchema,
  updateDpiaAssessmentSchema
} from "@shared/schema";
import { 
  generateComplianceReport, 
  generatePrivacyPolicy, 
  generateTermsAndConditions,
  generateEmbedding, 
  generateChatResponse,
  generateWizardPrivacyPolicy,
  type WizardPolicyData,
  type RetrievedContext 
} from "./openai";
import { analyzeSite, convertToLegacyFormat } from "./services/complianceAnalyzer";
import { runComprehensiveScan } from "./scanner/comprehensiveScanner";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { sendPolicyEmail, sendPaymentConfirmationEmail, sendOtpEmail } from "./email";

declare module "express-session" {
  interface SessionData {
    userId?: string;
    adminId?: string;
    adminRole?: "admin" | "legal" | "support";
    // Track last anonymous scan for auto-claiming after registration
    pendingClaimScanId?: string;
    // Store optional name during OTP flow
    pendingUserName?: string;
  }
}

// Helper function to validate URL for security
function validateUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    
    // Only allow http and https
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return false;
    }
    
    // Block localhost and internal IPs
    const hostname = parsedUrl.hostname.toLowerCase();
    if (hostname === 'localhost' || 
        hostname === '127.0.0.1' || 
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        hostname.startsWith('172.')) {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}

// Helper function to fetch website content with improved error handling
async function fetchWebsiteContent(url: string): Promise<string> {
  if (!validateUrl(url)) {
    throw new Error("عنوان URL غير صالح أو محظور لأسباب أمنية");
  }
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      signal: AbortSignal.timeout(45000), // 45 second timeout for slow websites
      redirect: 'follow' // Follow redirects automatically
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("الموقع غير موجود (404). تأكد من صحة الرابط.");
      } else if (response.status === 403) {
        throw new Error("تم رفض الوصول إلى الموقع (403). قد يكون الموقع محمياً.");
      } else if (response.status >= 500) {
        throw new Error("خطأ في خادم الموقع المستهدف. حاول مرة أخرى لاحقاً.");
      }
      throw new Error(`فشل في جلب الموقع: ${response.statusText}`);
    }
    
    const html = await response.text();
    if (!html || html.length < 100) {
      throw new Error("الموقع فارغ أو لا يحتوي على محتوى كافٍ للفحص");
    }
    
    return html;
  } catch (error: any) {
    console.error("Error fetching website:", error);
    
    // Provide user-friendly error messages
    if (error.name === 'AbortError') {
      throw new Error("انتهت مهلة الاتصال بالموقع. تأكد من أن الموقع يعمل أو حاول مرة أخرى.");
    } else if (error.message?.includes('ENOTFOUND')) {
      throw new Error("لم يتم العثور على الموقع. تأكد من صحة الرابط.");
    } else if (error.message?.includes('ECONNREFUSED')) {
      throw new Error("تم رفض الاتصال بالموقع. قد يكون الموقع غير متاح حالياً.");
    } else if (error.message?.includes('ETIMEDOUT')) {
      throw new Error("انتهت مهلة الاتصال. تحقق من اتصالك بالإنترنت أو حاول لاحقاً.");
    }
    
    // If error message is already in Arabic, pass it through
    if (error.message && error.message.match(/[\u0600-\u06FF]/)) {
      throw error;
    }
    
    throw new Error("فشل في الوصول إلى الموقع. تأكد من صحة الرابط وحاول مرة أخرى.");
  }
}

// Background scan processor - Deterministic Rule-Based Analysis
async function processScan(scanId: string) {
  try {
    console.log(`[Scanner] Starting deterministic scan for ID: ${scanId}`);
    
    // Update scan status to scanning
    await storage.updateScan(scanId, { status: "scanning" });
    
    const scan = await storage.getScan(scanId);
    if (!scan) {
      console.error(`[Scanner] Scan not found: ${scanId}`);
      return;
    }
    
    // Run deterministic analysis with Puppeteer
    console.log(`[Scanner] Analyzing URL: ${scan.url}`);
    const deterministicResult = await analyzeSite(scan.url, {
      timeout: 30000,
      retryCount: 2,
    });
    
    // Convert to legacy format for backward compatibility
    const legacyResult = convertToLegacyFormat(deterministicResult);
    
    // Delete existing issues for this scan
    await storage.deleteIssuesByScanId(scanId);
    
    // Create issues from PDPL violations
    let criticalCount = 0;
    let warningCount = 0;
    let suggestionCount = 0;
    
    for (const issue of legacyResult.issues) {
      await storage.createIssue({
        scanId,
        severity: issue.severity,
        category: issue.category,
        title: issue.title,
        description: issue.description,
        articleReference: issue.articleReference || null,
        regulation: issue.articleReference || null,
        remediation: issue.remediation,
        affectedElement: null,
      });
      
      // Count by severity
      if (issue.severity === "critical") criticalCount++;
      else if (issue.severity === "warning") warningCount++;
      else if (issue.severity === "suggestion") suggestionCount++;
    }
    
    // Determine if data collection forms exist
    const hasDataCollectionForms = deterministicResult.personal_data_collection.forms_count > 0;
    
    // Update scan with deterministic results
    await storage.updateScan(scanId, {
      status: "completed",
      completedAt: new Date(),
      overallScore: deterministicResult.overall_score,
      complianceLevel: deterministicResult.compliance_level,
      issuesCount: legacyResult.issues.length,
      criticalCount,
      warningCount,
      suggestionCount,
      // Store compliance findings
      hasPrivacyPolicy: deterministicResult.privacy_policy.found,
      privacyPolicyUrl: deterministicResult.privacy_policy.url || null,
      hasTermsAndConditions: legacyResult.scan.hasTermsAndConditions,
      termsAndConditionsUrl: legacyResult.scan.termsAndConditionsUrl,
      hasCookieBanner: legacyResult.scan.hasCookieBanner,
      hasDataCollectionForms,
      hasContactInfo: legacyResult.scan.hasContactInfo,
      // Store full deterministic result
      analysisResult: deterministicResult as any,
    });
    
    console.log(`[Scanner] Scan completed: Score=${deterministicResult.overall_score}, Level=${deterministicResult.compliance_level}`);
    
  } catch (error: any) {
    console.error("[Scanner] Error processing scan:", error);
    
    // Extract user-friendly error message
    let errorMessage = "حدث خطأ غير متوقع أثناء الفحص";
    if (error.message) {
      // If error is already in Arabic, use it
      if (error.message.match(/[\u0600-\u06FF]/)) {
        errorMessage = error.message;
      } else if (error.message.includes('timeout')) {
        errorMessage = "انتهت مهلة الفحص. قد يكون الموقع بطيئاً. حاول مرة أخرى.";
      } else if (error.message.includes('fetch') || error.message.includes('browser')) {
        errorMessage = "فشل في الوصول إلى الموقع. تأكد من صحة الرابط.";
      } else if (error.message.includes('Protocol error') || error.message.includes('chromium')) {
        errorMessage = "خطأ في المتصفح. يرجى المحاولة مرة أخرى.";
      }
    }
    
    await storage.updateScan(scanId, { 
      status: "failed",
      completedAt: new Date(),
      errorMessage
    });
  }
}

export async function registerRoutes(app: Express): Promise<Server> {

  app.get("/.well-known/apple-developer-merchantid-domain-association", (_req, res) => {
    const possiblePaths = [
      path.resolve("client/public/.well-known/apple-developer-merchantid-domain-association"),
      path.resolve("dist/public/.well-known/apple-developer-merchantid-domain-association"),
      path.resolve(".well-known/apple-developer-merchantid-domain-association"),
      path.join(import.meta.dirname, "public/.well-known/apple-developer-merchantid-domain-association"),
    ];
    
    for (const filePath of possiblePaths) {
      if (fs.existsSync(filePath)) {
        return res.type("text/plain").sendFile(filePath);
      }
    }
    
    res.status(404).send("Not found");
  });
  
  // ============================================
  // Session Configuration
  // ============================================
  
  // Trust proxy for Replit's reverse proxy (required for secure cookies)
  app.set("trust proxy", 1);
  
  const PgSession = connectPgSimple(session);
  
  app.use(
    session({
      store: new PgSession({
        pool,
        tableName: "session",
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET || "pdpl-compliance-secret-key-change-in-production",
      resave: false,
      saveUninitialized: true,
      cookie: {
        maxAge: 1 * 60 * 60 * 1000, // 1 hour
        httpOnly: true,
        secure: true,
        sameSite: "none",
      },
    })
  );

  // ============================================
  // Authentication Middleware
  // ============================================
  
  // Middleware to check if user is authenticated
  const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    console.log(`[Auth] ${req.method} ${req.path} | sessionID: ${req.sessionID?.substring(0, 8)}... | userId: ${req.session.userId || 'NONE'} | cookie: ${req.headers.cookie ? 'YES' : 'NO'}`);
    if (!req.session.userId) {
      return res.status(401).json({ message: "غير مصرح. يرجى تسجيل الدخول" });
    }
    next();
  };
  
  // Middleware to check if admin is authenticated
  const requireAdminAuth = (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.adminId) {
      return res.status(401).json({ message: "غير مصرح. يرجى تسجيل الدخول كمسؤول" });
    }
    next();
  };
  
  // Middleware to check admin role (admin only)
  const requireAdminRole = (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.adminId) {
      return res.status(401).json({ message: "غير مصرح. يرجى تسجيل الدخول كمسؤول" });
    }
    if (req.session.adminRole !== "admin") {
      return res.status(403).json({ message: "غير مصرح. هذه الصلاحية متاحة للمسؤولين فقط" });
    }
    next();
  };
  
  // Middleware to check admin or legal role
  const requireAdminOrLegal = (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.adminId) {
      return res.status(401).json({ message: "غير مصرح. يرجى تسجيل الدخول كمسؤول" });
    }
    if (req.session.adminRole !== "admin" && req.session.adminRole !== "legal") {
      return res.status(403).json({ message: "غير مصرح. هذه الصلاحية متاحة للمسؤولين والقانونيين فقط" });
    }
    next();
  };

  // ============================================
  // Authentication Routes
  // ============================================
  
  // Register new user
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, name } = req.body;
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "البريد الإلكتروني مسجل مسبقاً" });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Save pending scan ID before session regeneration
      const pendingClaimScanId = req.session.pendingClaimScanId;
      
      // Create user
      const user = await storage.createUser({
        email,
        password: hashedPassword,
        name,
      });
      
      // Create session
      req.session.userId = user.id.toString();
      
      // Auto-claim any pending scan from before registration
      let claimedScanId = null;
      if (pendingClaimScanId) {
        try {
          await storage.claimScan(pendingClaimScanId, user.id.toString());
          claimedScanId = pendingClaimScanId;
          delete req.session.pendingClaimScanId;
        } catch (err) {
          console.error("Failed to auto-claim scan:", err);
        }
      }
      
      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;
      
      res.status(201).json({ 
        user: userWithoutPassword,
        claimedScanId, // Include claimed scan ID so frontend can redirect
      });
    } catch (error) {
      console.error("Error registering user:", error);
      res.status(500).json({ error: "فشل في تسجيل المستخدم" });
    }
  });
  
  // Login
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "البريد الإلكتروني أو كلمة المرور غير صحيحة" });
      }
      
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ error: "البريد الإلكتروني أو كلمة المرور غير صحيحة" });
      }
      
      // Save pending scan ID before session regeneration
      const pendingClaimScanId = req.session.pendingClaimScanId;
      
      // Regenerate session to prevent session fixation
      await new Promise<void>((resolve, reject) => {
        req.session.regenerate((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      
      // Create session
      req.session.userId = user.id.toString();
      
      // Auto-claim any pending scan from before login
      let claimedScanId = null;
      if (pendingClaimScanId) {
        try {
          await storage.claimScan(pendingClaimScanId, user.id.toString());
          claimedScanId = pendingClaimScanId;
        } catch (err) {
          console.error("Failed to auto-claim scan:", err);
        }
      }
      
      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;
      res.json({ 
        user: userWithoutPassword,
        claimedScanId, // Include claimed scan ID so frontend can redirect
      });
    } catch (error) {
      console.error("Error logging in:", error);
      res.status(500).json({ error: "فشل في تسجيل الدخول" });
    }
  });
  
  // Get current user
  app.get("/api/auth/me", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ error: "المستخدم غير موجود" });
      }
      
      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      console.error("Error getting current user:", error);
      res.status(500).json({ error: "فشل في جلب بيانات المستخدم" });
    }
  });
  
  // Logout
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Error destroying session:", err);
        return res.status(500).json({ error: "فشل في تسجيل الخروج" });
      }
      res.clearCookie("connect.sid");
      res.json({ message: "تم تسجيل الخروج بنجاح" });
    });
  });

  // ============================================
  // OTP Authentication (Passwordless)
  // ============================================

  // Generate 6-digit OTP code
  function generateOtpCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Send OTP code
  app.post("/api/auth/otp/send", async (req, res) => {
    try {
      const { email, name } = req.body;
      
      if (!email || typeof email !== 'string') {
        return res.status(400).json({ error: "يجب إدخال البريد الإلكتروني" });
      }
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "صيغة البريد الإلكتروني غير صحيحة" });
      }
      
      // Rate limiting: check if recent OTP exists (within 1 minute)
      const existingOtp = await storage.getLatestOtpByEmail(email);
      if (existingOtp) {
        const timeSinceCreation = Date.now() - new Date(existingOtp.createdAt!).getTime();
        if (timeSinceCreation < 60000) { // 1 minute cooldown
          const remainingSeconds = Math.ceil((60000 - timeSinceCreation) / 1000);
          return res.status(429).json({ 
            error: `يرجى الانتظار ${remainingSeconds} ثانية قبل طلب رمز جديد`,
            retryAfter: remainingSeconds
          });
        }
      }
      
      // Generate OTP
      const code = generateOtpCode();
      const codeHash = await bcrypt.hash(code, 10);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      
      // Store OTP
      await storage.createOtpToken(email, codeHash, expiresAt);
      
      // Send OTP email
      await sendOtpEmail({ to: email, code });
      
      // Store optional name for later user creation
      if (name) {
        req.session.pendingUserName = name;
      }
      
      res.json({ 
        success: true, 
        message: "تم إرسال رمز التحقق إلى بريدك الإلكتروني",
        expiresIn: 600 // 10 minutes in seconds
      });
    } catch (error) {
      console.error("Error sending OTP:", error);
      res.status(500).json({ error: "فشل في إرسال رمز التحقق" });
    }
  });

  // Verify OTP code and authenticate
  app.post("/api/auth/otp/verify", async (req, res) => {
    try {
      const { email, code } = req.body;
      
      if (!email || !code) {
        return res.status(400).json({ error: "يجب إدخال البريد الإلكتروني ورمز التحقق" });
      }
      
      // Get latest OTP for email
      const otpToken = await storage.getLatestOtpByEmail(email);
      if (!otpToken) {
        return res.status(401).json({ error: "لم يتم العثور على رمز تحقق. يرجى طلب رمز جديد" });
      }
      
      // Check expiration
      if (new Date(otpToken.expiresAt) < new Date()) {
        return res.status(401).json({ error: "انتهت صلاحية رمز التحقق. يرجى طلب رمز جديد" });
      }
      
      // Check attempt count (max 5 attempts)
      if ((otpToken.attemptCount || 0) >= 5) {
        return res.status(429).json({ error: "تم تجاوز عدد المحاولات المسموح. يرجى طلب رمز جديد" });
      }
      
      // Verify code
      const isValid = await bcrypt.compare(code, otpToken.codeHash);
      if (!isValid) {
        await storage.incrementOtpAttempt(otpToken.id);
        const remaining = 5 - (otpToken.attemptCount || 0) - 1;
        return res.status(401).json({ 
          error: `رمز التحقق غير صحيح. المحاولات المتبقية: ${remaining}` 
        });
      }
      
      // Mark OTP as verified
      await storage.markOtpVerified(otpToken.id);
      
      // Get or create user
      const pendingName = (req.session as any).pendingUserName;
      const user = await storage.createOrGetUserByEmail(email, pendingName);
      delete (req.session as any).pendingUserName;
      
      // Save pending scan ID
      const pendingClaimScanId = req.session.pendingClaimScanId;
      
      // Set userId on existing session (avoid regenerate which breaks cookie delivery)
      req.session.userId = user.id.toString();
      
      // Auto-claim any pending scan
      let claimedScanId = null;
      if (pendingClaimScanId) {
        try {
          await storage.claimScan(pendingClaimScanId, user.id.toString());
          claimedScanId = pendingClaimScanId;
        } catch (err) {
          console.error("Failed to auto-claim scan:", err);
        }
      }
      
      // Explicitly save session to PostgreSQL before responding
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      
      console.log(`[OTP Verify] Session saved. sessionID: ${req.sessionID?.substring(0, 8)}... | userId: ${req.session.userId} | cookie sent: ${req.headers.cookie ? 'YES' : 'NO'}`);
      
      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;
      
      res.json({ 
        success: true,
        user: userWithoutPassword,
        claimedScanId,
        message: "تم تسجيل الدخول بنجاح"
      });
    } catch (error) {
      console.error("Error verifying OTP:", error);
      res.status(500).json({ error: "فشل في التحقق من الرمز" });
    }
  });

  // ============================================
  // Client Policy Routes
  // ============================================
  
  // Get client policies
  app.get("/api/client/policies", requireAuth, async (req, res) => {
    try {
      const policies = await storage.getClientPoliciesByUserId(req.session.userId!.toString());
      res.json(policies);
    } catch (error) {
      console.error("Error fetching client policies:", error);
      res.status(500).json({ error: "فشل في جلب السياسات" });
    }
  });
  
  // Create client policy
  app.post("/api/client/policies", requireAuth, async (req, res) => {
    try {
      const policy = await storage.createClientPolicy({
        ...req.body,
        userId: req.session.userId!.toString(),
      });
      res.status(201).json(policy);
    } catch (error) {
      console.error("Error creating client policy:", error);
      res.status(500).json({ error: "فشل في إنشاء السياسة" });
    }
  });

  // ============================================
  // Client Request Routes
  // ============================================
  
  // Get client requests
  app.get("/api/client/requests", requireAuth, async (req, res) => {
    try {
      const requests = await storage.getClientRequestsByUserId(req.session.userId!.toString());
      res.json(requests);
    } catch (error) {
      console.error("Error fetching client requests:", error);
      res.status(500).json({ error: "فشل في جلب الطلبات" });
    }
  });
  
  // Create client request
  app.post("/api/client/requests", requireAuth, async (req, res) => {
    try {
      const request = await storage.createClientRequest({
        ...req.body,
        userId: req.session.userId!.toString(),
      });
      res.status(201).json(request);
    } catch (error) {
      console.error("Error creating client request:", error);
      res.status(500).json({ error: "فشل في إنشاء الطلب" });
    }
  });

  // ============================================
  // Compliance Scan Routes
  // ============================================
  
  // Create a new compliance scan
  app.post("/api/scans", async (req, res) => {
    try {
      const validatedData = insertComplianceScanSchema.parse(req.body);
      
      // If user is logged in, associate scan with their account
      const userId = req.session.userId || null;
      
      // Create scan with userId and isClaimedByUser passed separately
      const scanData: any = {
        ...validatedData,
        userId: userId,
        isClaimedByUser: !!userId,
      };
      const scan = await storage.createScan(scanData);
      
      // If not logged in, save scan ID in session for auto-claiming after registration
      if (!userId) {
        req.session.pendingClaimScanId = scan.id;
      }
      
      // Update status to scanning
      await storage.updateScan(scan.id, { status: "scanning" });
      
      // Return scan immediately so frontend can navigate to loading page
      res.json({ ...scan, status: "scanning" });
      
      // Run comprehensive scan in background (non-blocking)
      runComprehensiveScanInBackground(scan.id, validatedData.url);
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          error: "بيانات غير صحيحة", 
          details: error.errors 
        });
      } else {
        console.error("Error creating scan:", error);
        res.status(500).json({ error: "فشل في إنشاء الفحص" });
      }
    }
  });
  
  // Background scan processor - runs comprehensive scan asynchronously
  async function runComprehensiveScanInBackground(scanId: string, url: string) {
    try {
      console.log(`[Scanner] Starting background comprehensive scan for: ${url}`);
      
      const comprehensiveResult = await runComprehensiveScan(url, {
        deep_scan: true,
        fetch_policy_content: true,
        max_pages_to_crawl: 20,
        render_timeout_ms: 60000,
      });
      
      console.log(`[Scanner] Background scan completed with score: ${comprehensiveResult.overall_score}%`);
      
      // Calculate issue counts from pdpl_checks
      const violations = comprehensiveResult.pdpl_checks?.filter((c: any) => !c.compliant) || [];
      const criticalCount = violations.filter((v: any) => v.severity === 'critical' || v.severity === 'high').length;
      const warningCount = violations.filter((v: any) => v.severity === 'warning' || v.severity === 'medium').length;
      const suggestionCount = violations.filter((v: any) => v.severity === 'suggestion' || v.severity === 'low' || v.severity === 'info').length;
      
      // Extract privacy policy and terms info from discovered pages
      const discoveredPages = comprehensiveResult.discovered_pages || [];
      const privacyPage = discoveredPages.find((p: any) => p.type === 'privacy');
      const termsPage = discoveredPages.find((p: any) => p.type === 'terms');
      
      // Also check if privacy_policy_audit exists (means we found and analyzed a privacy policy)
      const hasPrivacyPolicy = !!(privacyPage || comprehensiveResult.privacy_policy_audit);
      const privacyPolicyUrl = privacyPage?.url || comprehensiveResult.legal_pages?.find((p: any) => p.type === 'privacy')?.url || null;
      
      const hasTermsAndConditions = !!(termsPage || comprehensiveResult.terms_conditions_audit);
      const termsAndConditionsUrl = termsPage?.url || comprehensiveResult.legal_pages?.find((p: any) => p.type === 'terms')?.url || null;
      
      // Update scan with comprehensive results
      await storage.updateScan(scanId, {
        status: "completed",
        completedAt: new Date(),
        overallScore: comprehensiveResult.overall_score,
        issuesCount: violations.length,
        criticalCount,
        warningCount,
        suggestionCount,
        hasPrivacyPolicy,
        privacyPolicyUrl,
        hasTermsAndConditions,
        termsAndConditionsUrl,
        analysisResult: comprehensiveResult as any,
      });
      
      console.log(`[Scanner] Scan ${scanId} completed and saved`);
      
    } catch (scanError) {
      console.error(`[Scanner] Error during background scan:`, scanError);
      await storage.updateScan(scanId, { 
        status: "failed",
        analysisResult: { error: scanError instanceof Error ? scanError.message : "فشل في الفحص" } as any,
      });
    }
  }

  // Get all scans
  app.get("/api/scans", async (req, res) => {
    try {
      const scans = await storage.getAllScans();
      res.json(scans);
    } catch (error) {
      console.error("Error fetching scans:", error);
      res.status(500).json({ error: "فشل في جلب الفحوصات" });
    }
  });

  // Get a specific scan
  app.get("/api/scans/:id", async (req, res) => {
    try {
      const scan = await storage.getScan(req.params.id);
      if (!scan) {
        return res.status(404).json({ error: "الفحص غير موجود" });
      }
      res.json(scan);
    } catch (error) {
      console.error("Error fetching scan:", error);
      res.status(500).json({ error: "فشل في جلب الفحص" });
    }
  });

  // Get issues for a scan (requires authentication for detailed view)
  app.get("/api/scans/:id/issues", requireAuth, async (req, res) => {
    try {
      // First verify the scan belongs to this user
      const scan = await storage.getScan(req.params.id);
      if (!scan) {
        return res.status(404).json({ error: "الفحص غير موجود" });
      }
      
      // Check ownership - scan must belong to the authenticated user
      if (scan.userId && scan.userId !== req.session.userId) {
        return res.status(403).json({ error: "غير مصرح بالوصول لهذا الفحص" });
      }
      
      const issues = await storage.getIssuesByScanId(req.params.id);
      res.json(issues);
    } catch (error) {
      console.error("Error fetching issues:", error);
      res.status(500).json({ error: "فشل في جلب المخالفات" });
    }
  });
  
  // Get scan summary (limited info for anonymous users)
  app.get("/api/scans/:id/summary", async (req, res) => {
    try {
      const scan = await storage.getScan(req.params.id);
      if (!scan) {
        return res.status(404).json({ error: "الفحص غير موجود" });
      }
      
      // Return limited info - only compliance level and issue counts
      res.json({
        id: scan.id,
        url: scan.url,
        status: scan.status,
        overallScore: scan.overallScore,
        complianceLevel: scan.complianceLevel,
        issuesCount: scan.issuesCount,
        criticalCount: scan.criticalCount,
        warningCount: scan.warningCount,
        suggestionCount: scan.suggestionCount,
        scanDate: scan.scanDate,
        completedAt: scan.completedAt,
      });
    } catch (error) {
      console.error("Error fetching scan summary:", error);
      res.status(500).json({ error: "فشل في جلب ملخص الفحص" });
    }
  });
  
  // Claim a scan for authenticated user
  app.post("/api/scans/:id/claim", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: "غير مصرح" });
      }
      
      const scan = await storage.getScan(req.params.id);
      if (!scan) {
        return res.status(404).json({ error: "الفحص غير موجود" });
      }
      
      // Check if already claimed by another user
      if (scan.userId && scan.userId !== userId) {
        return res.status(403).json({ error: "هذا الفحص مملوك لمستخدم آخر" });
      }
      
      // If already claimed by same user, just return
      if (scan.userId === userId && scan.isClaimedByUser) {
        return res.json(scan);
      }
      
      const updatedScan = await storage.claimScan(req.params.id, userId);
      res.json(updatedScan);
    } catch (error) {
      console.error("Error claiming scan:", error);
      res.status(500).json({ error: "فشل في ربط الفحص بالحساب" });
    }
  });
  
  // Get user's scans
  app.get("/api/user/scans", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: "غير مصرح" });
      }
      
      const scans = await storage.getScansByUserId(userId);
      res.json(scans);
    } catch (error) {
      console.error("Error fetching user scans:", error);
      res.status(500).json({ error: "فشل في جلب فحوصات المستخدم" });
    }
  });
  
  // Get user's latest scan (for dashboard)
  app.get("/api/user/scans/latest", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: "غير مصرح" });
      }
      
      const scans = await storage.getScansByUserId(userId);
      if (!scans || scans.length === 0) {
        return res.status(404).json({ error: "لا توجد فحوصات", hasScans: false });
      }
      
      // Return the most recent scan
      const latestScan = scans[0];
      res.json(latestScan);
    } catch (error) {
      console.error("Error fetching latest user scan:", error);
      res.status(500).json({ error: "فشل في جلب الفحص الأخير" });
    }
  });

  // Generate a report for a scan
  app.post("/api/scans/:id/report", async (req, res) => {
    try {
      const { format = "pdf" } = req.body;
      
      const scan = await storage.getScan(req.params.id);
      if (!scan) {
        return res.status(404).json({ error: "الفحص غير موجود" });
      }
      
      if (scan.status !== "completed") {
        return res.status(400).json({ error: "الفحص غير مكتمل" });
      }
      
      const issues = await storage.getIssuesByScanId(req.params.id);
      
      // Generate report using OpenAI
      const { content, fileName } = await generateComplianceReport(
        scan,
        issues,
        format as "pdf" | "html" | "json"
      );
      
      // Store report with content
      const report = await storage.createReport({
        scanId: req.params.id,
        format,
        content,
        fileName,
      });
      
      // Return download URL
      res.json({
        reportId: report.id,
        downloadUrl: `/api/reports/${report.id}/download`,
        fileName,
        format,
      });
      
    } catch (error) {
      console.error("Error generating report:", error);
      res.status(500).json({ error: "فشل في إنشاء التقرير" });
    }
  });

  // Get remediation templates
  app.get("/api/templates", async (req, res) => {
    try {
      const { category } = req.query;
      const templates = category
        ? await storage.getTemplatesByCategory(category as string)
        : await storage.getTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching templates:", error);
      res.status(500).json({ error: "فشل في جلب القوالب" });
    }
  });

  // Download a report
  app.get("/api/reports/:id/download", async (req, res) => {
    try {
      const report = await storage.getReport(req.params.id);
      if (!report) {
        return res.status(404).json({ error: "التقرير غير موجود" });
      }
      
      // Set appropriate headers based on format
      if (report.format === "pdf") {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${report.fileName || 'report.pdf'}"`);
      } else if (report.format === "html") {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${report.fileName || 'report.html'}"`);
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${report.fileName || 'report.json'}"`);
      }
      
      // Send the content
      res.send(report.content);
      
    } catch (error) {
      console.error("Error downloading report:", error);
      res.status(500).json({ error: "فشل في تحميل التقرير" });
    }
  });

  // Rescan a website
  app.post("/api/scans/:id/rescan", async (req, res) => {
    try {
      const scan = await storage.getScan(req.params.id);
      if (!scan) {
        return res.status(404).json({ error: "الفحص غير موجود" });
      }
      
      // Reset scan status
      await storage.updateScan(req.params.id, {
        status: "pending",
        completedAt: null,
        overallScore: null,
        issuesCount: 0,
        criticalCount: 0,
        warningCount: 0,
        suggestionCount: 0,
        analysisResult: null,
      });
      
      // Delete old issues
      await storage.deleteIssuesByScanId(req.params.id);
      
      // PERFORMANCE MODE: Use fast runComprehensiveScan instead of legacy processScan
      try {
        console.log(`[Scanner] Starting rescan for: ${scan.url}`);
        
        const comprehensiveResult = await runComprehensiveScan(scan.url, {
          deep_scan: true,
          fetch_policy_content: true,
          max_pages_to_crawl: 20,
          render_timeout_ms: 60000,
        });
        
        console.log(`[Scanner] Rescan completed with score: ${comprehensiveResult.overall_score}%`);
        
        // Calculate issue counts from pdpl_checks
        const violations = comprehensiveResult.pdpl_checks?.filter((c: any) => !c.compliant) || [];
        const criticalCount = violations.filter((v: any) => v.severity === 'critical' || v.severity === 'high').length;
        const warningCount = violations.filter((v: any) => v.severity === 'warning' || v.severity === 'medium').length;
        const suggestionCount = violations.filter((v: any) => v.severity === 'suggestion' || v.severity === 'low' || v.severity === 'info').length;
        
        // Update scan with results
        await storage.updateScan(req.params.id, {
          status: "completed",
          completedAt: new Date(),
          overallScore: comprehensiveResult.overall_score,
          issuesCount: violations.length,
          criticalCount,
          warningCount,
          suggestionCount,
          analysisResult: comprehensiveResult as any,
        });
        
        res.json({ message: "اكتمل إعادة الفحص", status: "completed" });
        
      } catch (scanError) {
        console.error(`[Scanner] Error during rescan:`, scanError);
        await storage.updateScan(req.params.id, { status: "failed" });
        res.status(500).json({ error: "فشل في إعادة الفحص" });
      }
    } catch (error) {
      console.error("Error rescanning:", error);
      res.status(500).json({ error: "فشل في إعادة الفحص" });
    }
  });

  // ========== Comprehensive PDPL Scan Endpoint ==========
  
  app.post("/api/comprehensive-scan", async (req, res) => {
    try {
      const { url, deep_scan = true, fetch_policy_content = true } = req.body;
      
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ 
          error: "عنوان URL مطلوب",
          error_en: "URL is required"
        });
      }
      
      if (!validateUrl(url)) {
        return res.status(400).json({ 
          error: "عنوان URL غير صالح أو محظور لأسباب أمنية",
          error_en: "Invalid or blocked URL for security reasons"
        });
      }
      
      console.log(`[API] Starting comprehensive scan for: ${url}`);
      
      const result = await runComprehensiveScan(url, {
        deep_scan,
        fetch_policy_content,
        max_pages_to_crawl: 20,
        render_timeout_ms: 60000,
      });
      
      console.log(`[API] Comprehensive scan completed with score: ${result.overall_score}%`);
      
      res.json(result);
    } catch (error) {
      console.error("Error in comprehensive scan:", error);
      res.status(500).json({ 
        error: "فشل في الفحص الشامل",
        error_en: "Comprehensive scan failed",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // ========== Privacy Policy Generator Endpoints ==========
  
  // Client route: Create new policy (starts as draft)
  // Policy generation is now payment-gated via /api/policy-requests/:id/generate
  // This endpoint is restricted to admin use only
  app.post("/api/policies", requireAdminAuth, async (req, res) => {
    try {
      const validatedData = insertPolicyDocumentSchema.parse(req.body);
      const policyDoc = await storage.createPolicyDocument(validatedData);
      
      processPrivacyPolicyGeneration(policyDoc.id);
      
      res.json(policyDoc);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating policy document:", error);
      res.status(500).json({ error: "فشل في إنشاء وثيقة السياسة" });
    }
  });

  // Client route: Get only the current published policy (no history) - lean DTO
  app.get("/api/policies/current", async (req, res) => {
    try {
      const policy = await storage.getCurrentPublishedPolicy();
      if (!policy) {
        return res.status(404).json({ error: "لا توجد سياسة منشورة حالياً" });
      }
      // Only return if content is available (generation complete)
      if (!policy.generatedContent) {
        return res.status(404).json({ error: "السياسة قيد التوليد" });
      }
      // Return only essential fields for client - no internal data
      res.json({
        id: policy.id,
        companyName: policy.companyName,
        generatedContent: policy.generatedContent,
        version: policy.version,
      });
    } catch (error) {
      console.error("Error fetching current policy:", error);
      res.status(500).json({ error: "فشل في جلب السياسة الحالية" });
    }
  });

  // Client route: Get published policies only (for display) - lean DTO
  app.get("/api/policies", async (req, res) => {
    try {
      const policies = await storage.getPublishedPolicies();
      // Return only essential fields for client display - no internal status/timestamps
      const clientPolicies = policies
        .filter(p => p.generatedContent) // Only return completed policies with content
        .map(p => ({
          id: p.id,
          companyName: p.companyName,
          generatedContent: p.generatedContent,
          version: p.version,
        }));
      res.json(clientPolicies);
    } catch (error) {
      console.error("Error fetching policies:", error);
      res.status(500).json({ error: "فشل في جلب وثائق السياسة" });
    }
  });

  // Client route: Get specific published policy by ID
  app.get("/api/policies/:id", async (req, res) => {
    try {
      const policy = await storage.getPolicyDocument(req.params.id);
      if (!policy) {
        return res.status(404).json({ error: "الوثيقة غير موجودة" });
      }
      // Only allow access to published policies for clients
      if (policy.publishStatus !== "published") {
        return res.status(403).json({ error: "غير مصرح بالوصول لهذه السياسة" });
      }
      res.json({
        id: policy.id,
        companyName: policy.companyName,
        generatedContent: policy.generatedContent,
        version: policy.version,
      });
    } catch (error) {
      console.error("Error fetching policy:", error);
      res.status(500).json({ error: "فشل في جلب الوثيقة" });
    }
  });

  // User route: Get user's generated policies through their policy requests
  app.get("/api/user/policies", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: "غير مصرح" });
      }
      
      // Get all policy requests for this user
      const requests = await storage.getPolicyGenerationRequestsByUserId(userId);
      
      // Fetch policy documents for completed/paid requests
      const policies: any[] = [];
      for (const request of requests) {
        if (request.policyDocumentId) {
          const policy = await storage.getPolicyDocument(request.policyDocumentId);
          if (policy) {
            policies.push({
              ...policy,
              requestId: request.id,
              paymentStatus: request.paymentStatus,
              workflowStatus: request.workflowStatus,
            });
          }
        }
      }
      
      res.json(policies);
    } catch (error) {
      console.error("Error fetching user policies:", error);
      res.status(500).json({ error: "فشل في جلب السياسات" });
    }
  });

  app.post("/api/policy-requests/:id/resend", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      const request = await storage.getPolicyGenerationRequest(req.params.id);
      
      if (!request) {
        return res.status(404).json({ error: "الطلب غير موجود" });
      }
      if (request.userId !== userId) {
        return res.status(403).json({ error: "غير مصرح بالوصول لهذا الطلب" });
      }
      if (request.paymentStatus !== "paid") {
        return res.status(402).json({ error: "يجب دفع الرسوم أولاً" });
      }
      
      if (!request.policyDocumentId) {
        return res.status(400).json({ error: "لم يتم توليد السياسة بعد" });
      }
      
      const policyDoc = await storage.getPolicyDocument(request.policyDocumentId);
      if (!policyDoc || !policyDoc.generatedContent) {
        return res.status(400).json({ error: "السياسة غير متاحة لإعادة الإرسال" });
      }
      
      const user = await storage.getUser(userId!);
      if (!user?.email) {
        return res.status(400).json({ error: "لم يتم العثور على بريد إلكتروني مسجل" });
      }
      
      const emailSent = await sendPolicyEmail({
        to: user.email,
        companyName: policyDoc.companyName || "سياسة الخصوصية",
        policyContent: policyDoc.generatedContent,
        policyId: policyDoc.id,
      });
      
      res.json({ success: true, emailSent, message: emailSent ? "تم إعادة إرسال السياسة بنجاح" : "فشل في إرسال البريد الإلكتروني" });
    } catch (error) {
      console.error("Error resending policy:", error);
      res.status(500).json({ error: "فشل في إعادة إرسال السياسة" });
    }
  });

  // User route: Get user's activity log
  app.get("/api/user/activity", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: "غير مصرح" });
      }
      
      const activities: any[] = [];
      
      // Get user's scans as activities
      const scans = await storage.getScansByUserId(userId);
      for (const scan of scans.slice(0, 10)) {
        activities.push({
          id: `scan-${scan.id}`,
          type: "scan",
          action: "فحص موقع",
          description: `فحص الموقع: ${scan.url}`,
          createdAt: scan.createdAt,
        });
      }
      
      // Get user's policy requests as activities
      const requests = await storage.getPolicyGenerationRequestsByUserId(userId);
      for (const request of requests.slice(0, 10)) {
        activities.push({
          id: `policy-${request.id}`,
          type: "policy",
          action: "إنشاء سياسة",
          description: `إنشاء سياسة خصوصية`,
          createdAt: request.createdAt,
        });
      }
      
      // Sort by date (newest first)
      activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      res.json(activities.slice(0, 20));
    } catch (error) {
      console.error("Error fetching user activity:", error);
      res.status(500).json({ error: "فشل في جلب سجل النشاط" });
    }
  });

  // ========== Admin-Only Policy Routes (History/Versions) ==========

  // Admin route: Get all policies including drafts, history, and archived
  app.get("/api/admin/policies/all", requireAdminAuth, async (req, res) => {
    try {
      const policies = await storage.getAllPolicyDocuments();
      res.json(policies);
    } catch (error) {
      console.error("Error fetching all policies:", error);
      res.status(500).json({ error: "فشل في جلب السياسات" });
    }
  });

  // Admin route: Get policy history/versions - ADMIN ONLY
  app.get("/api/admin/policies/history", requireAdminAuth, async (req, res) => {
    try {
      const policies = await storage.getAllPolicyDocuments();
      res.json(policies);
    } catch (error) {
      console.error("Error fetching policy history:", error);
      res.status(500).json({ error: "فشل في جلب سجل السياسات" });
    }
  });

  // Admin route: Publish a policy
  app.post("/api/admin/policies/:id/publish", requireAdminAuth, async (req, res) => {
    try {
      const policy = await storage.getPolicyDocument(req.params.id);
      if (!policy) {
        return res.status(404).json({ error: "السياسة غير موجودة" });
      }
      if (policy.status !== "completed") {
        return res.status(400).json({ error: "يجب أن تكون السياسة مكتملة قبل النشر" });
      }
      const publishedPolicy = await storage.publishPolicy(req.params.id);
      res.json(publishedPolicy);
    } catch (error) {
      console.error("Error publishing policy:", error);
      res.status(500).json({ error: "فشل في نشر السياسة" });
    }
  });

  // Admin route: Archive a policy
  app.post("/api/admin/policies/:id/archive", requireAdminAuth, async (req, res) => {
    try {
      const archivedPolicy = await storage.archivePolicy(req.params.id);
      if (!archivedPolicy) {
        return res.status(404).json({ error: "السياسة غير موجودة" });
      }
      res.json(archivedPolicy);
    } catch (error) {
      console.error("Error archiving policy:", error);
      res.status(500).json({ error: "فشل في أرشفة السياسة" });
    }
  });

  // Block client access to history/versions routes with 403
  app.get("/api/policies/history", (req, res) => {
    res.status(403).json({ error: "غير مصرح بالوصول - للإدارة فقط" });
  });
  app.get("/api/policies/versions", (req, res) => {
    res.status(403).json({ error: "غير مصرح بالوصول - للإدارة فقط" });
  });

  // ========== Policy Generation Requests (Payment Gated) ==========
  
  // Create a policy generation request (requires authentication)
  app.post("/api/policy-requests", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: "غير مصرح" });
      }
      
      const { scanId, intakeData } = req.body;
      
      const request = await storage.createPolicyGenerationRequest({
        userId,
        scanId: scanId || null,
        intakeData: intakeData || {},
      });
      
      res.json(request);
    } catch (error) {
      console.error("Error creating policy request:", error);
      res.status(500).json({ error: "فشل في إنشاء طلب السياسة" });
    }
  });
  
  // Get user's policy generation requests
  app.get("/api/policy-requests", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: "غير مصرح" });
      }
      
      const requests = await storage.getPolicyGenerationRequestsByUserId(userId);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching policy requests:", error);
      res.status(500).json({ error: "فشل في جلب طلبات السياسات" });
    }
  });
  
  // Get a specific policy generation request
  app.get("/api/policy-requests/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      const request = await storage.getPolicyGenerationRequest(req.params.id);
      
      if (!request) {
        return res.status(404).json({ error: "الطلب غير موجود" });
      }
      
      // Verify ownership
      if (request.userId !== userId) {
        return res.status(403).json({ error: "غير مصرح بالوصول لهذا الطلب" });
      }
      
      res.json(request);
    } catch (error) {
      console.error("Error fetching policy request:", error);
      res.status(500).json({ error: "فشل في جلب الطلب" });
    }
  });
  
  // Trigger policy generation after payment verification
  // Updated to support new 4-step wizard format
  app.post("/api/policy-requests/:id/generate", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      const request = await storage.getPolicyGenerationRequest(req.params.id);
      
      if (!request) {
        return res.status(404).json({ error: "الطلب غير موجود" });
      }
      
      if (request.userId !== userId) {
        return res.status(403).json({ error: "غير مصرح بالوصول لهذا الطلب" });
      }
      
      if (request.paymentStatus !== "paid") {
        return res.status(402).json({ error: "يجب دفع الرسوم أولاً" });
      }
      
      if (request.workflowStatus === "delivered") {
        return res.json({ success: true, alreadyGenerated: true, message: "تم توليد السياسة بالفعل وإرسالها عبر البريد الإلكتروني" });
      }
      if (request.workflowStatus === "generating") {
        return res.json({ success: true, alreadyGenerated: true, message: "السياسة قيد التوليد حالياً" });
      }
      
      const intakeData = request.intakeData as Record<string, any> | null;
      
      // Support both old format (companyName) and new wizard format (company_name)
      const companyName = intakeData?.company_name || intakeData?.companyName;
      const activityType = intakeData?.activity_type || intakeData?.businessType;
      
      if (!companyName || !activityType) {
        return res.status(400).json({ error: "بيانات النموذج غير مكتملة" });
      }
      
      // Check if this is the new 6-step wizard format or old 4-step format
      const is6StepFormat = !!intakeData?.legal_bases;
      const isWizardFormat = !!intakeData?.company_name;
      
      // Update workflow status
      await storage.updatePolicyGenerationRequest(req.params.id, {
        workflowStatus: "generating",
      });
      
      let generatedContent: string;
      
      if (is6StepFormat) {
        // New 6-step wizard format - use the new policyTextGenerator
        const { generatePolicyHtml } = await import('./services/policyTextGenerator');
        
        const policyData = {
          company_name: intakeData.company_name,
          activity_type: intakeData.activity_type,
          service_description: intakeData.service_description || "",
          contact_team: intakeData.contact_team,
          address: intakeData.address || intakeData.contact_address || "",
          phone: intakeData.phone || intakeData.contact_phone || "",
          email: intakeData.email || intakeData.contact_email || "",
          cr_number: intakeData.cr_number || "",
          policy_last_update: intakeData.policy_last_update,
          data_collected: intakeData.data_collected || [],
          collection_methods_direct: intakeData.collection_methods_direct || [],
          collection_methods_indirect: intakeData.collection_methods_indirect || [],
          collection_purposes: intakeData.collection_purposes || [],
          data_usage_purposes: intakeData.data_usage_purposes || [],
          legal_bases: intakeData.legal_bases || [],
          legal_bases_explanations: intakeData.legal_bases_explanations || {},
          disclosure_parties: intakeData.disclosure_parties || [],
          storage_location: intakeData.storage_location || "inside_ksa",
          retention_period: intakeData.retention_period || "until_purpose",
          retention_purpose: intakeData.retention_purpose,
          retention_years: intakeData.retention_years,
          destruction_method: intakeData.destruction_method || "secure_deletion",
          destruction_custom: intakeData.destruction_custom,
          rights_exercise_method: intakeData.rights_exercise_method || "email",
          rights_contact_details: intakeData.rights_contact_details || "",
          response_days: intakeData.response_days || 30,
          has_dpo: intakeData.has_dpo || false,
          dpo_name: intakeData.dpo_name,
          dpo_address: intakeData.dpo_address,
          dpo_phone: intakeData.dpo_phone,
          dpo_email: intakeData.dpo_email,
          complaint_contact: intakeData.complaint_contact || "خدمة العملاء",
          complaint_contact_details: intakeData.complaint_contact_details || "",
          complaint_response_days: intakeData.complaint_response_days || 30,
        };
        
        // Debug: Log rights and complaints contact details
        console.log('[Policy Generator] Rights contact details:', intakeData.rights_contact_details);
        console.log('[Policy Generator] Complaints contact details:', intakeData.complaint_contact_details);
        
        generatedContent = generatePolicyHtml(policyData);
      } else if (isWizardFormat) {
        // Old 4-step wizard format - use template-based generation
        const wizardData: WizardPolicyData = {
          company_name: intakeData.company_name,
          activity_type: intakeData.activity_type,
          service_description: intakeData.service_description || "",
          cr_number: intakeData.cr_number || "",
          contact_address: intakeData.contact_address || "",
          contact_email: intakeData.contact_email || "",
          contact_phone: intakeData.contact_phone || "",
          has_dpo: intakeData.has_dpo || false,
          dpo_name: intakeData.dpo_name,
          dpo_email: intakeData.dpo_email,
          dpo_phone: intakeData.dpo_phone,
          data_collected: intakeData.data_collected || [],
          collection_methods: intakeData.collection_methods || [],
          storage_location: intakeData.storage_location || "inside_ksa",
          retention_period: intakeData.retention_period || "statutory_period",
          retention_period_value: intakeData.retention_period_value,
          data_sharing: intakeData.data_sharing || "no_sharing",
          complaint_dept: intakeData.complaint_dept || "customer_service",
        };
        
        generatedContent = await generateWizardPrivacyPolicy(wizardData);
      } else {
        // Legacy format - use AI-based generation
        const policyDoc = await storage.createPolicyDocument({
          companyName: intakeData.companyName,
          businessType: intakeData.businessType,
          entityType: intakeData.entityType || "private",
          contactEmail: intakeData.contactEmail || "",
          contactPhone: intakeData.contactPhone,
          contactAddress: intakeData.contactAddress,
          dataCategories: intakeData.dataCategories || [],
          collectionMethod: intakeData.collectionMethod,
          processingMethods: intakeData.processingMethods,
          sharesWithThirdParties: intakeData.sharesWithThirdParties || "no",
          thirdPartyDetails: intakeData.thirdPartyDetails,
          transfersDataAbroad: intakeData.transfersDataAbroad || "no",
          transferDestinations: intakeData.transferCountries || intakeData.transferDestinations,
          retentionPeriod: intakeData.retentionPeriod,
          usesCookies: intakeData.usesCookies || "no",
          processesSensitiveData: intakeData.processesSensitiveData || "no",
          dpoName: intakeData.dpoName,
          dpoEmail: intakeData.dpoEmail,
          dpoPhone: intakeData.dpoPhone,
          dpoAddress: intakeData.dpoAddress,
        });
        
        await storage.updatePolicyGenerationRequest(req.params.id, {
          policyDocumentId: policyDoc.id,
        });
        
        // Get user's registered email for sending policy
        const user = await storage.getUser(userId!);
        processPrivacyPolicyGeneration(policyDoc.id, user?.email);
        
        return res.json({ 
          success: true, 
          policyId: policyDoc.id,
          message: "تم بدء توليد سياسة الخصوصية",
        });
      }
      
      // For wizard format - create policy document first, then update with content
      const policyDoc = await storage.createPolicyDocument({
        companyName: companyName,
        businessType: activityType,
        entityType: "private",
        contactEmail: intakeData.contact_email || "",
        contactPhone: intakeData.contact_phone,
        contactAddress: intakeData.contact_address,
        dataCategories: [],
        retentionPeriod: intakeData.retention_period,
        usesCookies: intakeData.collection_methods?.includes("automated") ? "yes" : "no",
        dpoName: intakeData.dpo_name,
        dpoEmail: intakeData.dpo_email,
        dpoPhone: intakeData.dpo_phone,
      });
      
      // Update with generated content
      await storage.updatePolicyDocument(policyDoc.id, {
        generatedContent: generatedContent,
        status: "completed",
      });
      
      await storage.updatePolicyGenerationRequest(req.params.id, {
        workflowStatus: "delivered",
        policyDocumentId: policyDoc.id,
      });
      
      // Send policy email to user's registered email (OTP email) - AWAIT to ensure delivery
      const user = await storage.getUser(userId!);
      let emailSent = false;
      if (user?.email && generatedContent) {
        try {
          console.log("[Route] Sending policy email to:", user.email);
          emailSent = await sendPolicyEmail({
            to: user.email,
            companyName: companyName,
            policyContent: generatedContent,
            policyId: policyDoc.id,
          });
          console.log("[Route] Email sent result:", emailSent);
        } catch (err) {
          console.error("[Route] Failed to send policy email:", err);
        }
      }
      
      res.json({ 
        success: true, 
        policyId: policyDoc.id,
        emailSent: emailSent,
        message: emailSent ? "تم توليد سياسة الخصوصية وإرسالها بنجاح" : "تم توليد سياسة الخصوصية",
      });
    } catch (error) {
      console.error("Error generating policy from request:", error);
      // Rollback workflow status to allow retry
      try {
        await storage.updatePolicyGenerationRequest(req.params.id, {
          workflowStatus: "pending",
        });
      } catch (rollbackError) {
        console.error("Error rolling back workflow status:", rollbackError);
      }
      res.status(500).json({ error: "فشل في توليد السياسة. يمكنك المحاولة مرة أخرى." });
    }
  });

  // Update intake data for a policy generation request
  app.patch("/api/policy-requests/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      const request = await storage.getPolicyGenerationRequest(req.params.id);
      
      if (!request) {
        return res.status(404).json({ error: "الطلب غير موجود" });
      }
      
      if (request.userId !== userId) {
        return res.status(403).json({ error: "غير مصرح بالتعديل على هذا الطلب" });
      }
      
      // Can only update if not yet paid
      if (request.paymentStatus === "paid") {
        return res.status(400).json({ error: "لا يمكن تعديل طلب مدفوع" });
      }
      
      const { intakeData } = req.body;
      const updated = await storage.updatePolicyGenerationRequest(req.params.id, {
        intakeData: intakeData || request.intakeData,
      });
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating policy request:", error);
      res.status(500).json({ error: "فشل في تحديث الطلب" });
    }
  });
  
  // ========== Payments (PayPal Integration) ==========
  
  // Create a payment for a policy generation request
  app.post("/api/payments/create", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: "غير مصرح" });
      }
      
      const { requestId, amount, currency = "SAR" } = req.body;
      
      if (!requestId) {
        return res.status(400).json({ error: "معرف الطلب مطلوب" });
      }
      
      // Verify the request exists and belongs to user
      const policyRequest = await storage.getPolicyGenerationRequest(requestId);
      if (!policyRequest) {
        return res.status(404).json({ error: "الطلب غير موجود" });
      }
      if (policyRequest.userId !== userId) {
        return res.status(403).json({ error: "غير مصرح" });
      }
      
      // Check if already paid
      if (policyRequest.paymentStatus === "paid") {
        return res.status(400).json({ error: "هذا الطلب مدفوع بالفعل" });
      }
      
      // Create payment record
      const payment = await storage.createPayment({
        requestId,
        userId,
        amount: amount || 34900, // Default 349 SAR in halalas
        currency,
        provider: "paypal",
      });
      
      // Update request status to awaiting payment
      await storage.updatePolicyGenerationRequest(requestId, {
        workflowStatus: "awaiting_payment",
        paymentStatus: "processing",
      });
      
      res.json({
        paymentId: payment.id,
        amount: payment.amount,
        currency: payment.currency,
      });
    } catch (error) {
      console.error("Error creating payment:", error);
      res.status(500).json({ error: "فشل في إنشاء الدفع" });
    }
  });
  
  // Capture/Confirm PayPal payment
  app.post("/api/payments/:paymentId/capture", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      const payment = await storage.getPayment(req.params.paymentId);
      
      if (!payment) {
        return res.status(404).json({ error: "الدفع غير موجود" });
      }
      
      if (payment.userId !== userId) {
        return res.status(403).json({ error: "غير مصرح" });
      }
      
      const { providerPaymentId, providerPayerId } = req.body;
      
      // Update payment with PayPal details
      const updatedPayment = await storage.updatePayment(req.params.paymentId, {
        providerPaymentId,
        providerPayerId,
        status: "succeeded",
      });
      
      // Update policy request status
      await storage.updatePolicyGenerationRequest(payment.requestId, {
        workflowStatus: "paid",
        paymentStatus: "paid",
      });
      
      res.json({
        success: true,
        payment: updatedPayment,
      });
    } catch (error) {
      console.error("Error capturing payment:", error);
      res.status(500).json({ error: "فشل في تأكيد الدفع" });
    }
  });
  
  // Get user's payments
  app.get("/api/payments", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: "غير مصرح" });
      }
      
      const payments = await storage.getPaymentsByUserId(userId);
      res.json(payments);
    } catch (error) {
      console.error("Error fetching payments:", error);
      res.status(500).json({ error: "فشل في جلب المدفوعات" });
    }
  });

  // ========== Discount Code Validation ==========

  app.post("/api/discount/validate", async (req, res) => {
    try {
      const { code } = req.body;
      if (!code || typeof code !== "string") {
        return res.status(400).json({ error: "كود الخصم مطلوب" });
      }

      const discountCode = await storage.getDiscountCodeByCode(code.trim());

      if (!discountCode) {
        return res.status(404).json({ error: "كود الخصم غير صالح" });
      }

      if (!discountCode.isActive) {
        return res.status(400).json({ error: "كود الخصم غير مفعّل" });
      }

      if (discountCode.expiresAt && new Date(discountCode.expiresAt) < new Date()) {
        return res.status(400).json({ error: "كود الخصم منتهي الصلاحية" });
      }

      if (discountCode.maxUses && discountCode.currentUses >= discountCode.maxUses) {
        return res.status(400).json({ error: "تم استنفاد كود الخصم" });
      }

      const originalPrice = 349;
      let discountedPrice = originalPrice;
      let discountAmount = 0;

      if (discountCode.discountType === "percentage") {
        discountAmount = Math.round(originalPrice * discountCode.discountValue / 100);
        discountedPrice = originalPrice - discountAmount;
      } else {
        discountAmount = discountCode.discountValue;
        discountedPrice = Math.max(0, originalPrice - discountAmount);
      }

      res.json({
        valid: true,
        code: discountCode.code,
        discountType: discountCode.discountType,
        discountValue: discountCode.discountValue,
        discountAmount,
        originalPrice,
        finalPrice: discountedPrice,
      });
    } catch (error) {
      console.error("Error validating discount code:", error);
      res.status(500).json({ error: "فشل في التحقق من كود الخصم" });
    }
  });

  // ========== Geidea Payment Integration ==========

  app.post("/api/geidea/session", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: "غير مصرح" });
      }

      const publicKey = process.env.GEIDEA_PUBLIC_KEY;
      const apiPassword = process.env.GEIDEA_API_PASSWORD;

      if (!publicKey || !apiPassword) {
        console.error("Geidea credentials not configured");
        return res.status(503).json({ error: "بوابة الدفع غير مُهيأة" });
      }

      const { requestId, amount, currency = "SAR", customerEmail: frontendEmail, customerName, discountCode: discountCodeStr } = req.body;

      if (!requestId) {
        return res.status(400).json({ error: "معرف الطلب مطلوب" });
      }

      const user = await storage.getUser(userId);
      const customerEmail = user?.email || frontendEmail || null;

      console.log(`[Geidea] Email resolution: userId=${userId}, dbEmail=${user?.email || "NONE"}, frontendEmail=${frontendEmail || "NONE"}, resolved=${customerEmail || "NULL"}`);

      const policyRequest = await storage.getPolicyGenerationRequest(requestId);
      if (!policyRequest) {
        return res.status(404).json({ error: "الطلب غير موجود" });
      }
      if (policyRequest.userId !== userId) {
        return res.status(403).json({ error: "غير مصرح" });
      }
      if (policyRequest.paymentStatus === "paid") {
        return res.status(400).json({ error: "هذا الطلب مدفوع بالفعل" });
      }

      const BASE_PRICE = 349.00;
      let paymentAmount = BASE_PRICE;
      let appliedDiscountCodeId: string | null = null;
      let appliedDiscountCodeStr: string | null = null;

      if (discountCodeStr && typeof discountCodeStr === "string") {
        const dc = await storage.getDiscountCodeByCode(discountCodeStr.trim());
        if (dc && dc.isActive && (!dc.expiresAt || new Date(dc.expiresAt) >= new Date()) && (!dc.maxUses || dc.currentUses < dc.maxUses)) {
          if (dc.discountType === "percentage") {
            paymentAmount = BASE_PRICE - Math.round(BASE_PRICE * dc.discountValue / 100);
          } else {
            paymentAmount = Math.max(1, BASE_PRICE - dc.discountValue);
          }
          appliedDiscountCodeId = dc.id;
          appliedDiscountCodeStr = dc.code;
          console.log(`[Geidea] Discount code ${dc.code} applied: ${dc.discountValue}${dc.discountType === "percentage" ? "%" : " SAR"} off -> ${paymentAmount} SAR`);
        }
      }
      const merchantRefId = `SRB${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
      const timestamp = new Date().toISOString();

      const appUrl = process.env.NODE_ENV === "production"
        ? "https://sirbal.co"
        : (process.env.REPLIT_DEV_DOMAIN 
          ? `https://${process.env.REPLIT_DEV_DOMAIN}`
          : "https://sirbal.co");
      
      const amountStr = paymentAmount.toFixed(2);
      const crypto = await import("crypto");
      const signatureData = `${publicKey}${amountStr}${currency}${merchantRefId}${timestamp}`;
      const signature = crypto.createHmac("sha256", apiPassword)
        .update(signatureData)
        .digest("base64");

      const callbackUrl = process.env.GEIDEA_CALLBACK_URL || `${appUrl}/api/geidea/callback`;

      const returnUrl = `${appUrl}/workspace?tab=privacy&payment=success&requestId=${requestId}`;

      const sessionPayload: Record<string, any> = {
        amount: paymentAmount,
        currency,
        timestamp,
        signature,
        merchantReferenceId: merchantRefId,
        callbackUrl,
        returnUrl,
        paymentOperation: "Pay",
        language: "ar",
        ...(customerEmail ? { customerEmail, customer: { email: customerEmail } } : {}),
      };

      console.log("[Geidea] Session payload:", JSON.stringify({ ...sessionPayload, signature: "***" }));

      const credentials = Buffer.from(`${publicKey}:${apiPassword}`).toString("base64");

      const geideaBaseUrl = process.env.GEIDEA_API_BASE_URL || "https://api.ksamerchant.geidea.net";
      const sessionResponse = await fetch(
        `${geideaBaseUrl}/payment-intent/api/v2/direct/session`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Basic ${credentials}`,
          },
          body: JSON.stringify(sessionPayload),
        }
      );

      if (!sessionResponse.ok) {
        const errorBody = await sessionResponse.text();
        console.error("Geidea session creation failed:", sessionResponse.status, errorBody);
        return res.status(400).json({ error: "فشل في إنشاء جلسة الدفع" });
      }

      const sessionData = await sessionResponse.json();
      const sessionId = sessionData?.session?.id;

      if (!sessionId) {
        console.error("Geidea session response missing session ID:", sessionData);
        return res.status(500).json({ error: "استجابة غير صالحة من بوابة الدفع" });
      }

      await storage.updatePolicyGenerationRequest(requestId, {
        workflowStatus: "awaiting_payment",
        paymentStatus: "processing",
      });

      const rawPayloadData: Record<string, any> = { geideaSessionId: sessionId };
      if (appliedDiscountCodeId) {
        rawPayloadData.discountCodeId = appliedDiscountCodeId;
        rawPayloadData.discountCode = appliedDiscountCodeStr;
      }

      await storage.createPayment({
        requestId,
        userId,
        amount: Math.round(paymentAmount * 100),
        currency,
        provider: "geidea",
        providerPaymentId: merchantRefId,
        rawPayload: rawPayloadData,
      });

      console.log(`[Geidea] Session created: sessionId=${sessionId}, requestId=${requestId}, email=${customerEmail}`);

      const geideaCheckoutBase = process.env.GEIDEA_CHECKOUT_URL || "https://www.ksamerchant.geidea.net/hpp/checkout/";
      const normalizedBase = geideaCheckoutBase.endsWith("/") ? geideaCheckoutBase : geideaCheckoutBase + "/";
      const checkoutUrl = `${normalizedBase}?${sessionId}`;

      console.log(`[Geidea] Checkout URL: ${checkoutUrl}`);

      res.json({
        sessionId,
        merchantPublicKey: publicKey,
        amount: paymentAmount,
        currency,
        checkoutUrl,
      });
    } catch (error) {
      console.error("Error creating Geidea session:", error);
      res.status(500).json({ error: "فشل في إنشاء جلسة الدفع" });
    }
  });

  app.post("/api/geidea/callback", async (req, res) => {
    try {
      const orderData = req.body?.order || req.body;
      const orderId = orderData?.orderId;
      const status = orderData?.status;
      const merchantRefId = orderData?.merchantReferenceId;
      const amount = orderData?.amount;
      const currency = orderData?.currency;

      console.log(`[Geidea Callback] orderId: ${orderId}, status: ${status}, merchantRef: ${merchantRefId}`);

      if (!merchantRefId) {
        console.error("[Geidea Callback] Missing merchantReferenceId");
        return res.status(400).json({ error: "Missing merchantReferenceId" });
      }

      // Verify callback authenticity by cross-checking with Geidea's API
      if (orderId && status === "Success") {
        try {
          const publicKey = process.env.GEIDEA_PUBLIC_KEY;
          const apiPassword = process.env.GEIDEA_API_PASSWORD;
          if (publicKey && apiPassword) {
            const authHeader = Buffer.from(`${publicKey}:${apiPassword}`).toString("base64");
            const verifyResponse = await fetch(
              `https://api.merchant.geidea.net/pgw/api/v1/direct/order/${orderId}`,
              {
                method: "GET",
                headers: {
                  "Authorization": `Basic ${authHeader}`,
                  "Content-Type": "application/json",
                },
              }
            );
            if (verifyResponse.ok) {
              const verifyData = await verifyResponse.json() as any;
              const verifiedStatus = verifyData?.order?.status || verifyData?.status;
              if (verifiedStatus !== "Success") {
                console.error(`[Geidea Callback] Verification failed: API status=${verifiedStatus}, callback status=${status}`);
                return res.status(403).json({ error: "Payment verification failed" });
              }
              console.log(`[Geidea Callback] Payment verified via Geidea API for order: ${orderId}`);
            } else {
              console.warn(`[Geidea Callback] Could not verify order via API (status ${verifyResponse.status}), proceeding with callback data`);
            }
          }
        } catch (verifyErr) {
          console.warn("[Geidea Callback] Verification API call failed, proceeding with callback data:", verifyErr);
        }
      }

      let requestId: string | null = null;
      const paymentByRef = await storage.getPaymentByProviderPaymentId(merchantRefId);
      if (paymentByRef) {
        requestId = paymentByRef.requestId;
      } else if (merchantRefId.startsWith("SRB") && merchantRefId.length >= 35) {
        const hex = merchantRefId.slice(3, 35);
        requestId = `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
      } else {
        const requestIdMatch = merchantRefId.match(/^SIRBAL-(.+?)-\d+$/);
        requestId = requestIdMatch ? requestIdMatch[1] : null;
      }

      if (!requestId) {
        console.error("[Geidea Callback] Could not extract requestId from:", merchantRefId);
        return res.status(400).json({ error: "Invalid merchantReferenceId" });
      }

      if (status === "Success") {
        const policyRequest = await storage.getPolicyGenerationRequest(requestId);
        if (policyRequest) {
          await storage.updatePolicyGenerationRequest(requestId, {
            workflowStatus: "paid",
            paymentStatus: "paid",
          });

          const existingPayment = await storage.getPaymentByRequestId(requestId);
          if (existingPayment) {
            if (existingPayment.rawPayload && typeof existingPayment.rawPayload === "object" && (existingPayment.rawPayload as any).discountCodeId) {
              try {
                await storage.incrementDiscountCodeUsage((existingPayment.rawPayload as any).discountCodeId);
                console.log(`[Geidea Callback] Discount code usage incremented for: ${(existingPayment.rawPayload as any).discountCode}`);
              } catch (e) {
                console.error("[Geidea Callback] Failed to increment discount code usage:", e);
              }
            }

            await storage.updatePayment(existingPayment.id, {
              providerPaymentId: orderId || merchantRefId,
              status: "succeeded",
              rawPayload: orderData,
            });
          }

          const intakeData = policyRequest.intakeData as Record<string, any> | null;
          const contactEmail = intakeData?.email || "";
          const companyName = intakeData?.company_name || intakeData?.companyName || "طلب جديد";

          // Auto-generate policy in callback to ensure delivery even if frontend redirect fails
          // Set "generating" FIRST to prevent race conditions with concurrent callbacks
          if (policyRequest.workflowStatus !== "generating" && policyRequest.workflowStatus !== "delivered") {
            await storage.updatePolicyGenerationRequest(requestId, { workflowStatus: "generating" });
            try {
              console.log(`[Geidea Callback] Auto-generating policy for request: ${requestId}`);
              const is6StepFormat = !!intakeData?.legal_bases;
              const isWizardFormat = !!intakeData?.company_name;

              let generatedContent: string | null = null;

              if (is6StepFormat) {
                const { generatePolicyHtml } = await import('./services/policyTextGenerator');
                const policyData = {
                  company_name: intakeData!.company_name,
                  activity_type: intakeData!.activity_type,
                  service_description: intakeData!.service_description || "",
                  contact_team: intakeData!.contact_team,
                  address: intakeData!.address || intakeData!.contact_address || "",
                  phone: intakeData!.phone || intakeData!.contact_phone || "",
                  email: intakeData!.email || intakeData!.contact_email || "",
                  cr_number: intakeData!.cr_number || "",
                  policy_last_update: intakeData!.policy_last_update,
                  data_collected: intakeData!.data_collected || [],
                  collection_methods_direct: intakeData!.collection_methods_direct || [],
                  collection_methods_indirect: intakeData!.collection_methods_indirect || [],
                  collection_purposes: intakeData!.collection_purposes || [],
                  data_usage_purposes: intakeData!.data_usage_purposes || [],
                  legal_bases: intakeData!.legal_bases || [],
                  legal_bases_explanations: intakeData!.legal_bases_explanations || {},
                  disclosure_parties: intakeData!.disclosure_parties || [],
                  storage_location: intakeData!.storage_location || "inside_ksa",
                  retention_period: intakeData!.retention_period || "until_purpose",
                  retention_purpose: intakeData!.retention_purpose,
                  retention_years: intakeData!.retention_years,
                  destruction_method: intakeData!.destruction_method || "secure_deletion",
                  destruction_custom: intakeData!.destruction_custom,
                  rights_exercise_method: intakeData!.rights_exercise_method || "email",
                  rights_contact_details: intakeData!.rights_contact_details || "",
                  response_days: intakeData!.response_days || 30,
                  has_dpo: intakeData!.has_dpo || false,
                  dpo_name: intakeData!.dpo_name,
                  dpo_address: intakeData!.dpo_address,
                  dpo_phone: intakeData!.dpo_phone,
                  dpo_email: intakeData!.dpo_email,
                  complaint_contact: intakeData!.complaint_contact || "خدمة العملاء",
                  complaint_contact_details: intakeData!.complaint_contact_details || "",
                  complaint_response_days: intakeData!.complaint_response_days || 30,
                };
                generatedContent = generatePolicyHtml(policyData);
              } else if (isWizardFormat) {
                generatedContent = await generateWizardPrivacyPolicy({
                  company_name: intakeData!.company_name,
                  activity_type: intakeData!.activity_type,
                  service_description: intakeData!.service_description || "",
                  cr_number: intakeData!.cr_number || "",
                  contact_address: intakeData!.contact_address || "",
                  contact_email: intakeData!.contact_email || "",
                  contact_phone: intakeData!.contact_phone || "",
                  has_dpo: intakeData!.has_dpo || false,
                  dpo_name: intakeData!.dpo_name,
                  dpo_email: intakeData!.dpo_email,
                  dpo_phone: intakeData!.dpo_phone,
                  data_collected: intakeData!.data_collected || [],
                  collection_methods: intakeData!.collection_methods || [],
                  storage_location: intakeData!.storage_location || "inside_ksa",
                  retention_period: intakeData!.retention_period || "statutory_period",
                  retention_period_value: intakeData!.retention_period_value,
                  data_sharing: intakeData!.data_sharing || "no_sharing",
                  complaint_dept: intakeData!.complaint_dept || "customer_service",
                });
              }

              if (generatedContent) {
                const activityType = intakeData!.activity_type || intakeData!.businessType || "";
                const policyDoc = await storage.createPolicyDocument({
                  companyName: companyName,
                  businessType: activityType,
                  entityType: "private",
                  contactEmail: intakeData!.contact_email || intakeData!.email || "",
                  contactPhone: intakeData!.contact_phone || intakeData!.phone,
                  contactAddress: intakeData!.contact_address || intakeData!.address,
                  dataCategories: [],
                  retentionPeriod: intakeData!.retention_period,
                  usesCookies: intakeData!.collection_methods?.includes?.("automated") ? "yes" : "no",
                  dpoName: intakeData!.dpo_name,
                  dpoEmail: intakeData!.dpo_email,
                  dpoPhone: intakeData!.dpo_phone,
                });

                await storage.updatePolicyDocument(policyDoc.id, {
                  generatedContent: generatedContent,
                  status: "completed",
                });

                await storage.updatePolicyGenerationRequest(requestId, {
                  workflowStatus: "delivered",
                  policyDocumentId: policyDoc.id,
                });

                // Send policy email to user
                const user = policyRequest.userId ? await storage.getUser(policyRequest.userId) : null;
                if (user?.email && generatedContent) {
                  try {
                    const emailSent = await sendPolicyEmail({
                      to: user.email,
                      companyName: companyName,
                      policyContent: generatedContent,
                      policyId: policyDoc.id,
                    });
                    console.log(`[Geidea Callback] Policy email sent to ${user.email}: ${emailSent}`);
                  } catch (err) {
                    console.error("[Geidea Callback] Failed to send policy email:", err);
                  }
                }
                console.log(`[Geidea Callback] Policy auto-generated and delivered for request: ${requestId}`);
              }
            } catch (genErr) {
              console.error(`[Geidea Callback] Auto-generation failed for request ${requestId}:`, genErr);
              // Don't fail the callback - payment is still successful
            }
          }
        }
      } else {
        console.log(`[Geidea Callback] Payment not successful. Status: ${status}`);
        const existingPayment = await storage.getPaymentByRequestId(requestId);
        if (existingPayment) {
          await storage.updatePayment(existingPayment.id, {
            status: "failed",
            rawPayload: orderData,
          });
        }
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error processing Geidea callback:", error);
      res.status(500).json({ error: "Callback processing failed" });
    }
  });

  app.post("/api/geidea/verify", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: "غير مصرح" });
      }

      const { requestId } = req.body;
      if (!requestId) {
        return res.status(400).json({ error: "معرف الطلب مطلوب" });
      }

      const policyRequest = await storage.getPolicyGenerationRequest(requestId);
      if (!policyRequest) {
        return res.status(404).json({ error: "الطلب غير موجود" });
      }
      if (policyRequest.userId !== userId) {
        return res.status(403).json({ error: "غير مصرح" });
      }

      if (policyRequest.paymentStatus === "paid") {
        return res.json({
          success: true,
          status: "paid",
          message: "تم تأكيد الدفع",
        });
      }

      const existingPayment = await storage.getPaymentByRequestId(requestId);
      if (existingPayment && existingPayment.providerPaymentId) {
        const publicKey = process.env.GEIDEA_PUBLIC_KEY;
        const apiPassword = process.env.GEIDEA_API_PASSWORD;

        if (publicKey && apiPassword) {
          try {
            const credentials = Buffer.from(`${publicKey}:${apiPassword}`).toString("base64");
            const merchantRefId = existingPayment.providerPaymentId;
            
            const geideaBaseUrl = process.env.GEIDEA_API_BASE_URL || "https://api.ksamerchant.geidea.net";
            const ordersResponse = await fetch(
              `${geideaBaseUrl}/pgw/api/v1/direct/order?merchantReferenceId=${encodeURIComponent(merchantRefId)}`,
              {
                headers: {
                  "Authorization": `Basic ${credentials}`,
                  "Content-Type": "application/json",
                },
              }
            );

            if (ordersResponse.ok) {
              const ordersData = await ordersResponse.json();
              const orders = ordersData?.orders || [];
              const successOrder = orders.find((o: any) => o.status === "Success");

              if (successOrder) {
                console.log(`[Geidea Verify] Payment confirmed via API for request: ${requestId}`);
                
                await storage.updatePolicyGenerationRequest(requestId, {
                  workflowStatus: "paid",
                  paymentStatus: "paid",
                });

                await storage.updatePayment(existingPayment.id, {
                  providerPaymentId: successOrder.orderId || merchantRefId,
                  status: "succeeded",
                  rawPayload: successOrder,
                });

                return res.json({
                  success: true,
                  status: "paid",
                  message: "تم تأكيد الدفع",
                });
              }
            }
          } catch (apiErr) {
            console.error("[Geidea Verify] API check failed:", apiErr);
          }
        }
      }

      return res.status(402).json({
        success: false,
        status: policyRequest.paymentStatus,
        message: "لم يتم تأكيد الدفع بعد",
      });
    } catch (error) {
      console.error("Error verifying Geidea payment:", error);
      res.status(500).json({ error: "فشل في التحقق من حالة الدفع" });
    }
  });

  // ========== Terms Generator Endpoints ==========
  
  app.post("/api/terms", async (req, res) => {
    try {
      const validatedData = insertTermsDocumentSchema.parse(req.body);
      const termsDoc = await storage.createTermsDocument(validatedData);
      
      processTermsGeneration(termsDoc.id);
      
      res.json(termsDoc);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating terms document:", error);
      res.status(500).json({ error: "فشل في إنشاء وثيقة الشروط" });
    }
  });

  app.get("/api/terms", async (req, res) => {
    try {
      const terms = await storage.getAllTermsDocuments();
      res.json(terms);
    } catch (error) {
      console.error("Error fetching terms:", error);
      res.status(500).json({ error: "فشل في جلب وثائق الشروط" });
    }
  });

  app.get("/api/terms/:id", async (req, res) => {
    try {
      const terms = await storage.getTermsDocument(req.params.id);
      if (!terms) {
        return res.status(404).json({ error: "الوثيقة غير موجودة" });
      }
      res.json(terms);
    } catch (error) {
      console.error("Error fetching terms:", error);
      res.status(500).json({ error: "فشل في جلب الوثيقة" });
    }
  });

  // ========== Consent Management Endpoints ==========
  
  app.post("/api/consents", async (req, res) => {
    try {
      const validatedData = insertConsentRecordSchema.parse(req.body);
      const consent = await storage.createConsentRecord(validatedData);
      res.json(consent);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating consent record:", error);
      res.status(500).json({ error: "فشل في إنشاء سجل الموافقة" });
    }
  });

  app.get("/api/consents", async (req, res) => {
    try {
      const { userId } = req.query;
      const consents = userId 
        ? await storage.getConsentRecordsByUserId(userId as string)
        : await storage.getAllConsentRecords();
      res.json(consents);
    } catch (error) {
      console.error("Error fetching consents:", error);
      res.status(500).json({ error: "فشل في جلب سجلات الموافقة" });
    }
  });

  app.get("/api/consents/:id", async (req, res) => {
    try {
      const consent = await storage.getConsentRecord(req.params.id);
      if (!consent) {
        return res.status(404).json({ error: "السجل غير موجود" });
      }
      res.json(consent);
    } catch (error) {
      console.error("Error fetching consent:", error);
      res.status(500).json({ error: "فشل في جلب السجل" });
    }
  });

  app.patch("/api/consents/:id", async (req, res) => {
    try {
      const consent = await storage.updateConsentRecord(req.params.id, req.body);
      if (!consent) {
        return res.status(404).json({ error: "السجل غير موجود" });
      }
      res.json(consent);
    } catch (error) {
      console.error("Error updating consent:", error);
      res.status(500).json({ error: "فشل في تحديث السجل" });
    }
  });

  // ========== Compliance Tasks Endpoints ==========
  
  app.post("/api/tasks", async (req, res) => {
    try {
      const validatedData = insertComplianceTaskSchema.parse(req.body);
      const task = await storage.createComplianceTask(validatedData);
      res.json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating task:", error);
      res.status(500).json({ error: "فشل في إنشاء المهمة" });
    }
  });

  app.get("/api/tasks", async (req, res) => {
    try {
      const tasks = await storage.getAllComplianceTasks();
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ error: "فشل في جلب المهام" });
    }
  });

  app.get("/api/tasks/:id", async (req, res) => {
    try {
      const task = await storage.getComplianceTask(req.params.id);
      if (!task) {
        return res.status(404).json({ error: "المهمة غير موجودة" });
      }
      res.json(task);
    } catch (error) {
      console.error("Error fetching task:", error);
      res.status(500).json({ error: "فشل في جلب المهمة" });
    }
  });

  app.patch("/api/tasks/:id", async (req, res) => {
    try {
      const task = await storage.updateComplianceTask(req.params.id, req.body);
      if (!task) {
        return res.status(404).json({ error: "المهمة غير موجودة" });
      }
      res.json(task);
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(500).json({ error: "فشل في تحديث المهمة" });
    }
  });

  app.delete("/api/tasks/:id", async (req, res) => {
    try {
      await storage.deleteComplianceTask(req.params.id);
      res.json({ message: "تم حذف المهمة بنجاح" });
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(500).json({ error: "فشل في حذف المهمة" });
    }
  });

  // ========== CMP (Consent Management Platform) Endpoints ==========

  // CMP Settings
  app.get("/api/cmp/settings", async (req, res) => {
    try {
      let settings = await storage.getCmpSettings();
      if (!settings) {
        settings = await storage.createDefaultCmpSettings();
      }
      res.json(settings);
    } catch (error) {
      console.error("Error fetching CMP settings:", error);
      res.status(500).json({ error: "فشل في جلب إعدادات CMP" });
    }
  });

  app.put("/api/cmp/settings", async (req, res) => {
    try {
      const validatedData = insertCmpSettingsSchema.parse(req.body);
      const settings = await storage.updateCmpSettings(validatedData);
      res.json(settings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error updating CMP settings:", error);
      res.status(500).json({ error: "فشل في تحديث إعدادات CMP" });
    }
  });

  // CMP Scripts
  app.get("/api/cmp/scripts", async (req, res) => {
    try {
      const scripts = await storage.getAllCmpScripts();
      res.json(scripts);
    } catch (error) {
      console.error("Error fetching scripts:", error);
      res.status(500).json({ error: "فشل في جلب السكربتات" });
    }
  });

  app.post("/api/cmp/scripts", async (req, res) => {
    try {
      const validatedData = insertCmpScriptSchema.parse(req.body);
      const script = await storage.createCmpScript(validatedData);
      res.json(script);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating script:", error);
      res.status(500).json({ error: "فشل في إنشاء السكربت" });
    }
  });

  app.put("/api/cmp/scripts/:id", async (req, res) => {
    try {
      const validatedData = insertCmpScriptSchema.partial().parse(req.body);
      const script = await storage.updateCmpScript(req.params.id, validatedData);
      if (!script) {
        return res.status(404).json({ error: "السكربت غير موجود" });
      }
      res.json(script);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error updating script:", error);
      res.status(500).json({ error: "فشل في تحديث السكربت" });
    }
  });

  app.delete("/api/cmp/scripts/:id", async (req, res) => {
    try {
      await storage.deleteCmpScript(req.params.id);
      res.json({ message: "تم حذف السكربت بنجاح" });
    } catch (error) {
      console.error("Error deleting script:", error);
      res.status(500).json({ error: "فشل في حذف السكربت" });
    }
  });

  // CMP Public Config (for snippet)
  app.get("/api/cmp/config", async (req, res) => {
    try {
      let settings = await storage.getCmpSettings();
      if (!settings) {
        settings = await storage.createDefaultCmpSettings();
      }
      
      const scripts = await storage.getAllCmpScripts();
      const enabledScripts = scripts.filter(s => s.enabled === "yes");
      
      res.json({
        settings: {
          primaryColor: settings.primaryColor,
          backgroundColor: settings.backgroundColor,
          textColor: settings.textColor,
          buttonColor: settings.buttonColor,
          bannerTitle: settings.bannerTitle,
          bannerDescription: settings.bannerDescription,
          acceptAllButtonText: settings.acceptAllButtonText,
          rejectAllButtonText: settings.rejectAllButtonText,
          customizeButtonText: settings.customizeButtonText,
          necessaryCookiesTitle: settings.necessaryCookiesTitle,
          necessaryCookiesDesc: settings.necessaryCookiesDesc,
          analyticsCookiesTitle: settings.analyticsCookiesTitle,
          analyticsCookiesDesc: settings.analyticsCookiesDesc,
          marketingCookiesTitle: settings.marketingCookiesTitle,
          marketingCookiesDesc: settings.marketingCookiesDesc,
          performanceCookiesTitle: settings.performanceCookiesTitle,
          performanceCookiesDesc: settings.performanceCookiesDesc,
          bannerPosition: settings.bannerPosition,
          language: settings.language,
          showLogo: settings.showLogo,
          logoUrl: settings.logoUrl,
          privacyPolicyUrl: settings.privacyPolicyUrl,
          termsUrl: settings.termsUrl,
          consentVersion: settings.consentVersion,
        },
        scripts: enabledScripts.map(script => ({
          id: script.id,
          name: script.name,
          category: script.category,
          scriptType: script.scriptType,
          scriptContent: script.scriptType === "inline" ? script.scriptContent : undefined,
          scriptUrl: script.scriptType === "external" ? script.scriptUrl : undefined,
          scriptPosition: script.scriptPosition,
        }))
      });
    } catch (error) {
      console.error("Error fetching CMP config:", error);
      res.status(500).json({ error: "فشل في جلب تكوين CMP" });
    }
  });

  // Consent Records (CMP)
  app.post("/api/cmp/consent", async (req, res) => {
    try {
      const validatedData = insertConsentRecordSchema.parse(req.body);
      
      // Add IP address and user agent from request
      const consentData = {
        ...validatedData,
        ipAddress: req.ip || req.headers['x-forwarded-for'] as string || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
      };
      
      const consent = await storage.createConsentRecord(consentData);
      res.json(consent);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating consent:", error);
      res.status(500).json({ error: "فشل في تسجيل الموافقة" });
    }
  });

  app.post("/api/cmp/consent/:id/withdraw", async (req, res) => {
    try {
      const { reason } = req.body;
      const consent = await storage.withdrawConsent(req.params.id, reason);
      
      if (!consent) {
        return res.status(404).json({ error: "السجل غير موجود" });
      }
      
      res.json(consent);
    } catch (error) {
      console.error("Error withdrawing consent:", error);
      res.status(500).json({ error: "فشل في سحب الموافقة" });
    }
  });

  app.get("/api/cmp/consent/export", async (req, res) => {
    try {
      const format = req.query.format as string || "json";
      const consents = await storage.getAllConsentRecords();
      
      if (format === "csv") {
        // Generate CSV
        const headers = [
          "ID",
          "Anonymous ID",
          "User ID",
          "Consent Date",
          "Necessary",
          "Analytics",
          "Marketing",
          "Performance",
          "IP Address",
          "Withdrawn At",
        ];
        
        const rows = consents.map(c => [
          c.id,
          c.anonymousId,
          c.userId || "",
          c.consentDate?.toISOString() || "",
          c.necessaryCookies,
          c.analyticsCookies,
          c.marketingCookies,
          c.performanceCookies,
          c.ipAddress || "",
          c.withdrawnAt?.toISOString() || "",
        ]);
        
        const csv = [
          headers.join(","),
          ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
        ].join("\n");
        
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename=consent-records-${new Date().toISOString().split('T')[0]}.csv`);
        res.send(csv);
      } else {
        // JSON format
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Content-Disposition", `attachment; filename=consent-records-${new Date().toISOString().split('T')[0]}.json`);
        res.json(consents);
      }
    } catch (error) {
      console.error("Error exporting consents:", error);
      res.status(500).json({ error: "فشل في تصدير سجلات الموافقة" });
    }
  });

  // ====================================
  // Internal Compliance Management APIs
  // وحدة الامتثال الداخلي
  // ====================================

  // ROPA Entries - سجل أنشطة المعالجة
  app.post("/api/ropa", async (req, res) => {
    try {
      const validatedData = insertRopaEntrySchema.parse(req.body);
      const entry = await storage.createRopaEntry(validatedData);
      res.json(entry);
    } catch (error) {
      console.error("Error creating ROPA entry:", error);
      if (error instanceof Error && error.name === "ZodError") {
        return res.status(400).json({ error: "بيانات غير صحيحة" });
      }
      res.status(500).json({ error: "فشل في إنشاء سجل المعالجة" });
    }
  });

  app.get("/api/ropa", async (req, res) => {
    try {
      const entries = await storage.getAllRopaEntries();
      res.json(entries);
    } catch (error) {
      console.error("Error getting ROPA entries:", error);
      res.status(500).json({ error: "فشل في جلب سجلات المعالجة" });
    }
  });

  app.get("/api/ropa/:id", async (req, res) => {
    try {
      const entry = await storage.getRopaEntry(req.params.id);
      if (!entry) {
        return res.status(404).json({ error: "السجل غير موجود" });
      }
      res.json(entry);
    } catch (error) {
      console.error("Error getting ROPA entry:", error);
      res.status(500).json({ error: "فشل في جلب السجل" });
    }
  });

  app.put("/api/ropa/:id", async (req, res) => {
    try {
      const validatedData = updateRopaEntrySchema.parse(req.body);
      const entry = await storage.updateRopaEntry(req.params.id, validatedData);
      if (!entry) {
        return res.status(404).json({ error: "السجل غير موجود" });
      }
      res.json(entry);
    } catch (error) {
      console.error("Error updating ROPA entry:", error);
      if (error instanceof Error && error.name === "ZodError") {
        return res.status(400).json({ error: "بيانات غير صحيحة" });
      }
      res.status(500).json({ error: "فشل في تحديث السجل" });
    }
  });

  app.delete("/api/ropa/:id", async (req, res) => {
    try {
      await storage.deleteRopaEntry(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting ROPA entry:", error);
      res.status(500).json({ error: "فشل في حذف السجل" });
    }
  });

  // DSAR Requests - طلبات أصحاب البيانات
  app.post("/api/dsar", async (req, res) => {
    try {
      const validatedData = insertDsarRequestSchema.parse(req.body);
      const request = await storage.createDsarRequest(validatedData);
      res.json(request);
    } catch (error) {
      console.error("Error creating DSAR request:", error);
      if (error instanceof Error && error.name === "ZodError") {
        return res.status(400).json({ error: "بيانات غير صحيحة" });
      }
      res.status(500).json({ error: "فشل في إنشاء الطلب" });
    }
  });

  app.get("/api/dsar", async (req, res) => {
    try {
      const status = req.query.status as string;
      const requests = status 
        ? await storage.getDsarRequestsByStatus(status)
        : await storage.getAllDsarRequests();
      res.json(requests);
    } catch (error) {
      console.error("Error getting DSAR requests:", error);
      res.status(500).json({ error: "فشل في جلب الطلبات" });
    }
  });

  app.get("/api/dsar/:id", async (req, res) => {
    try {
      const request = await storage.getDsarRequest(req.params.id);
      if (!request) {
        return res.status(404).json({ error: "الطلب غير موجود" });
      }
      res.json(request);
    } catch (error) {
      console.error("Error getting DSAR request:", error);
      res.status(500).json({ error: "فشل في جلب الطلب" });
    }
  });

  app.put("/api/dsar/:id", async (req, res) => {
    try {
      const validatedData = updateDsarRequestSchema.parse(req.body);
      const request = await storage.updateDsarRequest(req.params.id, validatedData);
      if (!request) {
        return res.status(404).json({ error: "الطلب غير موجود" });
      }
      res.json(request);
    } catch (error) {
      console.error("Error updating DSAR request:", error);
      if (error instanceof Error && error.name === "ZodError") {
        return res.status(400).json({ error: "بيانات غير صحيحة" });
      }
      res.status(500).json({ error: "فشل في تحديث الطلب" });
    }
  });

  app.delete("/api/dsar/:id", async (req, res) => {
    try {
      await storage.deleteDsarRequest(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting DSAR request:", error);
      res.status(500).json({ error: "فشل في حذف الطلب" });
    }
  });

  // DPIA Assessments - تقييم تأثير حماية البيانات
  app.post("/api/dpia", async (req, res) => {
    try {
      const validatedData = insertDpiaAssessmentSchema.parse(req.body);
      const assessment = await storage.createDpiaAssessment(validatedData);
      res.json(assessment);
    } catch (error) {
      console.error("Error creating DPIA assessment:", error);
      if (error instanceof Error && error.name === "ZodError") {
        return res.status(400).json({ error: "بيانات غير صحيحة" });
      }
      res.status(500).json({ error: "فشل في إنشاء التقييم" });
    }
  });

  app.get("/api/dpia", async (req, res) => {
    try {
      const status = req.query.status as string;
      const assessments = status 
        ? await storage.getDpiaAssessmentsByStatus(status)
        : await storage.getAllDpiaAssessments();
      res.json(assessments);
    } catch (error) {
      console.error("Error getting DPIA assessments:", error);
      res.status(500).json({ error: "فشل في جلب التقييمات" });
    }
  });

  app.get("/api/dpia/:id", async (req, res) => {
    try {
      const assessment = await storage.getDpiaAssessment(req.params.id);
      if (!assessment) {
        return res.status(404).json({ error: "التقييم غير موجود" });
      }
      res.json(assessment);
    } catch (error) {
      console.error("Error getting DPIA assessment:", error);
      res.status(500).json({ error: "فشل في جلب التقييم" });
    }
  });

  app.put("/api/dpia/:id", async (req, res) => {
    try {
      const validatedData = updateDpiaAssessmentSchema.parse(req.body);
      const assessment = await storage.updateDpiaAssessment(req.params.id, validatedData);
      if (!assessment) {
        return res.status(404).json({ error: "التقييم غير موجود" });
      }
      res.json(assessment);
    } catch (error) {
      console.error("Error updating DPIA assessment:", error);
      if (error instanceof Error && error.name === "ZodError") {
        return res.status(400).json({ error: "بيانات غير صحيحة" });
      }
      res.status(500).json({ error: "فشل في تحديث التقييم" });
    }
  });

  app.delete("/api/dpia/:id", async (req, res) => {
    try {
      await storage.deleteDpiaAssessment(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting DPIA assessment:", error);
      res.status(500).json({ error: "فشل في حذف التقييم" });
    }
  });

  // ==================== AI ASSISTANT ROUTES ====================

  // Generate embeddings for all knowledge base articles (admin endpoint)
  app.post("/api/assistant/generate-embeddings", async (req, res) => {
    try {
      const articles = await storage.getAllKnowledgeArticles();
      
      let processed = 0;
      const errors: string[] = [];
      
      for (const article of articles) {
        try {
          const embedding = await generateEmbedding(article.content);
          let embeddingEn: number[] | undefined;
          if (article.contentEn) {
            embeddingEn = await generateEmbedding(article.contentEn);
          }
          await storage.updateArticleEmbedding(article.id, embedding, embeddingEn);
          processed++;
        } catch (error: any) {
          console.error(`Error processing article ${article.id}:`, error.message);
          errors.push(`Article ${article.title}: ${error.message}`);
        }
      }
      
      res.json({
        success: true,
        processed,
        total: articles.length,
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (error: any) {
      console.error("Error generating embeddings:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Search knowledge base
  app.post("/api/assistant/search", async (req, res) => {
    try {
      const { query, language = "ar", limit = 5 } = req.body;
      
      if (!query || typeof query !== "string") {
        return res.status(400).json({ error: "يجب إدخال استعلام البحث" });
      }
      
      const queryEmbedding = await generateEmbedding(query);
      const results = await storage.searchKnowledgeByVector(queryEmbedding, language, limit);
      
      res.json({
        results: results.map(article => ({
          id: article.id,
          title: language === "en" && article.titleEn ? article.titleEn : article.title,
          content: language === "en" && article.contentEn ? article.contentEn : article.content,
          category: article.category,
          type: article.type,
          similarity: article.similarity,
        })),
      });
    } catch (error: any) {
      console.error("Error searching knowledge base:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Chat endpoint - send message and get AI response
  app.post("/api/assistant/chat", async (req, res) => {
    try {
      const { conversationId, message, language = "ar" } = req.body;
      
      if (!message || typeof message !== "string") {
        return res.status(400).json({ error: "يجب إدخال الرسالة" });
      }
      
      let conversation;
      if (conversationId) {
        conversation = await storage.getChatConversation(conversationId);
        if (!conversation) {
          return res.status(404).json({ error: "المحادثة غير موجودة" });
        }
      } else {
        conversation = await storage.createChatConversation({
          title: message.substring(0, 50) + (message.length > 50 ? "..." : ""),
          language,
        });
      }
      
      await storage.createChatMessage({
        conversationId: conversation.id,
        role: "user",
        content: message,
      });
      
      const questionEmbedding = await generateEmbedding(message);
      const searchResults = await storage.searchKnowledgeByVector(questionEmbedding, language, 5);
      
      const retrievedContext: RetrievedContext[] = searchResults.map(article => ({
        id: article.id,
        title: language === "en" && article.titleEn ? article.titleEn : article.title,
        content: language === "en" && article.contentEn ? article.contentEn : article.content,
        category: article.category,
        similarity: article.similarity,
      }));
      
      const allMessages = await storage.getMessagesByConversationId(conversation.id);
      const conversationHistory = allMessages.slice(-6).map(msg => ({
        role: msg.role,
        content: msg.content,
      }));
      
      const aiResponse = await generateChatResponse(message, retrievedContext, conversationHistory);
      
      const assistantMessage = await storage.createChatMessage({
        conversationId: conversation.id,
        role: "assistant",
        content: aiResponse,
        retrievedContext: retrievedContext as any,
      });
      
      for (const article of searchResults) {
        await storage.incrementArticleView(article.id);
      }
      
      res.json({
        conversationId: conversation.id,
        message: assistantMessage,
        retrievedContext,
      });
    } catch (error: any) {
      console.error("Error in chat endpoint:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get all conversations
  app.get("/api/assistant/conversations", async (req, res) => {
    try {
      const conversations = await storage.getAllChatConversations();
      res.json(conversations);
    } catch (error: any) {
      console.error("Error getting conversations:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get conversation by ID with messages
  app.get("/api/assistant/conversations/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const conversation = await storage.getChatConversation(id);
      
      if (!conversation) {
        return res.status(404).json({ error: "المحادثة غير موجودة" });
      }
      
      const messages = await storage.getMessagesByConversationId(id);
      
      res.json({
        ...conversation,
        messages,
      });
    } catch (error: any) {
      console.error("Error getting conversation:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Delete conversation
  app.delete("/api/assistant/conversations/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteChatConversation(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting conversation:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Submit feedback for message
  app.post("/api/assistant/feedback", async (req, res) => {
    try {
      const { messageId, helpful } = req.body;
      
      if (!messageId) {
        return res.status(400).json({ error: "يجب تحديد الرسالة" });
      }
      
      await storage.updateChatMessage(messageId, {
        wasHelpful: helpful,
      });
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error submitting feedback:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get knowledge articles (for admin/management)
  app.get("/api/assistant/knowledge", async (req, res) => {
    try {
      const articles = await storage.getAllKnowledgeArticles();
      res.json(articles);
    } catch (error: any) {
      console.error("Error getting knowledge articles:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // Admin Routes - مسارات لوحة التحكم الإدارية
  // ============================================

  // Admin Login (Registration disabled - admin accounts created manually)
  app.post("/api/admin/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "الرجاء إدخال البريد الإلكتروني وكلمة المرور" });
      }

      const admin = await storage.getAdminUserByEmail(email);
      if (!admin) {
        return res.status(401).json({ message: "بيانات الدخول غير صحيحة" });
      }

      if (!admin.isActive) {
        return res.status(403).json({ message: "الحساب معطل. يرجى التواصل مع المشرف" });
      }

      const isPasswordValid = await bcrypt.compare(password, admin.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: "بيانات الدخول غير صحيحة" });
      }

      // Regenerate session to prevent session fixation
      await new Promise<void>((resolve, reject) => {
        req.session.regenerate((err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Create admin session
      req.session.adminId = admin.id.toString();
      req.session.adminRole = admin.role as "admin" | "legal" | "support";

      await storage.updateAdminLastLogin(admin.id);
      await storage.createAuditLog({
        adminUserId: admin.id.toString(),
        action: "admin_login",
        entityType: "admin_user",
        entityId: admin.id.toString(),
        details: JSON.stringify({ email: admin.email, role: admin.role }),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      const { password: _, ...adminWithoutPassword } = admin;
      res.json(adminWithoutPassword);
    } catch (error) {
      console.error("Admin login error:", error);
      res.status(500).json({ message: "حدث خطأ أثناء تسجيل الدخول" });
    }
  });
  
  // Get current admin
  app.get("/api/admin/me", requireAdminAuth, async (req, res) => {
    try {
      const admin = await storage.getAdminUser(req.session.adminId!);
      if (!admin) {
        return res.status(404).json({ message: "المشرف غير موجود" });
      }
      
      const { password: _, ...adminWithoutPassword } = admin;
      res.json(adminWithoutPassword);
    } catch (error) {
      console.error("Error getting current admin:", error);
      res.status(500).json({ message: "حدث خطأ أثناء جلب بيانات المشرف" });
    }
  });
  
  // Admin logout
  app.post("/api/admin/logout", requireAdminAuth, (req, res) => {
    const adminId = req.session.adminId;
    req.session.destroy((err) => {
      if (err) {
        console.error("Error destroying admin session:", err);
        return res.status(500).json({ message: "فشل في تسجيل الخروج" });
      }
      
      if (adminId) {
        storage.createAuditLog({
          adminUserId: adminId,
          action: "admin_logout",
          entityType: "admin_user",
          entityId: adminId,
          details: JSON.stringify({}),
        }).catch(console.error);
      }
      
      res.clearCookie("connect.sid");
      res.json({ message: "تم تسجيل الخروج بنجاح" });
    });
  });

  // Test email endpoint (admin only)
  app.post("/api/admin/test-email", requireAdminAuth, async (req, res) => {
    try {
      const { to, type } = req.body;
      
      if (!to || !type) {
        return res.status(400).json({ message: "البريد الإلكتروني ونوع الرسالة مطلوبان" });
      }

      let success = false;
      
      if (type === "otp") {
        success = await sendOtpEmail({ to, code: "123456" });
      } else if (type === "policy") {
        const testPolicyContent = `
          <h2>1. مقدمة</h2>
          <p>نحن في شركة اختبار نلتزم بحماية خصوصية بياناتك الشخصية وفقاً لنظام حماية البيانات الشخصية السعودي (PDPL).</p>
          
          <h2>2. البيانات التي نجمعها</h2>
          <ul>
            <li>الاسم الكامل</li>
            <li>البريد الإلكتروني</li>
            <li>رقم الهاتف</li>
          </ul>
          
          <h2>3. كيف نستخدم بياناتك</h2>
          <p>نستخدم بياناتك الشخصية لتقديم خدماتنا وتحسين تجربتك.</p>
          
          <h2>4. حقوقك</h2>
          <p>لديك الحق في الوصول إلى بياناتك وتصحيحها وحذفها.</p>
          
          <h2>5. الاتصال بنا</h2>
          <p>للاستفسارات، تواصل معنا عبر: test@example.com</p>
        `;
        success = await sendPolicyEmail({ 
          to, 
          companyName: "شركة اختبار", 
          policyContent: testPolicyContent, 
          policyId: "test-123" 
        });
      } else if (type === "payment") {
        success = await sendPaymentConfirmationEmail({
          to,
          companyName: "شركة اختبار",
          amount: 9900,
          paymentId: "test-payment-123"
        });
      } else {
        return res.status(400).json({ message: "نوع الرسالة غير صالح" });
      }

      if (success) {
        res.json({ success: true, message: `تم إرسال رسالة ${type} إلى ${to}` });
      } else {
        res.status(500).json({ success: false, message: "فشل إرسال البريد الإلكتروني" });
      }
    } catch (error) {
      console.error("Test email error:", error);
      res.status(500).json({ message: "حدث خطأ أثناء إرسال البريد التجريبي" });
    }
  });

  // Admin statistics (all roles)
  app.get("/api/admin/stats", requireAdminAuth, async (req, res) => {
    try {
      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ message: "حدث خطأ أثناء جلب الإحصائيات" });
    }
  });

  // Get all users (admin & legal only)
  app.get("/api/admin/users", requireAdminOrLegal, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const usersWithoutPasswords = users.map(({ password, ...user }) => user);
      res.json(usersWithoutPasswords);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "حدث خطأ أثناء جلب المستخدمين" });
    }
  });

  // Update user (admin only)
  app.patch("/api/admin/users/:id", requireAdminRole, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Validate update schema (only allow specific fields)
      const updateSchema = z.object({
        name: z.string().min(2).optional(),
        email: z.string().email().optional(),
      }).strict();
      
      const validatedUpdates = updateSchema.parse(req.body);
      
      const updated = await storage.updateUser(id, validatedUpdates);
      if (!updated) {
        return res.status(404).json({ message: "المستخدم غير موجود" });
      }

      await storage.createAuditLog({
        adminUserId: req.session.adminId!,
        action: "update_user",
        entityType: "user",
        entityId: id,
        details: JSON.stringify(validatedUpdates),
      });

      const { password: _, ...userWithoutPassword } = updated;
      res.json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "بيانات غير صحيحة", errors: error.errors });
      }
      console.error("Error updating user:", error);
      res.status(500).json({ message: "حدث خطأ أثناء تحديث المستخدم" });
    }
  });

  // Delete user (admin only)
  app.delete("/api/admin/users/:id", requireAdminRole, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteUser(id);

      await storage.createAuditLog({
        adminUserId: req.session.adminId!,
        action: "delete_user",
        entityType: "user",
        entityId: id,
        details: JSON.stringify({ deletedUserId: id }),
      });

      res.json({ message: "تم حذف المستخدم بنجاح" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "حدث خطأ أثناء حذف المستخدم" });
    }
  });

  // Get all client policies (admin & legal only)
  app.get("/api/admin/policies", requireAdminOrLegal, async (req, res) => {
    try {
      const policies = await storage.getAllClientPolicies();
      res.json(policies);
    } catch (error) {
      console.error("Error fetching policies:", error);
      res.status(500).json({ message: "حدث خطأ أثناء جلب السياسات" });
    }
  });

  // Get all client requests (admin & legal only)
  app.get("/api/admin/requests", requireAdminOrLegal, async (req, res) => {
    try {
      const requests = await storage.getAllClientRequests();
      res.json(requests);
    } catch (error) {
      console.error("Error fetching requests:", error);
      res.status(500).json({ message: "حدث خطأ أثناء جلب الطلبات" });
    }
  });

  // Update client request (admin & legal only)
  app.patch("/api/admin/requests/:id", requireAdminOrLegal, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Validate update schema (only allow status and assigned admin)
      const updateSchema = z.object({
        status: z.enum(["pending", "in_progress", "completed", "rejected"]).optional(),
        responseNotes: z.string().optional(),
        assignedTo: z.string().optional(),
      }).strict();
      
      const validatedUpdates = updateSchema.parse(req.body);

      const updated = await storage.updateClientRequest(id, validatedUpdates);
      if (!updated) {
        return res.status(404).json({ message: "الطلب غير موجود" });
      }

      await storage.createAuditLog({
        adminUserId: req.session.adminId!,
        action: "update_request",
        entityType: "client_request",
        entityId: id,
        details: JSON.stringify(validatedUpdates),
      });

      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "بيانات غير صحيحة", errors: error.errors });
      }
      console.error("Error updating request:", error);
      res.status(500).json({ message: "حدث خطأ أثناء تحديث الطلب" });
    }
  });

  // Get audit logs (admin only)
  app.get("/api/admin/audit-logs", requireAdminRole, async (req, res) => {
    try {
      const logs = await storage.getAllAuditLogs();
      res.json(logs);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({ message: "حدث خطأ أثناء جلب سجلات التدقيق" });
    }
  });

  // Get all admin users (admin only)
  app.get("/api/admin/admins", requireAdminRole, async (req, res) => {
    try {
      const admins = await storage.getAllAdminUsers();
      const adminsWithoutPasswords = admins.map(({ password, ...admin }) => admin);
      res.json(adminsWithoutPasswords);
    } catch (error) {
      console.error("Error fetching admins:", error);
      res.status(500).json({ message: "حدث خطأ أثناء جلب المشرفين" });
    }
  });

  // Update admin user (admin only)
  app.patch("/api/admin/admins/:id", requireAdminRole, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Validate update schema (only allow specific fields)
      const updateSchema = z.object({
        name: z.string().min(2).optional(),
        email: z.string().email().optional(),
        role: z.enum(["admin", "legal", "support"]).optional(),
        isActive: z.boolean().optional(),
      }).strict();
      
      const validatedUpdates = updateSchema.parse(req.body);

      const updated = await storage.updateAdminUser(id, validatedUpdates);
      if (!updated) {
        return res.status(404).json({ message: "المشرف غير موجود" });
      }

      await storage.createAuditLog({
        adminUserId: req.session.adminId!,
        action: "update_admin",
        entityType: "admin_user",
        entityId: id,
        details: JSON.stringify(validatedUpdates),
      });

      const { password: _, ...adminWithoutPassword } = updated;
      res.json(adminWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "بيانات غير صحيحة", errors: error.errors });
      }
      console.error("Error updating admin:", error);
      res.status(500).json({ message: "حدث خطأ أثناء تحديث المشرف" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}

async function processPrivacyPolicyGeneration(policyId: string, userEmail?: string) {
  try {
    await storage.updatePolicyDocument(policyId, { status: "generating" });
    
    const policy = await storage.getPolicyDocument(policyId);
    if (!policy) return;
    
    const generatedContent = await generatePrivacyPolicy(policy);
    
    await storage.updatePolicyDocument(policyId, {
      status: "completed",
      generatedContent,
    });
    
    // Send email to user's registered email (OTP email) - AWAIT to ensure delivery
    const emailTo = userEmail || policy.contactEmail;
    if (emailTo && generatedContent) {
      try {
        console.log("[Background] Sending policy email to:", emailTo);
        const emailSent = await sendPolicyEmail({
          to: emailTo,
          companyName: policy.companyName,
          policyContent: generatedContent,
          policyId: policyId,
        });
        console.log("[Background] Email sent result:", emailSent);
      } catch (err) {
        console.error("[Background] Failed to send policy email:", err);
      }
    }
  } catch (error) {
    console.error("Error processing privacy policy generation:", error);
    await storage.updatePolicyDocument(policyId, { status: "failed" });
  }
}

async function processTermsGeneration(termsId: string) {
  try {
    await storage.updateTermsDocument(termsId, { status: "generating" });
    
    const terms = await storage.getTermsDocument(termsId);
    if (!terms) return;
    
    // ====================================
    // Step 1: Find appropriate template
    // ====================================
    const templates = await storage.getTermsTemplatesByBusinessType(
      terms.businessType,
      terms.activityScale || undefined
    );
    
    let template = templates.find(t => t.activityScale === terms.activityScale);
    if (!template && templates.length > 0) {
      template = templates[0];
    }
    
    // ====================================
    // Step 2: Get template sections with legal sources (using junction tables)
    // ====================================
    let sections: any[] = [];
    let usedSections: any[] = [];
    let legalReferences: any[] = [];
    
    if (template) {
      const templateWithData = await storage.getTemplateWithSectionsAndSources(template.id);
      
      if (templateWithData && templateWithData.sections) {
        sections = templateWithData.sections;
        
        // Track used sections and legal references
        usedSections = sections.map(s => ({
          sectionId: s.id,
          slug: s.slug,
          heading: s.heading
        }));
        
        // Collect all legal references from junction table data
        for (const section of sections) {
          if (section.legalBasis && Array.isArray(section.legalBasis)) {
            legalReferences.push(...section.legalBasis);
          }
        }
      }
    }
    
    // ====================================
    // Step 3: Generate content using template + AI
    // ====================================
    const generatedContent = await generateTermsAndConditions({
      companyName: terms.companyName,
      websiteUrl: terms.websiteUrl,
      businessType: terms.businessType,
      serviceDescription: terms.serviceDescription,
      hasUserAccounts: terms.hasUserAccounts,
      hasSubscriptions: terms.hasSubscriptions,
      paymentMethods: (terms.paymentMethods as string[]) || undefined,
      refundPolicy: terms.refundPolicy || undefined,
      shippingPolicy: terms.shippingPolicy || undefined,
      returnPolicy: terms.returnPolicy || undefined,
      deliveryTimeframe: terms.deliveryTimeframe || undefined,
      liabilityLimits: terms.liabilityLimits || undefined,
      governingLaw: terms.governingLaw,
      disputeResolution: terms.disputeResolution || undefined,
      contactEmail: terms.contactEmail,
      contactPhone: terms.contactPhone || undefined,
      commercialRegistration: terms.commercialRegistration || undefined,
      taxNumber: terms.taxNumber || undefined,
      licenseNumber: terms.licenseNumber || undefined,
      // Pass template data for AI to use
      templateSections: sections,
      templateMetadata: template?.basePromptSeed || undefined,
    });
    
    // ====================================
    // Step 4: Update document with generated content and metadata
    // ====================================
    await storage.updateTermsDocument(termsId, {
      status: "completed",
      generatedContent,
      templateId: template?.id,
      usedSections,
      legalReferences,
    });
  } catch (error) {
    console.error("Error processing terms generation:", error);
    await storage.updateTermsDocument(termsId, { status: "failed" });
  }
}
