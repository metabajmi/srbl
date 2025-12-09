// Terms & Conditions Checker - 12 Static Compliance Modules
// Based on Saudi E-Commerce Law and PDPL requirements

import termsBlueprint from '../knowledge/terms-conditions-blueprint.json';

export interface TermsModuleCheck {
  moduleId: string;
  number: number;
  titleAr: string;
  titleEn: string;
  status: 'موجود بالكامل' | 'ناقص أو غير واضح' | 'غير موجود';
  statusEn: 'FOUND' | 'PARTIAL' | 'MISSING';
  evidence: string;
  notes: string;
  matchCount: number;
  matchedKeywords: string[];
  requirementAr: string;
}

export interface TermsConditionsAudit {
  modulesFound: number;
  modulesPartial: number;
  modulesMissing: number;
  modules: TermsModuleCheck[];
  compliancePercentage: number;
  isComplete: boolean;
  summary: string;
  activityType?: string;
  dynamicModuleApplied?: boolean;
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u064B-\u065F]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractEvidence(fullText: string, matchedKeyword: string, maxLength: number = 200): string {
  const normalizedText = normalizeText(fullText);
  const normalizedKeyword = normalizeText(matchedKeyword);
  const index = normalizedText.indexOf(normalizedKeyword);
  
  if (index === -1) return '';
  
  const start = Math.max(0, index - 60);
  const end = Math.min(fullText.length, index + matchedKeyword.length + 140);
  
  let snippet = fullText.substring(start, end).trim();
  if (start > 0) snippet = '...' + snippet;
  if (end < fullText.length) snippet = snippet + '...';
  
  return snippet.replace(/\s+/g, ' ').substring(0, maxLength);
}

export function checkTermsConditions(
  termsText: string, 
  activityType?: string
): TermsConditionsAudit {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`[TermsConditionsChecker] بدء فحص الشروط والأحكام - 12 مادة إلزامية`);
  console.log(`${'='.repeat(70)}`);
  
  if (!termsText || termsText.trim().length < 50) {
    console.log(`[TermsConditionsChecker] ⚠️ نص الشروط والأحكام فارغ أو قصير جداً`);
    return {
      modulesFound: 0,
      modulesPartial: 0,
      modulesMissing: 12,
      modules: termsBlueprint.staticModules.map((mod, idx) => ({
        moduleId: mod.moduleId,
        number: idx + 1,
        titleAr: mod.titleAr,
        titleEn: mod.titleEn,
        status: 'غير موجود' as const,
        statusEn: 'MISSING' as const,
        evidence: '',
        notes: 'لم يتم العثور على نص الشروط والأحكام',
        matchCount: 0,
        matchedKeywords: [],
        requirementAr: mod.requirementAr,
      })),
      compliancePercentage: 0,
      isComplete: false,
      summary: 'لم يتم العثور على صفحة الشروط والأحكام أو أن النص قصير جداً',
      activityType,
      dynamicModuleApplied: false,
    };
  }

  const normalizedTerms = normalizeText(termsText);

  const modules: TermsModuleCheck[] = termsBlueprint.staticModules.map((mod, idx) => {
    const matchedKeywords: string[] = [];
    let totalMatches = 0;
    let bestEvidence = '';

    console.log(`\n[TermsConditionsChecker] ${'─'.repeat(50)}`);
    console.log(`[TermsConditionsChecker] فحص المادة ${idx + 1}: ${mod.titleAr}`);

    for (const keyword of mod.keywords) {
      const normalizedKeyword = normalizeText(keyword);
      if (normalizedTerms.includes(normalizedKeyword)) {
        matchedKeywords.push(keyword);
        totalMatches++;
        if (!bestEvidence || keyword.length > bestEvidence.length) {
          bestEvidence = extractEvidence(termsText, keyword);
        }
      }
    }

    if (mod.patterns) {
      for (const pattern of mod.patterns) {
        try {
          const regex = new RegExp(pattern, 'gi');
          const matches = termsText.match(regex);
          if (matches && matches.length > 0) {
            totalMatches += matches.length;
            if (!bestEvidence) {
              bestEvidence = extractEvidence(termsText, matches[0]);
            }
            matchedKeywords.push(...matches.slice(0, 2));
          }
        } catch (e) {
          // Invalid regex, skip
        }
      }
    }

    let status: 'موجود بالكامل' | 'ناقص أو غير واضح' | 'غير موجود';
    let statusEn: 'FOUND' | 'PARTIAL' | 'MISSING';
    let notes = '';

    if (totalMatches >= 3 && matchedKeywords.length >= 2) {
      status = 'موجود بالكامل';
      statusEn = 'FOUND';
      notes = '';
      console.log(`[TermsConditionsChecker] ✅ ${mod.titleAr}: موجود بالكامل (${totalMatches} تطابقات)`);
    } else if (totalMatches >= 1) {
      status = 'ناقص أو غير واضح';
      statusEn = 'PARTIAL';
      notes = 'البند موجود لكنه قد يكون ناقصاً أو يحتاج مزيداً من التفصيل';
      console.log(`[TermsConditionsChecker] ⚠️ ${mod.titleAr}: ناقص (${totalMatches} تطابقات)`);
    } else {
      status = 'غير موجود';
      statusEn = 'MISSING';
      notes = `هذا البند مطلوب حسب نظام التجارة الإلكترونية: ${mod.requirementAr}`;
      console.log(`[TermsConditionsChecker] ❌ ${mod.titleAr}: غير موجود`);
    }

    return {
      moduleId: mod.moduleId,
      number: idx + 1,
      titleAr: mod.titleAr,
      titleEn: mod.titleEn,
      status,
      statusEn,
      evidence: bestEvidence,
      notes,
      matchCount: totalMatches,
      matchedKeywords: Array.from(new Set(matchedKeywords)).slice(0, 5),
      requirementAr: mod.requirementAr,
    };
  });

  const modulesFound = modules.filter(m => m.statusEn === 'FOUND').length;
  const modulesPartial = modules.filter(m => m.statusEn === 'PARTIAL').length;
  const modulesMissing = modules.filter(m => m.statusEn === 'MISSING').length;

  const isComplete = modulesFound === 12;
  const totalScore = modulesFound * 100 + modulesPartial * 50;
  const compliancePercentage = Math.round((totalScore / (12 * 100)) * 100);

  let summary = '';
  if (isComplete) {
    summary = 'الشروط والأحكام مكتملة - جميع المواد الـ 12 موجودة بوضوح';
  } else {
    const missingModules = modules.filter(m => m.statusEn === 'MISSING').map(m => m.titleAr);
    const partialModules = modules.filter(m => m.statusEn === 'PARTIAL').map(m => m.titleAr);
    
    summary = 'الشروط والأحكام غير مكتملة.\n';
    if (missingModules.length > 0) {
      summary += `المواد الغائبة (${missingModules.length}): ${missingModules.join('، ')}\n`;
    }
    if (partialModules.length > 0) {
      summary += `المواد الناقصة (${partialModules.length}): ${partialModules.join('، ')}`;
    }
  }

  console.log(`${'─'.repeat(70)}`);
  console.log(`[TermsConditionsChecker] ========== ملخص الفحص ==========`);
  console.log(`[TermsConditionsChecker] موجود بالكامل: ${modulesFound}/12`);
  console.log(`[TermsConditionsChecker] ناقص أو غير واضح: ${modulesPartial}/12`);
  console.log(`[TermsConditionsChecker] غير موجود: ${modulesMissing}/12`);
  console.log(`[TermsConditionsChecker] نسبة الامتثال: ${compliancePercentage}%`);
  console.log(`[TermsConditionsChecker] الشروط مكتملة؟ ${isComplete ? 'نعم ✓' : 'لا ✗'}`);
  console.log(`${'='.repeat(70)}\n`);

  return {
    modulesFound,
    modulesPartial,
    modulesMissing,
    modules,
    compliancePercentage,
    isComplete,
    summary,
    activityType,
    dynamicModuleApplied: false,
  };
}

export function getActivityTypeInfo(activityType: string): {
  activityTypeAr: string;
  rescindException: string;
  extraObligations: string;
} | null {
  const dynamicModule = termsBlueprint.dynamicModules.find(
    dm => dm.activityType === activityType
  );
  
  if (!dynamicModule) return null;
  
  return {
    activityTypeAr: dynamicModule.activityTypeAr,
    rescindException: dynamicModule.rescindException,
    extraObligations: dynamicModule.extraObligations,
  };
}
