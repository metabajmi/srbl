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
    // Arabic - Extended
    'شروط الاستخدام', 'باستخدامك', 'بموافقتك على', 'الأهلية القانونية',
    'عمر المستخدم', 'سنة فأكثر', 'قواعد السلوك', 'الاستخدام المحظور',
    'شروط وأحكام', 'أحكام الاستخدام', 'اتفاقية الاستخدام', 'شروط الخدمة',
    'أحكام وشروط', 'بنود الاستخدام', 'قبولك لهذه الشروط', 'توافق على الالتزام',
    'بلوغ سن الرشد', 'الأهلية النظامية', 'عمره 18 سنة', 'الأهلية الكاملة',
    'السلوك المقبول', 'الممارسات المحظورة', 'الاستخدامات الممنوعة',
    // English
    'terms of use', 'by using', 'by accessing', 'legal age', 'age of majority',
    'eligibility', 'user conduct', 'prohibited use', 'acceptable use',
    'terms and conditions', 'terms of service', 'user agreement'
  ],
  
  // tc2 - Services description
  servicesDescription: [
    // Arabic - Extended
    'الخدمات المقدمة', 'نقدم لك', 'خدماتنا تشمل', 'وصف الخدمة',
    'نوفر لك', 'متجرنا يقدم', 'منصتنا توفر', 'طبيعة الخدمات',
    'نطاق الخدمة', 'ما نقدمه', 'خدماتنا الإلكترونية', 'نحن نقدم',
    'خدماتنا المتاحة', 'ما نوفره لك', 'منتجاتنا وخدماتنا',
    // English
    'services we provide', 'our services include', 'we offer', 'service description',
    'our platform provides', 'we deliver', 'scope of services'
  ],
  
  // tc3 - Limitation of liability
  liabilityLimitation: [
    // Arabic - Extended (with future-tense negation patterns)
    'حدود المسؤولية', 'إخلاء المسؤولية', 'لا نتحمل مسؤولية', 'لسنا مسؤولين',
    'المسؤولية محدودة', 'دون ضمان', 'كما هي', 'التعويضات',
    'حد أقصى للمسؤولية', 'لا نضمن', 'لا ضمان', 'الإعفاء من المسؤولية',
    'المسؤولية القانونية', 'لا نتحمل أي مسؤولية', 'غير مسؤولين عن',
    'استثناء المسؤولية', 'تقييد المسؤولية', 'الضرر غير المباشر',
    'لن نكون مسؤولين', 'لن تتحمل الشركة', 'لن نتحمل', 'لا نعتبر مسؤولين',
    'نخلي مسؤوليتنا', 'تخلي الشركة مسؤوليتها', 'الشركة غير مسؤولة',
    'لا تتحمل المنصة', 'لا يتحمل الموقع', 'لا نقدم أي ضمان',
    // English
    'limitation of liability', 'disclaimer', 'we are not liable', 'not responsible for',
    'liability is limited', 'as is', 'without warranty', 'indemnification',
    'maximum liability', 'disclaimers', 'no warranties', 'shall not be liable',
    'will not be responsible', 'we will not be held responsible'
  ],
  
  // tc4 - Governing law
  governingLaw: [
    // Arabic - Extended
    'القانون المطبق', 'القانون الحاكم', 'أنظمة المملكة العربية السعودية',
    'الاختصاص القضائي', 'محاكم المملكة', 'النظام السعودي', 'القانون السعودي',
    'النظام المعمول به', 'الأنظمة السعودية', 'المحاكم المختصة',
    'تخضع هذه الشروط', 'يحكم هذا الاتفاق', 'القضاء السعودي',
    'محاكم الرياض', 'محاكم جدة', 'الأنظمة المرعية', 'القوانين المعمول بها',
    // English
    'governing law', 'applicable law', 'laws of saudi arabia', 'saudi arabian law',
    'jurisdiction', 'courts of saudi arabia', 'under the laws', 'saudi courts',
    'laws of the kingdom'
  ],
  
  // tc5 - Intellectual property
  intellectualProperty: [
    // Arabic - Extended
    'حقوق الملكية الفكرية', 'حقوق النشر', 'العلامات التجارية',
    'محفوظة', 'جميع الحقوق', 'لا يجوز نسخ', 'الحقوق المحفوظة',
    'ملكية المحتوى', 'حقوق الطبع', 'العلامة التجارية', 'الشعار',
    'المحتوى الأصلي', 'حقوق الملكية', 'النسخ ممنوع', 'حماية حقوقنا',
    // English
    'intellectual property', 'copyright', 'trademark', 'all rights reserved',
    'proprietary', 'may not copy', 'owned by', 'our trademarks'
  ],
  
  // tc6 - Account termination
  accountTermination: [
    // Arabic - Extended
    'إنهاء الحساب', 'تعليق الحساب', 'إلغاء الحساب', 'حذف حسابك',
    'إيقاف الخدمة', 'تعليق الخدمة', 'إنهاء الاشتراك', 'إغلاق الحساب',
    'إلغاء العضوية', 'حظر الحساب', 'إنهاء العلاقة', 'تعطيل الحساب',
    'يحق لنا إنهاء', 'إيقاف حسابك', 'فسخ الاتفاق', 'إنهاء الخدمة',
    // English
    'account termination', 'suspend account', 'cancel account', 'delete your account',
    'terminate service', 'suspend service', 'close account', 'ban account'
  ],
  
  // tc7 - Terms modification
  termsModification: [
    // Arabic - Extended
    'تعديل الشروط', 'تحديث الشروط', 'نحتفظ بالحق في تعديل',
    'سنقوم بإخطارك', 'استمرارك يعني موافقتك', 'تغيير الشروط',
    'تحديث الأحكام', 'الإخطار بالتعديلات', 'إشعار بالتغييرات',
    'التعديلات على الشروط', 'حق تعديل', 'موافقتك الضمنية',
    // English
    'modify terms', 'update terms', 'reserve the right to modify',
    'we will notify you', 'continued use constitutes acceptance',
    'change these terms', 'amend terms', 'notify you of changes'
  ],
  
  // tc8 - Dispute resolution
  disputeResolution: [
    // Arabic - Extended
    'حل النزاعات', 'التحكيم', 'الوساطة', 'فض المنازعات',
    'تسوية النزاع', 'النزاعات القانونية', 'آلية حل الخلافات',
    'الخلافات الناشئة', 'تسوية الخلافات', 'النزاعات المتعلقة',
    'حل الخلاف ودياً', 'التفاوض لحل', 'التحكيم التجاري', 'مركز التحكيم',
    // English
    'dispute resolution', 'arbitration', 'mediation', 'settle disputes',
    'legal disputes', 'binding arbitration', 'resolve disputes', 'conflict resolution'
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
    // Arabic - Extended
    'ملفات تعريف الارتباط', 'ماهي الكوكيز', 'ما هي ملفات', 'تعريف الكوكيز',
    'ملفات صغيرة', 'تخزين على جهازك', 'تخزين في متصفحك',
    'سياسة الكوكيز', 'سياسة ملفات تعريف الارتباط', 'الكوكيز هي',
    'ملفات نصية', 'ملفات يتم تخزينها', 'يتم وضعها على جهازك',
    'تقنية التتبع', 'تقنيات التخزين', 'ملفات الارتباط',
    // English
    'what are cookies', 'cookies are', 'small files', 'stored on your device',
    'stored in your browser', 'text files', 'cookie policy'
  ],
  
  // cp2 - Cookie types
  cookieTypes: [
    // Arabic - Extended (deduplicated)
    'أنواع الكوكيز', 'ملفات ضرورية', 'ملفات تحليلية', 'ملفات إعلانية',
    'كوكيز الجلسة', 'كوكيز دائمة', 'كوكيز وظيفية', 'كوكيز أساسية',
    'كوكيز التسويق', 'كوكيز الأداء', 'كوكيز التفضيلات',
    'الكوكيز الضرورية', 'الكوكيز الإعلانية', 'كوكيز التحليل',
    'ملفات اختيارية', 'أنواع ملفات تعريف الارتباط',
    // English
    'types of cookies', 'essential cookies', 'analytics cookies', 'advertising cookies',
    'session cookies', 'persistent cookies', 'functional cookies', 'performance cookies',
    'marketing cookies', 'preference cookies', 'necessary cookies', 'strictly necessary'
  ],
  
  // cp3 - Cookie purposes
  cookiePurposes: [
    // Arabic - Extended
    'الغرض من', 'نستخدم الكوكيز من أجل', 'لتحسين تجربتك', 'لتذكر تفضيلاتك',
    'لأغراض تحليلية', 'لأغراض إعلانية', 'سبب استخدام', 'أهداف الكوكيز',
    'تستخدم لـ', 'نستخدمها لـ', 'الهدف من', 'لماذا نستخدم',
    'لتتبع', 'لقياس', 'لتخصيص', 'لتحليل', 'لعرض إعلانات', 'لفهم سلوك',
    // English
    'purpose of', 'we use cookies to', 'to improve your experience', 'to remember your preferences',
    'for analytics', 'for advertising purposes', 'used to', 'in order to',
    'for measuring', 'for personalizing', 'to track', 'to analyze'
  ],
  
  // cp4 - Cookie duration
  cookieDuration: [
    // Arabic - Extended (fixed: removed return-policy term)
    'مدة الصلاحية', 'تنتهي صلاحيتها', 'مدة البقاء', 'فترة الاحتفاظ',
    'تحذف تلقائياً', 'عند إغلاق المتصفح', 'فترة الصلاحية',
    'تنتهي بعد', 'صالحة لمدة', 'لمدة سنة', 'لمدة شهر', 'لمدة أسبوع',
    'كوكيز مؤقتة', 'كوكيز طويلة الأمد', 'عمر الكوكي',
    'مدة الاحتفاظ بالكوكيز', 'مدة صلاحية الكوكي', 'فترة بقاء الكوكي',
    // English
    'cookie duration', 'expiry', 'how long', 'retention period',
    'automatically deleted', 'when you close browser', 'session expires',
    'valid for', 'expires after', 'cookie lifetime', 'for one year'
  ],
  
  // cp5 - Cookie control
  cookieControl: [
    // Arabic - Extended
    'التحكم في الكوكيز', 'إدارة الكوكيز', 'قبول الكوكيز', 'رفض الكوكيز',
    'إعدادات المتصفح', 'تعطيل الكوكيز', 'حذف الكوكيز', 'إعدادات الكوكيز',
    'تغيير إعداداتك', 'يمكنك التحكم', 'خيارات الكوكيز', 'اختيار الكوكيز',
    'الموافقة على', 'رفض جميع', 'قبول جميع', 'تخصيص الإعدادات',
    'مركز التفضيلات', 'إدارة الموافقات', 'سحب الموافقة',
    // English
    'control cookies', 'manage cookies', 'accept cookies', 'reject cookies',
    'browser settings', 'disable cookies', 'delete cookies', 'cookie preferences',
    'cookie settings', 'opt out', 'withdraw consent', 'preference center'
  ],
  
  // cp6 - Third-party cookies
  thirdPartyCookies: [
    // Arabic - Extended
    'كوكيز الطرف الثالث', 'مزودي الخدمات', 'جوجل أناليتكس', 'فيسبوك',
    'شركاء الإعلان', 'مقدمي الخدمات', 'أطراف ثالثة', 'شركاء خارجيون',
    'خدمات خارجية', 'منصات الإعلان', 'شبكات الإعلان', 'خدمات التحليل',
    'جوجل', 'فيسبوك بيكسل', 'تويتر', 'لينكد إن', 'سناب شات',
    // English
    'third-party cookies', 'third party', 'google analytics', 'facebook pixel',
    'advertising partners', 'service providers', 'external services',
    'advertising networks', 'analytics services', 'social media', 'linkedin', 'twitter'
  ],
  
  // cp7 - Impact of refusing
  refusalImpact: [
    // Arabic - Extended
    'تأثير الرفض', 'إذا رفضت', 'قد تتأثر', 'بعض الميزات قد لا تعمل',
    'تجربة محدودة', 'عند تعطيل', 'في حال الرفض', 'إذا اخترت عدم',
    'قد لا تستطيع', 'ستكون محدودة', 'لن تتمكن من', 'قد تفقد',
    'تأثير على التجربة', 'عواقب الرفض',
    // English
    'impact of refusing', 'if you refuse', 'may affect', 'some features may not work',
    'limited experience', 'certain functionality', 'if you disable', 'consequences',
    'you may not be able to', 'will be limited'
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
    // Arabic - Extended
    '7 أيام', 'سبعة أيام', 'خلال أسبوع', 'حق الإرجاع', 'حق الاسترجاع',
    'من تاريخ الاستلام', 'من تاريخ التوصيل', 'دون إبداء أسباب',
    'مهلة الإرجاع', 'فترة الإرجاع', 'يحق لك الإرجاع', 'مدة الإرجاع',
    'خلال سبعة أيام', 'في غضون 7 أيام', 'حق الرجوع', 'فترة السماح',
    'بعد استلام المنتج', 'بعد التوصيل', 'من تاريخ الشراء',
    // English
    '7 days', 'seven days', 'within a week', 'right to return', 'return right',
    'from date of receipt', 'from delivery date', 'no questions asked',
    'return period', 'return window', 'within 7 days', 'after receiving'
  ],
  
  // rp2 - Return conditions
  returnConditions: [
    // Arabic - Extended
    'شروط الإرجاع', 'الحالة الأصلية', 'غير مستخدم', 'مع العبوة الأصلية',
    'مع الفاتورة', 'حالته الأصلية', 'لم يتم فتحه', 'بحالة جيدة',
    'شروط قبول الإرجاع', 'متطلبات الإرجاع', 'لم يتم استخدامه',
    'مع الملحقات', 'مع الضمان', 'بدون تلف', 'كما استلمته',
    'بدون خدوش', 'في عبوته', 'مع إيصال الشراء', 'فاتورة الشراء',
    // English
    'return conditions', 'original condition', 'unused', 'original packaging',
    'with receipt', 'original state', 'unopened', 'undamaged',
    'in good condition', 'with tags', 'with accessories', 'purchase receipt'
  ],
  
  // rp3 - Return exceptions
  returnExceptions: [
    // Arabic - Extended
    'استثناءات الإرجاع', 'لا يمكن إرجاع', 'منتجات مستثناة', 'غير قابل للإرجاع',
    'منتجات مخصصة', 'منتجات قابلة للتلف', 'البرمجيات', 'الملابس الداخلية',
    'لا يقبل الإرجاع', 'لا يشمل الإرجاع', 'منتجات غير قابلة',
    'المنتجات الرقمية', 'البطاقات الرقمية', 'المواد الغذائية',
    'مستحضرات التجميل', 'المنتجات الصحية', 'المجوهرات', 'العطور',
    // English
    'return exceptions', 'cannot be returned', 'excluded products', 'non-returnable',
    'customized products', 'perishable', 'software', 'intimate apparel', 'underwear',
    'digital products', 'gift cards', 'food items', 'cosmetics', 'health products'
  ],
  
  // rp4 - Return process
  returnProcess: [
    // Arabic - Extended
    'آلية الإرجاع', 'خطوات الإرجاع', 'كيفية الإرجاع', 'طلب إرجاع',
    'تواصل معنا', 'نموذج الإرجاع', 'إجراءات الإرجاع', 'خدمة العملاء',
    'لتقديم طلب الإرجاع', 'قم بالتواصل', 'أرسل طلب', 'اتصل بنا',
    'راسلنا على', 'خطوات طلب الإرجاع', 'كيف أطلب الإرجاع',
    'رقم الطلب', 'ملء النموذج', 'عبر البريد الإلكتروني',
    // English
    'return process', 'how to return', 'return request', 'return steps',
    'contact us to return', 'return form', 'return procedure', 'customer service',
    'to initiate a return', 'contact our team', 'submit a request', 'call us'
  ],
  
  // rp5 - Refund policy
  refundPolicy: [
    // Arabic - Extended
    'سياسة الاسترداد', 'استرداد المبلغ', 'إعادة المبلغ', 'خلال أيام عمل',
    'نفس طريقة الدفع', 'رصيد المتجر', 'استرجاع الأموال', 'رد المبلغ',
    'يتم الاسترداد', 'إعادة قيمة', 'استرداد كامل', 'استرداد جزئي',
    'طريقة الدفع الأصلية', 'بطاقة الائتمان', 'التحويل البنكي',
    'خلال 14 يوم عمل', 'خلال 7 أيام عمل', 'مدة الاسترداد',
    // English
    'refund policy', 'refund the amount', 'money back', 'within business days',
    'original payment method', 'store credit', 'refund process',
    'full refund', 'partial refund', 'credit card refund', 'bank transfer'
  ],
  
  // rp6 - Return shipping costs
  returnShipping: [
    // Arabic - Extended
    'تكاليف الشحن', 'رسوم الإرجاع', 'يتحمل العميل', 'يتحمل المتجر',
    'شحن مجاني للإرجاع', 'على حسابنا', 'مصاريف الشحن', 'تكلفة الإرجاع',
    'شحن الإرجاع', 'رسوم الشحن', 'نتحمل نحن', 'على حساب العميل',
    'على حساب المتجر', 'شحن مجاني', 'بدون رسوم إضافية',
    // English
    'shipping costs', 'return shipping', 'customer bears', 'we bear',
    'free return shipping', 'at our expense', 'prepaid label',
    'return shipping fee', 'no additional cost', 'shipping charges'
  ],
  
  // rp7 - Exchange policy
  exchangePolicy: [
    // Arabic - Extended
    'سياسة الاستبدال', 'استبدال المنتج', 'تبديل المنتج', 'استبدال بمنتج آخر',
    'استبدال بنفس القيمة', 'استبدال بمنتج مماثل', 'تبديل الحجم',
    'تبديل اللون', 'استبدال مجاني', 'يمكنك الاستبدال', 'شروط الاستبدال',
    'طلب استبدال', 'استبدال المقاس', 'بديل مناسب',
    // English
    'exchange policy', 'product exchange', 'swap product', 'exchange for another',
    'exchange for same value', 'size exchange', 'color exchange', 'free exchange',
    'exchange request', 'replacement product'
  ],
  
  // rp8 - Defects and non-conformity
  defectsPolicy: [
    // Arabic - Extended
    'منتج معيب', 'عيب تصنيع', 'غير مطابق', 'عدم المطابقة', 'ضمان الجودة',
    'تلف أثناء الشحن', 'منتج تالف', 'عيوب المصنع', 'خلل في المنتج',
    'المنتج لا يعمل', 'مختلف عن الوصف', 'غير مطابق للمواصفات',
    'ضمان المنتج', 'كفالة', 'الضمان', 'خدمة ما بعد البيع',
    'استبدال فوري', 'إصلاح مجاني', 'عيب المصنع',
    // English
    'defective product', 'manufacturing defect', 'non-conformity', 'not as described',
    'quality guarantee', 'damaged during shipping', 'damaged product', 'warranty',
    'product doesn\'t work', 'different from description', 'product warranty',
    'free repair', 'immediate replacement', 'factory defect'
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
