import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface ComplianceAnalysisResult {
  overallScore: number;
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

// Analyze website content for compliance issues
export async function analyzeWebsiteCompliance(
  htmlContent: string,
  url: string
): Promise<ComplianceAnalysisResult> {
  const systemPrompt = `أنت خبير في قانون حماية البيانات الشخصية السعودي ولوائحه. مهمتك هي تحليل محتوى المواقع الإلكترونية وتحديد مخالفات الامتثال.

عند التحليل، ركز على:
1. وجود وشمولية سياسة الخصوصية
2. آليات الحصول على الموافقة
3. شفافية جمع البيانات
4. حقوق أصحاب البيانات
5. أمن البيانات والتشفير
6. مشاركة البيانات مع أطراف ثالثة
7. فترة الاحتفاظ بالبيانات
8. ملفات تعريف الارتباط والتتبع

استخدم المواد التالية من نظام حماية البيانات الشخصية:
- المادة السادسة: الموافقة
- المادة الحادية عشرة: حقوق أصحاب البيانات
- المادة الثالثة عشرة: الشفافية
- المادة الرابعة عشرة: الإفصاح
- المادة التاسعة عشرة: أمن البيانات

قدم النتائج بصيغة JSON مع التقييم الشامل والمخالفات المحددة.`;

  const userPrompt = `حلل الموقع التالي للتحقق من الامتثال لقانون حماية البيانات الشخصية السعودي:

URL: ${url}

محتوى HTML (مختصر):
${htmlContent.substring(0, 30000)}

قدم تحليلاً شاملاً يتضمن:
1. نسبة الامتثال الإجمالية (0-100)
2. قائمة بجميع المخالفات مع:
   - درجة الخطورة (critical/warning/suggestion)
   - الفئة
   - العنوان بالعربية
   - الوصف التفصيلي
   - المادة المخالفة من القانون
   - طريقة المعالجة
   - العنصر المتأثر في الموقع إن وجد

أجب بصيغة JSON فقط بالتنسيق التالي:
{
  "overallScore": number,
  "issues": [
    {
      "severity": "critical|warning|suggestion",
      "category": "privacy_policy|data_collection|consent|security|user_rights|cookies|third_party|data_retention|general",
      "title": "عنوان المشكلة",
      "description": "وصف تفصيلي",
      "articleReference": "المادة X من النظام",
      "regulation": "نص اللائحة المخالفة",
      "remediation": "كيفية المعالجة",
      "affectedElement": "العنصر المتأثر"
    }
  ]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 4096,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    // Validate and ensure proper structure
    return {
      overallScore: Math.max(0, Math.min(100, result.overallScore || 0)),
      issues: Array.isArray(result.issues) ? result.issues : []
    };
  } catch (error) {
    console.error("Error analyzing website compliance:", error);
    throw new Error("فشل تحليل الامتثال للموقع");
  }
}

// Generate a compliance report
export async function generateComplianceReport(
  scan: any,
  issues: any[],
  format: "pdf" | "html" | "json"
): Promise<{ content: string; fileName: string }> {
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
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: "أنت خبير في إعداد تقارير الامتثال القانونية. أنشئ تقارير احترافية وشاملة."
        },
        { role: "user", content: reportPrompt }
      ],
      max_completion_tokens: 8192,
    });

    const content = response.choices[0].message.content || "";
    const fileName = `compliance_report_${Date.now()}.${format}`;

    return { content, fileName };
  } catch (error) {
    console.error("Error generating report:", error);
    throw new Error("فشل إنشاء التقرير");
  }
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
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: "أنت خبير قانوني متخصص في نظام حماية البيانات الشخصية السعودي."
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 1024,
    });

    return JSON.parse(response.choices[0].message.content || '{"articles": [], "details": ""}');
  } catch (error) {
    console.error("Error extracting regulation references:", error);
    return { articles: [], details: "" };
  }
}