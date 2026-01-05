export const DATA_TYPES = [
  { id: 'account_data', label: 'بيانات الحساب', description: 'الاسم، رقم التعريف، العناوين، أرقام الاتصال' },
  { id: 'payment_data', label: 'بيانات الدفع', description: 'رقم البطاقة البنكية، مبالغ الدفع' },
  { id: 'third_party_data', label: 'بيانات من أطراف أخرى', description: 'بيانات يتم الحصول عليها من مصادر خارجية' },
  { id: 'cookie_data', label: 'بيانات ملفات تعريف الارتباط', description: 'الكوكيز وتقنيات التتبع' },
  { id: 'location_data', label: 'بيانات تحديد الموقع', description: 'الموقع الجغرافي والإحداثيات' },
  { id: 'contact_data', label: 'بيانات التواصل', description: 'البريد الإلكتروني، أرقام الهاتف' },
  { id: 'financial_data', label: 'بيانات مالية', description: 'معلومات الحسابات البنكية' },
  { id: 'sensitive_data', label: 'بيانات حساسة', description: 'بيانات صحية أو بيومترية' },
] as const;

export const COLLECTION_METHODS = {
  direct: [
    { id: 'electronic_forms', label: 'نماذج إلكترونية', description: 'الحقول الفارغة والقوائم المنسدلة' },
    { id: 'registration', label: 'التسجيل وإنشاء الحساب', description: 'عند إنشاء حساب جديد' },
    { id: 'customer_service', label: 'خدمة العملاء', description: 'عند التواصل مع فريق الدعم' },
    { id: 'surveys', label: 'الاستبيانات', description: 'استطلاعات الرأي والتقييم' },
  ],
  indirect: [
    { id: 'cookies', label: 'ملفات تعريف الارتباط (الكوكيز)', description: 'تقنيات التتبع على الموقع' },
    { id: 'analytics', label: 'تحليلات الموقع', description: 'Google Analytics وأدوات مشابهة' },
    { id: 'automatic_collection', label: 'الجمع التلقائي', description: 'عناوين IP وبيانات الجهاز' },
    { id: 'third_party_integration', label: 'الربط مع جهات أخرى', description: 'مشاركة البيانات من منصات خارجية' },
  ],
} as const;

export const COLLECTION_PURPOSES = [
  { id: 'service_delivery', label: 'تقديم الخدمات', description: 'لتقديم الخدمة المطلوبة من المستخدم' },
  { id: 'account_management', label: 'إدارة الحساب', description: 'إنشاء وإدارة حسابات المستخدمين' },
  { id: 'payment_processing', label: 'معالجة المدفوعات', description: 'إتمام عمليات الدفع والفوترة' },
  { id: 'communication', label: 'التواصل', description: 'إرسال الإشعارات والتحديثات' },
  { id: 'improvement', label: 'تحسين الخدمات', description: 'تطوير وتحسين تجربة المستخدم' },
  { id: 'analytics', label: 'التحليلات', description: 'فهم سلوك المستخدم واتجاهات الاستخدام' },
  { id: 'legal_compliance', label: 'الامتثال القانوني', description: 'الالتزام بالمتطلبات النظامية' },
  { id: 'security', label: 'الأمان', description: 'حماية الحسابات ومنع الاحتيال' },
  { id: 'marketing', label: 'التسويق', description: 'إرسال العروض والحملات التسويقية' },
] as const;

export const DATA_USAGE_PURPOSES = [
  { id: 'verify_identity', label: 'التحقق من هوية المستخدم', description: '' },
  { id: 'provide_service', label: 'تقديم الخدمات المطلوبة', description: '' },
  { id: 'process_payments', label: 'معالجة المدفوعات', description: '' },
  { id: 'send_notifications', label: 'إرسال الإشعارات والتحديثات', description: '' },
  { id: 'improve_experience', label: 'تحسين تجربة المستخدم', description: '' },
  { id: 'analyze_usage', label: 'تحليل أنماط الاستخدام', description: '' },
  { id: 'comply_with_law', label: 'الامتثال للمتطلبات النظامية', description: '' },
  { id: 'prevent_fraud', label: 'منع الاحتيال وحماية الأمان', description: '' },
  { id: 'customer_support', label: 'تقديم الدعم الفني', description: '' },
  { id: 'personalization', label: 'تخصيص المحتوى والتوصيات', description: '' },
] as const;

export const LEGAL_BASES = [
  { 
    id: 'explicit_consent', 
    label: 'الموافقة الصريحة',
    description: 'موافقة صاحب البيانات',
    requiresExplanation: false,
    explanationPlaceholder: '',
    templateText: 'موافقتك الصريحة، ويمكنك العدول عن الموافقة في أي وقت على ألا يؤثر على عمليات المعالجة التي تتم بناءً على مسوغات نظامية أخرى، وللقيام بذلك يمكنك التواصل مع {contact}'
  },
  { 
    id: 'contractual_obligation', 
    label: 'التزام تعاقدي',
    description: 'تنفيذ التزام تعاقدي مع صاحب البيانات',
    requiresExplanation: true,
    explanationPlaceholder: 'وضّح الالتزام التعاقدي وأهمية الوفاء به',
    templateText: 'تنفيذاً لالتزام تعاقدي: {explanation}'
  },
  { 
    id: 'legal_obligation', 
    label: 'التزام نظامي',
    description: 'تنفيذ التزام منصوص عليه في نظام أو لائحة',
    requiresExplanation: true,
    explanationPlaceholder: 'حدد اسم النظام والمادة التي تخول الجهة بجمع ومعالجة البيانات',
    templateText: 'تنفيذاً لالتزام نظامي: {explanation}'
  },
  { 
    id: 'vital_interests', 
    label: 'حماية المصالح الحيوية',
    description: 'حماية حياة أو صحة صاحب البيانات أو غيره',
    requiresExplanation: true,
    explanationPlaceholder: 'وضّح كيفية حماية المصالح الحيوية عن طريق معالجة البيانات',
    templateText: 'حماية المصالح الحيوية: {explanation}'
  },
  { 
    id: 'public_interest', 
    label: 'تحقيق مصلحة عامة',
    description: 'المعالجة لازمة لتحقيق مصلحة عامة',
    requiresExplanation: true,
    explanationPlaceholder: 'وضّح المصلحة العامة التي يتم تحقيقها',
    templateText: 'تحقيق مصلحة عامة: {explanation}'
  },
  { 
    id: 'legitimate_interests', 
    label: 'تحقيق مصالح مشروعة',
    description: 'المعالجة لازمة لتحقيق مصالح أو أهداف مشروعة',
    requiresExplanation: true,
    explanationPlaceholder: 'وضّح الأهداف المشروعة التي لا تتعارض مع حقوق صاحب البيانات',
    templateText: 'تحقيق مصالح أو أهداف مشروعة: {explanation}'
  },
] as const;

export const DISCLOSURE_PARTIES = [
  { id: 'no_disclosure', label: 'لا نفصح لأي طرف', description: 'لن نفصح عن بياناتك الشخصية لأي طرف آخر' },
  { id: 'service_providers', label: 'مزودو الخدمات', description: 'الشركات التي تساعدنا في تقديم خدماتنا' },
  { id: 'payment_processors', label: 'معالجو المدفوعات', description: 'شركات الدفع الإلكتروني' },
  { id: 'cloud_providers', label: 'مزودو الخدمات السحابية', description: 'خدمات التخزين والاستضافة' },
  { id: 'analytics_providers', label: 'مزودو التحليلات', description: 'خدمات تحليل البيانات' },
  { id: 'government_entities', label: 'الجهات الحكومية', description: 'عند الطلب وفقاً للأنظمة المعمول بها' },
  { id: 'business_partners', label: 'الشركاء التجاريون', description: 'شركاء الأعمال والتحالفات' },
] as const;

export const STORAGE_LOCATIONS = [
  { id: 'inside_ksa', label: 'داخل المملكة العربية السعودية', description: 'خوادم موجودة في المملكة' },
  { id: 'outside_ksa', label: 'خارج المملكة العربية السعودية', description: 'خوادم في دول أخرى' },
  { id: 'both', label: 'داخل وخارج المملكة', description: 'خوادم في المملكة وخارجها' },
  { id: 'cloud_ksa', label: 'حوسبة سحابية (داخل المملكة)', description: 'مزودو خدمات سحابية محلية' },
  { id: 'cloud_international', label: 'حوسبة سحابية (دولية)', description: 'AWS، Azure، Google Cloud' },
] as const;

export const RETENTION_PERIODS = [
  { id: 'until_purpose', label: 'حتى انتهاء الغرض', years: null, description: 'نحتفظ بالبيانات حتى انتهاء الغرض من جمعها' },
  { id: '1_year', label: 'سنة واحدة', years: 1, description: '' },
  { id: '2_years', label: 'سنتين', years: 2, description: '' },
  { id: '3_years', label: '3 سنوات', years: 3, description: '' },
  { id: '5_years', label: '5 سنوات', years: 5, description: '' },
  { id: '7_years', label: '7 سنوات', years: 7, description: 'للمتطلبات المالية والضريبية' },
  { id: '10_years', label: '10 سنوات', years: 10, description: 'للسجلات القانونية' },
  { id: 'statutory', label: 'وفقاً للمتطلبات النظامية', years: null, description: 'حسب ما تنص عليه الأنظمة واللوائح' },
  { id: 'custom', label: 'مدة مخصصة', years: null, description: '' },
] as const;

export const DESTRUCTION_METHODS = [
  { id: 'secure_deletion', label: 'الحذف الآمن', description: 'حذف إلكتروني لا يمكن استعادته' },
  { id: 'overwriting', label: 'الكتابة فوق البيانات', description: 'استبدال البيانات ببيانات عشوائية' },
  { id: 'physical_destruction', label: 'الإتلاف المادي', description: 'تدمير وسائط التخزين فعلياً' },
  { id: 'encryption_key_deletion', label: 'حذف مفاتيح التشفير', description: 'إتلاف مفاتيح فك التشفير' },
  { id: 'anonymization', label: 'إخفاء الهوية', description: 'تحويل البيانات لبيانات مجهولة الهوية' },
] as const;

export const RIGHTS_EXERCISE_METHODS = [
  { id: 'email', label: 'البريد الإلكتروني', description: '' },
  { id: 'online_portal', label: 'البوابة الإلكترونية', description: '' },
  { id: 'customer_service', label: 'خدمة العملاء', description: '' },
  { id: 'mobile_app', label: 'التطبيق الإلكتروني', description: '' },
  { id: 'written_request', label: 'طلب خطي', description: '' },
] as const;

export const RESPONSE_TIMEFRAMES = [
  { id: '3_days', label: '3 أيام عمل', days: 3 },
  { id: '5_days', label: '5 أيام عمل', days: 5 },
  { id: '7_days', label: '7 أيام عمل', days: 7 },
  { id: '10_days', label: '10 أيام عمل', days: 10 },
  { id: '15_days', label: '15 يوم عمل', days: 15 },
  { id: '30_days', label: '30 يوم', days: 30 },
] as const;

export const SDAIA_INFO = {
  name: 'الهيئة السعودية للبيانات والذكاء الاصطناعي',
  country: 'المملكة العربية السعودية',
  city: 'الرياض',
  website: 'sdaia.gov.sa',
  portal: 'dgp.sdaia.gov.sa',
} as const;

export type DataTypeId = typeof DATA_TYPES[number]['id'];
export type LegalBasisId = typeof LEGAL_BASES[number]['id'];
export type StorageLocationId = typeof STORAGE_LOCATIONS[number]['id'];
export type RetentionPeriodId = typeof RETENTION_PERIODS[number]['id'];
export type DestructionMethodId = typeof DESTRUCTION_METHODS[number]['id'];
