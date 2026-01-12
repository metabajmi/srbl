import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Shield, AlertCircle, AlertTriangle, CheckCircle, XCircle, Globe, RefreshCw, FileText, ScrollText, ExternalLink, ClipboardList, ChevronDown, ChevronUp, Lock, Unlock } from "lucide-react";
import { ComplianceScan, ComplianceIssue } from "@shared/schema";
import { useState, useEffect, useRef } from "react";
import { BackButton } from "@/components/BackButton";
import { useScanContext, extractScanData } from "@/contexts/ScanContext";
import { OTPModal } from "@/components/OTPModal";

// Check if user is authenticated
const isAuthenticated = (): boolean => {
  try {
    const userStr = localStorage.getItem("user");
    if (userStr && userStr !== "undefined" && userStr !== "null") {
      const user = JSON.parse(userStr);
      return !!user.id;
    }
  } catch (e) {
    return false;
  }
  return false;
};

// Arabic number grammar helper for proper singular/dual/plural forms
const formatArabicCount = (count: number, singular: string, dual: string, plural: string): string => {
  if (count === 0) return `لا يوجد ${plural}`;
  if (count === 1) return `${singular} واحد`;
  if (count === 2) return `${dual}`;
  if (count >= 3 && count <= 10) return `${count} ${plural}`;
  // For 11+ use singular form per Arabic grammar
  return `${count} ${singular}`;
};

// Specific formatters for common terms
const formatMissingItems = (count: number): string => {
  if (count === 0) return 'لا توجد عناصر مفقودة';
  if (count === 1) return 'عنصر مفقود واحد';
  if (count === 2) return 'عنصران مفقودان';
  if (count >= 3 && count <= 10) return `${count} عناصر مفقودة`;
  return `${count} عنصر مفقود`;
};

const formatDeficiencies = (count: number): string => {
  if (count === 0) return 'لا يوجد نقص';
  if (count === 1) return 'نقص واحد';
  if (count === 2) return 'نقصان';
  if (count >= 3 && count <= 10) return `${count} حالات نقص`;
  return `${count} حالة نقص`;
};

// SHARED: Calculate compliance percentage from Privacy Policy 12 elements ONLY
// This is the SINGLE source of truth for percentage - same before and after login
// Scoring: found/present = 1, partial = 0.5, missing = 0
// percentage = round((total_score / 12) * 100)
const calculateCompliancePercentage = (ppAudit: any): number => {
  if (!ppAudit) {
    return 0; // No Privacy Policy = 0%
  }
  
  // Use aggregate counts from ppAudit (elementsFound, elementsPartial)
  // These are pre-calculated by the backend scanner
  const found = ppAudit.elementsFound || 0;
  const partial = ppAudit.elementsPartial || 0;
  
  // Scoring: found = 1 point, partial = 0.5 point
  const totalScore = found + (partial * 0.5);
  
  return Math.round((totalScore / 12) * 100);
};

// SHARED: Get compliance level label based on percentage ranges
// < 25: امتثال ضعيف جدًا
// 25-49: امتثال ضعيف
// 50-74: امتثال متوسط
// >= 75: امتثال عالي
const getComplianceLevelLabel = (percentage: number): string => {
  if (percentage < 25) return 'امتثال ضعيف جدًا';
  if (percentage < 50) return 'امتثال ضعيف';
  if (percentage < 75) return 'امتثال متوسط';
  return 'امتثال عالي';
};

// Get compliance level for styling (low/medium/high)
const getComplianceLevelStyle = (percentage: number): 'low' | 'medium' | 'high' => {
  if (percentage < 50) return 'low';
  if (percentage < 75) return 'medium';
  return 'high';
};

export default function ScanResultsPage() {
  const [, params] = useRoute("/scan/:id");
  const scanId = params?.id;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [autoRefresh, setAutoRefresh] = useState(true);
  const { setScanData } = useScanContext();
  const [scanProgress, setScanProgress] = useState(0);
  const scanStartTimeRef = useRef<number | null>(null);
  const SCAN_DURATION_MS = 15000; // ~15 seconds estimated scan time (Privacy-Only mode)
  
  // Check authentication state (reactive to storage changes)
  const [isLoggedIn, setIsLoggedIn] = useState(isAuthenticated());
  const [showOTPModal, setShowOTPModal] = useState(false);
  
  useEffect(() => {
    // Re-check auth status when component mounts or storage changes
    const checkAuth = () => setIsLoggedIn(isAuthenticated());
    window.addEventListener('storage', checkAuth);
    return () => window.removeEventListener('storage', checkAuth);
  }, []);

  // Handle successful OTP verification
  const handleOTPSuccess = (user: any, claimedScanId?: string | null) => {
    // Save user to localStorage for global authentication
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    }
    
    // Update local auth state
    setIsLoggedIn(true);
    
    // Trigger storage event for other components to detect auth change
    window.dispatchEvent(new Event("storage"));
    
    // Refetch issues and scan data now that user is authenticated
    refetch();
    refetchIssues();
    toast({
      title: "مرحباً بك!",
      description: "تم التحقق بنجاح. يمكنك الآن مشاهدة تفاصيل المخالفات.",
    });
  };

  const { data: scan, isLoading: scanLoading, refetch } = useQuery({
    queryKey: ["/api/scans", scanId],
    queryFn: async () => {
      const response = await fetch(`/api/scans/${scanId}`);
      if (!response.ok) throw new Error("Failed to fetch scan");
      return response.json() as Promise<ComplianceScan>;
    },
    enabled: !!scanId,
    refetchInterval: (query) => {
      const scanData = query.state.data;
      if (!autoRefresh) return false;
      if (scanData?.status === "pending" || scanData?.status === "scanning") {
        return 2000;
      }
      return false;
    },
  });

  const { data: issues = [], refetch: refetchIssues, isError: issuesError } = useQuery({
    queryKey: ["/api/scans", scanId, "issues"],
    queryFn: async () => {
      const response = await fetch(`/api/scans/${scanId}/issues`);
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Unauthorized");
        }
        throw new Error("Failed to fetch issues");
      }
      return response.json() as Promise<ComplianceIssue[]>;
    },
    enabled: !!scanId && scan?.status === "completed" && isLoggedIn,
    retry: false, // Don't retry 401 errors
  });

  const lastProcessedScanRef = useRef<string | null>(null);

  useEffect(() => {
    if (scan?.status === "completed" && scan.id && lastProcessedScanRef.current !== scan.id) {
      lastProcessedScanRef.current = scan.id;
      refetchIssues();
      const extractedData = extractScanData(scan);
      setScanData(extractedData);
    }
  }, [scan?.status, scan?.id, refetchIssues, setScanData]);

  // Animate progress bar during scan
  useEffect(() => {
    const isScanning = scan?.status === "pending" || scan?.status === "scanning";
    
    if (isScanning) {
      if (!scanStartTimeRef.current) {
        scanStartTimeRef.current = Date.now();
      }
      
      const interval = setInterval(() => {
        const elapsed = Date.now() - (scanStartTimeRef.current || Date.now());
        const progress = Math.min((elapsed / SCAN_DURATION_MS) * 95, 95);
        setScanProgress(progress);
      }, 100);

      return () => clearInterval(interval);
    } else if (scan?.status === "completed") {
      setScanProgress(100);
      scanStartTimeRef.current = null;
    }
  }, [scan?.status]);

  const rescanMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/scans", { url: scan?.url });
      return await response.json();
    },
    onSuccess: (data) => {
      toast({ title: "جاري إعادة الفحص", description: "تم بدء فحص جديد..." });
      setLocation(`/scan/${data.id}`);
    },
    onError: () => {
      toast({ title: "خطأ", description: "فشل في إعادة الفحص", variant: "destructive" });
    },
  });

  const navigateToTool = (tool: "privacy" | "terms") => {
    const routes = {
      privacy: "/workspace?tab=privacy&from=scan",
      terms: "/workspace?tab=terms&from=scan",
    };
    setLocation(routes[tool]);
  };

  // Note: Individual issues list is NOT displayed after login per requirements
  // The issues data is only used for the API/data layer, not for UI rendering

  // PRE-LOGIN: Calculate violations based on Privacy Policy 12 elements ONLY
  // Per requirements: Violations = MISSING elements only
  // PARTIAL elements are classified as "Missing" for pre-login display (not counted as violations)
  const getPreLoginViolationCount = (): number => {
    const ppAudit = (scan as any)?.analysisResult?.privacy_policy_audit || 
                    (scan as any)?.analysisResult?.document_audits?.find((d: any) => d.type === 'privacy')?.privacyPolicyAudit;
    if (!ppAudit) return 0;
    // Violations = MISSING elements only (PARTIAL classified as "Missing" in display, not violations)
    return ppAudit.elementsMissing || 0;
  };

  // For pre-login display: count of items shown as "Missing" (includes both MISSING and PARTIAL)
  const getPreLoginMissingItemsCount = (): number => {
    const ppAudit = (scan as any)?.analysisResult?.privacy_policy_audit || 
                    (scan as any)?.analysisResult?.document_audits?.find((d: any) => d.type === 'privacy')?.privacyPolicyAudit;
    if (!ppAudit) return 0;
    // For pre-login: PARTIAL elements are also shown as "Missing" 
    return (ppAudit.elementsMissing || 0) + (ppAudit.elementsPartial || 0);
  };

  const preLoginViolationCount = getPreLoginViolationCount();
  const preLoginMissingItemsCount = getPreLoginMissingItemsCount();

  if (scanLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Globe className="w-12 h-12 animate-spin text-primary" />
          <p className="text-lg font-medium">جاري تحميل النتائج...</p>
        </div>
      </div>
    );
  }

  if (!scan) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="pt-6 text-center">
            <XCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <p className="text-lg font-medium mb-4">لم يتم العثور على الفحص</p>
            <Button onClick={() => setLocation("/")} data-testid="button-home">
              العودة للرئيسية
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
        <div className="container flex h-14 items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BackButton />
            <Shield className="w-6 h-6 text-primary" />
            <span className="font-bold hidden sm:inline">نتائج الفحص</span>
          </div>
          <div className="flex items-center gap-2">
            {scan.status === "completed" && (
              <Button 
                size="sm"
                onClick={() => rescanMutation.mutate()}
                disabled={rescanMutation.isPending}
                data-testid="button-rescan-header"
              >
                <RefreshCw className={`h-4 w-4 ml-1 ${rescanMutation.isPending ? 'animate-spin' : ''}`} />
                إعادة الفحص
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => setLocation("/")} data-testid="button-new-scan">
              فحص جديد
            </Button>
          </div>
        </div>
      </header>

      <div className="container py-6 max-w-4xl">
        
        {/* Scanning Progress with animated progress bar - Compact & Centered */}
        {(scan.status === "pending" || scan.status === "scanning") && (
          <ScanLoadingState url={scan.url} progress={scanProgress} />
        )}

        {/* Results */}
        {scan.status === "completed" && (
          <>
            {/* Score Card - SAME percentage before AND after login (Privacy Policy 12 elements only) */}
            {(() => {
              // SHARED: Get Privacy Policy audit from scan data
              const ppAudit = (scan as any)?.analysisResult?.privacy_policy_audit || 
                              (scan as any)?.analysisResult?.document_audits?.find((d: any) => d.type === 'privacy')?.privacyPolicyAudit;
              
              // SHARED: Calculate percentage using Privacy Policy 12 elements ONLY
              // Same calculation for pre-login AND post-login
              const displayScore = calculateCompliancePercentage(ppAudit);
              const displayLevel = getComplianceLevelStyle(displayScore);
              const complianceLabel = getComplianceLevelLabel(displayScore);
              
              return (
                <Card className="mb-6">
                  <CardContent className="pt-6">
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                      {/* Score Circle - Same percentage before and after login */}
                      <div className={`w-28 h-28 rounded-full border-8 flex items-center justify-center flex-shrink-0 ${
                        displayLevel === 'high' ? 'border-green-500 bg-green-50 dark:bg-green-950' :
                        displayLevel === 'medium' ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950' :
                        'border-red-500 bg-red-50 dark:bg-red-950'
                      }`}>
                        <div className="text-center">
                          <div className={`text-3xl font-bold ${
                            displayLevel === 'high' ? 'text-green-600' :
                            displayLevel === 'medium' ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {displayScore}%
                          </div>
                        </div>
                      </div>
                      
                      {/* Info - Compliance level label is the SAME before and after login */}
                      <div className="flex-1 text-center sm:text-right">
                        <h2 className="text-2xl font-bold mb-1">{complianceLabel}</h2>
                        <p className="text-muted-foreground text-sm" dir="ltr">{scan.url}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })()}

            {/* Quick Status - 2 Elements (Privacy Policy + Terms & Conditions) */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <PrivacyPolicyStatusCard 
                title="سياسة الخصوصية" 
                found={!!scan.hasPrivacyPolicy} 
                url={scan.privacyPolicyUrl}
                audit={(scan as any).analysisResult?.privacy_policy_audit || (scan as any).analysisResult?.document_audits?.find((d: any) => d.type === 'privacy')?.privacyPolicyAudit}
                testId="card-status-privacy"
                isPreLogin={!isLoggedIn}
              />
              {/* Pre-login: Show Terms as just "Incomplete" - no numbers */}
              {!isLoggedIn ? (
                <Card className="p-3 border-orange-300 bg-orange-50/50 dark:bg-orange-950/20" data-testid="card-status-terms">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">الشروط والأحكام</p>
                      <p className="text-xs mt-0.5 text-orange-600">غير مكتملة</p>
                    </div>
                  </div>
                </Card>
              ) : (
                <TermsConditionsStatusCard 
                  title="الشروط والأحكام" 
                  found={!!scan.hasTermsAndConditions} 
                  url={scan.termsAndConditionsUrl}
                  audit={(() => {
                    const tcAudit = (scan as any).analysisResult?.terms_conditions_audit || 
                                    (scan as any).analysisResult?.document_audits?.find((d: any) => d.type === 'terms')?.termsConditionsAudit;
                    return tcAudit;
                  })()}
                  testId="card-status-terms"
                />
              )}
            </div>

            {/* Privacy Policy 12-Element Audit - Only for authenticated users */}
            {isLoggedIn && (() => {
              const ppAudit = (scan as any).analysisResult?.privacy_policy_audit || 
                              (scan as any).analysisResult?.document_audits?.find((d: any) => d.type === 'privacy')?.privacyPolicyAudit;
              return ppAudit && ppAudit.elements && ppAudit.elements.length > 0 ? (
                <PrivacyPolicyAuditCard audit={ppAudit} />
              ) : null;
            })()}
            
            {/* Terms & Conditions 12-Module Audit - Only for authenticated users */}
            {isLoggedIn && (() => {
              const tcAudit = (scan as any).analysisResult?.terms_conditions_audit || 
                              (scan as any).analysisResult?.document_audits?.find((d: any) => d.type === 'terms')?.termsConditionsAudit;
              return tcAudit && tcAudit.modules && tcAudit.modules.length > 0 ? (
                <TermsConditionsAuditCard audit={tcAudit} />
              ) : null;
            })()}

            {/* Identity Check CTA - Only for non-authenticated users */}
            {/* Post-login: Issues list section is COMPLETELY REMOVED per requirements */}
            {!isLoggedIn && (
              <Card className="mb-6 border-primary/30 relative overflow-hidden">
                <CardContent className="pt-6">
                  {/* Blurred preview of issues (decorative) */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="p-6 blur-sm opacity-30">
                      <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="border rounded-lg p-3">
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-full bg-red-100" />
                              <div className="flex-1">
                                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                                <div className="h-3 bg-gray-100 rounded w-full" />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {/* Overlay CTA - Arabic text per specifications */}
                  <div className="relative z-10 text-center py-8 bg-gradient-to-b from-background/80 via-background to-background/80 rounded-lg">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <Lock className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">تحقّق من هويتك للاطّلاع على التفاصيل</h3>
                    <p className="text-muted-foreground mb-1">
                      تم رصد بعض أوجه النقص
                    </p>
                    <p className="text-sm text-muted-foreground mb-6">
                      أدخل بريدك الإلكتروني فقط — دون كلمة مرور
                    </p>
                    <Button 
                      onClick={() => setShowOTPModal(true)} 
                      size="lg" 
                      className="min-w-[200px]"
                      data-testid="button-unlock-violations"
                    >
                      <Unlock className="h-5 w-5 ml-2" />
                      عرض التفاصيل
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions - Only visible to authenticated users */}
            {isLoggedIn && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">الخطوات التالية</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <ActionButton 
                      title="سياسة الخصوصية"
                      description={scan.hasPrivacyPolicy ? "تحسين" : "إنشاء"}
                      icon={<FileText className="w-5 h-5" />}
                      needed={!scan.hasPrivacyPolicy}
                      onClick={() => navigateToTool("privacy")}
                      testId="button-action-privacy"
                    />
                    <ActionButton 
                      title="الشروط والأحكام"
                      description={scan.hasTermsAndConditions ? "تحسين" : "إنشاء"}
                      icon={<ScrollText className="w-5 h-5" />}
                      needed={!scan.hasTermsAndConditions}
                      onClick={() => navigateToTool("terms")}
                      testId="button-action-terms"
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Failed State */}
        {scan.status === "failed" && (
          <Card>
            <CardContent className="pt-6 text-center">
              <XCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">فشل الفحص</h2>
              <p className="text-muted-foreground mb-4">تعذر الوصول للموقع أو فحصه</p>
              <Button onClick={() => rescanMutation.mutate()} disabled={rescanMutation.isPending}>
                <RefreshCw className={`h-4 w-4 ml-2 ${rescanMutation.isPending ? 'animate-spin' : ''}`} />
                إعادة المحاولة
              </Button>
            </CardContent>
          </Card>
        )}

      </div>

      {/* OTP Authentication Modal */}
      <OTPModal 
        open={showOTPModal} 
        onOpenChange={setShowOTPModal}
        onSuccess={handleOTPSuccess}
      />
    </div>
  );
}

// Simple Status Card Component - Colors based on status (not green for found)
function StatusCard({ title, found, url, required, issueCount = 0, testId }: { 
  title: string; 
  found: boolean; 
  url?: string | null; 
  required?: boolean;
  issueCount?: number;
  testId?: string;
}) {
  // Determine card style based on status
  // Missing required → red, Missing optional → orange, Found with issues → orange, Found clean → neutral gray
  const getCardStyle = () => {
    if (!found) {
      return required 
        ? 'border-red-300 bg-red-50/50 dark:bg-red-950/20' 
        : 'border-orange-300 bg-orange-50/50 dark:bg-orange-950/20';
    }
    // Found - use neutral gray (not green since we don't know if content is good)
    if (issueCount > 0) {
      return 'border-orange-300 bg-orange-50/50 dark:bg-orange-950/20';
    }
    return 'border-border bg-muted/30';
  };

  const getIcon = () => {
    if (!found) {
      return required 
        ? <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
        : <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0" />;
    }
    if (issueCount > 0) {
      return <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0" />;
    }
    return <CheckCircle className="w-5 h-5 text-muted-foreground flex-shrink-0" />;
  };

  return (
    <Card className={`p-3 ${getCardStyle()}`} data-testid={testId}>
      <div className="flex items-center gap-2">
        {getIcon()}
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{title}</p>
          {found && url && (
            <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
              <ExternalLink className="w-3 h-3" />
              عرض
            </a>
          )}
          {found && issueCount > 0 && (
            <p className="text-xs text-orange-600">{issueCount} مخالفة</p>
          )}
          {!found && (
            <p className={`text-xs ${required ? 'text-red-600' : 'text-orange-600'}`}>
              {required ? 'مطلوب' : 'موصى به'}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

// Simple Issue Item Component
function IssueItem({ issue }: { issue: ComplianceIssue }) {
  const isCritical = issue.severity === "critical";
  // Post-login: Use مخالفة for critical (MISSING), نقص for warning (PARTIAL)
  // NO تحذير label should appear
  const severityLabel = isCritical ? 'مخالفة' : 'نقص';
  
  return (
    <div className={`p-3 rounded-lg border ${isCritical ? 'border-red-200 bg-red-50/50 dark:bg-red-950/20' : 'border-orange-200 bg-orange-50/50 dark:bg-orange-950/20'}`}>
      <div className="flex items-start gap-2">
        {isCritical ? (
          <XCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
        ) : (
          <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-sm">{issue.title}</p>
            <Badge 
              variant={isCritical ? "destructive" : "outline"} 
              className={`text-xs ${!isCritical ? 'border-orange-500 text-orange-600' : ''}`}
            >
              {severityLabel}
            </Badge>
          </div>
          {issue.remediation && (
            <p className="text-xs text-muted-foreground mt-1">
              <span className="font-medium text-primary">الحل:</span> {issue.remediation}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// Simple Action Button Component
function ActionButton({ title, description, icon, needed, onClick, testId }: { 
  title: string; 
  description: string; 
  icon: JSX.Element;
  needed: boolean;
  onClick: () => void;
  testId: string;
}) {
  return (
    <Button 
      variant={needed ? "default" : "outline"} 
      className="h-auto py-3 flex-col gap-1"
      onClick={onClick}
      data-testid={testId}
    >
      {icon}
      <span className="font-medium">{description} {title}</span>
    </Button>
  );
}

// Privacy Policy Status Card with 12-Element Audit Status
function PrivacyPolicyStatusCard({ title, found, url, audit, testId, isPreLogin = false }: { 
  title: string; 
  found: boolean; 
  url?: string | null; 
  audit?: {
    isComplete: boolean;
    elementsFound: number;
    elementsPartial: number;
    elementsMissing: number;
  };
  testId?: string;
  isPreLogin?: boolean;
}) {
  // Determine status based on audit results
  // For pre-login: PARTIAL elements are classified as "Missing" (shown in red/incomplete)
  // Red: Policy not found OR missing/partial elements
  // Orange: All found but some need improvement (partial) - post-login only
  // Green: All 12 elements complete
  const getStatus = () => {
    if (!found) return 'missing';
    if (!audit) return 'unknown';
    // Pre-login: PARTIAL and MISSING both treated as incomplete
    if (isPreLogin) {
      if (audit.elementsMissing > 0 || audit.elementsPartial > 0) return 'incomplete'; // Red
      return 'complete'; // Green only if all 12 are FOUND
    }
    // Post-login: normal status logic
    if (audit.elementsMissing > 0) return 'incomplete'; // Red
    if (audit.elementsPartial > 0) return 'needs_improvement'; // Orange
    if (audit.isComplete) return 'complete'; // Green
    return 'incomplete';
  };

  const status = getStatus();

  const getCardStyle = () => {
    switch (status) {
      case 'missing':
      case 'incomplete':
        return 'border-red-300 bg-red-50/50 dark:bg-red-950/20';
      case 'needs_improvement':
        return 'border-orange-300 bg-orange-50/50 dark:bg-orange-950/20';
      case 'complete':
        return 'border-green-300 bg-green-50/50 dark:bg-green-950/20';
      default:
        return 'border-border bg-muted/30';
    }
  };

  const getIcon = () => {
    switch (status) {
      case 'missing':
      case 'incomplete':
        return <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />;
      case 'needs_improvement':
        return <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0" />;
      case 'complete':
        return <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />;
      default:
        return <AlertCircle className="w-5 h-5 text-muted-foreground flex-shrink-0" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'missing': return 'غير موجودة';
      case 'incomplete': return 'غير مكتملة';
      case 'needs_improvement': return 'تحتاج تحسين';
      case 'complete': return 'مكتملة';
      default: return 'غير محدد';
    }
  };

  return (
    <Card className={`p-3 ${getCardStyle()}`} data-testid={testId}>
      <div className="flex items-center gap-2">
        {getIcon()}
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{title}</p>
          {found && url && (
            <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
              <span className="truncate max-w-[100px]">عرض</span>
              <ExternalLink className="w-3 h-3 flex-shrink-0" />
            </a>
          )}
          <p className={`text-xs mt-0.5 ${
            status === 'complete' ? 'text-green-600' : 
            status === 'needs_improvement' ? 'text-orange-600' : 
            'text-red-600'
          }`}>
            {getStatusText()}
          </p>
        </div>
      </div>
    </Card>
  );
}

// Terms & Conditions Status Card with 12-Module Audit Status
function TermsConditionsStatusCard({ title, found, url, audit, testId }: { 
  title: string; 
  found: boolean; 
  url?: string | null; 
  audit?: {
    isComplete: boolean;
    modulesFound: number;
    modulesPartial: number;
    modulesMissing: number;
  };
  testId?: string;
}) {
  // Determine status based on audit results
  // Red: T&C not found OR missing modules
  // Orange: All found but some need improvement (partial)
  // Green: All 12 modules complete
  const getStatus = () => {
    if (!found) return 'missing';
    if (!audit) return 'unknown';
    if (audit.modulesMissing > 0) return 'incomplete'; // Red
    if (audit.modulesPartial > 0) return 'needs_improvement'; // Orange
    if (audit.isComplete) return 'complete'; // Green
    return 'incomplete';
  };

  const status = getStatus();

  const getCardStyle = () => {
    switch (status) {
      case 'missing':
      case 'incomplete':
        return 'border-red-300 bg-red-50/50 dark:bg-red-950/20';
      case 'needs_improvement':
        return 'border-orange-300 bg-orange-50/50 dark:bg-orange-950/20';
      case 'complete':
        return 'border-green-300 bg-green-50/50 dark:bg-green-950/20';
      default:
        return 'border-border bg-muted/30';
    }
  };

  const getIcon = () => {
    switch (status) {
      case 'missing':
      case 'incomplete':
        return <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />;
      case 'needs_improvement':
        return <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0" />;
      case 'complete':
        return <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />;
      default:
        return <AlertCircle className="w-5 h-5 text-muted-foreground flex-shrink-0" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'missing': return 'غير موجودة';
      case 'incomplete': return 'غير مكتملة';
      case 'needs_improvement': return 'تحتاج تحسين';
      case 'complete': return 'مكتملة';
      default: return 'غير محدد';
    }
  };

  return (
    <Card className={`p-3 ${getCardStyle()}`} data-testid={testId}>
      <div className="flex items-center gap-2">
        {getIcon()}
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{title}</p>
          {found && url && (
            <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
              <span className="truncate max-w-[100px]">عرض</span>
              <ExternalLink className="w-3 h-3 flex-shrink-0" />
            </a>
          )}
          <p className={`text-xs mt-0.5 ${
            status === 'complete' ? 'text-green-600' : 
            status === 'needs_improvement' ? 'text-orange-600' : 
            'text-red-600'
          }`}>
            {getStatusText()}
          </p>
        </div>
      </div>
    </Card>
  );
}

// Privacy Policy 12-Element Audit Card
interface PrivacyPolicyAuditProps {
  audit: {
    elementsFound: number;
    elementsPartial: number;
    elementsMissing: number;
    compliancePercentage: number;
    isComplete: boolean;
    summary: string;
    elements: Array<{
      id: string;
      number: number;
      nameAr: string;
      nameEn: string;
      status: 'موجود بالكامل' | 'ناقص أو غير واضح' | 'غير موجود';
      statusEn: 'FOUND' | 'PARTIAL' | 'MISSING';
      evidence: string;
      notes: string;
      matchCount: number;
      matchedKeywords: string[];
    }>;
  };
}

function PrivacyPolicyAuditCard({ audit }: PrivacyPolicyAuditProps) {
  const [expanded, setExpanded] = useState(false);

  const getStatusIcon = (statusEn: string) => {
    switch (statusEn) {
      case 'FOUND': return <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />;
      case 'PARTIAL': return <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0" />;
      default: return <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />;
    }
  };

  const getStatusBadge = (status: string, statusEn: string) => {
    switch (statusEn) {
      case 'FOUND': return <Badge variant="outline" className="border-green-500 text-green-600 text-xs">{status}</Badge>;
      case 'PARTIAL': return <Badge variant="outline" className="border-orange-500 text-orange-600 text-xs">{status}</Badge>;
      default: return <Badge variant="destructive" className="text-xs">{status}</Badge>;
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary" />
            فحص عناصر سياسة الخصوصية
          </CardTitle>
          <div className="flex items-center gap-2">
            {audit.isComplete ? (
              <Badge variant="outline" className="border-green-500 text-green-600">مكتملة</Badge>
            ) : (
              <Badge variant="destructive">غير مكتملة</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-center">
            <div className="text-2xl font-bold text-green-600">{audit.elementsFound}</div>
            <div className="text-xs text-green-700 dark:text-green-400">موجود بالكامل</div>
          </div>
          <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 text-center">
            <div className="text-2xl font-bold text-orange-600">{audit.elementsPartial}</div>
            <div className="text-xs text-orange-700 dark:text-orange-400">ناقص أو غير واضح</div>
          </div>
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-center">
            <div className="text-2xl font-bold text-red-600">{audit.elementsMissing}</div>
            <div className="text-xs text-red-700 dark:text-red-400">غير موجود</div>
          </div>
        </div>

        {/* Expand/Collapse Button */}
        <Button
          variant="outline"
          size="sm"
          className="w-full mb-3"
          onClick={() => setExpanded(!expanded)}
          data-testid="button-expand-audit"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-4 h-4 ml-2" />
              إخفاء التفاصيل
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4 ml-2" />
              عرض التفاصيل
            </>
          )}
        </Button>

        {/* Detailed Elements Table */}
        {expanded && (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {audit.elements.map((element) => (
              <div
                key={element.id}
                className={`p-3 rounded-lg border ${
                  element.statusEn === 'FOUND' 
                    ? 'border-green-200 bg-green-50/50 dark:bg-green-950/20' 
                    : element.statusEn === 'PARTIAL'
                    ? 'border-orange-200 bg-orange-50/50 dark:bg-orange-950/20'
                    : 'border-red-200 bg-red-50/50 dark:bg-red-950/20'
                }`}
                data-testid={`audit-element-${element.number}`}
              >
                <div className="flex items-start gap-2">
                  {getStatusIcon(element.statusEn)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{element.number}. {element.nameAr}</span>
                      {getStatusBadge(element.status, element.statusEn)}
                    </div>
                    
                    {element.evidence && (
                      <p className="text-xs text-muted-foreground mt-1 bg-background/50 p-2 rounded border">
                        <span className="font-medium">الدليل:</span> {element.evidence}
                      </p>
                    )}
                    
                    {element.notes && element.statusEn !== 'FOUND' && (
                      <p className="text-xs text-orange-700 dark:text-orange-400 mt-1">
                        {element.notes}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </CardContent>
    </Card>
  );
}

// Terms & Conditions Audit Card - 12 Compliance Modules
interface TermsConditionsAuditProps {
  audit: {
    modulesFound: number;
    modulesPartial: number;
    modulesMissing: number;
    compliancePercentage: number;
    isComplete: boolean;
    modules: Array<{
      moduleId: string;
      number: number;
      titleAr: string;
      titleEn: string;
      status: string;
      statusEn: string;
      evidence: string;
      notes: string;
      matchCount: number;
      matchedKeywords: string[];
      requirementAr: string;
    }>;
    summary: string;
  };
}

function TermsConditionsAuditCard({ audit }: TermsConditionsAuditProps) {
  const [expanded, setExpanded] = useState(false);

  const getStatusIcon = (statusEn: string) => {
    switch (statusEn) {
      case 'FOUND': return <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />;
      case 'PARTIAL': return <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0" />;
      default: return <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />;
    }
  };

  const getStatusBadge = (status: string, statusEn: string) => {
    switch (statusEn) {
      case 'FOUND': return <Badge variant="outline" className="border-green-500 text-green-600 text-xs">{status}</Badge>;
      case 'PARTIAL': return <Badge variant="outline" className="border-orange-500 text-orange-600 text-xs">{status}</Badge>;
      default: return <Badge variant="destructive" className="text-xs">{status}</Badge>;
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            فحص عناصر الشروط والأحكام
          </CardTitle>
          <div className="flex items-center gap-2">
            {audit.isComplete ? (
              <Badge variant="outline" className="border-green-500 text-green-600">مكتملة</Badge>
            ) : (
              <Badge variant="destructive">غير مكتملة</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-center">
            <div className="text-2xl font-bold text-green-600">{audit.modulesFound}</div>
            <div className="text-xs text-green-700 dark:text-green-400">موجود بالكامل</div>
          </div>
          <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 text-center">
            <div className="text-2xl font-bold text-orange-600">{audit.modulesPartial}</div>
            <div className="text-xs text-orange-700 dark:text-orange-400">ناقص أو غير واضح</div>
          </div>
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-center">
            <div className="text-2xl font-bold text-red-600">{audit.modulesMissing}</div>
            <div className="text-xs text-red-700 dark:text-red-400">غير موجود</div>
          </div>
        </div>

        {/* Expand/Collapse Button */}
        <Button
          variant="outline"
          size="sm"
          className="w-full mb-3"
          onClick={() => setExpanded(!expanded)}
          data-testid="button-expand-terms-audit"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-4 h-4 ml-2" />
              إخفاء التفاصيل
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4 ml-2" />
              عرض التفاصيل
            </>
          )}
        </Button>

        {/* Detailed Modules Table */}
        {expanded && (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {audit.modules.map((module) => (
              <div
                key={module.moduleId}
                className={`p-3 rounded-lg border ${
                  module.statusEn === 'FOUND' 
                    ? 'border-green-200 bg-green-50/50 dark:bg-green-950/20' 
                    : module.statusEn === 'PARTIAL'
                    ? 'border-orange-200 bg-orange-50/50 dark:bg-orange-950/20'
                    : 'border-red-200 bg-red-50/50 dark:bg-red-950/20'
                }`}
                data-testid={`terms-module-${module.number}`}
              >
                <div className="flex items-start gap-2">
                  {getStatusIcon(module.statusEn)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{module.number}. {module.titleAr}</span>
                      {getStatusBadge(module.status, module.statusEn)}
                    </div>
                    
                    <p className="text-xs text-muted-foreground mt-1">
                      {module.requirementAr}
                    </p>
                    
                    {module.evidence && (
                      <p className="text-xs text-muted-foreground mt-1 bg-background/50 p-2 rounded border">
                        <span className="font-medium">الدليل:</span> {module.evidence}
                      </p>
                    )}
                    
                    {module.notes && module.statusEn !== 'FOUND' && (
                      <p className="text-xs text-orange-700 dark:text-orange-400 mt-1">
                        {module.notes}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </CardContent>
    </Card>
  );
}

// Rotating tips messages for engaging loading experience
const LOADING_TIPS = [
  "جاري الاتصال بالموقع وتحليل البنية البرمجية...",
  "يقوم الذكاء الاصطناعي الآن بقراءة سياسة الخصوصية...",
  "هل تعلم؟ نظام حماية البيانات (PDPL) يفرض غرامات تصل لـ 5 ملايين ريال.",
  "نتأكد من وجود آلية واضحة لموافقة الزوار (Cookies)...",
  "جاري مطابقة الموقع مع متطلبات 'سدايا'...",
  "نقوم الآن بتجهيز تقرير الامتثال القانوني...",
];

// Compact & Centered Loading State with Rotating Tips
function ScanLoadingState({ url, progress }: { url: string; progress: number }) {
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [fadeState, setFadeState] = useState<'in' | 'out'>('in');
  
  useEffect(() => {
    const interval = setInterval(() => {
      // Start fade out
      setFadeState('out');
      
      // After fade out, change tip and fade in
      setTimeout(() => {
        setCurrentTipIndex((prev) => (prev + 1) % LOADING_TIPS.length);
        setFadeState('in');
      }, 300);
    }, 4000);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <Card className="mb-6">
      <CardContent className="py-12">
        {/* Centered content with proper vertical spacing */}
        <div className="flex flex-col items-center justify-center min-h-[280px] gap-3">
          {/* Globe Icon - closer to text */}
          <Globe className="w-14 h-14 animate-spin text-primary" />
          
          {/* Main Title - 12px gap from icon */}
          <h2 className="text-lg font-bold leading-relaxed pb-1">جاري تحميل النتائج...</h2>
          
          {/* URL */}
          <p className="text-sm text-muted-foreground text-center" dir="ltr">{url}</p>
          
          {/* Progress Bar - 16px gap */}
          <div className="w-full max-w-md mt-2">
            <Progress 
              value={progress} 
              animated={true}
              className="w-full h-2" 
              data-testid="progress-results-scan" 
            />
          </div>
          
          {/* Rotating Tips - 16px gap from progress bar */}
          <div className="mt-4 h-6 flex items-center justify-center">
            <p 
              className={`text-sm text-gray-500 dark:text-gray-400 text-center transition-opacity duration-300 ${
                fadeState === 'in' ? 'opacity-100' : 'opacity-0'
              }`}
            >
              {LOADING_TIPS[currentTipIndex]}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
