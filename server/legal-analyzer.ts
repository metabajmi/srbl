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
    return kb.filter(a => 
      a.category === "terms" ||
      a.category === "return_policy" ||
      a.category === "legal_info"
    );
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

// False positive detection - check if element actually exists in text
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
  
  // Check for contact info - pp10 or ecom2
  if (reqId === 'pp10' || reqId === 'ecom2' || title.includes('معلومات اتصال') || title.includes('تواصل')) {
    const hasContactInfo = 
      /@[a-z0-9.-]+\.[a-z]{2,}/i.test(textLower) || // email
      /\d{9,}/i.test(textLower) || // phone
      /صندوق بريد|ص\.ب|p\.o\.box/i.test(textLower) || // PO Box
      /شارع|طريق|حي|street|road/i.test(textLower) || // address
      textLower.includes('للتواصل') ||
      textLower.includes('اتصل بنا');
    if (hasContactInfo) return false;
  }
  
  // Check for update date - pp6
  if (reqId === 'pp6' || title.includes('تحديث') || title.includes('سجل')) {
    const hasUpdateDate = 
      /تاريخ التحديث|آخر تحديث|تم التحديث|last updated/i.test(textLower) ||
      /\d{1,2}[\s\-\/]\w+[\s\-\/]\d{4}/.test(textLower) || // date pattern
      /\d{4}[\s\-\/]\d{1,2}[\s\-\/]\d{1,2}/.test(textLower);
    if (hasUpdateDate) return false;
  }
  
  // Check for data collection methods - pp2
  if (reqId === 'pp2' || title.includes('طرق جمع') || title.includes('جمع البيانات')) {
    const hasCollectionInfo = 
      textLower.includes('نجمع') ||
      textLower.includes('جمع المعلومات') ||
      textLower.includes('متى نجمع') ||
      textLower.includes('كيف نجمع') ||
      textLower.includes('we collect');
    if (hasCollectionInfo) return false;
  }
  
  // Check for data usage purposes - pp3
  if (reqId === 'pp3' || title.includes('غرض') || title.includes('استخدام')) {
    const hasUsageInfo = 
      textLower.includes('نستخدم') ||
      textLower.includes('كيف نستخدم') ||
      textLower.includes('الغرض') ||
      textLower.includes('من أجل') ||
      textLower.includes('we use');
    if (hasUsageInfo) return false;
  }
  
  // Check for data sharing - pp4
  if (reqId === 'pp4' || title.includes('مشاركة') || title.includes('أطراف')) {
    const hasSharingInfo = 
      textLower.includes('نشارك') ||
      textLower.includes('مشاركة') ||
      textLower.includes('أطراف أخرى') ||
      textLower.includes('طرف ثالث') ||
      textLower.includes('لا نبيع') ||
      textLower.includes('third party');
    if (hasSharingInfo) return false;
  }
  
  // Check for data retention - pp5
  if (reqId === 'pp5' || title.includes('احتفاظ') || title.includes('تخزين') || title.includes('إتلاف')) {
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
  
  // Check for data subject rights - pp7, r1-r5
  if (reqId === 'pp7' || reqId?.startsWith('r') || title.includes('حقوق')) {
    const hasRightsInfo = 
      textLower.includes('حقوقك') ||
      textLower.includes('يحق لك') ||
      textLower.includes('الحق في') ||
      textLower.includes('your rights') ||
      textLower.includes('تغيير معلوماتهم') ||
      textLower.includes('إلغاء اشتراكهم') ||
      textLower.includes('إلغاء أو حذف');
    if (hasRightsInfo) return false;
  }
  
  // Check for cookies info - pp8, c1-c4
  if (reqId === 'pp8' || reqId?.startsWith('c') || title.includes('ملفات تعريف الارتباط') || title.includes('كوكيز')) {
    const hasCookieInfo = 
      textLower.includes('ملفات تعريف الارتباط') ||
      textLower.includes('سجلات المتصفح') ||
      textLower.includes('cookies') ||
      textLower.includes('cookie');
    // Only reject if claiming cookies info is missing but it exists
    if ((title.includes('عدم توضيح أنواع') || title.includes('لا توضح')) && hasCookieInfo) {
      return false;
    }
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
- إذا وجدت شرحاً لجمع البيانات أو استخدامها = العنصر موجود ✓

### 2. أمثلة على ما يُعتبر موجوداً (لا تبلغ عنه كمخالفة):
- "مكتبة جرير" أو أي اسم شركة = هوية الجهة موجودة ✓
- "[email protected]" أو أي بريد = معلومات اتصال موجودة ✓
- "شارع العليا" أو أي عنوان = معلومات اتصال موجودة ✓
- "920000089" أو أي رقم = معلومات اتصال موجودة ✓
- "تاريخ التحديث: ..." = سجل التحديثات موجود ✓
- "نجمع المعلومات عندما..." = طرق الجمع مذكورة ✓
- "نستخدم المعلومات من أجل..." = أغراض الاستخدام مذكورة ✓
- "للتواصل معنا..." = قنوات التواصل موجودة ✓

### 3. متى تُبلغ عن مخالفة فقط:
- فقط إذا بحثت جيداً ولم تجد العنصر نهائياً في كامل النص
- استخدم confidence منخفض (0.5-0.7) إذا لم تكن متأكداً
- إذا كان العنصر موجوداً جزئياً، اقترح تحسينه بـ severity: "suggestion" بدلاً من "critical"

### 4. المعرّفات المسموحة فقط:
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
