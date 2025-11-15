/**
 * Load Terms & Conditions seed data into database
 * Run with: npx tsx server/loadTermsSeeds.ts
 */

import { storage } from "./storage";
import { legalSourcesData, termsTemplatesData, templateSectionsData } from "./seedTermsTemplates";

async function loadSeeds() {
  console.log("🌱 Loading Terms & Conditions seed data...\n");

  try {
    // ====================================
    // 1. Load Legal Sources
    // ====================================
    console.log("📚 Loading legal sources...");
    const loadedSources: Record<string, string> = {};
    
    for (const sourceData of legalSourcesData) {
      // Check if already exists
      const existing = await storage.getLegalSourceByCode(sourceData.code);
      if (existing) {
        console.log(`  ✓ ${sourceData.title} (already exists)`);
        loadedSources[sourceData.code] = existing.id;
        continue;
      }
      
      const source = await storage.createLegalSource(sourceData);
      loadedSources[sourceData.code] = source.id;
      console.log(`  ✓ ${sourceData.title}`);
    }
    console.log(`\n📚 Loaded ${Object.keys(loadedSources).length} legal sources\n`);

    // ====================================
    // 2. Load Terms Templates
    // ====================================
    console.log("📋 Loading terms templates...");
    const loadedTemplates: Record<string, string> = {};
    
    for (const templateData of termsTemplatesData) {
      const template = await storage.createTermsTemplate(templateData);
      loadedTemplates[templateData.businessType + "_" + templateData.activityScale] = template.id;
      console.log(`  ✓ ${templateData.title}`);
    }
    console.log(`\n📋 Loaded ${Object.keys(loadedTemplates).length} templates\n`);

    // ====================================
    // 3. Load Template Sections
    // ====================================
    console.log("📝 Loading template sections...");
    
    // Replace template ID placeholders
    const ecommerceGeneralTemplateId = loadedTemplates["ecommerce_general_smb"];
    
    if (!ecommerceGeneralTemplateId) {
      console.error("❌ Error: ecommerce_general_smb template not found!");
      return;
    }
    
    let sectionsCount = 0;
    for (const sectionData of templateSectionsData) {
      // Replace placeholder with actual template ID
      const actualTemplateId = sectionData.templateId === "TO_BE_REPLACED_ECOMMERCE_GENERAL" 
        ? ecommerceGeneralTemplateId 
        : sectionData.templateId;
      
      const section = await storage.createTemplateSection({
        ...sectionData,
        templateId: actualTemplateId
      });
      sectionsCount++;
      console.log(`  ✓ ${sectionData.heading}`);
    }
    console.log(`\n📝 Loaded ${sectionsCount} template sections\n`);

    console.log("✅ All seed data loaded successfully!\n");
    console.log("Summary:");
    console.log(`  - Legal Sources: ${Object.keys(loadedSources).length}`);
    console.log(`  - Templates: ${Object.keys(loadedTemplates).length}`);
    console.log(`  - Sections: ${sectionsCount}`);
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error loading seed data:", error);
    process.exit(1);
  }
}

loadSeeds();
