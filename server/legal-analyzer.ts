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
  
  const systemPrompt = `أنت محلل قانوني متخصص في نظام حماية البيانات الشخصية السعودي (PDPL).

## مهمتك:
تحليل ${documentType === "privacy_policy" ? "سياسة الخصوصية" : "الشروط والأحكام"} وتحديد المخالفات بناءً على المتطلبات القانونية المحددة أدناه فقط.

## قواعد صارمة:
1. **استند فقط للمتطلبات المذكورة أدناه** - لا تختلق متطلبات جديدة
2. **اقتبس النص المخالف حرفياً** - إذا وجدت نصاً مخالفاً، انسخه كما هو
3. **استخدم معرف المتطلب (id) بالضبط** - مثل pp1, pp2, r1, c1, tc1
4. **حدد المادة القانونية من المصدر** - استخدم المصدر المذكور مع كل متطلب
5. **إذا كان العنصر موجوداً ومتوافقاً - لا تذكره كمخالفة**

## المتطلبات القانونية الواجب فحصها:
${formattedRequirements}

## تعليمات الإخراج:
لكل مخالفة مكتشفة، قدم:
{
  "violations": [
    {
      "requirementId": "معرف المتطلب (pp1, r2, c3, tc1 إلخ)",
      "articleReference": "المادة القانونية من المصدر",
      "severity": "critical|warning|suggestion",
      "title": "عنوان المخالفة بالعربية",
      "description": "وصف تفصيلي للمشكلة",
      "violatingText": "النص المخالف المقتبس حرفياً أو null إذا كان العنصر مفقوداً",
      "remediation": "كيفية إصلاح المخالفة",
      "confidence": 0.0-1.0
    }
  ]
}`;

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
      }
      return reqExists;
    });
    
    console.log(`[RAG_ANALYSIS] Found ${validViolations.length} validated violations (${violations.length - validViolations.length} rejected)`);
    
    return validViolations;
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
