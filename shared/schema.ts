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

// Policy Documents - وثائق سياسة الخصوصية (بناءً على الهيكل الجديد SDAIA)
export const policyDocuments = pgTable("policy_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // القسم الأول: هوية الجهة والمسؤولية (جهة التحكم)
  companyName: text("company_name").notNull(), // س1: الاسم الرسمي
  businessType: text("business_type").notNull(), // س2: طبيعة النشاط الرئيسي
  entityType: text("entity_type").notNull(), // س3: صفة الجهة (حكومية/خاصة/فرد)
  
  // س4: بيانات التواصل
  contactEmail: text("contact_email").notNull(),
  contactPhone: text("contact_phone"),
  contactAddress: text("contact_address"),
  
  // س5: معالجة بيانات حساسة أو مراقبة مستمرة
  processesSensitiveData: text("processes_sensitive_data"), // نعم/لا
  requiresDPO: text("requires_dpo"), // نعم/لا (محسوبة من س5)
  
  // مسؤول حماية البيانات (إذا كان مطلوباً)
  dpoName: text("dpo_name"),
  dpoEmail: text("dpo_email"),
  dpoPhone: text("dpo_phone"),
  dpoAddress: text("dpo_address"),
  
  // القسم الثاني: جمع البيانات والأغراض النظامية
  // س6: فئات البيانات الشخصية
  dataCategories: jsonb("data_categories").notNull(), // [{name, required, purpose, legalBasis}]
  
  // س7: كيفية جمع البيانات
  collectionMethod: text("collection_method"), // مباشرة/غير مباشرة/كلاهما
  directCollectionDetails: text("direct_collection_details"), // تفاصيل الجمع المباشر
  indirectCollectionDetails: text("indirect_collection_details"), // تفاصيل الجمع غير المباشر
  indirectDataSources: text("indirect_data_sources"), // مصادر البيانات غير المباشرة
  
  // س8: إلزامية البيانات (مدمج في dataCategories)
  // س9: السبب المحدد (مدمج في dataCategories)
  // س10: المسوغ النظامي (مدمج في dataCategories)
  
  // القسم الثالث: معالجة البيانات، مشاركتها، وأمنها
  // س11: آليات معالجة البيانات
  processingMethods: text("processing_methods"), // وصف دورة حياة البيانات
  
  // س12: مشاركة البيانات مع أطراف أخرى
  sharesWithThirdParties: text("shares_with_third_parties"), // نعم/لا
  thirdPartyDetails: jsonb("third_party_details"), // [{party, purpose, safeguards}]
  
  // س13: نقل البيانات خارج المملكة
  transfersDataAbroad: text("transfers_data_abroad"), // نعم/لا
  transferDestinations: text("transfer_destinations"), // الدول المستهدفة
  transferSafeguards: text("transfer_safeguards"), // الضمانات
  transferMechanism: text("transfer_mechanism"), // الآلية (اتفاقيات، قرار، قواعد ملزمة)
  
  // س14: حقوق صاحب البيانات الشخصية
  rightsExerciseMethod: text("rights_exercise_method"), // كيفية ممارسة الحقوق
  rightsResponseTime: text("rights_response_time"), // مدة الرد (بالأيام)
  rightsContactChannel: text("rights_contact_channel"), // قناة التواصل
  
  // س15: حق الوصول إلى البيانات
  accessRightDetails: text("access_right_details"),
  
  // س16: حق الحصول على نسخة
  obtainCopyDetails: text("obtain_copy_details"),
  obtainCopyFormat: text("obtain_copy_format"), // الصيغة (PDF، Word، إلخ)
  obtainCopyLimitations: text("obtain_copy_limitations"), // القيود
  
  // س17: حق تصحيح البيانات
  correctionRightDetails: text("correction_right_details"),
  correctionResponseTime: text("correction_response_time"), // المدة بالأيام
  correctionNotificationMethod: text("correction_notification_method"),
  
  // س18: حق حذف البيانات
  deletionRightConditions: text("deletion_right_conditions"),
  deletionExceptions: text("deletion_exceptions"), // الاستثناءات
  
  // س19: حق الاعتراض
  objectionRightDetails: text("objection_right_details"),
  objectionEvaluationTime: text("objection_evaluation_time"),
  
  // س20: حق سحب الموافقة
  withdrawalConsentDetails: text("withdrawal_consent_details"),
  withdrawalConsentMethod: text("withdrawal_consent_method"),
  withdrawalConsentImpact: text("withdrawal_consent_impact"), // الأثر على الخدمات
  
  // س21: التخزين والأمان
  storageLocation: text("storage_location"), // داخل/خارج المملكة
  storageLocationDetails: text("storage_location_details"),
  retentionPeriod: text("retention_period"),
  retentionCriteria: text("retention_criteria"), // المعايير
  deletionMethod: text("deletion_method"), // طريقة الإتلاف
  
  // س22: الإجراءات الأمنية
  securityMeasures: jsonb("security_measures"), // [{type, description}]
  technicalMeasures: text("technical_measures"),
  organizationalMeasures: text("organizational_measures"),
  
  // س23: الإخطار بانتهاك البيانات
  breachNotificationProcess: text("breach_notification_process"),
  breachNotificationTime: text("breach_notification_time"), // المدة
  
  // س24: ملفات الارتباط (الكوكيز)
  usesCookies: text("uses_cookies"), // نعم/لا
  cookieTypes: jsonb("cookie_types"), // [{type, purpose, duration}]
  cookieManagementMethod: text("cookie_management_method"),
  
  // س25: التحديثات على السياسة
  updateNotificationMethod: text("update_notification_method"),
  lastUpdatedDate: timestamp("last_updated_date"),
  
  // س26: جهة الاختصاص والشكاوى
  complaintProcedure: text("complaint_procedure"),
  complaintResponseTime: text("complaint_response_time"),
  sdaiaContactInfo: text("sdaia_contact_info"), // معلومات التواصل مع هيئة سدايا
  
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
  // الحقول الإلزامية
  companyName: z.string().min(2, "يجب إدخال اسم الجهة"),
  businessType: z.string().min(2, "يجب إدخال نوع النشاط"),
  entityType: z.enum(["government", "private", "individual"], {
    required_error: "يجب تحديد صفة الجهة"
  }),
  contactEmail: z.string().email("يجب إدخال بريد إلكتروني صحيح"),
  dataCategories: z.array(z.object({
    name: z.string(),
    required: z.boolean(),
    purpose: z.string(),
    legalBasis: z.enum(["consent", "contract", "legal_obligation", "legitimate_interest"]),
  })).min(1, "يجب إدخال فئة واحدة على الأقل من البيانات"),
  
  // جميع الحقول الاختيارية
  contactPhone: z.string().nullish(),
  contactAddress: z.string().nullish(),
  processesSensitiveData: z.string().nullish(),
  requiresDPO: z.string().nullish(),
  dpoName: z.string().nullish(),
  dpoEmail: z.string().email("يجب إدخال بريد إلكتروني صحيح").nullish().or(z.literal("")),
  dpoPhone: z.string().nullish(),
  dpoAddress: z.string().nullish(),
  collectionMethod: z.string().nullish(),
  directCollectionDetails: z.string().nullish(),
  indirectCollectionDetails: z.string().nullish(),
  indirectDataSources: z.string().nullish(),
  processingMethods: z.string().nullish(),
  sharesWithThirdParties: z.string().nullish(),
  thirdPartyDetails: z.array(z.object({
    party: z.string(),
    purpose: z.string(),
    safeguards: z.string().optional(),
  })).nullish(),
  transfersDataAbroad: z.string().nullish(),
  transferDestinations: z.string().nullish(),
  transferSafeguards: z.string().nullish(),
  transferMechanism: z.string().nullish(),
  rightsExerciseMethod: z.string().nullish(),
  rightsResponseTime: z.string().nullish(),
  rightsContactChannel: z.string().nullish(),
  accessRightDetails: z.string().nullish(),
  obtainCopyDetails: z.string().nullish(),
  obtainCopyFormat: z.string().nullish(),
  obtainCopyLimitations: z.string().nullish(),
  correctionRightDetails: z.string().nullish(),
  correctionResponseTime: z.string().nullish(),
  correctionNotificationMethod: z.string().nullish(),
  deletionRightConditions: z.string().nullish(),
  deletionExceptions: z.string().nullish(),
  objectionRightDetails: z.string().nullish(),
  objectionEvaluationTime: z.string().nullish(),
  withdrawalConsentDetails: z.string().nullish(),
  withdrawalConsentMethod: z.string().nullish(),
  withdrawalConsentImpact: z.string().nullish(),
  storageLocation: z.string().nullish(),
  storageLocationDetails: z.string().nullish(),
  retentionPeriod: z.string().nullish(),
  retentionCriteria: z.string().nullish(),
  deletionMethod: z.string().nullish(),
  securityMeasures: z.array(z.object({
    type: z.string(),
    description: z.string(),
  })).nullish(),
  technicalMeasures: z.string().nullish(),
  organizationalMeasures: z.string().nullish(),
  breachNotificationProcess: z.string().nullish(),
  breachNotificationTime: z.string().nullish(),
  usesCookies: z.string().nullish(),
  cookieTypes: z.array(z.object({
    type: z.string(),
    purpose: z.string(),
    duration: z.string(),
  })).nullish(),
  cookieManagementMethod: z.string().nullish(),
  updateNotificationMethod: z.string().nullish(),
  lastUpdatedDate: z.preprocess((val) => {
    if (!val || val === '') return null;
    const date = val instanceof Date ? val : new Date(val as string);
    return isNaN(date.getTime()) ? null : date;
  }, z.date().optional()).nullable(),
  complaintProcedure: z.string().nullish(),
  complaintResponseTime: z.string().nullish(),
  sdaiaContactInfo: z.string().nullish(),
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
