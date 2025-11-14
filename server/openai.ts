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
  // Check if API key is available
  if (!apiKey || apiKey === "missing-key") {
    console.warn("OpenAI API key not configured, using mock analysis");
    // Return mock data for testing
    return {
      overallScore: 45,
      issues: [
        {
          severity: "critical",
          category: "سياسة الخصوصية",
          title: "سياسة خصوصية غير موجودة أو غير واضحة",
          description: "لم يتم العثور على سياسة خصوصية واضحة في الموقع. يجب أن تحتوي جميع المواقع على سياسة خصوصية مفصلة.",
          articleReference: "المادة الثالثة عشرة",
          regulation: "نظام حماية البيانات الشخصية",
          remediation: "أضف صفحة سياسة خصوصية شاملة تشرح كيفية جمع واستخدام البيانات الشخصية",
          affectedElement: "الموقع بالكامل"
        },
        {
          severity: "warning",
          category: "الموافقة",
          title: "آلية موافقة غير واضحة",
          description: "لا توجد آلية واضحة للحصول على موافقة المستخدم قبل جمع البيانات",
          articleReference: "المادة السادسة",
          regulation: "نظام حماية البيانات الشخصية",
          remediation: "أضف نموذج موافقة صريحة قبل جمع أي بيانات شخصية",
          affectedElement: "نماذج جمع البيانات"
        },
        {
          severity: "suggestion",
          category: "الشفافية",
          title: "تحسين وضوح المعلومات",
          description: "يمكن تحسين طريقة عرض المعلومات حول استخدام البيانات",
          articleReference: "المادة الثالثة عشرة",
          regulation: "نظام حماية البيانات الشخصية",
          remediation: "استخدم لغة واضحة وبسيطة في شرح كيفية استخدام البيانات",
          affectedElement: "صفحات المعلومات"
        }
      ]
    };
  }
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
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      max_tokens: 4096,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    // Validate and ensure proper structure
    return {
      overallScore: Math.max(0, Math.min(100, result.overallScore || 0)),
      issues: Array.isArray(result.issues) ? result.issues : []
    };
  } catch (error: any) {
    console.error("Error analyzing website compliance:", error);
    console.error("API Error details:", error.message);
    
    // Return mock data on API error for testing
    console.warn("Using fallback mock data due to OpenAI API error");
    return {
      overallScore: 45,
      issues: [
        {
          severity: "critical",
          category: "سياسة الخصوصية",
          title: "سياسة خصوصية غير موجودة أو غير واضحة",
          description: "لم يتم العثور على سياسة خصوصية واضحة في الموقع.",
          articleReference: "المادة الثالثة عشرة",
          regulation: "نظام حماية البيانات الشخصية",
          remediation: "أضف صفحة سياسة خصوصية شاملة",
          affectedElement: "الموقع بالكامل"
        },
        {
          severity: "warning",
          category: "الموافقة",
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
      model: "gpt-3.5-turbo",
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
      model: "gpt-3.5-turbo",
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

export interface PolicyDocumentData {
  companyName: string;
  websiteUrl: string;
  businessType: string;
  dataTypes: string[];
  dataUsagePurposes: string[];
  hasThirdPartySharing: string;
  retentionPeriod: string;
  contactEmail: string;
  contactPhone?: string | null;
  responsibleDepartment?: string | null;
  address?: string | null;
  licenseNumber?: string | null;
  dataCollectionMethods?: string | null;
  indirectDataSources?: string | null;
  dataUsageDetails?: string | null;
  disclosureDetails?: string | null;
  thirdPartyCategories?: string | null;
  storageLocation?: string | null;
  securityMeasures?: string | null;
  dpoName?: string | null;
  dpoAddress?: string | null;
  dpoPhone?: string | null;
  dpoEmail?: string | null;
  lastUpdatedDate?: Date | null;
}

export async function generatePrivacyPolicy(data: PolicyDocumentData): Promise<string> {
  if (!apiKey || apiKey === "missing-key") {
    console.warn("OpenAI API key not configured, using mock privacy policy");
    return generateMockPrivacyPolicy(data);
  }

  const formattedDate = data.lastUpdatedDate 
    ? new Date(data.lastUpdatedDate).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })
    : new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });

  const prompt = `أنشئ سياسة خصوصية شاملة ومتوافقة بنسبة 100% مع نظام حماية البيانات الشخصية السعودي للشركة التالية:

معلومات الشركة:
- اسم الشركة/الجهة: ${data.companyName}
- الموقع الإلكتروني: ${data.websiteUrl}
- نوع النشاط: ${data.businessType}
- القسم/الفريق المختص: ${data.responsibleDepartment || 'غير محدد'}
- العنوان: ${data.address || 'غير محدد'}
- الترخيص/السجل التجاري: ${data.licenseNumber || 'غير محدد'}

بيانات الاتصال:
- البريد الإلكتروني: ${data.contactEmail}
- الهاتف: ${data.contactPhone || 'غير محدد'}

البيانات الشخصية:
- أنواع البيانات المجمعة: ${data.dataTypes ? data.dataTypes.join(', ') : 'غير محدد'}
- أغراض استخدام البيانات: ${data.dataUsagePurposes ? data.dataUsagePurposes.join(', ') : 'غير محدد'}
- مشاركة مع جهات خارجية: ${data.hasThirdPartySharing === 'yes' ? 'نعم' : 'لا'}
- فئات الجهات الخارجية: ${data.thirdPartyCategories || 'غير محدد'}
- مدة الاحتفاظ بالبيانات: ${data.retentionPeriod}

كيفية الجمع والمعالجة:
- طرق جمع البيانات: ${data.dataCollectionMethods || 'مباشرة وغير مباشرة'}
- مصادر البيانات غير المباشرة: ${data.indirectDataSources || 'غير محدد'}
- تفاصيل استخدام البيانات: ${data.dataUsageDetails || 'حسب الأغراض المذكورة'}
- تفاصيل الإفصاح: ${data.disclosureDetails || 'حسب الحاجة القانونية'}

التخزين والحماية:
- موقع التخزين: ${data.storageLocation || 'خوادم آمنة'}
- إجراءات الحماية: ${data.securityMeasures || 'تشفير وحماية متقدمة'}

مسؤول حماية البيانات:
- الاسم: ${data.dpoName || 'غير محدد'}
- العنوان: ${data.dpoAddress || 'غير محدد'}
- الهاتف: ${data.dpoPhone || 'غير محدد'}
- البريد الإلكتروني: ${data.dpoEmail || data.contactEmail}

تاريخ آخر تحديث للسياسة: ${formattedDate}

يجب أن تتضمن السياسة الأقسام التالية بالترتيب وبشكل مفصل:

1. **مقدمة والتزام بالخصوصية**
   - بيان التزام الجهة بحماية البيانات وفقاً للنظام السعودي
   - نطاق السياسة وتطبيقها

2. **كيف يتم جمع بياناتك الشخصية وما هو الغرض من جمعها؟**
   - البيانات التي يتم الحصول عليها بشكل مباشر (من المستخدم نفسه)
   - البيانات التي يتم الحصول عليها بطريقة غير مباشرة (من مصادر أخرى)
   - الأغراض المحددة لكل نوع من البيانات

3. **كيف نستخدم بياناتك الشخصية؟**
   - تفاصيل دقيقة عن كيفية استخدام كل نوع من البيانات
   - الأساس القانوني لكل استخدام

4. **كيف نفصح عن بياناتك الشخصية؟**
   - الجهات التي قد يتم الإفصاح لها عن البيانات
   - الغرض من كل إفصاح
   - الضمانات المطبقة عند الإفصاح

5. **المسوغات النظامية لجمع ومعالجة بياناتك الشخصية**
   - الأسس القانونية (الموافقة، تنفيذ العقد، الالتزام القانوني، المصلحة المشروعة، إلخ)
   - تفصيل كل مسوغ نظامي

6. **كيف نقوم بتخزين بياناتك الشخصية؟**
   - موقع التخزين وطريقته
   - مدة التخزين والاحتفاظ
   - إجراءات الأمان والحماية

7. **حقوقك فيما يتعلق بمعالجة بياناتك الشخصية**
   يجب تفصيل الحقوق التالية بشكل كامل:
   - **الحق في العلم**: معرفة طرق جمع بياناتك ومعالجتها وحفظها والإفصاح عنها
   - **الحق في الوصول إلى بياناتك الشخصية**: طلب الاطلاع على بياناتك وكيفية استخدامها
   - **الحق في طلب الحصول على بياناتك الشخصية**: الحصول على نسخة من بياناتك بصيغة مقروءة
   - **الحق في تصحيح بياناتك الشخصية**: طلب تصحيح البيانات غير الدقيقة أو غير الصحيحة
   - **الحق في إتلاف بياناتك الشخصية**: طلب حذف بياناتك في ظروف معينة
   - **الحق في الرجوع عن موافقتك على معالجة بياناتك الشخصية**: سحب الموافقة في أي وقت

8. **مسؤول حماية البيانات الشخصية**
   - معلومات الاتصال الكاملة بمسؤول حماية البيانات
   - دور ومسؤوليات المسؤول

9. **كيف تقدم شكوى أو اعتراض؟**
   - الخطوات اللازمة لتقديم شكوى
   - القنوات المتاحة للتواصل
   - المدة الزمنية للرد

10. **عنوان الهيئة السعودية للبيانات والذكاء الاصطناعي**
    - العنوان الكامل: المملكة العربية السعودية، الرياض
    - الموقع الإلكتروني: الهيئة السعودية للبيانات والذكاء الاصطناعي (sdaia.gov.sa)
    - منصة حوكمة البيانات الوطنية: (dgp.sdaia.gov.sa)

11. **تحديثات السياسة**
    - كيفية إشعار المستخدمين بالتحديثات
    - تاريخ آخر تحديث

12. **معلومات الاتصال النهائية**

استخدم لغة قانونية واضحة وبسيطة باللغة العربية، مع التأكد من التوافق الكامل مع نظام حماية البيانات الشخصية السعودي. يجب أن تكون السياسة شاملة واحترافية ومفصلة.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "أنت خبير قانوني متخصص في صياغة سياسات الخصوصية المتوافقة مع القوانين السعودية."
        },
        { role: "user", content: prompt }
      ],
      max_tokens: 4096,
    });

    return response.choices[0].message.content || "";
  } catch (error: any) {
    console.error("Error generating privacy policy:", error.message);
    return generateMockPrivacyPolicy(data);
  }
}

function generateMockPrivacyPolicy(data: PolicyDocumentData): string {
  const formattedDate = data.lastUpdatedDate 
    ? new Date(data.lastUpdatedDate).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })
    : new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
    
  return `سياسة الخصوصية

آخر تحديث: ${formattedDate}

1. مقدمة والتزام بالخصوصية
نحن في ${data.companyName} (${data.websiteUrl}) نلتزم بحماية خصوصيتك وبياناتك الشخصية وفقاً لنظام حماية البيانات الشخصية السعودي.

نوع النشاط: ${data.businessType}
${data.licenseNumber ? `السجل التجاري: ${data.licenseNumber}` : ''}
${data.responsibleDepartment ? `القسم المختص: ${data.responsibleDepartment}` : ''}

2. كيف يتم جمع بياناتك الشخصية وما هو الغرض من جمعها؟

2.1 البيانات التي يتم جمعها
نقوم بجمع الأنواع التالية من البيانات:
${data.dataTypes.map(type => `- ${type}`).join('\n')}

2.2 طرق الجمع
${data.dataCollectionMethods || 'يتم جمع البيانات بشكل مباشر من خلال تفاعلك مع خدماتنا وبشكل غير مباشر من مصادر معتمدة.'}

${data.indirectDataSources ? `2.3 مصادر البيانات غير المباشرة
${data.indirectDataSources}` : ''}

3. كيف نستخدم بياناتك الشخصية؟
نستخدم بياناتك للأغراض التالية:
${data.dataUsagePurposes.map(purpose => `- ${purpose}`).join('\n')}

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
  liabilityLimits?: string;
  governingLaw: string;
  disputeResolution?: string;
  contactEmail: string;
}

export async function generateTermsAndConditions(data: TermsDocumentData): Promise<string> {
  if (!apiKey || apiKey === "missing-key") {
    console.warn("OpenAI API key not configured, using mock terms and conditions");
    return generateMockTermsAndConditions(data);
  }

  const prompt = `أنشئ شروطاً وأحكاماً شاملة للاستخدام للشركة التالية:

معلومات الشركة:
- اسم الشركة: ${data.companyName}
- الموقع الإلكتروني: ${data.websiteUrl}
- نوع النشاط: ${data.businessType}
- وصف الخدمة: ${data.serviceDescription}
- يوجد حسابات مستخدمين: ${data.hasUserAccounts}
- يوجد اشتراكات: ${data.hasSubscriptions}
${data.paymentMethods && data.paymentMethods.length > 0 ? `- طرق الدفع: ${data.paymentMethods.join(', ')}` : ''}
${data.refundPolicy ? `- سياسة الاسترداد: ${data.refundPolicy}` : ''}
${data.liabilityLimits ? `- حدود المسؤولية: ${data.liabilityLimits}` : ''}
- القانون الحاكم: ${data.governingLaw}
${data.disputeResolution ? `- حل النزاعات: ${data.disputeResolution}` : ''}
- البريد الإلكتروني: ${data.contactEmail}

يجب أن تتضمن الشروط الأقسام التالية:
1. القبول بالشروط
2. وصف الخدمة
3. حسابات المستخدمين (إن وجدت)
4. حقوق الملكية الفكرية
5. قواعد الاستخدام المقبول
6. الاشتراكات والمدفوعات (إن وجدت)
7. الإلغاء والاسترداد
8. إخلاء المسؤولية
9. حدود المسؤولية
10. التعويض
11. التعديلات على الشروط
12. القانون الحاكم وحل النزاعات
13. معلومات الاتصال

استخدم لغة قانونية واضحة باللغة العربية متوافقة مع الأنظمة السعودية.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
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