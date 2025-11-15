/**
 * Minimal seed data loader for Terms & Conditions Template System
 * This creates a working example with junction tables
 */

import { db } from "./db";
import { 
  legalSources,
  termsTemplates,
  templateSections,
  termsTemplateSections,
  sectionLegalSources
} from "@shared/schema";

async function loadMinimalSeeds() {
  console.log("🌱 Loading minimal Terms & Conditions seed data...\n");

  try {
    // ====================================
    // 1. Create Legal Sources
    // ====================================
    console.log("📚 Creating legal sources...");
    
    const [ecommerceLaw] = await db.insert(legalSources).values({
      code: "ECOMMERCE_LAW",
      title: "نظام التجارة الإلكترونية",
      sourceType: "law",
      fileReference: "E-commerce-system.pdf",
      articles: [
        { number: "3", title: "التزامات الممارس", content: "على الممارس الإفصاح..." },
        { number: "4", title: "حقوق المستهلك", content: "للمستهلك الحق في العدول..." }
      ],
      effectiveDate: new Date("2019-08-11")
    }).returning();
    
    const [erecs] = await db.insert(legalSources).values({
      code: "ERECS",
      title: "اللائحة التنفيذية لنظام التجارة الإلكترونية",
      sourceType: "regulation",
      fileReference: "ERECS.pdf",
      articles: [
        { number: "5", title: "الإفصاح عن معلومات الممارس", content: "يجب على الممارس..." },
        { number: "12", title: "حق العدول", content: "للمستهلك الحق في العدول..." }
      ],
      effectiveDate: new Date("2020-01-01")
    }).returning();
    
    console.log(`  ✓ Created ${2} legal sources\n`);

    // ====================================
    // 2. Create Terms Template
    // ====================================
    console.log("📋 Creating terms template...");
    
    const [template] = await db.insert(termsTemplates).values({
      businessType: "ecommerce_general",
      sector: "general",
      activityScale: "smb",
      title: "نموذج الشروط والأحكام للتجارة الإلكترونية - المنشآت الصغيرة والمتوسطة",
      description: "نموذج شامل للشروط والأحكام مُصمم للمتاجر الإلكترونية",
      isActive: true
    }).returning();
    
    console.log(`  ✓ Created template: ${template.title}\n`);

    // ====================================
    // 3. Create Template Sections
    // ====================================
    console.log("📝 Creating template sections...");
    
    const [introSection] = await db.insert(templateSections).values({
      slug: "intro",
      heading: "١. المقدمة وقبول الشروط",
      clauseText: `مرحباً بكم في {{company_name}}. هذه الشروط والأحكام تنظم استخدامكم لموقعنا الإلكتروني {{website_url}}.

بمجرد تصفحك للموقع أو إتمام أي عملية شراء، فإنك توافق على الالتزام بهذه الشروط والأحكام.`,
      placeholders: [
        { key: "company_name", description: "اسم الشركة" },
        { key: "website_url", description: "عنوان الموقع" }
      ],
      riskLevel: "high",
      isRequired: true
    }).returning();
    
    const [merchantInfoSection] = await db.insert(templateSections).values({
      slug: "merchant_info",
      heading: "٢. معلومات الممارس",
      clauseText: `تُدار هذه المنصة بواسطة:
- الاسم التجاري: {{company_name}}
- رقم السجل التجاري: {{commercial_registration}}
- الرقم الضريبي: {{tax_number}}
- البريد الإلكتروني: {{email}}
- الهاتف: {{phone}}`,
      placeholders: [
        { key: "company_name", description: "الاسم التجاري" },
        { key: "commercial_registration", description: "رقم السجل التجاري" },
        { key: "tax_number", description: "الرقم الضريبي" },
        { key: "email", description: "البريد الإلكتروني" },
        { key: "phone", description: "رقم الهاتف" }
      ],
      riskLevel: "critical",
      isRequired: true
    }).returning();
    
    const [refundSection] = await db.insert(templateSections).values({
      slug: "refund_rights",
      heading: "٦. حق العدول والاسترجاع",
      clauseText: `وفقاً لنظام التجارة الإلكترونية ولائحته التنفيذية، يحق للمستهلك العدول عن الشراء خلال سبعة (7) أيام من تاريخ استلام المنتج دون إبداء الأسباب.

شروط العدول:
- أن يكون المنتج في حالته الأصلية
- عدم استخدام المنتج
- الاحتفاظ بالفاتورة الأصلية

سيتم استرداد كامل المبلغ خلال 14 يوماً من تاريخ الإخطار بالعدول.`,
      placeholders: [],
      riskLevel: "critical",
      isRequired: true
    }).returning();
    
    console.log(`  ✓ Created ${3} template sections\n`);

    // ====================================
    // 4. Link Sections to Template (Junction)
    // ====================================
    console.log("🔗 Linking sections to template...");
    
    await db.insert(termsTemplateSections).values([
      { templateId: template.id, sectionId: introSection.id, ordering: 1, isRequired: true },
      { templateId: template.id, sectionId: merchantInfoSection.id, ordering: 2, isRequired: true },
      { templateId: template.id, sectionId: refundSection.id, ordering: 6, isRequired: true }
    ]);
    
    console.log(`  ✓ Linked 3 sections to template\n`);

    // ====================================
    // 5. Link Sections to Legal Sources (Junction)
    // ====================================
    console.log("⚖️ Linking sections to legal sources...");
    
    await db.insert(sectionLegalSources).values([
      { 
        sectionId: introSection.id, 
        sourceId: ecommerceLaw.id, 
        articles: ["3"],
        relevanceNotes: "التزامات الممارس بتوضيح الشروط"
      },
      { 
        sectionId: merchantInfoSection.id, 
        sourceId: ecommerceLaw.id, 
        articles: ["3"],
        relevanceNotes: "الإفصاح عن هوية الممارس"
      },
      { 
        sectionId: merchantInfoSection.id, 
        sourceId: erecs.id, 
        articles: ["5"],
        relevanceNotes: "متطلبات الإفصاح في اللائحة التنفيذية"
      },
      { 
        sectionId: refundSection.id, 
        sourceId: ecommerceLaw.id, 
        articles: ["4"],
        relevanceNotes: "حق المستهلك في العدول"
      },
      { 
        sectionId: refundSection.id, 
        sourceId: erecs.id, 
        articles: ["12"],
        relevanceNotes: "تفاصيل حق العدول في اللائحة"
      }
    ]);
    
    console.log(`  ✓ Linked sections to legal sources\n`);

    console.log("✅ Minimal seed data loaded successfully!\n");
    console.log("Summary:");
    console.log(`  - Legal Sources: 2`);
    console.log(`  - Templates: 1`);
    console.log(`  - Sections: 3`);
    console.log(`  - Template-Section Links: 3`);
    console.log(`  - Section-Legal Source Links: 5`);
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error loading seed data:", error);
    process.exit(1);
  }
}

loadMinimalSeeds();
