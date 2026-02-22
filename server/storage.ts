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
  type PolicyGenerationRequest,
  type InsertPolicyGenerationRequest,
  type Payment,
  type InsertPayment,
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
  type KnowledgeArticle,
  type InsertKnowledgeArticle,
  type ChatConversation,
  type InsertChatConversation,
  type ChatMessage,
  type InsertChatMessage,
  type User,
  type InsertUser,
  type ClientPolicy,
  type InsertClientPolicy,
  type ClientRequest,
  type InsertClientRequest,
  type AdminUser,
  type InsertAdminUser,
  type AuditLog,
  type InsertAuditLog,
  type OtpToken,
  type InsertOtpToken,
  complianceScans,
  complianceIssues,
  reports,
  remediationTemplates,
  policyDocuments,
  policyGenerationRequests,
  payments,
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
  templateSections,
  termsTemplateSections,
  sectionLegalSources,
  knowledgeArticles,
  chatConversations,
  chatMessages,
  users,
  clientPolicies,
  clientRequests,
  adminUsers,
  auditLogs,
  otpTokens,
  type DiscountCode,
  type InsertDiscountCode,
  discountCodes
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql as drizzleSql } from "drizzle-orm";

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
  // Client-only: get current published policy
  getCurrentPublishedPolicy(): Promise<PolicyDocument | undefined>;
  getPublishedPolicies(): Promise<PolicyDocument[]>;
  // Admin-only: publish/archive policies
  publishPolicy(id: string): Promise<PolicyDocument | undefined>;
  archivePolicy(id: string): Promise<PolicyDocument | undefined>;
  
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
  
  // AI Assistant - Knowledge Base
  createKnowledgeArticle(article: InsertKnowledgeArticle): Promise<KnowledgeArticle>;
  getKnowledgeArticle(id: string): Promise<KnowledgeArticle | undefined>;
  getAllKnowledgeArticles(): Promise<KnowledgeArticle[]>;
  updateKnowledgeArticle(id: string, updates: Partial<KnowledgeArticle>): Promise<KnowledgeArticle | undefined>;
  updateArticleEmbedding(id: string, embedding: number[], embeddingEn?: number[]): Promise<void>;
  searchKnowledgeByVector(embedding: number[], language: string, limit?: number): Promise<Array<KnowledgeArticle & { similarity: number }>>;
  incrementArticleView(id: string): Promise<void>;
  updateArticleFeedback(id: string, helpful: boolean): Promise<void>;
  
  // AI Assistant - Conversations
  createChatConversation(conversation: InsertChatConversation): Promise<ChatConversation>;
  getChatConversation(id: string): Promise<ChatConversation | undefined>;
  getAllChatConversations(): Promise<ChatConversation[]>;
  updateChatConversation(id: string, updates: Partial<ChatConversation>): Promise<ChatConversation | undefined>;
  deleteChatConversation(id: string): Promise<void>;
  
  // AI Assistant - Messages
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getChatMessage(id: string): Promise<ChatMessage | undefined>;
  getMessagesByConversationId(conversationId: string): Promise<ChatMessage[]>;
  updateChatMessage(id: string, updates: Partial<ChatMessage>): Promise<ChatMessage | undefined>;
  
  // Client Management - إدارة العملاء
  createUser(user: InsertUser): Promise<User>;
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  deleteUser(id: string): Promise<void>;
  createOrGetUserByEmail(email: string, name?: string): Promise<User>;
  
  // OTP Tokens - رموز التحقق
  createOtpToken(email: string, codeHash: string, expiresAt: Date): Promise<OtpToken>;
  getLatestOtpByEmail(email: string): Promise<OtpToken | undefined>;
  markOtpVerified(id: string): Promise<void>;
  incrementOtpAttempt(id: string): Promise<void>;
  deleteExpiredOtpTokens(): Promise<void>;
  
  // Client Policies - سياسات العملاء
  createClientPolicy(policy: InsertClientPolicy): Promise<ClientPolicy>;
  getClientPolicy(id: string): Promise<ClientPolicy | undefined>;
  getClientPoliciesByUserId(userId: string): Promise<ClientPolicy[]>;
  updateClientPolicy(id: string, updates: Partial<ClientPolicy>): Promise<ClientPolicy | undefined>;
  deleteClientPolicy(id: string): Promise<void>;
  
  // Client Requests - طلبات العملاء
  createClientRequest(request: InsertClientRequest): Promise<ClientRequest>;
  getClientRequest(id: string): Promise<ClientRequest | undefined>;
  getClientRequestsByUserId(userId: string): Promise<ClientRequest[]>;
  updateClientRequest(id: string, updates: Partial<ClientRequest>): Promise<ClientRequest | undefined>;
  deleteClientRequest(id: string): Promise<void>;
  generateRequestNumber(): Promise<string>;
  getAllClientRequests(): Promise<ClientRequest[]>;
  
  // Admin Users - المستخدمون الإداريون
  createAdminUser(admin: InsertAdminUser): Promise<AdminUser>;
  getAdminUser(id: string): Promise<AdminUser | undefined>;
  getAdminUserByEmail(email: string): Promise<AdminUser | undefined>;
  updateAdminUser(id: string, updates: Partial<AdminUser>): Promise<AdminUser | undefined>;
  deleteAdminUser(id: string): Promise<void>;
  getAllAdminUsers(): Promise<AdminUser[]>;
  updateAdminLastLogin(id: string): Promise<void>;
  
  // Audit Logs - سجل التدقيق
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLog(id: string): Promise<AuditLog | undefined>;
  getAllAuditLogs(): Promise<AuditLog[]>;
  getAuditLogsByAdminUser(adminUserId: string): Promise<AuditLog[]>;
  getAuditLogsByEntity(entityType: string, entityId: string): Promise<AuditLog[]>;
  
  // Admin Statistics - إحصائيات إدارية
  getAllUsers(): Promise<User[]>;
  getAllClientPolicies(): Promise<ClientPolicy[]>;
  getAdminStats(): Promise<{
    totalUsers: number;
    totalPolicies: number;
    totalRequests: number;
    pendingRequests: number;
    activeAdmins: number;
  }>;
  
  // Policy Generation Requests - طلبات توليد السياسات
  createPolicyGenerationRequest(request: InsertPolicyGenerationRequest): Promise<PolicyGenerationRequest>;
  getPolicyGenerationRequest(id: string): Promise<PolicyGenerationRequest | undefined>;
  updatePolicyGenerationRequest(id: string, updates: Partial<PolicyGenerationRequest>): Promise<PolicyGenerationRequest | undefined>;
  getPolicyGenerationRequestsByUserId(userId: string): Promise<PolicyGenerationRequest[]>;
  getPolicyGenerationRequestByScanId(scanId: string): Promise<PolicyGenerationRequest | undefined>;
  
  // Payments - المدفوعات
  createPayment(payment: InsertPayment): Promise<Payment>;
  getPayment(id: string): Promise<Payment | undefined>;
  updatePayment(id: string, updates: Partial<Payment>): Promise<Payment | undefined>;
  getPaymentsByUserId(userId: string): Promise<Payment[]>;
  getPaymentByRequestId(requestId: string): Promise<Payment | undefined>;
  getPaymentByProviderPaymentId(providerPaymentId: string): Promise<Payment | undefined>;
  
  // Scan Claiming - ربط الفحوصات بالمستخدمين
  claimScan(scanId: string, userId: string): Promise<ComplianceScan | undefined>;
  getScansByUserId(userId: string): Promise<ComplianceScan[]>;

  // Discount Codes - أكواد الخصم
  getDiscountCodeByCode(code: string): Promise<DiscountCode | undefined>;
  incrementDiscountCodeUsage(id: string): Promise<void>;
  createDiscountCode(code: InsertDiscountCode): Promise<DiscountCode>;
  getAllDiscountCodes(): Promise<DiscountCode[]>;
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

  async getCurrentPublishedPolicy(): Promise<PolicyDocument | undefined> {
    const [policy] = await db
      .select()
      .from(policyDocuments)
      .where(and(
        eq(policyDocuments.publishStatus, "published"),
        eq(policyDocuments.isCurrent, true)
      ));
    return policy || undefined;
  }

  async getPublishedPolicies(): Promise<PolicyDocument[]> {
    const policies = await db
      .select()
      .from(policyDocuments)
      .where(eq(policyDocuments.publishStatus, "published"))
      .orderBy(desc(policyDocuments.publishedAt));
    return policies;
  }

  async publishPolicy(id: string): Promise<PolicyDocument | undefined> {
    // Get the policy to publish
    const policyToPublish = await this.getPolicyDocument(id);
    if (!policyToPublish) return undefined;

    // Archive current published policy for the SAME company only
    await db
      .update(policyDocuments)
      .set({
        publishStatus: "archived",
        isCurrent: false,
        archivedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(
        eq(policyDocuments.companyName, policyToPublish.companyName),
        eq(policyDocuments.publishStatus, "published"),
        eq(policyDocuments.isCurrent, true)
      ));

    // Get current max version for THIS company only
    const currentVersionResult = await db
      .select({ maxVersion: drizzleSql<number>`COALESCE(MAX(${policyDocuments.version}), 0)` })
      .from(policyDocuments)
      .where(eq(policyDocuments.companyName, policyToPublish.companyName));
    const newVersion = (currentVersionResult[0]?.maxVersion || 0) + 1;

    // Publish the new policy
    const [publishedPolicy] = await db
      .update(policyDocuments)
      .set({
        publishStatus: "published",
        isCurrent: true,
        version: newVersion,
        publishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(policyDocuments.id, id))
      .returning();
    return publishedPolicy || undefined;
  }

  async archivePolicy(id: string): Promise<PolicyDocument | undefined> {
    const [archivedPolicy] = await db
      .update(policyDocuments)
      .set({
        publishStatus: "archived",
        isCurrent: false,
        archivedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(policyDocuments.id, id))
      .returning();
    return archivedPolicy || undefined;
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

  // Get template with sections and legal sources (using junction tables)
  async getTemplateWithSectionsAndSources(templateId: string): Promise<any> {
    // Get template
    const template = await this.getTermsTemplate(templateId);
    if (!template) return null;

    // Get sections linked to this template via junction table (unique per section)
    const sectionsWithJoin = await db
      .select({
        sectionId: templateSections.id,
        slug: templateSections.slug,
        heading: templateSections.heading,
        clauseText: templateSections.clauseText,
        placeholders: templateSections.placeholders,
        createdAt: templateSections.createdAt,
        updatedAt: templateSections.updatedAt,
        ordering: termsTemplateSections.ordering,
        isRequired: termsTemplateSections.isRequired,
      })
      .from(termsTemplateSections)
      .innerJoin(templateSections, eq(termsTemplateSections.sectionId, templateSections.id))
      .where(eq(termsTemplateSections.templateId, templateId))
      .orderBy(termsTemplateSections.ordering);

    // Use Map to ensure unique sections (defensive against potential duplicates)
    const sectionMap = new Map<string, any>();
    
    for (const sectionData of sectionsWithJoin) {
      if (!sectionMap.has(sectionData.sectionId)) {
        // Initialize section with empty legalBasis array
        sectionMap.set(sectionData.sectionId, {
          id: sectionData.sectionId,
          slug: sectionData.slug,
          heading: sectionData.heading,
          clauseText: sectionData.clauseText,
          placeholders: sectionData.placeholders,
          createdAt: sectionData.createdAt,
          updatedAt: sectionData.updatedAt,
          ordering: sectionData.ordering,
          isRequired: sectionData.isRequired,
          legalBasis: [],
        });
      }
    }

    // For each unique section, fetch legal sources and populate legalBasis
    for (const [sectionId, section] of sectionMap.entries()) {
      const legalLinks = await db
        .select({
          sourceCode: legalSources.code,
          sourceTitle: legalSources.title,
          articles: sectionLegalSources.articles,
          relevanceNotes: sectionLegalSources.relevanceNotes,
        })
        .from(sectionLegalSources)
        .innerJoin(legalSources, eq(sectionLegalSources.sourceId, legalSources.id))
        .where(eq(sectionLegalSources.sectionId, sectionId));

      // Assign legalBasis (will only happen once per unique sectionId)
      section.legalBasis = legalLinks;
    }

    // Convert Map to array - will maintain ordering since we added in order
    const sections = Array.from(sectionMap.values());

    return {
      ...template,
      sections,
    };
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

  // ==================== AI ASSISTANT METHODS ====================
  
  // Knowledge Base Articles
  async createKnowledgeArticle(article: InsertKnowledgeArticle): Promise<KnowledgeArticle> {
    const [created] = await db.insert(knowledgeArticles).values(article).returning();
    return created;
  }

  async getKnowledgeArticle(id: string): Promise<KnowledgeArticle | undefined> {
    const [article] = await db.select().from(knowledgeArticles).where(eq(knowledgeArticles.id, id));
    return article || undefined;
  }

  async getAllKnowledgeArticles(): Promise<KnowledgeArticle[]> {
    return await db.select().from(knowledgeArticles).where(eq(knowledgeArticles.isPublished, true)).orderBy(desc(knowledgeArticles.priority));
  }

  async updateKnowledgeArticle(id: string, updates: Partial<KnowledgeArticle>): Promise<KnowledgeArticle | undefined> {
    const { id: _, createdAt, ...updateFields } = updates as any;
    const [updated] = await db
      .update(knowledgeArticles)
      .set({ ...updateFields, updatedAt: new Date() })
      .where(eq(knowledgeArticles.id, id))
      .returning();
    return updated || undefined;
  }

  async updateArticleEmbedding(id: string, embedding: number[], embeddingEn?: number[]): Promise<void> {
    const embeddingStr = JSON.stringify(embedding);
    const embeddingEnStr = embeddingEn ? JSON.stringify(embeddingEn) : null;
    
    if (embeddingEnStr) {
      await db.execute(drizzleSql`
        UPDATE knowledge_articles 
        SET embedding = ${embeddingStr}::vector,
            embedding_en = ${embeddingEnStr}::vector,
            updated_at = NOW()
        WHERE id = ${id}
      `);
    } else {
      await db.execute(drizzleSql`
        UPDATE knowledge_articles 
        SET embedding = ${embeddingStr}::vector,
            updated_at = NOW()
        WHERE id = ${id}
      `);
    }
  }

  async searchKnowledgeByVector(
    embedding: number[], 
    language: string, 
    limit: number = 5
  ): Promise<Array<KnowledgeArticle & { similarity: number }>> {
    // Convert embedding to pgvector format
    const embeddingStr = JSON.stringify(embedding);
    const embeddingCol = language === 'en' ? 'embedding_en' : 'embedding';
    
    // Use cosine similarity search with pgvector
    const results = await db.execute(drizzleSql`
      SELECT *, 
        1 - (${drizzleSql.raw(embeddingCol)} <=> ${embeddingStr}::vector) as similarity
      FROM knowledge_articles
      WHERE is_published = true
        AND ${drizzleSql.raw(embeddingCol)} IS NOT NULL
      ORDER BY ${drizzleSql.raw(embeddingCol)} <=> ${embeddingStr}::vector
      LIMIT ${limit}
    `);
    
    return results.rows as Array<KnowledgeArticle & { similarity: number }>;
  }

  async incrementArticleView(id: string): Promise<void> {
    await db.execute(drizzleSql`
      UPDATE knowledge_articles 
      SET view_count = view_count + 1 
      WHERE id = ${id}
    `);
  }

  async updateArticleFeedback(id: string, helpful: boolean): Promise<void> {
    const field = helpful ? 'helpful_count' : 'not_helpful_count';
    await db.execute(drizzleSql`
      UPDATE knowledge_articles 
      SET ${drizzleSql.raw(field)} = ${drizzleSql.raw(field)} + 1 
      WHERE id = ${id}
    `);
  }

  // Chat Conversations
  async createChatConversation(conversation: InsertChatConversation): Promise<ChatConversation> {
    const [created] = await db.insert(chatConversations).values(conversation).returning();
    return created;
  }

  async getChatConversation(id: string): Promise<ChatConversation | undefined> {
    const [conversation] = await db.select().from(chatConversations).where(eq(chatConversations.id, id));
    return conversation || undefined;
  }

  async getAllChatConversations(): Promise<ChatConversation[]> {
    return await db.select().from(chatConversations).orderBy(desc(chatConversations.lastMessageAt));
  }

  async updateChatConversation(id: string, updates: Partial<ChatConversation>): Promise<ChatConversation | undefined> {
    const { id: _, createdAt, ...updateFields } = updates as any;
    const [updated] = await db
      .update(chatConversations)
      .set({ ...updateFields, updatedAt: new Date() })
      .where(eq(chatConversations.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteChatConversation(id: string): Promise<void> {
    await db.delete(chatConversations).where(eq(chatConversations.id, id));
  }

  // Chat Messages
  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const [created] = await db.insert(chatMessages).values(message).returning();
    
    // Update conversation's lastMessageAt
    await db
      .update(chatConversations)
      .set({ lastMessageAt: new Date(), updatedAt: new Date() })
      .where(eq(chatConversations.id, message.conversationId));
    
    return created;
  }

  async getChatMessage(id: string): Promise<ChatMessage | undefined> {
    const [message] = await db.select().from(chatMessages).where(eq(chatMessages.id, id));
    return message || undefined;
  }

  async getMessagesByConversationId(conversationId: string): Promise<ChatMessage[]> {
    return await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.conversationId, conversationId))
      .orderBy(chatMessages.createdAt);
  }

  async updateChatMessage(id: string, updates: Partial<ChatMessage>): Promise<ChatMessage | undefined> {
    const { id: _, createdAt, ...updateFields } = updates as any;
    const [updated] = await db
      .update(chatMessages)
      .set(updateFields)
      .where(eq(chatMessages.id, id))
      .returning();
    return updated || undefined;
  }

  // Client Management - إدارة العملاء
  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const { id: _, createdAt, ...updateFields } = updates as any;
    const [updated] = await db
      .update(users)
      .set({ ...updateFields, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async createOrGetUserByEmail(email: string, name?: string): Promise<User> {
    const existing = await this.getUserByEmail(email);
    if (existing) {
      return existing;
    }
    const [created] = await db.insert(users).values({ 
      email, 
      name: name || null,
      isEmailVerified: true 
    }).returning();
    return created;
  }

  // OTP Tokens - رموز التحقق
  async createOtpToken(email: string, codeHash: string, expiresAt: Date): Promise<OtpToken> {
    const [created] = await db.insert(otpTokens).values({ 
      email, 
      codeHash, 
      expiresAt 
    }).returning();
    return created;
  }

  async getLatestOtpByEmail(email: string): Promise<OtpToken | undefined> {
    const [token] = await db
      .select()
      .from(otpTokens)
      .where(and(
        eq(otpTokens.email, email),
        eq(otpTokens.verified, false)
      ))
      .orderBy(desc(otpTokens.createdAt))
      .limit(1);
    return token || undefined;
  }

  async markOtpVerified(id: string): Promise<void> {
    await db.update(otpTokens).set({ verified: true }).where(eq(otpTokens.id, id));
  }

  async incrementOtpAttempt(id: string): Promise<void> {
    await db.update(otpTokens).set({ 
      attemptCount: drizzleSql`${otpTokens.attemptCount} + 1` 
    }).where(eq(otpTokens.id, id));
  }

  async deleteExpiredOtpTokens(): Promise<void> {
    await db.delete(otpTokens).where(
      drizzleSql`${otpTokens.expiresAt} < NOW()`
    );
  }

  // Client Policies - سياسات العملاء
  async createClientPolicy(policy: InsertClientPolicy): Promise<ClientPolicy> {
    const [created] = await db.insert(clientPolicies).values(policy).returning();
    return created;
  }

  async getClientPolicy(id: string): Promise<ClientPolicy | undefined> {
    const [policy] = await db.select().from(clientPolicies).where(eq(clientPolicies.id, id));
    return policy || undefined;
  }

  async getClientPoliciesByUserId(userId: string): Promise<ClientPolicy[]> {
    return await db
      .select()
      .from(clientPolicies)
      .where(eq(clientPolicies.userId, userId))
      .orderBy(desc(clientPolicies.createdAt));
  }

  async updateClientPolicy(id: string, updates: Partial<ClientPolicy>): Promise<ClientPolicy | undefined> {
    const { id: _, createdAt, ...updateFields } = updates as any;
    const [updated] = await db
      .update(clientPolicies)
      .set({ ...updateFields, lastModified: new Date() })
      .where(eq(clientPolicies.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteClientPolicy(id: string): Promise<void> {
    await db.delete(clientPolicies).where(eq(clientPolicies.id, id));
  }

  // Client Requests - طلبات العملاء
  async generateRequestNumber(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const date = `${year}${month}${day}`;
    
    // Get the count of requests created today
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const [result] = await db
      .select({ count: drizzleSql<number>`count(*)::int` })
      .from(clientRequests)
      .where(drizzleSql`${clientRequests.createdAt} >= ${todayStart}`);
    
    const count = result?.count || 0;
    const sequence = String(count + 1).padStart(4, '0');
    
    return `REQ-${date}-${sequence}`;
  }

  async createClientRequest(request: InsertClientRequest): Promise<ClientRequest> {
    const requestNumber = await this.generateRequestNumber();
    const [created] = await db
      .insert(clientRequests)
      .values({ ...request, requestNumber })
      .returning();
    return created;
  }

  async getClientRequest(id: string): Promise<ClientRequest | undefined> {
    const [request] = await db.select().from(clientRequests).where(eq(clientRequests.id, id));
    return request || undefined;
  }

  async getClientRequestsByUserId(userId: string): Promise<ClientRequest[]> {
    return await db
      .select()
      .from(clientRequests)
      .where(eq(clientRequests.userId, userId))
      .orderBy(desc(clientRequests.createdAt));
  }

  async updateClientRequest(id: string, updates: Partial<ClientRequest>): Promise<ClientRequest | undefined> {
    const { id: _, createdAt, requestNumber, ...updateFields } = updates as any;
    const [updated] = await db
      .update(clientRequests)
      .set({ ...updateFields, updatedAt: new Date() })
      .where(eq(clientRequests.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteClientRequest(id: string): Promise<void> {
    await db.delete(clientRequests).where(eq(clientRequests.id, id));
  }

  async getAllClientRequests(): Promise<ClientRequest[]> {
    return await db
      .select()
      .from(clientRequests)
      .orderBy(desc(clientRequests.createdAt));
  }

  // ============================================
  // Admin Users - المستخدمون الإداريون
  // ============================================
  
  async createAdminUser(admin: InsertAdminUser): Promise<AdminUser> {
    const [created] = await db
      .insert(adminUsers)
      .values(admin)
      .returning();
    return created;
  }

  async getAdminUser(id: string): Promise<AdminUser | undefined> {
    const [admin] = await db.select().from(adminUsers).where(eq(adminUsers.id, id));
    return admin || undefined;
  }

  async getAdminUserByEmail(email: string): Promise<AdminUser | undefined> {
    const [admin] = await db.select().from(adminUsers).where(eq(adminUsers.email, email));
    return admin || undefined;
  }

  async updateAdminUser(id: string, updates: Partial<AdminUser>): Promise<AdminUser | undefined> {
    const { id: _, createdAt, ...updateFields } = updates as any;
    const [updated] = await db
      .update(adminUsers)
      .set({ ...updateFields, updatedAt: new Date() })
      .where(eq(adminUsers.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteAdminUser(id: string): Promise<void> {
    await db.delete(adminUsers).where(eq(adminUsers.id, id));
  }

  async getAllAdminUsers(): Promise<AdminUser[]> {
    return await db
      .select()
      .from(adminUsers)
      .orderBy(desc(adminUsers.createdAt));
  }

  async updateAdminLastLogin(id: string): Promise<void> {
    await db
      .update(adminUsers)
      .set({ lastLogin: new Date() })
      .where(eq(adminUsers.id, id));
  }

  // ============================================
  // Audit Logs - سجل التدقيق
  // ============================================
  
  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [created] = await db
      .insert(auditLogs)
      .values(log)
      .returning();
    return created;
  }

  async getAuditLog(id: string): Promise<AuditLog | undefined> {
    const [log] = await db.select().from(auditLogs).where(eq(auditLogs.id, id));
    return log || undefined;
  }

  async getAllAuditLogs(): Promise<AuditLog[]> {
    return await db
      .select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(1000);
  }

  async getAuditLogsByAdminUser(adminUserId: string): Promise<AuditLog[]> {
    return await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.adminUserId, adminUserId))
      .orderBy(desc(auditLogs.createdAt));
  }

  async getAuditLogsByEntity(entityType: string, entityId: string): Promise<AuditLog[]> {
    return await db
      .select()
      .from(auditLogs)
      .where(and(
        eq(auditLogs.entityType, entityType),
        eq(auditLogs.entityId, entityId)
      ))
      .orderBy(desc(auditLogs.createdAt));
  }

  // ============================================
  // Admin Statistics - إحصائيات إدارية
  // ============================================
  
  async getAllUsers(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt));
  }

  async getAllClientPolicies(): Promise<ClientPolicy[]> {
    return await db
      .select()
      .from(clientPolicies)
      .orderBy(desc(clientPolicies.createdAt));
  }

  async getAdminStats(): Promise<{
    totalUsers: number;
    totalPolicies: number;
    totalRequests: number;
    pendingRequests: number;
    activeAdmins: number;
  }> {
    const [usersCount] = await db
      .select({ count: drizzleSql<number>`count(*)::int` })
      .from(users);
    
    const [policiesCount] = await db
      .select({ count: drizzleSql<number>`count(*)::int` })
      .from(clientPolicies);
    
    const [requestsCount] = await db
      .select({ count: drizzleSql<number>`count(*)::int` })
      .from(clientRequests);
    
    const [pendingCount] = await db
      .select({ count: drizzleSql<number>`count(*)::int` })
      .from(clientRequests)
      .where(eq(clientRequests.status, "pending"));
    
    const [adminsCount] = await db
      .select({ count: drizzleSql<number>`count(*)::int` })
      .from(adminUsers)
      .where(eq(adminUsers.isActive, true));
    
    return {
      totalUsers: usersCount?.count || 0,
      totalPolicies: policiesCount?.count || 0,
      totalRequests: requestsCount?.count || 0,
      pendingRequests: pendingCount?.count || 0,
      activeAdmins: adminsCount?.count || 0,
    };
  }

  // ============================================
  // Policy Generation Requests - طلبات توليد السياسات
  // ============================================
  
  async createPolicyGenerationRequest(request: InsertPolicyGenerationRequest): Promise<PolicyGenerationRequest> {
    const [created] = await db
      .insert(policyGenerationRequests)
      .values(request)
      .returning();
    return created;
  }

  async getPolicyGenerationRequest(id: string): Promise<PolicyGenerationRequest | undefined> {
    const [request] = await db
      .select()
      .from(policyGenerationRequests)
      .where(eq(policyGenerationRequests.id, id));
    return request || undefined;
  }

  async updatePolicyGenerationRequest(id: string, updates: Partial<PolicyGenerationRequest>): Promise<PolicyGenerationRequest | undefined> {
    const { id: _, ...updateData } = updates;
    const [updated] = await db
      .update(policyGenerationRequests)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(policyGenerationRequests.id, id))
      .returning();
    return updated || undefined;
  }

  async getPolicyGenerationRequestsByUserId(userId: string): Promise<PolicyGenerationRequest[]> {
    return await db
      .select()
      .from(policyGenerationRequests)
      .where(eq(policyGenerationRequests.userId, userId))
      .orderBy(desc(policyGenerationRequests.createdAt));
  }

  async getPolicyGenerationRequestByScanId(scanId: string): Promise<PolicyGenerationRequest | undefined> {
    const [request] = await db
      .select()
      .from(policyGenerationRequests)
      .where(eq(policyGenerationRequests.scanId, scanId));
    return request || undefined;
  }

  // ============================================
  // Payments - المدفوعات
  // ============================================
  
  async createPayment(payment: InsertPayment): Promise<Payment> {
    const [created] = await db
      .insert(payments)
      .values(payment)
      .returning();
    return created;
  }

  async getPayment(id: string): Promise<Payment | undefined> {
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.id, id));
    return payment || undefined;
  }

  async updatePayment(id: string, updates: Partial<Payment>): Promise<Payment | undefined> {
    const { id: _, ...updateData } = updates;
    const [updated] = await db
      .update(payments)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(payments.id, id))
      .returning();
    return updated || undefined;
  }

  async getPaymentsByUserId(userId: string): Promise<Payment[]> {
    return await db
      .select()
      .from(payments)
      .where(eq(payments.userId, userId))
      .orderBy(desc(payments.createdAt));
  }

  async getPaymentByRequestId(requestId: string): Promise<Payment | undefined> {
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.requestId, requestId));
    return payment || undefined;
  }

  async getPaymentByProviderPaymentId(providerPaymentId: string): Promise<Payment | undefined> {
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.providerPaymentId, providerPaymentId));
    return payment || undefined;
  }

  // ============================================
  // Scan Claiming - ربط الفحوصات بالمستخدمين
  // ============================================
  
  async claimScan(scanId: string, userId: string): Promise<ComplianceScan | undefined> {
    const [updated] = await db
      .update(complianceScans)
      .set({ 
        userId: userId,
        isClaimedByUser: true,
        updatedAt: new Date() 
      })
      .where(eq(complianceScans.id, scanId))
      .returning();
    return updated || undefined;
  }

  async getScansByUserId(userId: string): Promise<ComplianceScan[]> {
    return await db
      .select()
      .from(complianceScans)
      .where(eq(complianceScans.userId, userId))
      .orderBy(desc(complianceScans.scanDate));
  }
  // ============================================
  // Discount Codes - أكواد الخصم
  // ============================================

  async getDiscountCodeByCode(code: string): Promise<DiscountCode | undefined> {
    const [discountCode] = await db
      .select()
      .from(discountCodes)
      .where(eq(discountCodes.code, code.toUpperCase()));
    return discountCode || undefined;
  }

  async incrementDiscountCodeUsage(id: string): Promise<void> {
    await db
      .update(discountCodes)
      .set({ currentUses: drizzleSql`${discountCodes.currentUses} + 1` })
      .where(eq(discountCodes.id, id));
  }

  async createDiscountCode(code: InsertDiscountCode): Promise<DiscountCode> {
    const [created] = await db
      .insert(discountCodes)
      .values({ ...code, code: code.code.toUpperCase() })
      .returning();
    return created;
  }

  async getAllDiscountCodes(): Promise<DiscountCode[]> {
    return await db
      .select()
      .from(discountCodes)
      .orderBy(desc(discountCodes.createdAt));
  }
}

// Export singleton instance
export const storage = new DatabaseStorage();