import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, integer, boolean, customType } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Custom type for pgvector
const vector = customType<{ data: number[]; driverData: string; config: { dimensions: number } }>({
  dataType(config: { dimensions: number } | undefined) {
    return `vector(${config?.dimensions ?? 1536})`;
  },
  toDriver(value: number[]): string {
    return JSON.stringify(value);
  },
  fromDriver(value: string): number[] {
    return JSON.parse(value);
  },
});

// Compliance Scans - فحوصات الامتثال
export const complianceScans = pgTable("compliance_scans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  url: text("url").notNull(),
  status: text("status").notNull(), // pending, scanning, completed, failed
  scanDate: timestamp("scan_date").defaultNow(),
  completedAt: timestamp("completed_at"),
  overallScore: integer("overall_score"), // 0-100
  complianceLevel: text("compliance_level"), // low, medium, high
  issuesCount: integer("issues_count").default(0),
  criticalCount: integer("critical_count").default(0),
  warningCount: integer("warning_count").default(0),
  suggestionCount: integer("suggestion_count").default(0),
  // Compliance findings
  hasPrivacyPolicy: boolean("has_privacy_policy"),
  privacyPolicyUrl: text("privacy_policy_url"),
  hasTermsAndConditions: boolean("has_terms_and_conditions"),
  termsAndConditionsUrl: text("terms_and_conditions_url"),
  hasCookieBanner: boolean("has_cookie_banner"),
  hasDataCollectionForms: boolean("has_data_collection_forms"),
  hasContactInfo: boolean("has_contact_info"),
  // Technical data
  pageContent: text("page_content"), // HTML content of the scanned page
  analysisResult: jsonb("analysis_result"), // AI analysis result
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  // User ownership - optional for anonymous scans
  userId: varchar("user_id"), // null = anonymous scan
  isClaimedByUser: boolean("is_claimed_by_user").default(false), // true when user claims the scan after login
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
  documentType: text("document_type"), // privacy_policy, terms, cookie_banner, consent, contact_info
  violatingText: text("violating_text"), // Quoted text from the document that violates PDPL
  requirementId: text("requirement_id"), // Reference to requirement in compliance-requirements.json
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
  
  // Publishing workflow fields
  publishStatus: text("publish_status").notNull().default("draft"), // draft, published, archived
  isCurrent: boolean("is_current").notNull().default(false), // Is this the current active policy
  version: integer("version").notNull().default(1), // Version number
  publishedAt: timestamp("published_at"), // When it was published
  archivedAt: timestamp("archived_at"), // When it was archived
  
  // User ownership
  userId: varchar("user_id"), // Owner of this policy
  scanId: varchar("scan_id"), // Linked scan if any
  requestId: varchar("request_id"), // Linked generation request
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPolicyDocumentSchema = createInsertSchema(policyDocuments).omit({
  id: true,
  generatedContent: true,
  status: true,
  publishStatus: true,
  isCurrent: true,
  version: true,
  publishedAt: true,
  archivedAt: true,
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

// Policy Generation Requests - طلبات توليد السياسات
export const policyGenerationRequests = pgTable("policy_generation_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(), // Owner of this request
  scanId: varchar("scan_id"), // Linked scan if any
  
  // Intake data from the form
  intakeData: jsonb("intake_data"), // Complete form data
  
  // Workflow status
  workflowStatus: text("workflow_status").notNull().default("draft"), // draft, awaiting_payment, paid, generating, delivered, failed
  
  // Payment tracking
  paymentStatus: text("payment_status").notNull().default("pending"), // pending, processing, paid, failed, refunded
  
  // Generated policy reference
  policyDocumentId: varchar("policy_document_id"), // null until generation completes
  
  // Email delivery
  emailSent: boolean("email_sent").default(false),
  emailSentAt: timestamp("email_sent_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPolicyGenerationRequestSchema = createInsertSchema(policyGenerationRequests).omit({
  id: true,
  workflowStatus: true,
  paymentStatus: true,
  policyDocumentId: true,
  emailSent: true,
  emailSentAt: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPolicyGenerationRequest = z.infer<typeof insertPolicyGenerationRequestSchema>;
export type PolicyGenerationRequest = typeof policyGenerationRequests.$inferSelect;

// Payments - سجل المدفوعات
export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  requestId: varchar("request_id").notNull(), // Link to policy generation request
  userId: varchar("user_id").notNull(),
  
  // Payment provider details
  provider: text("provider").notNull().default("paypal"), // paypal, stripe, etc.
  providerPaymentId: text("provider_payment_id"), // PayPal order ID
  providerPayerId: text("provider_payer_id"), // PayPal payer ID
  
  // Amount
  amount: integer("amount").notNull(), // Amount in smallest currency unit (cents/halalas)
  currency: text("currency").notNull().default("SAR"),
  
  // Status
  status: text("status").notNull().default("pending"), // pending, processing, succeeded, failed, refunded
  
  // Additional data
  receiptUrl: text("receipt_url"),
  rawPayload: jsonb("raw_payload"), // Raw response from payment provider
  errorMessage: text("error_message"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  status: true,
  rawPayload: true,
  errorMessage: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;

// Discount Codes - أكواد الخصم
export const discountCodes = pgTable("discount_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  discountType: text("discount_type").notNull().default("percentage"), // percentage, fixed
  discountValue: integer("discount_value").notNull(), // percentage (e.g. 20 = 20%) or fixed amount in SAR
  maxUses: integer("max_uses"), // null = unlimited
  currentUses: integer("current_uses").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDiscountCodeSchema = createInsertSchema(discountCodes).omit({
  id: true,
  currentUses: true,
  createdAt: true,
});

export type InsertDiscountCode = z.infer<typeof insertDiscountCodeSchema>;
export type DiscountCode = typeof discountCodes.$inferSelect;

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

// ====================================
// Terms & Conditions Generator with Templates
// مُولّد الشروط والأحكام مع القوالب
// ====================================

// Legal Sources - المصادر القانونية
export const legalSources = pgTable("legal_sources", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(), // e.g., "ECOMMERCE_LAW", "TELECOM_LAW"
  title: text("title").notNull(), // e.g., "نظام التجارة الإلكترونية"
  sourceType: text("source_type").notNull(), // law, regulation, guideline
  sourceUrl: text("source_url"), // URL to official document
  fileReference: text("file_reference"), // Reference to uploaded PDF
  content: text("content"), // Extracted text content
  articles: jsonb("articles"), // [{number, title, content}]
  effectiveDate: timestamp("effective_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertLegalSourceSchema = createInsertSchema(legalSources).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertLegalSource = z.infer<typeof insertLegalSourceSchema>;
export type LegalSource = typeof legalSources.$inferSelect;

// Terms Templates - قوالب الشروط والأحكام
export const termsTemplates = pgTable("terms_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessType: text("business_type").notNull(), // ecommerce_general, ecommerce_automotive, ecommerce_jewelry, telecommunications, digital_services, multi_category
  sector: text("sector"), // retail, services, food, electronics, etc.
  activityScale: text("activity_scale").notNull(), // micro, smb, enterprise
  locale: text("locale").notNull().default("ar-SA"),
  title: text("title").notNull(),
  summary: text("summary"),
  status: text("status").notNull().default("active"), // active, archived, draft
  version: text("version").notNull().default("1.0"),
  effectiveFrom: timestamp("effective_from").defaultNow(),
  effectiveTo: timestamp("effective_to"),
  basePromptSeed: jsonb("base_prompt_seed"), // Metadata for AI generation
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTermsTemplateSchema = createInsertSchema(termsTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTermsTemplate = z.infer<typeof insertTermsTemplateSchema>;
export type TermsTemplate = typeof termsTemplates.$inferSelect;

// Template Sections - أقسام القوالب
export const templateSections = pgTable("template_sections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: text("slug").notNull().unique(), // e.g., "intro", "services", "payment", "liability", "dispute_resolution"
  heading: text("heading").notNull(), // Arabic title
  clauseText: text("clause_text").notNull(), // Template text with {{placeholders}}
  placeholders: jsonb("placeholders"), // [{key: "companyName", description: "اسم الشركة"}]
  riskLevel: text("risk_level").notNull().default("medium"), // low, medium, high, critical
  isRequired: boolean("is_required").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTemplateSectionSchema = createInsertSchema(templateSections).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTemplateSection = z.infer<typeof insertTemplateSectionSchema>;
export type TemplateSection = typeof templateSections.$inferSelect;

// ====================================
// Junction Tables for Many-to-Many Relationships
// ====================================

// Terms Template Sections - ربط القوالب بالأقسام
export const termsTemplateSections = pgTable("terms_template_sections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  templateId: varchar("template_id").notNull().references(() => termsTemplates.id, { onDelete: "cascade" }),
  sectionId: varchar("section_id").notNull().references(() => templateSections.id, { onDelete: "cascade" }),
  ordering: integer("ordering").notNull(), // Display order within template
  isRequired: boolean("is_required").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTermsTemplateSectionSchema = createInsertSchema(termsTemplateSections).omit({
  id: true,
  createdAt: true,
});

export type InsertTermsTemplateSection = z.infer<typeof insertTermsTemplateSectionSchema>;
export type TermsTemplateSection = typeof termsTemplateSections.$inferSelect;

// Section Legal Sources - ربط الأقسام بالمصادر القانونية
export const sectionLegalSources = pgTable("section_legal_sources", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sectionId: varchar("section_id").notNull().references(() => templateSections.id, { onDelete: "cascade" }),
  sourceId: varchar("source_id").notNull().references(() => legalSources.id, { onDelete: "cascade" }),
  articles: jsonb("articles").notNull(), // Array of article numbers: ["5", "6", "7"]
  relevanceNotes: text("relevance_notes"), // Optional notes about why this source applies
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSectionLegalSourceSchema = createInsertSchema(sectionLegalSources).omit({
  id: true,
  createdAt: true,
});

export type InsertSectionLegalSource = z.infer<typeof insertSectionLegalSourceSchema>;
export type SectionLegalSource = typeof sectionLegalSources.$inferSelect;

// Terms Documents - وثائق الشروط والأحكام (Enhanced)
export const termsDocuments = pgTable("terms_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Template reference
  templateId: varchar("template_id").references(() => termsTemplates.id),
  
  // Basic company information
  companyName: text("company_name").notNull(),
  websiteUrl: text("website_url").notNull(),
  businessType: text("business_type").notNull(), // ecommerce_general, ecommerce_automotive, etc.
  sector: text("sector"), // retail, services, food, electronics
  activityScale: text("activity_scale"), // micro, smb, enterprise
  
  // Service details
  serviceDescription: text("service_description").notNull(),
  hasUserAccounts: text("has_user_accounts").notNull(),
  hasSubscriptions: text("has_subscriptions").notNull(),
  
  // E-commerce specific
  paymentMethods: jsonb("payment_methods"),
  refundPolicy: text("refund_policy"),
  shippingPolicy: text("shipping_policy"),
  returnPolicy: text("return_policy"),
  deliveryTimeframe: text("delivery_timeframe"),
  
  // Legal
  liabilityLimits: text("liability_limits"),
  governingLaw: text("governing_law").notNull().default("Saudi Arabia"),
  disputeResolution: text("dispute_resolution"),
  
  // Contact
  contactEmail: text("contact_email").notNull(),
  contactPhone: text("contact_phone"),
  
  // Compliance specific to business type
  hasAgeRestrictions: text("has_age_restrictions"), // yes/no
  requiresLicense: text("requires_license"), // yes/no
  licenseNumber: text("license_number"),
  commercialRegistration: text("commercial_registration"),
  taxNumber: text("tax_number"),
  
  // Generation metadata
  generatedContent: text("generated_content"),
  usedSections: jsonb("used_sections"), // Track which sections were used
  legalReferences: jsonb("legal_references"), // Track legal citations
  status: text("status").notNull().default("pending"), // pending, generating, completed, failed
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTermsDocumentSchema = createInsertSchema(termsDocuments).omit({
  id: true,
  templateId: true,
  generatedContent: true,
  usedSections: true,
  legalReferences: true,
  status: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  companyName: z.string().min(2, "يجب إدخال اسم الشركة"),
  websiteUrl: z.string().url("يجب إدخال رابط صحيح"),
  businessType: z.enum([
    "ecommerce_general",
    "ecommerce_automotive",
    "ecommerce_jewelry",
    "ecommerce_food",
    "ecommerce_electronics",
    "telecommunications",
    "digital_services",
    "multi_category"
  ], {
    required_error: "يجب تحديد نوع النشاط"
  }),
  sector: z.string().nullish(),
  activityScale: z.enum(["micro", "smb", "enterprise"]).nullish(),
  contactEmail: z.string().email("يجب إدخال بريد إلكتروني صحيح"),
  contactPhone: z.string().nullish(),
  serviceDescription: z.string().min(10, "يجب إدخال وصف للخدمة"),
  shippingPolicy: z.string().nullish(),
  returnPolicy: z.string().nullish(),
  deliveryTimeframe: z.string().nullish(),
  hasAgeRestrictions: z.string().nullish(),
  requiresLicense: z.string().nullish(),
  licenseNumber: z.string().nullish(),
  commercialRegistration: z.string().nullish(),
  taxNumber: z.string().nullish(),
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
  })).optional().default([]),
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
  })).optional().default([]),
  dataSubjects: z.string().min(3, "يجب تحديد الفئات المستهدفة"),
  necessityJustification: z.string().min(10, "يجب توضيح ضرورة المعالجة"),
  proportionalityAssessment: z.string().min(10, "يجب تقييم التناسب"),
  identifiedRisks: z.array(z.object({
    risk: z.string(),
    likelihood: z.enum(["low", "medium", "high"]),
    impact: z.enum(["low", "medium", "high"]),
    severity: z.enum(["low", "medium", "high", "critical"]),
  })).optional().default([]),
  mitigationMeasures: z.array(z.object({
    measure: z.string(),
    effectiveness: z.enum(["low", "medium", "high"]),
    status: z.enum(["planned", "implemented", "ongoing"]),
  })).optional().default([]),
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

// ==================== AI ASSISTANT / KNOWLEDGE BASE ====================

// Knowledge Base Articles - قاعدة المعرفة
export const knowledgeArticles = pgTable("knowledge_articles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  titleEn: text("title_en"),
  content: text("content").notNull(),
  contentEn: text("content_en"),
  summary: text("summary"),
  category: text("category").notNull(), // pdpl_law, faq, service_guide, tutorial, glossary
  type: text("type").notNull(), // article, regulation, definition, howto
  language: text("language").notNull().default("ar"), // ar, en, both
  tags: text("tags").array(), // Array of tags for filtering
  keywords: text("keywords").array(), // Search keywords
  relatedArticles: text("related_articles").array(), // Array of article IDs
  viewCount: integer("view_count").default(0),
  helpfulCount: integer("helpful_count").default(0),
  notHelpfulCount: integer("not_helpful_count").default(0),
  isPublished: boolean("is_published").default(true),
  priority: integer("priority").default(0), // For ordering results
  // Vector embedding for semantic search (1536 dimensions for OpenAI text-embedding-3-small)
  embedding: vector("embedding", { dimensions: 1536 }),
  embeddingEn: vector("embedding_en", { dimensions: 1536 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertKnowledgeArticleSchema = createInsertSchema(knowledgeArticles).omit({
  id: true,
  viewCount: true,
  helpfulCount: true,
  notHelpfulCount: true,
  createdAt: true,
  updatedAt: true,
  embedding: true,
  embeddingEn: true,
}).extend({
  title: z.string().min(3, "يجب إدخال عنوان المقالة"),
  content: z.string().min(10, "يجب إدخال محتوى المقالة"),
  category: z.enum(["pdpl_law", "faq", "service_guide", "tutorial", "glossary"]),
  type: z.enum(["article", "regulation", "definition", "howto"]),
  language: z.enum(["ar", "en", "both"]).default("ar"),
});

export type InsertKnowledgeArticle = z.infer<typeof insertKnowledgeArticleSchema>;
export type KnowledgeArticle = typeof knowledgeArticles.$inferSelect;

// Chat Conversations - محادثات المساعد الذكي
export const chatConversations = pgTable("chat_conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"), // Optional: link to user if auth is added
  title: text("title"), // Auto-generated from first question
  language: text("language").default("ar"), // ar, en
  status: text("status").default("active"), // active, archived
  lastMessageAt: timestamp("last_message_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertChatConversationSchema = createInsertSchema(chatConversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertChatConversation = z.infer<typeof insertChatConversationSchema>;
export type ChatConversation = typeof chatConversations.$inferSelect;

// Chat Messages - رسائل المحادثة
export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().references(() => chatConversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // user, assistant, system
  content: text("content").notNull(),
  // Context used for generating the response
  retrievedContext: jsonb("retrieved_context"), // Array of relevant KB articles
  // Feedback
  wasHelpful: boolean("was_helpful"),
  feedbackText: text("feedback_text"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true,
}).extend({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().min(1, "يجب إدخال محتوى الرسالة"),
});

export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;

// Relations for AI Assistant
export const chatConversationsRelations = relations(chatConversations, ({ many }) => ({
  messages: many(chatMessages),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  conversation: one(chatConversations, {
    fields: [chatMessages.conversationId],
    references: [chatConversations.id],
  }),
}));

// ============================================
// Client Authentication & Management System
// ============================================

// Users (Clients) - العملاء
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password"), // nullable for OTP-only users
  name: text("name"), // optional for OTP flow
  isEmailVerified: boolean("is_email_verified").default(false),
  emailVerificationToken: text("email_verification_token"),
  resetPasswordToken: text("reset_password_token"),
  resetPasswordExpiry: timestamp("reset_password_expiry"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  isEmailVerified: true,
  emailVerificationToken: true,
  resetPasswordToken: true,
  resetPasswordExpiry: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  email: z.string().email("يجب إدخال بريد إلكتروني صحيح"),
  password: z.string().min(8, "يجب أن تكون كلمة المرور 8 أحرف على الأقل").optional(),
  name: z.string().min(2, "يجب إدخال الاسم").optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// OTP Tokens - رموز التحقق المؤقتة
export const otpTokens = pgTable("otp_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull(),
  codeHash: text("code_hash").notNull(), // bcrypt hashed OTP code
  expiresAt: timestamp("expires_at").notNull(),
  verified: boolean("verified").default(false),
  attemptCount: integer("attempt_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertOtpTokenSchema = createInsertSchema(otpTokens).omit({
  id: true,
  verified: true,
  attemptCount: true,
  createdAt: true,
});

export type InsertOtpToken = z.infer<typeof insertOtpTokenSchema>;
export type OtpToken = typeof otpTokens.$inferSelect;

// Client Policies - سياسات العملاء
export const clientPolicies = pgTable("client_policies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  websiteName: text("website_name").notNull(),
  websiteUrl: text("website_url"),
  policyType: text("policy_type").notNull(), // privacy, cookies, terms
  status: text("status").notNull().default("draft"), // draft, active, needs_update
  
  // Reference to generated documents
  policyDocumentId: varchar("policy_document_id").references(() => policyDocuments.id),
  termsDocumentId: varchar("terms_document_id").references(() => termsDocuments.id),
  
  // Embed code for website integration
  embedCode: text("embed_code"),
  
  lastModified: timestamp("last_modified").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertClientPolicySchema = createInsertSchema(clientPolicies).omit({
  id: true,
  embedCode: true,
  lastModified: true,
  createdAt: true,
}).extend({
  userId: z.string(),
  websiteName: z.string().min(2, "يجب إدخال اسم الموقع"),
  policyType: z.enum(["privacy", "cookies", "terms"], {
    required_error: "يجب تحديد نوع السياسة"
  }),
  status: z.enum(["draft", "active", "needs_update"]).default("draft"),
});

export type InsertClientPolicy = z.infer<typeof insertClientPolicySchema>;
export type ClientPolicy = typeof clientPolicies.$inferSelect;

// Client Requests - طلبات العملاء
export const clientRequests = pgTable("client_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  requestNumber: text("request_number").notNull().unique(), // REQ-20250116-0001
  requestType: text("request_type").notNull(), // create_policy, modify_policy, consultation, support
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("pending"), // pending, in_progress, completed, rejected, awaiting_info
  priority: text("priority").default("normal"), // low, normal, high, urgent
  
  // Related policy if applicable
  relatedPolicyId: varchar("related_policy_id").references(() => clientPolicies.id),
  
  // Staff notes and responses
  staffNotes: text("staff_notes"),
  staffResponse: text("staff_response"),
  assignedTo: text("assigned_to"), // Staff member handling the request
  
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertClientRequestSchema = createInsertSchema(clientRequests).omit({
  id: true,
  requestNumber: true,
  staffNotes: true,
  staffResponse: true,
  assignedTo: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  userId: z.string(),
  requestType: z.enum(["create_policy", "modify_policy", "consultation", "support"], {
    required_error: "يجب تحديد نوع الطلب"
  }),
  title: z.string().min(3, "يجب إدخال عنوان الطلب"),
  status: z.enum(["pending", "in_progress", "completed", "rejected", "awaiting_info"]).default("pending"),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
});

export type InsertClientRequest = z.infer<typeof insertClientRequestSchema>;
export type ClientRequest = typeof clientRequests.$inferSelect;

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  policies: many(clientPolicies),
  requests: many(clientRequests),
}));

export const clientPoliciesRelations = relations(clientPolicies, ({ one, many }) => ({
  user: one(users, {
    fields: [clientPolicies.userId],
    references: [users.id],
  }),
  policyDocument: one(policyDocuments, {
    fields: [clientPolicies.policyDocumentId],
    references: [policyDocuments.id],
  }),
  termsDocument: one(termsDocuments, {
    fields: [clientPolicies.termsDocumentId],
    references: [termsDocuments.id],
  }),
  requests: many(clientRequests),
}));

export const clientRequestsRelations = relations(clientRequests, ({ one }) => ({
  user: one(users, {
    fields: [clientRequests.userId],
    references: [users.id],
  }),
  relatedPolicy: one(clientPolicies, {
    fields: [clientRequests.relatedPolicyId],
    references: [clientPolicies.id],
  }),
}));

// ============================================
// Admin Portal Tables
// ============================================

// Admin Users - المستخدمون الإداريون
export const adminUsers = pgTable("admin_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("support"), // admin, legal, support
  isActive: boolean("is_active").notNull().default(true),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAdminUserSchema = createInsertSchema(adminUsers).omit({
  id: true,
  lastLogin: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  email: z.string().email("يجب إدخال بريد إلكتروني صحيح"),
  password: z.string().min(8, "يجب أن تكون كلمة المرور 8 أحرف على الأقل"),
  name: z.string().min(2, "يجب إدخال الاسم"),
  role: z.enum(["admin", "legal", "support"]).default("support"),
});

export type InsertAdminUser = z.infer<typeof insertAdminUserSchema>;
export type AdminUser = typeof adminUsers.$inferSelect;

// Audit Logs - سجل التدقيق
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  adminUserId: varchar("admin_user_id").references(() => adminUsers.id),
  action: text("action").notNull(), // login, logout, create_user, update_policy, etc.
  entityType: text("entity_type"), // user, policy, request, etc.
  entityId: text("entity_id"),
  details: text("details"), // JSON string with additional info
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
}).extend({
  action: z.string().min(1, "يجب تحديد الإجراء"),
});

export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;

// Relations
export const adminUsersRelations = relations(adminUsers, ({ many }) => ({
  auditLogs: many(auditLogs),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  adminUser: one(adminUsers, {
    fields: [auditLogs.adminUserId],
    references: [adminUsers.id],
  }),
}));

// ====================================
// Deterministic Scanner Types
// أنواع الماسح الحتمي
// ====================================

// Extracted Cookie Data
export interface ExtractedCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires?: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: string;
  thirdParty: boolean;
  category?: 'necessary' | 'analytics' | 'marketing' | 'performance' | 'unknown';
}

// Extracted Script Data
export interface ExtractedScript {
  type: 'inline' | 'external';
  src?: string;
  content?: string;
  async: boolean;
  defer: boolean;
  position: 'head' | 'body';
}

// Detected Tracking Technology
export interface DetectedTracker {
  name: string;
  type: 'analytics' | 'advertising' | 'social' | 'heatmap' | 'other';
  detected_via: 'script' | 'cookie' | 'network' | 'dom';
  evidence: string;
  thirdParty: boolean;
  vendor?: string;
}

// Form Field with Personal Data
export interface ExtractedFormField {
  name: string;
  type: string;
  id?: string;
  placeholder?: string;
  required: boolean;
  dataCategory: 'name' | 'email' | 'phone' | 'address' | 'id_number' | 'financial' | 'health' | 'other';
  formAction?: string;
  formMethod?: string;
}

// Third Party Service
export interface ThirdPartyService {
  name: string;
  domain: string;
  type: 'cdn' | 'analytics' | 'advertising' | 'social' | 'payment' | 'other';
  dataShared: boolean;
  crossBorder: boolean;
  country?: string;
}

// Security Headers
export interface SecurityHeaders {
  https: boolean;
  hsts: boolean;
  hstsMaxAge?: number;
  csp: boolean;
  cspValue?: string;
  xFrameOptions: boolean;
  xContentTypeOptions: boolean;
  referrerPolicy: boolean;
  referrerPolicyValue?: string;
}

// Privacy Policy Detection Result
export interface PrivacyPolicyResult {
  found: boolean;
  url?: string;
  detection_method: 'link_text' | 'url_pattern' | 'meta_tag' | 'not_found';
  content_accessible: boolean;
  content_length?: number;
  language?: string;
  elements_found: string[];
  elements_missing: string[];
}

// Terms Detection Result
export interface TermsResult {
  found: boolean;
  url?: string;
  detection_method: 'link_text' | 'url_pattern' | 'meta_tag' | 'not_found';
  content_accessible: boolean;
  content_length?: number;
}

// Terms & Conditions 12-Module Audit Result
export interface TermsConditionsAuditResult {
  modulesFound: number;
  modulesPartial: number;
  modulesMissing: number;
  compliancePercentage: number;
  isComplete: boolean;
  summary: string;
  modules: Array<{
    moduleId: string;
    number: number;
    titleAr: string;
    titleEn: string;
    status: 'موجود بالكامل' | 'ناقص أو غير واضح' | 'غير موجود';
    statusEn: 'FOUND' | 'PARTIAL' | 'MISSING';
    evidence: string;
    notes: string;
    matchCount: number;
    matchedKeywords: string[];
    requirementAr?: string;
  }>;
}

// Cookie Banner Detection Result
export interface CookieBannerResult {
  found: boolean;
  detection_method: 'dom_element' | 'script' | 'css_class' | 'text_content' | 'not_found';
  has_accept_button: boolean;
  has_reject_button: boolean;
  has_settings_option: boolean;
  consent_mechanism: 'opt_in' | 'opt_out' | 'implied' | 'none';
  evidence?: string;
}

// Contact Info Detection Result
export interface ContactInfoResult {
  found: boolean;
  email?: string;
  phone?: string;
  address?: string;
  form_found: boolean;
  detection_methods: string[];
}

// PDPL Rule Evaluation Result
export interface PDPLRuleResult {
  rule_id: string;
  rule_name: string;
  article: string;
  data_source: string;
  condition: string;
  result: 'pass' | 'fail' | 'not_applicable' | 'unable_to_detect';
  explanation: string;
  severity: 'critical' | 'warning' | 'suggestion';
  evidence?: string;
}

// Full Extraction Result
export interface ScanExtractionResult {
  url: string;
  scan_timestamp: string;
  scan_duration_ms: number;
  
  // Raw Extracted Data
  html_length: number;
  scripts: ExtractedScript[];
  cookies: ExtractedCookie[];
  trackers: DetectedTracker[];
  forms: ExtractedFormField[];
  third_party_services: ThirdPartyService[];
  security: SecurityHeaders;
  
  // Detection Results
  privacy_policy: PrivacyPolicyResult;
  terms_and_conditions: TermsResult;
  cookie_banner: CookieBannerResult;
  contact_info: ContactInfoResult;
  
  // Errors
  scan_errors: string[];
}

// Final Deterministic Analysis Result
export interface DeterministicScanResult {
  url: string;
  scan_timestamp: string;
  scan_duration_ms: number;
  
  // Extracted Data Summary
  privacy_policy: PrivacyPolicyResult;
  terms_and_conditions?: TermsResult;
  cookies: {
    total: number;
    first_party: number;
    third_party: number;
    secure_cookies: number;
    http_only_cookies: number;
    session_cookies: number;
    persistent_cookies: number;
    by_category: Record<string, number>;
    list: ExtractedCookie[];
  };
  tracking: DetectedTracker[];
  personal_data_collection: {
    forms_count: number;
    fields: ExtractedFormField[];
    sensitive_data_types: string[];
  };
  data_transfers: {
    third_party_services: ThirdPartyService[];
    cross_border_transfers: ThirdPartyService[];
  };
  security: SecurityHeaders & {
    secure_cookie_percentage: number;
    overall_security_score: number;
  };
  
  // PDPL Compliance
  pdpl_violations: PDPLRuleResult[];
  pdpl_passed_rules: PDPLRuleResult[];
  
  // Scoring
  overall_score: number;
  compliance_level: 'high' | 'medium' | 'low';
  score_breakdown: {
    privacy_policy_score: number;
    consent_score: number;
    security_score: number;
    transparency_score: number;
  };
  
  // Per-Document PDPL Compliance Audit
  document_audits?: Array<{
    type: 'privacy' | 'terms' | 'cookies';
    name: string;
    url: string;
    found: boolean;
    audit: {
      totalChecks: number;
      found: number;
      missing: number;
      partial: number;
      transparencyScore: number;
      items: Array<{
        id: string;
        name: string;
        nameAr: string;
        pdplArticle: string;
        status: 'found' | 'missing' | 'partial';
        matchedKeywords: string[];
        required: boolean;
      }>;
      summary: {
        compliant: boolean;
        criticalMissing: string[];
        recommendations: string[];
      };
    } | null;
    // 12-element PDPL privacy policy audit
    privacyPolicyAudit?: {
      elementsFound: number;
      elementsPartial: number;
      elementsMissing: number;
      compliancePercentage: number;
      isComplete: boolean;
      summary: string;
      elements: Array<{
        id: string;
        number: number;
        nameAr: string;
        nameEn: string;
        status: 'موجود بالكامل' | 'ناقص أو غير واضح' | 'غير موجود';
        statusEn: 'FOUND' | 'PARTIAL' | 'MISSING';
        evidence: string;
        notes: string;
        matchCount: number;
        matchedKeywords: string[];
      }>;
    };
    // 12-module Terms & Conditions audit
    termsConditionsAudit?: TermsConditionsAuditResult;
  }>;
  
  // Top-level 12-module Terms & Conditions audit
  terms_conditions_audit?: TermsConditionsAuditResult;
  
  // Overall Compliance Summary
  compliance_summary?: {
    allDocumentsFound: boolean;
    overallCompliance: number;
    documentsAudited: number;
    criticalGaps: string[];
  };
  
  // Errors
  scan_errors: string[];
  partial_analysis: boolean;
}
