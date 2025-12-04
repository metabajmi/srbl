/**
 * Deterministic Document Analyzers
 * Provides sentence-level analysis for Terms, Cookie Policy, and Return/Refund Policy
 */

import { 
  splitIntoSentences, 
  findSentencesWithTerms,
  countAffirmativeTerms,
  type Sentence,
  type ContextMatch
} from "../utils/text-processor";

export interface AnalysisResult {
  requirementId: string;
  found: boolean;
  evidence: string[];
  confidence: number;
}

// ==================== TERMS & CONDITIONS ANALYZER ====================

const TERMS_PATTERNS = {
  // tc1 - General terms of use
  generalTerms: [
    // Arabic
    'شروط الاستخدام', 'باستخدامك', 'بموافقتك على', 'الأهلية القانونية',
    'عمر المستخدم', 'سنة فأكثر', 'قواعد السلوك', 'الاستخدام المحظور',
    // English
    'terms of use', 'by using', 'by accessing', 'legal age', 'age of majority',
    'eligibility', 'user conduct', 'prohibited use', 'acceptable use'
  ],
  
  // tc2 - Services description
  servicesDescription: [
    // Arabic
    'الخدمات المقدمة', 'نقدم لك', 'خدماتنا تشمل', 'وصف الخدمة',
    'نوفر لك', 'متجرنا يقدم', 'منصتنا توفر',
    // English
    'services we provide', 'our services include', 'we offer', 'service description',
    'our platform provides', 'we deliver'
  ],
  
  // tc3 - Limitation of liability
  liabilityLimitation: [
    // Arabic
    'حدود المسؤولية', 'إخلاء المسؤولية', 'لا نتحمل مسؤولية', 'لسنا مسؤولين',
    'المسؤولية محدودة', 'دون ضمان', 'كما هي',
    // English
    'limitation of liability', 'disclaimer', 'we are not liable', 'not responsible for',
    'liability is limited', 'as is', 'without warranty', 'indemnification'
  ],
  
  // tc4 - Governing law
  governingLaw: [
    // Arabic
    'القانون المطبق', 'القانون الحاكم', 'أنظمة المملكة العربية السعودية',
    'الاختصاص القضائي', 'محاكم المملكة', 'النظام السعودي',
    // English
    'governing law', 'applicable law', 'laws of saudi arabia', 'saudi arabian law',
    'jurisdiction', 'courts of saudi arabia', 'under the laws'
  ],
  
  // tc5 - Intellectual property
  intellectualProperty: [
    // Arabic
    'حقوق الملكية الفكرية', 'حقوق النشر', 'العلامات التجارية',
    'محفوظة', 'جميع الحقوق', 'لا يجوز نسخ',
    // English
    'intellectual property', 'copyright', 'trademark', 'all rights reserved',
    'proprietary', 'may not copy', 'owned by'
  ],
  
  // tc6 - Account termination
  accountTermination: [
    // Arabic
    'إنهاء الحساب', 'تعليق الحساب', 'إلغاء الحساب', 'حذف حسابك',
    'إيقاف الخدمة', 'تعليق الخدمة',
    // English
    'account termination', 'suspend account', 'cancel account', 'delete your account',
    'terminate service', 'suspend service'
  ],
  
  // tc7 - Terms modification
  termsModification: [
    // Arabic
    'تعديل الشروط', 'تحديث الشروط', 'نحتفظ بالحق في تعديل',
    'سنقوم بإخطارك', 'استمرارك يعني موافقتك',
    // English
    'modify terms', 'update terms', 'reserve the right to modify',
    'we will notify you', 'continued use constitutes acceptance'
  ],
  
  // tc8 - Dispute resolution
  disputeResolution: [
    // Arabic
    'حل النزاعات', 'التحكيم', 'الوساطة', 'فض المنازعات',
    'تسوية النزاع', 'النزاعات القانونية',
    // English
    'dispute resolution', 'arbitration', 'mediation', 'settle disputes',
    'legal disputes', 'binding arbitration'
  ]
};

export function analyzeTermsDocument(text: string): AnalysisResult[] {
  const sentences = splitIntoSentences(text);
  const results: AnalysisResult[] = [];
  
  const checks = [
    { id: 'tc1', patterns: TERMS_PATTERNS.generalTerms },
    { id: 'tc2', patterns: TERMS_PATTERNS.servicesDescription },
    { id: 'tc3', patterns: TERMS_PATTERNS.liabilityLimitation },
    { id: 'tc4', patterns: TERMS_PATTERNS.governingLaw },
    { id: 'tc5', patterns: TERMS_PATTERNS.intellectualProperty },
    { id: 'tc6', patterns: TERMS_PATTERNS.accountTermination },
    { id: 'tc7', patterns: TERMS_PATTERNS.termsModification },
    { id: 'tc8', patterns: TERMS_PATTERNS.disputeResolution }
  ];
  
  for (const check of checks) {
    const matches = findSentencesWithTerms(sentences, check.patterns, { excludeNegated: false });
    const { count, foundTerms } = countAffirmativeTerms(sentences, check.patterns, { excludeContactSections: false });
    
    results.push({
      requirementId: check.id,
      found: matches.length > 0,
      evidence: foundTerms.slice(0, 5),
      confidence: Math.min(1, count / 2) // At least 2 terms for full confidence
    });
  }
  
  return results;
}

// ==================== COOKIE POLICY ANALYZER ====================

const COOKIE_PATTERNS = {
  // cp1 - Cookie definition
  cookieDefinition: [
    // Arabic
    'ملفات تعريف الارتباط', 'ماهي الكوكيز', 'ما هي ملفات', 'تعريف الكوكيز',
    'ملفات صغيرة', 'تخزين على جهازك', 'تخزين في متصفحك',
    // English
    'what are cookies', 'cookies are', 'small files', 'stored on your device',
    'stored in your browser', 'text files'
  ],
  
  // cp2 - Cookie types
  cookieTypes: [
    // Arabic
    'أنواع الكوكيز', 'ملفات ضرورية', 'ملفات تحليلية', 'ملفات إعلانية',
    'كوكيز الجلسة', 'كوكيز دائمة', 'كوكيز وظيفية',
    // English
    'types of cookies', 'essential cookies', 'analytics cookies', 'advertising cookies',
    'session cookies', 'persistent cookies', 'functional cookies', 'performance cookies'
  ],
  
  // cp3 - Cookie purposes
  cookiePurposes: [
    // Arabic
    'الغرض من', 'نستخدم الكوكيز من أجل', 'لتحسين تجربتك', 'لتذكر تفضيلاتك',
    'لأغراض تحليلية', 'لأغراض إعلانية',
    // English
    'purpose of', 'we use cookies to', 'to improve your experience', 'to remember your preferences',
    'for analytics', 'for advertising purposes'
  ],
  
  // cp4 - Cookie duration
  cookieDuration: [
    // Arabic
    'مدة الصلاحية', 'تنتهي صلاحيتها', 'مدة البقاء', 'فترة الاحتفاظ',
    'تحذف تلقائياً', 'عند إغلاق المتصفح',
    // English
    'cookie duration', 'expiry', 'how long', 'retention period',
    'automatically deleted', 'when you close browser', 'session expires'
  ],
  
  // cp5 - Cookie control
  cookieControl: [
    // Arabic
    'التحكم في الكوكيز', 'إدارة الكوكيز', 'قبول الكوكيز', 'رفض الكوكيز',
    'إعدادات المتصفح', 'تعطيل الكوكيز', 'حذف الكوكيز',
    // English
    'control cookies', 'manage cookies', 'accept cookies', 'reject cookies',
    'browser settings', 'disable cookies', 'delete cookies', 'cookie preferences'
  ],
  
  // cp6 - Third-party cookies
  thirdPartyCookies: [
    // Arabic
    'كوكيز الطرف الثالث', 'مزودي الخدمات', 'جوجل أناليتكس', 'فيسبوك',
    'شركاء الإعلان', 'مقدمي الخدمات',
    // English
    'third-party cookies', 'third party', 'google analytics', 'facebook pixel',
    'advertising partners', 'service providers', 'external services'
  ],
  
  // cp7 - Impact of refusing
  refusalImpact: [
    // Arabic
    'تأثير الرفض', 'إذا رفضت', 'قد تتأثر', 'بعض الميزات قد لا تعمل',
    'تجربة محدودة',
    // English
    'impact of refusing', 'if you refuse', 'may affect', 'some features may not work',
    'limited experience', 'certain functionality'
  ]
};

export function analyzeCookiePolicy(text: string): AnalysisResult[] {
  const sentences = splitIntoSentences(text);
  const results: AnalysisResult[] = [];
  
  const checks = [
    { id: 'cp1', patterns: COOKIE_PATTERNS.cookieDefinition },
    { id: 'cp2', patterns: COOKIE_PATTERNS.cookieTypes },
    { id: 'cp3', patterns: COOKIE_PATTERNS.cookiePurposes },
    { id: 'cp4', patterns: COOKIE_PATTERNS.cookieDuration },
    { id: 'cp5', patterns: COOKIE_PATTERNS.cookieControl },
    { id: 'cp6', patterns: COOKIE_PATTERNS.thirdPartyCookies },
    { id: 'cp7', patterns: COOKIE_PATTERNS.refusalImpact }
  ];
  
  for (const check of checks) {
    const matches = findSentencesWithTerms(sentences, check.patterns, { excludeNegated: false });
    const { count, foundTerms } = countAffirmativeTerms(sentences, check.patterns, { excludeContactSections: false });
    
    results.push({
      requirementId: check.id,
      found: matches.length > 0,
      evidence: foundTerms.slice(0, 5),
      confidence: Math.min(1, count / 2)
    });
  }
  
  return results;
}

// ==================== RETURN/REFUND POLICY ANALYZER ====================

const RETURN_PATTERNS = {
  // rp1 - 7-day return right
  returnRight: [
    // Arabic
    '7 أيام', 'سبعة أيام', 'خلال أسبوع', 'حق الإرجاع', 'حق الاسترجاع',
    'من تاريخ الاستلام', 'من تاريخ التوصيل', 'دون إبداء أسباب',
    // English
    '7 days', 'seven days', 'within a week', 'right to return', 'return right',
    'from date of receipt', 'from delivery date', 'no questions asked'
  ],
  
  // rp2 - Return conditions
  returnConditions: [
    // Arabic
    'شروط الإرجاع', 'الحالة الأصلية', 'غير مستخدم', 'مع العبوة الأصلية',
    'مع الفاتورة', 'حالته الأصلية', 'لم يتم فتحه',
    // English
    'return conditions', 'original condition', 'unused', 'original packaging',
    'with receipt', 'original state', 'unopened', 'undamaged'
  ],
  
  // rp3 - Return exceptions
  returnExceptions: [
    // Arabic
    'استثناءات الإرجاع', 'لا يمكن إرجاع', 'منتجات مستثناة', 'غير قابل للإرجاع',
    'منتجات مخصصة', 'منتجات قابلة للتلف', 'البرمجيات', 'الملابس الداخلية',
    // English
    'return exceptions', 'cannot be returned', 'excluded products', 'non-returnable',
    'customized products', 'perishable', 'software', 'intimate apparel', 'underwear'
  ],
  
  // rp4 - Return process
  returnProcess: [
    // Arabic
    'آلية الإرجاع', 'خطوات الإرجاع', 'كيفية الإرجاع', 'طلب إرجاع',
    'تواصل معنا', 'نموذج الإرجاع', 'إجراءات الإرجاع',
    // English
    'return process', 'how to return', 'return request', 'return steps',
    'contact us to return', 'return form', 'return procedure'
  ],
  
  // rp5 - Refund policy
  refundPolicy: [
    // Arabic
    'سياسة الاسترداد', 'استرداد المبلغ', 'إعادة المبلغ', 'خلال أيام عمل',
    'نفس طريقة الدفع', 'رصيد المتجر',
    // English
    'refund policy', 'refund the amount', 'money back', 'within business days',
    'original payment method', 'store credit', 'refund process'
  ],
  
  // rp6 - Return shipping costs
  returnShipping: [
    // Arabic
    'تكاليف الشحن', 'رسوم الإرجاع', 'يتحمل العميل', 'يتحمل المتجر',
    'شحن مجاني للإرجاع', 'على حسابنا',
    // English
    'shipping costs', 'return shipping', 'customer bears', 'we bear',
    'free return shipping', 'at our expense', 'prepaid label'
  ],
  
  // rp7 - Exchange policy
  exchangePolicy: [
    // Arabic
    'سياسة الاستبدال', 'استبدال المنتج', 'تبديل المنتج', 'استبدال بمنتج آخر',
    'استبدال بنفس القيمة',
    // English
    'exchange policy', 'product exchange', 'swap product', 'exchange for another',
    'exchange for same value'
  ],
  
  // rp8 - Defects and non-conformity
  defectsPolicy: [
    // Arabic
    'منتج معيب', 'عيب تصنيع', 'غير مطابق', 'عدم المطابقة', 'ضمان الجودة',
    'تلف أثناء الشحن', 'منتج تالف',
    // English
    'defective product', 'manufacturing defect', 'non-conformity', 'not as described',
    'quality guarantee', 'damaged during shipping', 'damaged product', 'warranty'
  ]
};

export function analyzeReturnPolicy(text: string): AnalysisResult[] {
  const sentences = splitIntoSentences(text);
  const results: AnalysisResult[] = [];
  
  const checks = [
    { id: 'rp1', patterns: RETURN_PATTERNS.returnRight },
    { id: 'rp2', patterns: RETURN_PATTERNS.returnConditions },
    { id: 'rp3', patterns: RETURN_PATTERNS.returnExceptions },
    { id: 'rp4', patterns: RETURN_PATTERNS.returnProcess },
    { id: 'rp5', patterns: RETURN_PATTERNS.refundPolicy },
    { id: 'rp6', patterns: RETURN_PATTERNS.returnShipping },
    { id: 'rp7', patterns: RETURN_PATTERNS.exchangePolicy },
    { id: 'rp8', patterns: RETURN_PATTERNS.defectsPolicy }
  ];
  
  for (const check of checks) {
    const matches = findSentencesWithTerms(sentences, check.patterns, { excludeNegated: false });
    const { count, foundTerms } = countAffirmativeTerms(sentences, check.patterns, { excludeContactSections: false });
    
    results.push({
      requirementId: check.id,
      found: matches.length > 0,
      evidence: foundTerms.slice(0, 5),
      confidence: Math.min(1, count / 2)
    });
  }
  
  return results;
}

// ==================== COMBINED ANALYZER ====================

export type DocumentType = 'privacy_policy' | 'terms' | 'cookie_policy' | 'return_policy';

export interface DocumentAnalysisReport {
  documentType: DocumentType;
  totalRequirements: number;
  foundRequirements: number;
  missingRequirements: string[];
  complianceScore: number;
  details: AnalysisResult[];
}

export function analyzeDocument(text: string, documentType: DocumentType): DocumentAnalysisReport {
  let results: AnalysisResult[];
  
  switch (documentType) {
    case 'terms':
      results = analyzeTermsDocument(text);
      break;
    case 'cookie_policy':
      results = analyzeCookiePolicy(text);
      break;
    case 'return_policy':
      results = analyzeReturnPolicy(text);
      break;
    default:
      results = [];
  }
  
  const foundCount = results.filter(r => r.found).length;
  const missingIds = results.filter(r => !r.found).map(r => r.requirementId);
  
  return {
    documentType,
    totalRequirements: results.length,
    foundRequirements: foundCount,
    missingRequirements: missingIds,
    complianceScore: results.length > 0 ? Math.round((foundCount / results.length) * 100) : 0,
    details: results
  };
}
