import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
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
  type RetrievedContext 
} from "./openai";
import { analyzeSite, convertToLegacyFormat } from "./services/complianceAnalyzer";
import { runComprehensiveScan } from "./scanner/comprehensiveScanner";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { sendPolicyEmail, sendPaymentConfirmationEmail } from "./email";

declare module "express-session" {
  interface SessionData {
    userId?: string;
    adminId?: string;
    adminRole?: "admin" | "legal" | "support";
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
  
  // ============================================
  // Session Configuration
  // ============================================
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
      saveUninitialized: false,
      cookie: {
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      },
    })
  );

  // ============================================
  // Authentication Middleware
  // ============================================
  
  // Middleware to check if user is authenticated
  const requireAuth = (req: Request, res: Response, next: NextFunction) => {
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
      
      // Create user
      const user = await storage.createUser({
        email,
        password: hashedPassword,
        name,
      });
      
      // Create session
      req.session.userId = user.id.toString();
      
      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;
      
      res.status(201).json({ user: userWithoutPassword });
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
      
      // Regenerate session to prevent session fixation
      await new Promise<void>((resolve, reject) => {
        req.session.regenerate((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      
      // Create session
      req.session.userId = user.id.toString();
      
      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
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
      const scan = await storage.createScan(validatedData);
      
      // Process scan in background
      processScan(scan.id);
      
      res.json(scan);
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
      const userId = (req.user as any)?.id;
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
      const userId = (req.user as any)?.id;
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
      
      // Process scan in background
      processScan(req.params.id);
      
      res.json({ message: "بدأت إعادة الفحص" });
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
  app.post("/api/policies", async (req, res) => {
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
      const userId = (req.user as any)?.id;
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
      const userId = (req.user as any)?.id;
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
      const userId = (req.user as any)?.id;
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
  
  // Update intake data for a policy generation request
  app.patch("/api/policy-requests/:id", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
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
      const userId = (req.user as any)?.id;
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
        amount: amount || 9900, // Default 99 SAR in halalas
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
      const userId = (req.user as any)?.id;
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
      const userId = (req.user as any)?.id;
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

  // ========== Moyasar Payment Verification ==========
  
  app.post("/api/payments/verify", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ error: "غير مصرح" });
      }
      
      const { paymentId, requestId } = req.body;
      
      if (!paymentId) {
        return res.status(400).json({ error: "معرف الدفع مطلوب" });
      }
      
      const secretKey = process.env.MOYASAR_SECRET_KEY;
      if (!secretKey) {
        console.error("MOYASAR_SECRET_KEY not configured");
        return res.status(503).json({ error: "بوابة الدفع غير مُهيأة" });
      }
      
      const verifyResponse = await fetch(`https://api.moyasar.com/v1/payments/${paymentId}`, {
        headers: {
          "Authorization": "Basic " + Buffer.from(`${secretKey}:`).toString("base64"),
        },
      });
      
      if (!verifyResponse.ok) {
        console.error("Moyasar verification failed:", verifyResponse.status);
        return res.status(400).json({ error: "فشل التحقق من الدفع" });
      }
      
      const payment = await verifyResponse.json();
      
      if (payment.status !== "paid") {
        return res.status(400).json({ error: "الدفع غير مكتمل", status: payment.status });
      }
      
      let companyName = "طلب جديد";
      let contactEmail = "";
      
      if (requestId) {
        const policyRequest = await storage.getPolicyGenerationRequest(requestId);
        if (policyRequest && policyRequest.userId === userId) {
          const intakeData = policyRequest.intakeData as Record<string, any> | null;
          companyName = intakeData?.companyName || companyName;
          contactEmail = intakeData?.contactEmail || "";
          
          await storage.updatePolicyGenerationRequest(requestId, {
            workflowStatus: "paid",
            paymentStatus: "paid",
          });
          
          const existingPayment = await storage.getPaymentByRequestId(requestId);
          if (existingPayment) {
            await storage.updatePayment(existingPayment.id, {
              providerPaymentId: paymentId,
              status: "succeeded",
              rawPayload: payment,
            });
          } else {
            await storage.createPayment({
              requestId,
              userId,
              amount: payment.amount,
              currency: payment.currency,
              provider: "moyasar",
              providerPaymentId: paymentId,
            });
          }
          
          if (contactEmail) {
            sendPaymentConfirmationEmail({
              to: contactEmail,
              companyName,
              amount: payment.amount,
              paymentId,
            }).catch(err => console.error("Failed to send payment email:", err));
          }
        }
      }
      
      res.json({ 
        success: true, 
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
      });
    } catch (error) {
      console.error("Error verifying payment:", error);
      res.status(500).json({ error: "فشل في التحقق من الدفع" });
    }
  });
  
  app.get("/api/moyasar/config", (req, res) => {
    const publishableKey = process.env.MOYASAR_PUBLISHABLE_KEY;
    if (!publishableKey) {
      return res.status(503).json({ error: "بوابة الدفع غير مُهيأة" });
    }
    res.json({ publishableKey });
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

async function processPrivacyPolicyGeneration(policyId: string) {
  try {
    await storage.updatePolicyDocument(policyId, { status: "generating" });
    
    const policy = await storage.getPolicyDocument(policyId);
    if (!policy) return;
    
    const generatedContent = await generatePrivacyPolicy(policy);
    
    await storage.updatePolicyDocument(policyId, {
      status: "completed",
      generatedContent,
    });
    
    if (policy.contactEmail && generatedContent) {
      sendPolicyEmail({
        to: policy.contactEmail,
        companyName: policy.companyName,
        policyContent: generatedContent,
        policyId: policyId,
      }).catch(err => console.error("Failed to send policy email:", err));
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
