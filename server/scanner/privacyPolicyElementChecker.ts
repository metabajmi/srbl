// Specialized checker for 11 mandatory PDPL privacy policy elements
// Based on SDAIA Privacy Policy Guideline (August 2024)

export interface PolicyElementCheck {
  id: string;
  nameAr: string;
  nameEn: string;
  severity: 'critical';
  keywordsAr: string[];
  keywordsEn: string[];
  status: 'FOUND' | 'PARTIAL' | 'MISSING';
  matchedKeywords: string[];
  matchCount: number;
}

export interface PrivacyPolicyAudit {
  elementsFound: number;
  elementsPartial: number;
  elementsMissing: number;
  elements: PolicyElementCheck[];
  compliancePercentage: number;
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u064B-\u065F]/g, '') // Remove diacritics
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim();
}

const PRIVACY_POLICY_ELEMENTS = [
  {
    id: 'pp1',
    nameAr: 'اسم الجهة ونشاطها',
    nameEn: 'Entity name and activities',
    severity: 'critical' as const,
    keywordsAr: ['اسم الجهة', 'المؤسسة', 'الشركة', 'البيانات الأساسية', 'نشاط الجهة', 'مهام', 'اختصاصات'],
    keywordsEn: ['company name', 'business name', 'entity name', 'organization', 'company', 'activities', 'about us'],
  },
  {
    id: 'pp2',
    nameAr: 'بيانات التواصل وسجل التحديثات',
    nameEn: 'Contact information and update log',
    severity: 'critical' as const,
    keywordsAr: ['بيانات التواصل', 'اتصل بنا', 'البريد الإلكتروني', 'رقم الهاتف', 'العنوان', 'تاريخ التحديث', 'آخر تحديث', 'تم التحديث'],
    keywordsEn: ['contact information', 'contact us', 'email', 'phone', 'address', 'last updated', 'updated on', 'revision date'],
  },
  {
    id: 'pp3',
    nameAr: 'تحديد أنواع البيانات الشخصية المجمعة',
    nameEn: 'Specification of personal data types collected',
    severity: 'critical' as const,
    keywordsAr: ['بيانات الهوية', 'بيانات الاتصال', 'معلومات شخصية', 'الاسم', 'البريد الإلكتروني', 'رقم الهاتف', 'العنوان', 'بيانات تقنية', 'عنوان IP', 'بيانات التصفح', 'ملفات تعريف الارتباط', 'الكوكيز', 'أنواع البيانات'],
    keywordsEn: ['personal data types', 'identity data', 'contact data', 'personal information', 'name', 'email', 'phone', 'address', 'technical data', 'IP address', 'browsing data', 'cookies', 'data categories', 'types of data'],
  },
  {
    id: 'pp4',
    nameAr: 'طرق جمع البيانات الشخصية والغرض من جمعها',
    nameEn: 'Data collection methods and purposes',
    severity: 'critical' as const,
    keywordsAr: ['طرق جمع', 'كيفية جمع', 'غرض الجمع', 'أغراض المعالجة', 'لماذا نجمع', 'سبب الجمع', 'الأساس القانوني', 'الموافقة', 'العقد', 'المصلحة المشروعة'],
    keywordsEn: ['collection methods', 'how we collect', 'purposes of collection', 'why we collect', 'data collection', 'purposes of processing', 'legal basis', 'consent', 'contract', 'legitimate interest'],
  },
  {
    id: 'pp5',
    nameAr: 'معالجة البيانات الشخصية',
    nameEn: 'Personal data processing',
    severity: 'critical' as const,
    keywordsAr: ['معالجة البيانات', 'كيف نستخدم', 'استخدام البيانات', 'أنشطة المعالجة', 'معالجة', 'نستخدم البيانات', 'استخدامات البيانات'],
    keywordsEn: ['data processing', 'how we use', 'using your data', 'processing activities', 'we process', 'uses of data', 'data use'],
  },
  {
    id: 'pp6',
    nameAr: 'مشاركة البيانات الشخصية',
    nameEn: 'Personal data sharing',
    severity: 'critical' as const,
    keywordsAr: ['مشاركة البيانات', 'طرف ثالث', 'أطراف ثالثة', 'نشارك مع', 'الإفصاح عن', 'مزودي الخدمة', 'الشركاء', 'الشركات التابعة', 'مقدمي الخدمات', 'الجهات الأخرى'],
    keywordsEn: ['data sharing', 'third party', 'third parties', 'share with', 'disclose', 'service providers', 'partners', 'affiliates', 'other organizations', 'vendors'],
  },
  {
    id: 'pp7',
    nameAr: 'تخزين البيانات الشخصية ومدة الاحتفاظ بها وإتلافها',
    nameEn: 'Data storage, retention period, and destruction',
    severity: 'critical' as const,
    keywordsAr: ['الاحتفاظ بالبيانات', 'فترة الاحتفاظ', 'مدة الاحتفاظ', 'نحتفظ', 'تخزين', 'الحذف', 'فترة التخزين', 'إتلاف البيانات', 'مدة التخزين', 'حفظ البيانات'],
    keywordsEn: ['data retention', 'retention period', 'how long we keep', 'storage period', 'keep your data', 'deletion', 'destroy', 'how long', 'data storage', 'retention'],
  },
  {
    id: 'pp8',
    nameAr: 'شرح كامل لحقوق أصحاب البيانات الشخصية',
    nameEn: 'Complete explanation of data subject rights',
    severity: 'critical' as const,
    keywordsAr: ['حقوق أصحاب البيانات', 'حق الوصول', 'حق التصحيح', 'حق الحذف', 'حق الإتلاف', 'حق الاعتراض', 'حق نقل البيانات', 'حقوقك', 'سحب الموافقة', 'الحقوق', 'حق العلم'],
    keywordsEn: ['data subject rights', 'right to access', 'right to rectify', 'right to erasure', 'right to delete', 'right to object', 'data portability', 'withdraw consent', 'your rights', 'right to'],
  },
  {
    id: 'pp9',
    nameAr: 'آلية تقديم الشكاوى والاعتراضات',
    nameEn: 'Complaints and objections mechanism',
    severity: 'critical' as const,
    keywordsAr: ['الشكاوى', 'تقديم شكوى', 'آلية الشكاوى', 'الاعتراضات', 'تقديم اعتراض', 'شكوى', 'اعتراض', 'كيفية تقديم', 'طريقة الشكوى'],
    keywordsEn: ['complaints', 'lodge complaint', 'file complaint', 'submit complaint', 'objections', 'complaints mechanism', 'how to complain', 'complaint process', 'complaint procedure'],
  },
  {
    id: 'pp10',
    nameAr: 'إتاحة السياسة وتسهيل الوصول إليها',
    nameEn: 'Policy accessibility',
    severity: 'critical' as const,
    keywordsAr: ['سهولة الوصول', 'متاحة', 'متاح', 'الوصول إلى السياسة', 'الوصول السهل', 'واضحة', 'مفهومة', 'سهلة', 'accessible', 'موجودة'],
    keywordsEn: ['accessible', 'easily accessible', 'available', 'easy access', 'clearly', 'understandable', 'easy to find', 'transparent', 'visibility'],
  },
  {
    id: 'pp11',
    nameAr: 'الموافقة الصريحة على استخدام البيانات للتسويق',
    nameEn: 'Explicit consent for marketing use of data',
    severity: 'critical' as const,
    keywordsAr: ['موافقة صريحة', 'التسويق', 'الإعلانات', 'الترويج', 'marketing', 'opt-in', 'الاشتراك', 'إلغاء الاشتراك', 'موافقة على التسويق', 'الموافقة المسبقة'],
    keywordsEn: ['explicit consent', 'marketing', 'advertising', 'promotional', 'opt-in', 'opt-out', 'unsubscribe', 'marketing purposes', 'marketing consent'],
  },
];

function checkElement(policyText: string, element: typeof PRIVACY_POLICY_ELEMENTS[0]): PolicyElementCheck {
  const normalizedPolicy = normalizeText(policyText);
  const allKeywords = [...element.keywordsEn, ...element.keywordsAr];
  const matchedKeywords: string[] = [];
  let matchCount = 0;

  // Check each keyword
  for (const keyword of allKeywords) {
    const normalizedKeyword = normalizeText(keyword);
    if (normalizedPolicy.includes(normalizedKeyword)) {
      matchedKeywords.push(keyword);
      matchCount++;
    }
  }

  // Determine status based on match count
  let status: 'FOUND' | 'PARTIAL' | 'MISSING';
  if (matchCount >= 3) {
    status = 'FOUND'; // 3+ keyword matches = element found
  } else if (matchCount >= 1) {
    status = 'PARTIAL'; // 1-2 keyword matches = partial match
  } else {
    status = 'MISSING'; // 0 keyword matches = element missing
  }

  return {
    id: element.id,
    nameAr: element.nameAr,
    nameEn: element.nameEn,
    severity: element.severity,
    keywordsAr: element.keywordsAr,
    keywordsEn: element.keywordsEn,
    status,
    matchedKeywords,
    matchCount,
  };
}

export function auditPrivacyPolicy(policyText: string): PrivacyPolicyAudit {
  if (!policyText || policyText.trim().length < 50) {
    return {
      elementsFound: 0,
      elementsPartial: 0,
      elementsMissing: PRIVACY_POLICY_ELEMENTS.length,
      elements: PRIVACY_POLICY_ELEMENTS.map(el => ({
        id: el.id,
        nameAr: el.nameAr,
        nameEn: el.nameEn,
        severity: el.severity,
        keywordsAr: el.keywordsAr,
        keywordsEn: el.keywordsEn,
        status: 'MISSING' as const,
        matchedKeywords: [],
        matchCount: 0,
      })),
      compliancePercentage: 0,
    };
  }

  const elements = PRIVACY_POLICY_ELEMENTS.map(el => checkElement(policyText, el));

  const elementsFound = elements.filter(e => e.status === 'FOUND').length;
  const elementsPartial = elements.filter(e => e.status === 'PARTIAL').length;
  const elementsMissing = elements.filter(e => e.status === 'MISSING').length;

  // Compliance calculation: FOUND = 100%, PARTIAL = 50%, MISSING = 0%
  const totalScore = elementsFound * 100 + elementsPartial * 50;
  const compliancePercentage = Math.round((totalScore / (PRIVACY_POLICY_ELEMENTS.length * 100)) * 100);

  return {
    elementsFound,
    elementsPartial,
    elementsMissing,
    elements,
    compliancePercentage,
  };
}
