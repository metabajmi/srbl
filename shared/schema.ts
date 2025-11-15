import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, integer, boolean } from "drizzle-orm/pg-core";
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

// Consent Records - سجلات الموافقة (CMP)
export const consentRecords = pgTable("consent_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // معرف مجهول للمستخدم (fingerprint أو session ID)
  anonymousId: text("anonymous_id").notNull(), // Browser fingerprint or session ID
  
  // معلومات المستخدم (اختيارية - إذا كان مسجل دخول)
  userId: text("user_id"),
  userName: text("user_name"),
  userEmail: text("user_email"),
  
  // الموافقة التفصيلية (Granular Consent)
  necessaryCookies: text("necessary_cookies").notNull().default("accepted"), // دائماً مقبولة
  analyticsCookies: text("analytics_cookies").notNull(), // accepted, rejected
  marketingCookies: text("marketing_cookies").notNull(), // accepted, rejected
  performanceCookies: text("performance_cookies").notNull(), // accepted, rejected
  
  // معلومات الموافقة
  consentDate: timestamp("consent_date").defaultNow(),
  consentVersion: text("consent_version"), // نسخة سياسة الخصوصية
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  consentMethod: text("consent_method"), // banner, preferences_center
  
  // سحب الموافقة
  withdrawnAt: timestamp("withdrawn_at"),
  withdrawalReason: text("withdrawal_reason"),
  
  // بيانات إضافية
  metadata: jsonb("metadata"), // أي بيانات إضافية
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertConsentRecordSchema = createInsertSchema(consentRecords).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  anonymousId: z.string().min(1, "معرف مجهول مطلوب"),
  analyticsCookies: z.enum(["accepted", "rejected"]),
  marketingCookies: z.enum(["accepted", "rejected"]),
  performanceCookies: z.enum(["accepted", "rejected"]),
});

export type InsertConsentRecord = z.infer<typeof insertConsentRecordSchema>;
export type ConsentRecord = typeof consentRecords.$inferSelect;

// CMP Settings - إعدادات منصة إدارة الموافقة
export const cmpSettings = pgTable("cmp_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // الألوان والتخصيص
  primaryColor: text("primary_color").default("#2563eb"), // اللون الأساسي
  backgroundColor: text("background_color").default("#ffffff"), // لون الخلفية
  textColor: text("text_color").default("#000000"), // لون النص
  buttonColor: text("button_color").default("#2563eb"), // لون الأزرار
  
  // النصوص العربية
  bannerTitle: text("banner_title").default("نحن نستخدم ملفات تعريف الارتباط"),
  bannerDescription: text("banner_description").default("نستخدم ملفات تعريف الارتباط لتحسين تجربتك وتحليل استخدام الموقع. يمكنك قبول جميع الكوكيز أو تخصيص خياراتك."),
  acceptAllButtonText: text("accept_all_button_text").default("قبول الكل"),
  rejectAllButtonText: text("reject_all_button_text").default("رفض الكل"),
  customizeButtonText: text("customize_button_text").default("تخصيص"),
  
  // نصوص فئات الكوكيز
  necessaryCookiesTitle: text("necessary_cookies_title").default("الكوكيز الضرورية"),
  necessaryCookiesDesc: text("necessary_cookies_desc").default("ضرورية لعمل الموقع الأساسي ولا يمكن تعطيلها"),
  analyticsCookiesTitle: text("analytics_cookies_title").default("الكوكيز التحليلية"),
  analyticsCookiesDesc: text("analytics_cookies_desc").default("تساعدنا على فهم كيفية استخدام الزوار للموقع"),
  marketingCookiesTitle: text("marketing_cookies_title").default("الكوكيز التسويقية"),
  marketingCookiesDesc: text("marketing_cookies_desc").default("تُستخدم لعرض إعلانات ذات صلة"),
  performanceCookiesTitle: text("performance_cookies_title").default("كوكيز الأداء"),
  performanceCookiesDesc: text("performance_cookies_desc").default("تساعد على تحسين أداء الموقع"),
  
  // الإعدادات التقنية
  bannerPosition: text("banner_position").default("bottom"), // bottom, top, center
  language: text("language").default("ar"), // ar, en
  showLogo: text("show_logo").default("yes"), // yes, no
  logoUrl: text("logo_url"),
  
  // الإعدادات القانونية
  privacyPolicyUrl: text("privacy_policy_url"),
  termsUrl: text("terms_url"),
  consentVersion: text("consent_version").default("1.0"),
  
  // بيانات إضافية
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCmpSettingsSchema = createInsertSchema(cmpSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCmpSettings = z.infer<typeof insertCmpSettingsSchema>;
export type CmpSettings = typeof cmpSettings.$inferSelect;

// CMP Scripts - السكربتات المحجوبة
export const cmpScripts = pgTable("cmp_scripts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // معلومات السكربت
  name: text("name").notNull(), // Google Analytics, Meta Pixel, etc.
  category: text("category").notNull(), // analytics, marketing, performance
  enabled: text("enabled").notNull().default("yes"), // yes, no
  
  // السكربت نفسه
  scriptType: text("script_type").notNull(), // inline, external
  scriptContent: text("script_content"), // الكود للـ inline scripts
  scriptUrl: text("script_url"), // URL للـ external scripts
  scriptPosition: text("script_position").default("head"), // head, body
  
  // البيانات الإضافية
  description: text("description"),
  legalBasis: text("legal_basis"), // consent, legitimate_interest
  
  // بيانات النظام
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCmpScriptSchema = createInsertSchema(cmpScripts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  name: z.string().min(1, "يجب إدخال اسم السكربت"),
  category: z.enum(["analytics", "marketing", "performance"], {
    required_error: "يجب تحديد فئة السكربت"
  }),
  scriptType: z.enum(["inline", "external"]),
  enabled: z.enum(["yes", "no"]).or(z.boolean().transform(val => val ? "yes" : "no")),
});

export type InsertCmpScript = z.infer<typeof insertCmpScriptSchema>;
export type CmpScript = typeof cmpScripts.$inferSelect;

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

// ====================================
// Internal Compliance Management Module
// وحدة الامتثال الداخلي
// ====================================

// ROPA Entries - سجل أنشطة المعالجة (Record of Processing Activities)
export const ropaEntries = pgTable("ropa_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // الجهة أو القسم المسؤول
  department: text("department").notNull(), // مثل: التسويق، الموارد البشرية، تقنية المعلومات
  
  // نوع البيانات
  dataTypes: jsonb("data_types").notNull(), // [{name, category, isSensitive}]
  
  // الغرض من المعالجة
  processingPurpose: text("processing_purpose").notNull(), // مثل: التوظيف، التسويق، تقديم الخدمات
  
  // الأساس النظامي (Legal Basis)
  legalBasis: text("legal_basis").notNull(), // consent, contract, legal_obligation, legitimate_interest
  
  // مدة الاحتفاظ بالبيانات
  retentionPeriod: text("retention_period").notNull(), // مثل: 5 سنوات، حتى انتهاء العقد
  
  // الأطراف المستلمة للبيانات
  dataRecipients: jsonb("data_recipients"), // [{name, purpose, location}]
  
  // التدابير الأمنية
  securityMeasures: text("security_measures"), // وصف التدابير الأمنية المطبقة
  
  // النقل عبر الحدود
  internationalTransfers: text("international_transfers"), // yes/no
  transferDetails: text("transfer_details"), // تفاصيل النقل إذا كان موجود
  
  // ملاحظات إضافية
  notes: text("notes"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertRopaEntrySchema = createInsertSchema(ropaEntries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  department: z.string().min(2, "يجب إدخال اسم القسم أو الجهة"),
  dataTypes: z.array(z.object({
    name: z.string(),
    category: z.string(), // personal, sensitive, special
    isSensitive: z.boolean(),
  })).min(1, "يجب إدخال نوع واحد على الأقل من البيانات"),
  processingPurpose: z.string().min(5, "يجب توضيح الغرض من المعالجة"),
  legalBasis: z.enum(["consent", "contract", "legal_obligation", "legitimate_interest"], {
    required_error: "يجب تحديد الأساس النظامي"
  }),
  retentionPeriod: z.string().min(2, "يجب تحديد مدة الاحتفاظ"),
});

export type InsertRopaEntry = z.infer<typeof insertRopaEntrySchema>;
export type RopaEntry = typeof ropaEntries.$inferSelect;

// Update schema for ROPA - only allows updating specific mutable fields
export const updateRopaEntrySchema = insertRopaEntrySchema.partial().strict();

// DSAR Requests - طلبات أصحاب البيانات (Data Subject Access Requests)
export const dsarRequests = pgTable("dsar_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // معلومات مقدم الطلب
  requesterName: text("requester_name").notNull(),
  requesterEmail: text("requester_email").notNull(),
  requesterPhone: text("requester_phone"),
  requesterIdentification: text("requester_identification"), // رقم الهوية للتحقق
  
  // نوع الطلب
  requestType: text("request_type").notNull(), // access, delete, rectify, restrict, object, portability
  
  // تفاصيل الطلب
  requestDetails: text("request_details").notNull(), // وصف تفصيلي للطلب
  
  // الحالة
  status: text("status").notNull().default("new"), // new, in_progress, completed, rejected
  
  // التواريخ والمهل
  submittedAt: timestamp("submitted_at").defaultNow(),
  dueDate: timestamp("due_date").notNull(), // المهلة النظامية (30 يوم من تاريخ التقديم حسب PDPL)
  completedAt: timestamp("completed_at"),
  
  // الرد والمعالجة
  responseNote: text("response_note"), // ملاحظة الرد على الطلب
  handledBy: text("handled_by"), // الموظف المسؤول عن المعالجة
  
  // المرفقات
  attachments: jsonb("attachments"), // [{fileName, fileUrl, uploadedAt}]
  
  // الأولوية
  priority: text("priority").default("medium"), // low, medium, high
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertDsarRequestSchema = createInsertSchema(dsarRequests).omit({
  id: true,
  submittedAt: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  requesterName: z.string().min(2, "يجب إدخال اسم مقدم الطلب"),
  requesterEmail: z.string().email("يجب إدخال بريد إلكتروني صحيح"),
  requestType: z.enum(["access", "delete", "rectify", "restrict", "object", "portability"], {
    required_error: "يجب تحديد نوع الطلب"
  }),
  requestDetails: z.string().min(10, "يجب توضيح تفاصيل الطلب"),
  dueDate: z.preprocess((val) => {
    if (!val) return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Default: 30 days from now
    const date = val instanceof Date ? val : new Date(val as string);
    return isNaN(date.getTime()) ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : date;
  }, z.date()),
});

export type InsertDsarRequest = z.infer<typeof insertDsarRequestSchema>;
export type DsarRequest = typeof dsarRequests.$inferSelect;

// Update schema for DSAR - only allows updating specific mutable fields
export const updateDsarRequestSchema = z.object({
  requesterName: z.string().min(2).optional(),
  requesterEmail: z.string().email().optional(),
  requesterPhone: z.string().optional(),
  requesterIdentification: z.string().optional(),
  requestType: z.enum(["access", "delete", "rectify", "restrict", "object", "portability"]).optional(),
  requestDetails: z.string().min(10).optional(),
  status: z.enum(["new", "in_progress", "completed", "rejected"]).optional(),
  responseNote: z.string().optional(),
  handledBy: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  attachments: z.array(z.object({
    fileName: z.string(),
    fileUrl: z.string(),
    uploadedAt: z.string(),
  })).optional(),
  completedAt: z.preprocess((val) => {
    if (!val || val === '') return null;
    const date = val instanceof Date ? val : new Date(val as string);
    return isNaN(date.getTime()) ? null : date;
  }, z.date().nullable()).optional(),
}).strict(); // strict() prevents extra fields

// DPIA Assessments - تقييم تأثير حماية البيانات (Data Protection Impact Assessment)
export const dpiaAssessments = pgTable("dpia_assessments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // معلومات المشروع
  projectName: text("project_name").notNull(),
  projectDescription: text("project_description").notNull(),
  department: text("department").notNull(),
  
  // طبيعة البيانات
  dataTypes: jsonb("data_types").notNull(), // [{name, category, volume, sensitivity}]
  dataSubjects: text("data_subjects").notNull(), // الفئات المستهدفة: موظفين، عملاء، أطفال، إلخ
  
  // تقييم الضرورة والتناسب
  necessityJustification: text("necessity_justification").notNull(), // لماذا هذه المعالجة ضرورية؟
  proportionalityAssessment: text("proportionality_assessment").notNull(), // هل المعالجة متناسبة مع الغرض؟
  
  // المخاطر المحتملة
  identifiedRisks: jsonb("identified_risks").notNull(), // [{risk, likelihood, impact, severity}]
  
  // التدابير الوقائية
  mitigationMeasures: jsonb("mitigation_measures").notNull(), // [{measure, effectiveness, status}]
  
  // الشفافية والإبلاغ
  transparencyMeasures: text("transparency_measures"), // كيف سيتم إبلاغ أصحاب البيانات؟
  
  // التأثير على الأفراد
  individualImpact: text("individual_impact").notNull(), // high, medium, low
  individualImpactDetails: text("individual_impact_details"), // تفصيل التأثير
  
  // استشارة مسؤول حماية البيانات (DPO)
  dpoConsulted: text("dpo_consulted").default("no"), // yes/no
  dpoRecommendations: text("dpo_recommendations"),
  
  // القرار النهائي
  finalDecision: text("final_decision"), // approved, rejected, approved_with_conditions
  decisionRationale: text("decision_rationale"),
  
  // الحالة
  status: text("status").notNull().default("draft"), // draft, under_review, completed
  
  // المرفقات
  attachments: jsonb("attachments"), // [{fileName, fileUrl, uploadedAt}]
  
  // التقييم
  overallRiskLevel: text("overall_risk_level"), // low, medium, high, critical
  
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  reviewedBy: text("reviewed_by"),
  approvedBy: text("approved_by"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertDpiaAssessmentSchema = createInsertSchema(dpiaAssessments).omit({
  id: true,
  createdAt: true,
  completedAt: true,
  updatedAt: true,
}).extend({
  projectName: z.string().min(3, "يجب إدخال اسم المشروع"),
  projectDescription: z.string().min(10, "يجب وصف المشروع"),
  department: z.string().min(2, "يجب إدخال اسم القسم"),
  dataTypes: z.array(z.object({
    name: z.string(),
    category: z.string(),
    volume: z.string().optional(),
    sensitivity: z.enum(["low", "medium", "high"]),
  })).min(1, "يجب إدخال نوع واحد على الأقل من البيانات"),
  dataSubjects: z.string().min(3, "يجب تحديد الفئات المستهدفة"),
  necessityJustification: z.string().min(10, "يجب توضيح ضرورة المعالجة"),
  proportionalityAssessment: z.string().min(10, "يجب تقييم التناسب"),
  identifiedRisks: z.array(z.object({
    risk: z.string(),
    likelihood: z.enum(["low", "medium", "high"]),
    impact: z.enum(["low", "medium", "high"]),
    severity: z.enum(["low", "medium", "high", "critical"]),
  })).min(1, "يجب تحديد مخاطرة واحدة على الأقل"),
  mitigationMeasures: z.array(z.object({
    measure: z.string(),
    effectiveness: z.enum(["low", "medium", "high"]),
    status: z.enum(["planned", "implemented", "ongoing"]),
  })).min(1, "يجب تحديد تدبير وقائي واحد على الأقل"),
  individualImpact: z.enum(["low", "medium", "high"], {
    required_error: "يجب تقييم التأثير على الأفراد"
  }),
});

export type InsertDpiaAssessment = z.infer<typeof insertDpiaAssessmentSchema>;
export type DpiaAssessment = typeof dpiaAssessments.$inferSelect;

// Update schema for DPIA - only allows updating specific mutable fields
export const updateDpiaAssessmentSchema = insertDpiaAssessmentSchema.partial().extend({
  completedAt: z.preprocess((val) => {
    if (!val || val === '') return null;
    const date = val instanceof Date ? val : new Date(val as string);
    return isNaN(date.getTime()) ? null : date;
  }, z.date().nullable()).optional(),
  reviewedBy: z.string().optional(),
  approvedBy: z.string().optional(),
}).strict();
