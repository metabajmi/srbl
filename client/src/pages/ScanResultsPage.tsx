import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Shield, AlertCircle, AlertTriangle, CheckCircle, XCircle, Globe, RefreshCw, FileText, ScrollText, Cookie, ExternalLink } from "lucide-react";
import { ComplianceScan, ComplianceIssue } from "@shared/schema";
import { useState, useEffect, useRef } from "react";
import { BackButton } from "@/components/BackButton";
import { useScanContext, extractScanData } from "@/contexts/ScanContext";

export default function ScanResultsPage() {
  const [, params] = useRoute("/scan/:id");
  const scanId = params?.id;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [autoRefresh, setAutoRefresh] = useState(true);
  const { setScanData } = useScanContext();

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

  const { data: issues = [], refetch: refetchIssues } = useQuery({
    queryKey: ["/api/scans", scanId, "issues"],
    queryFn: async () => {
      const response = await fetch(`/api/scans/${scanId}/issues`);
      if (!response.ok) throw new Error("Failed to fetch issues");
      return response.json() as Promise<ComplianceIssue[]>;
    },
    enabled: !!scanId && scan?.status === "completed",
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

  const navigateToTool = (tool: "privacy" | "terms" | "consent") => {
    const routes = {
      privacy: "/workspace?tab=privacy&from=scan",
      terms: "/workspace?tab=terms&from=scan",
      consent: "/workspace?tab=consent&from=scan",
    };
    setLocation(routes[tool]);
  };

  // Filter out analysis-type suggestions (partial analysis messages)
  const realIssues = issues.filter(i => i.category !== "analysis");
  const criticalIssues = realIssues.filter(i => i.severity === "critical");
  const warningIssues = realIssues.filter(i => i.severity === "warning");
  
  // Count issues per element category (including all backend variants)
  const privacyIssues = realIssues.filter(i => 
    i.category === "privacy_policy" || i.category === "privacy_policy_content" || i.category === "privacy"
  ).length;
  const termsIssues = realIssues.filter(i => 
    i.category === "terms_and_conditions" || i.category === "terms" || i.category === "terms_content"
  ).length;
  const cookieIssues = realIssues.filter(i => 
    i.category === "cookies" || i.category === "consent" || i.category === "cookie_banner"
  ).length;
  const contactIssues = realIssues.filter(i => 
    i.category === "contact_info" || i.category === "contact_information" || i.category === "contact"
  ).length;

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
            <BackButton label="رجوع" />
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
        
        {/* Scanning Progress */}
        {(scan.status === "pending" || scan.status === "scanning") && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center gap-4">
                <Globe className="w-16 h-16 animate-spin text-primary" />
                <p className="text-lg font-bold">جاري فحص الموقع...</p>
                <p className="text-sm text-muted-foreground text-center" dir="ltr">{scan.url}</p>
                <Progress className="w-full max-w-md" value={scan.status === "scanning" ? 60 : 20} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {scan.status === "completed" && (
          <>
            {/* Score Card - Simple */}
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  {/* Score Circle */}
                  <div className={`w-28 h-28 rounded-full border-8 flex items-center justify-center flex-shrink-0 ${
                    scan.complianceLevel === 'high' ? 'border-green-500 bg-green-50 dark:bg-green-950' :
                    scan.complianceLevel === 'medium' ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950' :
                    'border-red-500 bg-red-50 dark:bg-red-950'
                  }`}>
                    <div className="text-center">
                      <div className={`text-3xl font-bold ${
                        scan.complianceLevel === 'high' ? 'text-green-600' :
                        scan.complianceLevel === 'medium' ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {scan.overallScore || 0}%
                      </div>
                    </div>
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1 text-center sm:text-right">
                    <h2 className="text-2xl font-bold mb-1">
                      {scan.complianceLevel === 'high' ? 'امتثال عالٍ' :
                       scan.complianceLevel === 'medium' ? 'امتثال متوسط' : 'امتثال منخفض'}
                    </h2>
                    <p className="text-muted-foreground text-sm mb-2" dir="ltr">{scan.url}</p>
                    <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                      {criticalIssues.length > 0 && (
                        <Badge variant="destructive">{criticalIssues.length} مخالفة</Badge>
                      )}
                      {warningIssues.length > 0 && (
                        <Badge variant="outline" className="border-orange-500 text-orange-600">{warningIssues.length} تحذير</Badge>
                      )}
                      {realIssues.length === 0 && (
                        <Badge variant="outline" className="border-green-500 text-green-600">لا توجد مخالفات</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Status - 4 Elements */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <StatusCard 
                title="سياسة الخصوصية" 
                found={!!scan.hasPrivacyPolicy} 
                url={scan.privacyPolicyUrl}
                required 
                issueCount={privacyIssues}
                testId="card-status-privacy"
              />
              <StatusCard 
                title="الشروط والأحكام" 
                found={!!scan.hasTermsAndConditions} 
                url={scan.termsAndConditionsUrl}
                required 
                issueCount={termsIssues}
                testId="card-status-terms"
              />
              <StatusCard 
                title="لافتة الكوكيز" 
                found={!!scan.hasCookieBanner} 
                issueCount={cookieIssues}
                testId="card-status-cookies"
              />
              <StatusCard 
                title="معلومات الاتصال" 
                found={!!scan.hasContactInfo} 
                issueCount={contactIssues}
                testId="card-status-contact"
              />
            </div>

            {/* Issues List - Simple */}
            {realIssues.length > 0 && (
              <Card className="mb-6">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-destructive" />
                    المخالفات ({realIssues.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {realIssues.map((issue, idx) => (
                      <IssueItem key={idx} issue={issue} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions - Simple */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">الخطوات التالية</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-3">
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
                  <ActionButton 
                    title="إدارة الموافقة"
                    description={scan.hasCookieBanner ? "إدارة" : "إنشاء"}
                    icon={<Cookie className="w-5 h-5" />}
                    needed={!scan.hasCookieBanner}
                    onClick={() => navigateToTool("consent")}
                    testId="button-action-consent"
                  />
                </div>
              </CardContent>
            </Card>
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
  
  return (
    <div className={`p-3 rounded-lg border ${isCritical ? 'border-red-200 bg-red-50/50 dark:bg-red-950/20' : 'border-orange-200 bg-orange-50/50 dark:bg-orange-950/20'}`}>
      <div className="flex items-start gap-2">
        {isCritical ? (
          <XCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
        ) : (
          <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{issue.title}</p>
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
