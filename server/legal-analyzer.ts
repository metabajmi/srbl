import OpenAI from "openai";
import * as fs from "fs";
import * as path from "path";
import * as cheerio from "cheerio";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { 
  splitIntoSentences, 
  findColocatedTerms, 
  findSentencesWithTerms,
  hasTopicWithConsent,
  countAffirmativeTerms,
  type Sentence 
} from "./utils/text-processor";
import {
  analyzeTermsDocument,
  analyzeCookiePolicy,
  analyzeReturnPolicy,
  analyzeDocument,
  type DocumentType,
  type DocumentAnalysisReport,
  type AnalysisResult
} from "./analyzers/document-analyzers";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const apiKey = process.env.OPENAI_API_KEY;
const openai = new OpenAI({ apiKey: apiKey || "missing-key" });

export interface LegalArticle {
  id: string;
  category: string;
  textAr: string;
  textEn: string;
  source: string;
  article?: string;
  severity: string;
  description?: string;
}

export interface LegalViolation {
  requirementId: string;
  articleReference: string;
  severity: "critical" | "warning" | "suggestion";
  category: string;
  title: string;
  description: string;
  violatingText: string | null;
  remediation: string;
  documentType: "privacy_policy" | "terms" | "cookie_banner" | "consent";
  confidence: number;
}

let legalKnowledgeBase: LegalArticle[] = [];

export function loadLegalKnowledgeBase(): LegalArticle[] {
  if (legalKnowledgeBase.length > 0) return legalKnowledgeBase;
  
  const requirementsPath = path.join(__dirname, "knowledge/pdpl/compliance-requirements.json");
  const data = JSON.parse(fs.readFileSync(requirementsPath, "utf-8"));
  
  const articles: LegalArticle[] = [];
  
  if (data.privacyPolicyRequirements?.mandatoryElements) {
    for (const el of data.privacyPolicyRequirements.mandatoryElements) {
      articles.push({
        id: el.id,
        category: "privacy_policy",
        textAr: el.ar,
        textEn: el.en,
        source: data.privacyPolicyRequirements.legalBasis,
        severity: el.severity,
        description: el.description,
      });
    }
  }
  
  if (data.dataSubjectRights?.rights) {
    for (const right of data.dataSubjectRights.rights) {
      articles.push({
        id: right.id,
        category: "data_rights",
        textAr: right.ar,
        textEn: right.en,
        source: data.dataSubjectRights.source,
        article: right.article,
        severity: "critical",
        description: right.description,
      });
    }
  }
  
  if (data.cookieConsentRequirements?.requirements) {
    for (const req of data.cookieConsentRequirements.requirements) {
      articles.push({
        id: req.id,
        category: "cookies",
        textAr: req.ar,
        textEn: req.en,
        source: data.cookieConsentRequirements.source,
        severity: req.severity,
      });
    }
  }
  
  if (data.termsAndConditionsRequirements?.requirements) {
    for (const req of data.termsAndConditionsRequirements.requirements) {
      articles.push({
        id: req.id,
        category: "terms",
        textAr: req.ar,
        textEn: req.en,
        source: data.termsAndConditionsRequirements.source,
        severity: req.severity,
      });
    }
  }
  
  if (data.ecommerceComplianceChecklist?.requirements) {
    for (const req of data.ecommerceComplianceChecklist.requirements) {
      articles.push({
        id: `ecom${req.id}`,
        category: req.category,
        textAr: req.ar,
        textEn: req.en,
        source: data.ecommerceComplianceChecklist.source,
        severity: req.severity,
      });
    }
  }
  
  // Load Cookie Policy Requirements
  if (data.cookiePolicyRequirements?.requirements) {
    for (const req of data.cookiePolicyRequirements.requirements) {
      articles.push({
        id: req.id,
        category: "cookie_policy",
        textAr: req.ar,
        textEn: req.en,
        source: data.cookiePolicyRequirements.source,
        severity: req.severity,
        description: req.description,
      });
    }
  }
  
  // Load Return/Refund Policy Requirements
  if (data.returnRefundPolicyRequirements?.requirements) {
    for (const req of data.returnRefundPolicyRequirements.requirements) {
      articles.push({
        id: req.id,
        category: "return_policy",
        textAr: req.ar,
        textEn: req.en,
        source: data.returnRefundPolicyRequirements.source,
        severity: req.severity,
        description: req.description,
      });
    }
  }
  
  legalKnowledgeBase = articles;
  console.log(`[LEGAL_KB] Loaded ${articles.length} legal requirements`);
  return articles;
}

function getRelevantRequirements(documentType: "privacy_policy" | "terms"): LegalArticle[] {
  const kb = loadLegalKnowledgeBase();
  
  if (documentType === "privacy_policy") {
    return kb.filter(a => 
      a.category === "privacy_policy" || 
      a.category === "data_rights" ||
      a.category === "cookies"
    );
  } else {
    // For terms: Only check requirements that can actually be verified by reading the page
    // Exclude invoice-related requirements (ecom9-18) - these can't be verified from website scanning
    // Exclude commercial registration/tax ID - these require specific verification
    const termsReqs = kb.filter(a => 
      a.category === "terms" ||
      a.category === "return_policy"
    );
    
    // Filter out non-verifiable requirements from terms analysis
    const excludedIds = [
      'ecom9', 'ecom10', 'ecom11', 'ecom12', 'ecom13', 'ecom14', 'ecom15', 
      'ecom16', 'ecom17', 'ecom18', 'ecom19', 'ecom20', // Invoice items
      'tc4', 'tc5' // Commercial registration and tax ID - need specific documents
    ];
    
    return termsReqs.filter(req => !excludedIds.includes(req.id));
  }
}

function formatRequirementsForPrompt(requirements: LegalArticle[]): string {
  return requirements.map(req => 
    `[${req.id}] ${req.textAr}
  - المصدر: ${req.source}${req.article ? ` - ${req.article}` : ''}
  - الأهمية: ${req.severity === 'critical' ? 'حرج' : req.severity === 'warning' ? 'تحذير' : 'اقتراح'}
  ${req.description ? `- التفصيل: ${req.description}` : ''}`
  ).join('\n\n');
}

// Negation detection - check if phrase appears after negation
function isNegatedContext(text: string, keyword: string): boolean {
  const keywordIndex = text.indexOf(keyword.toLowerCase());
  if (keywordIndex === -1) return false;
  
  // Check 50 characters before the keyword for negation patterns
  const contextStart = Math.max(0, keywordIndex - 50);
  const context = text.substring(contextStart, keywordIndex).toLowerCase();
  
  const negations = [
    // Arabic negations
    'لا نجمع', 'لن نجمع', 'لم نجمع', 'لا نستخدم', 'لا نحصل', 'لا نشارك',
    'دون جمع', 'بدون جمع', 'لا يتم جمع', 'لا يتم استخدام',
    'لا نقوم بجمع', 'لا نقوم باستخدام',
    // English negations
    'do not collect', 'don\'t collect', 'does not collect', 'doesn\'t collect',
    'never collect', 'will not collect', 'won\'t collect',
    'do not use', 'don\'t use', 'never use', 'without collecting',
    'we do not', 'we don\'t', 'we never'
  ];
  
  return negations.some(neg => context.includes(neg.toLowerCase()));
}

// Collection verbs for data collection analysis
const COLLECTION_VERBS = [
  // Arabic
  'نجمع', 'نحصل على', 'نقوم بجمع', 'البيانات التي نجمعها', 'المعلومات التي نجمعها',
  'تشمل البيانات المجمعة', 'البيانات المجمعة تشمل', 'نجمع منك', 'نجمع عنك',
  'قد نجمع', 'يتم جمع', 'البيانات المجموعة',
  // English
  'we collect', 'we gather', 'we obtain', 'we may collect', 'information we collect',
  'data we collect', 'types of data we collect', 'data types we collect',
  'types of information', 'personal data we collect', 'data collected'
];

// Specific data types to look for
const SPECIFIC_DATA_TYPES = [
  // Arabic - identity
  'الاسم', 'الاسم الكامل', 'اسمك',
  // Arabic - contact
  'البريد الإلكتروني', 'الإيميل', 'بريدك',
  'رقم الهاتف', 'رقم الجوال', 'هاتفك', 
  'العنوان البريدي', 'عنوانك',
  // Arabic - technical
  'عنوان ip', 'عنوان الـ ip',
  'نوع المتصفح', 'معلومات الجهاز', 'نظام التشغيل',
  // Arabic - financial
  'معلومات الدفع', 'بيانات الدفع', 'بطاقة الائتمان',
  // Arabic - account
  'اسم المستخدم', 'كلمة المرور',
  // English - identity
  'full name', 'first name', 'last name', 'your name',
  // English - contact
  'email address', 'phone number', 'postal address', 'mailing address',
  // English - technical
  'ip address', 'browser type', 'device information', 'operating system',
  // English - financial
  'payment information', 'credit card', 'billing information',
  // English - account
  'username', 'password',
  // Categories
  'بيانات الهوية', 'بيانات الاتصال', 'بيانات تقنية', 'بيانات مالية',
  'identity data', 'contact data', 'technical data', 'financial data'
];

// Deterministic check for affirmative data collection statements with specific types
// USES SENTENCE-LEVEL ANALYSIS: collection verb AND data type must be in SAME SENTENCE
function hasAffirmativeDataTypeCollection(text: string): boolean {
  // Split text into sentences for precise analysis
  const sentences = splitIntoSentences(text);
  
  // Find sentences with BOTH collection verb AND data type (excluding negated and contact sections)
  const matches = findColocatedTerms(
    sentences,
    COLLECTION_VERBS,
    SPECIFIC_DATA_TYPES,
    { excludeNegated: true, excludeContactSections: true }
  );
  
  if (matches.length > 0) {
    console.log(`[DETERMINISTIC] Found ${matches.length} sentence(s) with collection verb + data type:`);
    for (const match of matches.slice(0, 3)) { // Log first 3 matches
      console.log(`  - "${match.sentence.text.substring(0, 100)}..." [terms: ${match.matchedTerms.join(', ')}]`);
    }
    return true;
  }
  
  console.log(`[DETERMINISTIC] No sentence found with collection verb + data type in affirmative context`);
  return false;
}

// Rights terms for data subject rights analysis
const SPECIFIC_RIGHTS = [
  // Arabic
  'حق الوصول', 'حق الاطلاع', 'الوصول إلى بياناتك',
  'حق التصحيح', 'تصحيح بياناتك', 'تعديل بياناتك',
  'حق الحذف', 'حق الإتلاف', 'حذف بياناتك', 'إتلاف بياناتك',
  'حق الاعتراض', 'الاعتراض على المعالجة',
  'حق نقل البيانات', 'نقل بياناتك',
  'سحب الموافقة', 'سحب موافقتك', 'إلغاء الموافقة',
  'حق العلم', 'حق طلب الحصول',
  // English
  'right to access', 'right of access', 'access your data',
  'right to rectification', 'right to correct', 'correct your data', 'update your data',
  'right to erasure', 'right to deletion', 'right to delete', 'delete your data',
  'right to object', 'object to processing',
  'right to data portability', 'data portability', 'export your data',
  'withdraw consent', 'revoke consent', 'right to be informed'
];

// Marketing terms
const MARKETING_KEYWORDS = [
  'تسويق', 'ترويج', 'إعلان', 'عروض ترويجية', 'رسائل ترويجية', 
  'رسائل إعلانية', 'نشرة إخبارية',
  'marketing', 'promotional', 'advertising', 'newsletter'
];

// Consent mechanism terms
const CONSENT_KEYWORDS = [
  // Opt-in
  'موافقة صريحة', 'موافقتك المسبقة', 'موافقة مسبقة', 'opt-in', 'opt in', 
  'explicit consent', 'بموافقتك', 'الموافقة المسبقة',
  // Opt-out
  'إلغاء الاشتراك', 'unsubscribe', 'opt-out', 'opt out', 
  'إيقاف الرسائل', 'إلغاء الموافقة', 'withdraw consent', 'cancel subscription',
  'رابط إلغاء', 'unsubscribe link'
];

// Deterministic check for specific rights mentioned
// USES SENTENCE-LEVEL ANALYSIS with negation handling
function hasSpecificRightsMentioned(text: string): boolean {
  const sentences = splitIntoSentences(text);
  
  // Find non-negated sentences mentioning rights
  const matches = findSentencesWithTerms(sentences, SPECIFIC_RIGHTS, { excludeNegated: true });
  
  if (matches.length > 0) {
    console.log(`[DETERMINISTIC] Found ${matches.length} sentence(s) mentioning rights:`);
    for (const match of matches.slice(0, 3)) {
      console.log(`  - Rights found: ${match.matchedTerms.join(', ')}`);
    }
    return true;
  }
  
  return false;
}

// Deterministic check for marketing consent mechanism - uses sentence-level analysis
function hasMarketingWithConsentMechanism(text: string): { mentionsMarketing: boolean; marketingNegated: boolean; hasConsent: boolean } {
  const sentences = splitIntoSentences(text);
  
  // Use the sentence-level topic/consent checker
  const result = hasTopicWithConsent(sentences, MARKETING_KEYWORDS, CONSENT_KEYWORDS);
  
  console.log(`[DETERMINISTIC] Marketing check: hasTopic=${result.hasTopic}, topicNegated=${result.topicNegated}, hasConsent=${result.hasConsent}`);
  
  return { 
    mentionsMarketing: result.hasTopic, 
    marketingNegated: result.topicNegated, 
    hasConsent: result.hasConsent 
  };
}

// False positive detection - check if element actually exists in text with STRICT validation
// Uses deterministic checks to verify AI findings and reduce false positives
function verifyViolationAgainstText(violation: LegalViolation, textLower: string): boolean {
  const title = violation.title;
  const reqId = violation.requirementId;
  
  // Check for identity/company name - pp1
  if (reqId === 'pp1' || title.includes('اسم الجهة') || title.includes('هوية')) {
    const hasCompanyName = 
      /مكتبة|شركة|مؤسسة|متجر|store|company|جرير|jarir|اكسترا|extra/i.test(textLower) ||
      textLower.includes('نبذة عن') ||
      textLower.includes('من نحن');
    if (hasCompanyName) return false;
  }
  
  // Check for contact info - pp2 or ecom2
  if (reqId === 'pp2' || reqId === 'ecom2' || title.includes('معلومات اتصال') || title.includes('تواصل')) {
    const hasContactInfo = 
      /@[a-z0-9.-]+\.[a-z]{2,}/i.test(textLower) || // email
      /\d{9,}/i.test(textLower) || // phone
      /صندوق بريد|ص\.ب|p\.o\.box/i.test(textLower) || // PO Box
      /شارع|طريق|حي|street|road/i.test(textLower) || // address
      textLower.includes('للتواصل') ||
      textLower.includes('اتصل بنا');
    if (hasContactInfo) return false;
  }
  
  // pp3 - Data types specification
  // AI reported violation - verify deterministically with context
  if (reqId === 'pp3') {
    // Check if policy actually has collection verb + specific data types
    if (hasAffirmativeDataTypeCollection(textLower)) {
      console.log(`[RAG_VERIFY] pp3 (data types): OVERRIDE AI - found affirmative collection with specific types`);
      return false; // False positive - policy does specify data types
    }
    console.log(`[RAG_VERIFY] pp3 (data types): AI violation CONFIRMED - no affirmative data type collection found`);
    return true; // Real violation
  }
  
  // Check for data collection methods - pp4
  if (reqId === 'pp4' || title.includes('طرق جمع') || title.includes('جمع البيانات')) {
    const hasCollectionInfo = 
      textLower.includes('نجمع') ||
      textLower.includes('جمع المعلومات') ||
      textLower.includes('متى نجمع') ||
      textLower.includes('كيف نجمع') ||
      textLower.includes('we collect');
    if (hasCollectionInfo) return false;
  }
  
  // Check for data processing purposes - pp5
  if (reqId === 'pp5' || title.includes('غرض') || title.includes('معالجة')) {
    const hasUsageInfo = 
      textLower.includes('نستخدم') ||
      textLower.includes('كيف نستخدم') ||
      textLower.includes('الغرض') ||
      textLower.includes('من أجل') ||
      textLower.includes('we use');
    if (hasUsageInfo) return false;
  }
  
  // Check for data sharing - pp6
  if (reqId === 'pp6' || title.includes('مشاركة') || title.includes('أطراف')) {
    const hasSharingInfo = 
      textLower.includes('نشارك') ||
      textLower.includes('مشاركة') ||
      textLower.includes('أطراف أخرى') ||
      textLower.includes('طرف ثالث') ||
      textLower.includes('لا نبيع') ||
      textLower.includes('third party');
    if (hasSharingInfo) return false;
  }
  
  // Check for data retention - pp7
  if (reqId === 'pp7' || title.includes('احتفاظ') || title.includes('تخزين') || title.includes('إتلاف')) {
    const hasRetentionInfo = 
      textLower.includes('نحتفظ') ||
      textLower.includes('الاحتفاظ') ||
      textLower.includes('تخزين') ||
      textLower.includes('نخزن') ||
      textLower.includes('إتلاف') ||
      textLower.includes('حذف') ||
      textLower.includes('retention');
    if (hasRetentionInfo) return false;
  }
  
  // pp8 - Data subject rights
  // AI reported violation - verify deterministically
  if (reqId === 'pp8' || reqId?.startsWith('r')) {
    // Check if policy actually mentions specific rights
    if (hasSpecificRightsMentioned(textLower)) {
      console.log(`[RAG_VERIFY] pp8/rights: OVERRIDE AI - found specific rights mentioned`);
      return false; // False positive - policy does mention rights
    }
    console.log(`[RAG_VERIFY] pp8/rights: AI violation CONFIRMED - no specific rights found`);
    return true; // Real violation
  }
  
  // pp11 - Marketing consent
  // AI reported violation - verify deterministically with negation handling
  if (reqId === 'pp11') {
    const marketingCheck = hasMarketingWithConsentMechanism(textLower);
    
    // If marketing not mentioned at all, no consent needed
    if (!marketingCheck.mentionsMarketing) {
      console.log(`[RAG_VERIFY] pp11: OVERRIDE AI - marketing not mentioned, no consent needed`);
      return false; // False positive
    }
    
    // If marketing is explicitly negated ("we do not use for marketing"), no consent needed
    if (marketingCheck.marketingNegated) {
      console.log(`[RAG_VERIFY] pp11: OVERRIDE AI - marketing explicitly negated`);
      return false; // False positive - negated marketing
    }
    
    // If marketing mentioned WITH consent/opt-out mechanism, compliant
    if (marketingCheck.hasConsent) {
      console.log(`[RAG_VERIFY] pp11: OVERRIDE AI - marketing WITH consent mechanism`);
      return false; // False positive - has consent
    }
    
    console.log(`[RAG_VERIFY] pp11: AI violation CONFIRMED - marketing without consent mechanism`);
    return true; // Real violation
  }
  
  // Check for cookies info - c1-c4
  if (reqId?.startsWith('c') || title.includes('ملفات تعريف الارتباط') || title.includes('كوكيز')) {
    const hasCookieInfo = 
      textLower.includes('ملفات تعريف الارتباط') ||
      textLower.includes('سجلات المتصفح') ||
      textLower.includes('cookies') ||
      textLower.includes('cookie');
    // If cookies are mentioned in privacy policy, it shows some level of disclosure
    if (hasCookieInfo) {
      // Cookie refusal/consent issues should be suppressed when analyzing policy text
      // because the cookie banner check is done at homepage level, not policy level
      console.log(`[RAG_VERIFY] Skipping cookie-related issue (handled at homepage level): ${title}`);
      return false;
    }
  }
  
  // Skip cookie-related issues entirely when analyzing policy documents
  if (title.includes('ملفات تعريف الارتباط') || title.includes('كوكيز') || 
      title.includes('رفض') && title.includes('ملفات') ||
      title.includes('سحب الموافقة')) {
    const hasCookieControl = 
      textLower.includes('إعدادات المتصفح') ||
      textLower.includes('browser settings') ||
      textLower.includes('تعطيل') ||
      textLower.includes('حذف') ||
      textLower.includes('إزالة') ||
      textLower.includes('رفض') ||
      textLower.includes('disable') ||
      textLower.includes('delete');
    if (hasCookieControl) {
      console.log(`[RAG_VERIFY] Skipping cookie control issue (browser settings mentioned): ${title}`);
      return false;
    }
  }
  
  // Check for account deletion - ecom6
  if (reqId === 'ecom6' || title.includes('إلغاء حساب') || title.includes('حذف حساب')) {
    const hasAccountDeletion = 
      textLower.includes('إلغاء') ||
      textLower.includes('حذف') ||
      textLower.includes('إزالة') ||
      textLower.includes('delete account') ||
      textLower.includes('حسابك') ||
      textLower.includes('إلغاء اشتراك') ||
      textLower.includes('إلغاء أو حذف');
    if (hasAccountDeletion) return false;
  }
  
  // Check for consent withdrawal - c3
  if (reqId === 'c3' || title.includes('سحب الموافقة')) {
    const hasConsentWithdrawal = 
      textLower.includes('سحب') ||
      textLower.includes('إلغاء') ||
      textLower.includes('تراجع') ||
      textLower.includes('withdraw') ||
      textLower.includes('opt-out') ||
      textLower.includes('إلغاء اشتراك');
    if (hasConsentWithdrawal) return false;
  }
  
  // Check for complaints/grievances - pp9
  if (reqId === 'pp9' || title.includes('شكاوى') || title.includes('اعتراض')) {
    const hasComplaintsInfo = 
      textLower.includes('شكوى') ||
      textLower.includes('شكاوى') ||
      textLower.includes('اعتراض') ||
      textLower.includes('التواصل') ||
      textLower.includes('للتواصل') ||
      textLower.includes('contact');
    if (hasComplaintsInfo) return false;
  }
  
  // Check for return policy - tc2, ecom4, ecom5
  if (reqId?.includes('tc2') || reqId?.includes('ecom4') || reqId?.includes('ecom5') || 
      title.includes('استبدال') || title.includes('استرجاع') || title.includes('إرجاع')) {
    const hasReturnPolicy = 
      textLower.includes('استبدال') ||
      textLower.includes('استرجاع') ||
      textLower.includes('إرجاع') ||
      textLower.includes('ارجاع') ||
      textLower.includes('إعادة') ||
      textLower.includes('return') ||
      textLower.includes('refund') ||
      textLower.includes('exchange');
    if (hasReturnPolicy) return false;
  }
  
  // Check for commercial registration / tax ID - these shouldn't be flagged from website scanning
  // as they require specific document verification, not page content analysis
  if (reqId?.includes('tc4') || reqId?.includes('tc5') || 
      title.includes('سجل تجاري') || title.includes('رقم ضريبي') ||
      title.includes('السجل التجاري') || title.includes('الرقم الضريبي')) {
    console.log(`[RAG_VERIFY] Skipping non-verifiable requirement: ${title}`);
    return false; // These can't be reliably verified from page content alone
  }
  
  // If none of the above checks caught it, keep the violation
  return true;
}

export async function analyzeWithRAG(
  policyText: string,
  policyUrl: string,
  documentType: "privacy_policy" | "terms"
): Promise<LegalViolation[]> {
  if (!apiKey || apiKey === "missing-key") {
    console.warn("[RAG_ANALYSIS] No API key, skipping analysis");
    return [];
  }
  
  if (policyText.length < 100) {
    console.log("[RAG_ANALYSIS] Text too short for analysis");
    return [{
      requirementId: documentType === "privacy_policy" ? "pp_content" : "tc_content",
      articleReference: documentType === "privacy_policy" ? "المادة 12 من PDPL" : "نظام التجارة الإلكترونية",
      severity: "critical",
      category: documentType === "privacy_policy" ? "privacy_policy_content" : "terms_content",
      title: documentType === "privacy_policy" ? "محتوى سياسة الخصوصية غير كافٍ" : "محتوى الشروط والأحكام غير كافٍ",
      description: "المحتوى المكتشف قصير جداً ولا يحتوي على العناصر الإلزامية",
      violatingText: null,
      remediation: "أضف محتوى شاملاً يغطي جميع المتطلبات القانونية",
      documentType,
      confidence: 1.0,
    }];
  }
  
  const relevantRequirements = getRelevantRequirements(documentType);
  const formattedRequirements = formatRequirementsForPrompt(relevantRequirements);
  
  console.log(`[RAG_ANALYSIS] Analyzing ${documentType} with ${relevantRequirements.length} legal requirements`);
  
  const systemPrompt = `أنت محلل قانوني دقيق متخصص في نظام حماية البيانات الشخصية السعودي (PDPL).

## مهمتك:
تحليل ${documentType === "privacy_policy" ? "سياسة الخصوصية" : "الشروط والأحكام"} بدقة عالية لتحديد المتطلبات المفقودة فعلياً.

## ⚠️ قواعد التحقق الصارمة - اقرأها بعناية:

### 1. تحقق من وجود العنصر أولاً قبل الإبلاغ عنه كمخالفة:
- ابحث عن العنصر بجميع الصيغ الممكنة (مرادفات، تعبيرات مختلفة)
- إذا وجدت معلومات الاتصال (بريد، هاتف، عنوان) = العنصر موجود ✓
- إذا وجدت اسم الشركة/الجهة بأي شكل = العنصر موجود ✓
- إذا وجدت تاريخ تحديث بأي صيغة = العنصر موجود ✓

### 2. فحوصات صارمة إلزامية (أبلغ عنها كـ critical إذا غابت):

#### pp3 - تحديد أنواع البيانات الشخصية:
- يجب ذكر أنواع/فئات البيانات المحددة التي يتم جمعها
- أمثلة على تحديد صحيح: "نجمع الاسم والبريد الإلكتروني" أو "بيانات الهوية وبيانات الاتصال"
- ❌ عبارة "نجمع معلوماتك الشخصية" وحدها ليست كافية
- ✓ يكفي ذكر نوع واحد أو أكثر (حسب ما يجمعه الموقع فعلياً)
- أبلغ عن مخالفة فقط إذا لم تجد أي تحديد لأنواع البيانات (عبارات عامة فقط)

#### pp8 - شرح حقوق أصحاب البيانات:
- يجب ذكر بعض الحقوق المحددة (الوصول، التصحيح، الحذف، الاعتراض، أو النقل)
- ❌ عبارة "لك الحق في حماية بياناتك" وحدها ليست كافية
- ✓ يكفي ذكر حق واحد أو أكثر بشكل محدد
- أبلغ عن مخالفة فقط إذا لم تجد أي ذكر لحقوق محددة

#### pp11 - الموافقة على التسويق (ينطبق فقط إذا ذُكر التسويق):
- إذا ذُكر استخدام البيانات للتسويق/الترويج/الإعلانات، تحقق من:
  - وجود آلية موافقة أو إلغاء اشتراك (opt-in/opt-out)
- ❌ ذكر "قد نرسل لك عروض" بدون ذكر آلية الموافقة/الإلغاء = مخالفة
- ✓ إذا لم يُذكر التسويق نهائياً = لا مخالفة (لا حاجة للموافقة)

### 3. أمثلة على ما يُعتبر موجوداً (لا تبلغ عنه كمخالفة):
- "مكتبة جرير" أو أي اسم شركة = هوية الجهة موجودة ✓
- "[email protected]" أو أي بريد = معلومات اتصال موجودة ✓
- "920000089" أو أي رقم = معلومات اتصال موجودة ✓
- "للتواصل معنا..." = قنوات التواصل موجودة ✓

### 4. متى تُبلغ عن مخالفة فقط:
- فقط إذا بحثت جيداً ولم تجد العنصر نهائياً في كامل النص
- استخدم confidence منخفض (0.5-0.7) إذا لم تكن متأكداً
- إذا كان العنصر موجوداً جزئياً، اقترح تحسينه بـ severity: "warning" بدلاً من "critical"

### 5. المعرّفات المسموحة فقط:
استخدم هذه المعرّفات بالضبط: ${relevantRequirements.map(r => r.id).join(', ')}

## المتطلبات القانونية الواجب فحصها:
${formattedRequirements}

## صيغة الإخراج:
{
  "violations": [
    {
      "requirementId": "معرف المتطلب المحدد أعلاه فقط",
      "articleReference": "المادة القانونية",
      "severity": "critical|warning|suggestion",
      "title": "عنوان المخالفة",
      "description": "وصف المشكلة - اذكر ما بحثت عنه ولم تجده",
      "violatingText": "null لأن العنصر غير موجود",
      "remediation": "كيفية الإصلاح",
      "confidence": 0.5-1.0
    }
  ]
}

## تذكر: 
- أعط مصفوفة violations فارغة [] إذا كانت السياسة متوافقة تماماً
- تحقق مرتين قبل إضافة أي مخالفة`;

  const userPrompt = `## المستند للتحليل
**الرابط:** ${policyUrl}
**نوع المستند:** ${documentType === "privacy_policy" ? "سياسة الخصوصية" : "الشروط والأحكام"}

**المحتوى:**
${policyText.substring(0, 25000)}

---

حلل المحتوى أعلاه وحدد المخالفات بناءً على المتطلبات القانونية المحددة في التعليمات.
أجب بصيغة JSON فقط.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      max_tokens: 4096,
      temperature: 0,
    });
    
    const result = JSON.parse(response.choices[0].message.content || '{"violations": []}');
    
    const violations: LegalViolation[] = (result.violations || [])
      .filter((v: any) => v.requirementId && v.title)
      .map((v: any) => {
        const req = relevantRequirements.find(r => r.id === v.requirementId);
        return {
          requirementId: v.requirementId,
          articleReference: v.articleReference || req?.source || "PDPL",
          severity: v.severity || req?.severity || "warning",
          category: documentType === "privacy_policy" ? "privacy_policy_content" : "terms_content",
          title: v.title,
          description: v.description,
          violatingText: v.violatingText || null,
          remediation: v.remediation,
          documentType,
          confidence: v.confidence || 0.8,
        };
      });
    
    const validViolations = violations.filter(v => {
      const reqExists = relevantRequirements.some(r => r.id === v.requirementId);
      if (!reqExists) {
        console.log(`[RAG_VALIDATION] Rejected violation with unknown requirementId: ${v.requirementId}`);
        return false;
      }
      return true;
    });
    
    // Second pass: verify violations against actual text content
    const verifiedViolations = validViolations.filter(v => {
      const textLower = policyText.toLowerCase();
      const isVerified = verifyViolationAgainstText(v, textLower);
      if (!isVerified) {
        console.log(`[RAG_VERIFY] Rejected false positive: ${v.title}`);
      }
      return isVerified;
    });
    
    console.log(`[RAG_ANALYSIS] Found ${verifiedViolations.length} validated violations (${violations.length - verifiedViolations.length} rejected)`);
    
    return verifiedViolations;
  } catch (error: any) {
    console.error("[RAG_ANALYSIS] Error:", error.message);
    return [];
  }
}

export async function performRAGBasedAnalysis(
  privacyPolicyUrl?: string,
  privacyPolicyHtml?: string,
  termsUrl?: string,
  termsHtml?: string
): Promise<LegalViolation[]> {
  console.log("[RAG] === STARTING RAG-BASED ANALYSIS ===");
  console.log(`[RAG] privacyPolicyUrl: ${privacyPolicyUrl || 'NONE'}`);
  console.log(`[RAG] privacyPolicyHtml length: ${privacyPolicyHtml?.length || 0}`);
  console.log(`[RAG] termsUrl: ${termsUrl || 'NONE'}`);
  console.log(`[RAG] termsHtml length: ${termsHtml?.length || 0}`);
  
  const allViolations: LegalViolation[] = [];
  
  if (privacyPolicyHtml && privacyPolicyUrl) {
    console.log("[RAG] Starting privacy policy RAG analysis...");
    const cleanText = extractCleanText(privacyPolicyHtml);
    console.log(`[RAG] Clean text length: ${cleanText.length}`);
    const violations = await analyzeWithRAG(
      cleanText,
      privacyPolicyUrl,
      "privacy_policy"
    );
    allViolations.push(...violations);
    console.log(`[RAG] Found ${violations.length} privacy policy violations`);
  } else {
    console.log("[RAG] Skipping privacy policy - no HTML content available");
  }
  
  if (termsHtml && termsUrl) {
    console.log("[RAG] Starting terms RAG analysis...");
    const cleanText = extractCleanText(termsHtml);
    console.log(`[RAG] Clean text length: ${cleanText.length}`);
    const violations = await analyzeWithRAG(
      cleanText,
      termsUrl,
      "terms"
    );
    allViolations.push(...violations);
    console.log(`[RAG] Found ${violations.length} terms violations`);
  } else {
    console.log("[RAG] Skipping terms - no HTML content available");
  }
  
  console.log(`[RAG] === TOTAL VIOLATIONS: ${allViolations.length} ===`);
  return allViolations;
}

function extractCleanText(html: string): string {
  const $ = cheerio.load(html);
  
  $('script, style, nav, header, footer, aside, [role="navigation"], [role="banner"]').remove();
  
  let mainContent = $('main, article, [role="main"], .content, .policy-content, .privacy-policy, .terms-content').first();
  
  if (mainContent.length === 0) {
    mainContent = $('body');
  }
  
  let text = mainContent.text()
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim();
  
  if (text.length > 30000) {
    text = text.substring(0, 30000) + "\n... [تم اختصار المحتوى]";
  }
  
  return text;
}

// ==================== COMPREHENSIVE DOCUMENT ANALYSIS ====================

export interface ComprehensiveAnalysisResult {
  privacyPolicy?: {
    url: string;
    violations: LegalViolation[];
    complianceScore: number;
  };
  termsAndConditions?: {
    url: string;
    deterministicReport: DocumentAnalysisReport;
    violations: LegalViolation[];
    complianceScore: number;
  };
  cookiePolicy?: {
    url: string;
    deterministicReport: DocumentAnalysisReport;
    complianceScore: number;
  };
  returnPolicy?: {
    url: string;
    deterministicReport: DocumentAnalysisReport;
    complianceScore: number;
  };
  overallScore: number;
  totalViolations: number;
  summary: {
    critical: number;
    warning: number;
    suggestion: number;
  };
}

/**
 * Performs deterministic analysis on Terms & Conditions
 */
export function analyzeTermsDeterministic(html: string): DocumentAnalysisReport {
  const cleanText = extractCleanText(html);
  console.log(`[DETERMINISTIC] Analyzing Terms & Conditions (${cleanText.length} chars)`);
  return analyzeDocument(cleanText, 'terms');
}

/**
 * Performs deterministic analysis on Cookie Policy
 */
export function analyzeCookiePolicyDeterministic(html: string): DocumentAnalysisReport {
  const cleanText = extractCleanText(html);
  console.log(`[DETERMINISTIC] Analyzing Cookie Policy (${cleanText.length} chars)`);
  return analyzeDocument(cleanText, 'cookie_policy');
}

/**
 * Performs deterministic analysis on Return/Refund Policy
 */
export function analyzeReturnPolicyDeterministic(html: string): DocumentAnalysisReport {
  const cleanText = extractCleanText(html);
  console.log(`[DETERMINISTIC] Analyzing Return Policy (${cleanText.length} chars)`);
  return analyzeDocument(cleanText, 'return_policy');
}

/**
 * Converts deterministic analysis results to LegalViolation format
 */
function convertToViolations(
  report: DocumentAnalysisReport, 
  documentUrl: string
): LegalViolation[] {
  const kb = loadLegalKnowledgeBase();
  const violations: LegalViolation[] = [];
  
  for (const result of report.details) {
    if (!result.found) {
      // Find the requirement details from knowledge base
      const requirement = kb.find(r => r.id === result.requirementId);
      if (!requirement) continue;
      
      violations.push({
        requirementId: result.requirementId,
        articleReference: requirement.source,
        severity: requirement.severity as "critical" | "warning" | "suggestion",
        category: requirement.category,
        title: requirement.textAr,
        description: requirement.description || requirement.textEn,
        violatingText: null,
        remediation: `يجب إضافة: ${requirement.textAr}`,
        documentType: report.documentType === 'terms' ? 'terms' : 
                      report.documentType === 'cookie_policy' ? 'cookie_banner' : 'consent',
        confidence: 1.0 - result.confidence // Higher confidence in violation if lower evidence
      });
    }
  }
  
  return violations;
}

/**
 * Comprehensive analysis of all legal documents
 * Combines AI-powered privacy policy analysis with deterministic document analyzers
 */
export async function performComprehensiveAnalysis(documents: {
  privacyPolicy?: { url: string; html: string };
  terms?: { url: string; html: string };
  cookiePolicy?: { url: string; html: string };
  returnPolicy?: { url: string; html: string };
}): Promise<ComprehensiveAnalysisResult> {
  console.log("[COMPREHENSIVE] === STARTING COMPREHENSIVE DOCUMENT ANALYSIS ===");
  
  const result: ComprehensiveAnalysisResult = {
    overallScore: 0,
    totalViolations: 0,
    summary: { critical: 0, warning: 0, suggestion: 0 }
  };
  
  let totalScore = 0;
  let documentCount = 0;
  const allViolations: LegalViolation[] = [];
  
  // 1. Privacy Policy (Hybrid: AI + Deterministic verification)
  if (documents.privacyPolicy) {
    console.log("[COMPREHENSIVE] Analyzing Privacy Policy...");
    const cleanText = extractCleanText(documents.privacyPolicy.html);
    const violations = await analyzeWithRAG(cleanText, documents.privacyPolicy.url, "privacy_policy");
    
    const criticalCount = violations.filter(v => v.severity === 'critical').length;
    const score = Math.max(0, 100 - (criticalCount * 15) - (violations.filter(v => v.severity === 'warning').length * 8));
    
    result.privacyPolicy = {
      url: documents.privacyPolicy.url,
      violations,
      complianceScore: score
    };
    
    allViolations.push(...violations);
    totalScore += score;
    documentCount++;
    console.log(`[COMPREHENSIVE] Privacy Policy: ${violations.length} violations, score: ${score}%`);
  }
  
  // 2. Terms & Conditions (Deterministic)
  if (documents.terms) {
    console.log("[COMPREHENSIVE] Analyzing Terms & Conditions...");
    const report = analyzeTermsDeterministic(documents.terms.html);
    const violations = convertToViolations(report, documents.terms.url);
    
    result.termsAndConditions = {
      url: documents.terms.url,
      deterministicReport: report,
      violations,
      complianceScore: report.complianceScore
    };
    
    allViolations.push(...violations);
    totalScore += report.complianceScore;
    documentCount++;
    console.log(`[COMPREHENSIVE] Terms: ${report.missingRequirements.length} missing, score: ${report.complianceScore}%`);
  }
  
  // 3. Cookie Policy (Deterministic)
  if (documents.cookiePolicy) {
    console.log("[COMPREHENSIVE] Analyzing Cookie Policy...");
    const report = analyzeCookiePolicyDeterministic(documents.cookiePolicy.html);
    
    result.cookiePolicy = {
      url: documents.cookiePolicy.url,
      deterministicReport: report,
      complianceScore: report.complianceScore
    };
    
    const violations = convertToViolations(report, documents.cookiePolicy.url);
    allViolations.push(...violations);
    totalScore += report.complianceScore;
    documentCount++;
    console.log(`[COMPREHENSIVE] Cookie Policy: ${report.missingRequirements.length} missing, score: ${report.complianceScore}%`);
  }
  
  // 4. Return/Refund Policy (Deterministic)
  if (documents.returnPolicy) {
    console.log("[COMPREHENSIVE] Analyzing Return Policy...");
    const report = analyzeReturnPolicyDeterministic(documents.returnPolicy.html);
    
    result.returnPolicy = {
      url: documents.returnPolicy.url,
      deterministicReport: report,
      complianceScore: report.complianceScore
    };
    
    const violations = convertToViolations(report, documents.returnPolicy.url);
    allViolations.push(...violations);
    totalScore += report.complianceScore;
    documentCount++;
    console.log(`[COMPREHENSIVE] Return Policy: ${report.missingRequirements.length} missing, score: ${report.complianceScore}%`);
  }
  
  // Calculate overall results
  result.overallScore = documentCount > 0 ? Math.round(totalScore / documentCount) : 0;
  result.totalViolations = allViolations.length;
  result.summary.critical = allViolations.filter(v => v.severity === 'critical').length;
  result.summary.warning = allViolations.filter(v => v.severity === 'warning').length;
  result.summary.suggestion = allViolations.filter(v => v.severity === 'suggestion').length;
  
  console.log(`[COMPREHENSIVE] === ANALYSIS COMPLETE ===`);
  console.log(`[COMPREHENSIVE] Overall Score: ${result.overallScore}%`);
  console.log(`[COMPREHENSIVE] Total Violations: ${result.totalViolations} (${result.summary.critical} critical, ${result.summary.warning} warnings)`);
  
  return result;
}

// Export for use in routes
export { DocumentAnalysisReport, AnalysisResult };
