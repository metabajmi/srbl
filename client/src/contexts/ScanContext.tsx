import { createContext, useContext, useState, ReactNode } from "react";
import { ComplianceScan } from "@shared/schema";

interface PolicyInsights {
  detectedEmails: string[];
  detectedPhones: string[];
  detectedDataTypes: string[];
  detectedCollectionMethods: string[];
  hasStorageInfo: boolean;
  storageLocation: "inside_ksa" | "outside_ksa" | null;
  hasRetentionInfo: boolean;
  retentionPeriod: "delete_immediately" | "specific_period" | "statutory_period" | null;
  hasDPO: boolean;
  dpoEmail: string | null;
  hasComplaintMechanism: boolean;
  hasDataSharing: boolean;
  dataSharingType: "no_sharing" | "service_providers" | "government_entities" | null;
  serviceDescription: string | null;
}

interface ExtractedScanData {
  websiteUrl: string;
  companyName: string;
  contactEmail: string;
  contactPhone: string;
  businessType: string;
  hasPrivacyPolicy: boolean;
  hasTermsAndConditions: boolean;
  hasCookieBanner: boolean;
  hasContactInfo: boolean;
  privacyPolicyUrl: string | null;
  termsAndConditionsUrl: string | null;
  overallScore: number;
  complianceLevel: string;
  scanId: string;
  scannedAt: string;
  policyInsights: PolicyInsights | null;
}

interface ScanContextType {
  scanData: ExtractedScanData | null;
  setScanData: (data: ExtractedScanData | null) => void;
  clearScanData: () => void;
  hasScanData: boolean;
}

const ScanContext = createContext<ScanContextType | undefined>(undefined);

const STORAGE_KEY = "sirbal_scan_data";

export function ScanProvider({ children }: { children: ReactNode }) {
  const [scanData, setScanDataState] = useState<ExtractedScanData | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const setScanData = (data: ExtractedScanData | null) => {
    setScanDataState(data);
    if (data) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const clearScanData = () => {
    setScanDataState(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <ScanContext.Provider value={{ 
      scanData, 
      setScanData, 
      clearScanData, 
      hasScanData: !!scanData 
    }}>
      {children}
    </ScanContext.Provider>
  );
}

export function useScanContext() {
  const context = useContext(ScanContext);
  if (context === undefined) {
    throw new Error("useScanContext must be used within a ScanProvider");
  }
  return context;
}

function extractEmailsFromText(text: string): string[] {
  if (!text) return [];
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const matches = text.match(emailRegex) || [];
  return Array.from(new Set(matches));
}

function extractPhonesFromText(text: string): string[] {
  if (!text) return [];
  const phonePatterns = [
    /\+966\s*\d{2,3}\s*\d{3}\s*\d{4}/g,
    /\+966\d{9}/g,
    /920\d{6}/g,
    /800\d{7}/g,
    /0\d{9}/g,
    /\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/g,
  ];
  const phones: string[] = [];
  for (const pattern of phonePatterns) {
    const matches = text.match(pattern) || [];
    phones.push(...matches);
  }
  return Array.from(new Set(phones.map(p => p.replace(/\s+/g, ''))));
}

function detectDataTypesFromKeywords(keywords: string[], evidence: string): string[] {
  const dataTypes: string[] = [];
  const combined = (keywords.join(' ') + ' ' + evidence).toLowerCase();
  
  if (combined.includes('اسم') || combined.includes('هوية') || combined.includes('identity') || combined.includes('name')) {
    dataTypes.push('identity');
  }
  if (combined.includes('بريد') || combined.includes('هاتف') || combined.includes('عنوان') || 
      combined.includes('email') || combined.includes('phone') || combined.includes('contact') || combined.includes('تواصل')) {
    dataTypes.push('contact');
  }
  if (combined.includes('مالي') || combined.includes('بنك') || combined.includes('دفع') || 
      combined.includes('financial') || combined.includes('payment') || combined.includes('bank')) {
    dataTypes.push('financial');
  }
  if (combined.includes('موقع') || combined.includes('gps') || combined.includes('location')) {
    dataTypes.push('location');
  }
  if (combined.includes('كوكيز') || combined.includes('ip') || combined.includes('cookie') || 
      combined.includes('تقني') || combined.includes('technical') || combined.includes('ارتباط')) {
    dataTypes.push('technical');
  }
  if (combined.includes('صحي') || combined.includes('حساس') || combined.includes('health') || combined.includes('sensitive')) {
    dataTypes.push('sensitive');
  }
  
  return Array.from(new Set(dataTypes));
}

function extractCleanServiceDescription(evidence: string): string {
  if (!evidence || evidence.length < 20) return '';
  
  let cleaned = evidence
    .replace(/^\.\.\./g, '')
    .replace(/\.\.\.$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  const arabicSentenceEnd = /[.。،؛!\?؟]/g;
  const englishSentenceEnd = /[.!?]/g;
  
  const hasArabic = /[\u0600-\u06FF]/.test(cleaned);
  const sentenceEndings = hasArabic ? 
    [...cleaned.matchAll(arabicSentenceEnd)].map(m => m.index || 0) :
    [...cleaned.matchAll(englishSentenceEnd)].map(m => m.index || 0);
  
  let endIndex = cleaned.length;
  for (const idx of sentenceEndings) {
    if (idx >= 50 && idx <= 250) {
      endIndex = idx + 1;
      break;
    }
  }
  
  if (endIndex > 250) {
    const lastSpace = cleaned.lastIndexOf(' ', 250);
    endIndex = lastSpace > 100 ? lastSpace : 250;
  }
  
  let result = cleaned.substring(0, endIndex).trim();
  
  if (result !== cleaned && !result.match(/[.。،؛!\?؟]$/)) {
    result = result + '...';
  }
  
  return result;
}

function detectCollectionMethods(keywords: string[], evidence: string): string[] {
  const methods: string[] = [];
  const combined = (keywords.join(' ') + ' ' + evidence).toLowerCase();
  
  if (combined.includes('نموذج') || combined.includes('تسجيل') || combined.includes('form') || 
      combined.includes('مباشر') || combined.includes('direct') || combined.includes('register')) {
    methods.push('direct');
  }
  if (combined.includes('كوكيز') || combined.includes('آلي') || combined.includes('cookie') || 
      combined.includes('automatic') || combined.includes('تتبع') || combined.includes('tracking')) {
    methods.push('automated');
  }
  if (combined.includes('طرف ثالث') || combined.includes('third party') || combined.includes('شريك')) {
    methods.push('third_party');
  }
  
  return Array.from(new Set(methods));
}

function detectStorageLocation(keywords: string[], evidence: string): "inside_ksa" | "outside_ksa" | null {
  const combined = (keywords.join(' ') + ' ' + evidence).toLowerCase();
  
  if (combined.includes('خارج المملكة') || combined.includes('outside saudi') || 
      combined.includes('دولي') || combined.includes('international') || combined.includes('خارج السعودية')) {
    return 'outside_ksa';
  }
  if (combined.includes('داخل المملكة') || combined.includes('inside saudi') || 
      combined.includes('السعودية') || combined.includes('محلي')) {
    return 'inside_ksa';
  }
  return null;
}

function detectRetentionPeriod(keywords: string[], evidence: string): "delete_immediately" | "specific_period" | "statutory_period" | null {
  const combined = (keywords.join(' ') + ' ' + evidence).toLowerCase();
  
  if (combined.includes('فور') || combined.includes('immediately') || combined.includes('حذف مباشر')) {
    return 'delete_immediately';
  }
  if (combined.includes('سنة') || combined.includes('شهر') || combined.includes('year') || 
      combined.includes('month') || combined.includes('مدة محددة') || /\d+\s*(سنة|شهر|يوم)/.test(combined)) {
    return 'specific_period';
  }
  if (combined.includes('نظام') || combined.includes('قانون') || combined.includes('statutory') || 
      combined.includes('legal') || combined.includes('تنظيمي')) {
    return 'statutory_period';
  }
  return null;
}

function detectDataSharing(keywords: string[], evidence: string): "no_sharing" | "service_providers" | "government_entities" | null {
  const combined = (keywords.join(' ') + ' ' + evidence).toLowerCase();
  
  if (combined.includes('لا نشارك') || combined.includes('no sharing') || combined.includes('لا نفصح')) {
    return 'no_sharing';
  }
  if (combined.includes('جهات حكومية') || combined.includes('government') || 
      combined.includes('الجهات المختصة') || combined.includes('السلطات')) {
    return 'government_entities';
  }
  if (combined.includes('مزود') || combined.includes('شريك') || combined.includes('service provider') || 
      combined.includes('third party') || combined.includes('طرف ثالث')) {
    return 'service_providers';
  }
  return null;
}

function extractPolicyInsights(scan: ComplianceScan): PolicyInsights | null {
  const analysisResult = scan.analysisResult as any;
  if (!analysisResult) return null;
  
  const ppAudit = analysisResult.privacy_policy_audit || 
                  analysisResult.document_audits?.find((d: any) => d.type === 'privacy')?.privacyPolicyAudit;
  
  if (!ppAudit?.elements) return null;
  
  const elements = ppAudit.elements as Array<{
    id: string;
    number: number;
    statusEn: string;
    evidence: string;
    matchedKeywords: string[];
  }>;
  
  const insights: PolicyInsights = {
    detectedEmails: [],
    detectedPhones: [],
    detectedDataTypes: [],
    detectedCollectionMethods: [],
    hasStorageInfo: false,
    storageLocation: null,
    hasRetentionInfo: false,
    retentionPeriod: null,
    hasDPO: false,
    dpoEmail: null,
    hasComplaintMechanism: false,
    hasDataSharing: false,
    dataSharingType: null,
    serviceDescription: null,
  };
  
  for (const el of elements) {
    const isFound = el.statusEn === 'FOUND' || el.statusEn === 'PARTIAL';
    const evidence = el.evidence || '';
    const keywords = el.matchedKeywords || [];
    
    switch (el.id) {
      case 'element_1':
        if (isFound) {
          insights.detectedEmails.push(...extractEmailsFromText(evidence));
          insights.detectedPhones.push(...extractPhonesFromText(evidence));
        }
        break;
        
      case 'element_3':
        if (isFound) {
          insights.detectedDataTypes.push(...detectDataTypesFromKeywords(keywords, evidence));
        }
        break;
        
      case 'element_4':
        if (isFound) {
          insights.detectedCollectionMethods.push(...detectCollectionMethods(keywords, evidence));
          if (evidence.length > 20) {
            insights.serviceDescription = extractCleanServiceDescription(evidence);
          }
        }
        break;
        
      case 'element_6':
        if (isFound) {
          insights.hasDataSharing = true;
          insights.dataSharingType = detectDataSharing(keywords, evidence);
        }
        break;
        
      case 'element_8':
        if (isFound) {
          insights.hasStorageInfo = true;
          insights.hasRetentionInfo = true;
          insights.storageLocation = detectStorageLocation(keywords, evidence);
          insights.retentionPeriod = detectRetentionPeriod(keywords, evidence);
        }
        break;
        
      case 'element_10':
        if (isFound) {
          insights.hasDPO = true;
          const dpoEmails = extractEmailsFromText(evidence);
          if (dpoEmails.length > 0) {
            insights.dpoEmail = dpoEmails[0];
          }
        }
        break;
        
      case 'element_11':
        if (isFound) {
          insights.hasComplaintMechanism = true;
        }
        break;
    }
  }
  
  insights.detectedEmails = Array.from(new Set(insights.detectedEmails));
  insights.detectedPhones = Array.from(new Set(insights.detectedPhones));
  insights.detectedDataTypes = Array.from(new Set(insights.detectedDataTypes));
  insights.detectedCollectionMethods = Array.from(new Set(insights.detectedCollectionMethods));
  
  return insights;
}

export function extractScanData(scan: ComplianceScan): ExtractedScanData {
  let extractedCompanyName = "";
  let extractedBusinessType = "";
  
  try {
    const url = new URL(scan.url);
    const hostname = url.hostname.replace("www.", "");
    const domainParts = hostname.split(".");
    extractedCompanyName = domainParts[0]
      .split(/[-_]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  } catch {
    extractedCompanyName = "";
  }
  
  const urlLower = scan.url.toLowerCase();
  if (urlLower.includes("jarir") || urlLower.includes("shop") || urlLower.includes("store") || urlLower.includes("buy") || urlLower.includes("cart")) {
    extractedBusinessType = "ecommerce_general";
  } else if (urlLower.includes("bank") || urlLower.includes("finance")) {
    extractedBusinessType = "financial_services";
  } else if (urlLower.includes("health") || urlLower.includes("clinic") || urlLower.includes("hospital")) {
    extractedBusinessType = "healthcare";
  } else if (urlLower.includes("service") || urlLower.includes("consult") || urlLower.includes("agency")) {
    extractedBusinessType = "digital_services";
  } else if (urlLower.includes("tech") || urlLower.includes("app") || urlLower.includes("software")) {
    extractedBusinessType = "technology";
  } else {
    extractedBusinessType = "ecommerce_general";
  }
  
  const policyInsights = extractPolicyInsights(scan);
  
  const contactEmail = policyInsights?.detectedEmails[0] || "";
  const contactPhone = policyInsights?.detectedPhones[0] || "";
  
  return {
    websiteUrl: scan.url,
    companyName: extractedCompanyName,
    contactEmail,
    contactPhone,
    businessType: extractedBusinessType,
    hasPrivacyPolicy: scan.hasPrivacyPolicy || false,
    hasTermsAndConditions: scan.hasTermsAndConditions || false,
    hasCookieBanner: scan.hasCookieBanner || false,
    hasContactInfo: scan.hasContactInfo || false,
    privacyPolicyUrl: scan.privacyPolicyUrl || null,
    termsAndConditionsUrl: scan.termsAndConditionsUrl || null,
    overallScore: scan.overallScore || 0,
    complianceLevel: scan.complianceLevel || "low",
    scanId: scan.id,
    scannedAt: scan.createdAt ? new Date(scan.createdAt).toISOString() : new Date().toISOString(),
    policyInsights,
  };
}
