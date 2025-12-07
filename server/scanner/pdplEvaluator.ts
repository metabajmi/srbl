import { ParsedPolicy } from './policyParser';
import { CookieBannerAnalysis } from './cookieBannerAnalyzer';
import { DiscoveredPage } from './pagesDiscovery';

export interface PDPLCheck {
  rule_id: string;
  rule_name: string;
  rule_name_ar: string;
  pdpl_article: string;
  data_source: string;
  condition_checked: string;
  result: 'pass' | 'fail' | 'partial' | 'not_found' | 'not_applicable';
  evidence: string;
  evidence_pointer: string;
  severity: 'minor' | 'major' | 'critical';
  recommendation: string;
  recommendation_ar: string;
}

export interface PDPLEvaluationResult {
  checks: PDPLCheck[];
  overall_score: number;
  compliance_level: 'high' | 'medium' | 'low';
  critical_issues: number;
  major_issues: number;
  minor_issues: number;
  passed_checks: number;
  total_checks: number;
}

interface EvaluationContext {
  policies: ParsedPolicy[];
  cookieBanner: CookieBannerAnalysis | null;
  discoveredPages: DiscoveredPage[];
  hasHttps: boolean;
  hasHsts: boolean;
  hasCsp: boolean;
  hasContactInfo: boolean;
  contactEmail?: string;
  contactPhone?: string;
  trackingTechnologies: string[];
  thirdPartyServices: string[];
  cookies: string[];
}

const PDPL_RULES: Array<{
  id: string;
  name: string;
  nameAr: string;
  article: string;
  severity: 'minor' | 'major' | 'critical';
  evaluate: (ctx: EvaluationContext) => { result: PDPLCheck['result']; evidence: string; pointer: string };
  recommendation: string;
  recommendationAr: string;
}> = [
  {
    id: 'PDPL-PRIVACY-POLICY-PRESENCE',
    name: 'Privacy Policy Presence',
    nameAr: 'وجود سياسة الخصوصية',
    article: 'Article 12',
    severity: 'critical',
    evaluate: (ctx) => {
      const privacyPolicy = ctx.policies.find(p => p.type === 'privacy');
      if (privacyPolicy) {
        return { result: 'pass', evidence: `Privacy policy found at ${privacyPolicy.url}`, pointer: `policies[privacy]` };
      }
      const discovered = ctx.discoveredPages.find(p => p.type === 'privacy');
      if (discovered) {
        return { result: 'partial', evidence: `Privacy policy link found but not fully parsed: ${discovered.url}`, pointer: 'discoveredPages[privacy]' };
      }
      return { result: 'fail', evidence: 'No privacy policy page found on the website', pointer: '' };
    },
    recommendation: 'Add a clearly accessible privacy policy page',
    recommendationAr: 'أضف صفحة سياسة خصوصية واضحة وسهلة الوصول',
  },
  {
    id: 'PDPL-PRIVACY-POLICY-CONTACT',
    name: 'Privacy Policy Contact Information',
    nameAr: 'معلومات الاتصال في سياسة الخصوصية',
    article: 'Article 12',
    severity: 'major',
    evaluate: (ctx) => {
      const privacyPolicy = ctx.policies.find(p => p.type === 'privacy');
      if (!privacyPolicy) {
        return { result: 'not_applicable', evidence: 'No privacy policy to evaluate', pointer: '' };
      }
      if (privacyPolicy.detectedElements.hasContactInfo) {
        return { result: 'pass', evidence: privacyPolicy.evidence['contact_details'] || privacyPolicy.evidence['contact_email'] || 'Contact info found', pointer: 'policies[privacy].detectedElements.hasContactInfo' };
      }
      return { result: 'fail', evidence: 'Privacy policy does not contain controller contact information', pointer: 'policies[privacy]' };
    },
    recommendation: 'Include data controller contact details in privacy policy',
    recommendationAr: 'أضف معلومات الاتصال بالمتحكم في البيانات إلى سياسة الخصوصية',
  },
  {
    id: 'PDPL-LAWFUL-BASIS',
    name: 'Lawful Basis Explained',
    nameAr: 'شرح الأساس القانوني',
    article: 'Article 5',
    severity: 'major',
    evaluate: (ctx) => {
      const privacyPolicy = ctx.policies.find(p => p.type === 'privacy');
      if (!privacyPolicy) {
        return { result: 'not_applicable', evidence: 'No privacy policy to evaluate', pointer: '' };
      }
      if (privacyPolicy.detectedElements.hasLawfulBasis) {
        return { result: 'pass', evidence: privacyPolicy.evidence['lawful_basis'] || 'Lawful basis explained', pointer: 'policies[privacy].detectedElements.hasLawfulBasis' };
      }
      return { result: 'fail', evidence: 'Privacy policy does not explain the lawful basis for processing personal data', pointer: 'policies[privacy]' };
    },
    recommendation: 'Explain the legal basis for processing personal data (consent, contract, legitimate interest, etc.)',
    recommendationAr: 'اشرح الأساس القانوني لمعالجة البيانات الشخصية (الموافقة، العقد، المصلحة المشروعة، إلخ)',
  },
  {
    id: 'PDPL-DATA-RETENTION',
    name: 'Data Retention Periods Declared',
    nameAr: 'الإفصاح عن فترات الاحتفاظ بالبيانات',
    article: 'Article 12',
    severity: 'major',
    evaluate: (ctx) => {
      const privacyPolicy = ctx.policies.find(p => p.type === 'privacy');
      if (!privacyPolicy) {
        return { result: 'not_applicable', evidence: 'No privacy policy to evaluate', pointer: '' };
      }
      if (privacyPolicy.detectedElements.hasRetentionPeriod) {
        return { result: 'pass', evidence: privacyPolicy.evidence['data_retention'] || 'Retention period declared', pointer: 'policies[privacy].detectedElements.hasRetentionPeriod' };
      }
      return { result: 'fail', evidence: 'Privacy policy does not specify data retention periods', pointer: 'policies[privacy]' };
    },
    recommendation: 'Specify how long personal data is retained',
    recommendationAr: 'حدد مدة الاحتفاظ بالبيانات الشخصية',
  },
  {
    id: 'PDPL-DATA-SUBJECT-RIGHTS',
    name: 'Data Subject Rights Listed',
    nameAr: 'حقوق صاحب البيانات مذكورة',
    article: 'Article 4',
    severity: 'critical',
    evaluate: (ctx) => {
      const privacyPolicy = ctx.policies.find(p => p.type === 'privacy');
      if (!privacyPolicy) {
        return { result: 'not_applicable', evidence: 'No privacy policy to evaluate', pointer: '' };
      }
      if (privacyPolicy.detectedElements.hasDataSubjectRights) {
        return { result: 'pass', evidence: privacyPolicy.evidence['data_subject_rights'] || 'Data subject rights explained', pointer: 'policies[privacy].detectedElements.hasDataSubjectRights' };
      }
      return { result: 'fail', evidence: 'Privacy policy does not list data subject rights (access, rectification, deletion, objection)', pointer: 'policies[privacy]' };
    },
    recommendation: 'List all data subject rights: access, rectification, erasure, objection, portability',
    recommendationAr: 'اذكر جميع حقوق صاحب البيانات: الوصول، التصحيح، الحذف، الاعتراض، نقل البيانات',
  },
  {
    id: 'PDPL-THIRD-PARTY-SHARING',
    name: 'Third Party Sharing Disclosed',
    nameAr: 'الإفصاح عن مشاركة الأطراف الثالثة',
    article: 'Article 17',
    severity: 'major',
    evaluate: (ctx) => {
      const privacyPolicy = ctx.policies.find(p => p.type === 'privacy');
      if (!privacyPolicy) {
        return { result: 'not_applicable', evidence: 'No privacy policy to evaluate', pointer: '' };
      }
      if (privacyPolicy.detectedElements.hasThirdPartySharing) {
        return { result: 'pass', evidence: privacyPolicy.evidence['third_party_sharing'] || 'Third party sharing disclosed', pointer: 'policies[privacy].detectedElements.hasThirdPartySharing' };
      }
      if (ctx.thirdPartyServices.length > 0 || ctx.trackingTechnologies.length > 0) {
        return { result: 'fail', evidence: `Website uses ${ctx.thirdPartyServices.length} third-party services but privacy policy doesn't disclose data sharing`, pointer: 'thirdPartyServices' };
      }
      return { result: 'partial', evidence: 'No third-party sharing information found', pointer: 'policies[privacy]' };
    },
    recommendation: 'Disclose all third parties with whom data is shared',
    recommendationAr: 'أفصح عن جميع الأطراف الثالثة التي تتم مشاركة البيانات معها',
  },
  {
    id: 'PDPL-INTERNATIONAL-TRANSFER',
    name: 'International Transfer Statement',
    nameAr: 'بيان النقل الدولي للبيانات',
    article: 'Article 29',
    severity: 'major',
    evaluate: (ctx) => {
      const privacyPolicy = ctx.policies.find(p => p.type === 'privacy');
      if (!privacyPolicy) {
        return { result: 'not_applicable', evidence: 'No privacy policy to evaluate', pointer: '' };
      }
      if (privacyPolicy.detectedElements.hasInternationalTransfer) {
        return { result: 'pass', evidence: privacyPolicy.evidence['data_transfer'] || 'International transfer addressed', pointer: 'policies[privacy].detectedElements.hasInternationalTransfer' };
      }
      const hasInternationalServices = ctx.thirdPartyServices.some(s => 
        ['Google', 'Facebook', 'Meta', 'Amazon', 'Microsoft', 'Cloudflare'].some(intl => s.includes(intl))
      );
      if (hasInternationalServices) {
        return { result: 'fail', evidence: 'Uses international services but does not address cross-border data transfer', pointer: 'thirdPartyServices' };
      }
      return { result: 'partial', evidence: 'International transfer not explicitly addressed', pointer: 'policies[privacy]' };
    },
    recommendation: 'Explain how personal data is transferred outside Saudi Arabia and safeguards in place',
    recommendationAr: 'اشرح كيفية نقل البيانات خارج المملكة والضمانات المتخذة',
  },
  {
    id: 'PDPL-SECURITY-MEASURES',
    name: 'Security Measures Described',
    nameAr: 'وصف إجراءات الأمان',
    article: 'Article 19',
    severity: 'major',
    evaluate: (ctx) => {
      const privacyPolicy = ctx.policies.find(p => p.type === 'privacy');
      if (!privacyPolicy) {
        return { result: 'not_applicable', evidence: 'No privacy policy to evaluate', pointer: '' };
      }
      if (privacyPolicy.detectedElements.hasSecurityMeasures) {
        return { result: 'pass', evidence: privacyPolicy.evidence['security_measures'] || 'Security measures described', pointer: 'policies[privacy].detectedElements.hasSecurityMeasures' };
      }
      return { result: 'fail', evidence: 'Privacy policy does not describe security measures for protecting personal data', pointer: 'policies[privacy]' };
    },
    recommendation: 'Describe technical and organizational measures to protect personal data',
    recommendationAr: 'صف الإجراءات التقنية والتنظيمية لحماية البيانات الشخصية',
  },
  {
    id: 'PDPL-COOKIE-BANNER-PRESENCE',
    name: 'Cookie Consent Banner Present',
    nameAr: 'وجود لافتة موافقة الكوكيز',
    article: 'Article 17',
    severity: 'critical',
    evaluate: (ctx) => {
      if (!ctx.cookieBanner) {
        return { result: 'not_found', evidence: 'Cookie banner analysis not available', pointer: '' };
      }
      if (ctx.cookieBanner.present) {
        return { result: 'pass', evidence: ctx.cookieBanner.evidence, pointer: 'cookieBanner.present' };
      }
      if (ctx.cookies.length > 0) {
        return { result: 'fail', evidence: `Website sets ${ctx.cookies.length} cookies but has no consent banner`, pointer: 'cookies' };
      }
      return { result: 'partial', evidence: 'No cookie banner detected', pointer: 'cookieBanner' };
    },
    recommendation: 'Implement a cookie consent banner before setting non-essential cookies',
    recommendationAr: 'أضف لافتة موافقة للكوكيز قبل تعيين الكوكيز غير الضرورية',
  },
  {
    id: 'PDPL-COOKIE-CONSENT-MECHANISM',
    name: 'Cookie Consent Mechanism (Opt-in)',
    nameAr: 'آلية موافقة الكوكيز (الاشتراك)',
    article: 'Article 17',
    severity: 'critical',
    evaluate: (ctx) => {
      if (!ctx.cookieBanner || !ctx.cookieBanner.present) {
        return { result: 'not_applicable', evidence: 'No cookie banner present', pointer: '' };
      }
      if (ctx.cookieBanner.hasAcceptButton && ctx.cookieBanner.hasRejectButton) {
        return { result: 'pass', evidence: `Banner has accept (${ctx.cookieBanner.acceptButtonText}) and reject (${ctx.cookieBanner.rejectButtonText}) options`, pointer: 'cookieBanner.hasAcceptButton && cookieBanner.hasRejectButton' };
      }
      if (ctx.cookieBanner.hasAcceptButton && !ctx.cookieBanner.hasRejectButton) {
        return { result: 'fail', evidence: 'Cookie banner has accept button but no reject option', pointer: 'cookieBanner.hasRejectButton' };
      }
      return { result: 'fail', evidence: 'Cookie consent mechanism is not properly implemented', pointer: 'cookieBanner' };
    },
    recommendation: 'Provide both accept and reject options for cookies',
    recommendationAr: 'وفر خياري القبول والرفض للكوكيز',
  },
  {
    id: 'PDPL-COOKIE-GRANULAR-CONTROL',
    name: 'Granular Cookie Controls',
    nameAr: 'تحكم مفصل في الكوكيز',
    article: 'Article 17',
    severity: 'major',
    evaluate: (ctx) => {
      if (!ctx.cookieBanner || !ctx.cookieBanner.present) {
        return { result: 'not_applicable', evidence: 'No cookie banner present', pointer: '' };
      }
      if (ctx.cookieBanner.granularControls) {
        const categoriesInfo = ctx.cookieBanner.categories.map(c => c.name).join(', ');
        return { result: 'pass', evidence: `Granular controls available. Categories: ${categoriesInfo || 'detected'}`, pointer: 'cookieBanner.granularControls' };
      }
      return { result: 'fail', evidence: 'No granular cookie category controls (necessary, analytics, marketing)', pointer: 'cookieBanner.granularControls' };
    },
    recommendation: 'Allow users to control cookie categories (necessary, analytics, marketing)',
    recommendationAr: 'السماح للمستخدمين بالتحكم في فئات الكوكيز (ضرورية، تحليلية، تسويقية)',
  },
  {
    id: 'PDPL-COOKIE-BLOCKING',
    name: 'Cookie Blocking Before Consent',
    nameAr: 'حجب الكوكيز قبل الموافقة',
    article: 'Article 17',
    severity: 'major',
    evaluate: (ctx) => {
      if (!ctx.cookieBanner) {
        return { result: 'not_applicable', evidence: 'Cookie banner analysis not available', pointer: '' };
      }
      if (ctx.cookieBanner.blocking) {
        return { result: 'pass', evidence: ctx.cookieBanner.blockingEvidence, pointer: 'cookieBanner.blocking' };
      }
      if (ctx.cookieBanner.preConsentTrackers.length > 0) {
        return { result: 'fail', evidence: `Trackers loading before consent: ${ctx.cookieBanner.preConsentTrackers.join(', ')}`, pointer: 'cookieBanner.preConsentTrackers' };
      }
      return { result: 'partial', evidence: 'Unable to determine if trackers are blocked before consent', pointer: 'cookieBanner' };
    },
    recommendation: 'Block tracking cookies and scripts until user gives consent',
    recommendationAr: 'احجب كوكيز وسكربتات التتبع حتى يوافق المستخدم',
  },
  {
    id: 'PDPL-TERMS-PRESENCE',
    name: 'Terms and Conditions Presence',
    nameAr: 'وجود الشروط والأحكام',
    article: 'Article 12',
    severity: 'major',
    evaluate: (ctx) => {
      const terms = ctx.policies.find(p => p.type === 'terms');
      if (terms) {
        return { result: 'pass', evidence: `Terms and conditions found at ${terms.url}`, pointer: 'policies[terms]' };
      }
      const discovered = ctx.discoveredPages.find(p => p.type === 'terms');
      if (discovered) {
        return { result: 'partial', evidence: `Terms link found but not fully parsed: ${discovered.url}`, pointer: 'discoveredPages[terms]' };
      }
      return { result: 'fail', evidence: 'No terms and conditions page found', pointer: '' };
    },
    recommendation: 'Add a terms and conditions page',
    recommendationAr: 'أضف صفحة الشروط والأحكام',
  },
  {
    id: 'PDPL-HTTPS-SECURITY',
    name: 'HTTPS Security',
    nameAr: 'أمان HTTPS',
    article: 'Article 19',
    severity: 'critical',
    evaluate: (ctx) => {
      if (ctx.hasHttps) {
        return { result: 'pass', evidence: 'Website uses HTTPS encryption', pointer: 'security.https' };
      }
      return { result: 'fail', evidence: 'Website does not use HTTPS', pointer: 'security.https' };
    },
    recommendation: 'Enable HTTPS for all pages',
    recommendationAr: 'فعّل HTTPS لجميع الصفحات',
  },
  {
    id: 'PDPL-HSTS-HEADER',
    name: 'HSTS Security Header',
    nameAr: 'رأس أمان HSTS',
    article: 'Article 19',
    severity: 'major',
    evaluate: (ctx) => {
      if (ctx.hasHsts) {
        return { result: 'pass', evidence: 'HSTS header is set', pointer: 'security.hsts' };
      }
      return { result: 'fail', evidence: 'HSTS header is not configured', pointer: 'security.hsts' };
    },
    recommendation: 'Enable HSTS (HTTP Strict Transport Security) header',
    recommendationAr: 'فعّل رأس HSTS (نقل HTTP الصارم الآمن)',
  },
  {
    id: 'PDPL-WEBSITE-CONTACT',
    name: 'Website Contact Information',
    nameAr: 'معلومات الاتصال بالموقع',
    article: 'Article 4',
    severity: 'major',
    evaluate: (ctx) => {
      if (ctx.hasContactInfo) {
        const details = [ctx.contactEmail, ctx.contactPhone].filter(Boolean).join(', ');
        return { result: 'pass', evidence: `Contact information found: ${details || 'available'}`, pointer: 'contactInfo' };
      }
      return { result: 'fail', evidence: 'No contact information (email or phone) found on website', pointer: 'contactInfo' };
    },
    recommendation: 'Display clear contact information for data protection inquiries',
    recommendationAr: 'اعرض معلومات اتصال واضحة لاستفسارات حماية البيانات',
  },
  {
    id: 'PDPL-SENSITIVE-DATA-HANDLING',
    name: 'Sensitive Data Handling',
    nameAr: 'التعامل مع البيانات الحساسة',
    article: 'Article 15',
    severity: 'major',
    evaluate: (ctx) => {
      const privacyPolicy = ctx.policies.find(p => p.type === 'privacy');
      if (!privacyPolicy) {
        return { result: 'not_applicable', evidence: 'No privacy policy to evaluate', pointer: '' };
      }
      if (privacyPolicy.detectedElements.hasSensitiveData) {
        return { result: 'pass', evidence: privacyPolicy.evidence['sensitive_data'] || 'Sensitive data handling addressed', pointer: 'policies[privacy].detectedElements.hasSensitiveData' };
      }
      return { result: 'partial', evidence: 'Sensitive data handling not explicitly addressed', pointer: 'policies[privacy]' };
    },
    recommendation: 'Address how sensitive data (health, financial, biometric) is processed',
    recommendationAr: 'وضح كيفية معالجة البيانات الحساسة (الصحية، المالية، البيومترية)',
  },
  {
    id: 'PDPL-CHILDREN-DATA',
    name: 'Children Data Protection',
    nameAr: 'حماية بيانات الأطفال',
    article: 'Article 16',
    severity: 'major',
    evaluate: (ctx) => {
      const privacyPolicy = ctx.policies.find(p => p.type === 'privacy');
      if (!privacyPolicy) {
        return { result: 'not_applicable', evidence: 'No privacy policy to evaluate', pointer: '' };
      }
      if (privacyPolicy.detectedElements.hasChildrenData) {
        return { result: 'pass', evidence: privacyPolicy.evidence['children_data'] || 'Children data protection addressed', pointer: 'policies[privacy].detectedElements.hasChildrenData' };
      }
      return { result: 'partial', evidence: 'Children data protection not explicitly addressed', pointer: 'policies[privacy]' };
    },
    recommendation: 'Address how children\'s data is handled and parental consent requirements',
    recommendationAr: 'وضح كيفية التعامل مع بيانات الأطفال ومتطلبات موافقة الوالدين',
  },
  {
    id: 'PDPL-COOKIE-POLICY-LINK',
    name: 'Cookie Policy Link in Banner',
    nameAr: 'رابط سياسة الكوكيز في اللافتة',
    article: 'Article 12',
    severity: 'minor',
    evaluate: (ctx) => {
      if (!ctx.cookieBanner || !ctx.cookieBanner.present) {
        return { result: 'not_applicable', evidence: 'No cookie banner present', pointer: '' };
      }
      if (ctx.cookieBanner.policyLinkPresent) {
        return { result: 'pass', evidence: `Policy link found: ${ctx.cookieBanner.policyLinkUrl}`, pointer: 'cookieBanner.policyLinkUrl' };
      }
      return { result: 'fail', evidence: 'Cookie banner does not link to privacy/cookie policy', pointer: 'cookieBanner.policyLinkPresent' };
    },
    recommendation: 'Add a link to your cookie/privacy policy in the consent banner',
    recommendationAr: 'أضف رابطاً لسياسة الكوكيز/الخصوصية في لافتة الموافقة',
  },
];

export function evaluatePDPLCompliance(context: EvaluationContext): PDPLEvaluationResult {
  console.log('[PDPLEvaluator] Starting comprehensive PDPL evaluation...');
  
  const checks: PDPLCheck[] = [];
  
  for (const rule of PDPL_RULES) {
    const { result, evidence, pointer } = rule.evaluate(context);
    
    checks.push({
      rule_id: rule.id,
      rule_name: rule.name,
      rule_name_ar: rule.nameAr,
      pdpl_article: rule.article,
      data_source: pointer || 'N/A',
      condition_checked: `Evaluating ${rule.name}`,
      result,
      evidence: evidence.substring(0, 500),
      evidence_pointer: pointer,
      severity: rule.severity,
      recommendation: rule.recommendation,
      recommendation_ar: rule.recommendationAr,
    });
  }
  
  let critical_issues = 0;
  let major_issues = 0;
  let minor_issues = 0;
  let passed_checks = 0;
  
  for (const check of checks) {
    if (check.result === 'pass') {
      passed_checks++;
    } else if (check.result === 'fail') {
      if (check.severity === 'critical') critical_issues++;
      else if (check.severity === 'major') major_issues++;
      else minor_issues++;
    } else if (check.result === 'partial') {
      if (check.severity === 'critical') critical_issues++;
      else if (check.severity === 'major') major_issues++;
    }
  }
  
  const applicableChecks = checks.filter(c => c.result !== 'not_applicable' && c.result !== 'not_found');
  const passedChecksCount = applicableChecks.filter(c => c.result === 'pass').length;
  const partialChecksCount = applicableChecks.filter(c => c.result === 'partial').length;
  const failedChecksCount = applicableChecks.filter(c => c.result === 'fail').length;
  
  const totalApplicable = applicableChecks.length;
  if (totalApplicable === 0) {
    console.log(`[PDPLEvaluator] No applicable checks found`);
    return {
      checks,
      overall_score: 50,
      compliance_level: 'medium' as const,
      critical_issues: 0,
      major_issues: 0,
      minor_issues: 0,
      passed_checks: 0,
      total_checks: 0,
    };
  }
  
  console.log(`[PDPLEvaluator] Checks breakdown: passed=${passedChecksCount}, partial=${partialChecksCount}, failed=${failedChecksCount}, total=${totalApplicable}`);
  console.log(`[PDPLEvaluator] Issues: critical=${critical_issues}, major=${major_issues}, minor=${minor_issues}`);
  
  const passedWeight = passedChecksCount * 100;
  const partialWeight = partialChecksCount * 50;
  
  let baseScore = Math.round((passedWeight + partialWeight) / totalApplicable);
  console.log(`[PDPLEvaluator] Base score before penalties: ${baseScore}`);
  
  const criticalFailPenalty = Math.min(15, critical_issues * 4);
  const majorFailPenalty = Math.min(10, major_issues * 2);
  
  let score = Math.max(0, baseScore - criticalFailPenalty - majorFailPenalty);
  score = Math.min(100, Math.max(0, score));
  console.log(`[PDPLEvaluator] Final score after penalties (critical: -${criticalFailPenalty}, major: -${majorFailPenalty}): ${score}`);
  
  let compliance_level: 'high' | 'medium' | 'low';
  if (score >= 80 && critical_issues === 0) {
    compliance_level = 'high';
  } else if (score >= 50) {
    compliance_level = 'medium';
  } else {
    compliance_level = 'low';
  }
  
  console.log(`[PDPLEvaluator] Evaluation complete. Score: ${score}, Level: ${compliance_level}`);
  
  return {
    checks,
    overall_score: score,
    compliance_level,
    critical_issues,
    major_issues,
    minor_issues,
    passed_checks,
    total_checks: applicableChecks.length,
  };
}

export function createEvaluationContext(
  policies: ParsedPolicy[],
  cookieBanner: CookieBannerAnalysis | null,
  discoveredPages: DiscoveredPage[],
  scanData: {
    hasHttps: boolean;
    hasHsts: boolean;
    hasCsp: boolean;
    hasContactInfo: boolean;
    contactEmail?: string;
    contactPhone?: string;
    trackingTechnologies: string[];
    thirdPartyServices: string[];
    cookies: string[];
  }
): EvaluationContext {
  return {
    policies,
    cookieBanner,
    discoveredPages,
    hasHttps: scanData.hasHttps,
    hasHsts: scanData.hasHsts,
    hasCsp: scanData.hasCsp,
    hasContactInfo: scanData.hasContactInfo,
    contactEmail: scanData.contactEmail,
    contactPhone: scanData.contactPhone,
    trackingTechnologies: scanData.trackingTechnologies,
    thirdPartyServices: scanData.thirdPartyServices,
    cookies: scanData.cookies,
  };
}
