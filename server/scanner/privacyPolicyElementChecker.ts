// Privacy Policy Element Checker - 12 PDPL Mandatory Elements
// Based on user's exact requirements for PDPL compliance

export interface PolicyElementCheck {
  id: string;
  number: number;
  nameAr: string;
  nameEn: string;
  status: 'موجود بالكامل' | 'ناقص أو غير واضح' | 'غير موجود';
  statusEn: 'FOUND' | 'PARTIAL' | 'MISSING';
  evidence: string;  // Quote from the policy text
  notes: string;     // Notes if partial/missing
  matchCount: number;
  matchedKeywords: string[];
}

export interface PrivacyPolicyAudit {
  elementsFound: number;
  elementsPartial: number;
  elementsMissing: number;
  elements: PolicyElementCheck[];
  compliancePercentage: number;
  isComplete: boolean;  // true only if ALL 12 elements are fully present
  summary: string;
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

// Extract evidence snippet from text around matched keyword
function extractEvidence(fullText: string, matchedKeyword: string, maxLength: number = 150): string {
  const normalizedText = normalizeText(fullText);
  const normalizedKeyword = normalizeText(matchedKeyword);
  const index = normalizedText.indexOf(normalizedKeyword);
  
  if (index === -1) return '';
  
  // Find the corresponding position in original text
  const start = Math.max(0, index - 50);
  const end = Math.min(fullText.length, index + matchedKeyword.length + 100);
  
  let snippet = fullText.substring(start, end).trim();
  if (start > 0) snippet = '...' + snippet;
  if (end < fullText.length) snippet = snippet + '...';
  
  return snippet.replace(/\s+/g, ' ').substring(0, maxLength);
}

// The EXACT 12 elements required by user
const PRIVACY_POLICY_ELEMENTS = [
  {
    id: 'element_1',
    number: 1,
    nameAr: 'بيانات التواصل الخاصة بالجهة',
    nameEn: 'Entity contact information',
    keywordsAr: ['اتصل بنا', 'تواصل معنا', 'بيانات التواصل', 'البريد الإلكتروني', 'رقم الهاتف', 'العنوان', 'للتواصل', 'معلومات الاتصال', 'بريدنا الإلكتروني', 'هاتف', 'عنوان الشركة', 'رقم التواصل'],
    keywordsEn: ['contact us', 'contact information', 'email', 'phone', 'address', 'reach us', 'get in touch', 'contact details', 'our email', 'telephone', 'company address'],
  },
  {
    id: 'element_2',
    number: 2,
    nameAr: 'تاريخ آخر تحديث لسياسة الخصوصية',
    nameEn: 'Last update date of privacy policy',
    keywordsAr: ['تاريخ التحديث', 'آخر تحديث', 'تم التحديث', 'تاريخ النشر', 'تاريخ المراجعة', 'النسخة', 'تحديث السياسة', 'آخر مراجعة', 'تاريخ السريان', 'تاريخ الإصدار'],
    keywordsEn: ['last updated', 'updated on', 'revision date', 'effective date', 'date of update', 'version', 'last modified', 'published on', 'date of revision'],
  },
  {
    id: 'element_3',
    number: 3,
    nameAr: 'ماهي البيانات الشخصية التي يتم جمعها',
    nameEn: 'What personal data is collected',
    keywordsAr: ['البيانات التي نجمعها', 'نجمع البيانات', 'أنواع البيانات', 'البيانات الشخصية', 'المعلومات التي نجمعها', 'الاسم', 'البريد الإلكتروني', 'رقم الهاتف', 'العنوان', 'بيانات الهوية', 'بيانات تقنية', 'عنوان IP', 'الكوكيز', 'ملفات تعريف الارتباط'],
    keywordsEn: ['data we collect', 'we collect', 'types of data', 'personal data', 'information we collect', 'name', 'email', 'phone number', 'address', 'identity data', 'technical data', 'IP address', 'cookies', 'browsing data'],
  },
  {
    id: 'element_4',
    number: 4,
    nameAr: 'كيف يتم جمع البيانات الشخصية وما هو الغرض من جمعها',
    nameEn: 'How data is collected and purpose of collection',
    keywordsAr: ['كيف نجمع', 'طريقة الجمع', 'كيفية جمع', 'الغرض من الجمع', 'لماذا نجمع', 'أغراض الجمع', 'نجمع بياناتك', 'مصادر البيانات', 'نحصل على', 'الهدف من الجمع', 'سبب الجمع', 'أسباب جمع'],
    keywordsEn: ['how we collect', 'collection method', 'purpose of collection', 'why we collect', 'purposes', 'sources of data', 'we obtain', 'reason for collecting', 'collected for', 'collection purposes'],
  },
  {
    id: 'element_5',
    number: 5,
    nameAr: 'كيفية استخدام البيانات الشخصية',
    nameEn: 'How personal data is used',
    keywordsAr: ['كيف نستخدم', 'استخدام البيانات', 'نستخدم بياناتك', 'طريقة الاستخدام', 'استخدامات البيانات', 'نعالج البيانات', 'معالجة البيانات', 'نستفيد من', 'استخدام المعلومات'],
    keywordsEn: ['how we use', 'use of data', 'we use your data', 'data usage', 'processing', 'we process', 'utilize', 'used for', 'using your information'],
  },
  {
    id: 'element_6',
    number: 6,
    nameAr: 'كيفية الإفصاح عن البيانات الشخصية (مع من يتم مشاركتها)',
    nameEn: 'How data is disclosed and with whom it is shared',
    keywordsAr: ['الإفصاح عن', 'مشاركة البيانات', 'نشارك مع', 'أطراف ثالثة', 'طرف ثالث', 'مزودي الخدمة', 'الشركاء', 'جهات خارجية', 'نفصح عن', 'مشاركة المعلومات', 'الجهات التي نشارك معها', 'المستلمين'],
    keywordsEn: ['disclosure', 'share with', 'third parties', 'third party', 'service providers', 'partners', 'we share', 'disclose', 'recipients', 'sharing information', 'shared with'],
  },
  {
    id: 'element_7',
    number: 7,
    nameAr: 'المسوغات النظامية لجمع ومعالجة البيانات الشخصية',
    nameEn: 'Legal basis for collecting and processing personal data',
    keywordsAr: ['المسوغ النظامي', 'الأساس القانوني', 'المسوغات النظامية', 'الموافقة', 'العقد', 'الالتزام القانوني', 'المصلحة المشروعة', 'أساس قانوني', 'سند نظامي', 'المادة', 'نظام حماية البيانات', 'PDPL'],
    keywordsEn: ['legal basis', 'lawful basis', 'consent', 'contract', 'legal obligation', 'legitimate interest', 'legal grounds', 'lawful grounds', 'PDPL', 'data protection law'],
  },
  {
    id: 'element_8',
    number: 8,
    nameAr: 'كيفية تخزين البيانات الشخصية ومدة الاحتفاظ بها',
    nameEn: 'How data is stored and retention period',
    keywordsAr: ['تخزين البيانات', 'نحتفظ', 'مدة الاحتفاظ', 'فترة التخزين', 'نخزن', 'حفظ البيانات', 'الاحتفاظ بالبيانات', 'نحذف', 'الحذف', 'إتلاف', 'مدة الحفظ', 'فترة الاحتفاظ'],
    keywordsEn: ['data storage', 'we retain', 'retention period', 'how long', 'we store', 'keep your data', 'data retention', 'deletion', 'destroy', 'storage period', 'stored for'],
  },
  {
    id: 'element_9',
    number: 9,
    nameAr: 'حقوق صاحب البيانات فيما يتعلق بمعالجة بياناته',
    nameEn: 'Data subject rights regarding data processing',
    keywordsAr: ['حقوقك', 'حقوق صاحب البيانات', 'حق الوصول', 'حق التصحيح', 'حق الحذف', 'حق الاعتراض', 'حق نقل البيانات', 'سحب الموافقة', 'الحق في', 'يحق لك', 'حقوق المستخدم'],
    keywordsEn: ['your rights', 'data subject rights', 'right to access', 'right to rectify', 'right to delete', 'right to object', 'data portability', 'withdraw consent', 'right to', 'you have the right', 'user rights'],
  },
  {
    id: 'element_10',
    number: 10,
    nameAr: 'مسؤول حماية البيانات الشخصية (بيانات التواصل معه إن وجدت)',
    nameEn: 'Data Protection Officer (contact details if available)',
    keywordsAr: ['مسؤول حماية البيانات', 'DPO', 'ضابط حماية البيانات', 'مسؤول الخصوصية', 'المسؤول عن حماية', 'التواصل مع مسؤول', 'مسؤول البيانات', 'مسؤول الحماية'],
    keywordsEn: ['data protection officer', 'DPO', 'privacy officer', 'data officer', 'protection officer', 'contact DPO', 'officer responsible'],
  },
  {
    id: 'element_11',
    number: 11,
    nameAr: 'كيفية تقديم شكوى أو اعتراض',
    nameEn: 'How to file a complaint or objection',
    keywordsAr: ['تقديم شكوى', 'الشكاوى', 'اعتراض', 'تقديم اعتراض', 'آلية الشكوى', 'الاعتراض على', 'رفع شكوى', 'إرسال شكوى', 'طريقة الشكوى', 'للشكاوى', 'شكوى'],
    keywordsEn: ['file a complaint', 'complaint', 'objection', 'lodge complaint', 'submit complaint', 'complaints mechanism', 'how to complain', 'raise objection', 'complaints procedure'],
  },
  {
    id: 'element_12',
    number: 12,
    nameAr: 'عنوان الهيئة السعودية للبيانات والذكاء الاصطناعي (سدايا) كجهة تنظيمية',
    nameEn: 'SDAIA (Saudi Data & AI Authority) address as regulatory body',
    keywordsAr: ['سدايا', 'SDAIA', 'الهيئة السعودية للبيانات', 'الهيئة السعودية للذكاء الاصطناعي', 'الجهة التنظيمية', 'الجهة الرقابية', 'هيئة البيانات', 'sdaia.gov.sa', 'الهيئة المختصة'],
    keywordsEn: ['SDAIA', 'Saudi Data', 'Saudi AI Authority', 'data authority', 'regulatory authority', 'supervisory authority', 'data protection authority', 'sdaia.gov.sa'],
  },
];

function checkElement(policyText: string, element: typeof PRIVACY_POLICY_ELEMENTS[0]): PolicyElementCheck {
  const normalizedPolicy = normalizeText(policyText);
  const allKeywords = [...element.keywordsAr, ...element.keywordsEn];
  const matchedKeywords: string[] = [];
  let firstMatchedKeyword = '';

  // Check each keyword
  for (const keyword of allKeywords) {
    const normalizedKeyword = normalizeText(keyword);
    if (normalizedPolicy.includes(normalizedKeyword)) {
      matchedKeywords.push(keyword);
      if (!firstMatchedKeyword) firstMatchedKeyword = keyword;
    }
  }

  const matchCount = matchedKeywords.length;
  
  // STRICT ZERO-TOLERANCE EVALUATION:
  // 5+ keyword matches = موجود بالكامل (FOUND) - element clearly and explicitly present
  // 3-4 matches = ناقص أو غير واضح (PARTIAL) - mentioned but not detailed enough
  // 0-2 matches = غير موجود (MISSING) - not present or too vague
  // 
  // This is STRICT: we don't assume, we don't guess, we don't complete missing info
  let status: 'موجود بالكامل' | 'ناقص أو غير واضح' | 'غير موجود';
  let statusEn: 'FOUND' | 'PARTIAL' | 'MISSING';
  let notes = '';

  if (matchCount >= 5) {
    status = 'موجود بالكامل';
    statusEn = 'FOUND';
    notes = '';
  } else if (matchCount >= 3) {
    status = 'ناقص أو غير واضح';
    statusEn = 'PARTIAL';
    notes = `مذكور بشكل غير كافٍ (${matchCount} إشارات فقط). يجب توضيح هذا العنصر بشكل مفصّل وصريح.`;
  } else {
    status = 'غير موجود';
    statusEn = 'MISSING';
    notes = matchCount > 0 
      ? `لم يتم ذكره بوضوح (${matchCount} إشارة غامضة فقط). يجب إضافة نص صريح ومفصّل.`
      : 'لم يتم ذكره نهائياً في سياسة الخصوصية.';
  }

  // Extract evidence if found
  const evidence = firstMatchedKeyword 
    ? extractEvidence(policyText, firstMatchedKeyword, 200)
    : '';

  return {
    id: element.id,
    number: element.number,
    nameAr: element.nameAr,
    nameEn: element.nameEn,
    status,
    statusEn,
    evidence,
    notes,
    matchCount,
    matchedKeywords,
  };
}

export function auditPrivacyPolicy(policyText: string): PrivacyPolicyAudit {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`[PrivacyPolicyChecker] بدء فحص سياسة الخصوصية - 12 عنصر إلزامي`);
  console.log(`${'='.repeat(70)}`);
  
  if (!policyText || policyText.trim().length < 50) {
    console.log(`[PrivacyPolicyChecker] ⚠️ نص السياسة فارغ أو قصير جداً`);
    return {
      elementsFound: 0,
      elementsPartial: 0,
      elementsMissing: 12,
      elements: PRIVACY_POLICY_ELEMENTS.map(el => ({
        id: el.id,
        number: el.number,
        nameAr: el.nameAr,
        nameEn: el.nameEn,
        status: 'غير موجود' as const,
        statusEn: 'MISSING' as const,
        evidence: '',
        notes: 'لم يتم العثور على سياسة خصوصية',
        matchCount: 0,
        matchedKeywords: [],
      })),
      compliancePercentage: 0,
      isComplete: false,
      summary: 'لا توجد سياسة خصوصية أو النص قصير جداً',
    };
  }

  console.log(`[PrivacyPolicyChecker] طول نص السياسة: ${policyText.length} حرف`);
  console.log(`[PrivacyPolicyChecker] فحص كل عنصر من العناصر الـ 12:`);
  console.log(`${'─'.repeat(70)}`);

  const elements = PRIVACY_POLICY_ELEMENTS.map(el => {
    const result = checkElement(policyText, el);
    
    // Log each element check
    const statusIcon = result.statusEn === 'FOUND' ? '✓' : result.statusEn === 'PARTIAL' ? '~' : '✗';
    console.log(`[${result.number}] ${result.nameAr}`);
    console.log(`    الحالة: ${statusIcon} ${result.status} (${result.matchCount} مطابقات)`);
    if (result.matchedKeywords.length > 0) {
      console.log(`    الكلمات المطابقة: [${result.matchedKeywords.slice(0, 5).join(', ')}${result.matchedKeywords.length > 5 ? '...' : ''}]`);
    }
    if (result.evidence) {
      console.log(`    الدليل: "${result.evidence.substring(0, 100)}..."`);
    }
    if (result.notes && result.statusEn !== 'FOUND') {
      console.log(`    ملاحظة: ${result.notes}`);
    }
    console.log('');
    
    return result;
  });

  const elementsFound = elements.filter(e => e.statusEn === 'FOUND').length;
  const elementsPartial = elements.filter(e => e.statusEn === 'PARTIAL').length;
  const elementsMissing = elements.filter(e => e.statusEn === 'MISSING').length;

  // Policy is complete ONLY if ALL 12 elements are fully present
  const isComplete = elementsFound === 12;

  // Compliance calculation
  const totalScore = elementsFound * 100 + elementsPartial * 50;
  const compliancePercentage = Math.round((totalScore / (12 * 100)) * 100);

  // Generate summary
  let summary = '';
  if (isComplete) {
    summary = 'سياسة الخصوصية مكتملة - جميع العناصر الـ 12 موجودة بوضوح';
  } else {
    const missingElements = elements.filter(e => e.statusEn === 'MISSING').map(e => e.nameAr);
    const partialElements = elements.filter(e => e.statusEn === 'PARTIAL').map(e => e.nameAr);
    
    summary = 'سياسة الخصوصية غير مكتملة.\n';
    if (missingElements.length > 0) {
      summary += `العناصر الغائبة (${missingElements.length}): ${missingElements.join('، ')}\n`;
    }
    if (partialElements.length > 0) {
      summary += `العناصر الناقصة (${partialElements.length}): ${partialElements.join('، ')}`;
    }
  }

  console.log(`${'─'.repeat(70)}`);
  console.log(`[PrivacyPolicyChecker] ========== ملخص الفحص ==========`);
  console.log(`[PrivacyPolicyChecker] موجود بالكامل: ${elementsFound}/12`);
  console.log(`[PrivacyPolicyChecker] ناقص أو غير واضح: ${elementsPartial}/12`);
  console.log(`[PrivacyPolicyChecker] غير موجود: ${elementsMissing}/12`);
  console.log(`[PrivacyPolicyChecker] نسبة الامتثال: ${compliancePercentage}%`);
  console.log(`[PrivacyPolicyChecker] السياسة مكتملة؟ ${isComplete ? 'نعم ✓' : 'لا ✗'}`);
  console.log(`${'='.repeat(70)}\n`);

  return {
    elementsFound,
    elementsPartial,
    elementsMissing,
    elements,
    compliancePercentage,
    isComplete,
    summary,
  };
}
