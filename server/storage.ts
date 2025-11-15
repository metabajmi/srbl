import { 
  type ComplianceScan, 
  type InsertComplianceScan,
  type ComplianceIssue,
  type InsertComplianceIssue,
  type Report,
  type InsertReport,
  type RemediationTemplate,
  type InsertRemediationTemplate,
  type PolicyDocument,
  type InsertPolicyDocument,
  type ConsentRecord,
  type InsertConsentRecord,
  type TermsDocument,
  type InsertTermsDocument,
  type ComplianceTask,
  type InsertComplianceTask,
  type CmpSettings,
  type InsertCmpSettings,
  type CmpScript,
  type InsertCmpScript,
  type RopaEntry,
  type InsertRopaEntry,
  type DsarRequest,
  type InsertDsarRequest,
  type DpiaAssessment,
  type InsertDpiaAssessment,
  type LegalSource,
  type InsertLegalSource,
  type TermsTemplate,
  type InsertTermsTemplate,
  type TemplateSection,
  type InsertTemplateSection,
  complianceScans,
  complianceIssues,
  reports,
  remediationTemplates,
  policyDocuments,
  consentRecords,
  termsDocuments,
  complianceTasks,
  cmpSettings,
  cmpScripts,
  ropaEntries,
  dsarRequests,
  dpiaAssessments,
  legalSources,
  termsTemplates,
  templateSections
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

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
  
  // Policy Documents
  createPolicyDocument(policy: InsertPolicyDocument): Promise<PolicyDocument>;
  getPolicyDocument(id: string): Promise<PolicyDocument | undefined>;
  updatePolicyDocument(id: string, updates: Partial<PolicyDocument>): Promise<PolicyDocument | undefined>;
  getAllPolicyDocuments(): Promise<PolicyDocument[]>;
  
  // Consent Records
  createConsentRecord(consent: InsertConsentRecord): Promise<ConsentRecord>;
  getConsentRecord(id: string): Promise<ConsentRecord | undefined>;
  getConsentRecordsByUserId(userId: string): Promise<ConsentRecord[]>;
  getAllConsentRecords(): Promise<ConsentRecord[]>;
  updateConsentRecord(id: string, updates: Partial<ConsentRecord>): Promise<ConsentRecord | undefined>;
  
  // Terms Documents
  createTermsDocument(terms: InsertTermsDocument): Promise<TermsDocument>;
  getTermsDocument(id: string): Promise<TermsDocument | undefined>;
  updateTermsDocument(id: string, updates: Partial<TermsDocument>): Promise<TermsDocument | undefined>;
  getAllTermsDocuments(): Promise<TermsDocument[]>;
  
  // Compliance Tasks
  createComplianceTask(task: InsertComplianceTask): Promise<ComplianceTask>;
  getComplianceTask(id: string): Promise<ComplianceTask | undefined>;
  updateComplianceTask(id: string, updates: Partial<ComplianceTask>): Promise<ComplianceTask | undefined>;
  getAllComplianceTasks(): Promise<ComplianceTask[]>;
  deleteComplianceTask(id: string): Promise<void>;
  
  // CMP Settings
  getCmpSettings(): Promise<CmpSettings | undefined>;
  updateCmpSettings(updates: Partial<CmpSettings>): Promise<CmpSettings | undefined>;
  createDefaultCmpSettings(): Promise<CmpSettings>;
  
  // CMP Scripts
  createCmpScript(script: InsertCmpScript): Promise<CmpScript>;
  getCmpScript(id: string): Promise<CmpScript | undefined>;
  updateCmpScript(id: string, updates: Partial<CmpScript>): Promise<CmpScript | undefined>;
  getAllCmpScripts(): Promise<CmpScript[]>;
  deleteCmpScript(id: string): Promise<void>;
  getCmpScriptsByCategory(category: string): Promise<CmpScript[]>;
  
  // Consent Records (Extended)
  getConsentRecordsByAnonymousId(anonymousId: string): Promise<ConsentRecord[]>;
  withdrawConsent(id: string, reason?: string): Promise<ConsentRecord | undefined>;
  
  // ROPA Entries - سجل أنشطة المعالجة
  createRopaEntry(entry: InsertRopaEntry): Promise<RopaEntry>;
  getRopaEntry(id: string): Promise<RopaEntry | undefined>;
  updateRopaEntry(id: string, updates: Partial<RopaEntry>): Promise<RopaEntry | undefined>;
  getAllRopaEntries(): Promise<RopaEntry[]>;
  deleteRopaEntry(id: string): Promise<void>;
  
  // DSAR Requests - طلبات أصحاب البيانات
  createDsarRequest(request: InsertDsarRequest): Promise<DsarRequest>;
  getDsarRequest(id: string): Promise<DsarRequest | undefined>;
  updateDsarRequest(id: string, updates: Partial<DsarRequest>): Promise<DsarRequest | undefined>;
  getAllDsarRequests(): Promise<DsarRequest[]>;
  deleteDsarRequest(id: string): Promise<void>;
  getDsarRequestsByStatus(status: string): Promise<DsarRequest[]>;
  
  // DPIA Assessments - تقييم تأثير حماية البيانات
  createDpiaAssessment(assessment: InsertDpiaAssessment): Promise<DpiaAssessment>;
  getDpiaAssessment(id: string): Promise<DpiaAssessment | undefined>;
  updateDpiaAssessment(id: string, updates: Partial<DpiaAssessment>): Promise<DpiaAssessment | undefined>;
  getAllDpiaAssessments(): Promise<DpiaAssessment[]>;
  deleteDpiaAssessment(id: string): Promise<void>;
  getDpiaAssessmentsByStatus(status: string): Promise<DpiaAssessment[]>;
  
  // Legal Sources - المصادر القانونية
  createLegalSource(source: InsertLegalSource): Promise<LegalSource>;
  getLegalSource(id: string): Promise<LegalSource | undefined>;
  getLegalSourceByCode(code: string): Promise<LegalSource | undefined>;
  getAllLegalSources(): Promise<LegalSource[]>;
  updateLegalSource(id: string, updates: Partial<LegalSource>): Promise<LegalSource | undefined>;
  
  // Terms Templates - قوالب الشروط والأحكام
  createTermsTemplate(template: InsertTermsTemplate): Promise<TermsTemplate>;
  getTermsTemplate(id: string): Promise<TermsTemplate | undefined>;
  getAllTermsTemplates(): Promise<TermsTemplate[]>;
  getTermsTemplatesByBusinessType(businessType: string, activityScale?: string): Promise<TermsTemplate[]>;
  updateTermsTemplate(id: string, updates: Partial<TermsTemplate>): Promise<TermsTemplate | undefined>;
  
  // Template Sections - أقسام القوالب
  createTemplateSection(section: InsertTemplateSection): Promise<TemplateSection>;
  getTemplateSection(id: string): Promise<TemplateSection | undefined>;
  getTemplateSectionsByTemplateId(templateId: string): Promise<TemplateSection[]>;
  updateTemplateSection(id: string, updates: Partial<TemplateSection>): Promise<TemplateSection | undefined>;
  deleteTemplateSection(id: string): Promise<void>;
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

  // Policy Documents
  async createPolicyDocument(insertPolicy: InsertPolicyDocument): Promise<PolicyDocument> {
    const [policy] = await db
      .insert(policyDocuments)
      .values(insertPolicy)
      .returning();
    return policy;
  }

  async getPolicyDocument(id: string): Promise<PolicyDocument | undefined> {
    const [policy] = await db
      .select()
      .from(policyDocuments)
      .where(eq(policyDocuments.id, id));
    return policy || undefined;
  }

  async updatePolicyDocument(id: string, updates: Partial<PolicyDocument>): Promise<PolicyDocument | undefined> {
    const { id: _, ...updateData } = updates;
    const [updatedPolicy] = await db
      .update(policyDocuments)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(policyDocuments.id, id))
      .returning();
    return updatedPolicy || undefined;
  }

  async getAllPolicyDocuments(): Promise<PolicyDocument[]> {
    const policies = await db
      .select()
      .from(policyDocuments)
      .orderBy(desc(policyDocuments.createdAt));
    return policies;
  }

  // Consent Records
  async createConsentRecord(insertConsent: InsertConsentRecord): Promise<ConsentRecord> {
    const [consent] = await db
      .insert(consentRecords)
      .values(insertConsent)
      .returning();
    return consent;
  }

  async getConsentRecord(id: string): Promise<ConsentRecord | undefined> {
    const [consent] = await db
      .select()
      .from(consentRecords)
      .where(eq(consentRecords.id, id));
    return consent || undefined;
  }

  async getConsentRecordsByUserId(userId: string): Promise<ConsentRecord[]> {
    const consents = await db
      .select()
      .from(consentRecords)
      .where(eq(consentRecords.userId, userId))
      .orderBy(desc(consentRecords.consentDate));
    return consents;
  }

  async getAllConsentRecords(): Promise<ConsentRecord[]> {
    const consents = await db
      .select()
      .from(consentRecords)
      .orderBy(desc(consentRecords.consentDate));
    return consents;
  }

  async updateConsentRecord(id: string, updates: Partial<ConsentRecord>): Promise<ConsentRecord | undefined> {
    const { id: _, ...updateData } = updates;
    const [updatedConsent] = await db
      .update(consentRecords)
      .set(updateData)
      .where(eq(consentRecords.id, id))
      .returning();
    return updatedConsent || undefined;
  }

  // Terms Documents
  async createTermsDocument(insertTerms: InsertTermsDocument): Promise<TermsDocument> {
    const [terms] = await db
      .insert(termsDocuments)
      .values(insertTerms)
      .returning();
    return terms;
  }

  async getTermsDocument(id: string): Promise<TermsDocument | undefined> {
    const [terms] = await db
      .select()
      .from(termsDocuments)
      .where(eq(termsDocuments.id, id));
    return terms || undefined;
  }

  async updateTermsDocument(id: string, updates: Partial<TermsDocument>): Promise<TermsDocument | undefined> {
    const { id: _, ...updateData } = updates;
    const [updatedTerms] = await db
      .update(termsDocuments)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(termsDocuments.id, id))
      .returning();
    return updatedTerms || undefined;
  }

  async getAllTermsDocuments(): Promise<TermsDocument[]> {
    const termsList = await db
      .select()
      .from(termsDocuments)
      .orderBy(desc(termsDocuments.createdAt));
    return termsList;
  }

  // Compliance Tasks
  async createComplianceTask(insertTask: InsertComplianceTask): Promise<ComplianceTask> {
    const [task] = await db
      .insert(complianceTasks)
      .values(insertTask)
      .returning();
    return task;
  }

  async getComplianceTask(id: string): Promise<ComplianceTask | undefined> {
    const [task] = await db
      .select()
      .from(complianceTasks)
      .where(eq(complianceTasks.id, id));
    return task || undefined;
  }

  async updateComplianceTask(id: string, updates: Partial<ComplianceTask>): Promise<ComplianceTask | undefined> {
    const { id: _, ...updateData } = updates;
    const [updatedTask] = await db
      .update(complianceTasks)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(complianceTasks.id, id))
      .returning();
    return updatedTask || undefined;
  }

  async getAllComplianceTasks(): Promise<ComplianceTask[]> {
    const tasks = await db
      .select()
      .from(complianceTasks)
      .orderBy(desc(complianceTasks.createdAt));
    return tasks;
  }

  async deleteComplianceTask(id: string): Promise<void> {
    await db
      .delete(complianceTasks)
      .where(eq(complianceTasks.id, id));
  }

  // CMP Settings
  async getCmpSettings(): Promise<CmpSettings | undefined> {
    const [settings] = await db
      .select()
      .from(cmpSettings)
      .limit(1);
    return settings || undefined;
  }

  async updateCmpSettings(updates: Partial<CmpSettings>): Promise<CmpSettings | undefined> {
    const { id, ...updateData } = updates;
    const existing = await this.getCmpSettings();
    
    if (!existing) {
      return await this.createDefaultCmpSettings();
    }

    const [updatedSettings] = await db
      .update(cmpSettings)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(cmpSettings.id, existing.id))
      .returning();
    return updatedSettings || undefined;
  }

  async createDefaultCmpSettings(): Promise<CmpSettings> {
    const [settings] = await db
      .insert(cmpSettings)
      .values({})
      .returning();
    return settings;
  }

  // CMP Scripts
  async createCmpScript(insertScript: InsertCmpScript): Promise<CmpScript> {
    const [script] = await db
      .insert(cmpScripts)
      .values(insertScript)
      .returning();
    return script;
  }

  async getCmpScript(id: string): Promise<CmpScript | undefined> {
    const [script] = await db
      .select()
      .from(cmpScripts)
      .where(eq(cmpScripts.id, id));
    return script || undefined;
  }

  async updateCmpScript(id: string, updates: Partial<CmpScript>): Promise<CmpScript | undefined> {
    const { id: _, ...updateData } = updates;
    const [updatedScript] = await db
      .update(cmpScripts)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(cmpScripts.id, id))
      .returning();
    return updatedScript || undefined;
  }

  async getAllCmpScripts(): Promise<CmpScript[]> {
    const scripts = await db
      .select()
      .from(cmpScripts)
      .orderBy(desc(cmpScripts.createdAt));
    return scripts;
  }

  async deleteCmpScript(id: string): Promise<void> {
    await db
      .delete(cmpScripts)
      .where(eq(cmpScripts.id, id));
  }

  async getCmpScriptsByCategory(category: string): Promise<CmpScript[]> {
    const scripts = await db
      .select()
      .from(cmpScripts)
      .where(eq(cmpScripts.category, category))
      .orderBy(desc(cmpScripts.createdAt));
    return scripts;
  }

  // Consent Records (Extended)
  async getConsentRecordsByAnonymousId(anonymousId: string): Promise<ConsentRecord[]> {
    const consents = await db
      .select()
      .from(consentRecords)
      .where(eq(consentRecords.anonymousId, anonymousId))
      .orderBy(desc(consentRecords.consentDate));
    return consents;
  }

  async withdrawConsent(id: string, reason?: string): Promise<ConsentRecord | undefined> {
    const [updatedConsent] = await db
      .update(consentRecords)
      .set({
        withdrawnAt: new Date(),
        withdrawalReason: reason || null,
        updatedAt: new Date(),
      })
      .where(eq(consentRecords.id, id))
      .returning();
    return updatedConsent || undefined;
  }

  // ====================================
  // Internal Compliance Management Module
  // وحدة الامتثال الداخلي
  // ====================================

  // ROPA Entries - سجل أنشطة المعالجة
  async createRopaEntry(entry: InsertRopaEntry): Promise<RopaEntry> {
    const [ropaEntry] = await db
      .insert(ropaEntries)
      .values(entry)
      .returning();
    return ropaEntry;
  }

  async getRopaEntry(id: string): Promise<RopaEntry | undefined> {
    const [entry] = await db
      .select()
      .from(ropaEntries)
      .where(eq(ropaEntries.id, id));
    return entry || undefined;
  }

  async updateRopaEntry(id: string, updates: Partial<RopaEntry>): Promise<RopaEntry | undefined> {
    const { id: _, createdAt, ...updateFields } = updates as any;
    const [updatedEntry] = await db
      .update(ropaEntries)
      .set({
        ...updateFields,
        updatedAt: new Date(),
      })
      .where(eq(ropaEntries.id, id))
      .returning();
    return updatedEntry || undefined;
  }

  async getAllRopaEntries(): Promise<RopaEntry[]> {
    const entries = await db
      .select()
      .from(ropaEntries)
      .orderBy(desc(ropaEntries.createdAt));
    return entries;
  }

  async deleteRopaEntry(id: string): Promise<void> {
    await db.delete(ropaEntries).where(eq(ropaEntries.id, id));
  }

  // DSAR Requests - طلبات أصحاب البيانات
  async createDsarRequest(request: InsertDsarRequest): Promise<DsarRequest> {
    const [dsarRequest] = await db
      .insert(dsarRequests)
      .values(request)
      .returning();
    return dsarRequest;
  }

  async getDsarRequest(id: string): Promise<DsarRequest | undefined> {
    const [request] = await db
      .select()
      .from(dsarRequests)
      .where(eq(dsarRequests.id, id));
    return request || undefined;
  }

  async updateDsarRequest(id: string, updates: Partial<DsarRequest>): Promise<DsarRequest | undefined> {
    const { id: _, submittedAt, createdAt, ...updateFields } = updates as any;
    const [updatedRequest] = await db
      .update(dsarRequests)
      .set({
        ...updateFields,
        updatedAt: new Date(),
      })
      .where(eq(dsarRequests.id, id))
      .returning();
    return updatedRequest || undefined;
  }

  async getAllDsarRequests(): Promise<DsarRequest[]> {
    const requests = await db
      .select()
      .from(dsarRequests)
      .orderBy(desc(dsarRequests.submittedAt));
    return requests;
  }

  async deleteDsarRequest(id: string): Promise<void> {
    await db.delete(dsarRequests).where(eq(dsarRequests.id, id));
  }

  async getDsarRequestsByStatus(status: string): Promise<DsarRequest[]> {
    const requests = await db
      .select()
      .from(dsarRequests)
      .where(eq(dsarRequests.status, status))
      .orderBy(desc(dsarRequests.submittedAt));
    return requests;
  }

  // DPIA Assessments - تقييم تأثير حماية البيانات
  async createDpiaAssessment(assessment: InsertDpiaAssessment): Promise<DpiaAssessment> {
    const [dpiaAssessment] = await db
      .insert(dpiaAssessments)
      .values(assessment)
      .returning();
    return dpiaAssessment;
  }

  async getDpiaAssessment(id: string): Promise<DpiaAssessment | undefined> {
    const [assessment] = await db
      .select()
      .from(dpiaAssessments)
      .where(eq(dpiaAssessments.id, id));
    return assessment || undefined;
  }

  async updateDpiaAssessment(id: string, updates: Partial<DpiaAssessment>): Promise<DpiaAssessment | undefined> {
    const { id: _, createdAt, ...updateFields } = updates as any;
    const [updatedAssessment] = await db
      .update(dpiaAssessments)
      .set({
        ...updateFields,
        updatedAt: new Date(),
      })
      .where(eq(dpiaAssessments.id, id))
      .returning();
    return updatedAssessment || undefined;
  }

  async getAllDpiaAssessments(): Promise<DpiaAssessment[]> {
    const assessments = await db
      .select()
      .from(dpiaAssessments)
      .orderBy(desc(dpiaAssessments.createdAt));
    return assessments;
  }

  async deleteDpiaAssessment(id: string): Promise<void> {
    await db.delete(dpiaAssessments).where(eq(dpiaAssessments.id, id));
  }

  async getDpiaAssessmentsByStatus(status: string): Promise<DpiaAssessment[]> {
    const assessments = await db
      .select()
      .from(dpiaAssessments)
      .where(eq(dpiaAssessments.status, status))
      .orderBy(desc(dpiaAssessments.createdAt));
    return assessments;
  }

  // ====================================
  // Legal Sources - المصادر القانونية
  // ====================================

  async createLegalSource(insertSource: InsertLegalSource): Promise<LegalSource> {
    const [source] = await db
      .insert(legalSources)
      .values(insertSource)
      .returning();
    return source;
  }

  async getLegalSource(id: string): Promise<LegalSource | undefined> {
    const [source] = await db
      .select()
      .from(legalSources)
      .where(eq(legalSources.id, id));
    return source || undefined;
  }

  async getLegalSourceByCode(code: string): Promise<LegalSource | undefined> {
    const [source] = await db
      .select()
      .from(legalSources)
      .where(eq(legalSources.code, code));
    return source || undefined;
  }

  async getAllLegalSources(): Promise<LegalSource[]> {
    const sources = await db
      .select()
      .from(legalSources)
      .orderBy(desc(legalSources.createdAt));
    return sources;
  }

  async updateLegalSource(id: string, updates: Partial<LegalSource>): Promise<LegalSource | undefined> {
    const { id: _, createdAt, ...updateFields } = updates as any;
    const [updatedSource] = await db
      .update(legalSources)
      .set({
        ...updateFields,
        updatedAt: new Date(),
      })
      .where(eq(legalSources.id, id))
      .returning();
    return updatedSource || undefined;
  }

  // ====================================
  // Terms Templates - قوالب الشروط والأحكام
  // ====================================

  async createTermsTemplate(insertTemplate: InsertTermsTemplate): Promise<TermsTemplate> {
    const [template] = await db
      .insert(termsTemplates)
      .values(insertTemplate)
      .returning();
    return template;
  }

  async getTermsTemplate(id: string): Promise<TermsTemplate | undefined> {
    const [template] = await db
      .select()
      .from(termsTemplates)
      .where(eq(termsTemplates.id, id));
    return template || undefined;
  }

  async getAllTermsTemplates(): Promise<TermsTemplate[]> {
    const templates = await db
      .select()
      .from(termsTemplates)
      .orderBy(desc(termsTemplates.createdAt));
    return templates;
  }

  async getTermsTemplatesByBusinessType(businessType: string, activityScale?: string): Promise<TermsTemplate[]> {
    const conditions = [eq(termsTemplates.businessType, businessType)];
    
    if (activityScale) {
      conditions.push(eq(termsTemplates.activityScale, activityScale));
    }
    
    const templates = await db
      .select()
      .from(termsTemplates)
      .where(and(...conditions))
      .orderBy(desc(termsTemplates.createdAt));
    
    return templates;
  }

  async updateTermsTemplate(id: string, updates: Partial<TermsTemplate>): Promise<TermsTemplate | undefined> {
    const { id: _, createdAt, ...updateFields } = updates as any;
    const [updatedTemplate] = await db
      .update(termsTemplates)
      .set({
        ...updateFields,
        updatedAt: new Date(),
      })
      .where(eq(termsTemplates.id, id))
      .returning();
    return updatedTemplate || undefined;
  }

  // ====================================
  // Template Sections - أقسام القوالب
  // ====================================

  async createTemplateSection(insertSection: InsertTemplateSection): Promise<TemplateSection> {
    const [section] = await db
      .insert(templateSections)
      .values(insertSection)
      .returning();
    return section;
  }

  async getTemplateSection(id: string): Promise<TemplateSection | undefined> {
    const [section] = await db
      .select()
      .from(templateSections)
      .where(eq(templateSections.id, id));
    return section || undefined;
  }

  async getTemplateSectionsByTemplateId(templateId: string): Promise<TemplateSection[]> {
    const sections = await db
      .select()
      .from(templateSections)
      .where(eq(templateSections.templateId, templateId))
      .orderBy(templateSections.ordering);
    return sections;
  }

  async updateTemplateSection(id: string, updates: Partial<TemplateSection>): Promise<TemplateSection | undefined> {
    const { id: _, createdAt, ...updateFields } = updates as any;
    const [updatedSection] = await db
      .update(templateSections)
      .set({
        ...updateFields,
        updatedAt: new Date(),
      })
      .where(eq(templateSections.id, id))
      .returning();
    return updatedSection || undefined;
  }

  async deleteTemplateSection(id: string): Promise<void> {
    await db.delete(templateSections).where(eq(templateSections.id, id));
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