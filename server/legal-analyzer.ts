import OpenAI from "openai";
import * as fs from "fs";
import * as path from "path";
import * as cheerio from "cheerio";
import { fileURLToPath } from "url";
import { dirname } from "path";

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

// Deterministic check for affirmative data collection statements with specific types
function hasAffirmativeDataTypeCollection(textLower: string): boolean {
  // Affirmative collection patterns (positive statements)
  const affirmativePatterns = [
    // Arabic - affirmative collection
    'نجمع المعلومات التالية', 'نجمع البيانات التالية', 'البيانات التي نجمعها',
    'المعلومات التي نجمعها', 'نحصل على المعلومات', 'نقوم بجمع',
    'تشمل البيانات المجمعة', 'نجمع منك', 'نجمع عنك',
    // English - affirmative collection  
    'we collect the following', 'we collect information', 'we may collect',
    'we gather information', 'information we collect', 'data we collect',
    'we obtain information', 'types of data we collect', 'data types we collect'
  ];
  
  // Check for affirmative collection patterns
  const hasAffirmativePattern = affirmativePatterns.some(p => textLower.includes(p.toLowerCase()));
  
  // If we found an affirmative pattern, verify it's not negated
  if (hasAffirmativePattern) {
    // Check that it's not in a negation context
    for (const pattern of affirmativePatterns) {
      if (textLower.includes(pattern.toLowerCase()) && !isNegatedContext(textLower, pattern)) {
        return true;
      }
    }
  }
  
  // Specific data types (not generic phrases)
  const specificDataTypes = [
    // Arabic - identity
    'الاسم', 'الاسم الكامل', 'اسمك', 'أسماء',
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
    'full name', 'first name', 'last name',
    // English - contact
    'email address', 'phone number', 'postal address',
    // English - technical
    'ip address', 'browser type', 'device information', 'operating system',
    // English - financial
    'payment information', 'credit card', 'billing information',
    // English - account
    'username', 'password',
    // Categories
    'بيانات الهوية', 'بيانات الاتصال', 'بيانات تقنية',
    'identity data', 'contact data', 'technical data'
  ];
  
  // Count how many specific data types are mentioned in AFFIRMATIVE context (not negated)
  let affirmativeDataTypes = 0;
  for (const dataType of specificDataTypes) {
    if (textLower.includes(dataType.toLowerCase()) && !isNegatedContext(textLower, dataType)) {
      affirmativeDataTypes++;
    }
  }
  
  // Need at least one specific data type in affirmative context
  return affirmativeDataTypes >= 1;
}

// Deterministic check for specific rights mentioned
function hasSpecificRightsMentioned(textLower: string): boolean {
  const specificRights = [
    // Arabic
    'حق الوصول', 'حق الاطلاع', 'الوصول إلى بياناتك',
    'حق التصحيح', 'تصحيح بياناتك', 'تعديل بياناتك',
    'حق الحذف', 'حق الإتلاف', 'حذف بياناتك', 'إتلاف بياناتك',
    'حق الاعتراض', 'الاعتراض على المعالجة',
    'حق نقل البيانات', 'نقل بياناتك',
    'سحب الموافقة', 'سحب موافقتك', 'إلغاء الموافقة',
    // English
    'right to access', 'right of access', 'access your data',
    'right to rectification', 'right to correct', 'correct your data', 'update your data',
    'right to erasure', 'right to deletion', 'right to delete', 'delete your data',
    'right to object', 'object to processing',
    'right to data portability', 'data portability', 'export your data',
    'withdraw consent', 'revoke consent'
  ];
  
  return specificRights.some(r => textLower.includes(r.toLowerCase()));
}

// Deterministic check for marketing consent mechanism - respects negations
function hasMarketingWithConsentMechanism(textLower: string): { mentionsMarketing: boolean; marketingNegated: boolean; hasConsent: boolean } {
  const marketingKeywords = ['تسويق', 'ترويج', 'إعلان', 'عروض ترويجية', 'رسائل ترويجية', 'marketing', 'promotional', 'advertising'];
  const consentKeywords = [
    // Opt-in
    'موافقة صريحة', 'موافقتك المسبقة', 'موافقة مسبقة', 'opt-in', 'opt in', 'explicit consent', 'بموافقتك',
    // Opt-out
    'إلغاء الاشتراك', 'unsubscribe', 'opt-out', 'opt out', 'إيقاف الرسائل', 'إلغاء الموافقة', 'withdraw consent', 'cancel subscription'
  ];
  
  // Marketing negation patterns - "we do not use for marketing"
  const marketingNegations = [
    'لا نستخدم بياناتك للتسويق', 'لن نستخدم بياناتك للتسويق', 
    'لا نستخدم معلوماتك للتسويق', 'لا نشارك بياناتك لأغراض تسويقية',
    'do not use your data for marketing', 'don\'t use your data for marketing',
    'never use for marketing', 'will not use for marketing', 'not used for marketing',
    'لا نرسل رسائل تسويقية', 'لا نرسل إعلانات'
  ];
  
  const mentionsMarketing = marketingKeywords.some(k => textLower.includes(k.toLowerCase()));
  const marketingNegated = marketingNegations.some(n => textLower.includes(n.toLowerCase()));
  const hasConsent = consentKeywords.some(k => textLower.includes(k.toLowerCase()));
  
  return { mentionsMarketing, marketingNegated, hasConsent };
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
  // AI reported violation - verify deterministically
  if (reqId === 'pp11') {
    const marketingCheck = hasMarketingWithConsentMechanism(textLower);
    
    if (!marketingCheck.mentionsMarketing) {
      console.log(`[RAG_VERIFY] pp11: OVERRIDE AI - marketing not mentioned, no consent needed`);
      return false; // False positive - no marketing = no consent needed
    }
    
    if (marketingCheck.hasConsent) {
      console.log(`[RAG_VERIFY] pp11: OVERRIDE AI - marketing mentioned WITH consent mechanism`);
      return false; // False positive - has consent mechanism
    }
    
    console.log(`[RAG_VERIFY] pp11: AI violation CONFIRMED - marketing without consent mechanism`);
    return true; // Real violation - marketing without consent
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
