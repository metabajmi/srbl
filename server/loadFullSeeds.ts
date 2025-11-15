/**
 * Full Seed Data Loader for Terms & Conditions Templates
 * Loads complete dataset: 6 legal sources, 6 templates, 8 sections
 * Uses junction tables for many-to-many relationships
 */

import { db } from "./db";
import { 
  legalSources, 
  termsTemplates, 
  templateSections,
  termsTemplateSections,
  sectionLegalSources
} from "@shared/schema";

// ====================================
// Legal Sources (6)
// ====================================

const legalSourcesData = [
  {
    code: "ECOMMERCE_LAW",
    title: "نظام التجارة الإلكترونية",
    description: "النظام السعودي الرئيسي لتنظيم التجارة الإلكترونية",
    sourceType: "law" as const,
    issuingAuthority: "وزارة التجارة",
    effectiveDate: new Date("2019-08-11"),
    publicationDate: new Date("2019-08-11")
  },
  {
    code: "ERECS",
    title: "اللائحة التنفيذية لنظام التجارة الإلكترونية",
    description: "اللائحة التنفيذية التفصيلية لنظام التجارة الإلكترونية",
    sourceType: "regulation" as const,
    issuingAuthority: "وزارة التجارة",
    effectiveDate: new Date("2020-01-01"),
    publicationDate: new Date("2020-01-01")
  },
  {
    code: "TELECOM_LAW",
    title: "نظام الاتصالات وتقنية المعلومات",
    description: "النظام المنظم لقطاع الاتصالات وتقنية المعلومات",
    sourceType: "law" as const,
    issuingAuthority: "هيئة الاتصالات وتقنية المعلومات",
    effectiveDate: new Date("2001-03-05"),
    publicationDate: new Date("2001-03-05")
  },
  {
    code: "TELECOM_EXEC_REG",
    title: "اللائحة التنفيذية لنظام الاتصالات",
    description: "اللائحة التنفيذية لنظام الاتصالات وتقنية المعلومات",
    sourceType: "regulation" as const,
    issuingAuthority: "هيئة الاتصالات وتقنية المعلومات",
    effectiveDate: new Date("2002-01-01"),
    publicationDate: new Date("2002-01-01")
  },
  {
    code: "CONSUMER_RIGHTS_MCI",
    title: "دليل حقوق وواجبات المستهلك",
    description: "دليل وزارة التجارة لحقوق وواجبات المستهلك",
    sourceType: "guideline" as const,
    issuingAuthority: "وزارة التجارة",
    effectiveDate: new Date("2020-01-01"),
    publicationDate: new Date("2020-01-01")
  },
  {
    code: "ECOMMERCE_COMPLIANCE",
    title: "قائمة التقييم الذاتي للامتثال للتجارة الإلكترونية",
    description: "قائمة مرجعية لمتطلبات الامتثال في التجارة الإلكترونية",
    sourceType: "guideline" as const,
    issuingAuthority: "وزارة التجارة",
    effectiveDate: new Date("2021-01-01"),
    publicationDate: new Date("2021-01-01")
  }
];

// ====================================
// Terms Templates (6)
// ====================================

const termsTemplatesData = [
  {
    businessType: "ecommerce_general" as const,
    sector: "retail",
    activityScale: "smb" as const,
    locale: "ar-SA",
    title: "شروط وأحكام - متجر إلكتروني عام",
    summary: "قالب شامل للمتاجر الإلكترونية العامة",
    status: "active" as const,
    version: "1.0"
  },
  {
    businessType: "ecommerce_automotive" as const,
    sector: "automotive",
    activityScale: "enterprise" as const,
    locale: "ar-SA",
    title: "شروط وأحكام - متجر سيارات ومركبات",
    summary: "قالب متخصص لمنصات بيع السيارات والمركبات",
    status: "active" as const,
    version: "1.0"
  },
  {
    businessType: "ecommerce_fashion" as const,
    sector: "fashion",
    activityScale: "smb" as const,
    locale: "ar-SA",
    title: "شروط وأحكام - متجر أزياء وموضة",
    summary: "قالب للمتاجر المتخصصة في الأزياء والموضة",
    status: "active" as const,
    version: "1.0"
  },
  {
    businessType: "telecommunications" as const,
    sector: "telecom",
    activityScale: "enterprise" as const,
    locale: "ar-SA",
    title: "شروط وأحكام - خدمات اتصالات",
    summary: "قالب لمقدمي خدمات الاتصالات وتقنية المعلومات",
    status: "active" as const,
    version: "1.0"
  },
  {
    businessType: "digital_services" as const,
    sector: "technology",
    activityScale: "smb" as const,
    locale: "ar-SA",
    title: "شروط وأحكام - خدمات رقمية",
    summary: "قالب للمنصات الرقمية وخدمات SaaS",
    status: "active" as const,
    version: "1.0"
  },
  {
    businessType: "financial_services" as const,
    sector: "finance",
    activityScale: "enterprise" as const,
    locale: "ar-SA",
    title: "شروط وأحكام - خدمات مالية",
    summary: "قالب لمقدمي الخدمات المالية والتقنية المالية",
    status: "active" as const,
    version: "1.0"
  }
];

// ====================================
// Template Sections (8 reusable sections)
// ====================================

const templateSectionsData = [
  {
    slug: "intro",
    heading: "١. المقدمة وقبول الشروط",
    clauseText: `مرحباً بكم في {{company_name}}. هذه الشروط والأحكام تنظم استخدامكم لموقعنا الإلكتروني {{website_url}} وشراء المنتجات/الخدمات منه.

بمجرد تصفحك للموقع أو إتمام أي عملية شراء، فإنك توافق على الالتزام بهذه الشروط والأحكام. إذا كنت لا توافق على أي جزء من هذه الشروط، يُرجى عدم استخدام الموقع.`,
    placeholders: ["company_name", "website_url"]
  },
  {
    slug: "merchant_info",
    heading: "٢. معلومات الممارس",
    clauseText: `تُدار هذه المنصة بواسطة:
- الاسم التجاري: {{company_name}}
- رقم السجل التجاري: {{commercial_registration}}
- الرقم الضريبي: {{tax_number}}
- البريد الإلكتروني: {{contact_email}}
- الهاتف: {{contact_phone}}`,
    placeholders: ["company_name", "commercial_registration", "tax_number", "contact_email", "contact_phone"]
  },
  {
    slug: "services",
    heading: "٣. الخدمات والمنتجات",
    clauseText: `نقدم عبر منصتنا: {{service_description}}

نسعى لضمان دقة المعلومات المعروضة، لكننا لا نضمن خلو الموقع من الأخطاء. نحتفظ بالحق في تعديل أو إيقاف أي منتج أو خدمة دون إشعار مسبق.`,
    placeholders: ["service_description"]
  },
  {
    slug: "payment",
    heading: "٤. الدفع والأسعار",
    clauseText: `جميع الأسعار معروضة بالريال السعودي وتشمل ضريبة القيمة المضافة.

طرق الدفع المتاحة: {{payment_methods}}

يتم تأكيد الطلب بعد إتمام الدفع بنجاح. في حالة فشل عملية الدفع، لن يتم معالجة الطلب.`,
    placeholders: ["payment_methods"]
  },
  {
    slug: "shipping",
    heading: "٥. التوصيل والشحن",
    clauseText: `{{shipping_policy}}

مدة التوصيل المتوقعة: {{delivery_timeframe}}

نبذل قصارى جهدنا لتوصيل الطلبات في الوقت المحدد، لكننا غير مسؤولين عن التأخيرات الخارجة عن إرادتنا.`,
    placeholders: ["shipping_policy", "delivery_timeframe"]
  },
  {
    slug: "returns",
    heading: "٦. حق العدول والاسترجاع",
    clauseText: `وفقاً لنظام التجارة الإلكترونية ولائحته التنفيذية، يحق للمستهلك العدول عن الشراء خلال سبعة أيام من تاريخ استلام المنتج، دون إبداء الأسباب وبدون تحمل أي تكاليف.

شروط الاسترجاع:
{{return_policy}}

يتم رد المبلغ كاملاً خلال ١٤ يوماً من تاريخ الاسترجاع.`,
    placeholders: ["return_policy"]
  },
  {
    slug: "liability",
    heading: "٧. حدود المسؤولية",
    clauseText: `{{liability_limits}}

لا نتحمل المسؤولية عن أي أضرار غير مباشرة أو تبعية قد تنشأ عن استخدام الموقع أو المنتجات.`,
    placeholders: ["liability_limits"]
  },
  {
    slug: "dispute_resolution",
    heading: "٨. القانون الحاكم وحل النزاعات",
    clauseText: `تخضع هذه الشروط والأحكام لأنظمة المملكة العربية السعودية.

{{dispute_resolution}}

في حالة نشوء أي نزاع، يُفضل التواصل معنا أولاً لحل المشكلة ودياً.`,
    placeholders: ["dispute_resolution"]
  }
];

// ====================================
// Main Seed Function
// ====================================

async function loadFullSeeds() {
  try {
    console.log("🌱 بدء تحميل seed data الكامل...\n");

    // 1. Load Legal Sources
    console.log("📚 تحميل المصادر القانونية (6)...");
    const insertedSources = await db.insert(legalSources).values(legalSourcesData).returning();
    console.log(`✅ تم تحميل ${insertedSources.length} مصادر قانونية\n`);

    // 2. Load Templates
    console.log("📋 تحميل القوالب (6)...");
    const insertedTemplates = await db.insert(termsTemplates).values(termsTemplatesData).returning();
    console.log(`✅ تم تحميل ${insertedTemplates.length} قوالب\n`);

    // 3. Load Sections
    console.log("📄 تحميل الأقسام (8)...");
    const insertedSections = await db.insert(templateSections).values(templateSectionsData).returning();
    console.log(`✅ تم تحميل ${insertedSections.length} أقسام\n`);

    // 4. Link Templates to Sections (termsTemplateSections)
    console.log("🔗 ربط القوالب بالأقسام...");
    const templateSectionLinks = [];

    // All templates use all 8 sections
    for (const template of insertedTemplates) {
      for (let i = 0; i < insertedSections.length; i++) {
        templateSectionLinks.push({
          templateId: template.id,
          sectionId: insertedSections[i].id,
          ordering: i + 1,
          isRequired: i < 6 // First 6 sections are required
        });
      }
    }

    await db.insert(termsTemplateSections).values(templateSectionLinks);
    console.log(`✅ تم إنشاء ${templateSectionLinks.length} ارتباط قالب-قسم\n`);

    // 5. Link Sections to Legal Sources (sectionLegalSources)
    console.log("⚖️  ربط الأقسام بالمصادر القانونية...");
    
    const sectionLegalLinks = [];
    const sourceMap = Object.fromEntries(insertedSources.map(s => [s.code, s.id]));

    // Section mappings to legal sources
    const sectionLegalMapping = [
      { slug: "intro", sources: [
        { code: "ECOMMERCE_LAW", articles: ["المادة ١، المادة ٣"], notes: "تعريفات والتزامات الممارس" }
      ]},
      { slug: "merchant_info", sources: [
        { code: "ECOMMERCE_LAW", articles: ["المادة ٣"], notes: "الإفصاح عن هوية الممارس" },
        { code: "ERECS", articles: ["المادة ٥"], notes: "معلومات الممارس المطلوبة" }
      ]},
      { slug: "services", sources: [
        { code: "ECOMMERCE_LAW", articles: ["المادة ٣"], notes: "الإفصاح عن المنتج" },
        { code: "ERECS", articles: ["المادة ٧"], notes: "معلومات المنتج التفصيلية" }
      ]},
      { slug: "payment", sources: [
        { code: "ECOMMERCE_LAW", articles: ["المادة ٣"], notes: "السعر ووسائل الدفع" },
        { code: "ECOMMERCE_COMPLIANCE", articles: ["البند ١"], notes: "الإفصاح عن الأسعار شاملة الضريبة" }
      ]},
      { slug: "shipping", sources: [
        { code: "ERECS", articles: ["المادة ٧"], notes: "معلومات التوصيل" }
      ]},
      { slug: "returns", sources: [
        { code: "ECOMMERCE_LAW", articles: ["المادة ٤"], notes: "حق العدول عن الشراء" },
        { code: "ERECS", articles: ["المادة ١٢، المادة ١٤"], notes: "إجراءات العدول والاسترداد" }
      ]},
      { slug: "liability", sources: [
        { code: "ECOMMERCE_LAW", articles: ["المادة ٩"], notes: "المسؤولية والعقوبات" },
        { code: "CONSUMER_RIGHTS_MCI", articles: ["البند ١"], notes: "حقوق المستهلك الأساسية" }
      ]},
      { slug: "dispute_resolution", sources: [
        { code: "ECOMMERCE_LAW", articles: ["المادة ٩"], notes: "القانون الحاكم" }
      ]}
    ];

    for (const mapping of sectionLegalMapping) {
      const section = insertedSections.find(s => s.slug === mapping.slug);
      if (!section) continue;

      for (const source of mapping.sources) {
        const sourceId = sourceMap[source.code];
        if (!sourceId) continue;

        sectionLegalLinks.push({
          sectionId: section.id,
          sourceId: sourceId,
          articles: source.articles,
          relevanceNotes: source.notes
        });
      }
    }

    await db.insert(sectionLegalSources).values(sectionLegalLinks);
    console.log(`✅ تم إنشاء ${sectionLegalLinks.length} ارتباط قسم-مصدر قانوني\n`);

    console.log("✨ اكتمل تحميل seed data بنجاح!");
    console.log("\n📊 الإحصائيات:");
    console.log(`   - المصادر القانونية: ${insertedSources.length}`);
    console.log(`   - القوالب: ${insertedTemplates.length}`);
    console.log(`   - الأقسام: ${insertedSections.length}`);
    console.log(`   - ارتباطات قالب-قسم: ${templateSectionLinks.length}`);
    console.log(`   - ارتباطات قسم-مصدر: ${sectionLegalLinks.length}`);
    
    return {
      sources: insertedSources,
      templates: insertedTemplates,
      sections: insertedSections,
      templateSectionLinks: templateSectionLinks.length,
      sectionLegalLinks: sectionLegalLinks.length
    };
  } catch (error) {
    console.error("❌ خطأ في تحميل seed data:", error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  loadFullSeeds()
    .then(() => {
      console.log("\n✅ انتهى التنفيذ بنجاح");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ فشل التنفيذ:", error);
      process.exit(1);
    });
}

export { loadFullSeeds };
