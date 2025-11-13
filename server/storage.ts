import { 
  type ComplianceScan, 
  type InsertComplianceScan,
  type ComplianceIssue,
  type InsertComplianceIssue,
  type Report,
  type InsertReport,
  type RemediationTemplate,
  type InsertRemediationTemplate,
  complianceScans,
  complianceIssues,
  reports,
  remediationTemplates
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

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
  createReport(report: InsertReport & { content?: any; fileName?: string }): Promise<Report>;
  getReport(id: string): Promise<Report | undefined>;
  getReportsByScanId(scanId: string): Promise<Report[]>;
  
  // Remediation Templates
  createTemplate(template: InsertRemediationTemplate): Promise<RemediationTemplate>;
  getTemplates(): Promise<RemediationTemplate[]>;
  getTemplatesByCategory(category: string): Promise<RemediationTemplate[]>;
}

// Database storage implementation using Drizzle ORM
export class DatabaseStorage implements IStorage {
  constructor() {
    // Ensure default templates are created on startup
    this.ensureDefaultTemplates();
  }

  // Compliance Scans
  async createScan(insertScan: InsertComplianceScan): Promise<ComplianceScan> {
    const [scan] = await db
      .insert(complianceScans)
      .values({
        ...insertScan,
        status: "pending",
        issuesCount: 0,
        criticalCount: 0,
        warningCount: 0,
        suggestionCount: 0,
      })
      .returning();
    return scan;
  }

  async getScan(id: string): Promise<ComplianceScan | undefined> {
    const [scan] = await db
      .select()
      .from(complianceScans)
      .where(eq(complianceScans.id, id));
    return scan || undefined;
  }

  async updateScan(id: string, updates: Partial<ComplianceScan>): Promise<ComplianceScan | undefined> {
    // Remove id from updates if present
    const { id: _, ...updateData } = updates;
    
    const [updatedScan] = await db
      .update(complianceScans)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(complianceScans.id, id))
      .returning();
    return updatedScan || undefined;
  }

  async getAllScans(): Promise<ComplianceScan[]> {
    const scans = await db
      .select()
      .from(complianceScans)
      .orderBy(desc(complianceScans.scanDate));
    return scans;
  }

  // Compliance Issues
  async createIssue(insertIssue: InsertComplianceIssue): Promise<ComplianceIssue> {
    const [issue] = await db
      .insert(complianceIssues)
      .values(insertIssue)
      .returning();
    return issue;
  }

  async getIssuesByScanId(scanId: string): Promise<ComplianceIssue[]> {
    const issues = await db
      .select()
      .from(complianceIssues)
      .where(eq(complianceIssues.scanId, scanId));
    return issues;
  }

  async deleteIssuesByScanId(scanId: string): Promise<void> {
    await db
      .delete(complianceIssues)
      .where(eq(complianceIssues.scanId, scanId));
  }

  // Reports
  async createReport(insertReport: InsertReport & { content?: any; fileName?: string }): Promise<Report> {
    const [report] = await db
      .insert(reports)
      .values({
        scanId: insertReport.scanId,
        format: insertReport.format,
        content: insertReport.content || null,
        fileName: insertReport.fileName || null,
      })
      .returning();
    return report;
  }

  async getReport(id: string): Promise<Report | undefined> {
    const [report] = await db
      .select()
      .from(reports)
      .where(eq(reports.id, id));
    return report || undefined;
  }

  async getReportsByScanId(scanId: string): Promise<Report[]> {
    const reportsList = await db
      .select()
      .from(reports)
      .where(eq(reports.scanId, scanId))
      .orderBy(desc(reports.generatedAt));
    return reportsList;
  }

  // Remediation Templates
  async createTemplate(insertTemplate: InsertRemediationTemplate): Promise<RemediationTemplate> {
    const [template] = await db
      .insert(remediationTemplates)
      .values(insertTemplate)
      .returning();
    return template;
  }

  async getTemplates(): Promise<RemediationTemplate[]> {
    const templates = await db
      .select()
      .from(remediationTemplates);
    return templates;
  }

  async getTemplatesByCategory(category: string): Promise<RemediationTemplate[]> {
    const templates = await db
      .select()
      .from(remediationTemplates)
      .where(eq(remediationTemplates.category, category));
    return templates;
  }

  // Initialize default remediation templates if they don't exist
  private async ensureDefaultTemplates() {
    try {
      const existingTemplates = await this.getTemplates();
      if (existingTemplates.length === 0) {
        const defaultTemplates: InsertRemediationTemplate[] = [
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

        for (const template of defaultTemplates) {
          await this.createTemplate(template);
        }
        console.log("Default remediation templates created successfully");
      }
    } catch (error) {
      console.error("Error ensuring default templates:", error);
    }
  }
}

// Export singleton instance
export const storage = new DatabaseStorage();