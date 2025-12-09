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
  hideFromUI?: boolean; // If true, hide this element from frontend display
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

// The EXACT 12 elements required for PDPL compliance
const PRIVACY_POLICY_ELEMENTS = [
  {
    id: 'element_1',
    number: 1,
    nameAr: 'بيانات التواصل الخاصة بالجهة',
    nameEn: 'Entity contact information',
    keywordsAr: ['اتصل بنا', 'للتواصل معنا', 'بيانات التواصل معنا', 'بريدنا الإلكتروني', 'رقمنا', 'عنوان الشركة', 'رقم التواصل', 'الاتصال بنا', 'تواصل معنا على', 'راسلنا على', 'يمكنك التواصل', 'للاستفسار', 'للمزيد من المعلومات تواصل', 'مركز الاتصال', 'خدمة العملاء', 'بوابة العملاء', 'منصة التواصل'],
    keywordsEn: ['contact us at', 'reach us at', 'our email', 'our phone', 'our address', 'get in touch at', 'contact details', 'you can reach us', 'for inquiries contact'],
    strictPatterns: ['@', '.com', '.sa', '.gov', '+966', '920', '800', '199', '19'],
    hideFromUI: false,
  },
  {
    id: 'element_2',
    number: 2,
    nameAr: 'تاريخ آخر تحديث لسياسة الخصوصية',
    hideFromUI: false,
    nameEn: 'Last update date of privacy policy',
    keywordsAr: ['تاريخ التحديث', 'آخر تحديث', 'التحديث الأخير', 'تم التحديث', 'تاريخ النشر', 'تاريخ المراجعة', 'النسخة', 'تحديث السياسة', 'آخر مراجعة', 'تاريخ السريان', 'تاريخ الإصدار', 'محدثة في', 'تاريخ الاصدار', 'تاريخ النفاذ', 'سارية المفعول', 'تم إصدار', 'صدر بتاريخ', 'اعتباراً من', 'يسري اعتباراً', 'تم اعتماد', 'تاريخ هذا الإشعار', 'إصدار السياسة', 'تحديث الإشعار', 'تاريخ التعديل', 'آخر تعديل', 'تم تعديل', 'تاريخ آخر تعديل'],
    keywordsEn: ['last updated', 'updated on', 'revision date', 'effective date', 'date of update', 'version', 'last modified', 'published on', 'date of revision', 'effective from', 'issued on', 'policy version', 'notice date'],
  },
  {
    id: 'element_3',
    number: 3,
    nameAr: 'ماهي البيانات الشخصية التي يتم جمعها',
    nameEn: 'What personal data is collected',
    // Look for data type listings
    keywordsAr: ['البيانات التي نجمعها', 'نجمع البيانات', 'بيانات الاتصال', 'البيانات الشخصية', 'المعلومات التي نجمعها', 'كالاسم', 'بيانات الهوية', 'عنوان IP', 'الكوكيز', 'ملفات تعريف الارتباط', 'بما في ذلك', 'معلوماتك الشخصية', 'بياناتك الشخصية'],
    keywordsEn: ['data we collect', 'we collect', 'types of data', 'personal data', 'information we collect', 'including your', 'such as name', 'identity data', 'technical data', 'IP address', 'cookies'],
  },
  {
    id: 'element_4',
    number: 4,
    nameAr: 'كيف يتم جمع البيانات الشخصية وما هو الغرض من جمعها',
    nameEn: 'How data is collected and purpose of collection',
    // Purpose and collection method
    keywordsAr: ['بغرض', 'لغرض', 'الغرض من', 'نجمع بياناتك', 'للأغراض التالية', 'الهدف من', 'سبب الجمع', 'نحصل على', 'يتم جمعها', 'طريقة الجمع', 'كيفية جمع', 'مصادر البيانات', 'عند التسجيل', 'عند الشراء'],
    keywordsEn: ['for the purpose', 'purpose of', 'purposes', 'we collect your', 'why we collect', 'how we collect', 'collection method', 'sources of data', 'when you register', 'when you purchase'],
  },
  {
    id: 'element_5',
    number: 5,
    nameAr: 'كيفية استخدام البيانات الشخصية',
    nameEn: 'How personal data is used',
    // Data usage statements
    keywordsAr: ['نستخدم', 'تستخدم', 'استخدام البيانات', 'نستخدم هذه المعلومات', 'نستخدم بياناتك', 'تستخدم المعلومات', 'نعالج', 'معالجة البيانات', 'نستفيد من', 'استخدام المعلومات', 'تستخدم جميع', 'نستخدم هذه', 'ماذا نفعل'],
    keywordsEn: ['we use', 'how we use', 'use of data', 'we use your data', 'data usage', 'processing', 'we process', 'used for', 'using your information', 'what we do with'],
  },
  {
    id: 'element_6',
    number: 6,
    nameAr: 'كيفية الإفصاح عن البيانات الشخصية (مع من يتم مشاركتها)',
    nameEn: 'How data is disclosed and with whom it is shared',
    // Sharing and disclosure - includes government terminology
    keywordsAr: ['نقوم بمشاركة', 'مشاركة بياناتك', 'نشارك', 'أطراف ثالثة', 'طرف ثالث', 'مزودي الخدمة', 'الشركاء', 'جهات خارجية', 'نفصح عن', 'مشاركة المعلومات', 'المستلمين', 'الإفصاح عن', 'نكشف عن', 'شركاء', 'إتاحة البيانات', 'إطلاع الجهات', 'تمكين الجهات', 'الجهات المختصة', 'الجهات المعنية', 'الجهات الحكومية', 'الجهات ذات العلاقة', 'نقل البيانات', 'تبادل البيانات', 'إفشاء', 'الكشف عن', 'مشاركة البيانات مع'],
    keywordsEn: ['we share', 'share your data', 'disclosure', 'third parties', 'third party', 'service providers', 'partners', 'external parties', 'we disclose', 'recipients', 'shared with', 'transfer data', 'data sharing'],
  },
  {
    id: 'element_7',
    number: 7,
    nameAr: 'المسوغات النظامية لجمع ومعالجة البيانات الشخصية',
    nameEn: 'Legal basis for collecting and processing personal data',
    keywordsAr: ['المسوغ النظامي', 'الأساس القانوني', 'المسوغات النظامية', 'الموافقة', 'العقد', 'الالتزام القانوني', 'المصلحة المشروعة', 'أساس قانوني', 'سند نظامي', 'المادة', 'نظام حماية البيانات', 'PDPL', 'الأسس النظامية', 'الأحكام النظامية', 'وفقاً للنظام', 'بموجب النظام', 'النظام الأساسي', 'الإطار النظامي', 'السند النظامي', 'الأساس النظامي'],
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
    keywordsAr: ['مسؤول حماية البيانات', 'DPO', 'ضابط حماية البيانات', 'مسؤول الخصوصية', 'المسؤول عن حماية', 'التواصل مع مسؤول', 'مسؤول البيانات', 'مسؤول الحماية', 'مكتب إدارة البيانات', 'إدارة البيانات الوطنية', 'مكتب البيانات', 'فريق حماية البيانات', 'قسم حماية البيانات', 'وحدة حماية البيانات', 'إدارة حماية البيانات', 'المسؤول عن البيانات'],
    keywordsEn: ['data protection officer', 'DPO', 'privacy officer', 'data officer', 'protection officer', 'contact DPO', 'officer responsible', 'data management office', 'data office', 'data team', 'privacy team'],
  },
  {
    id: 'element_11',
    number: 11,
    nameAr: 'كيفية تقديم شكوى أو اعتراض',
    nameEn: 'How to file a complaint or objection',
    keywordsAr: ['تقديم شكوى', 'الشكاوى', 'اعتراض', 'تقديم اعتراض', 'آلية الشكوى', 'الاعتراض على', 'رفع شكوى', 'إرسال شكوى', 'طريقة الشكوى', 'للشكاوى', 'شكوى', 'التظلمات', 'التظلم', 'مركز العناية', 'خدمة العملاء', 'الدعم الفني', 'قنوات التواصل', 'تقديم بلاغ', 'البلاغات', 'الاستفسارات والشكاوى'],
    keywordsEn: ['file a complaint', 'complaint', 'objection', 'lodge complaint', 'submit complaint', 'complaints mechanism', 'how to complain', 'raise objection', 'complaints procedure', 'grievance', 'customer service', 'support center'],
  },
  {
    id: 'element_12',
    number: 12,
    nameAr: 'عنوان الهيئة السعودية للبيانات والذكاء الاصطناعي (سدايا) كجهة تنظيمية',
    nameEn: 'SDAIA (Saudi Data & AI Authority) address as regulatory body',
    keywordsAr: ['سدايا', 'SDAIA', 'الهيئة السعودية للبيانات', 'الهيئة السعودية للذكاء الاصطناعي', 'الجهة التنظيمية', 'الجهة الرقابية', 'هيئة البيانات', 'sdaia.gov.sa', 'الهيئة المختصة', 'مكتب إدارة البيانات الوطنية', 'NDMO', 'ndmo', 'إدارة البيانات الوطنية', 'سياسات حوكمة البيانات الوطنية'],
    keywordsEn: ['SDAIA', 'Saudi Data', 'Saudi AI Authority', 'data authority', 'regulatory authority', 'supervisory authority', 'data protection authority', 'sdaia.gov.sa', 'NDMO', 'national data management'],
  },
];

function checkElement(policyText: string, element: any): PolicyElementCheck {
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
  
  // Special handling for element 1 (contact info) - requires ACTUAL contact details
  // Not just mentions of data types like "email" or "phone"
  if (element.id === 'element_1' && element.strictPatterns) {
    // Extract actual contact evidence
    const emailMatch = policyText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    const phoneMatch = policyText.match(/(\+966|920|800|199|19\d{7}|0\d{9})/);
    
    const hasActualContact = element.strictPatterns.some((pattern: string) => 
      policyText.toLowerCase().includes(pattern.toLowerCase())
    );
    
    if (!hasActualContact) {
      // No actual contact info found (email, phone, etc.)
      return {
        id: element.id,
        number: element.number,
        nameAr: element.nameAr,
        nameEn: element.nameEn,
        status: 'غير موجود',
        statusEn: 'MISSING',
        evidence: '',
        notes: 'لا توجد معلومات اتصال فعلية (بريد إلكتروني، رقم هاتف، عنوان). يجب توفير بيانات تواصل حقيقية.',
        matchCount: 0,
        matchedKeywords: [],
        hideFromUI: element.hideFromUI === true,
      };
    }
    
    // If we found actual contact details, mark as FOUND even without keyword matches
    // This fixes false negatives for sites that provide contact info without context keywords
    if (hasActualContact && matchCount === 0) {
      const contactEvidence = emailMatch ? emailMatch[0] : (phoneMatch ? phoneMatch[0] : '');
      return {
        id: element.id,
        number: element.number,
        nameAr: element.nameAr,
        nameEn: element.nameEn,
        status: 'موجود بالكامل',
        statusEn: 'FOUND',
        evidence: contactEvidence ? `بيانات التواصل: ${contactEvidence}` : 'تم العثور على بيانات تواصل',
        notes: '',
        matchCount: 1,
        matchedKeywords: contactEvidence ? [contactEvidence] : ['contact detected'],
        hideFromUI: element.hideFromUI === true,
      };
    }
  }
  
  // EVALUATION THRESHOLDS - adjusted for Arabic policy patterns:
  // 1+ keyword matches = موجود بالكامل (FOUND) - element present with clear statement
  // 0 matches = غير موجود (MISSING) - not present
  // Note: Lowered from 2 to 1 because formal Arabic policies often state each concept once clearly
  let status: 'موجود بالكامل' | 'ناقص أو غير واضح' | 'غير موجود';
  let statusEn: 'FOUND' | 'PARTIAL' | 'MISSING';
  let notes = '';

  if (matchCount >= 1) {
    status = 'موجود بالكامل';
    statusEn = 'FOUND';
    notes = '';
  } else {
    // Special handling for Element 10 (DPO) - if no DPO mentioned but has privacy contact email
    if (element.id === 'element_10') {
      // Check for privacy-related contact patterns
      const privacyContactPatterns = [
        'privacy@', 'خصوصية@', 'dataprotection@', 'dpo@', 'gdpr@', 'pdpl@',
        'للتواصل بخصوص', 'للاستفسار عن الخصوصية', 'استفسارات الخصوصية',
        'أسئلة حول الخصوصية', 'تواصل معنا بشأن', 'للتواصل معنا',
        'يمكنك التواصل', 'راسلنا على', 'للمزيد من المعلومات',
        'بيانات التواصل', 'اتصل بنا', 'contact us', 'reach us'
      ];
      
      const hasPrivacyContact = privacyContactPatterns.some(pattern => 
        normalizedPolicy.includes(normalizeText(pattern))
      );
      
      // Also check for any email pattern combined with privacy context
      const hasEmailWithPrivacyContext = 
        (policyText.includes('@') && 
         (normalizedPolicy.includes('خصوصية') || 
          normalizedPolicy.includes('privacy') ||
          normalizedPolicy.includes('بيانات') ||
          normalizedPolicy.includes('data')));
      
      if (hasPrivacyContact || hasEmailWithPrivacyContext) {
        status = 'ناقص أو غير واضح';
        statusEn = 'PARTIAL';
        notes = 'يوجد بريد إلكتروني للتواصل بخصوص الخصوصية ولكن لم يُذكر مسؤول حماية البيانات (DPO) بشكل صريح.';
      } else {
        status = 'غير موجود';
        statusEn = 'MISSING';
        notes = 'لم يتم ذكر مسؤول حماية البيانات ولا يوجد بريد إلكتروني للتواصل بخصوص الخصوصية.';
      }
    } else {
      status = 'غير موجود';
      statusEn = 'MISSING';
      notes = 'لم يتم ذكره نهائياً في سياسة الخصوصية.';
    }
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
    hideFromUI: element.hideFromUI === true,
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
        hideFromUI: (el as any).hideFromUI === true,
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
