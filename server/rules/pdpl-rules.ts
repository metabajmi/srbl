import {
  PDPLRuleResult,
  ScanExtractionResult,
  ExtractedCookie,
  DetectedTracker,
  ExtractedFormField,
  ThirdPartyService,
} from '@shared/schema';

export interface PDPLRule {
  id: string;
  name: string;
  article: string;
  severity: PDPLRuleResult['severity'];
  evaluate: (data: ScanExtractionResult) => PDPLRuleResult;
}

const PDPL_RULES: PDPLRule[] = [
  {
    id: 'PDPL-ART12-PRIVACY-POLICY',
    name: 'سياسة الخصوصية مطلوبة',
    article: 'المادة 12',
    severity: 'critical',
    evaluate: (data: ScanExtractionResult): PDPLRuleResult => {
      const found = data.privacy_policy.found;
      return {
        rule_id: 'PDPL-ART12-PRIVACY-POLICY',
        rule_name: 'سياسة الخصوصية مطلوبة',
        article: 'المادة 12',
        data_source: 'privacy_policy.found',
        condition: 'يجب أن تكون سياسة الخصوصية موجودة ومتاحة',
        result: found ? 'pass' : 'fail',
        explanation: found
          ? 'تم العثور على سياسة الخصوصية'
          : 'لم يتم العثور على سياسة خصوصية - يلزم نظام حماية البيانات الشخصية وجود سياسة خصوصية واضحة',
        severity: 'critical',
        evidence: found ? `URL: ${data.privacy_policy.url}` : 'لم يتم العثور على رابط سياسة الخصوصية',
      };
    },
  },
  
  {
    id: 'PDPL-ART12-PRIVACY-ACCESSIBLE',
    name: 'سياسة الخصوصية قابلة للوصول',
    article: 'المادة 12',
    severity: 'warning',
    evaluate: (data: ScanExtractionResult): PDPLRuleResult => {
      if (!data.privacy_policy.found) {
        return {
          rule_id: 'PDPL-ART12-PRIVACY-ACCESSIBLE',
          rule_name: 'سياسة الخصوصية قابلة للوصول',
          article: 'المادة 12',
          data_source: 'privacy_policy',
          condition: 'يجب أن تكون سياسة الخصوصية قابلة للوصول',
          result: 'not_applicable',
          explanation: 'لا تنطبق - لم يتم العثور على سياسة خصوصية',
          severity: 'warning',
        };
      }
      
      const accessible = data.privacy_policy.content_accessible;
      return {
        rule_id: 'PDPL-ART12-PRIVACY-ACCESSIBLE',
        rule_name: 'سياسة الخصوصية قابلة للوصول',
        article: 'المادة 12',
        data_source: 'privacy_policy.content_accessible',
        condition: 'يجب أن تكون سياسة الخصوصية قابلة للوصول',
        result: accessible ? 'pass' : 'fail',
        explanation: accessible
          ? 'سياسة الخصوصية قابلة للوصول'
          : 'سياسة الخصوصية غير قابلة للوصول',
        severity: 'warning',
        evidence: data.privacy_policy.url,
      };
    },
  },
  
  {
    id: 'PDPL-ART17-COOKIE-CONSENT',
    name: 'موافقة ملفات الارتباط مطلوبة',
    article: 'المادة 17',
    severity: 'critical',
    evaluate: (data: ScanExtractionResult): PDPLRuleResult => {
      const hasCookies = data.cookies.length > 0;
      const hasTrackingCookies = data.cookies.some(
        c => c.category === 'analytics' || c.category === 'marketing'
      );
      const hasTrackers = data.trackers.length > 0;
      
      if (!hasCookies && !hasTrackers) {
        return {
          rule_id: 'PDPL-ART17-COOKIE-CONSENT',
          rule_name: 'موافقة ملفات الارتباط مطلوبة',
          article: 'المادة 17',
          data_source: 'cookies, trackers',
          condition: 'إذا تم استخدام كوكيز غير ضرورية، يجب الحصول على موافقة',
          result: 'pass',
          explanation: 'لم يتم اكتشاف كوكيز أو تتبع - لا حاجة للموافقة',
          severity: 'critical',
        };
      }
      
      const hasBanner = data.cookie_banner.found;
      const hasProperConsent = hasBanner && 
        (data.cookie_banner.consent_mechanism === 'opt_in' || 
         (data.cookie_banner.has_accept_button && data.cookie_banner.has_reject_button));
      
      if (!hasTrackingCookies && !hasTrackers) {
        return {
          rule_id: 'PDPL-ART17-COOKIE-CONSENT',
          rule_name: 'موافقة ملفات الارتباط مطلوبة',
          article: 'المادة 17',
          data_source: 'cookies',
          condition: 'الكوكيز الضرورية فقط لا تتطلب موافقة صريحة',
          result: 'pass',
          explanation: 'تم اكتشاف كوكيز ضرورية فقط - لا حاجة لموافقة صريحة',
          severity: 'critical',
          evidence: `عدد الكوكيز: ${data.cookies.length}`,
        };
      }
      
      return {
        rule_id: 'PDPL-ART17-COOKIE-CONSENT',
        rule_name: 'موافقة ملفات الارتباط مطلوبة',
        article: 'المادة 17',
        data_source: 'cookie_banner, cookies, trackers',
        condition: 'يجب الحصول على موافقة صريحة قبل استخدام كوكيز التتبع والتسويق',
        result: hasProperConsent ? 'pass' : 'fail',
        explanation: hasProperConsent
          ? 'يوجد نظام موافقة صريح للكوكيز'
          : hasBanner
            ? 'يوجد شريط كوكيز لكنه لا يوفر خيار رفض واضح'
            : 'لا يوجد شريط موافقة للكوكيز رغم استخدام تقنيات تتبع',
        severity: 'critical',
        evidence: `الكوكيز: ${data.cookies.length}, المتتبعون: ${data.trackers.length}, شريط الموافقة: ${hasBanner ? 'موجود' : 'غير موجود'}`,
      };
    },
  },
  
  {
    id: 'PDPL-ART17-CONSENT-MECHANISM',
    name: 'آلية الموافقة الصحيحة',
    article: 'المادة 17',
    severity: 'warning',
    evaluate: (data: ScanExtractionResult): PDPLRuleResult => {
      if (!data.cookie_banner.found) {
        return {
          rule_id: 'PDPL-ART17-CONSENT-MECHANISM',
          rule_name: 'آلية الموافقة الصحيحة',
          article: 'المادة 17',
          data_source: 'cookie_banner',
          condition: 'يجب توفير آلية موافقة واضحة',
          result: 'not_applicable',
          explanation: 'لا يوجد شريط موافقة للتقييم',
          severity: 'warning',
        };
      }
      
      const hasRejectOption = data.cookie_banner.has_reject_button;
      const hasSettings = data.cookie_banner.has_settings_option;
      
      return {
        rule_id: 'PDPL-ART17-CONSENT-MECHANISM',
        rule_name: 'آلية الموافقة الصحيحة',
        article: 'المادة 17',
        data_source: 'cookie_banner',
        condition: 'يجب أن توفر لافتة الكوكيز خيار رفض واضح وإمكانية تخصيص الموافقة',
        result: hasRejectOption && hasSettings ? 'pass' : hasRejectOption ? 'pass' : 'fail',
        explanation: hasRejectOption
          ? hasSettings
            ? 'آلية الموافقة كاملة - يوجد خيار قبول ورفض وتخصيص'
            : 'آلية الموافقة جيدة - يوجد خيار قبول ورفض'
          : 'آلية الموافقة غير كاملة - لا يوجد خيار رفض واضح',
        severity: 'warning',
        evidence: `قبول: ${data.cookie_banner.has_accept_button}, رفض: ${hasRejectOption}, تخصيص: ${hasSettings}`,
      };
    },
  },
  
  {
    id: 'PDPL-ART5-DATA-COLLECTION-TRANSPARENCY',
    name: 'شفافية جمع البيانات',
    article: 'المادة 5',
    severity: 'critical',
    evaluate: (data: ScanExtractionResult): PDPLRuleResult => {
      const collectsData = data.forms.length > 0;
      const hasSensitiveFields = data.forms.some(
        f => ['id_number', 'financial', 'health'].includes(f.dataCategory)
      );
      const hasPrivacyPolicy = data.privacy_policy.found;
      
      if (!collectsData) {
        return {
          rule_id: 'PDPL-ART5-DATA-COLLECTION-TRANSPARENCY',
          rule_name: 'شفافية جمع البيانات',
          article: 'المادة 5',
          data_source: 'forms',
          condition: 'يجب الإفصاح عن البيانات المجمعة',
          result: 'pass',
          explanation: 'لم يتم اكتشاف نماذج لجمع البيانات',
          severity: 'critical',
        };
      }
      
      const fieldTypes = Array.from(new Set(data.forms.map(f => f.dataCategory)));
      
      return {
        rule_id: 'PDPL-ART5-DATA-COLLECTION-TRANSPARENCY',
        rule_name: 'شفافية جمع البيانات',
        article: 'المادة 5',
        data_source: 'forms, privacy_policy',
        condition: 'يجب الإفصاح عن أنواع البيانات المجمعة وأغراض استخدامها',
        result: hasPrivacyPolicy ? 'pass' : 'fail',
        explanation: hasPrivacyPolicy
          ? `يتم جمع بيانات شخصية ويوجد سياسة خصوصية للإفصاح`
          : `يتم جمع بيانات شخصية ${hasSensitiveFields ? 'حساسة ' : ''}بدون سياسة خصوصية واضحة`,
        severity: 'critical',
        evidence: `أنواع البيانات: ${fieldTypes.join(', ')}، عدد الحقول: ${data.forms.length}`,
      };
    },
  },
  
  {
    id: 'PDPL-ART29-DATA-TRANSFER',
    name: 'نقل البيانات خارج المملكة',
    article: 'المادة 29',
    severity: 'critical',
    evaluate: (data: ScanExtractionResult): PDPLRuleResult => {
      const crossBorderServices = data.third_party_services.filter(s => s.crossBorder);
      const hasCrossBorderTransfer = crossBorderServices.length > 0;
      
      if (!hasCrossBorderTransfer) {
        return {
          rule_id: 'PDPL-ART29-DATA-TRANSFER',
          rule_name: 'نقل البيانات خارج المملكة',
          article: 'المادة 29',
          data_source: 'third_party_services',
          condition: 'نقل البيانات خارج المملكة يتطلب ضمانات',
          result: 'pass',
          explanation: 'لم يتم اكتشاف نقل بيانات خارج المملكة',
          severity: 'critical',
        };
      }
      
      const countries = Array.from(new Set(crossBorderServices.map(s => s.country).filter(Boolean)));
      const hasPrivacyPolicy = data.privacy_policy.found;
      
      return {
        rule_id: 'PDPL-ART29-DATA-TRANSFER',
        rule_name: 'نقل البيانات خارج المملكة',
        article: 'المادة 29',
        data_source: 'third_party_services, privacy_policy',
        condition: 'نقل البيانات خارج المملكة يتطلب الإفصاح عنه وتوفير ضمانات كافية',
        result: hasPrivacyPolicy ? 'pass' : 'fail',
        explanation: hasPrivacyPolicy
          ? `يتم نقل بيانات إلى ${countries.length} دول خارجية - يجب التأكد من الإفصاح في سياسة الخصوصية`
          : `يتم نقل بيانات إلى ${countries.length} دول خارجية بدون سياسة خصوصية تفصح عن ذلك`,
        severity: 'critical',
        evidence: `الدول: ${countries.join(', ')}، الخدمات: ${crossBorderServices.map(s => s.name).join(', ')}`,
      };
    },
  },
  
  {
    id: 'PDPL-ART19-SECURITY-HTTPS',
    name: 'تشفير HTTPS مطلوب',
    article: 'المادة 19',
    severity: 'critical',
    evaluate: (data: ScanExtractionResult): PDPLRuleResult => {
      const hasHttps = data.security.https;
      
      return {
        rule_id: 'PDPL-ART19-SECURITY-HTTPS',
        rule_name: 'تشفير HTTPS مطلوب',
        article: 'المادة 19',
        data_source: 'security.https',
        condition: 'يجب تشفير الاتصالات باستخدام HTTPS',
        result: hasHttps ? 'pass' : 'fail',
        explanation: hasHttps
          ? 'الموقع يستخدم HTTPS للتشفير'
          : 'الموقع لا يستخدم HTTPS - البيانات غير مشفرة أثناء النقل',
        severity: 'critical',
      };
    },
  },
  
  {
    id: 'PDPL-ART19-SECURITY-HSTS',
    name: 'HSTS موصى به',
    article: 'المادة 19',
    severity: 'suggestion',
    evaluate: (data: ScanExtractionResult): PDPLRuleResult => {
      if (!data.security.https) {
        return {
          rule_id: 'PDPL-ART19-SECURITY-HSTS',
          rule_name: 'HSTS موصى به',
          article: 'المادة 19',
          data_source: 'security',
          condition: 'HSTS يعزز أمان HTTPS',
          result: 'not_applicable',
          explanation: 'لا ينطبق - الموقع لا يستخدم HTTPS',
          severity: 'suggestion',
        };
      }
      
      const hasHsts = data.security.hsts;
      const maxAge = data.security.hstsMaxAge;
      
      return {
        rule_id: 'PDPL-ART19-SECURITY-HSTS',
        rule_name: 'HSTS موصى به',
        article: 'المادة 19',
        data_source: 'security.hsts',
        condition: 'HSTS يمنع هجمات downgrade ويعزز أمان HTTPS',
        result: hasHsts ? 'pass' : 'fail',
        explanation: hasHsts
          ? `HSTS مفعل (max-age: ${maxAge} ثانية)`
          : 'HSTS غير مفعل - يُنصح بتفعيله لتعزيز الأمان',
        severity: 'suggestion',
      };
    },
  },
  
  {
    id: 'PDPL-ART19-COOKIE-SECURITY',
    name: 'أمان ملفات الارتباط',
    article: 'المادة 19',
    severity: 'warning',
    evaluate: (data: ScanExtractionResult): PDPLRuleResult => {
      if (data.cookies.length === 0) {
        return {
          rule_id: 'PDPL-ART19-COOKIE-SECURITY',
          rule_name: 'أمان ملفات الارتباط',
          article: 'المادة 19',
          data_source: 'cookies',
          condition: 'الكوكيز يجب أن تستخدم علامات الأمان المناسبة',
          result: 'pass',
          explanation: 'لم يتم اكتشاف كوكيز',
          severity: 'warning',
        };
      }
      
      const secureCookies = data.cookies.filter(c => c.secure);
      const httpOnlyCookies = data.cookies.filter(c => c.httpOnly);
      const sameSiteSet = data.cookies.filter(c => c.sameSite && c.sameSite !== 'None');
      
      const securePercentage = (secureCookies.length / data.cookies.length) * 100;
      const isSecure = securePercentage >= 70;
      
      return {
        rule_id: 'PDPL-ART19-COOKIE-SECURITY',
        rule_name: 'أمان ملفات الارتباط',
        article: 'المادة 19',
        data_source: 'cookies',
        condition: 'الكوكيز يجب أن تستخدم Secure و HttpOnly و SameSite',
        result: isSecure ? 'pass' : 'fail',
        explanation: isSecure
          ? `${securePercentage.toFixed(0)}% من الكوكيز آمنة`
          : `فقط ${securePercentage.toFixed(0)}% من الكوكيز تستخدم علامة Secure`,
        severity: 'warning',
        evidence: `Secure: ${secureCookies.length}/${data.cookies.length}, HttpOnly: ${httpOnlyCookies.length}/${data.cookies.length}, SameSite: ${sameSiteSet.length}/${data.cookies.length}`,
      };
    },
  },
  
  {
    id: 'PDPL-ART4-CONTACT-INFO',
    name: 'معلومات الاتصال بجهة التحكم',
    article: 'المادة 4',
    severity: 'warning',
    evaluate: (data: ScanExtractionResult): PDPLRuleResult => {
      const hasContact = data.contact_info.found;
      const hasEmail = data.contact_info.email !== undefined;
      const hasPhone = data.contact_info.phone !== undefined;
      const hasForm = data.contact_info.form_found;
      
      return {
        rule_id: 'PDPL-ART4-CONTACT-INFO',
        rule_name: 'معلومات الاتصال بجهة التحكم',
        article: 'المادة 4',
        data_source: 'contact_info',
        condition: 'يجب توفير معلومات للتواصل مع جهة التحكم في البيانات',
        result: hasContact ? 'pass' : 'fail',
        explanation: hasContact
          ? `معلومات الاتصال متوفرة${hasEmail ? ' (بريد إلكتروني)' : ''}${hasPhone ? ' (هاتف)' : ''}${hasForm ? ' (نموذج تواصل)' : ''}`
          : 'لم يتم العثور على معلومات اتصال واضحة',
        severity: 'warning',
        evidence: hasContact
          ? `البريد: ${data.contact_info.email || 'غير متوفر'}, الهاتف: ${data.contact_info.phone || 'غير متوفر'}`
          : undefined,
      };
    },
  },
  
  {
    id: 'PDPL-ART12-TERMS',
    name: 'الشروط والأحكام',
    article: 'المادة 12',
    severity: 'warning',
    evaluate: (data: ScanExtractionResult): PDPLRuleResult => {
      const found = data.terms_and_conditions.found;
      
      return {
        rule_id: 'PDPL-ART12-TERMS',
        rule_name: 'الشروط والأحكام',
        article: 'المادة 12',
        data_source: 'terms_and_conditions',
        condition: 'يُنصح بوجود صفحة الشروط والأحكام',
        result: found ? 'pass' : 'fail',
        explanation: found
          ? 'تم العثور على صفحة الشروط والأحكام'
          : 'لم يتم العثور على صفحة الشروط والأحكام',
        severity: 'warning',
        evidence: found ? `URL: ${data.terms_and_conditions.url}` : undefined,
      };
    },
  },
  
  {
    id: 'PDPL-ART6-THIRD-PARTY-TRACKERS',
    name: 'تقنيات التتبع من أطراف ثالثة',
    article: 'المادة 6',
    severity: 'warning',
    evaluate: (data: ScanExtractionResult): PDPLRuleResult => {
      const trackers = data.trackers;
      
      if (trackers.length === 0) {
        return {
          rule_id: 'PDPL-ART6-THIRD-PARTY-TRACKERS',
          rule_name: 'تقنيات التتبع من أطراف ثالثة',
          article: 'المادة 6',
          data_source: 'trackers',
          condition: 'يجب الإفصاح عن تقنيات التتبع المستخدمة',
          result: 'pass',
          explanation: 'لم يتم اكتشاف تقنيات تتبع',
          severity: 'warning',
        };
      }
      
      const hasProperConsent = data.cookie_banner.found && data.cookie_banner.consent_mechanism === 'opt_in';
      const hasPrivacyPolicy = data.privacy_policy.found;
      
      const trackerNames = trackers.map(t => t.name);
      const advertisingTrackers = trackers.filter(t => t.type === 'advertising');
      
      return {
        rule_id: 'PDPL-ART6-THIRD-PARTY-TRACKERS',
        rule_name: 'تقنيات التتبع من أطراف ثالثة',
        article: 'المادة 6',
        data_source: 'trackers, cookie_banner, privacy_policy',
        condition: 'يجب الإفصاح عن تقنيات التتبع والحصول على موافقة مسبقة',
        result: hasProperConsent && hasPrivacyPolicy ? 'pass' : 'fail',
        explanation: hasProperConsent && hasPrivacyPolicy
          ? `تم اكتشاف ${trackers.length} تقنية تتبع مع وجود آلية موافقة صحيحة`
          : `تم اكتشاف ${trackers.length} تقنية تتبع${advertisingTrackers.length > 0 ? ` (${advertisingTrackers.length} إعلانية)` : ''} - ${!hasProperConsent ? 'بدون موافقة صريحة' : ''} ${!hasPrivacyPolicy ? 'بدون سياسة خصوصية' : ''}`,
        severity: 'warning',
        evidence: `التقنيات: ${trackerNames.join(', ')}`,
      };
    },
  },
];

export function evaluateAllRules(data: ScanExtractionResult): {
  violations: PDPLRuleResult[];
  passed: PDPLRuleResult[];
  all: PDPLRuleResult[];
} {
  console.log('[RuleEngine] Evaluating PDPL rules...');
  
  const results: PDPLRuleResult[] = [];
  
  for (const rule of PDPL_RULES) {
    try {
      const result = rule.evaluate(data);
      results.push(result);
      console.log(`[RuleEngine] Rule ${rule.id}: ${result.result}`);
    } catch (error) {
      console.error(`[RuleEngine] Error evaluating rule ${rule.id}:`, error);
      results.push({
        rule_id: rule.id,
        rule_name: rule.name,
        article: rule.article,
        data_source: 'error',
        condition: 'خطأ في التقييم',
        result: 'unable_to_detect',
        explanation: `خطأ في تقييم القاعدة: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`,
        severity: rule.severity,
      });
    }
  }
  
  const violations = results.filter(r => r.result === 'fail');
  const passed = results.filter(r => r.result === 'pass');
  
  console.log(`[RuleEngine] Evaluation complete: ${passed.length} passed, ${violations.length} violations`);
  
  return { violations, passed, all: results };
}

export function calculateScore(ruleResults: PDPLRuleResult[]): {
  overall: number;
  breakdown: {
    privacy_policy_score: number;
    consent_score: number;
    security_score: number;
    transparency_score: number;
  };
  level: 'high' | 'medium' | 'low';
} {
  console.log('[Scoring] Calculating compliance score...');
  
  let score = 100;
  let privacyPolicyScore = 100;
  let consentScore = 100;
  let securityScore = 100;
  let transparencyScore = 100;
  
  const SEVERITY_WEIGHTS = {
    critical: 15,
    warning: 8,
    suggestion: 3,
  };
  
  for (const result of ruleResults) {
    if (result.result !== 'fail') continue;
    
    const weight = SEVERITY_WEIGHTS[result.severity];
    score -= weight;
    
    if (result.rule_id.includes('PRIVACY')) {
      privacyPolicyScore -= weight * 2;
    }
    if (result.rule_id.includes('CONSENT') || result.rule_id.includes('COOKIE')) {
      consentScore -= weight * 2;
    }
    if (result.rule_id.includes('SECURITY')) {
      securityScore -= weight * 2;
    }
    if (result.rule_id.includes('TRANSPARENCY') || result.rule_id.includes('CONTACT') || result.rule_id.includes('TRANSFER')) {
      transparencyScore -= weight * 2;
    }
  }
  
  score = Math.max(0, Math.min(100, score));
  privacyPolicyScore = Math.max(0, Math.min(100, privacyPolicyScore));
  consentScore = Math.max(0, Math.min(100, consentScore));
  securityScore = Math.max(0, Math.min(100, securityScore));
  transparencyScore = Math.max(0, Math.min(100, transparencyScore));
  
  let level: 'high' | 'medium' | 'low';
  if (score >= 80) {
    level = 'high';
  } else if (score >= 50) {
    level = 'medium';
  } else {
    level = 'low';
  }
  
  console.log(`[Scoring] Final score: ${score} (${level})`);
  
  return {
    overall: score,
    breakdown: {
      privacy_policy_score: privacyPolicyScore,
      consent_score: consentScore,
      security_score: securityScore,
      transparency_score: transparencyScore,
    },
    level,
  };
}

export { PDPL_RULES };
