import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface TrackerKeywords {
  en: string[];
  ar: string[];
}

export interface TrackerDefinition {
  id: string;
  name: string;
  category: string;
  severity: 'high' | 'medium' | 'low';
  keywords: TrackerKeywords;
  description: string;
}

export interface TrackerDictionary {
  metadata: {
    version: string;
    description: string;
    last_updated: string;
    language_support: string[];
  };
  trackers: TrackerDefinition[];
  generic_disclosure_keywords: TrackerKeywords;
}

export interface PolicyGap {
  toolId: string;
  toolName: string;
  category: string;
  status: 'missing_in_policy' | 'disclosed' | 'generic_disclosure';
  severity: 'high' | 'medium' | 'low';
  evidence?: {
    matchedKeywords?: string[];
    searchedKeywords?: string[];
  };
  recommendation?: string;
}

export interface GapAnalysisResult {
  totalTrackersDetected: number;
  totalDisclosed: number;
  totalMissing: number;
  totalGenericDisclosure: number;
  disclosureRate: number;
  gaps: PolicyGap[];
  summary: {
    highRiskGaps: number;
    mediumRiskGaps: number;
    lowRiskGaps: number;
  };
}

export interface DetectedTracker {
  name: string;
  category?: string;
  detected?: boolean;
}

export interface ParsedPolicy {
  type: string;
  url: string;
  fullText: string;
  wordCount: number;
  language: string;
  sections?: Array<{
    title?: string;
    content?: string;
    text?: string;
  }>;
}

let trackerDictionary: TrackerDictionary | null = null;

function loadTrackerDictionary(): TrackerDictionary {
  if (trackerDictionary) {
    return trackerDictionary;
  }
  
  const dictionaryPath = path.join(__dirname, '../knowledge/tracker-policy-dictionary.json');
  const content = fs.readFileSync(dictionaryPath, 'utf-8');
  trackerDictionary = JSON.parse(content) as TrackerDictionary;
  
  console.log(`[GapAnalyzer] Loaded tracker dictionary with ${trackerDictionary.trackers.length} trackers`);
  
  return trackerDictionary;
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

function findTrackerInDictionary(trackerName: string, dictionary: TrackerDictionary): TrackerDefinition | null {
  const normalizedName = normalizeText(trackerName);
  
  for (const tracker of dictionary.trackers) {
    const normalizedTrackerName = normalizeText(tracker.name);
    if (normalizedName.includes(normalizedTrackerName) || normalizedTrackerName.includes(normalizedName)) {
      return tracker;
    }
    
    const allKeywords = [...tracker.keywords.en, ...tracker.keywords.ar];
    for (const keyword of allKeywords) {
      if (normalizeText(keyword) === normalizedName) {
        return tracker;
      }
    }
  }
  
  return null;
}

function searchKeywordsInText(text: string, keywords: string[]): string[] {
  const normalizedText = normalizeText(text);
  const matchedKeywords: string[] = [];
  
  for (const keyword of keywords) {
    const normalizedKeyword = normalizeText(keyword);
    if (normalizedText.includes(normalizedKeyword)) {
      matchedKeywords.push(keyword);
    }
  }
  
  return matchedKeywords;
}

function hasGenericDisclosure(text: string, dictionary: TrackerDictionary): boolean {
  const allGenericKeywords = [
    ...dictionary.generic_disclosure_keywords.en,
    ...dictionary.generic_disclosure_keywords.ar
  ];
  
  const matches = searchKeywordsInText(text, allGenericKeywords);
  return matches.length >= 2;
}

export function analyzePolicyGaps(
  detectedTrackers: DetectedTracker[],
  policies: ParsedPolicy[]
): GapAnalysisResult {
  console.log(`[GapAnalyzer] Starting gap analysis...`);
  console.log(`[GapAnalyzer] Detected trackers: ${detectedTrackers.length}`);
  console.log(`[GapAnalyzer] Policies to analyze: ${policies.length}`);
  
  const dictionary = loadTrackerDictionary();
  
  const combinedPolicyText = policies
    .filter(p => p.type === 'privacy' || p.type === 'cookies')
    .map(p => p.fullText)
    .join(' ');
  
  console.log(`[GapAnalyzer] Combined policy text length: ${combinedPolicyText.length} characters`);
  
  const gaps: PolicyGap[] = [];
  let totalDisclosed = 0;
  let totalMissing = 0;
  let totalGenericDisclosure = 0;
  
  const hasGenericThirdPartyDisclosure = hasGenericDisclosure(combinedPolicyText, dictionary);
  
  for (const detected of detectedTrackers) {
    const trackerDef = findTrackerInDictionary(detected.name, dictionary);
    
    if (!trackerDef) {
      console.log(`[GapAnalyzer] Tracker "${detected.name}" not found in dictionary, skipping...`);
      continue;
    }
    
    const allKeywords = [...trackerDef.keywords.en, ...trackerDef.keywords.ar];
    const matchedKeywords = searchKeywordsInText(combinedPolicyText, allKeywords);
    
    if (matchedKeywords.length > 0) {
      totalDisclosed++;
      gaps.push({
        toolId: trackerDef.id,
        toolName: trackerDef.name,
        category: trackerDef.category,
        status: 'disclosed',
        severity: trackerDef.severity,
        evidence: {
          matchedKeywords,
          searchedKeywords: allKeywords
        }
      });
    } else if (hasGenericThirdPartyDisclosure) {
      totalGenericDisclosure++;
      gaps.push({
        toolId: trackerDef.id,
        toolName: trackerDef.name,
        category: trackerDef.category,
        status: 'generic_disclosure',
        severity: trackerDef.severity,
        evidence: {
          searchedKeywords: allKeywords
        },
        recommendation: `Consider explicitly mentioning "${trackerDef.name}" in your privacy policy for full PDPL compliance.`
      });
    } else {
      totalMissing++;
      gaps.push({
        toolId: trackerDef.id,
        toolName: trackerDef.name,
        category: trackerDef.category,
        status: 'missing_in_policy',
        severity: trackerDef.severity,
        evidence: {
          searchedKeywords: allKeywords
        },
        recommendation: `PDPL Article 12 requires disclosure of "${trackerDef.name}" usage in your privacy policy.`
      });
    }
  }
  
  const summary = {
    highRiskGaps: gaps.filter(g => g.status === 'missing_in_policy' && g.severity === 'high').length,
    mediumRiskGaps: gaps.filter(g => g.status === 'missing_in_policy' && g.severity === 'medium').length,
    lowRiskGaps: gaps.filter(g => g.status === 'missing_in_policy' && g.severity === 'low').length
  };
  
  const disclosureRate = gaps.length > 0 
    ? Math.round((totalDisclosed / gaps.length) * 100) 
    : 100;
  
  console.log(`[GapAnalyzer] Analysis complete. Disclosed: ${totalDisclosed}, Missing: ${totalMissing}, Generic: ${totalGenericDisclosure}`);
  
  return {
    totalTrackersDetected: gaps.length,
    totalDisclosed,
    totalMissing,
    totalGenericDisclosure,
    disclosureRate,
    gaps,
    summary
  };
}

export function getHighRiskGaps(result: GapAnalysisResult): PolicyGap[] {
  return result.gaps.filter(g => g.status === 'missing_in_policy' && g.severity === 'high');
}

export function getMissingTrackers(result: GapAnalysisResult): PolicyGap[] {
  return result.gaps.filter(g => g.status === 'missing_in_policy');
}

export interface PDPLChecklistItem {
  id: string;
  name: string;
  nameAr: string;
  pdplArticle: string;
  keywords: {
    en: string[];
    ar: string[];
  };
  required: boolean;
}

export interface ComplianceAuditItem {
  id: string;
  name: string;
  nameAr: string;
  pdplArticle: string;
  status: 'found' | 'missing' | 'partial';
  matchedKeywords: string[];
  required: boolean;
}

export interface ComplianceAuditResult {
  totalChecks: number;
  found: number;
  missing: number;
  partial: number;
  transparencyScore: number;
  items: ComplianceAuditItem[];
  summary: {
    compliant: boolean;
    criticalMissing: string[];
    recommendations: string[];
  };
}

const pdplChecklist: PDPLChecklistItem[] = [
  {
    id: 'contact_info',
    name: 'Contact Information',
    nameAr: 'بيانات التواصل',
    pdplArticle: 'Article 12',
    keywords: {
      en: ['contact us', 'email', 'phone', 'address', 'reach us', 'get in touch'],
      ar: ['تواصل معنا', 'البريد الإلكتروني', 'اتصل بنا', 'العنوان', 'رقم الهاتف', 'للتواصل']
    },
    required: true
  },
  {
    id: 'last_update',
    name: 'Last Update Date',
    nameAr: 'تاريخ آخر تحديث',
    pdplArticle: 'Article 12',
    keywords: {
      en: ['last updated', 'effective date', 'published on', 'revised on', 'updated on', 'version'],
      ar: ['تاريخ آخر تحديث', 'سارية من', 'تحرير في', 'تاريخ النشر', 'آخر تعديل', 'الإصدار']
    },
    required: true
  },
  {
    id: 'data_types',
    name: 'Data Collection Types',
    nameAr: 'ماهية البيانات',
    pdplArticle: 'Article 12(1)',
    keywords: {
      en: ['types of data', 'personal data', 'name', 'email address', 'collected info', 'information we collect', 'data we gather'],
      ar: ['البيانات التي نجمعها', 'أنواع البيانات', 'معلومات شخصية', 'بيانات شخصية', 'البيانات المجمعة', 'نوع البيانات']
    },
    required: true
  },
  {
    id: 'collection_purpose',
    name: 'Collection Method & Purpose',
    nameAr: 'كيف ولماذا نجمعها',
    pdplArticle: 'Article 12(2)',
    keywords: {
      en: ['how we collect', 'purpose', 'why we collect', 'cookies', 'collection methods', 'reasons for collecting'],
      ar: ['كيف نجمع', 'الغرض من الجمع', 'طرق الجمع', 'أسباب الجمع', 'لماذا نجمع', 'هدف الجمع']
    },
    required: true
  },
  {
    id: 'data_usage',
    name: 'Data Usage',
    nameAr: 'كيفية الاستخدام',
    pdplArticle: 'Article 12(3)',
    keywords: {
      en: ['how we use', 'processing', 'usage', 'service improvement', 'we use your data', 'data processing'],
      ar: ['كيفية استخدام', 'معالجة البيانات', 'تحسين الخدمات', 'نستخدم بياناتك', 'استخدام المعلومات']
    },
    required: true
  },
  {
    id: 'data_disclosure',
    name: 'Data Disclosure',
    nameAr: 'الإفصاح والمشاركة',
    pdplArticle: 'Article 12(4)',
    keywords: {
      en: ['disclosure', 'share', 'third party', 'partners', 'we may share', 'data sharing', 'service providers'],
      ar: ['الإفصاح', 'مشاركة البيانات', 'أطراف ثالثة', 'الجهات المستلمة', 'نشارك', 'شركاء', 'مزودي الخدمات']
    },
    required: true
  },
  {
    id: 'legal_basis',
    name: 'Legal Basis',
    nameAr: 'المسوغات النظامية',
    pdplArticle: 'Article 5, 6',
    keywords: {
      en: ['legal basis', 'consent', 'legitimate interest', 'contract', 'legal obligation', 'lawful basis'],
      ar: ['المسوغ النظامي', 'السند النظامي', 'الموافقة', 'تنفيذ العقد', 'المصلحة المشروعة', 'الأساس النظامي', 'الأسس القانونية']
    },
    required: true
  },
  {
    id: 'data_retention',
    name: 'Data Storage & Retention',
    nameAr: 'التخزين والمدة',
    pdplArticle: 'Article 18',
    keywords: {
      en: ['storage', 'retention', 'how long', 'keep data', 'delete after', 'retention period', 'data deletion'],
      ar: ['تخزين', 'حفظ البيانات', 'مدة الاحتفاظ', 'فترة الاحتفاظ', 'حذف البيانات', 'فترة التخزين']
    },
    required: true
  },
  {
    id: 'subject_rights',
    name: 'Data Subject Rights',
    nameAr: 'حقوق صاحب البيانات',
    pdplArticle: 'Article 4',
    keywords: {
      en: ['rights', 'access', 'rectification', 'withdraw consent', 'erasure', 'your rights', 'right to access', 'right to delete'],
      ar: ['حقوقك', 'الوصول', 'تصحيح', 'مسح', 'سحب الموافقة', 'إتلاف', 'حق الاطلاع', 'حق التصحيح', 'حقوق صاحب البيانات']
    },
    required: true
  },
  {
    id: 'dpo_contact',
    name: 'DPO / Responsible Person',
    nameAr: 'مسؤول حماية البيانات',
    pdplArticle: 'Article 30',
    keywords: {
      en: ['dpo', 'data protection officer', 'privacy officer', 'contact the officer', 'privacy contact', 'data officer'],
      ar: ['مسؤول حماية البيانات', 'ضابط الاتصال', 'موظف الخصوصية', 'مسؤول الخصوصية', 'ضابط حماية البيانات']
    },
    required: false
  },
  {
    id: 'complaint_mechanism',
    name: 'Complaint Mechanism',
    nameAr: 'آلية الشكوى',
    pdplArticle: 'Article 4(6)',
    keywords: {
      en: ['complaint', 'object', 'lodge a complaint', 'grievance', 'file a complaint', 'raise concern'],
      ar: ['شكوى', 'اعتراض', 'رفع بلاغ', 'تقديم شكوى', 'آلية الشكاوى', 'التظلم']
    },
    required: true
  },
  {
    id: 'sdaia_reference',
    name: 'SDAIA Reference',
    nameAr: 'مرجع الهيئة - سدايا',
    pdplArticle: 'PDPL General',
    keywords: {
      en: ['sdaia', 'saudi data', 'ai authority', 'competent authority', 'data authority', 'ndmo'],
      ar: ['سدايا', 'الهيئة السعودية للبيانات', 'الجهة المختصة', 'هيئة البيانات', 'الذكاء الاصطناعي']
    },
    required: false
  }
];

export function auditPolicyCompliance(policies: ParsedPolicy[]): ComplianceAuditResult {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`[ComplianceAudit] Starting PDPL 12-point MANDATORY compliance audit...`);
  console.log(`${'='.repeat(60)}`);
  
  // Force text extraction from all policy types
  const combinedPolicyText = policies
    .filter(p => p.type === 'privacy' || p.type === 'cookies' || p.type === 'terms')
    .map(p => {
      console.log(`[ComplianceAudit] Processing ${p.type} policy from ${p.url}`);
      console.log(`[ComplianceAudit] - Text length: ${p.fullText?.length || 0} characters`);
      console.log(`[ComplianceAudit] - Word count: ${p.wordCount || 0}`);
      return p.fullText || '';
    })
    .join(' ');
  
  console.log(`\n[ComplianceAudit] Total scraped text length: ${combinedPolicyText.length} characters`);
  
  // CRITICAL: Check if we actually scraped text
  if (combinedPolicyText.length < 100) {
    console.log(`[ComplianceAudit] ⚠️ WARNING: Very little text scraped! Policy may not have loaded properly.`);
  }
  
  const items: ComplianceAuditItem[] = [];
  let found = 0;
  let missing = 0;
  let partial = 0;
  let requiredMissing = 0;
  
  console.log(`\n[ComplianceAudit] Checking each of 12 PDPL mandatory sections:`);
  console.log(`${'-'.repeat(60)}`);
  
  for (const check of pdplChecklist) {
    const allKeywords = [...check.keywords.en, ...check.keywords.ar];
    const matchedKeywords = searchKeywordsInText(combinedPolicyText, allKeywords);
    
    let status: 'found' | 'missing' | 'partial';
    let statusIcon: string;
    
    if (matchedKeywords.length >= 2) {
      status = 'found';
      statusIcon = '✓ FOUND';
      found++;
    } else if (matchedKeywords.length === 1) {
      status = 'partial';
      statusIcon = '~ PARTIAL';
      partial++;
    } else {
      status = 'missing';
      statusIcon = '✗ MISSING';
      missing++;
      if (check.required) {
        requiredMissing++;
      }
    }
    
    // DETAILED LOGGING FOR EACH SECTION
    console.log(`\n[Section ${check.id}] "${check.name}" (${check.nameAr})`);
    console.log(`  Article: ${check.pdplArticle} | Required: ${check.required ? 'YES' : 'No'}`);
    console.log(`  Keywords searched: ${allKeywords.length} (${check.keywords.en.length} EN + ${check.keywords.ar.length} AR)`);
    console.log(`  Keywords found: ${matchedKeywords.length}`);
    if (matchedKeywords.length > 0) {
      console.log(`  Matched: [${matchedKeywords.join(', ')}]`);
    }
    console.log(`  Status: ${statusIcon}${check.required && status === 'missing' ? ' ⚠️ CRITICAL - REQUIRED SECTION!' : ''}`);
    
    items.push({
      id: check.id,
      name: check.name,
      nameAr: check.nameAr,
      pdplArticle: check.pdplArticle,
      status,
      matchedKeywords,
      required: check.required
    });
  }
  
  console.log(`\n${'-'.repeat(60)}`);
  
  // Calculate transparency score with STRICTER logic
  // If required sections are missing, score takes a significant hit
  const baseScore = Math.round(((found + partial * 0.5) / pdplChecklist.length) * 100);
  
  // Penalty for missing REQUIRED sections: -10% per missing required section
  const requiredPenalty = requiredMissing * 10;
  const transparencyScore = Math.max(0, baseScore - requiredPenalty);
  
  const criticalMissing = items
    .filter(item => item.status === 'missing' && item.required)
    .map(item => `${item.name} (${item.nameAr})`);
  
  const recommendations: string[] = [];
  
  if (criticalMissing.length > 0) {
    recommendations.push(`CRITICAL: Add missing required sections: ${criticalMissing.join(', ')}`);
  }
  
  const partialItems = items.filter(item => item.status === 'partial');
  if (partialItems.length > 0) {
    recommendations.push(`Expand partial disclosures: ${partialItems.map(i => i.name).join(', ')}`);
  }
  
  const sdaiaCheck = items.find(i => i.id === 'sdaia_reference');
  if (sdaiaCheck && sdaiaCheck.status === 'missing') {
    recommendations.push('Consider adding reference to SDAIA as the competent authority for PDPL compliance');
  }
  
  // SUMMARY LOGGING
  console.log(`\n[ComplianceAudit] ========== AUDIT SUMMARY ==========`);
  console.log(`[ComplianceAudit] Total Checks: ${pdplChecklist.length}`);
  console.log(`[ComplianceAudit] Found: ${found} | Partial: ${partial} | Missing: ${missing}`);
  console.log(`[ComplianceAudit] Required Sections Missing: ${requiredMissing}`);
  console.log(`[ComplianceAudit] Base Score: ${baseScore}% | Penalty: -${requiredPenalty}%`);
  console.log(`[ComplianceAudit] Final Transparency Score: ${transparencyScore}%`);
  console.log(`[ComplianceAudit] Compliant: ${criticalMissing.length === 0 ? 'YES' : 'NO - Missing required sections!'}`);
  
  if (criticalMissing.length > 0) {
    console.log(`[ComplianceAudit] ⚠️ CRITICAL MISSING SECTIONS:`);
    criticalMissing.forEach((section, i) => {
      console.log(`  ${i + 1}. ${section}`);
    });
  }
  console.log(`${'='.repeat(60)}\n`);
  
  return {
    totalChecks: pdplChecklist.length,
    found,
    missing,
    partial,
    transparencyScore,
    items,
    summary: {
      compliant: criticalMissing.length === 0,
      criticalMissing,
      recommendations
    }
  };
}
