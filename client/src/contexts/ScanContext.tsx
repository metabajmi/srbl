import { createContext, useContext, useState, ReactNode } from "react";
import { ComplianceScan } from "@shared/schema";

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

export function extractScanData(scan: ComplianceScan): ExtractedScanData {
  let extractedCompanyName = "";
  let extractedBusinessType = "";
  
  // Extract company name from URL
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
  
  // Determine business type from URL patterns
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
  
  return {
    websiteUrl: scan.url,
    companyName: extractedCompanyName,
    contactEmail: "",
    contactPhone: "",
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
  };
}
