/**
 * Seed script for Terms & Conditions Templates
 * Based on Saudi legal framework
 */

import type { 
  InsertLegalSource, 
  InsertTermsTemplate, 
  InsertTemplateSection,
  InsertTermsTemplateSection,
  InsertSectionLegalSource
} from "@shared/schema";

// ====================================
// Legal Sources Data
// المصادر القانونية
// ====================================

export const legalSourcesData: InsertLegalSource[] = [
  {
    code: "ECOMMERCE_LAW",
    title: "نظام التجارة الإلكترونية",
    sourceType: "law",
    fileReference: "E-commerce-system.pdf",
    articles: [
      {
        number: "1",
        title: "تعريفات",
        content: "يُقصد بالألفاظ والعبارات الآتية -أينما وردت في هذا النظام- المعاني المبينة أمام كل منها..."
      },
      {
        number: "3",
        title: "التزامات الممارس",
        content: "على الممارس الالتزام بالآتي: ١- الإفصاح عن هويته ووسائل الاتصال به... ٢- الإفصاح عن المنتج..."
      },
      {
        number: "4",
        title: "حقوق المستهلك",
        content: "للمستهلك الحق في: ١- معرفة المعلومات الأساسية عن المنتج... ٢- العدول عن الشراء خلال سبعة أيام..."
      },
      {
        number: "9",
        title: "العقوبات",
        content: "مع عدم الإخلال بأي عقوبة أشد منصوص عليها في أي نظام آخر، يعاقب كل من يخالف أحكام هذا النظام..."
      }
    ],
    effectiveDate: new Date("2019-08-11")
  },
  {
    code: "ERECS",
    title: "اللائحة التنفيذية لنظام التجارة الإلكترونية",
    sourceType: "regulation",
    fileReference: "ERECS.pdf",
    articles: [
      {
        number: "5",
        title: "الإفصاح عن معلومات الممارس",
        content: "يجب على الممارس الإفصاح عن: ١- اسمه التجاري ورقم السجل التجاري... ٢- عنوان مقره الرئيسي..."
      },
      {
        number: "7",
        title: "الإفصاح عن معلومات المنتج",
        content: "يجب على الممارس الإفصاح بشكل واضح عن: ١- الوصف الأساسي للمنتج... ٢- سعر المنتج شاملاً الضريبة..."
      },
      {
        number: "12",
        title: "حق العدول",
        content: "للمستهلك الحق في العدول عن الشراء خلال سبعة أيام من تاريخ التسليم دون إبداء الأسباب..."
      },
      {
        number: "14",
        title: "استرداد المبالغ",
        content: "على الممارس رد كامل المبلغ المدفوع خلال مدة لا تتجاوز أربعة عشر يوماً من تاريخ إخطاره بالعدول..."
      }
    ],
    effectiveDate: new Date("2020-01-01")
  },
  {
    code: "TELECOM_LAW",
    title: "نظام الاتصالات وتقنية المعلومات",
    sourceType: "law",
    fileReference: "LA_001_A_Telecom Act.pdf",
    articles: [
      {
        number: "3",
        title: "أهداف النظام",
        content: "يهدف هذا النظام إلى: ١- تنظيم قطاع الاتصالات وتقنية المعلومات... ٢- حماية حقوق المستخدمين..."
      },
      {
        number: "8",
        title: "التزامات مقدمي الخدمة",
        content: "على مقدم الخدمة: ١- الحصول على ترخيص من الهيئة... ٢- الالتزام بشروط الترخيص..."
      }
    ],
    effectiveDate: new Date("2001-03-05")
  },
  {
    code: "TELECOM_EXEC_REG",
    title: "اللائحة التنفيذية لنظام الاتصالات وتقنية المعلومات",
    sourceType: "regulation",
    fileReference: "اللائحةالتنفيذية لنظام الاتصالات وتقنية المعلومات.pdf",
    articles: [
      {
        number: "15",
        title: "حقوق المستخدمين",
        content: "للمستخدم الحق في: ١- الحصول على معلومات واضحة عن الخدمة... ٢- الشكوى للهيئة..."
      }
    ],
    effectiveDate: new Date("2002-01-01")
  },
  {
    code: "CONSUMER_RIGHTS_MCI",
    title: "دليل حقوق وواجبات المستهلك",
    sourceType: "guideline",
    fileReference: "MCIDoc.pdf",
    articles: [
      {
        number: "1",
        title: "حقوق المستهلك الأساسية",
        content: "من حقوق المستهلك: ١- الحصول على منتج آمن... ٢- الحصول على معلومات صحيحة وكافية... ٣- حرية الاختيار..."
      },
      {
        number: "2",
        title: "واجبات المستهلك",
        content: "على المستهلك: ١- التأكد من صلاحية المنتج... ٢- الإبلاغ عن أي عيوب..."
      }
    ],
    effectiveDate: new Date("2020-01-01")
  },
  {
    code: "ECOMMERCE_COMPLIANCE_CHECKLIST",
    title: "قائمة التقييم الذاتي للامتثال للتجارة الإلكترونية",
    sourceType: "guideline",
    fileReference: "E-Commerce-Compliance-List.pdf",
    articles: [
      {
        number: "1",
        title: "متطلبات الإفصاح",
        content: "يجب على المتجر الإلكتروني: ١- عرض رقم السجل التجاري بشكل واضح... ٢- الإفصاح عن أسعار المنتجات شاملة الضريبة..."
      }
    ],
    effectiveDate: new Date("2021-01-01")
  }
];

// ====================================
// Terms Templates Data
// قوالب الشروط والأحكام
// ====================================

export const termsTemplatesData: InsertTermsTemplate[] = [
  {
    businessType: "ecommerce_general",
    sector: "retail",
    activityScale: "smb",
    locale: "ar-SA",
    title: "شروط وأحكام - متجر إلكتروني عام",
    summary: "قالب شامل للمتاجر الإلكترونية العامة في المملكة العربية السعودية",
    status: "active",
    version: "1.0",
    basePromptSeed: {
      focus: "تجارة إلكترونية عامة",
      mandatoryClauses: ["intro", "services", "payment", "shipping", "returns", "liability", "dispute_resolution"],
      optionalClauses: ["warranties", "intellectual_property"],
      tone: "formal_friendly"
    }
  },
  {
    businessType: "ecommerce_automotive",
    sector: "automotive",
    activityScale: "enterprise",
    locale: "ar-SA",
    title: "شروط وأحكام - متجر سيارات ومركبات",
    summary: "قالب متخصص لمنصات بيع السيارات والمركبات",
    status: "active",
    version: "1.0",
    basePromptSeed: {
      focus: "بيع المركبات",
      mandatoryClauses: ["intro", "services", "payment", "delivery", "warranties", "inspection", "liability", "dispute_resolution"],
      specialRequirements: ["vehicle_inspection", "transfer_procedures", "insurance_requirements"],
      tone: "formal"
    }
  },
  {
    businessType: "ecommerce_jewelry",
    sector: "luxury",
    activityScale: "smb",
    locale: "ar-SA",
    title: "شروط وأحكام - متجر ذهب ومجوهرات",
    summary: "قالب للمتاجر المتخصصة في بيع الذهب والمجوهرات",
    status: "active",
    version: "1.0",
    basePromptSeed: {
      focus: "ذهب ومجوهرات",
      mandatoryClauses: ["intro", "services", "payment", "authenticity", "returns", "liability", "dispute_resolution"],
      specialRequirements: ["gold_purity_certification", "gemstone_authentication", "valuation"],
      tone: "formal_premium"
    }
  },
  {
    businessType: "ecommerce_food",
    sector: "food_beverage",
    activityScale: "smb",
    locale: "ar-SA",
    title: "شروط وأحكام - متجر مواد غذائية",
    summary: "قالب للمتاجر الإلكترونية للمواد الغذائية",
    status: "active",
    version: "1.0",
    basePromptSeed: {
      focus: "مواد غذائية",
      mandatoryClauses: ["intro", "services", "payment", "shipping", "returns_limited", "food_safety", "liability", "dispute_resolution"],
      specialRequirements: ["expiry_dates", "storage_conditions", "allergen_information"],
      tone: "formal_friendly"
    }
  },
  {
    businessType: "telecommunications",
    sector: "telecom",
    activityScale: "enterprise",
    locale: "ar-SA",
    title: "شروط وأحكام - خدمات اتصالات",
    summary: "قالب لمقدمي خدمات الاتصالات وتقنية المعلومات",
    status: "active",
    version: "1.0",
    basePromptSeed: {
      focus: "خدمات اتصالات",
      mandatoryClauses: ["intro", "service_description", "subscriptions", "payment", "service_levels", "termination", "liability", "dispute_resolution"],
      specialRequirements: ["telecom_license", "service_quality_standards", "data_protection"],
      tone: "formal"
    }
  },
  {
    businessType: "digital_services",
    sector: "technology",
    activityScale: "smb",
    locale: "ar-SA",
    title: "شروط وأحكام - خدمات رقمية",
    summary: "قالب للمنصات الرقمية وخدمات SaaS",
    status: "active",
    version: "1.0",
    basePromptSeed: {
      focus: "خدمات رقمية",
      mandatoryClauses: ["intro", "services", "subscriptions", "payment", "user_accounts", "intellectual_property", "data_privacy", "liability", "dispute_resolution"],
      specialRequirements: ["software_license", "api_usage", "data_retention"],
      tone: "formal_tech"
    }
  }
];

// ====================================
// Template Sections Data
// أقسام القوالب
// ====================================

export const templateSectionsData: InsertTemplateSection[] = [
  // ============ Ecommerce General Template Sections ============
  {
    templateId: "TO_BE_REPLACED_ECOMMERCE_GENERAL", // Will be replaced with actual ID
    slug: "intro",
    heading: "١. المقدمة وقبول الشروط",
    ordering: 1,
    clauseText: `مرحباً بكم في {{companyName}}. هذه الشروط والأحكام تنظم استخدامكم لموقعنا الإلكتروني {{websiteUrl}} وشراء المنتجات منه.

بمجرد تصفحك للموقع أو إتمام أي عملية شراء، فإنك توافق على الالتزام بهذه الشروط والأحكام. إذا كنت لا توافق على أي جزء من هذه الشروط، يُرجى عدم استخدام الموقع.

نحتفظ بالحق في تعديل هذه الشروط في أي وقت، وسيتم نشر أي تعديلات على هذه الصفحة.`,
    placeholders: [
      { key: "companyName", description: "اسم الشركة" },
      { key: "websiteUrl", description: "عنوان الموقع الإلكتروني" }
    ],
    legalBasis: [
      { sourceCode: "ECOMMERCE_LAW", articles: ["1", "3"] }
    ],
    riskLevel: "high",
    isRequired: true
  },
  {
    templateId: "TO_BE_REPLACED_ECOMMERCE_GENERAL",
    slug: "merchant_info",
    heading: "٢. معلومات الممارس",
    ordering: 2,
    clauseText: `تُدار هذه المنصة بواسطة:
- الاسم التجاري: {{companyName}}
{{#if commercialRegistration}}- رقم السجل التجاري: {{commercialRegistration}}{{/if}}
{{#if taxNumber}}- الرقم الضريبي: {{taxNumber}}{{/if}}
- البريد الإلكتروني: {{contactEmail}}
{{#if contactPhone}}- الهاتف: {{contactPhone}}{{/if}}

تم إصدار هذه الشروط والأحكام وفقاً لنظام التجارة الإلكترونية ولائحته التنفيذية في المملكة العربية السعودية.`,
    placeholders: [
      { key: "companyName", description: "الاسم التجاري" },
      { key: "commercialRegistration", description: "رقم السجل التجاري" },
      { key: "taxNumber", description: "الرقم الضريبي" },
      { key: "contactEmail", description: "البريد الإلكتروني" },
      { key: "contactPhone", description: "رقم الهاتف" }
    ],
    legalBasis: [
      { sourceCode: "ECOMMERCE_LAW", articles: ["3"] },
      { sourceCode: "ERECS", articles: ["5"] }
    ],
    riskLevel: "critical",
    isRequired: true
  },
  {
    templateId: "TO_BE_REPLACED_ECOMMERCE_GENERAL",
    slug: "services",
    heading: "٣. الخدمات والمنتجات",
    ordering: 3,
    clauseText: `نقدم لكم {{serviceDescription}}

نبذل قصارى جهدنا لضمان دقة أوصاف المنتجات والأسعار المعروضة على الموقع. ومع ذلك، قد تحدث أخطاء غير مقصودة. نحتفظ بالحق في تصحيح أي أخطاء في الأسعار أو الأوصاف وإلغاء أو رفض أي طلب تم تقديمه بناءً على معلومات غير صحيحة.

جميع الأسعار المعروضة تشمل ضريبة القيمة المضافة بنسبة ١٥٪.`,
    placeholders: [
      { key: "serviceDescription", description: "وصف الخدمات والمنتجات" }
    ],
    legalBasis: [
      { sourceCode: "ERECS", articles: ["7"] }
    ],
    riskLevel: "high",
    isRequired: true
  },
  {
    templateId: "TO_BE_REPLACED_ECOMMERCE_GENERAL",
    slug: "payment",
    heading: "٤. الدفع والأسعار",
    ordering: 4,
    clauseText: `نقبل طرق الدفع التالية:
{{#each paymentMethods}}
- {{this}}
{{/each}}

جميع المدفوعات آمنة ومشفرة. لا نقوم بتخزين معلومات بطاقتك الائتمانية على خوادمنا.

يجب إتمام عملية الدفع بالكامل قبل شحن المنتج. في حالة فشل عملية الدفع، سيتم إلغاء الطلب تلقائياً.`,
    placeholders: [
      { key: "paymentMethods", description: "قائمة وسائل الدفع المتاحة" }
    ],
    legalBasis: [
      { sourceCode: "ECOMMERCE_LAW", articles: ["3"] }
    ],
    riskLevel: "critical",
    isRequired: true
  },
  {
    templateId: "TO_BE_REPLACED_ECOMMERCE_GENERAL",
    slug: "shipping",
    heading: "٥. الشحن والتوصيل",
    ordering: 5,
    clauseText: `{{#if shippingPolicy}}{{shippingPolicy}}{{else}}نقوم بالشحن إلى جميع مناطق المملكة العربية السعودية.

مدة التوصيل المتوقعة: {{deliveryTimeframe}}

يتم احتساب رسوم الشحن بناءً على الوزن والموقع وسيتم عرضها قبل إتمام عملية الدفع.

نبذل قصارى جهدنا للالتزام بمواعيد التسليم المحددة، لكننا غير مسؤولين عن أي تأخير ناتج عن ظروف خارجة عن إرادتنا.{{/if}}`,
    placeholders: [
      { key: "shippingPolicy", description: "سياسة الشحن المخصصة" },
      { key: "deliveryTimeframe", description: "مدة التوصيل المتوقعة" }
    ],
    legalBasis: [
      { sourceCode: "ERECS", articles: ["7"] }
    ],
    riskLevel: "medium",
    isRequired: true
  },
  {
    templateId: "TO_BE_REPLACED_ECOMMERCE_GENERAL",
    slug: "returns",
    heading: "٦. حق العدول والاسترجاع",
    ordering: 6,
    clauseText: `وفقاً لنظام التجارة الإلكترونية ولائحته التنفيذية، يحق للمستهلك العدول عن الشراء خلال **سبعة أيام** من تاريخ استلام المنتج دون إبداء الأسباب.

شروط الاسترجاع:
- يجب أن يكون المنتج في حالته الأصلية ولم يتم استخدامه
- يجب أن تكون العبوة والملحقات كاملة
- يجب تقديم إثبات الشراء (الفاتورة)

{{#if returnPolicy}}{{returnPolicy}}{{/if}}

سيتم رد كامل المبلغ المدفوع خلال **أربعة عشر يوماً** من تاريخ إخطارنا بالعدول، بنفس وسيلة الدفع المستخدمة.

المنتجات المستثناة من حق العدول:
- المنتجات القابلة للتلف السريع
- المنتجات المختومة التي تم فتحها لأسباب صحية
- المنتجات المخصصة حسب طلب العميل`,
    placeholders: [
      { key: "returnPolicy", description: "سياسة الاسترجاع الإضافية" }
    ],
    legalBasis: [
      { sourceCode: "ECOMMERCE_LAW", articles: ["4"] },
      { sourceCode: "ERECS", articles: ["12", "14"] }
    ],
    riskLevel: "critical",
    isRequired: true
  },
  {
    templateId: "TO_BE_REPLACED_ECOMMERCE_GENERAL",
    slug: "liability",
    heading: "٧. المسؤولية والضمانات",
    ordering: 7,
    clauseText: `نسعى جاهدين لتقديم منتجات عالية الجودة. ومع ذلك، فإننا لا نتحمل المسؤولية عن:
- أي أضرار غير مباشرة أو تبعية ناتجة عن استخدام المنتج
- فقدان البيانات أو الأرباح
- أي ضرر ناتج عن سوء الاستخدام

{{#if liabilityLimits}}{{liabilityLimits}}{{/if}}

الحد الأقصى للمسؤولية لا يتجاوز قيمة المنتج المشترى.

ضمان المنتج:
- نلتزم بأي ضمانات يقدمها المُصنّع
- يجب الإبلاغ عن أي عيوب خلال فترة الضمان المحددة`,
    placeholders: [
      { key: "liabilityLimits", description: "حدود المسؤولية الإضافية" }
    ],
    legalBasis: [
      { sourceCode: "CONSUMER_RIGHTS_MCI", articles: ["1"] }
    ],
    riskLevel: "high",
    isRequired: true
  },
  {
    templateId: "TO_BE_REPLACED_ECOMMERCE_GENERAL",
    slug: "dispute_resolution",
    heading: "٨. تسوية النزاعات والقانون الواجب التطبيق",
    ordering: 8,
    clauseText: `تخضع هذه الشروط والأحكام لأنظمة المملكة العربية السعودية.

في حالة نشوء أي نزاع، يحق للمستهلك:
١. التواصل مع خدمة العملاء عبر: {{contactEmail}}
٢. تقديم شكوى لوزارة التجارة عبر تطبيق "بلاغ تجاري"
٣. اللجوء إلى لجان الفصل في المخالفات والمنازعات التجارية

{{#if disputeResolution}}{{disputeResolution}}{{/if}}

نلتزم بالرد على الشكاوى خلال ثلاثة أيام عمل.`,
    placeholders: [
      { key: "contactEmail", description: "البريد الإلكتروني" },
      { key: "disputeResolution", description: "آليات تسوية النزاعات الإضافية" }
    ],
    legalBasis: [
      { sourceCode: "ECOMMERCE_LAW", articles: ["9"] }
    ],
    riskLevel: "high",
    isRequired: true
  }
];
