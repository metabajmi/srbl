import OpenAI from "openai";

// Initialize OpenAI with error handling
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error("WARNING: OPENAI_API_KEY is not set in environment variables");
}

// Initialize OpenAI client
const openai = new OpenAI({ 
  apiKey: apiKey || "missing-key"
});

export interface ComplianceAnalysisResult {
  overallScore: number;
  complianceLevel: "low" | "medium" | "high";
  findings: {
    hasPrivacyPolicy: boolean;
    privacyPolicyUrl?: string;
    hasTermsAndConditions: boolean;
    termsAndConditionsUrl?: string;
    hasCookieBanner: boolean;
    hasDataCollectionForms: boolean;
    hasContactInfo: boolean;
  };
  issues: Array<{
    severity: "critical" | "warning" | "suggestion";
    category: string;
    title: string;
    description: string;
    articleReference?: string;
    regulation?: string;
    remediation: string;
    affectedElement?: string;
  }>;
}

interface DetectedLinks {
  hasPrivacyPolicy: boolean;
  privacyPolicyUrl?: string;
  hasTermsAndConditions: boolean;
  termsAndConditionsUrl?: string;
  hasCookieBanner: boolean;
  hasContactInfo: boolean;
}

function detectLinksInHTML(htmlContent: string, baseUrl: string): DetectedLinks {
  const lowerHTML = htmlContent.toLowerCase();
  
  // Helper to check if a string is a valid URL path
  const isValidUrl = (url: string): boolean => {
    if (!url || typeof url !== 'string') return false;
    // Valid if starts with http/https, relative path starting with /, ./, or looks like a file/query
    return url.startsWith('http') || 
           url.startsWith('/') || 
           url.startsWith('./') ||
           url.startsWith('?') || // Query parameters
           /^[a-zA-Z0-9_-]+\.(html?|php|asp)$/i.test(url); // File names like privacy.html
  };
  
  // Privacy Policy Detection (href-based patterns ONLY)
  const privacyHrefPatterns = [
    /href=["']([^"']*privacy[^"']*)["']/gi,
    /href=["']([^"']*خصوصية[^"']*)["']/gi,
    /href=["']([^"']*\/privacy-policy[^"']*)["']/gi,
    /href=["']([^"']*سياسة-الخصوصية[^"']*)["']/gi,
  ];
  
  // Anchor text patterns WITH href extraction
  const privacyAnchorPatterns = [
    /<a[^>]*href=["']([^"']+)["'][^>]*>.*?(privacy policy|سياسة الخصوصية).*?<\/a>/gis,
  ];
  
  // Terms Detection (href-based patterns ONLY)
  const termsHrefPatterns = [
    /href=["']([^"']*terms[^"']*)["']/gi,
    /href=["']([^"']*شروط[^"']*)["']/gi,
    /href=["']([^"']*\/terms-and-conditions[^"']*)["']/gi,
    /href=["']([^"']*الشروط-والأحكام[^"']*)["']/gi,
  ];
  
  // Anchor text patterns WITH href extraction
  const termsAnchorPatterns = [
    /<a[^>]*href=["']([^"']+)["'][^>]*>.*?(terms|terms & conditions|شروط الاستخدام|الشروط والأحكام).*?<\/a>/gis,
  ];
  
  const cookiePatterns = [
    /cookie.*?(banner|consent|notice|popup)/gi,
    /\bcookie.*?accept/gi,
    /gdpr.*?cookie/gi,
    /class=["'][^"']*cookie[^"']*["']/gi,
    /id=["'][^"']*cookie[^"']*["']/gi,
    /كوكيز|ملفات تعريف الارتباط/gi,
  ];
  
  const contactPatterns = [
    /mailto:/gi,
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    /(contact|اتصل|تواصل|للتواصل)/gi,
  ];
  
  let privacyPolicyUrl: string | undefined;
  let termsUrl: string | undefined;
  
  // Try privacy href patterns first
  for (const pattern of privacyHrefPatterns) {
    pattern.lastIndex = 0;
    const match = pattern.exec(htmlContent);
    if (match && match[1] && isValidUrl(match[1])) {
      privacyPolicyUrl = match[1];
      break;
    }
  }
  
  // If no href pattern matched, try anchor text patterns
  if (!privacyPolicyUrl) {
    for (const pattern of privacyAnchorPatterns) {
      pattern.lastIndex = 0;
      const match = pattern.exec(htmlContent);
      if (match && match[1] && isValidUrl(match[1])) {
        privacyPolicyUrl = match[1];
        break;
      }
    }
  }
  
  // Try terms href patterns first
  for (const pattern of termsHrefPatterns) {
    pattern.lastIndex = 0;
    const match = pattern.exec(htmlContent);
    if (match && match[1] && isValidUrl(match[1])) {
      termsUrl = match[1];
      break;
    }
  }
  
  // If no href pattern matched, try anchor text patterns
  if (!termsUrl) {
    for (const pattern of termsAnchorPatterns) {
      pattern.lastIndex = 0;
      const match = pattern.exec(htmlContent);
      if (match && match[1] && isValidUrl(match[1])) {
        termsUrl = match[1];
        break;
      }
    }
  }
  
  // Check if privacy/terms exist (even if URL extraction failed)
  const allPrivacyPatterns = [...privacyHrefPatterns, ...privacyAnchorPatterns];
  const allTermsPatterns = [...termsHrefPatterns, ...termsAnchorPatterns];
  
  const hasPrivacyPolicy = allPrivacyPatterns.some(pattern => {
    pattern.lastIndex = 0;
    return pattern.test(htmlContent);
  });
  
  const hasTermsAndConditions = allTermsPatterns.some(pattern => {
    pattern.lastIndex = 0;
    return pattern.test(htmlContent);
  });
  
  const hasCookieBanner = cookiePatterns.some(pattern => {
    pattern.lastIndex = 0;
    return pattern.test(lowerHTML);
  });
  
  const hasContactInfo = contactPatterns.some(pattern => {
    pattern.lastIndex = 0;
    return pattern.test(htmlContent);
  });
  
  console.log("Direct HTML detection results:", {
    hasPrivacyPolicy,
    privacyPolicyUrl,
    hasTermsAndConditions,
    termsUrl,
    hasCookieBanner,
    hasContactInfo
  });
  
  return {
    hasPrivacyPolicy,
    privacyPolicyUrl: privacyPolicyUrl && isValidUrl(privacyPolicyUrl) ? privacyPolicyUrl : undefined,
    hasTermsAndConditions,
    termsAndConditionsUrl: termsUrl && isValidUrl(termsUrl) ? termsUrl : undefined,
    hasCookieBanner,
    hasContactInfo,
  };
}

// Analyze website content for compliance issues
export async function analyzeWebsiteCompliance(
  htmlContent: string,
  url: string
): Promise<ComplianceAnalysisResult> {
  // First: Direct HTML detection for better accuracy
  console.log("Starting direct HTML pattern detection...");
  const directDetection = detectLinksInHTML(htmlContent, url);
  
  // Check if API key is available
  if (!apiKey || apiKey === "missing-key") {
    console.warn("OpenAI API key not configured, using direct detection + mock analysis");
    // Return combined data: direct detection + mock issues
    return {
      overallScore: directDetection.hasPrivacyPolicy && directDetection.hasTermsAndConditions ? 65 : 35,
      complianceLevel: directDetection.hasPrivacyPolicy && directDetection.hasTermsAndConditions ? "medium" : "low",
      findings: {
        hasPrivacyPolicy: directDetection.hasPrivacyPolicy,
        privacyPolicyUrl: directDetection.privacyPolicyUrl,
        hasTermsAndConditions: directDetection.hasTermsAndConditions,
        termsAndConditionsUrl: directDetection.termsAndConditionsUrl,
        hasCookieBanner: directDetection.hasCookieBanner,
        hasDataCollectionForms: true,
        hasContactInfo: directDetection.hasContactInfo,
      },
      issues: [
        ...(!directDetection.hasPrivacyPolicy ? [{
          severity: "critical" as const,
          category: "privacy_policy",
          title: "سياسة الخصوصية غير موجودة",
          description: "لم يتم العثور على سياسة خصوصية في الموقع. يجب أن تحتوي جميع المواقع التي تجمع بيانات شخصية على سياسة خصوصية مفصلة.",
          articleReference: "المادة الثالثة عشرة",
          regulation: "نظام حماية البيانات الشخصية",
          remediation: "أضف صفحة سياسة خصوصية شاملة تشرح كيفية جمع واستخدام البيانات الشخصية",
          affectedElement: "الموقع بالكامل"
        }] : []),
        ...(!directDetection.hasTermsAndConditions ? [{
          severity: "critical" as const,
          category: "terms_and_conditions",
          title: "شروط الاستخدام غير موجودة",
          description: "لم يتم العثور على صفحة شروط وأحكام الاستخدام في الموقع.",
          articleReference: "المادة الرابعة عشرة",
          regulation: "نظام حماية البيانات الشخصية",
          remediation: "أضف صفحة شروط وأحكام واضحة تحدد حقوق والتزامات المستخدمين",
          affectedElement: "الموقع بالكامل"
        }] : []),
        {
          severity: "warning",
          category: "consent",
          title: "آلية موافقة غير واضحة",
          description: "لا توجد آلية واضحة للحصول على موافقة المستخدم قبل جمع البيانات",
          articleReference: "المادة السادسة",
          regulation: "نظام حماية البيانات الشخصية",
          remediation: "أضف نموذج موافقة صريحة قبل جمع أي بيانات شخصية",
          affectedElement: "نماذج جمع البيانات"
        },
        ...(!directDetection.hasCookieBanner ? [{
          severity: "suggestion" as const,
          category: "cookies",
          title: "لافتة الكوكيز غير موجودة",
          description: "يفضل إضافة لافتة لإعلام المستخدمين باستخدام ملفات تعريف الارتباط",
          articleReference: "المادة الثالثة عشرة",
          regulation: "نظام حماية البيانات الشخصية",
          remediation: "أضف لافتة كوكيز تسمح للمستخدمين بالتحكم في تفضيلاتهم",
          affectedElement: "الموقع بالكامل"
        }] : [])
      ]
    };
  }
  const systemPrompt = `أنت خبير في قانون حماية البيانات الشخصية السعودي ولوائحه. مهمتك هي تحليل محتوى المواقع الإلكترونية بدقة شديدة وتحديد مخالفات الامتثال.

عند التحليل، ركز على:
1. **سياسة الخصوصية (Privacy Policy)**: هل موجودة؟ هل الرابط واضح ويعمل؟
2. **شروط الاستخدام (Terms & Conditions)**: هل موجودة؟ هل الرابط واضح ويعمل؟
3. **لافتة الكوكيز (Cookie Banner)**: هل موجودة؟ هل تحتوي على آلية موافقة واضحة؟
4. **النماذج (Forms)**: هل توجد نماذج تجمع بيانات شخصية؟
5. **معلومات الاتصال**: هل يوجد معلومات واضحة للاتصال بالمسؤول عن البيانات؟
6. **الموافقة (Consent)**: آليات الحصول على الموافقة قبل جمع البيانات
7. **حقوق المستخدم**: هل الحقوق موضحة بوضوح؟
8. **الأمان**: مؤشرات أمان البيانات والتشفير

ابحث بدقة عن:
- روابط "Privacy Policy", "سياسة الخصوصية", "الخصوصية"
- روابط "Terms", "Terms & Conditions", "شروط الاستخدام", "الشروط والأحكام"
- عناصر مثل <a href="/privacy">, <a href="/terms">, إلخ.
- نماذج <form> تحتوي على حقول بيانات شخصية
- معلومات اتصال: email, phone, address

استخدم المواد التالية من نظام حماية البيانات الشخصية:
- المادة السادسة: الموافقة
- المادة الحادية عشرة: حقوق أصحاب البيانات
- المادة الثالثة عشرة: الشفافية
- المادة الرابعة عشرة: الإفصاح
- المادة التاسعة عشرة: أمن البيانات

قدم النتائج بصيغة JSON دقيقة مع جميع النتائج.`;

  const userPrompt = `حلل الموقع التالي للتحقق من الامتثال لقانون حماية البيانات الشخصية السعودي:

URL: ${url}

محتوى HTML (مختصر):
${htmlContent.substring(0, 30000)}

قدم تحليلاً شاملاً ودقيقاً يتضمن:

**القسم الأول - النتائج (Findings):**
افحص بدقة ما يلي:
1. **سياسة الخصوصية**: ابحث عن روابط تحتوي على "privacy", "خصوصية", "/privacy", "/privacy-policy" أو صفحات مخصصة
2. **شروط الاستخدام**: ابحث عن روابط تحتوي على "terms", "شروط", "/terms", "/terms-and-conditions"
3. **لافتة الكوكيز**: ابحث عن عناصر Cookie Banner أو إشعارات الكوكيز
4. **نماذج جمع البيانات**: عدد عناصر <form> التي تحتوي على حقول بيانات شخصية (name, email, phone, إلخ)
5. **معلومات الاتصال**: وجود email, phone, address واضحة للتواصل

**القسم الثاني - التقييم:**
1. نسبة الامتثال الإجمالية (0-100)
2. مستوى الامتثال: "low" إذا كان أقل من 40، "medium" إذا بين 40-70، "high" إذا أكثر من 70

**القسم الثالث - المخالفات:**
قائمة بجميع المخالفات مع:
   - درجة الخطورة (critical/warning/suggestion)
   - الفئة (privacy_policy/terms_and_conditions/consent/cookies/data_collection/security)
   - العنوان بالعربية
   - الوصف التفصيلي
   - المادة المخالفة من القانون
   - طريقة المعالجة
   - العنصر المتأثر في الموقع

أجب بصيغة JSON فقط بالتنسيق التالي:
{
  "overallScore": number (0-100),
  "complianceLevel": "low" | "medium" | "high",
  "findings": {
    "hasPrivacyPolicy": boolean,
    "privacyPolicyUrl": "string or null",
    "hasTermsAndConditions": boolean,
    "termsAndConditionsUrl": "string or null",
    "hasCookieBanner": boolean,
    "hasDataCollectionForms": boolean,
    "hasContactInfo": boolean
  },
  "issues": [
    {
      "severity": "critical|warning|suggestion",
      "category": "privacy_policy|terms_and_conditions|data_collection|consent|security|user_rights|cookies|third_party|data_retention|general",
      "title": "عنوان المشكلة بالعربية",
      "description": "وصف تفصيلي",
      "articleReference": "المادة X من النظام",
      "regulation": "نص اللائحة المخالفة",
      "remediation": "كيفية المعالجة",
      "affectedElement": "العنصر المتأثر"
    }
  ]
}`;

  try {
    console.log("Calling OpenAI for detailed compliance analysis...");
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      max_tokens: 4096,
      temperature: 0,
      top_p: 0.1,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    console.log("OpenAI analysis results:", result.findings);
    
    // Merge direct detection with OpenAI results (prioritize positive findings)
    const mergedFindings = {
      hasPrivacyPolicy: directDetection.hasPrivacyPolicy || result.findings?.hasPrivacyPolicy || false,
      privacyPolicyUrl: directDetection.privacyPolicyUrl || result.findings?.privacyPolicyUrl || undefined,
      hasTermsAndConditions: directDetection.hasTermsAndConditions || result.findings?.hasTermsAndConditions || false,
      termsAndConditionsUrl: directDetection.termsAndConditionsUrl || result.findings?.termsAndConditionsUrl || undefined,
      hasCookieBanner: directDetection.hasCookieBanner || result.findings?.hasCookieBanner || false,
      hasDataCollectionForms: result.findings?.hasDataCollectionForms || false,
      hasContactInfo: directDetection.hasContactInfo || result.findings?.hasContactInfo || false,
    };
    
    console.log("Merged findings (direct + OpenAI):", mergedFindings);
    
    // Filter out issues ONLY when we have valid URLs from direct detection
    // This prevents removing legitimate OpenAI issues when we only detected anchor text
    let issues = Array.isArray(result.issues) ? result.issues : [];
    
    // Only remove privacy_policy issues if we have a valid URL from direct detection
    if (directDetection.privacyPolicyUrl) {
      issues = issues.filter((issue: any) => issue.category !== "privacy_policy");
      console.log("Removed privacy_policy issues (valid URL found via direct detection)");
    }
    
    // Only remove terms issues if we have a valid URL from direct detection
    if (directDetection.termsAndConditionsUrl) {
      issues = issues.filter((issue: any) => issue.category !== "terms_and_conditions");
      console.log("Removed terms_and_conditions issues (valid URL found via direct detection)");
    }
    
    // Only remove cookie issues if detected via direct detection
    if (directDetection.hasCookieBanner) {
      issues = issues.filter((issue: any) => issue.category !== "cookies");
      console.log("Removed cookies issues (cookie banner found via direct detection)");
    }
    
    // Calculate deterministic score based on findings and issues
    // Start from 100 and deduct for missing elements and issues
    let deterministicScore = 100;
    
    // Deduct for missing mandatory compliance elements
    if (!mergedFindings.hasPrivacyPolicy) {
      deterministicScore -= 30; // Privacy Policy is critical
    }
    if (!mergedFindings.hasTermsAndConditions) {
      deterministicScore -= 30; // Terms & Conditions is critical
    }
    if (!mergedFindings.hasCookieBanner) {
      deterministicScore -= 10; // Cookie Banner is important
    }
    if (!mergedFindings.hasContactInfo) {
      deterministicScore -= 10; // Contact Info is important
    }
    
    // Additional deductions based on issue severity (from OpenAI analysis)
    const criticalCount = issues.filter((i: any) => i.severity === "critical").length;
    const warningCount = issues.filter((i: any) => i.severity === "warning").length;
    const suggestionCount = issues.filter((i: any) => i.severity === "suggestion").length;
    
    deterministicScore -= (criticalCount * 5); // -5 per critical issue
    deterministicScore -= (warningCount * 3);   // -3 per warning
    deterministicScore -= (suggestionCount * 1); // -1 per suggestion
    
    const finalScore = Math.max(0, Math.min(100, deterministicScore));
    const finalLevel = finalScore >= 70 ? "high" : finalScore >= 40 ? "medium" : "low";
    
    console.log(`Deterministic score: privacy=${mergedFindings.hasPrivacyPolicy?'✓':'-30'}, terms=${mergedFindings.hasTermsAndConditions?'✓':'-30'}, cookie=${mergedFindings.hasCookieBanner?'✓':'-10'}, contact=${mergedFindings.hasContactInfo?'✓':'-10'}, issues=(critical:${criticalCount}×-5, warnings:${warningCount}×-3, suggestions:${suggestionCount}×-1), final=${finalScore}`);
    
    return {
      overallScore: finalScore,
      complianceLevel: finalLevel,
      findings: mergedFindings,
      issues
    };
  } catch (error: any) {
    console.error("Error analyzing website compliance:", error);
    console.error("API Error details:", error.message);
    
    // Return direct detection + mock issues on API error
    console.warn("Using fallback: direct detection + mock issues due to OpenAI API error");
    return {
      overallScore: directDetection.hasPrivacyPolicy && directDetection.hasTermsAndConditions ? 65 : 35,
      complianceLevel: directDetection.hasPrivacyPolicy && directDetection.hasTermsAndConditions ? "medium" : "low",
      findings: {
        hasPrivacyPolicy: directDetection.hasPrivacyPolicy,
        privacyPolicyUrl: directDetection.privacyPolicyUrl,
        hasTermsAndConditions: directDetection.hasTermsAndConditions,
        termsAndConditionsUrl: directDetection.termsAndConditionsUrl,
        hasCookieBanner: directDetection.hasCookieBanner,
        hasDataCollectionForms: true,
        hasContactInfo: directDetection.hasContactInfo,
      },
      issues: [
        ...(!directDetection.hasPrivacyPolicy ? [{
          severity: "critical" as const,
          category: "privacy_policy",
          title: "سياسة الخصوصية غير موجودة",
          description: "لم يتم العثور على سياسة خصوصية واضحة في الموقع.",
          articleReference: "المادة الثالثة عشرة",
          regulation: "نظام حماية البيانات الشخصية",
          remediation: "أضف صفحة سياسة خصوصية شاملة",
          affectedElement: "الموقع بالكامل"
        }] : []),
        ...(!directDetection.hasTermsAndConditions ? [{
          severity: "critical" as const,
          category: "terms_and_conditions",
          title: "شروط الاستخدام غير موجودة",
          description: "لم يتم العثور على صفحة شروط وأحكام الاستخدام.",
          articleReference: "المادة الرابعة عشرة",
          regulation: "نظام حماية البيانات الشخصية",
          remediation: "أضف صفحة شروط وأحكام واضحة",
          affectedElement: "الموقع بالكامل"
        }] : []),
        {
          severity: "warning",
          category: "consent",
          title: "آلية موافقة غير واضحة",
          description: "لا توجد آلية واضحة للحصول على موافقة المستخدم",
          articleReference: "المادة السادسة",
          regulation: "نظام حماية البيانات الشخصية",
          remediation: "أضف نموذج موافقة صريحة",
          affectedElement: "نماذج جمع البيانات"
        }
      ]
    };
  }
}

// Generate a compliance report
export async function generateComplianceReport(
  scan: any,
  issues: any[],
  format: "pdf" | "html" | "json"
): Promise<{ content: string; fileName: string }> {
  const fileName = `compliance_report_${Date.now()}.${format}`;
  
  // Check if API key is available
  if (!apiKey || apiKey === "missing-key") {
    console.warn("OpenAI API key not configured, using mock report");
    return generateMockReport(scan, issues, format, fileName);
  }
  
  const reportPrompt = `أنشئ تقريراً مفصلاً عن الامتثال لقانون حماية البيانات الشخصية السعودي.

بيانات الفحص:
- الموقع: ${scan.url}
- تاريخ الفحص: ${scan.scanDate}
- نسبة الامتثال: ${scan.overallScore}%
- عدد المخالفات الحرجة: ${scan.criticalCount}
- عدد التحذيرات: ${scan.warningCount}
- عدد الاقتراحات: ${scan.suggestionCount}

المخالفات:
${JSON.stringify(issues, null, 2)}

أنشئ تقريراً شاملاً يتضمن:
1. ملخص تنفيذي
2. نتائج الفحص الرئيسية
3. تفاصيل كل مخالفة مع توصيات المعالجة
4. خطة عمل مقترحة للامتثال
5. المراجع القانونية

قدم التقرير بصيغة ${format === "html" ? "HTML" : format === "pdf" ? "نص منسق لـ PDF" : "JSON"}.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "أنت خبير في إعداد تقارير الامتثال القانونية. أنشئ تقارير احترافية وشاملة."
        },
        { role: "user", content: reportPrompt }
      ],
      max_tokens: 4096,
    });

    const content = response.choices[0].message.content || "";
    return { content, fileName };
  } catch (error: any) {
    console.error("Error generating report with OpenAI:", error.message);
    console.warn("Using fallback mock report due to OpenAI API error");
    return generateMockReport(scan, issues, format, fileName);
  }
}

// Generate mock report for testing
function generateMockReport(
  scan: any,
  issues: any[],
  format: "pdf" | "html" | "json",
  fileName: string
): { content: string; fileName: string } {
  if (format === "json") {
    return {
      content: JSON.stringify({
        title: "تقرير فحص الامتثال",
        url: scan.url,
        scanDate: scan.scanDate,
        overallScore: scan.overallScore,
        summary: {
          criticalCount: scan.criticalCount,
          warningCount: scan.warningCount,
          suggestionCount: scan.suggestionCount,
          totalIssues: scan.issuesCount
        },
        issues: issues,
        recommendations: [
          "إضافة سياسة خصوصية شاملة",
          "تحسين آليات الموافقة",
          "تعزيز أمن البيانات"
        ]
      }, null, 2),
      fileName
    };
  }
  
  if (format === "html") {
    const htmlContent = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>تقرير فحص الامتثال</title>
  <style>
    body { font-family: 'Cairo', Arial; direction: rtl; padding: 20px; }
    h1 { color: #333; }
    .summary { background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0; }
    .issue { border-right: 4px solid; padding: 10px; margin: 10px 0; }
    .critical { border-color: #dc2626; }
    .warning { border-color: #f97316; }
    .suggestion { border-color: #eab308; }
  </style>
</head>
<body>
  <h1>تقرير فحص الامتثال لحماية البيانات</h1>
  <div class="summary">
    <h2>ملخص الفحص</h2>
    <p>الموقع: ${scan.url}</p>
    <p>تاريخ الفحص: ${new Date(scan.scanDate).toLocaleDateString('ar-SA')}</p>
    <p>نسبة الامتثال: ${scan.overallScore}%</p>
    <p>المخالفات: ${scan.criticalCount} حرجة، ${scan.warningCount} تحذيرات، ${scan.suggestionCount} اقتراحات</p>
  </div>
  <h2>المخالفات المكتشفة</h2>
  ${issues.map(issue => `
    <div class="issue ${issue.severity}">
      <h3>${issue.title}</h3>
      <p>${issue.description}</p>
      <p><strong>المعالجة:</strong> ${issue.remediation}</p>
      ${issue.articleReference ? `<p><small>${issue.articleReference}</small></p>` : ''}
    </div>
  `).join('')}
</body>
</html>`;
    return { content: htmlContent, fileName };
  }
  
  // Default PDF format (text)
  const pdfContent = `تقرير فحص الامتثال لحماية البيانات الشخصية
========================================

معلومات الفحص:
--------------
الموقع: ${scan.url}
تاريخ الفحص: ${new Date(scan.scanDate).toLocaleDateString('ar-SA')}
نسبة الامتثال: ${scan.overallScore}%

ملخص النتائج:
------------
- مخالفات حرجة: ${scan.criticalCount}
- تحذيرات: ${scan.warningCount}
- اقتراحات: ${scan.suggestionCount}
- إجمالي المشاكل: ${scan.issuesCount}

المخالفات المكتشفة:
-----------------
${issues.map((issue, i) => `
${i + 1}. ${issue.title}
   الخطورة: ${issue.severity === 'critical' ? 'حرجة' : issue.severity === 'warning' ? 'تحذير' : 'اقتراح'}
   الوصف: ${issue.description}
   المعالجة: ${issue.remediation}
   ${issue.articleReference ? `المرجع: ${issue.articleReference}` : ''}
`).join('\n')}

التوصيات:
--------
1. مراجعة وتحديث سياسة الخصوصية
2. تحسين آليات الحصول على موافقة المستخدمين
3. تعزيز إجراءات أمن البيانات
4. توضيح حقوق أصحاب البيانات

ملاحظة: هذا التقرير للمساعدة ولا يغني عن الاستشارة القانونية المتخصصة.`;

  return { content: pdfContent, fileName };
}

// Extract regulation references from PDFs
export async function extractRegulationReferences(
  issueDescription: string
): Promise<{ articles: string[]; details: string }> {
  const prompt = `بناءً على الوصف التالي لمخالفة امتثال:
"${issueDescription}"

حدد المواد المحددة من نظام حماية البيانات الشخصية السعودي التي تنطبق على هذه المخالفة.

قدم الإجابة بصيغة JSON:
{
  "articles": ["المادة X", "المادة Y"],
  "details": "تفاصيل المواد المنطبقة"
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "أنت خبير قانوني متخصص في نظام حماية البيانات الشخصية السعودي."
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      max_tokens: 1024,
    });

    return JSON.parse(response.choices[0].message.content || '{"articles": [], "details": ""}');
  } catch (error) {
    console.error("Error extracting regulation references:", error);
    return { articles: [], details: "" };
  }
}

import type { PolicyDocument } from "@shared/schema";

export async function generatePrivacyPolicy(data: Partial<PolicyDocument>): Promise<string> {
  if (!apiKey || apiKey === "missing-key") {
    console.warn("OpenAI API key not configured, using mock privacy policy");
    return generateMockPrivacyPolicy(data);
  }

  const formattedDate = data.lastUpdatedDate 
    ? new Date(data.lastUpdatedDate).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })
    : new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });

  // تنسيق فئات البيانات
  const dataCategoriesText = data.dataCategories?.map((cat: any, index: number) => 
    `${index + 1}. ${cat.name} (${cat.required ? 'إلزامي' : 'اختياري'})
   - الغرض: ${cat.purpose}
   - المسوغ النظامي: ${cat.legalBasis === 'consent' ? 'موافقة العميل الصريحة' : 
      cat.legalBasis === 'contract' ? 'االلتزام بـ عقد خدمة' : 
      cat.legalBasis === 'legal_obligation' ? 'االلتزام بنظام/قانون' : 
      'مصلحة مشروعة'}`
  ).join('\n\n') || 'غير محدد';

  // تنسيق الأطراف الخارجية
  const thirdPartyText = data.thirdPartyDetails?.map((party: any, index: number) =>
    `${index + 1}. ${party.party}
   - الغرض: ${party.purpose}
   ${party.safeguards ? `- الضمانات: ${party.safeguards}` : ''}`
  ).join('\n\n') || '';

  // تنسيق الإجراءات الأمنية
  const securityMeasuresText = data.securityMeasures?.map((measure: any, index: number) =>
    `${index + 1}. ${measure.description} (${measure.type === 'technical' ? 'تقني' : measure.type === 'organizational' ? 'تنظيمي' : 'مادي'})`
  ).join('\n') || '';

  // تنسيق الكوكيز
  const cookieTypesText = data.cookieTypes?.map((cookie: any, index: number) =>
    `${index + 1}. ${cookie.type}
   - الغرض: ${cookie.purpose}
   - المدة: ${cookie.duration}`
  ).join('\n\n') || '';

  const prompt = `أنشئ سياسة خصوصية شاملة ومتوافقة بنسبة 100% مع نظام حماية البيانات الشخصية السعودي (PDPL) للجهة التالية:

===== القسم الأول: هوية الجهة والمسؤولية =====

معلومات الجهة الأساسية:
- اسم الشركة/الجهة: ${data.companyName}
- نوع النشاط: ${data.businessType}
- صفة الجهة: ${data.entityType === 'government' ? 'جهة حكومية' : data.entityType === 'private' ? 'شركة/مؤسسة خاصة' : 'فرد يمارس نشاطاً تجارياً'}

بيانات الاتصال الرئيسية:
- البريد الإلكتروني: ${data.contactEmail}
- رقم الهاتف: ${data.contactPhone || 'غير محدد'}
- العنوان البريدي: ${data.contactAddress || 'غير محدد'}

معالجة البيانات الحساسة:
- هل يتطلب النشاط معالجة بيانات حساسة أو مراقبة مستمرة: ${data.processesSensitiveData === 'yes' ? 'نعم' : 'لا'}
${data.processesSensitiveData === 'yes' && data.dpoName ? `
مسؤول حماية البيانات الشخصية (DPO):
- الاسم: ${data.dpoName}
- البريد الإلكتروني: ${data.dpoEmail || data.contactEmail}
- رقم الهاتف: ${data.dpoPhone || 'غير محدد'}
- العنوان: ${data.dpoAddress || 'غير محدد'}` : ''}

===== القسم الثاني: جمع البيانات والأغراض النظامية =====

فئات البيانات الشخصية المجمعة:
${dataCategoriesText}

طريقة جمع البيانات: ${data.collectionMethod === 'direct' ? 'مباشرة من العميل فقط' : 
  data.collectionMethod === 'indirect' ? 'بشكل غير مباشر فقط' : 
  'بشكل مباشر وغير مباشر معاً'}

${data.collectionMethod === 'direct' || data.collectionMethod === 'both' ? `
تفاصيل الجمع المباشر:
${data.directCollectionDetails || 'غير محدد'}` : ''}

${data.collectionMethod === 'indirect' || data.collectionMethod === 'both' ? `
تفاصيل الجمع غير المباشر:
${data.indirectCollectionDetails || 'غير محدد'}

مصادر البيانات غير المباشرة:
${data.indirectDataSources || 'غير محدد'}` : ''}

===== القسم الثالث: معالجة البيانات ومشاركتها وأمنها =====

آليات معالجة البيانات:
${data.processingMethods || 'غير محدد'}

مشاركة البيانات مع أطراف خارجية: ${data.sharesWithThirdParties === 'yes' ? 'نعم' : 'لا'}
${data.sharesWithThirdParties === 'yes' && thirdPartyText ? `
تفاصيل الأطراف الخارجية:
${thirdPartyText}` : ''}

نقل البيانات خارج المملكة: ${data.transfersDataAbroad === 'yes' ? 'نعم' : 'لا'}
${data.transfersDataAbroad === 'yes' ? `
الدول/المناطق المستهدفة: ${data.transferDestinations || 'غير محدد'}
الضمانات المتبعة: ${data.transferSafeguards || 'غير محدد'}
الآلية المستخدمة: ${data.transferMechanism || 'غير محدد'}` : ''}

حقوق صاحب البيانات:
- طريقة ممارسة الحقوق: ${data.rightsExerciseMethod || 'غير محدد'}
- مدة الرد: ${data.rightsResponseTime || '30'} يوم
- قناة التواصل: ${data.rightsContactChannel || data.contactEmail}

تفاصيل الحقوق الفردية:
- حق الوصول: ${data.accessRightDetails || 'يمكن طلب الوصول للبيانات'}
- الحصول على نسخة: ${data.obtainCopyDetails || 'يمكن طلب نسخة'} (صيغة: ${data.obtainCopyFormat || 'PDF'})
  ${data.obtainCopyLimitations ? `القيود: ${data.obtainCopyLimitations}` : ''}
- التصحيح: ${data.correctionRightDetails || 'يمكن طلب تصحيح البيانات'} (مدة الرد: ${data.correctionResponseTime || '15'} يوم)
  إشعار: ${data.correctionNotificationMethod || 'بريد إلكتروني'}
- الحذف: شروط: ${data.deletionRightConditions || 'حسب القانون'} | استثناءات: ${data.deletionExceptions || 'التزامات قانونية'}
- الاعتراض: ${data.objectionRightDetails || 'يمكن الاعتراض على المعالجة'} (مدة التقييم: ${data.objectionEvaluationTime || '30'} يوم)
- سحب الموافقة: ${data.withdrawalConsentDetails || 'يمكن سحب الموافقة في أي وقت'}
  الطريقة: ${data.withdrawalConsentMethod || 'إعدادات الحساب'} | الأثر: ${data.withdrawalConsentImpact || 'قد تتوقف بعض الخدمات'}

التخزين والاحتفاظ:
- موقع التخزين: ${data.storageLocation || 'غير محدد'} (${data.storageLocationDetails || ''})
- مدة الاحتفاظ: ${data.retentionPeriod || 'حسب الحاجة'}
- المعايير المستخدمة: ${data.retentionCriteria || 'حسب القانون'}
- طريقة الإتلاف: ${data.deletionMethod || 'حذف آمن'}

الإجراءات الأمنية:
${securityMeasuresText}
${data.technicalMeasures ? `
إجراءات تقنية إضافية: ${data.technicalMeasures}` : ''}
${data.organizationalMeasures ? `
إجراءات تنظيمية إضافية: ${data.organizationalMeasures}` : ''}

الإخطار بانتهاك البيانات:
- العملية: ${data.breachNotificationProcess || 'إخطار فوري'}
- المدة الزمنية: ${data.breachNotificationTime || '72 ساعة'}

${data.usesCookies === 'yes' ? `
ملفات الارتباط (الكوكيز):
${cookieTypesText}
طريقة الإدارة: ${data.cookieManagementMethod || 'إعدادات المتصفح'}` : ''}

التحديثات:
طريقة الإشعار: ${data.updateNotificationMethod || 'بريد إلكتروني'}

الشكاوى:
- إجراءات تقديم الشكاوى: ${data.complaintProcedure || 'التواصل معنا'}
- مدة الرد: ${data.complaintResponseTime || '30'} يوم

تاريخ آخر تحديث للسياسة: ${formattedDate}

====================================

المطلوب:
أنشئ سياسة خصوصية شاملة واحترافية متوافقة 100% مع نظام حماية البيانات الشخصية السعودي (PDPL) واللائحة التنفيذية. يجب أن تتضمن السياسة الأقسام التالية بالترتيب:

1. **مقدمة والتزام بالخصوصية**
   - بيان التزام الجهة بحماية البيانات وفقاً للنظام السعودي
   - نطاق السياسة وتطبيقها

2. **معلومات عن جهة التحكم**
   - الاسم، النوع، البيانات الأساسية
   - بيانات التواصل الكاملة
   - مسؤول حماية البيانات (إذا كان موجوداً)

3. **جمع البيانات الشخصية**
   - فئات البيانات المجمعة مع الأغراض المحددة لكل فئة
   - طريقة الجمع (مباشرة/غير مباشرة)
   - المسوغات النظامية لكل فئة بيانات

4. **استخدام ومعالجة البيانات**
   - كيفية معالجة البيانات خلال دورة حياتها
   - الأغراض التفصيلية
   - الأساس القانوني

5. **مشاركة البيانات ونقلها**
   - الإفصاح للأطراف الخارجية (إن وجد)
   - نقل البيانات خارج المملكة (إن وجد)
   - الضمانات والآليات

6. **التخزين والاحتفاظ**
   - موقع التخزين
   - مدة الاحتفاظ والمعايير
   - طريقة الإتلاف

7. **أمن البيانات**
   - الإجراءات الأمنية التقنية
   - الإجراءات الأمنية التنظيمية
   - الإجراءات الأمنية المادية
   - الإخطار بانتهاك البيانات

8. **حقوق أصحاب البيانات**
   يجب تفصيل جميع الحقوق التالية:
   - الحق في العلم
   - الحق في الوصول إلى البيانات
   - الحق في الحصول على نسخة من البيانات
   - الحق في التصحيح
   - الحق في الإتلاف/الحذف
   - الحق في الاعتراض
   - الحق في سحب الموافقة
   - كيفية ممارسة كل حق

9. **ملفات تعريف الارتباط (إذا كانت مستخدمة)**
   - أنواع الكوكيز
   - الأغراض والمدة
   - كيفية الإدارة

10. **التحديثات على السياسة**
    - كيفية إشعار المستخدمين
    - تاريخ آخر تحديث

11. **الشكاوى والاعتراضات**
    - كيفية تقديم شكوى
    - مدة الرد
    - معلومات التواصل

12. **معلومات الهيئة السعودية للبيانات والذكاء الاصطناعي (سدايا)**
    - العنوان: المملكة العربية السعودية، الرياض
    - الموقع الإلكتروني: sdaia.gov.sa
    - منصة حوكمة البيانات الوطنية: dgp.sdaia.gov.sa
    - حق التقدم بشكوى للهيئة

13. **معلومات الاتصال النهائية**

مواصفات السياسة:
- استخدم لغة قانونية واضحة وبسيطة باللغة العربية
- اذكر المواد ذات الصلة من نظام حماية البيانات الشخصية السعودي
- كن شاملاً ومحدداً قدر الإمكان
- تأكد من التوافق الكامل مع PDPL واللائحة التنفيذية
- استخدم التنسيق المناسب مع عناوين واضحة وترقيم منظم`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "أنت خبير قانوني متخصص في صياغة سياسات الخصوصية المتوافقة مع نظام حماية البيانات الشخصية السعودي (PDPL) واللائحة التنفيذية. تتميز بقدرتك على إنشاء سياسات شاملة ودقيقة ومهنية."
        },
        { role: "user", content: prompt }
      ],
      max_tokens: 16000,
    });

    return response.choices[0].message.content || "";
  } catch (error: any) {
    console.error("Error generating privacy policy:", error.message);
    return generateMockPrivacyPolicy(data);
  }
}

function generateMockPrivacyPolicy(data: Partial<PolicyDocument>): string {
  const formattedDate = data.lastUpdatedDate 
    ? new Date(data.lastUpdatedDate).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })
    : new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
    
  const dataCategoriesText = data.dataCategories?.map((cat: any) => `- ${cat.name}: ${cat.purpose}`).join('\n') || 'غير محدد';
    
  return `سياسة الخصوصية

آخر تحديث: ${formattedDate}

1. مقدمة والتزام بالخصوصية
نحن في ${data.companyName} نلتزم بحماية خصوصيتك وبياناتك الشخصية وفقاً لنظام حماية البيانات الشخصية السعودي.

نوع النشاط: ${data.businessType}
صفة الجهة: ${data.entityType === 'government' ? 'جهة حكومية' : data.entityType === 'private' ? 'شركة/مؤسسة خاصة' : 'فرد'}

2. كيف يتم جمع بياناتك الشخصية وما هو الغرض من جمعها؟

2.1 البيانات التي يتم جمعها
${dataCategoriesText}

2.2 طرق الجمع
${data.collectionMethod === 'direct' ? 'مباشرة من العميل' : data.collectionMethod === 'indirect' ? 'بشكل غير مباشر' : 'مباشرة وغير مباشرة'}

${data.indirectDataSources ? `2.3 مصادر البيانات غير المباشرة
${data.indirectDataSources}` : ''}

3. كيف نستخدم بياناتك الشخصية؟
نستخدم بياناتك للأغراض المحددة في كل فئة من فئات البيانات أعلاه.

${data.dataUsageDetails ? `\nتفاصيل الاستخدام:
${data.dataUsageDetails}` : ''}

4. كيف نفصح عن بياناتك الشخصية؟
مشاركة مع جهات خارجية: ${data.hasThirdPartySharing === 'yes' ? 'نعم' : 'لا'}
${data.hasThirdPartySharing === 'yes' ? 'قد نشارك بياناتك مع أطراف ثالثة موثوقة لتحسين خدماتنا.' : 'لا نشارك بياناتك مع أطراف ثالثة إلا بموافقتك الصريحة.'}

${data.thirdPartyCategories && data.hasThirdPartySharing === 'yes' ? `فئات الجهات الخارجية:
${data.thirdPartyCategories}` : ''}

${data.disclosureDetails ? `تفاصيل الإفصاح:
${data.disclosureDetails}` : ''}

5. المسوغات النظامية لجمع ومعالجة بياناتك الشخصية
نقوم بجمع ومعالجة بياناتك الشخصية بناءً على المسوغات النظامية التالية:
- موافقتك الصريحة
- تنفيذ العقد المبرم معك
- الالتزام بالتزام قانوني
- المصلحة المشروعة لنا أو لطرف ثالث
- حماية المصالح الحيوية

6. كيف نقوم بتخزين بياناتك الشخصية؟
${data.storageLocation ? `موقع التخزين: ${data.storageLocation}` : 'يتم تخزين بياناتك في خوادم آمنة.'}

مدة الاحتفاظ: ${data.retentionPeriod}

${data.securityMeasures ? `إجراءات الحماية: ${data.securityMeasures}` : 'نطبق إجراءات أمنية متقدمة بما في ذلك التشفير والمراقبة المستمرة.'}

7. حقوقك فيما يتعلق بمعالجة بياناتك الشخصية
بموجب نظام حماية البيانات الشخصية السعودي، لديك الحقوق التالية:

- الحق في العلم: معرفة طرق جمع بياناتك ومعالجتها وحفظها والإفصاح عنها
- الحق في الوصول إلى بياناتك الشخصية: طلب الاطلاع على بياناتك وكيفية استخدامها
- الحق في طلب الحصول على بياناتك الشخصية: الحصول على نسخة من بياناتك بصيغة مقروءة
- الحق في تصحيح بياناتك الشخصية: طلب تصحيح البيانات غير الدقيقة أو غير الصحيحة
- الحق في إتلاف بياناتك الشخصية: طلب حذف بياناتك في ظروف معينة
- الحق في الرجوع عن موافقتك على معالجة بياناتك الشخصية: سحب الموافقة في أي وقت

${data.dpoName || data.dpoEmail ? `8. مسؤول حماية البيانات الشخصية
${data.dpoName ? `الاسم: ${data.dpoName}` : ''}
${data.dpoEmail ? `البريد الإلكتروني: ${data.dpoEmail}` : ''}
${data.dpoPhone ? `الهاتف: ${data.dpoPhone}` : ''}
${data.dpoAddress ? `العنوان: ${data.dpoAddress}` : ''}

يمكنك التواصل مع مسؤول حماية البيانات لأي استفسارات أو طلبات تتعلق ببياناتك الشخصية.` : ''}

9. كيف تقدم شكوى أو اعتراض؟
إذا كانت لديك أي شكاوى أو اعتراضات بخصوص معالجة بياناتك الشخصية، يمكنك التواصل معنا عبر:
- البريد الإلكتروني: ${data.contactEmail}
${data.contactPhone ? `- الهاتف: ${data.contactPhone}` : ''}
${data.address ? `- العنوان: ${data.address}` : ''}

سنقوم بالرد على شكواك في أقرب وقت ممكن وبما لا يتجاوز 30 يوماً.

10. عنوان الهيئة السعودية للبيانات والذكاء الاصطناعي
يمكنك تقديم شكوى إلى الهيئة السعودية للبيانات والذكاء الاصطناعي:
- العنوان: المملكة العربية السعودية، الرياض
- الموقع الإلكتروني: sdaia.gov.sa
- منصة حوكمة البيانات الوطنية: dgp.sdaia.gov.sa

11. تحديثات السياسة
قد نقوم بتحديث هذه السياسة من وقت لآخر. سيتم إشعارك بأي تغييرات جوهرية عبر البريد الإلكتروني أو من خلال إشعار على موقعنا.

12. معلومات الاتصال النهائية
للاستفسارات حول سياسة الخصوصية، يرجى التواصل معنا:
- الجهة: ${data.companyName}
- البريد الإلكتروني: ${data.contactEmail}
${data.contactPhone ? `- الهاتف: ${data.contactPhone}` : ''}
${data.address ? `- العنوان: ${data.address}` : ''}
${data.websiteUrl ? `- الموقع الإلكتروني: ${data.websiteUrl}` : ''}`;
}

export interface TermsDocumentData {
  companyName: string;
  websiteUrl: string;
  businessType: string;
  serviceDescription: string;
  hasUserAccounts: string;
  hasSubscriptions: string;
  paymentMethods?: string[];
  refundPolicy?: string;
  shippingPolicy?: string;
  returnPolicy?: string;
  deliveryTimeframe?: string;
  liabilityLimits?: string;
  governingLaw: string;
  disputeResolution?: string;
  contactEmail: string;
  contactPhone?: string;
  commercialRegistration?: string;
  taxNumber?: string;
  licenseNumber?: string;
  // Template-based generation
  templateSections?: any[];
  templateMetadata?: any;
}

export async function generateTermsAndConditions(data: TermsDocumentData): Promise<string> {
  if (!apiKey || apiKey === "missing-key") {
    console.warn("OpenAI API key not configured, using mock terms and conditions");
    return generateMockTermsAndConditions(data);
  }

  // ====================================
  // Build prompt with template sections
  // ====================================
  let prompt = `أنشئ شروطاً وأحكاماً متوافقة مع الأنظمة السعودية (نظام التجارة الإلكترونية ولائحته التنفيذية) للشركة التالية:

معلومات الشركة:
- اسم الشركة: ${data.companyName}
${data.commercialRegistration ? `- رقم السجل التجاري: ${data.commercialRegistration}` : ''}
${data.taxNumber ? `- الرقم الضريبي: ${data.taxNumber}` : ''}
${data.licenseNumber ? `- رقم الترخيص: ${data.licenseNumber}` : ''}
- الموقع الإلكتروني: ${data.websiteUrl}
- نوع النشاط: ${data.businessType}
- وصف الخدمة: ${data.serviceDescription}
- البريد الإلكتروني: ${data.contactEmail}
${data.contactPhone ? `- الهاتف: ${data.contactPhone}` : ''}

تفاصيل الخدمة:
- حسابات مستخدمين: ${data.hasUserAccounts}
- اشتراكات: ${data.hasSubscriptions}
${data.paymentMethods && data.paymentMethods.length > 0 ? `- طرق الدفع: ${data.paymentMethods.join(', ')}` : ''}
${data.shippingPolicy ? `- سياسة الشحن: ${data.shippingPolicy}` : ''}
${data.deliveryTimeframe ? `- مدة التوصيل: ${data.deliveryTimeframe}` : ''}
${data.returnPolicy ? `- سياسة الاسترجاع: ${data.returnPolicy}` : ''}
${data.refundPolicy ? `- سياسة الاسترداد: ${data.refundPolicy}` : ''}
${data.liabilityLimits ? `- حدود المسؤولية: ${data.liabilityLimits}` : ''}
- القانون الحاكم: ${data.governingLaw}
${data.disputeResolution ? `- حل النزاعات: ${data.disputeResolution}` : ''}
`;

  // ====================================
  // Add template sections as examples
  // ====================================
  if (data.templateSections && data.templateSections.length > 0) {
    prompt += `\n\n=== قوالب الأقسام المتاحة ===\n`;
    prompt += `استخدم الأقسام التالية كقوالب أساسية، واملأ {{المتغيرات}} بالمعلومات المناسبة:\n\n`;
    
    for (const section of data.templateSections) {
      prompt += `${section.heading}\n`;
      prompt += `${section.clauseText}\n`;
      
      if (section.legalBasis && section.legalBasis.length > 0) {
        const references = section.legalBasis.map((ref: any) => 
          `${ref.sourceCode} - المواد: ${ref.articles.join(', ')}`
        ).join('; ');
        prompt += `\nالمرجع القانوني: ${references}\n`;
      }
      prompt += `\n---\n\n`;
    }
  } else {
    // Fallback to default sections if no template
    prompt += `\nيجب أن تتضمن الشروط الأقسام التالية:
1. المقدمة وقبول الشروط
2. معلومات الممارس (وفقاً لنظام التجارة الإلكترونية)
3. الخدمات والمنتجات
4. الدفع والأسعار
5. الشحن والتوصيل (للتجارة الإلكترونية)
6. حق العدول والاسترجاع (7 أيام وفقاً للنظام)
7. المسؤولية والضمانات
8. تسوية النزاعات والقانون الواجب التطبيق
9. معلومات الاتصال
`;
  }

  prompt += `\nملاحظات مهمة:
- استخدم لغة قانونية واضحة وبسيطة باللغة العربية
- التزم بنظام التجارة الإلكترونية ولائحته التنفيذية
- وضح حق العدول خلال 7 أيام للمستهلك
- اذكر آليات تقديم الشكاوى (وزارة التجارة - بلاغ تجاري)
- استخدم تنسيق HTML بسيط مع عناوين <h2> للأقسام الرئيسية و <h3> للأقسام الفرعية
`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "أنت خبير قانوني متخصص في صياغة الشروط والأحكام المتوافقة مع القوانين السعودية."
        },
        { role: "user", content: prompt }
      ],
      max_tokens: 4096,
    });

    return response.choices[0].message.content || "";
  } catch (error: any) {
    console.error("Error generating terms and conditions:", error.message);
    return generateMockTermsAndConditions(data);
  }
}

function generateMockTermsAndConditions(data: TermsDocumentData): string {
  return `الشروط والأحكام

آخر تحديث: ${new Date().toLocaleDateString('ar-SA')}

1. القبول بالشروط
باستخدامك لموقع ${data.companyName} (${data.websiteUrl})، فإنك توافق على الالتزام بهذه الشروط والأحكام.

2. وصف الخدمة
نحن نقدم: ${data.serviceDescription}

3. ${data.hasUserAccounts === 'yes' ? 'حسابات المستخدمين' : 'استخدام الموقع'}
${data.hasUserAccounts === 'yes' ? 
  'يجب عليك إنشاء حساب للوصول إلى بعض ميزات الموقع. أنت مسؤول عن الحفاظ على سرية بيانات حسابك.' :
  'يمكنك استخدام الموقع دون الحاجة إلى إنشاء حساب.'}

4. حقوق الملكية الفكرية
جميع المحتويات على هذا الموقع هي ملك لـ ${data.companyName} ومحمية بموجب قوانين حقوق النشر.

5. ${data.hasSubscriptions === 'yes' ? 'الاشتراكات والمدفوعات' : 'الاستخدام المقبول'}
${data.hasSubscriptions === 'yes' ?
  `طرق الدفع المتاحة: ${data.paymentMethods?.join(', ') || 'سيتم تحديدها عند الاشتراك'}.
${data.refundPolicy || 'سياسة الاسترداد: وفقاً للضوابط المعلنة.'}` :
  'يجب استخدام الموقع بطريقة قانونية ومناسبة فقط.'}

6. حدود المسؤولية
${data.liabilityLimits || 'نقدم الخدمة كما هي دون ضمانات صريحة أو ضمنية.'}

7. القانون الحاكم
تخضع هذه الشروط لقوانين ${data.governingLaw}.

8. حل النزاعات
${data.disputeResolution || 'يتم حل أي نزاعات وفقاً للإجراءات القانونية المعمول بها في المملكة العربية السعودية.'}

9. الاتصال بنا
للاستفسارات:
البريد الإلكتروني: ${data.contactEmail}`;
}

// ==================== AI ASSISTANT FUNCTIONS ====================

/**
 * Generate embeddings for text using OpenAI's text-embedding-3-small model
 * Returns 1536-dimensional vector for semantic search
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  // Check if API key is available
  if (!apiKey || apiKey === "missing-key") {
    console.warn("OpenAI API key not configured, returning zero vector");
    // Return zero vector for testing (1536 dimensions)
    return new Array(1536).fill(0);
  }

  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
      encoding_format: "float",
    });

    return response.data[0].embedding;
  } catch (error: any) {
    console.error("Error generating embedding:", error.message);
    // Return zero vector on error
    return new Array(1536).fill(0);
  }
}

/**
 * Generate embeddings for multiple texts in batch
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  // Check if API key is available
  if (!apiKey || apiKey === "missing-key") {
    console.warn("OpenAI API key not configured, returning zero vectors");
    return texts.map(() => new Array(1536).fill(0));
  }

  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: texts,
      encoding_format: "float",
    });

    return response.data.map(item => item.embedding);
  } catch (error: any) {
    console.error("Error generating embeddings:", error.message);
    return texts.map(() => new Array(1536).fill(0));
  }
}

export interface RetrievedContext {
  id: string;
  title: string;
  content: string;
  category: string;
  similarity: number;
}

export interface ChatAssistantResponse {
  message: string;
  retrievedContext: RetrievedContext[];
}

/**
 * Generate chat response using RAG (Retrieval Augmented Generation)
 * @param userMessage - User's question
 * @param retrievedContext - Relevant knowledge base articles
 * @param conversationHistory - Previous messages for context
 */
export async function generateChatResponse(
  userMessage: string,
  retrievedContext: RetrievedContext[],
  conversationHistory: Array<{ role: string; content: string }> = []
): Promise<string> {
  // Check if API key is available
  if (!apiKey || apiKey === "missing-key") {
    console.warn("OpenAI API key not configured, using mock response");
    return `شكراً لسؤالك! للأسف، لم يتم تكوين مفتاح OpenAI API. هذا رد تجريبي.

بناءً على المعلومات المتاحة في قاعدة المعرفة، يمكنني مساعدتك بشأن:
- نظام حماية البيانات الشخصية (PDPL)
- إدارة الامتثال الداخلي
- توليد سياسات الخصوصية والشروط والأحكام

كيف يمكنني مساعدتك اليوم؟`;
  }

  // Prepare context from retrieved articles
  const contextText = retrievedContext
    .map((ctx, index) => {
      return `[${index + 1}] ${ctx.title}\n${ctx.content.substring(0, 500)}...\n`;
    })
    .join("\n");

  const systemPrompt = `أنت مساعد ذكي متخصص في نظام حماية البيانات الشخصية السعودي (PDPL). مهمتك هي مساعدة المستخدمين بالإجابة على أسئلتهم بناءً على قاعدة المعرفة المتوفرة.

**قواعد الإجابة:**
1. استخدم فقط المعلومات من السياق المُقدم (قاعدة المعرفة)
2. إذا لم تكن المعلومات متوفرة، أخبر المستخدم بذلك بوضوح
3. استخدم لغة واضحة وبسيطة بالعربية
4. كن مهذباً ومحترماً
5. إذا كان السؤال معقداً، قسم الإجابة إلى نقاط
6. أشر إلى المصادر عند الاقتباس من مقالات محددة

**السياق المتاح من قاعدة المعرفة:**
${contextText}

إذا لم يحتوي السياق على المعلومات الكافية للإجابة، أخبر المستخدم بذلك وانصحه بزيارة الهيئة السعودية للبيانات والذكاء الاصطناعي (SDAIA) للحصول على معلومات رسمية.`;

  try {
    // Build messages array with conversation history
    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: systemPrompt },
      ...conversationHistory.slice(-6).map(msg => ({ // Keep last 3 exchanges (6 messages)
        role: msg.role as "user" | "assistant",
        content: msg.content
      })),
      { role: "user", content: userMessage }
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      max_tokens: 1500,
      temperature: 0.7,
    });

    return response.choices[0].message.content || "عذراً، لم أتمكن من توليد إجابة.";
  } catch (error: any) {
    console.error("Error generating chat response:", error.message);
    throw new Error("فشل في توليد الرد. يرجى المحاولة مرة أخرى.");
  }
}