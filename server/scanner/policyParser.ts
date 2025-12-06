import * as cheerio from 'cheerio';

export interface PolicySection {
  title: string;
  text: string;
  keywords: string[];
  pdplMappings: string[];
  startIndex: number;
  endIndex: number;
}

export interface ParsedPolicy {
  url: string;
  type: 'privacy' | 'terms' | 'cookies' | 'refund' | 'other';
  title: string;
  fullText: string;
  wordCount: number;
  sections: PolicySection[];
  language: 'ar' | 'en' | 'mixed';
  detectedElements: {
    hasContactInfo: boolean;
    hasLawfulBasis: boolean;
    hasRetentionPeriod: boolean;
    hasDataSubjectRights: boolean;
    hasThirdPartySharing: boolean;
    hasInternationalTransfer: boolean;
    hasSecurityMeasures: boolean;
    hasCookieInfo: boolean;
    hasChildrenData: boolean;
    hasSensitiveData: boolean;
  };
  evidence: Record<string, string>;
}

const PDPL_KEYWORD_MAPPINGS: Record<string, { en: string[]; ar: string[] }> = {
  lawful_basis: {
    en: ['legal basis', 'lawful basis', 'consent', 'contract', 'legitimate interest', 'legal obligation', 'vital interest', 'public interest'],
    ar: ['الأساس القانوني', 'الأساس النظامي', 'الموافقة', 'العقد', 'المصلحة المشروعة', 'الالتزام القانوني', 'المصلحة الحيوية'],
  },
  processing_purpose: {
    en: ['purpose', 'purposes of processing', 'why we collect', 'how we use', 'processing activities', 'data processing'],
    ar: ['الغرض', 'أغراض المعالجة', 'لماذا نجمع', 'كيف نستخدم', 'أنشطة المعالجة', 'معالجة البيانات'],
  },
  data_retention: {
    en: ['retention', 'how long', 'retain', 'storage period', 'keep your data', 'deletion', 'data retention'],
    ar: ['الاحتفاظ', 'فترة الاحتفاظ', 'مدة الاحتفاظ', 'نحتفظ', 'تخزين', 'الحذف', 'فترة التخزين'],
  },
  data_subject_rights: {
    en: ['your rights', 'right to access', 'right to rectify', 'right to erasure', 'right to delete', 'right to object', 'data portability', 'withdraw consent'],
    ar: ['حقوقك', 'حق الوصول', 'حق التصحيح', 'حق الحذف', 'حق المسح', 'حق الاعتراض', 'نقل البيانات', 'سحب الموافقة', 'حقوق صاحب البيانات'],
  },
  third_party_sharing: {
    en: ['third party', 'third parties', 'share with', 'disclose', 'vendors', 'service providers', 'partners', 'affiliates'],
    ar: ['طرف ثالث', 'أطراف ثالثة', 'نشارك مع', 'الإفصاح', 'مزودي الخدمة', 'الشركاء', 'الشركات التابعة', 'مقدمي الخدمات'],
  },
  data_transfer: {
    en: ['international transfer', 'cross-border', 'transfer outside', 'transfer abroad', 'other countries', 'overseas'],
    ar: ['النقل الدولي', 'نقل عبر الحدود', 'نقل خارج', 'النقل للخارج', 'دول أخرى', 'خارج المملكة'],
  },
  security_measures: {
    en: ['security', 'protect', 'encryption', 'secure', 'safeguard', 'security measures', 'data protection'],
    ar: ['الأمان', 'الحماية', 'التشفير', 'آمن', 'إجراءات الأمان', 'حماية البيانات', 'تدابير أمنية'],
  },
  cookies: {
    en: ['cookie', 'cookies', 'tracking', 'pixel', 'local storage', 'session', 'analytics cookies'],
    ar: ['الكوكيز', 'ملفات تعريف الارتباط', 'التتبع', 'ملفات الارتباط', 'كوكيز التحليل'],
  },
  contact_details: {
    en: ['contact us', 'contact', 'email', 'phone', 'address', 'data protection officer', 'dpo', 'reach us'],
    ar: ['اتصل بنا', 'تواصل', 'البريد الإلكتروني', 'الهاتف', 'العنوان', 'مسؤول حماية البيانات', 'للتواصل معنا'],
  },
  children_data: {
    en: ['children', 'minors', 'under 18', 'under 13', 'parental consent', 'child', 'young people'],
    ar: ['الأطفال', 'القاصرين', 'أقل من 18', 'موافقة الوالدين', 'الصغار', 'القصر'],
  },
  sensitive_data: {
    en: ['sensitive', 'health', 'medical', 'biometric', 'genetic', 'religious', 'ethnic', 'political', 'sexual orientation'],
    ar: ['حساسة', 'صحية', 'طبية', 'بيومترية', 'وراثية', 'دينية', 'عرقية', 'سياسية', 'البيانات الحساسة'],
  },
  data_collection: {
    en: ['we collect', 'information we collect', 'data we collect', 'personal information', 'personal data', 'types of data'],
    ar: ['نجمع', 'المعلومات التي نجمعها', 'البيانات التي نجمعها', 'المعلومات الشخصية', 'البيانات الشخصية', 'أنواع البيانات'],
  },
  updates_changes: {
    en: ['updates', 'changes', 'modify', 'revision', 'amendment', 'update this policy'],
    ar: ['التحديثات', 'التغييرات', 'التعديل', 'المراجعة', 'تحديث السياسة'],
  },
};

function normalizeArabic(text: string): string {
  return text
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[\u064B-\u065F]/g, '')
    .toLowerCase()
    .trim();
}

function detectLanguage(text: string): 'ar' | 'en' | 'mixed' {
  const arabicChars = (text.match(/[\u0600-\u06FF]/g) || []).length;
  const latinChars = (text.match(/[a-zA-Z]/g) || []).length;
  const total = arabicChars + latinChars;
  
  if (total === 0) return 'en';
  const arabicRatio = arabicChars / total;
  
  if (arabicRatio > 0.7) return 'ar';
  if (arabicRatio < 0.3) return 'en';
  return 'mixed';
}

function findKeywords(text: string): { keywords: string[]; mappings: string[] } {
  const textLower = text.toLowerCase();
  const textNormalized = normalizeArabic(text);
  const keywords: string[] = [];
  const mappings: Set<string> = new Set();
  
  for (const [mapping, patterns] of Object.entries(PDPL_KEYWORD_MAPPINGS)) {
    for (const keyword of patterns.en) {
      if (textLower.includes(keyword.toLowerCase())) {
        keywords.push(keyword);
        mappings.add(mapping);
      }
    }
    for (const keyword of patterns.ar) {
      if (textNormalized.includes(normalizeArabic(keyword))) {
        keywords.push(keyword);
        mappings.add(mapping);
      }
    }
  }
  
  return { keywords: Array.from(new Set(keywords)), mappings: Array.from(mappings) };
}

function extractSections(html: string): PolicySection[] {
  const $ = cheerio.load(html);
  const sections: PolicySection[] = [];
  
  $('script, style, noscript, iframe, nav, header, footer').remove();
  
  const mainContent = $('main, article, .content, .policy-content, .privacy-content, #content, [role="main"]').first();
  const container = mainContent.length > 0 ? mainContent : $('body');
  
  const headings = container.find('h1, h2, h3, h4, h5, h6, strong, b').filter((_, el) => {
    const text = $(el).text().trim();
    return text.length > 3 && text.length < 200;
  });
  
  if (headings.length > 0) {
    headings.each((i, heading) => {
      const title = $(heading).text().trim();
      let sectionText = '';
      
      let current = $(heading).next();
      while (current.length > 0 && !current.is('h1, h2, h3, h4, h5, h6')) {
        const tagName = current.prop('tagName')?.toLowerCase();
        if (tagName === 'p' || tagName === 'li' || tagName === 'div' || tagName === 'span' || tagName === 'ul' || tagName === 'ol') {
          sectionText += ' ' + current.text().trim();
        }
        current = current.next();
        if (sectionText.length > 3000) break;
      }
      
      sectionText = sectionText.trim().substring(0, 2000);
      
      if (sectionText.length > 50) {
        const { keywords, mappings } = findKeywords(title + ' ' + sectionText);
        sections.push({
          title,
          text: sectionText,
          keywords,
          pdplMappings: mappings,
          startIndex: i,
          endIndex: i + 1,
        });
      }
    });
  }
  
  if (sections.length === 0) {
    const fullText = container.text().replace(/\s+/g, ' ').trim();
    const paragraphs = fullText.split(/[.。،؟?!]\s+/).filter(p => p.length > 100);
    
    paragraphs.slice(0, 10).forEach((para, i) => {
      const { keywords, mappings } = findKeywords(para);
      if (mappings.length > 0) {
        sections.push({
          title: `Section ${i + 1}`,
          text: para.substring(0, 2000),
          keywords,
          pdplMappings: mappings,
          startIndex: i,
          endIndex: i + 1,
        });
      }
    });
  }
  
  return sections;
}

function extractEvidence(text: string, mapping: string): string {
  const patterns = PDPL_KEYWORD_MAPPINGS[mapping];
  if (!patterns) return '';
  
  const textLower = text.toLowerCase();
  const textNormalized = normalizeArabic(text);
  
  for (const keyword of [...patterns.en, ...patterns.ar]) {
    const keywordNorm = normalizeArabic(keyword);
    let index = textNormalized.indexOf(keywordNorm);
    if (index === -1) {
      index = textLower.indexOf(keyword.toLowerCase());
    }
    
    if (index !== -1) {
      const start = Math.max(0, index - 50);
      const end = Math.min(text.length, index + keyword.length + 150);
      return '...' + text.substring(start, end).trim() + '...';
    }
  }
  
  return '';
}

export function parsePolicy(html: string, url: string, type: 'privacy' | 'terms' | 'cookies' | 'refund' | 'other'): ParsedPolicy {
  console.log(`[PolicyParser] Parsing ${type} policy from ${url}`);
  
  const $ = cheerio.load(html);
  $('script, style, noscript, iframe').remove();
  
  const title = $('h1').first().text().trim() || 
                $('title').text().trim() || 
                $('meta[property="og:title"]').attr('content') || 
                'Untitled Policy';
  
  const fullText = $('body').text().replace(/\s+/g, ' ').trim();
  const wordCount = fullText.split(/\s+/).length;
  const language = detectLanguage(fullText);
  
  const sections = extractSections(html);
  
  const allText = fullText.toLowerCase() + ' ' + normalizeArabic(fullText);
  
  const detectedElements = {
    hasContactInfo: false,
    hasLawfulBasis: false,
    hasRetentionPeriod: false,
    hasDataSubjectRights: false,
    hasThirdPartySharing: false,
    hasInternationalTransfer: false,
    hasSecurityMeasures: false,
    hasCookieInfo: false,
    hasChildrenData: false,
    hasSensitiveData: false,
  };
  
  const evidence: Record<string, string> = {};
  
  const checkMapping = (mapping: string, field: keyof typeof detectedElements) => {
    const patterns = PDPL_KEYWORD_MAPPINGS[mapping];
    if (!patterns) return;
    
    for (const keyword of patterns.en) {
      if (allText.includes(keyword.toLowerCase())) {
        detectedElements[field] = true;
        evidence[mapping] = extractEvidence(fullText, mapping);
        return;
      }
    }
    for (const keyword of patterns.ar) {
      if (allText.includes(normalizeArabic(keyword))) {
        detectedElements[field] = true;
        evidence[mapping] = extractEvidence(fullText, mapping);
        return;
      }
    }
  };
  
  checkMapping('contact_details', 'hasContactInfo');
  checkMapping('lawful_basis', 'hasLawfulBasis');
  checkMapping('data_retention', 'hasRetentionPeriod');
  checkMapping('data_subject_rights', 'hasDataSubjectRights');
  checkMapping('third_party_sharing', 'hasThirdPartySharing');
  checkMapping('data_transfer', 'hasInternationalTransfer');
  checkMapping('security_measures', 'hasSecurityMeasures');
  checkMapping('cookies', 'hasCookieInfo');
  checkMapping('children_data', 'hasChildrenData');
  checkMapping('sensitive_data', 'hasSensitiveData');
  
  const emailMatch = fullText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) {
    detectedElements.hasContactInfo = true;
    evidence['contact_email'] = emailMatch[0];
  }
  
  console.log(`[PolicyParser] Parsed ${sections.length} sections, ${wordCount} words, language: ${language}`);
  
  return {
    url,
    type,
    title,
    fullText: fullText.substring(0, 50000),
    wordCount,
    sections,
    language,
    detectedElements,
    evidence,
  };
}

export function analyzePolicyCompleteness(policy: ParsedPolicy): {
  score: number;
  missingElements: string[];
  presentElements: string[];
  recommendations: string[];
} {
  const requiredElements = [
    { key: 'hasContactInfo', name: 'Contact Information', nameAr: 'معلومات الاتصال' },
    { key: 'hasLawfulBasis', name: 'Lawful Basis', nameAr: 'الأساس القانوني' },
    { key: 'hasRetentionPeriod', name: 'Data Retention Period', nameAr: 'فترة الاحتفاظ بالبيانات' },
    { key: 'hasDataSubjectRights', name: 'Data Subject Rights', nameAr: 'حقوق صاحب البيانات' },
    { key: 'hasThirdPartySharing', name: 'Third Party Sharing', nameAr: 'مشاركة الأطراف الثالثة' },
    { key: 'hasSecurityMeasures', name: 'Security Measures', nameAr: 'إجراءات الأمان' },
  ];
  
  const optionalElements = [
    { key: 'hasInternationalTransfer', name: 'International Transfer', nameAr: 'النقل الدولي' },
    { key: 'hasCookieInfo', name: 'Cookie Information', nameAr: 'معلومات الكوكيز' },
    { key: 'hasChildrenData', name: 'Children Data', nameAr: 'بيانات الأطفال' },
    { key: 'hasSensitiveData', name: 'Sensitive Data', nameAr: 'البيانات الحساسة' },
  ];
  
  const missingElements: string[] = [];
  const presentElements: string[] = [];
  const recommendations: string[] = [];
  
  let requiredPresent = 0;
  for (const el of requiredElements) {
    if (policy.detectedElements[el.key as keyof typeof policy.detectedElements]) {
      requiredPresent++;
      presentElements.push(el.name);
    } else {
      missingElements.push(el.name);
      recommendations.push(`Add ${el.name} (${el.nameAr}) to your policy`);
    }
  }
  
  let optionalPresent = 0;
  for (const el of optionalElements) {
    if (policy.detectedElements[el.key as keyof typeof policy.detectedElements]) {
      optionalPresent++;
      presentElements.push(el.name);
    }
  }
  
  const requiredScore = (requiredPresent / requiredElements.length) * 70;
  const optionalScore = (optionalPresent / optionalElements.length) * 30;
  const score = Math.round(requiredScore + optionalScore);
  
  return {
    score,
    missingElements,
    presentElements,
    recommendations,
  };
}
