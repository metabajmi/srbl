import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertComplianceScanSchema } from "@shared/schema";
import { analyzeWebsiteCompliance, generateComplianceReport } from "./openai";
import { z } from "zod";

// Helper function to fetch website content
async function fetchWebsiteContent(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch website: ${response.statusText}`);
    }
    
    const html = await response.text();
    return html;
  } catch (error) {
    console.error("Error fetching website:", error);
    throw new Error("فشل في الوصول إلى الموقع المطلوب");
  }
}

// Background scan processor
async function processScan(scanId: string) {
  try {
    // Update scan status to scanning
    await storage.updateScan(scanId, { status: "scanning" });
    
    const scan = await storage.getScan(scanId);
    if (!scan) return;
    
    // Fetch website content
    const htmlContent = await fetchWebsiteContent(scan.url);
    
    // Store the page content
    await storage.updateScan(scanId, { 
      pageContent: htmlContent.substring(0, 50000) // Store first 50KB
    });
    
    // Analyze with OpenAI
    const analysisResult = await analyzeWebsiteCompliance(htmlContent, scan.url);
    
    // Delete existing issues for this scan
    await storage.deleteIssuesByScanId(scanId);
    
    // Create issues from analysis
    let criticalCount = 0;
    let warningCount = 0;
    let suggestionCount = 0;
    
    for (const issue of analysisResult.issues) {
      await storage.createIssue({
        scanId,
        severity: issue.severity,
        category: issue.category,
        title: issue.title,
        description: issue.description,
        articleReference: issue.articleReference || null,
        regulation: issue.regulation || null,
        remediation: issue.remediation,
        affectedElement: issue.affectedElement || null,
      });
      
      // Count by severity
      if (issue.severity === "critical") criticalCount++;
      else if (issue.severity === "warning") warningCount++;
      else if (issue.severity === "suggestion") suggestionCount++;
    }
    
    // Update scan with results
    await storage.updateScan(scanId, {
      status: "completed",
      completedAt: new Date(),
      overallScore: analysisResult.overallScore,
      issuesCount: analysisResult.issues.length,
      criticalCount,
      warningCount,
      suggestionCount,
      analysisResult: analysisResult as any,
    });
    
  } catch (error) {
    console.error("Error processing scan:", error);
    await storage.updateScan(scanId, { 
      status: "failed",
      completedAt: new Date()
    });
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Enable JSON parsing
  app.use(require("express").json());

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

  // Get issues for a scan
  app.get("/api/scans/:id/issues", async (req, res) => {
    try {
      const issues = await storage.getIssuesByScanId(req.params.id);
      res.json(issues);
    } catch (error) {
      console.error("Error fetching issues:", error);
      res.status(500).json({ error: "فشل في جلب المخالفات" });
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
      
      // Store report
      const report = await storage.createReport({
        scanId: req.params.id,
        format,
      });
      
      await storage.updateScan(req.params.id, {
        ...scan,
        analysisResult: { ...scan.analysisResult, reportId: report.id } as any
      });
      
      // For demo, return the content directly
      // In production, you'd save to file and return download URL
      res.json({
        reportId: report.id,
        content,
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

  const httpServer = createServer(app);

  return httpServer;
}
