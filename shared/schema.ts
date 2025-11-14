import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Compliance Scans - فحوصات الامتثال
export const complianceScans = pgTable("compliance_scans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  url: text("url").notNull(),
  status: text("status").notNull(), // pending, scanning, completed, failed
  scanDate: timestamp("scan_date").defaultNow(),
  completedAt: timestamp("completed_at"),
  overallScore: integer("overall_score"), // 0-100
  issuesCount: integer("issues_count").default(0),
  criticalCount: integer("critical_count").default(0),
  warningCount: integer("warning_count").default(0),
  suggestionCount: integer("suggestion_count").default(0),
  pageContent: text("page_content"), // HTML content of the scanned page
  analysisResult: jsonb("analysis_result"), // AI analysis result
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertComplianceScanSchema = createInsertSchema(complianceScans).pick({
  url: true,
}).extend({
  url: z.string().url("يجب إدخال رابط صحيح"),
});

export type InsertComplianceScan = z.infer<typeof insertComplianceScanSchema>;
export type ComplianceScan = typeof complianceScans.$inferSelect;

// Compliance Issues - مشاكل الامتثال
export const complianceIssues = pgTable("compliance_issues", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  scanId: varchar("scan_id").notNull().references(() => complianceScans.id, { onDelete: "cascade" }),
  severity: text("severity").notNull(), // critical, warning, suggestion
  category: text("category").notNull(), // privacy_policy, data_collection, consent, etc.
  title: text("title").notNull(),
  description: text("description").notNull(),
  affectedElement: text("affected_element"), // HTML element or section
  regulation: text("regulation"), // Which regulation/article is violated
  remediation: text("remediation").notNull(), // How to fix the issue
  articleReference: text("article_reference"), // Specific article number from the law
  remediationTemplateId: varchar("remediation_template_id").references(() => remediationTemplates.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertComplianceIssueSchema = createInsertSchema(complianceIssues).omit({
  id: true,
});

export type InsertComplianceIssue = z.infer<typeof insertComplianceIssueSchema>;
export type ComplianceIssue = typeof complianceIssues.$inferSelect;

// Reports - التقارير
export const reports = pgTable("reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  scanId: varchar("scan_id").notNull().references(() => complianceScans.id, { onDelete: "cascade" }),
  generatedAt: timestamp("generated_at").defaultNow(),
  format: text("format").notNull(), // pdf, html, json
  content: jsonb("content"), // Report content
  fileName: text("file_name"),
});

export const insertReportSchema = createInsertSchema(reports).pick({
  scanId: true,
  format: true,
});

export type InsertReport = z.infer<typeof insertReportSchema>;
export type Report = typeof reports.$inferSelect;

// Saved Templates - قوالب محفوظة
export const remediationTemplates = pgTable("remediation_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  category: text("category").notNull(),
  issue: text("issue").notNull(),
  arabicTitle: text("arabic_title").notNull(),
  arabicDescription: text("arabic_description").notNull(),
  remediation: text("remediation").notNull(),
  exampleCode: text("example_code"),
  regulations: jsonb("regulations"), // Array of relevant regulations
});

export const insertRemediationTemplateSchema = createInsertSchema(remediationTemplates).omit({
  id: true,
});

export type InsertRemediationTemplate = z.infer<typeof insertRemediationTemplateSchema>;
export type RemediationTemplate = typeof remediationTemplates.$inferSelect;

// Relations
export const complianceScansRelations = relations(complianceScans, ({ many }) => ({
  issues: many(complianceIssues),
  reports: many(reports),
}));

export const complianceIssuesRelations = relations(complianceIssues, ({ one }) => ({
  scan: one(complianceScans, {
    fields: [complianceIssues.scanId],
    references: [complianceScans.id],
  }),
  remediationTemplate: one(remediationTemplates, {
    fields: [complianceIssues.remediationTemplateId],
    references: [remediationTemplates.id],
  }),
}));

export const reportsRelations = relations(reports, ({ one }) => ({
  scan: one(complianceScans, {
    fields: [reports.scanId],
    references: [complianceScans.id],
  }),
}));

export const remediationTemplatesRelations = relations(remediationTemplates, ({ many }) => ({
  issues: many(complianceIssues),
}));

// Policy Documents - وثائق سياسة الخصوصية
export const policyDocuments = pgTable("policy_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyName: text("company_name").notNull(),
  websiteUrl: text("website_url").notNull(),
  businessType: text("business_type").notNull(),
  
  // بيانات التواصل من النموذج
  responsibleDepartment: text("responsible_department"), // القسم/الفريق المختص
  address: text("address"), // العنوان
  contactPhone: text("contact_phone"), // رقم الهاتف
  contactEmail: text("contact_email").notNull(), // البريد الإلكتروني
  licenseNumber: text("license_number"), // الترخيص أو السجل التجاري
  
  // البيانات الشخصية
  dataTypes: jsonb("data_types").notNull(), // Array of data types collected
  dataUsagePurposes: jsonb("data_usage_purposes").notNull(),
  hasThirdPartySharing: text("has_third_party_sharing").notNull(),
  retentionPeriod: text("retention_period").notNull(),
  
  // كيفية جمع البيانات
  dataCollectionMethods: text("data_collection_methods"), // طرق جمع البيانات (مباشرة، غير مباشرة)
  indirectDataSources: text("indirect_data_sources"), // مصادر البيانات غير المباشرة
  
  // كيفية الاستخدام والإفصاح
  dataUsageDetails: text("data_usage_details"), // تفاصيل استخدام البيانات
  disclosureDetails: text("disclosure_details"), // تفاصيل الإفصاح عن البيانات
  thirdPartyCategories: text("third_party_categories"), // فئات الجهات الخارجية
  
  // التخزين والحماية
  storageLocation: text("storage_location"), // موقع تخزين البيانات
  securityMeasures: text("security_measures"), // إجراءات الحماية
  
  // مسؤول حماية البيانات
  dpoName: text("dpo_name"), // اسم مسؤول حماية البيانات
  dpoAddress: text("dpo_address"), // عنوان المسؤول
  dpoPhone: text("dpo_phone"), // رقم هاتف المسؤول
  dpoEmail: text("dpo_email"), // بريد المسؤول الإلكتروني
  
  // تاريخ آخر تحديث
  lastUpdatedDate: timestamp("last_updated_date"),
  
  generatedContent: text("generated_content"),
  status: text("status").notNull().default("pending"), // pending, generating, completed, failed
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPolicyDocumentSchema = createInsertSchema(policyDocuments).omit({
  id: true,
  generatedContent: true,
  status: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  websiteUrl: z.string().url("يجب إدخال رابط صحيح"),
  contactEmail: z.string().email("يجب إدخال بريد إلكتروني صحيح"),
  companyName: z.string().min(2, "يجب إدخال اسم الجهة"),
  businessType: z.string().min(2, "يجب إدخال نوع النشاط"),
  retentionPeriod: z.string().min(1, "يجب تحديد مدة الاحتفاظ بالبيانات"),
  hasThirdPartySharing: z.string().min(1, "يجب تحديد ما إذا كانت هناك مشاركة مع جهات خارجية"),
  dataTypes: z.array(z.string()).min(1, "يجب إدخال نوع واحد على الأقل من البيانات"),
  dataUsagePurposes: z.array(z.string()).min(1, "يجب إدخال غرض واحد على الأقل"),
  
  // جميع الحقول الاختيارية يمكن أن تكون string أو null
  responsibleDepartment: z.string().nullish(),
  address: z.string().nullish(),
  contactPhone: z.string().nullish(),
  licenseNumber: z.string().nullish(),
  dataCollectionMethods: z.string().nullish(),
  indirectDataSources: z.string().nullish(),
  dataUsageDetails: z.string().nullish(),
  disclosureDetails: z.string().nullish(),
  thirdPartyCategories: z.string().nullish(),
  storageLocation: z.string().nullish(),
  securityMeasures: z.string().nullish(),
  dpoName: z.string().nullish(),
  dpoAddress: z.string().nullish(),
  dpoPhone: z.string().nullish(),
  dpoEmail: z.string().email("يجب إدخال بريد إلكتروني صحيح").nullish().or(z.literal("")),
  lastUpdatedDate: z.preprocess((val) => {
    if (!val || val === '') return null;
    const date = val instanceof Date ? val : new Date(val as string);
    return isNaN(date.getTime()) ? null : date;
  }, z.date().optional()).nullable(),
});

export type InsertPolicyDocument = z.infer<typeof insertPolicyDocumentSchema>;
export type PolicyDocument = typeof policyDocuments.$inferSelect;

// Consent Records - سجلات الموافقة
export const consentRecords = pgTable("consent_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull(),
  userName: text("user_name"),
  userEmail: text("user_email"),
  consentType: text("consent_type").notNull(), // marketing, analytics, cookies, data_sharing
  consentGiven: text("consent_given").notNull(), // yes, no
  consentDate: timestamp("consent_date").defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  consentMethod: text("consent_method"), // checkbox, button, form
  expiryDate: timestamp("expiry_date"),
  withdrawnAt: timestamp("withdrawn_at"),
  notes: text("notes"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertConsentRecordSchema = createInsertSchema(consentRecords).omit({
  id: true,
  createdAt: true,
});

export type InsertConsentRecord = z.infer<typeof insertConsentRecordSchema>;
export type ConsentRecord = typeof consentRecords.$inferSelect;

// Terms Documents - وثائق الشروط والأحكام
export const termsDocuments = pgTable("terms_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyName: text("company_name").notNull(),
  websiteUrl: text("website_url").notNull(),
  businessType: text("business_type").notNull(),
  serviceDescription: text("service_description").notNull(),
  hasUserAccounts: text("has_user_accounts").notNull(),
  hasSubscriptions: text("has_subscriptions").notNull(),
  paymentMethods: jsonb("payment_methods"),
  refundPolicy: text("refund_policy"),
  liabilityLimits: text("liability_limits"),
  governingLaw: text("governing_law").notNull().default("Saudi Arabia"),
  disputeResolution: text("dispute_resolution"),
  contactEmail: text("contact_email").notNull(),
  generatedContent: text("generated_content"),
  status: text("status").notNull().default("pending"), // pending, generating, completed, failed
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTermsDocumentSchema = createInsertSchema(termsDocuments).omit({
  id: true,
  generatedContent: true,
  status: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  websiteUrl: z.string().url("يجب إدخال رابط صحيح"),
  contactEmail: z.string().email("يجب إدخال بريد إلكتروني صحيح"),
});

export type InsertTermsDocument = z.infer<typeof insertTermsDocumentSchema>;
export type TermsDocument = typeof termsDocuments.$inferSelect;

// Compliance Tasks - مهام الامتثال الداخلي
export const complianceTasks = pgTable("compliance_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(), // data_mapping, risk_assessment, policy_review, training, audit
  priority: text("priority").notNull(), // low, medium, high, critical
  status: text("status").notNull().default("pending"), // pending, in_progress, completed, overdue
  assignedTo: text("assigned_to"),
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  attachments: jsonb("attachments"),
  checklistItems: jsonb("checklist_items"), // Array of subtasks
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertComplianceTaskSchema = createInsertSchema(complianceTasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertComplianceTask = z.infer<typeof insertComplianceTaskSchema>;
export type ComplianceTask = typeof complianceTasks.$inferSelect;
