import { db } from "./db";
import { knowledgeArticles } from "@shared/schema";

/**
 * Seed Knowledge Base with PDPL articles, FAQs, and service guides
 * This data will be used by the AI Assistant for semantic search
 */

export const knowledgeBaseSeedData = [
  // ============ PDPL LAW ARTICLES ============
  {
    title: "ما هو نظام حماية البيانات الشخصية (PDPL)؟",
    titleEn: "What is the Personal Data Protection Law (PDPL)?",
    content: `نظام حماية البيانات الشخصية (PDPL) هو نظام سعودي صدر عام 2021 لحماية خصوصية الأفراد وتنظيم معالجة بياناتهم الشخصية. يهدف النظام إلى:

1. حماية حقوق الأفراد في خصوصية بياناتهم
2. تنظيم جمع ومعالجة واستخدام البيانات الشخصية
3. ضمان أمن البيانات ومنع إساءة استخدامها
4. تحديد التزامات ومسؤوليات جهات التحكم والمعالجة

يطبق النظام على:
- جميع الجهات الحكومية والخاصة التي تجمع أو تعالج بيانات شخصية في السعودية
- الشركات خارج السعودية التي تقدم خدمات للمقيمين في المملكة
- أي جهة تتعامل مع بيانات الأفراد المقيمين في السعودية

البيانات الشخصية تشمل: الاسم، رقم الهوية، البريد الإلكتروني، رقم الجوال، الموقع الجغرافي، والمعلومات الصحية والمالية.`,
    contentEn: `The Personal Data Protection Law (PDPL) is a Saudi regulation issued in 2021 to protect individuals' privacy and regulate the processing of their personal data. The law aims to:

1. Protect individuals' rights to data privacy
2. Regulate the collection, processing, and use of personal data
3. Ensure data security and prevent misuse
4. Define obligations and responsibilities of data controllers and processors

The law applies to:
- All government and private entities that collect or process personal data in Saudi Arabia
- Companies outside Saudi Arabia that provide services to residents of the Kingdom
- Any entity dealing with data of individuals residing in Saudi Arabia

Personal data includes: name, ID number, email, mobile number, geographical location, and health and financial information.`,
    category: "pdpl_law",
    type: "article",
    language: "both",
    tags: ["pdpl", "privacy", "law", "introduction"],
    keywords: ["نظام حماية البيانات", "PDPL", "خصوصية", "بيانات شخصية"],
    priority: 100,
  },
  {
    title: "ما هي البيانات الحساسة في PDPL؟",
    titleEn: "What is Sensitive Data in PDPL?",
    content: `البيانات الحساسة (Sensitive Data) هي فئة خاصة من البيانات الشخصية التي تحتاج إلى حماية إضافية وفقاً لنظام PDPL. تشمل:

1. البيانات الصحية: التاريخ الطبي، التشخيصات، الوصفات الطبية
2. البيانات المالية: أرقام الحسابات البنكية، بيانات البطاقات الائتمانية
3. البيانات البيومترية: بصمة الإصبع، مسح القزحية، التعرف على الوجه
4. البيانات المتعلقة بالأصل العرقي أو الإثني
5. البيانات الجينية
6. الآراء السياسية والمعتقدات الدينية
7. البيانات المتعلقة بالجرائم والإدانات الجنائية

معالجة البيانات الحساسة:
- تتطلب موافقة صريحة من صاحب البيانات
- يجب تطبيق إجراءات أمنية مشددة
- يُحظر معالجتها إلا في حالات محددة نظاماً
- يجب إجراء تقييم الأثر على حماية البيانات (DPIA) قبل المعالجة`,
    contentEn: `Sensitive Data is a special category of personal data that requires additional protection under PDPL. It includes:

1. Health Data: Medical history, diagnoses, prescriptions
2. Financial Data: Bank account numbers, credit card information
3. Biometric Data: Fingerprints, iris scans, facial recognition
4. Data related to racial or ethnic origin
5. Genetic data
6. Political opinions and religious beliefs
7. Data related to criminal offenses and convictions

Processing Sensitive Data:
- Requires explicit consent from the data subject
- Must apply enhanced security measures
- Prohibited except in specific cases defined by law
- Requires Data Protection Impact Assessment (DPIA) before processing`,
    category: "pdpl_law",
    type: "definition",
    language: "both",
    tags: ["sensitive data", "بيانات حساسة", "security"],
    keywords: ["بيانات حساسة", "sensitive data", "صحية", "مالية", "biometric"],
    priority: 95,
  },
  {
    title: "ما الفرق بين جهة التحكم وجهة المعالجة؟",
    titleEn: "What is the difference between Data Controller and Data Processor?",
    content: `في نظام PDPL، هناك فرقان رئيسيان في أدوار معالجة البيانات:

**جهة التحكم (Data Controller):**
- الجهة التي تحدد أغراض ووسائل معالجة البيانات الشخصية
- مسؤولة عن قرارات المعالجة
- مثال: شركة تجمع بيانات عملائها لتقديم خدماتها

المسؤوليات:
- الحصول على موافقة صاحب البيانات
- ضمان الامتثال لنظام PDPL
- حماية البيانات من الوصول غير المصرح
- الاستجابة لطلبات أصحاب البيانات

**جهة المعالجة (Data Processor):**
- الجهة التي تعالج البيانات نيابة عن جهة التحكم
- تعمل وفقاً لتعليمات جهة التحكم
- مثال: شركة استضافة سحابية تخزن بيانات العملاء

المسؤوليات:
- معالجة البيانات فقط حسب تعليمات جهة التحكم
- تطبيق التدابير الأمنية المناسبة
- عدم الكشف عن البيانات لأطراف ثالثة
- مساعدة جهة التحكم في الامتثال

**ملاحظة مهمة:**
يجب أن يكون هناك عقد مكتوب بين جهة التحكم وجهة المعالجة يحدد التزامات كل طرف.`,
    contentEn: `In PDPL, there are two main roles in data processing:

**Data Controller:**
- Entity that determines purposes and means of processing personal data
- Responsible for processing decisions
- Example: A company collecting customer data for services

Responsibilities:
- Obtaining data subject consent
- Ensuring PDPL compliance
- Protecting data from unauthorized access
- Responding to data subject requests

**Data Processor:**
- Entity that processes data on behalf of the controller
- Works according to controller's instructions
- Example: Cloud hosting company storing customer data

Responsibilities:
- Process data only per controller's instructions
- Implement appropriate security measures
- Not disclose data to third parties
- Assist controller in compliance

**Important Note:**
There must be a written agreement between controller and processor defining each party's obligations.`,
    category: "pdpl_law",
    type: "definition",
    language: "both",
    tags: ["controller", "processor", "roles", "أدوار"],
    keywords: ["جهة التحكم", "جهة المعالجة", "controller", "processor", "مسؤوليات"],
    priority: 90,
  },
  
  // ============ FAQs ============
  {
    title: "ما هو سجل أنشطة معالجة البيانات (ROPA)؟",
    titleEn: "What is a Record of Processing Activities (ROPA)?",
    content: `سجل أنشطة معالجة البيانات (ROPA - Record of Processing Activities) هو وثيقة تفصيلية توثق جميع أنشطة معالجة البيانات الشخصية في المنصة.

**لماذا ROPA مهم؟**
- متطلب قانوني في PDPL
- يساعد على تحديد المخاطر
- يسهل الامتثال والمراجعات
- يوضح كيفية معالجة البيانات

**ما يجب تضمينه:**
1. اسم النشاط ووصفه
2. الغرض من معالجة البيانات
3. أنواع البيانات المجمعة
4. الأساس القانوني للمعالجة
5. المستلمون (من يستقبل البيانات)
6. مدة الاحتفاظ بالبيانات
7. التدابير الأمنية المطبقة
8. عمليات النقل الدولي للبيانات

**كيف تنشئ ROPA؟**
استخدم أداة ROPA Management في المنصة:
- انتقل إلى "الامتثال الداخلي"
- اختر "إدارة ROPA"
- أضف نشاط معالجة جديد
- املأ جميع الحقول المطلوبة`,
    contentEn: `A Record of Processing Activities (ROPA) is a detailed document that records all personal data processing activities in your organization.

**Why is ROPA important?**
- Legal requirement in PDPL
- Helps identify risks
- Facilitates compliance and audits
- Clarifies how data is processed

**What should be included:**
1. Activity name and description
2. Purpose of data processing
3. Types of data collected
4. Legal basis for processing
5. Recipients (who receives the data)
6. Data retention period
7. Security measures applied
8. International data transfers

**How to create ROPA:**
Use the ROPA Management tool in the platform:
- Go to "Internal Compliance"
- Select "ROPA Management"
- Add new processing activity
- Fill all required fields`,
    category: "faq",
    type: "howto",
    language: "both",
    tags: ["ROPA", "compliance", "documentation"],
    keywords: ["ROPA", "سجل أنشطة", "معالجة", "processing activities"],
    priority: 85,
  },
  {
    title: "كيف أتعامل مع طلبات أصحاب البيانات (DSAR)؟",
    titleEn: "How do I handle Data Subject Access Requests (DSAR)?",
    content: `طلبات أصحاب البيانات (DSAR - Data Subject Access Requests) هي حقوق يمنحها PDPL للأفراد. يجب الاستجابة لها خلال 30 يوماً.

**حقوق أصحاب البيانات:**
1. **الحق في الوصول:** الحصول على نسخة من بياناتهم
2. **الحق في التصحيح:** تصحيح البيانات غير الدقيقة
3. **الحق في الحذف:** حذف البيانات في ظروف معينة
4. **الحق في الاعتراض:** الاعتراض على معالجة بياناتهم
5. **الحق في سحب الموافقة:** إلغاء الموافقة المسبقة

**كيف تتعامل مع DSAR؟**
استخدم أداة DSAR Management:
1. سجل الطلب في النظام
2. تحقق من هوية الطالب
3. ابحث عن جميع البيانات المتعلقة بالشخص
4. راجع ما إذا كانت هناك استثناءات قانونية
5. قم بإعداد الرد (توفير البيانات، التصحيح، الحذف...)
6. أرسل الرد خلال 30 يوماً

**استثناءات:**
- البيانات المطلوبة قانوناً
- البيانات الضرورية لعقد قائم
- البيانات المحمية بسبب أمني أو قانوني`,
    contentEn: `Data Subject Access Requests (DSAR) are rights granted by PDPL to individuals. They must be responded to within 30 days.

**Data Subject Rights:**
1. **Right to Access:** Obtain a copy of their data
2. **Right to Rectification:** Correct inaccurate data
3. **Right to Erasure:** Delete data in certain circumstances
4. **Right to Object:** Object to data processing
5. **Right to Withdraw Consent:** Revoke previously given consent

**How to handle DSAR:**
Use the DSAR Management tool:
1. Record the request in the system
2. Verify the requester's identity
3. Search for all related data
4. Review if legal exceptions apply
5. Prepare response (provide data, correct, delete...)
6. Send response within 30 days

**Exceptions:**
- Legally required data
- Data necessary for existing contract
- Data protected for security or legal reasons`,
    category: "faq",
    type: "howto",
    language: "both",
    tags: ["DSAR", "rights", "requests", "طلبات"],
    keywords: ["DSAR", "طلبات أصحاب البيانات", "حقوق", "data subject rights"],
    priority: 85,
  },
  {
    title: "متى يجب إجراء تقييم الأثر (DPIA)؟",
    titleEn: "When should I conduct a Data Protection Impact Assessment (DPIA)?",
    content: `تقييم الأثر على حماية البيانات (DPIA) هو تحليل شامل للمخاطر المحتملة على خصوصية الأفراد قبل بدء نشاط معالجة جديد.

**متى DPIA إلزامي؟**
يجب إجراء DPIA عند:
1. معالجة بيانات حساسة على نطاق واسع
2. استخدام تقنيات جديدة (AI، تعلم آلي...)
3. المراقبة المنهجية للأفراد
4. المعالجة الآلية التي تؤثر على حقوق الأفراد
5. نقل البيانات خارج السعودية
6. معالجة بيانات الأطفال
7. دمج بيانات من مصادر متعددة

**خطوات DPIA:**
1. وصف نشاط المعالجة
2. تحديد الضرورة والتناسب
3. تقييم المخاطر المحتملة
4. تحديد التدابير الوقائية
5. مراجعة الأثر على الأفراد
6. التوثيق والموافقة

**استخدم أداة DPIA:**
- انتقل إلى "الامتثال الداخلي"
- اختر "تقييم الأثر (DPIA)"
- املأ النموذج التفصيلي
- راجع النتائج والتوصيات`,
    contentEn: `A Data Protection Impact Assessment (DPIA) is a comprehensive analysis of potential privacy risks before starting a new processing activity.

**When is DPIA mandatory?**
DPIA must be conducted when:
1. Processing sensitive data at large scale
2. Using new technologies (AI, machine learning...)
3. Systematic monitoring of individuals
4. Automated processing affecting individual rights
5. Transferring data outside Saudi Arabia
6. Processing children's data
7. Combining data from multiple sources

**DPIA Steps:**
1. Describe the processing activity
2. Identify necessity and proportionality
3. Assess potential risks
4. Define mitigation measures
5. Review impact on individuals
6. Document and approve

**Use DPIA Tool:**
- Go to "Internal Compliance"
- Select "DPIA Assessment"
- Complete detailed form
- Review results and recommendations`,
    category: "faq",
    type: "howto",
    language: "both",
    tags: ["DPIA", "assessment", "risk", "تقييم"],
    keywords: ["DPIA", "تقييم الأثر", "مخاطر", "impact assessment"],
    priority: 85,
  },

  // ============ SERVICE GUIDES ============
  {
    title: "كيف أستخدم مولد سياسة الخصوصية؟",
    titleEn: "How to use the Privacy Policy Generator?",
    content: `مولد سياسة الخصوصية يساعدك على إنشاء سياسة خصوصية متوافقة مع PDPL باستخدام الذكاء الاصطناعي.

**خطوات الاستخدام:**

**القسم الأول - هوية الجهة:**
1. أدخل اسم شركتك/مؤسستك
2. حدد نوع النشاط (تجارة إلكترونية، خدمات، تطبيق...)
3. اختر صفة الجهة (حكومية، خاصة، فردية)
4. أدخل معلومات التواصل

**القسم الثاني - جمع البيانات:**
1. أضف أنواع البيانات التي تجمعها (اسم، بريد، جوال...)
2. حدد الغرض لكل نوع بيانات
3. اختر الأساس القانوني (موافقة، عقد، التزام قانوني...)

**القسم الثالث - المعالجة والأمان:**
1. وضح طرق معالجة البيانات
2. حدد إذا كنت تشارك البيانات مع أطراف ثالثة
3. أدخل التدابير الأمنية المطبقة
4. حدد مدة الاحتفاظ بالبيانات

**بعد الإنشاء:**
- انتظر 30-60 ثانية للتوليد بالذكاء الاصطناعي
- راجع السياسة المولدة
- حملها بصيغة HTML
- انشرها على موقعك الإلكتروني`,
    contentEn: `The Privacy Policy Generator helps you create a PDPL-compliant privacy policy using AI.

**Usage Steps:**

**Section 1 - Entity Identity:**
1. Enter your company/organization name
2. Specify business type (e-commerce, services, app...)
3. Choose entity type (government, private, individual)
4. Enter contact information

**Section 2 - Data Collection:**
1. Add data types you collect (name, email, phone...)
2. Specify purpose for each data type
3. Choose legal basis (consent, contract, legal obligation...)

**Section 3 - Processing and Security:**
1. Explain data processing methods
2. Indicate if you share data with third parties
3. Enter applied security measures
4. Specify data retention period

**After Generation:**
- Wait 30-60 seconds for AI generation
- Review generated policy
- Download in HTML format
- Publish on your website`,
    category: "service_guide",
    type: "howto",
    language: "both",
    tags: ["privacy policy", "generator", "سياسة خصوصية"],
    keywords: ["مولد سياسة الخصوصية", "privacy policy generator", "إنشاء"],
    priority: 80,
  },
  {
    title: "كيف أستخدم مولد الشروط والأحكام؟",
    titleEn: "How to use the Terms & Conditions Generator?",
    content: `مولد الشروط والأحكام ينشئ وثيقة قانونية متوافقة مع الأنظمة السعودية.

**الخطوات:**

**القسم 1 - معلومات الشركة:**
- اسم الشركة
- رابط الموقع
- نوع النشاط التجاري
- وصف الخدمات

**القسم 2 - تفاصيل الخدمة:**
- هل لديك حسابات مستخدمين؟
- هل تقدم اشتراكات؟
- طرق الدفع المتاحة

**القسم 3 - معلومات قانونية:**
- القانون الحاكم (الأنظمة السعودية)
- الجهة القضائية

**القسم 4 - التواصل:**
- البريد الإلكتروني
- رقم الجوال
- العنوان

**الإنشاء:**
1. املأ جميع الحقول المطلوبة
2. اضغط "إنشاء الشروط والأحكام"
3. انتظر التوليد (15-30 ثانية)
4. راجع الوثيقة
5. حمل بصيغة HTML

**ملاحظة:**
الوثيقة تتضمن بنود إلزامية من الأنظمة السعودية + تخصيص حسب نشاطك.`,
    contentEn: `The Terms & Conditions Generator creates a legal document compliant with Saudi regulations.

**Steps:**

**Section 1 - Company Info:**
- Company name
- Website URL
- Business type
- Service description

**Section 2 - Service Details:**
- Do you have user accounts?
- Do you offer subscriptions?
- Available payment methods

**Section 3 - Legal Info:**
- Governing law (Saudi regulations)
- Jurisdiction

**Section 4 - Contact:**
- Email
- Phone number
- Address

**Generation:**
1. Fill all required fields
2. Click "Generate Terms & Conditions"
3. Wait for generation (15-30 seconds)
4. Review document
5. Download in HTML format

**Note:**
Document includes mandatory Saudi clauses + customization for your business.`,
    category: "service_guide",
    type: "howto",
    language: "both",
    tags: ["terms", "conditions", "شروط وأحكام"],
    keywords: ["مولد الشروط والأحكام", "terms generator", "قانوني"],
    priority: 80,
  },

  // ============ GLOSSARY ============
  {
    title: "مسرد المصطلحات - PDPL",
    titleEn: "Glossary - PDPL Terms",
    content: `**المصطلحات الأساسية في نظام حماية البيانات الشخصية:**

**البيانات الشخصية:**
أي معلومات تتعلق بشخص طبيعي محدد أو قابل للتحديد.

**صاحب البيانات:**
الشخص الطبيعي الذي تتعلق به البيانات الشخصية.

**جهة التحكم:**
الجهة التي تحدد أغراض ووسائل معالجة البيانات الشخصية.

**جهة المعالجة:**
الجهة التي تعالج البيانات الشخصية نيابة عن جهة التحكم.

**المعالجة:**
أي عملية على البيانات: جمع، تسجيل، تنظيم، حفظ، تعديل، استرجاع، استخدام، نقل، نشر، حذف.

**الموافقة:**
إقرار صريح وواضح من صاحب البيانات بالموافقة على معالجة بياناته.

**البيانات الحساسة:**
بيانات خاصة تتطلب حماية إضافية (صحية، مالية، بيومترية...).

**النقل الدولي:**
نقل البيانات الشخصية خارج حدود المملكة العربية السعودية.

**خرق البيانات:**
أي وصول غير مصرح به أو فقدان أو تدمير أو تغيير للبيانات الشخصية.`,
    contentEn: `**Key Terms in Personal Data Protection Law:**

**Personal Data:**
Any information relating to an identified or identifiable natural person.

**Data Subject:**
The natural person to whom the personal data relates.

**Data Controller:**
The entity that determines the purposes and means of processing personal data.

**Data Processor:**
The entity that processes personal data on behalf of the controller.

**Processing:**
Any operation on data: collection, recording, organization, storage, modification, retrieval, use, transfer, disclosure, deletion.

**Consent:**
Clear and explicit acknowledgment from the data subject agreeing to process their data.

**Sensitive Data:**
Special data requiring additional protection (health, financial, biometric...).

**International Transfer:**
Transfer of personal data outside the Kingdom of Saudi Arabia.

**Data Breach:**
Any unauthorized access, loss, destruction, or alteration of personal data.`,
    category: "glossary",
    type: "definition",
    language: "both",
    tags: ["glossary", "terms", "مسرد", "مصطلحات"],
    keywords: ["مسرد", "مصطلحات", "glossary", "definitions", "تعريفات"],
    priority: 75,
  },
];

/**
 * Main function to seed knowledge base
 */
export async function seedKnowledgeBase() {
  console.log("🌱 Seeding Knowledge Base...");
  
  try {
    // Insert seed data (without embeddings initially)
    const inserted = await db.insert(knowledgeArticles).values(
      knowledgeBaseSeedData.map((article) => ({
        ...article,
        isPublished: true,
      }))
    ).returning();

    console.log(`✅ Inserted ${inserted.length} knowledge articles`);
    console.log("ℹ️  Note: Embeddings will be generated via OpenAI API when articles are first indexed");
    
    return inserted;
  } catch (error) {
    console.error("❌ Error seeding knowledge base:", error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedKnowledgeBase()
    .then(() => {
      console.log("✅ Knowledge Base seeding completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Seeding failed:", error);
      process.exit(1);
    });
}
