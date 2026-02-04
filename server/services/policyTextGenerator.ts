export interface PolicyFormData {
  company_name: string;
  activity_type?: string;
  service_description: string;
  contact_team?: string;
  address: string;
  phone: string;
  email: string;
  cr_number: string;
  policy_last_update: string;
  data_collected: string[];
  collection_methods_direct: string[];
  collection_methods_indirect: string[];
  collection_purposes: string[];
  data_usage_purposes: string[];
  legal_bases: string[];
  legal_bases_explanations: Record<string, string>;
  disclosure_parties: string[];
  storage_location: string;
  retention_period: string;
  retention_purpose?: string;
  retention_years?: number;
  retention_custom_text?: string;
  destruction_method: string;
  destruction_custom?: string;
  rights_exercise_method: string;
  rights_contact_details?: string; // Specific contact for rights requests (email/phone)
  response_days: number;
  has_dpo: boolean;
  dpo_name?: string;
  dpo_address?: string;
  dpo_phone?: string;
  dpo_email?: string;
  complaint_contact: string;
  complaint_contact_details?: string; // Specific contact for complaints (email/phone)
  complaint_response_days: number;
}

const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  ecommerce: 'تجارة إلكترونية',
  fintech: 'تقنية مالية',
  health: 'خدمات صحية',
  education: 'خدمات تعليمية',
  technology: 'تقنية المعلومات',
  retail: 'تجزئة',
  other: 'أخرى',
};

const DATA_TYPE_LABELS: Record<string, string> = {
  account_data: 'بيانات الحساب (الاسم، رقم التعريف الشخصي، العناوين، أرقام الاتصال)',
  payment_data: 'بيانات الدفع (رقم البطاقة البنكية، مبالغ الدفع)',
  third_party_data: 'بيانات يتم الحصول عليها من أطراف أخرى',
  cookie_data: 'بيانات ملفات تعريف الارتباط "الكوكيز" (البيانات المجمعة عبر تقنيات التتبع)',
  location_data: 'بيانات تحديد الموقع',
  contact_data: 'بيانات التواصل (البريد الإلكتروني، أرقام الهاتف)',
  financial_data: 'بيانات مالية (معلومات الحسابات البنكية)',
  sensitive_data: 'بيانات حساسة أو صحية',
};

const DIRECT_METHOD_LABELS: Record<string, string> = {
  electronic_forms: 'النماذج الإلكترونية (الحقول الفارغة، القوائم المنسدلة، أزرار الاختيار)',
  registration: 'التسجيل وإنشاء الحساب',
  customer_service: 'التواصل مع خدمة العملاء',
  surveys: 'الاستبيانات واستطلاعات الرأي',
};

const INDIRECT_METHOD_LABELS: Record<string, string> = {
  cookies: 'ملفات تعريف الارتباط "الكوكيز"',
  analytics: 'تحليلات مواقع الويب',
  automatic_collection: 'الجمع التلقائي للمعلومات (عناوين IP، بيانات الجهاز)',
  third_party_integration: 'الربط البيني مع جهات أخرى',
};

const PURPOSE_LABELS: Record<string, string> = {
  service_delivery: 'تقديم الخدمات المطلوبة',
  account_management: 'إنشاء وإدارة حسابات المستخدمين',
  payment_processing: 'إتمام عمليات الدفع والفوترة',
  communication: 'إرسال الإشعارات والتحديثات',
  improvement: 'تطوير وتحسين تجربة المستخدم',
  analytics: 'فهم سلوك المستخدم واتجاهات الاستخدام',
  legal_compliance: 'الالتزام بالمتطلبات النظامية',
  security: 'حماية الحسابات ومنع الاحتيال',
  marketing: 'إرسال العروض والحملات التسويقية',
};

const USAGE_LABELS: Record<string, string> = {
  verify_identity: 'التحقق من هوية المستخدم',
  provide_service: 'تقديم الخدمات المطلوبة',
  process_payments: 'معالجة المدفوعات',
  send_notifications: 'إرسال الإشعارات والتحديثات',
  improve_experience: 'تحسين تجربة المستخدم',
  analyze_usage: 'تحليل أنماط الاستخدام',
  comply_with_law: 'الامتثال للمتطلبات النظامية',
  prevent_fraud: 'منع الاحتيال وحماية الأمان',
  customer_support: 'تقديم الدعم الفني',
  personalization: 'تخصيص المحتوى والتوصيات',
};

const DISCLOSURE_LABELS: Record<string, string> = {
  no_disclosure: 'لن نفصح عن بياناتك الشخصية لأي طرف آخر لأغراض التسويق المباشر',
  service_providers: 'مزودو الخدمات الذين يساعدوننا في تقديم خدماتنا',
  payment_processors: 'معالجو المدفوعات وشركات الدفع الإلكتروني',
  cloud_providers: 'مزودو خدمات الحوسبة السحابية والاستضافة',
  analytics_providers: 'مزودو خدمات التحليلات',
  government_entities: 'الجهات الحكومية عند الطلب وفقاً للأنظمة المعمول بها',
  business_partners: 'الشركاء التجاريون',
};

const STORAGE_LABELS: Record<string, string> = {
  inside_ksa: 'داخل المملكة العربية السعودية',
  outside_ksa: 'خارج المملكة العربية السعودية',
  both: 'داخل وخارج المملكة العربية السعودية',
};

const DESTRUCTION_LABELS: Record<string, string> = {
  secure_deletion: 'الحذف الآمن بطريقة لا يمكن من خلالها استعادة البيانات',
  overwriting: 'الكتابة فوق البيانات ببيانات عشوائية',
  physical_destruction: 'الإتلاف المادي لوسائط التخزين',
  encryption_key_deletion: 'حذف مفاتيح التشفير',
  anonymization: 'إخفاء الهوية وتحويل البيانات لبيانات مجهولة',
  custom: 'طريقة أخرى',
};

const RIGHTS_METHOD_LABELS: Record<string, string> = {
  email: 'البريد الإلكتروني',
  online_portal: 'البوابة الإلكترونية',
  customer_service: 'خدمة العملاء',
  mobile_app: 'التطبيق الإلكتروني',
  written_request: 'طلب خطي',
};

const COMPLAINT_CONTACT_LABELS: Record<string, string> = {
  customer_service: 'خدمة العملاء',
  dpo: 'مسؤول حماية البيانات الشخصية',
  legal: 'الإدارة القانونية',
  compliance: 'إدارة الامتثال',
  management: 'الإدارة العليا',
};

function formatRetentionPeriod(period: string, years?: number, purpose?: string): string {
  switch (period) {
    case 'until_purpose':
      return purpose 
        ? `حتى انتهاء الغرض من جمعها (${purpose})`
        : 'حتى انتهاء الغرض من جمعها';
    case 'custom':
      return years ? `${years} ${years === 1 ? 'سنة' : years === 2 ? 'سنتين' : 'سنوات'}` : 'مدة محددة';
    default:
      return period;
  }
}

interface LegalBasesContext {
  contactTeam: string;
  email: string;
  phone: string;
  hasDpo: boolean;
  dpoName?: string;
  dpoEmail?: string;
}

function generateLegalBasesHtml(legalBases: string[], explanations: Record<string, string>, context: LegalBasesContext): string {
  const items: string[] = [];
  
  const contactPerson = context.hasDpo && context.dpoName 
    ? `مسؤول حماية البيانات الشخصية (${context.dpoName})` 
    : context.contactTeam;
  
  const contactDetails = context.hasDpo && context.dpoEmail 
    ? `عبر البريد الإلكتروني: ${context.dpoEmail}` 
    : `عبر البريد الإلكتروني: ${context.email} أو الاتصال على: ${context.phone}`;
  
  for (const basis of legalBases) {
    let text = '';
    switch (basis) {
      case 'explicit_consent':
        text = `موافقتك الصريحة، ويمكنك العدول عن الموافقة في أي وقت على ألا يؤثر على عمليات المعالجة التي تتم بناءً على مسوغات نظامية أخرى`;
        break;
      case 'contractual_obligation':
        text = `تنفيذاً لالتزام تعاقدي: ${explanations[basis] || 'تنفيذ العقد المبرم معك'}`;
        break;
      case 'legal_obligation':
        text = `تنفيذاً لالتزام نظامي: ${explanations[basis] || 'الامتثال للأنظمة واللوائح المعمول بها'}`;
        break;
      case 'vital_interests':
        text = `حماية المصالح الحيوية: ${explanations[basis] || 'حماية مصالحك الحيوية أو مصالح شخص آخر'}`;
        break;
      case 'public_interest':
        text = `تحقيق مصلحة عامة: ${explanations[basis] || 'تحقيق مصلحة عامة وفقاً للأنظمة'}`;
        break;
      case 'legitimate_interests':
        text = `تحقيق مصالح أو أهداف مشروعة: ${explanations[basis] || 'تحقيق أهداف مشروعة لا تتعارض مع حقوقك'}`;
        break;
    }
    if (text) {
      items.push(`<li>${text}</li>`);
    }
  }
  
  return items.join('\n');
}

export function generatePolicyHtml(data: PolicyFormData): string {
  const updateDate = data.policy_last_update || new Date().toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  const contactTeam = data.contact_team || 'خدمة العملاء';
  const rightsMethod = RIGHTS_METHOD_LABELS[data.rights_exercise_method] || data.rights_exercise_method;
  const destructionMethod = data.destruction_method === 'custom' && data.destruction_custom 
    ? data.destruction_custom 
    : (DESTRUCTION_LABELS[data.destruction_method] || data.destruction_method);

  const legalBasesContext: LegalBasesContext = {
    contactTeam,
    email: data.email,
    phone: data.phone,
    hasDpo: data.has_dpo,
    dpoName: data.dpo_name,
    dpoEmail: data.dpo_email,
  };

  const dataCollectedItems = data.data_collected
    .map(id => DATA_TYPE_LABELS[id] || id)
    .map(label => `<li>${label}</li>`)
    .join('\n');

  const directMethodItems = data.collection_methods_direct.length > 0
    ? data.collection_methods_direct
        .map(id => DIRECT_METHOD_LABELS[id] || id)
        .map(label => `<li>${label}</li>`)
        .join('\n')
    : '<li>النماذج الإلكترونية</li>';

  const indirectMethodItems = data.collection_methods_indirect.length > 0
    ? data.collection_methods_indirect
        .map(id => INDIRECT_METHOD_LABELS[id] || id)
        .map(label => `<li>${label}</li>`)
        .join('\n')
    : '';

  const purposeItems = data.collection_purposes
    .map(id => PURPOSE_LABELS[id] || id)
    .map(label => `<li>${label}</li>`)
    .join('\n');

  const usageItems = data.data_usage_purposes
    .map(id => USAGE_LABELS[id] || id)
    .map(label => `<li>${label}</li>`)
    .join('\n');

  let disclosureHtml = '';
  if (data.disclosure_parties.includes('no_disclosure')) {
    disclosureHtml = '<p>لن نفصح عن بياناتك الشخصية لأي طرف آخر لأغراض التسويق المباشر.</p>';
  } else if (data.disclosure_parties.length > 0) {
    const disclosureItems = data.disclosure_parties
      .filter(p => p !== 'no_disclosure')
      .map(id => DISCLOSURE_LABELS[id] || id)
      .map(label => `<li>${label}</li>`)
      .join('\n');
    disclosureHtml = `<p>قد نفصح عن بياناتك الشخصية مع الجهات الآتية:</p>\n<ul>\n${disclosureItems}\n</ul>`;
  }

  const storageLocationText = STORAGE_LABELS[data.storage_location] || data.storage_location;
  const retentionText = formatRetentionPeriod(data.retention_period, data.retention_years, data.retention_purpose);

  const crossBorderSection = (data.storage_location === 'outside_ksa' || data.storage_location === 'both') ? `
<h2>نقل البيانات خارج المملكة</h2>
<p>قد يتم نقل بياناتك الشخصية إلى خوادم خارج المملكة العربية السعودية. نلتزم في هذه الحالة بما يلي وفقاً للمادة ٢٩ من نظام حماية البيانات الشخصية:</p>
<ul>
<li>التأكد من توفر مستوى حماية مناسب للبيانات في الدولة المستقبلة</li>
<li>الحصول على الموافقة المسبقة من الهيئة السعودية للبيانات والذكاء الاصطناعي عند الحاجة</li>
<li>تطبيق الضمانات المناسبة لحماية البيانات أثناء النقل</li>
</ul>
` : '';

  const dpoSection = data.has_dpo && data.dpo_name ? `
<h2>مسؤول حماية البيانات الشخصية</h2>
<p>عيّنا مسؤولاً لحماية البيانات الشخصية يمكنك التواصل معه لأي استفسارات:</p>
<ul>
<li><strong>الاسم:</strong> ${data.dpo_name}</li>
${data.dpo_address ? `<li><strong>العنوان:</strong> ${data.dpo_address}</li>` : ''}
${data.dpo_phone ? `<li><strong>رقم الهاتف:</strong> ${data.dpo_phone}</li>` : ''}
${data.dpo_email ? `<li><strong>البريد الإلكتروني:</strong> ${data.dpo_email}</li>` : ''}
</ul>
` : '';

  const activityTypeLabel = data.activity_type ? (ACTIVITY_TYPE_LABELS[data.activity_type] || data.activity_type) : '';
  
  const policyContent = `
<h2>${data.company_name}</h2>
${activityTypeLabel ? `<p><strong>نوع النشاط:</strong> ${activityTypeLabel}</p>` : ''}
<p>${data.service_description}، ويمكنك التواصل معنا، عن طريق عدد من القنوات المتاحة، حسب بيانات التواصل الموضحة أدناه.</p>

<h2>بيانات التواصل</h2>
<ul>
<li><strong>القسم/ الفريق المختص:</strong> ${contactTeam}</li>
<li><strong>العنوان:</strong> ${data.address}</li>
<li><strong>رقم الهاتف:</strong> ${data.phone}</li>
<li><strong>البريد الإلكتروني:</strong> ${data.email}</li>
<li><strong>الترخيص أو السجل التجاري:</strong> ${data.cr_number}</li>
</ul>

<h2>تاريخ آخر تحديث</h2>
<p>تم إجراء آخر تحديث على سياسة الخصوصية بتاريخ ${updateDate}.</p>

<h2>ما هي البيانات الشخصية التي يتم جمعها؟</h2>
<p>نقوم بجمع ومعالجة البيانات الشخصية التالية:</p>
<ul>
${dataCollectedItems}
</ul>

<h2>كيف يتم جمع بياناتك الشخصية وما هو الغرض من جمعها؟</h2>
<p>بعض البيانات الشخصية التي نقوم بمعالجتها يتم الحصول عليها عن طريقك مباشرة باستخدام الوسائل التالية:</p>
<ul>
${directMethodItems}
</ul>

<p>وذلك للأغراض الآتية:</p>
<ul>
${purposeItems}
</ul>

${data.collection_methods_indirect.length > 0 ? `
<p>كما نقوم بالحصول على بعض البيانات الشخصية بطريقة غير مباشرة، من المصادر الآتية:</p>
<ul>
${indirectMethodItems}
</ul>
` : '<p>لا نقوم بجمع بيانات بطريقة غير مباشرة.</p>'}

<h2>كيف نستخدم بياناتك الشخصية؟</h2>
<p>نستخدم البيانات الشخصية التي تم جمعها بشكل مباشر أو غير مباشر على النحو الآتي:</p>
<ul>
${usageItems}
</ul>

<h2>كيف نفصح عن بياناتك الشخصية؟</h2>
${disclosureHtml}

<h2>المسوغات النظامية لجمع ومعالجة بياناتك الشخصية</h2>
<p>وفقاً لنظام حماية البيانات الشخصية، فإن المسوغ النظامي الذي نعتمد عليه لمعالجة هذه البيانات:</p>
<ul>
${generateLegalBasesHtml(data.legal_bases, data.legal_bases_explanations, legalBasesContext)}
</ul>

<h2>كيف نقوم بتخزين بياناتك الشخصية؟</h2>
<p>يتم تخزين بياناتك الشخصية بشكل آمن وذلك ${storageLocationText}.</p>
<p>كما نحتفظ بالبيانات الشخصية لمدة ${retentionText}${data.retention_period === 'custom' ? '، ما لم تحدد الأنظمة واللوائح ذات الصلة والمتطلبات النظامية مدة احتفاظ أكثر من المدة المنصوص عليها' : ''}، وسنقوم بعد ذلك بالتخلص من هذه البيانات بطريقة آمنة لا يمكن من خلالها الاطلاع عليها أو استعادتها مرة أخرى، وذلك عن طريق ${destructionMethod}.</p>

${crossBorderSection}

<h2>حقوقك فيما يتعلق بمعالجة بياناتك الشخصية</h2>
<p>بموجب نظام حماية البيانات الشخصية، فإن لديك الحقوق الآتية، والتي تعتمد بشكل أساسي على الغرض من جمع ومعالجة البيانات الشخصية:</p>
<ul>
<li><strong>الحق في العلم:</strong> يحق لك معرفة طرق جمعنا لبياناتك الشخصية والمسوغ النظامي لجمعها ومعالجتها، وكيفية معالجتها وحفظها وإتلافها ولمن سيتم الإفصاح عنها. يمكنك الاطلاع على كافة التفاصيل من خلال سياسة الخصوصية هذه.</li>
<li><strong>الحق في الوصول إلى بياناتك الشخصية:</strong> يحق لك أن تطلب منا الاطلاع على بياناتك الشخصية، وذلك عن طريق ${rightsMethod}.</li>
<li><strong>الحق في طلب الحصول على بياناتك الشخصية:</strong> يحق لك طلب الحصول على بياناتك الشخصية المتوفرة لدى جهة التحكم بصيغة مقروءة وواضحة متى ما كان ذلك ممكناً من الناحية التقنية، وذلك عن طريق ${rightsMethod}.</li>
<li><strong>الحق في تصحيح بياناتك الشخصية:</strong> يحق لك أن تطلب منا تصحيح بياناتك الشخصية التي ترى أنها غير دقيقة أو غير صحيحة أو غير مكتملة، وذلك عن طريق ${rightsMethod}، وستتم مراجعتها وتحديثها خلال ${data.response_days} يوم.</li>
<li><strong>الحق في إتلاف بياناتك الشخصية:</strong> يحق لك أن تطلب منا إتلاف بياناتك الشخصية في ظروف معينة وفقاً للمسوغات النظامية.</li>
<li><strong>الحق في الرجوع عن موافقتك:</strong> يحق لك الرجوع عن موافقتك على معالجة بياناتك الشخصية -في أي وقت- ما لم تكن هناك مسوغات نظامية تتطلب عكس ذلك.</li>
</ul>
<p>ما عدا ما هو منصوص عليه نظاماً، لن تكون مطالباً بدفع أي رسوم مقابل ممارسة هذه الحقوق، وفي حال تم تقديم طلب لممارسة أحد هذه الحقوق، سيتم الرد عليك خلال ${data.response_days} يوم من تاريخ استلام الطلب كاملاً.</p>

<h3>كيفية ممارسة حقوقك</h3>
<p>لممارسة أي من حقوقك المذكورة أعلاه، يرجى التواصل معنا عبر:</p>
<ul>
${data.has_dpo && data.dpo_email ? `<li><strong>البريد الإلكتروني:</strong> ${data.dpo_email}</li>` : (data.rights_contact_details ? `<li><strong>البريد الإلكتروني:</strong> ${data.rights_contact_details}</li>` : `<li><strong>البريد الإلكتروني:</strong> ${data.email}</li>`)}
${data.has_dpo && data.dpo_phone ? `<li><strong>رقم الهاتف:</strong> ${data.dpo_phone}</li>` : (!data.rights_contact_details ? `<li><strong>رقم الهاتف:</strong> ${data.phone}</li>` : '')}
</ul>

${dpoSection}

<h2>كيف تقدم شكوى أو اعتراضاً؟</h2>
<p>في حال وجود أي مخاوف بشأن معالجة بياناتك الشخصية أو عدم التزامنا بنظام حماية البيانات الشخصية، يمكنك تقديم شكوى عبر الخطوات التالية:</p>

<h3>الخطوة الأولى: التواصل معنا</h3>
<p>يرجى التواصل مع: <strong>${COMPLAINT_CONTACT_LABELS[data.complaint_contact] || data.complaint_contact}</strong></p>
<ul>
${data.complaint_contact_details ? `<li><strong>البريد الإلكتروني:</strong> ${data.complaint_contact_details}</li>` : `<li><strong>البريد الإلكتروني:</strong> ${data.email}</li>`}
${(!data.complaint_contact_details && data.phone) ? `<li><strong>رقم الهاتف:</strong> ${data.phone}</li>` : ''}
</ul>
<p>سنقوم بالرد على شكواك خلال <strong>${data.complaint_response_days} يوم</strong> من تاريخ استلامها.</p>

<h3>الخطوة الثانية: التصعيد للجهة المختصة</h3>
<p>إذا لم تكن راضياً عن معالجتنا للشكوى أو في حال عدم ردنا خلال المدة المحددة، يحق لك تقديم شكوى إلى الهيئة السعودية للبيانات والذكاء الاصطناعي (سدايا).</p>

<h2>الهيئة السعودية للبيانات والذكاء الاصطناعي (سدايا)</h2>
<ul>
<li><strong>الموقع:</strong> المملكة العربية السعودية - الرياض</li>
<li><strong>الموقع الإلكتروني:</strong> <a href="https://sdaia.gov.sa" target="_blank">sdaia.gov.sa</a></li>
<li><strong>منصة حوكمة البيانات الوطنية:</strong> <a href="https://dgp.sdaia.gov.sa" target="_blank">dgp.sdaia.gov.sa</a></li>
</ul>
`;

  return policyContent;
}

export function generatePolicyText(data: PolicyFormData): string {
  const updateDate = data.policy_last_update || new Date().toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  const contactTeam = data.contact_team || 'خدمة العملاء';
  const dpoContact = data.has_dpo && data.dpo_name ? data.dpo_name : contactTeam;
  const rightsMethod = RIGHTS_METHOD_LABELS[data.rights_exercise_method] || data.rights_exercise_method;
  const destructionMethod = data.destruction_method === 'custom' && data.destruction_custom 
    ? data.destruction_custom 
    : (DESTRUCTION_LABELS[data.destruction_method] || data.destruction_method);

  const dataCollectedList = data.data_collected
    .map(id => DATA_TYPE_LABELS[id] || id)
    .map(label => `- ${label}`)
    .join('\n');

  const directMethodList = data.collection_methods_direct.length > 0
    ? data.collection_methods_direct
        .map(id => DIRECT_METHOD_LABELS[id] || id)
        .map(label => `- ${label}`)
        .join('\n')
    : '- النماذج الإلكترونية';

  const indirectMethodList = data.collection_methods_indirect.length > 0
    ? data.collection_methods_indirect
        .map(id => INDIRECT_METHOD_LABELS[id] || id)
        .map(label => `- ${label}`)
        .join('\n')
    : '';

  const purposeList = data.collection_purposes
    .map(id => PURPOSE_LABELS[id] || id)
    .map(label => `- ${label}`)
    .join('\n');

  const usageList = data.data_usage_purposes
    .map(id => USAGE_LABELS[id] || id)
    .map(label => `- ${label}`)
    .join('\n');

  let disclosureText = '';
  if (data.disclosure_parties.includes('no_disclosure')) {
    disclosureText = 'لن نفصح عن بياناتك الشخصية لأي طرف آخر لأغراض التسويق المباشر.';
  } else if (data.disclosure_parties.length > 0) {
    const disclosureList = data.disclosure_parties
      .filter(p => p !== 'no_disclosure')
      .map(id => DISCLOSURE_LABELS[id] || id)
      .map(label => `- ${label}`)
      .join('\n');
    disclosureText = `قد نفصح عن بياناتك الشخصية مع الجهات الآتية:\n${disclosureList}`;
  }

  const storageLocationText = STORAGE_LABELS[data.storage_location] || data.storage_location;
  const retentionText = formatRetentionPeriod(data.retention_period, data.retention_years, data.retention_purpose);

  const legalBasesList = data.legal_bases.map(basis => {
    switch (basis) {
      case 'explicit_consent':
        return `- موافقتك الصريحة، ويمكنك العدول عن الموافقة في أي وقت على ألا يؤثر على عمليات المعالجة التي تتم بناءً على مسوغات نظامية أخرى`;
      case 'contractual_obligation':
        return `- تنفيذاً لالتزام تعاقدي: ${data.legal_bases_explanations[basis] || 'تنفيذ العقد المبرم معك'}`;
      case 'legal_obligation':
        return `- تنفيذاً لالتزام نظامي: ${data.legal_bases_explanations[basis] || 'الامتثال للأنظمة واللوائح المعمول بها'}`;
      case 'vital_interests':
        return `- حماية المصالح الحيوية: ${data.legal_bases_explanations[basis] || 'حماية مصالحك الحيوية أو مصالح شخص آخر'}`;
      case 'public_interest':
        return `- تحقيق مصلحة عامة: ${data.legal_bases_explanations[basis] || 'تحقيق مصلحة عامة وفقاً للأنظمة'}`;
      case 'legitimate_interests':
        return `- تحقيق مصالح أو أهداف مشروعة: ${data.legal_bases_explanations[basis] || 'تحقيق أهداف مشروعة لا تتعارض مع حقوقك'}`;
      default:
        return '';
    }
  }).filter(Boolean).join('\n');

  const dpoSection = data.has_dpo && data.dpo_name ? `
مسؤول حماية البيانات الشخصية

الاسم: ${data.dpo_name}
${data.dpo_address ? `العنوان: ${data.dpo_address}` : ''}
${data.dpo_phone ? `رقم الهاتف: ${data.dpo_phone}` : ''}
${data.dpo_email ? `البريد الإلكتروني: ${data.dpo_email}` : ''}
` : '';

  return `${data.company_name}

${data.service_description}، ويمكنك التواصل معنا، عن طريق عدد من القنوات المتاحة، حسب بيانات التواصل الموضحة أدناه.

بيانات التواصل

القسم/ الفريق المختص: ${contactTeam}
العنوان: ${data.address}
رقم الهاتف: ${data.phone}
البريد الإلكتروني: ${data.email}
الترخيص أو السجل التجاري: ${data.cr_number}

تاريخ آخر تحديث

تم إجراء آخر تحديث على سياسة الخصوصية بتاريخ ${updateDate}.

ما هي البيانات الشخصية التي يتم جمعها؟

نقوم بجمع ومعالجة البيانات الشخصية التالية:

${dataCollectedList}

كيف يتم جمع بياناتك الشخصية وما هو الغرض من جمعها؟

بعض البيانات الشخصية التي نقوم بمعالجتها يتم الحصول عليها عن طريقك مباشرة باستخدام الوسائل التالية:

${directMethodList}

وذلك للأغراض الآتية:

${purposeList}

${indirectMethodList ? `كما نقوم بالحصول على بعض البيانات الشخصية بطريقة غير مباشرة، من المصادر الآتية:

${indirectMethodList}` : 'لا نقوم بجمع بيانات بطريقة غير مباشرة.'}

كيف نستخدم بياناتك الشخصية؟

نستخدم البيانات الشخصية التي تم جمعها بشكل مباشر أو غير مباشر على النحو الآتي:

${usageList}

كيف نفصح عن بياناتك الشخصية؟

${disclosureText}

المسوغات النظامية لجمع ومعالجة بياناتك الشخصية

وفقاً لنظام حماية البيانات الشخصية، فإن المسوغ النظامي الذي نعتمد عليه لمعالجة هذه البيانات:

${legalBasesList}

كيف نقوم بتخزين بياناتك الشخصية؟

يتم تخزين بياناتك الشخصية بشكل آمن وذلك ${storageLocationText}.
كما نحتفظ بالبيانات الشخصية لمدة ${retentionText}${data.retention_period === 'custom' ? '، ما لم تحدد الأنظمة واللوائح ذات الصلة والمتطلبات النظامية مدة احتفاظ أكثر من المدة المنصوص عليها' : ''}، وسنقوم بعد ذلك بالتخلص من هذه البيانات بطريقة آمنة لا يمكن من خلالها الاطلاع عليها أو استعادتها مرة أخرى، وذلك عن طريق ${destructionMethod}.

حقوقك فيما يتعلق بمعالجة بياناتك الشخصية

بموجب نظام حماية البيانات الشخصية، فإن لديك الحقوق الآتية:

- الحق في العلم: يحق لك معرفة طرق جمعنا لبياناتك الشخصية والمسوغ النظامي لجمعها ومعالجتها. يمكنك الاطلاع على كافة التفاصيل من خلال سياسة الخصوصية هذه.
- الحق في الوصول إلى بياناتك الشخصية: يحق لك أن تطلب منا الاطلاع على بياناتك الشخصية، وذلك عن طريق ${rightsMethod}.
- الحق في طلب الحصول على بياناتك الشخصية: يحق لك طلب الحصول على بياناتك الشخصية بصيغة مقروءة وواضحة.
- الحق في تصحيح بياناتك الشخصية: يحق لك أن تطلب منا تصحيح بياناتك الشخصية، وستتم مراجعتها وتحديثها خلال ${data.response_days} يوم.
- الحق في إتلاف بياناتك الشخصية: يحق لك أن تطلب منا إتلاف بياناتك الشخصية في ظروف معينة.
- الحق في الرجوع عن موافقتك: يحق لك الرجوع عن موافقتك على معالجة بياناتك الشخصية في أي وقت.

كيفية ممارسة حقوقك:
لممارسة أي من حقوقك المذكورة أعلاه، يرجى التواصل معنا عبر:
${data.has_dpo && data.dpo_email ? `- البريد الإلكتروني: ${data.dpo_email}` : (data.rights_contact_details ? `- البريد الإلكتروني: ${data.rights_contact_details}` : `- البريد الإلكتروني: ${data.email}`)}
${data.has_dpo && data.dpo_phone ? `- رقم الهاتف: ${data.dpo_phone}` : (!data.rights_contact_details ? `- رقم الهاتف: ${data.phone}` : '')}

لن تكون مطالباً بدفع أي رسوم مقابل ممارسة هذه الحقوق، وسيتم الرد عليك خلال ${data.response_days} يوم من تاريخ استلام الطلب.
${dpoSection}
كيف تقدم شكوى أو اعتراضاً؟

في حال وجود أي مخاوف بشأن معالجة بياناتك الشخصية، يمكنك تقديم شكوى عبر الخطوات التالية:

الخطوة الأولى - التواصل معنا:
يرجى التواصل مع: ${COMPLAINT_CONTACT_LABELS[data.complaint_contact] || data.complaint_contact}
${data.complaint_contact_details ? `- البريد الإلكتروني: ${data.complaint_contact_details}` : `- البريد الإلكتروني: ${data.email}`}
${(!data.complaint_contact_details && data.phone) ? `- رقم الهاتف: ${data.phone}` : ''}
سنقوم بالرد على شكواك خلال ${data.complaint_response_days} يوم من تاريخ استلامها.

الخطوة الثانية - التصعيد للجهة المختصة:
إذا لم تكن راضياً عن معالجتنا للشكوى أو في حال عدم ردنا خلال المدة المحددة، يحق لك تقديم شكوى إلى الهيئة السعودية للبيانات والذكاء الاصطناعي (سدايا).

الهيئة السعودية للبيانات والذكاء الاصطناعي (سدايا)
المملكة العربية السعودية - الرياض
الموقع الإلكتروني: sdaia.gov.sa
منصة حوكمة البيانات الوطنية: dgp.sdaia.gov.sa`;
}
