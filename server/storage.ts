import { 
  type ComplianceScan, 
  type InsertComplianceScan,
  type ComplianceIssue,
  type InsertComplianceIssue,
  type Report,
  type InsertReport,
  type RemediationTemplate,
  type InsertRemediationTemplate
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Compliance Scans
  createScan(scan: InsertComplianceScan): Promise<ComplianceScan>;
  getScan(id: string): Promise<ComplianceScan | undefined>;
  updateScan(id: string, updates: Partial<ComplianceScan>): Promise<ComplianceScan | undefined>;
  getAllScans(): Promise<ComplianceScan[]>;
  
  // Compliance Issues
  createIssue(issue: InsertComplianceIssue): Promise<ComplianceIssue>;
  getIssuesByScanId(scanId: string): Promise<ComplianceIssue[]>;
  deleteIssuesByScanId(scanId: string): Promise<void>;
  
  // Reports
  createReport(report: InsertReport): Promise<Report>;
  getReportsByScanId(scanId: string): Promise<Report[]>;
  
  // Remediation Templates
  createTemplate(template: InsertRemediationTemplate): Promise<RemediationTemplate>;
  getTemplates(): Promise<RemediationTemplate[]>;
  getTemplatesByCategory(category: string): Promise<RemediationTemplate[]>;
}

export class MemStorage implements IStorage {
  private scans: Map<string, ComplianceScan>;
  private issues: Map<string, ComplianceIssue>;
  private reports: Map<string, Report>;
  private templates: Map<string, RemediationTemplate>;

  constructor() {
    this.scans = new Map();
    this.issues = new Map();
    this.reports = new Map();
    this.templates = new Map();
    
    // Initialize with some default remediation templates
    this.initializeTemplates();
  }

  // Compliance Scans
  async createScan(insertScan: InsertComplianceScan): Promise<ComplianceScan> {
    const id = randomUUID();
    const scan: ComplianceScan = {
      id,
      ...insertScan,
      status: "pending",
      scanDate: new Date(),
      completedAt: null,
      overallScore: null,
      issuesCount: 0,
      criticalCount: 0,
      warningCount: 0,
      suggestionCount: 0,
      pageContent: null,
      analysisResult: null,
    };
    this.scans.set(id, scan);
    return scan;
  }

  async getScan(id: string): Promise<ComplianceScan | undefined> {
    return this.scans.get(id);
  }

  async updateScan(id: string, updates: Partial<ComplianceScan>): Promise<ComplianceScan | undefined> {
    const scan = this.scans.get(id);
    if (!scan) return undefined;
    
    const updatedScan = { ...scan, ...updates };
    this.scans.set(id, updatedScan);
    return updatedScan;
  }

  async getAllScans(): Promise<ComplianceScan[]> {
    return Array.from(this.scans.values()).sort((a, b) => {
      return (b.scanDate?.getTime() || 0) - (a.scanDate?.getTime() || 0);
    });
  }

  // Compliance Issues
  async createIssue(insertIssue: InsertComplianceIssue): Promise<ComplianceIssue> {
    const id = randomUUID();
    const issue: ComplianceIssue = {
      id,
      ...insertIssue,
    };
    this.issues.set(id, issue);
    return issue;
  }

  async getIssuesByScanId(scanId: string): Promise<ComplianceIssue[]> {
    return Array.from(this.issues.values()).filter(
      (issue) => issue.scanId === scanId
    );
  }

  async deleteIssuesByScanId(scanId: string): Promise<void> {
    const issuesToDelete = Array.from(this.issues.entries())
      .filter(([_, issue]) => issue.scanId === scanId)
      .map(([id]) => id);
    
    issuesToDelete.forEach(id => this.issues.delete(id));
  }

  // Reports
  async createReport(insertReport: InsertReport): Promise<Report> {
    const id = randomUUID();
    const report: Report = {
      id,
      ...insertReport,
      generatedAt: new Date(),
      content: null,
      fileName: null,
    };
    this.reports.set(id, report);
    return report;
  }

  async getReportsByScanId(scanId: string): Promise<Report[]> {
    return Array.from(this.reports.values()).filter(
      (report) => report.scanId === scanId
    );
  }

  // Remediation Templates
  async createTemplate(insertTemplate: InsertRemediationTemplate): Promise<RemediationTemplate> {
    const id = randomUUID();
    const template: RemediationTemplate = {
      id,
      ...insertTemplate,
    };
    this.templates.set(id, template);
    return template;
  }

  async getTemplates(): Promise<RemediationTemplate[]> {
    return Array.from(this.templates.values());
  }

  async getTemplatesByCategory(category: string): Promise<RemediationTemplate[]> {
    return Array.from(this.templates.values()).filter(
      (template) => template.category === category
    );
  }

  private initializeTemplates() {
    const defaultTemplates: Omit<RemediationTemplate, 'id'>[] = [
      {
        category: "privacy_policy",
        issue: "missing_privacy_policy",
        arabicTitle: "سياسة الخصوصية مفقودة",
        arabicDescription: "الموقع لا يحتوي على سياسة خصوصية واضحة",
        remediation: "يجب إضافة صفحة سياسة خصوصية شاملة توضح كيفية جمع واستخدام وحماية البيانات الشخصية",
        exampleCode: null,
        regulations: ["المادة الثالثة عشرة", "المادة الرابعة عشرة"],
      },
      {
        category: "consent",
        issue: "no_consent_mechanism",
        arabicTitle: "آلية الموافقة غير موجودة",
        arabicDescription: "لا توجد آلية واضحة للحصول على موافقة المستخدم",
        remediation: "إضافة نموذج موافقة صريحة قبل جمع أي بيانات شخصية من المستخدم",
        exampleCode: null,
        regulations: ["المادة السادسة", "المادة السابعة"],
      },
      {
        category: "data_collection",
        issue: "excessive_data_collection",
        arabicTitle: "جمع بيانات مفرط",
        arabicDescription: "الموقع يجمع بيانات أكثر من اللازم",
        remediation: "تطبيق مبدأ تقليل البيانات وجمع الحد الأدنى الضروري فقط",
        exampleCode: null,
        regulations: ["المادة الخامسة"],
      },
      {
        category: "security",
        issue: "no_https",
        arabicTitle: "عدم استخدام HTTPS",
        arabicDescription: "الموقع لا يستخدم بروتوكول HTTPS الآمن",
        remediation: "تفعيل شهادة SSL وإجبار استخدام HTTPS في جميع الصفحات",
        exampleCode: null,
        regulations: ["المادة التاسعة عشرة"],
      },
      {
        category: "user_rights",
        issue: "no_data_access_mechanism",
        arabicTitle: "عدم توفير آلية للوصول للبيانات",
        arabicDescription: "المستخدمون لا يستطيعون الوصول إلى بياناتهم الشخصية",
        remediation: "توفير آلية واضحة تمكن المستخدمين من طلب الوصول إلى بياناتهم الشخصية",
        exampleCode: null,
        regulations: ["المادة الحادية عشرة"],
      }
    ];

    defaultTemplates.forEach((template) => {
      const id = randomUUID();
      this.templates.set(id, { id, ...template });
    });
  }
}

export const storage = new MemStorage();
