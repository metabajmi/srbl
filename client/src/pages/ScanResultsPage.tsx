import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { Shield, AlertCircle, AlertTriangle, Info, FileText, Download, ArrowRight, CheckCircle, XCircle, Globe, Home, RefreshCw, Wrench, ScrollText, Cookie, Settings, ExternalLink } from "lucide-react";
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

  // Fetch scan data
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
      // Keep polling while scan is in progress
      if (scanData?.status === "pending" || scanData?.status === "scanning") {
        return 2000;
      }
      return false;
    },
  });

  // Fetch issues for this scan
  const { data: issues = [], isLoading: issuesLoading, refetch: refetchIssues } = useQuery({
    queryKey: ["/api/scans", scanId, "issues"],
    queryFn: async () => {
      const response = await fetch(`/api/scans/${scanId}/issues`);
      if (!response.ok) throw new Error("Failed to fetch issues");
      return response.json() as Promise<ComplianceIssue[]>;
    },
    enabled: !!scanId && scan?.status === "completed",
  });

  // Track last processed scan to avoid duplicate processing
  const lastProcessedScanRef = useRef<string | null>(null);

  // Refetch issues and save scan data when scan completes (only once per scan)
  useEffect(() => {
    if (scan?.status === "completed" && scan.id && lastProcessedScanRef.current !== scan.id) {
      lastProcessedScanRef.current = scan.id;
      refetchIssues();
      const extractedData = extractScanData(scan);
      setScanData(extractedData);
    }
  }, [scan?.status, scan?.id, refetchIssues, setScanData]);

  // Navigate to tool with scan data
  const navigateToTool = (tool: "privacy" | "terms" | "consent") => {
    const routes = {
      privacy: "/workspace?tab=privacy&from=scan",
      terms: "/workspace?tab=terms&from=scan",
      consent: "/workspace?tab=consent&from=scan",
    };
    setLocation(routes[tool]);
  };

  // Rescan mutation - creates a new scan for the same URL
  const rescanMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/scans", { url: scan?.url });
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "جاري إعادة الفحص",
        description: "تم بدء فحص جديد بالذكاء الاصطناعي...",
      });
      // Navigate to new scan results
      setLocation(`/scan/${data.id}`);
    },
    onError: () => {
      toast({
        title: "خطأ في إعادة الفحص",
        description: "حدث خطأ أثناء محاولة إعادة الفحص",
        variant: "destructive",
      });
    },
  });

  // Generate report mutation
  const generateReportMutation = useMutation({
    mutationFn: async (format: string) => {
      const response = await apiRequest("POST", `/api/scans/${scanId}/report`, { format });
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "تم إنشاء التقرير بنجاح",
        description: "جاري تحميل التقرير...",
      });
      // Download the report
      if (data.downloadUrl) {
        window.open(data.downloadUrl, "_blank");
      }
    },
    onError: () => {
      toast({
        title: "خطأ في إنشاء التقرير",
        description: "حدث خطأ أثناء محاولة إنشاء التقرير",
        variant: "destructive",
      });
    },
  });

  // Group issues by category
  const issuesByCategory = issues.reduce((acc, issue) => {
    if (!acc[issue.category]) {
      acc[issue.category] = [];
    }
    acc[issue.category].push(issue);
    return acc;
  }, {} as Record<string, ComplianceIssue[]>);

  // Calculate severity counts
  const severityCounts = {
    critical: issues.filter(i => i.severity === "critical").length,
    warning: issues.filter(i => i.severity === "warning").length,
    suggestion: issues.filter(i => i.severity === "suggestion").length,
  };
  
  // Check if this is a partial analysis (AI analysis was skipped)
  const isPartialAnalysis = issues.some(i => 
    i.category === "analysis" && 
    i.title?.includes("تحليل غير مكتمل")
  );

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <XCircle className="w-5 h-5 text-destructive" />;
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      case "suggestion":
        return <Info className="w-5 h-5 text-yellow-500" />;
      default:
        return <AlertCircle className="w-5 h-5" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    const variants: Record<string, "destructive" | "default" | "secondary"> = {
      critical: "destructive",
      warning: "default",
      suggestion: "secondary",
    };
    const labels: Record<string, string> = {
      critical: "حرج",
      warning: "تحذير",
      suggestion: "اقتراح",
    };
    return (
      <Badge variant={variants[severity] || "default"}>
        {labels[severity] || severity}
      </Badge>
    );
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      privacy_policy: "سياسة الخصوصية",
      privacy_policy_content: "محتوى سياسة الخصوصية",
      terms_and_conditions: "شروط الاستخدام",
      terms_content: "محتوى الشروط والأحكام",
      data_collection: "جمع البيانات",
      consent: "الموافقة والإذن",
      security: "الأمان والحماية",
      data_retention: "حفظ البيانات",
      third_party: "الأطراف الثالثة",
      user_rights: "حقوق المستخدم",
      cookies: "ملفات تعريف الارتباط",
      contact: "معلومات الاتصال",
      analysis: "حالة التحليل",
      general: "عام",
    };
    return labels[category] || category;
  };

  const getDocumentTypeLabel = (docType?: string) => {
    const labels: Record<string, string> = {
      privacy_policy: "سياسة الخصوصية",
      terms: "الشروط والأحكام",
      cookie_banner: "لافتة الكوكيز",
      consent: "آلية الموافقة",
    };
    return docType ? labels[docType] || docType : null;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    if (score >= 40) return "text-orange-600";
    return "text-destructive";
  };

  const getComplianceLevelBadge = (level?: string | null) => {
    if (level === "high") {
      return <Badge className="bg-green-600 hover:bg-green-700 text-white gap-2"><CheckCircle className="w-3 h-3" />امتثال عالي</Badge>;
    } else if (level === "medium") {
      return <Badge className="bg-orange-500 hover:bg-orange-600 text-white gap-2"><AlertTriangle className="w-3 h-3" />امتثال متوسط</Badge>;
    } else {
      return <Badge className="bg-destructive hover:bg-destructive/90 text-white gap-2"><XCircle className="w-3 h-3" />امتثال منخفض</Badge>;
    }
  };

  const getComplianceLevelColor = (level?: string | null) => {
    if (level === "high") return "text-green-600";
    if (level === "medium") return "text-orange-500";
    return "text-destructive";
  };

  if (scanLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              <Globe className="w-12 h-12 animate-spin text-primary" />
              <p className="text-lg font-medium">جاري تحميل نتائج الفحص...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!scan) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              <XCircle className="w-12 h-12 text-destructive" />
              <p className="text-lg font-medium">لم يتم العثور على الفحص</p>
              <Button onClick={() => setLocation("/")} data-testid="button-home">
                <Home className="ml-2 h-4 w-4" />
                العودة للرئيسية
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <BackButton label="رجوع" />
            <Shield className="w-8 h-8 text-primary" />
            <h1 className="text-xl font-bold">نتائج فحص سِرْبَال</h1>
          </div>
          <div className="flex items-center gap-2">
            {scan?.status === "completed" && (
              <Button 
                variant="default"
                onClick={() => rescanMutation.mutate()}
                disabled={rescanMutation.isPending}
                data-testid="button-rescan-header"
                className="gap-2"
              >
                {rescanMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                إعادة الفحص
              </Button>
            )}
            <Button 
              variant="outline" 
              onClick={() => setLocation("/")}
              data-testid="button-new-scan"
            >
              <Globe className="ml-2 h-4 w-4" />
              فحص جديد
            </Button>
          </div>
        </div>
      </header>

      <div className="container py-8">
        {/* URL and Status */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>تفاصيل الفحص</CardTitle>
                <CardDescription className="mt-2">
                  <span className="font-mono text-sm" dir="ltr">{scan.url}</span>
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {scan.status === "pending" && (
                  <Badge variant="secondary" className="gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    في الانتظار
                  </Badge>
                )}
                {scan.status === "scanning" && (
                  <Badge variant="default" className="gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    جاري الفحص
                  </Badge>
                )}
                {scan.status === "completed" && (
                  <Badge variant="secondary" className="gap-1">
                    <CheckCircle className="w-3 h-3" />
                    مكتمل
                  </Badge>
                )}
                {scan.status === "failed" && (
                  <Badge variant="destructive" className="gap-1">
                    <XCircle className="w-3 h-3" />
                    فشل
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          {scan.status === "completed" && (
            <CardContent className="pt-0">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 text-sm">
                <div className="space-y-1">
                  <p className="text-muted-foreground">تاريخ الفحص</p>
                  <p className="font-medium">
                    {scan.scanDate ? new Date(scan.scanDate).toLocaleDateString('ar-SA', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : 'غير متوفر'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">إجمالي المشاكل</p>
                  <p className="font-medium">{scan.issuesCount || 0} مشكلة</p>
                </div>
                {scan.privacyPolicyUrl && (
                  <div className="space-y-1">
                    <p className="text-muted-foreground">رابط سياسة الخصوصية</p>
                    <a 
                      href={scan.privacyPolicyUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="font-medium text-primary hover:underline truncate block"
                      dir="ltr"
                    >
                      {scan.privacyPolicyUrl.replace(/^https?:\/\//, '').substring(0, 40)}...
                    </a>
                  </div>
                )}
                {scan.termsAndConditionsUrl && (
                  <div className="space-y-1">
                    <p className="text-muted-foreground">رابط الشروط والأحكام</p>
                    <a 
                      href={scan.termsAndConditionsUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="font-medium text-primary hover:underline truncate block"
                      dir="ltr"
                    >
                      {scan.termsAndConditionsUrl.replace(/^https?:\/\//, '').substring(0, 40)}...
                    </a>
                  </div>
                )}
              </div>
            </CardContent>
          )}
        </Card>

        {/* Scanning Progress */}
        {(scan.status === "pending" || scan.status === "scanning") && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">جاري تحليل الموقع...</span>
                  <span className="text-sm text-muted-foreground">قد يستغرق هذا بضع دقائق</span>
                </div>
                <Progress className="w-full" value={scan.status === "scanning" ? 50 : 10} />
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Globe className="w-4 h-4 animate-spin" />
                  <span>يتم الآن فحص الموقع وتحليل المحتوى باستخدام الذكاء الاصطناعي...</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {scan.status === "completed" && (
          <>
            {/* Partial Analysis Warning */}
            {isPartialAnalysis && (
              <Card className="mb-6 border-orange-500 bg-orange-50 dark:bg-orange-950/30">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-6 h-6 text-orange-500 flex-shrink-0 mt-1" />
                    <div className="flex-1">
                      <h3 className="font-bold text-orange-700 dark:text-orange-400 mb-1">
                        تحليل جزئي - النتيجة قد تختلف عن الواقع
                      </h3>
                      <p className="text-sm text-orange-600 dark:text-orange-300 mb-3">
                        تم الفحص بناءً على كشف الروابط فقط دون التحقق من محتوى السياسات. 
                        لم يتم التأكد من اكتمال سياسة الخصوصية أو الشروط وفقاً لمتطلبات نظام حماية البيانات الشخصية.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => {
                            refetch();
                            refetchIssues();
                          }}
                          className="border-orange-500 text-orange-700 hover:bg-orange-100 dark:hover:bg-orange-900"
                          data-testid="button-rescan"
                        >
                          <RefreshCw className="w-4 h-4 ml-1" />
                          إعادة الفحص
                        </Button>
                        <span className="text-xs text-orange-500 self-center">
                          أو قم بمراجعة السياسات يدوياً
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Main Score Hero Section */}
            <Card className="mb-6 overflow-hidden">
              <div className={`p-6 ${
                scan.complianceLevel === 'high' ? 'bg-gradient-to-l from-green-500/20 to-green-600/10' :
                scan.complianceLevel === 'medium' ? 'bg-gradient-to-l from-yellow-500/20 to-orange-500/10' :
                'bg-gradient-to-l from-red-500/20 to-red-600/10'
              }`}>
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  {/* Score Circle */}
                  <div className="flex items-center gap-6">
                    <div className={`relative w-32 h-32 rounded-full border-8 flex items-center justify-center ${
                      scan.complianceLevel === 'high' ? 'border-green-500 bg-green-50 dark:bg-green-950' :
                      scan.complianceLevel === 'medium' ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950' :
                      'border-red-500 bg-red-50 dark:bg-red-950'
                    }`}>
                      <div className="text-center">
                        <div className={`text-4xl font-bold ${getComplianceLevelColor(scan.complianceLevel)}`}>
                          {scan.overallScore || 0}%
                        </div>
                        <div className="text-xs text-muted-foreground">الامتثال</div>
                      </div>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold mb-1">
                        {scan.complianceLevel === 'high' ? 'امتثال عالٍ' :
                         scan.complianceLevel === 'medium' ? 'امتثال متوسط' : 'امتثال منخفض'}
                      </h2>
                      <p className="text-muted-foreground">
                        {scan.complianceLevel === 'high' ? 'موقعك يلتزم بمعظم متطلبات PDPL' :
                         scan.complianceLevel === 'medium' ? 'يحتاج موقعك لبعض التحسينات' : 'موقعك يحتاج لإصلاحات جوهرية'}
                      </p>
                      {getComplianceLevelBadge(scan.complianceLevel)}
                    </div>
                  </div>
                  
                  {/* Issues Summary */}
                  <div className="flex gap-4">
                    <div className="text-center p-4 bg-white/50 dark:bg-black/20 rounded-xl min-w-[80px]">
                      <XCircle className="w-6 h-6 text-destructive mx-auto mb-1" />
                      <div className="text-2xl font-bold text-destructive">{severityCounts.critical}</div>
                      <p className="text-xs text-muted-foreground">حرجة</p>
                    </div>
                    <div className="text-center p-4 bg-white/50 dark:bg-black/20 rounded-xl min-w-[80px]">
                      <AlertTriangle className="w-6 h-6 text-orange-500 mx-auto mb-1" />
                      <div className="text-2xl font-bold text-orange-500">{severityCounts.warning}</div>
                      <p className="text-xs text-muted-foreground">تحذير</p>
                    </div>
                    <div className="text-center p-4 bg-white/50 dark:bg-black/20 rounded-xl min-w-[80px]">
                      <Info className="w-6 h-6 text-blue-500 mx-auto mb-1" />
                      <div className="text-2xl font-bold text-blue-500">{severityCounts.suggestion}</div>
                      <p className="text-xs text-muted-foreground">اقتراح</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Quick Status Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Card className={`p-4 ${scan.hasPrivacyPolicy ? 'border-green-300 bg-green-50/50 dark:bg-green-950/20' : 'border-destructive/50 bg-destructive/5'}`}>
                <div className="flex items-center gap-3">
                  {scan.hasPrivacyPolicy ? (
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  ) : (
                    <XCircle className="w-8 h-8 text-destructive" />
                  )}
                  <div>
                    <p className="font-bold text-sm">سياسة الخصوصية</p>
                    <p className={`text-xs ${scan.hasPrivacyPolicy ? 'text-green-600' : 'text-destructive'}`}>
                      {scan.hasPrivacyPolicy ? 'موجودة' : 'مفقودة'}
                    </p>
                  </div>
                </div>
              </Card>
              <Card className={`p-4 ${scan.hasTermsAndConditions ? 'border-green-300 bg-green-50/50 dark:bg-green-950/20' : 'border-destructive/50 bg-destructive/5'}`}>
                <div className="flex items-center gap-3">
                  {scan.hasTermsAndConditions ? (
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  ) : (
                    <XCircle className="w-8 h-8 text-destructive" />
                  )}
                  <div>
                    <p className="font-bold text-sm">الشروط والأحكام</p>
                    <p className={`text-xs ${scan.hasTermsAndConditions ? 'text-green-600' : 'text-destructive'}`}>
                      {scan.hasTermsAndConditions ? 'موجودة' : 'مفقودة'}
                    </p>
                  </div>
                </div>
              </Card>
              <Card className={`p-4 ${scan.hasCookieBanner ? 'border-green-300 bg-green-50/50 dark:bg-green-950/20' : 'border-orange-300 bg-orange-50/50 dark:bg-orange-950/20'}`}>
                <div className="flex items-center gap-3">
                  {scan.hasCookieBanner ? (
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-8 h-8 text-orange-500" />
                  )}
                  <div>
                    <p className="font-bold text-sm">لافتة الكوكيز</p>
                    <p className={`text-xs ${scan.hasCookieBanner ? 'text-green-600' : 'text-orange-500'}`}>
                      {scan.hasCookieBanner ? 'موجودة' : 'مفقودة'}
                    </p>
                  </div>
                </div>
              </Card>
              <Card className={`p-4 ${scan.hasContactInfo ? 'border-green-300 bg-green-50/50 dark:bg-green-950/20' : 'border-orange-300 bg-orange-50/50 dark:bg-orange-950/20'}`}>
                <div className="flex items-center gap-3">
                  {scan.hasContactInfo ? (
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-8 h-8 text-orange-500" />
                  )}
                  <div>
                    <p className="font-bold text-sm">معلومات الاتصال</p>
                    <p className={`text-xs ${scan.hasContactInfo ? 'text-green-600' : 'text-orange-500'}`}>
                      {scan.hasContactInfo ? 'موجودة' : 'مفقودة'}
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Detailed Analysis Section */}
            <div className="grid gap-6 mb-6 md:grid-cols-2">
              {/* Compliance Findings Card - Detailed */}
              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="text-lg">نتائج الفحص التفصيلية</CardTitle>
                  <CardDescription>العناصر المفحوصة ومحتوياتها التفصيلية</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    
                    {/* Privacy Policy - Detailed */}
                    <div className={`rounded-lg border ${scan.hasPrivacyPolicy ? 'border-green-300 bg-green-50/50 dark:bg-green-950/30' : 'border-destructive/50 bg-destructive/5'}`}>
                      <div className="flex items-center justify-between p-3 border-b border-inherit">
                        <div className="flex items-center gap-2">
                          {scan.hasPrivacyPolicy ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <XCircle className="w-5 h-5 text-destructive" />
                          )}
                          <span className="font-bold">سياسة الخصوصية</span>
                          <span className="text-xs text-muted-foreground">(المادة 12 من PDPL)</span>
                        </div>
                        {scan.hasPrivacyPolicy ? (
                          <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">موجودة</Badge>
                        ) : (
                          <Badge variant="destructive">مفقودة</Badge>
                        )}
                      </div>
                      {scan.hasPrivacyPolicy && scan.privacyPolicyUrl && (
                        <div className="px-3 py-2 border-b border-inherit bg-muted/30">
                          <a href={scan.privacyPolicyUrl} target="_blank" rel="noopener noreferrer" 
                             className="text-sm text-primary hover:underline flex items-center gap-1">
                            <ExternalLink className="w-3 h-3" />
                            {scan.privacyPolicyUrl}
                          </a>
                        </div>
                      )}
                      <div className="p-3">
                        <p className="text-xs text-muted-foreground mb-2 font-medium">العناصر المفحوصة (10 عناصر إلزامية):</p>
                        <div className="grid grid-cols-2 gap-1 text-xs">
                          <div className="flex items-center gap-1"><span className="text-primary">pp1:</span> هوية جهة التحكم</div>
                          <div className="flex items-center gap-1"><span className="text-primary">pp2:</span> بيانات التواصل</div>
                          <div className="flex items-center gap-1"><span className="text-primary">pp3:</span> أنواع البيانات المجمعة</div>
                          <div className="flex items-center gap-1"><span className="text-primary">pp4:</span> أغراض المعالجة</div>
                          <div className="flex items-center gap-1"><span className="text-primary">pp5:</span> المسوغ النظامي</div>
                          <div className="flex items-center gap-1"><span className="text-primary">pp6:</span> مشاركة البيانات</div>
                          <div className="flex items-center gap-1"><span className="text-primary">pp7:</span> النقل الدولي</div>
                          <div className="flex items-center gap-1"><span className="text-primary">pp8:</span> مدة الاحتفاظ</div>
                          <div className="flex items-center gap-1"><span className="text-primary">pp9:</span> حقوق صاحب البيانات (7 حقوق)</div>
                          <div className="flex items-center gap-1"><span className="text-primary">pp10:</span> آلية الشكاوى</div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Terms & Conditions - Detailed */}
                    <div className={`rounded-lg border ${scan.hasTermsAndConditions ? 'border-green-300 bg-green-50/50 dark:bg-green-950/30' : 'border-destructive/50 bg-destructive/5'}`}>
                      <div className="flex items-center justify-between p-3 border-b border-inherit">
                        <div className="flex items-center gap-2">
                          {scan.hasTermsAndConditions ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <XCircle className="w-5 h-5 text-destructive" />
                          )}
                          <span className="font-bold">الشروط والأحكام</span>
                          <span className="text-xs text-muted-foreground">(نظام التجارة الإلكترونية)</span>
                        </div>
                        {scan.hasTermsAndConditions ? (
                          <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">موجودة</Badge>
                        ) : (
                          <Badge variant="destructive">مفقودة</Badge>
                        )}
                      </div>
                      {scan.hasTermsAndConditions && scan.termsAndConditionsUrl && (
                        <div className="px-3 py-2 border-b border-inherit bg-muted/30">
                          <a href={scan.termsAndConditionsUrl} target="_blank" rel="noopener noreferrer" 
                             className="text-sm text-primary hover:underline flex items-center gap-1">
                            <ExternalLink className="w-3 h-3" />
                            {scan.termsAndConditionsUrl}
                          </a>
                        </div>
                      )}
                      <div className="p-3">
                        <p className="text-xs text-muted-foreground mb-2 font-medium">العناصر المفحوصة (8 عناصر إلزامية):</p>
                        <div className="grid grid-cols-2 gap-1 text-xs">
                          <div className="flex items-center gap-1"><span className="text-primary">tc1:</span> الاستبدال والاسترجاع (7 أيام)</div>
                          <div className="flex items-center gap-1"><span className="text-primary">tc2:</span> شروط الاستخدام</div>
                          <div className="flex items-center gap-1"><span className="text-primary">tc3:</span> حدود المسؤولية</div>
                          <div className="flex items-center gap-1"><span className="text-primary">tc4:</span> القانون الحاكم (السعودي)</div>
                          <div className="flex items-center gap-1"><span className="text-primary">tc5:</span> الاختصاص القضائي</div>
                          <div className="flex items-center gap-1"><span className="text-primary">tc6:</span> حقوق الملكية الفكرية</div>
                          <div className="flex items-center gap-1"><span className="text-primary">tc7:</span> الضمانات</div>
                          <div className="flex items-center gap-1"><span className="text-primary">tc8:</span> إجراءات الشكاوى</div>
                        </div>
                      </div>
                    </div>

                    {/* Cookie Banner - Detailed */}
                    <div className={`rounded-lg border ${scan.hasCookieBanner ? 'border-green-300 bg-green-50/50 dark:bg-green-950/30' : 'border-orange-300 bg-orange-50/50 dark:bg-orange-950/30'}`}>
                      <div className="flex items-center justify-between p-3 border-b border-inherit">
                        <div className="flex items-center gap-2">
                          {scan.hasCookieBanner ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <AlertTriangle className="w-5 h-5 text-orange-500" />
                          )}
                          <span className="font-bold">لافتة الكوكيز</span>
                          <span className="text-xs text-muted-foreground">(موافقة ملفات تعريف الارتباط)</span>
                        </div>
                        {scan.hasCookieBanner ? (
                          <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">موجودة</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300">مفقودة</Badge>
                        )}
                      </div>
                      <div className="p-3">
                        <p className="text-xs text-muted-foreground mb-2 font-medium">طرق الكشف المستخدمة (6 طرق):</p>
                        <div className="grid grid-cols-2 gap-1 text-xs">
                          <div className="flex items-center gap-1"><span className="text-primary">1.</span> منصات إدارة الكوكيز (OneTrust, Cookiebot...)</div>
                          <div className="flex items-center gap-1"><span className="text-primary">2.</span> منصات Zid, Salla السعودية</div>
                          <div className="flex items-center gap-1"><span className="text-primary">3.</span> عناصر CSS (class/id=cookie, consent)</div>
                          <div className="flex items-center gap-1"><span className="text-primary">4.</span> نصوص عربية/إنجليزية للموافقة</div>
                          <div className="flex items-center gap-1"><span className="text-primary">5.</span> أزرار قبول/رفض/إعدادات</div>
                          <div className="flex items-center gap-1"><span className="text-primary">6.</span> عناصر fixed/sticky بـ z-index عالي</div>
                        </div>
                      </div>
                    </div>

                    {/* Contact Info - Detailed */}
                    <div className={`rounded-lg border ${scan.hasContactInfo ? 'border-green-300 bg-green-50/50 dark:bg-green-950/30' : 'border-orange-300 bg-orange-50/50 dark:bg-orange-950/30'}`}>
                      <div className="flex items-center justify-between p-3 border-b border-inherit">
                        <div className="flex items-center gap-2">
                          {scan.hasContactInfo ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <AlertTriangle className="w-5 h-5 text-orange-500" />
                          )}
                          <span className="font-bold">معلومات الاتصال</span>
                          <span className="text-xs text-muted-foreground">(بيانات التواصل)</span>
                        </div>
                        {scan.hasContactInfo ? (
                          <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">موجودة</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300">مفقودة</Badge>
                        )}
                      </div>
                      <div className="p-3">
                        <p className="text-xs text-muted-foreground mb-2 font-medium">العناصر المفحوصة:</p>
                        <div className="grid grid-cols-2 gap-1 text-xs">
                          <div className="flex items-center gap-1"><span className="text-primary">•</span> بريد إلكتروني (نمط Regex)</div>
                          <div className="flex items-center gap-1"><span className="text-primary">•</span> روابط mailto:</div>
                          <div className="flex items-center gap-1"><span className="text-primary">•</span> رقم هاتف (أنماط دولية)</div>
                          <div className="flex items-center gap-1"><span className="text-primary">•</span> صفحة "اتصل بنا" / "تواصل"</div>
                        </div>
                      </div>
                    </div>

                  </div>
                </CardContent>
              </Card>

              {/* Missing Elements Summary Card */}
              <Card className="border-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-orange-500" />
                    ملخص حالة العناصر
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    
                    {/* Element Count Summary */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg text-center border border-green-200">
                        <div className="text-2xl font-bold text-green-600">
                          {[scan.hasPrivacyPolicy, scan.hasTermsAndConditions, scan.hasCookieBanner, scan.hasContactInfo].filter(Boolean).length}
                        </div>
                        <p className="text-xs text-green-700">عناصر موجودة</p>
                      </div>
                      <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg text-center border border-red-200">
                        <div className="text-2xl font-bold text-destructive">
                          {[scan.hasPrivacyPolicy, scan.hasTermsAndConditions, scan.hasCookieBanner, scan.hasContactInfo].filter(x => !x).length}
                        </div>
                        <p className="text-xs text-red-700">عناصر مفقودة</p>
                      </div>
                    </div>

                    {/* Missing Main Elements */}
                    {(!scan.hasPrivacyPolicy || !scan.hasTermsAndConditions || !scan.hasCookieBanner || !scan.hasContactInfo) ? (
                      <div className="space-y-2">
                        <h4 className="font-bold text-sm flex items-center gap-2 text-destructive">
                          <XCircle className="w-4 h-4" />
                          العناصر المفقودة:
                        </h4>
                        <div className="grid gap-2">
                          {!scan.hasPrivacyPolicy && (
                            <div className="flex items-center gap-3 p-2 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200">
                              <XCircle className="w-5 h-5 text-destructive flex-shrink-0" />
                              <div className="flex-1">
                                <span className="font-medium text-sm">سياسة الخصوصية</span>
                                <p className="text-xs text-muted-foreground">المادة 12 من PDPL</p>
                              </div>
                              <Badge variant="destructive" className="text-xs">إلزامي</Badge>
                            </div>
                          )}
                          {!scan.hasTermsAndConditions && (
                            <div className="flex items-center gap-3 p-2 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200">
                              <XCircle className="w-5 h-5 text-destructive flex-shrink-0" />
                              <div className="flex-1">
                                <span className="font-medium text-sm">الشروط والأحكام</span>
                                <p className="text-xs text-muted-foreground">نظام التجارة الإلكترونية</p>
                              </div>
                              <Badge variant="destructive" className="text-xs">إلزامي</Badge>
                            </div>
                          )}
                          {!scan.hasCookieBanner && (
                            <div className="flex items-center gap-3 p-2 bg-orange-50 dark:bg-orange-950/30 rounded-lg border border-orange-200">
                              <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0" />
                              <div className="flex-1">
                                <span className="font-medium text-sm">لافتة الكوكيز</span>
                                <p className="text-xs text-muted-foreground">موافقة المستخدم</p>
                              </div>
                              <Badge variant="outline" className="text-xs border-orange-300 text-orange-600">موصى به</Badge>
                            </div>
                          )}
                          {!scan.hasContactInfo && (
                            <div className="flex items-center gap-3 p-2 bg-orange-50 dark:bg-orange-950/30 rounded-lg border border-orange-200">
                              <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0" />
                              <div className="flex-1">
                                <span className="font-medium text-sm">معلومات الاتصال</span>
                                <p className="text-xs text-muted-foreground">بيانات التواصل</p>
                              </div>
                              <Badge variant="outline" className="text-xs border-orange-300 text-orange-600">موصى به</Badge>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-300 text-center">
                        <CheckCircle className="w-10 h-10 text-green-600 mx-auto mb-2" />
                        <h4 className="font-bold text-green-700 dark:text-green-400">جميع العناصر الرئيسية موجودة!</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          تم العثور على جميع العناصر. راجع المخالفات لتحسين المحتوى.
                        </p>
                      </div>
                    )}

                    {/* AI Analysis Note */}
                    {(scan.hasPrivacyPolicy || scan.hasTermsAndConditions) && (
                      <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 mt-3">
                        <div className="flex items-start gap-2">
                          <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs text-blue-700 dark:text-blue-400 font-medium">ملاحظة عن التحليل العميق:</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              يتم فحص محتوى السياسات (10 عناصر للخصوصية و8 للشروط) بالتفصيل عند توفر تحليل الذكاء الاصطناعي. 
                              راجع قسم المخالفات للتفاصيل.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Issues Summary */}
                    {issues.length > 0 && (
                      <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/30 mt-3">
                        <h4 className="font-bold text-destructive mb-2 flex items-center gap-2 text-sm">
                          <AlertCircle className="w-4 h-4" />
                          مخالفات من تحليل المحتوى ({issues.filter(i => i.severity === 'critical').length} حرجة)
                        </h4>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {issues.filter(i => i.severity === 'critical').slice(0, 3).map((issue, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-xs">
                              <XCircle className="w-3 h-3 text-destructive flex-shrink-0" />
                              <span className="font-medium truncate">{issue.title}</span>
                            </div>
                          ))}
                          {issues.filter(i => i.severity === 'critical').length > 3 && (
                            <p className="text-xs text-muted-foreground mr-5">
                              +{issues.filter(i => i.severity === 'critical').length - 3} مخالفات أخرى...
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                  </div>
                </CardContent>
              </Card>

            </div>

            {/* Smart Remediation Tools Section */}
            <Card className="mb-6 border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-background">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Wrench className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">أدوات الإصلاح الذكية</CardTitle>
                    <CardDescription>
                      استخدم أدواتنا المدعومة بالذكاء الاصطناعي لإصلاح المخالفات - بياناتك محفوظة تلقائياً
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  {/* Privacy Policy Tool */}
                  <Card className={`hover-elevate cursor-pointer transition-all ${!scan.hasPrivacyPolicy ? 'border-destructive/50 bg-destructive/5' : 'border-green-500/50 bg-green-50/50 dark:bg-green-950/30'}`}
                    onClick={() => navigateToTool("privacy")}
                    data-testid="card-tool-privacy"
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${!scan.hasPrivacyPolicy ? 'bg-destructive/10' : 'bg-green-100 dark:bg-green-900'}`}>
                          <FileText className={`w-5 h-5 ${!scan.hasPrivacyPolicy ? 'text-destructive' : 'text-green-600'}`} />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold mb-1">سياسة الخصوصية</h4>
                          <p className="text-sm text-muted-foreground mb-3">
                            {scan.hasPrivacyPolicy 
                              ? "موجودة - يمكنك تحسينها أو إنشاء نسخة جديدة"
                              : "مفقودة - أنشئ سياسة متوافقة مع PDPL"}
                          </p>
                          <div className="flex items-center gap-2">
                            {!scan.hasPrivacyPolicy ? (
                              <Badge variant="destructive" className="gap-1">
                                <XCircle className="w-3 h-3" />
                                مطلوب
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300 gap-1">
                                <CheckCircle className="w-3 h-3" />
                                متوفر
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button className="w-full mt-4" variant={!scan.hasPrivacyPolicy ? "default" : "outline"}>
                        <ArrowRight className="w-4 h-4 ml-2" />
                        {scan.hasPrivacyPolicy ? "تحسين السياسة" : "إنشاء سياسة جديدة"}
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Terms & Conditions Tool */}
                  <Card className={`hover-elevate cursor-pointer transition-all ${!scan.hasTermsAndConditions ? 'border-destructive/50 bg-destructive/5' : 'border-green-500/50 bg-green-50/50 dark:bg-green-950/30'}`}
                    onClick={() => navigateToTool("terms")}
                    data-testid="card-tool-terms"
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${!scan.hasTermsAndConditions ? 'bg-destructive/10' : 'bg-green-100 dark:bg-green-900'}`}>
                          <ScrollText className={`w-5 h-5 ${!scan.hasTermsAndConditions ? 'text-destructive' : 'text-green-600'}`} />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold mb-1">الشروط والأحكام</h4>
                          <p className="text-sm text-muted-foreground mb-3">
                            {scan.hasTermsAndConditions 
                              ? "موجودة - يمكنك تحسينها أو إنشاء نسخة جديدة"
                              : "مفقودة - أنشئ شروط متوافقة مع الأنظمة"}
                          </p>
                          <div className="flex items-center gap-2">
                            {!scan.hasTermsAndConditions ? (
                              <Badge variant="destructive" className="gap-1">
                                <XCircle className="w-3 h-3" />
                                مطلوب
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300 gap-1">
                                <CheckCircle className="w-3 h-3" />
                                متوفر
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button className="w-full mt-4" variant={!scan.hasTermsAndConditions ? "default" : "outline"}>
                        <ArrowRight className="w-4 h-4 ml-2" />
                        {scan.hasTermsAndConditions ? "تحسين الشروط" : "إنشاء شروط جديدة"}
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Cookie Banner Tool */}
                  <Card className={`hover-elevate cursor-pointer transition-all ${!scan.hasCookieBanner ? 'border-orange-500/50 bg-orange-50/50 dark:bg-orange-950/30' : 'border-green-500/50 bg-green-50/50 dark:bg-green-950/30'}`}
                    onClick={() => navigateToTool("consent")}
                    data-testid="card-tool-consent"
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${!scan.hasCookieBanner ? 'bg-orange-100 dark:bg-orange-900' : 'bg-green-100 dark:bg-green-900'}`}>
                          <Cookie className={`w-5 h-5 ${!scan.hasCookieBanner ? 'text-orange-600' : 'text-green-600'}`} />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold mb-1">إدارة الموافقة</h4>
                          <p className="text-sm text-muted-foreground mb-3">
                            {scan.hasCookieBanner 
                              ? "لافتة موجودة - يمكنك إدارة إعداداتها"
                              : "لافتة مفقودة - أنشئ نظام موافقة متكامل"}
                          </p>
                          <div className="flex items-center gap-2">
                            {!scan.hasCookieBanner ? (
                              <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300 gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                مُوصى به
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300 gap-1">
                                <CheckCircle className="w-3 h-3" />
                                متوفر
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button className="w-full mt-4" variant={!scan.hasCookieBanner ? "default" : "outline"}>
                        <ArrowRight className="w-4 h-4 ml-2" />
                        {scan.hasCookieBanner ? "إدارة الموافقة" : "إنشاء لافتة جديدة"}
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                <div className="mt-4 p-3 bg-muted/50 rounded-lg flex items-center gap-3">
                  <Info className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    <strong>ملاحظة:</strong> تم حفظ بيانات موقعك ({scan.url}) تلقائياً. 
                    عند استخدام أي أداة، ستجد البيانات المتاحة معبأة مسبقاً للمراجعة والتأكيد.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* What We Check - Detailed Analysis Info */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  ماذا يفحص الماسح؟
                </CardTitle>
                <CardDescription>
                  تفاصيل العناصر التي يتم تحليلها في محتوى موقعك
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Privacy Policy Checks */}
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-bold mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      سياسة الخصوصية (المادة 12 من PDPL)
                    </h4>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>هوية جهة التحكم ونشاطها</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>بيانات التواصل (بريد، هاتف، عنوان)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>أنواع البيانات الشخصية المجمعة</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>أغراض جمع ومعالجة البيانات</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>المسوغ النظامي للمعالجة</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>الجهات التي تُشارَك معها البيانات</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>النقل الدولي للبيانات والضمانات</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>مدة الاحتفاظ بالبيانات</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>حقوق صاحب البيانات (الوصول، التصحيح، الحذف، الاعتراض)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>آلية تقديم الشكاوى</span>
                      </li>
                    </ul>
                  </div>
                  
                  {/* Terms & Conditions Checks */}
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-bold mb-3 flex items-center gap-2">
                      <ScrollText className="w-4 h-4 text-primary" />
                      الشروط والأحكام (نظام التجارة الإلكترونية)
                    </h4>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>سياسة الاستبدال والاسترجاع (7 أيام)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>شروط استخدام الموقع والخدمات</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>حدود المسؤولية لكل طرف</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>القانون الحاكم (السعودي)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>الاختصاص القضائي</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>حقوق الملكية الفكرية</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>الضمانات على المنتجات/الخدمات</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>إجراءات التظلم والشكاوى</span>
                      </li>
                    </ul>
                  </div>
                </div>
                
                {/* Additional Elements */}
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="p-4 border rounded-lg bg-muted/30">
                    <h4 className="font-bold mb-2 flex items-center gap-2">
                      <Cookie className="w-4 h-4 text-primary" />
                      لافتة الكوكيز
                    </h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>• وجود لافتة موافقة على الكوكيز</li>
                      <li>• خيارات قبول/رفض واضحة</li>
                      <li>• رابط لسياسة الكوكيز التفصيلية</li>
                    </ul>
                  </div>
                  <div className="p-4 border rounded-lg bg-muted/30">
                    <h4 className="font-bold mb-2 flex items-center gap-2">
                      <Settings className="w-4 h-4 text-primary" />
                      معلومات الاتصال
                    </h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>• بريد إلكتروني للتواصل</li>
                      <li>• رقم هاتف للدعم</li>
                      <li>• عنوان فعلي (للمتاجر)</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Issues Tabs */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-primary" />
                      تفاصيل المخالفات والتوصيات
                    </CardTitle>
                    <CardDescription className="mt-1">
                      قائمة كاملة بالمخالفات المكتشفة مع شرح تفصيلي وتوصيات الإصلاح
                    </CardDescription>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => generateReportMutation.mutate("pdf")}
                      disabled={generateReportMutation.isPending}
                      data-testid="button-export-pdf"
                    >
                      {generateReportMutation.isPending ? (
                        <RefreshCw className="ml-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="ml-2 h-4 w-4" />
                      )}
                      PDF
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => generateReportMutation.mutate("html")}
                      disabled={generateReportMutation.isPending}
                      data-testid="button-export-html"
                    >
                      {generateReportMutation.isPending ? (
                        <RefreshCw className="ml-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="ml-2 h-4 w-4" />
                      )}
                      HTML
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => generateReportMutation.mutate("json")}
                      disabled={generateReportMutation.isPending}
                      data-testid="button-export-json"
                    >
                      {generateReportMutation.isPending ? (
                        <RefreshCw className="ml-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="ml-2 h-4 w-4" />
                      )}
                      JSON
                    </Button>
                  </div>
                </div>

                {/* Issues Summary Stats */}
                {issues.length > 0 && (
                  <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t">
                    <div className={`p-3 rounded-lg text-center ${severityCounts.critical > 0 ? 'bg-red-50 dark:bg-red-950/30 border border-red-200' : 'bg-muted'}`}>
                      <XCircle className={`w-5 h-5 mx-auto mb-1 ${severityCounts.critical > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
                      <div className={`text-xl font-bold ${severityCounts.critical > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                        {severityCounts.critical}
                      </div>
                      <p className="text-xs text-muted-foreground">حرجة (تحتاج إصلاح فوري)</p>
                    </div>
                    <div className={`p-3 rounded-lg text-center ${severityCounts.warning > 0 ? 'bg-orange-50 dark:bg-orange-950/30 border border-orange-200' : 'bg-muted'}`}>
                      <AlertTriangle className={`w-5 h-5 mx-auto mb-1 ${severityCounts.warning > 0 ? 'text-orange-500' : 'text-muted-foreground'}`} />
                      <div className={`text-xl font-bold ${severityCounts.warning > 0 ? 'text-orange-500' : 'text-muted-foreground'}`}>
                        {severityCounts.warning}
                      </div>
                      <p className="text-xs text-muted-foreground">تحذيرات (موصى بإصلاحها)</p>
                    </div>
                    <div className={`p-3 rounded-lg text-center ${severityCounts.suggestion > 0 ? 'bg-blue-50 dark:bg-blue-950/30 border border-blue-200' : 'bg-muted'}`}>
                      <Info className={`w-5 h-5 mx-auto mb-1 ${severityCounts.suggestion > 0 ? 'text-blue-500' : 'text-muted-foreground'}`} />
                      <div className={`text-xl font-bold ${severityCounts.suggestion > 0 ? 'text-blue-500' : 'text-muted-foreground'}`}>
                        {severityCounts.suggestion}
                      </div>
                      <p className="text-xs text-muted-foreground">اقتراحات (تحسينات)</p>
                    </div>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {issues.length === 0 ? (
                  <div className="text-center py-12 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200">
                    <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-green-700 dark:text-green-400 mb-2">لا توجد مخالفات!</h3>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      {isPartialAnalysis 
                        ? "لم يتم اكتشاف مخالفات في التحليل الأولي. لتحليل أعمق، أعد الفحص عند توفر خدمة الذكاء الاصطناعي."
                        : "تهانينا! موقعك يبدو متوافقاً مع متطلبات PDPL الأساسية."}
                    </p>
                  </div>
                ) : (
                  <Tabs defaultValue="all" className="w-full">
                    <TabsList className="grid w-full grid-cols-4 mb-4">
                      <TabsTrigger value="all" data-testid="tab-all" className="gap-1">
                        <span>الكل</span>
                        <Badge variant="secondary" className="text-xs">{issues.length}</Badge>
                      </TabsTrigger>
                      <TabsTrigger value="critical" data-testid="tab-critical" className="gap-1">
                        <span>حرجة</span>
                        {severityCounts.critical > 0 && (
                          <Badge variant="destructive" className="text-xs">{severityCounts.critical}</Badge>
                        )}
                      </TabsTrigger>
                      <TabsTrigger value="warning" data-testid="tab-warning" className="gap-1">
                        <span>تحذيرات</span>
                        {severityCounts.warning > 0 && (
                          <Badge variant="outline" className="text-xs border-orange-300 text-orange-600">{severityCounts.warning}</Badge>
                        )}
                      </TabsTrigger>
                      <TabsTrigger value="suggestion" data-testid="tab-suggestion" className="gap-1">
                        <span>اقتراحات</span>
                        {severityCounts.suggestion > 0 && (
                          <Badge variant="outline" className="text-xs border-blue-300 text-blue-600">{severityCounts.suggestion}</Badge>
                        )}
                      </TabsTrigger>
                    </TabsList>
                    
                    {["all", "critical", "warning", "suggestion"].map((severity) => (
                      <TabsContent key={severity} value={severity} className="mt-4">
                        <div className="space-y-4">
                          {Object.entries(issuesByCategory).map(([category, categoryIssues]) => {
                            const filteredIssues = severity === "all" 
                              ? categoryIssues 
                              : categoryIssues.filter(i => i.severity === severity);
                            
                            if (filteredIssues.length === 0) return null;
                            
                            return (
                              <div key={category} className="border rounded-lg overflow-hidden">
                                <div className="bg-muted/50 p-3 flex items-center justify-between border-b">
                                  <h3 className="font-bold flex items-center gap-2">
                                    {category === 'privacy_policy' && <FileText className="w-4 h-4 text-primary" />}
                                    {category === 'terms_conditions' && <ScrollText className="w-4 h-4 text-primary" />}
                                    {category === 'cookie_consent' && <Cookie className="w-4 h-4 text-primary" />}
                                    {category === 'contact_info' && <Settings className="w-4 h-4 text-primary" />}
                                    {getCategoryLabel(category)}
                                  </h3>
                                  <Badge variant="outline">{filteredIssues.length} مخالفة</Badge>
                                </div>
                                <div className="divide-y">
                                  {filteredIssues.map((issue) => (
                                    <div key={issue.id} className="p-4" data-testid={`issue-${issue.id}`}>
                                      {/* Issue Header */}
                                      <div className="flex items-start justify-between gap-4 mb-3">
                                        <div className="flex items-start gap-3">
                                          {getSeverityIcon(issue.severity)}
                                          <div>
                                            <h4 className="font-bold text-base">{issue.title}</h4>
                                            {issue.articleReference && (
                                              <Badge variant="outline" className="mt-1 text-xs">
                                                {issue.articleReference}
                                              </Badge>
                                            )}
                                          </div>
                                        </div>
                                        {getSeverityBadge(issue.severity)}
                                      </div>
                                      
                                      {/* Issue Details Grid */}
                                      <div className="grid gap-3 mr-8">
                                        {/* Description */}
                                        <div className="bg-muted/30 p-3 rounded-lg">
                                          <h5 className="font-semibold text-sm mb-1 flex items-center gap-1">
                                            <Info className="w-3 h-3" />
                                            ما هي المخالفة؟
                                          </h5>
                                          <p className="text-sm text-muted-foreground">
                                            {issue.description}
                                          </p>
                                        </div>
                                        
                                        {/* Violating Text */}
                                        {issue.violatingText && (
                                          <div className="bg-red-50 dark:bg-red-950/30 p-3 rounded-lg border border-red-200">
                                            <h5 className="font-semibold text-sm mb-1 flex items-center gap-1 text-destructive">
                                              <XCircle className="w-3 h-3" />
                                              النص المخالف:
                                            </h5>
                                            <blockquote className="text-sm italic border-r-4 border-destructive pr-3 mr-2">
                                              "{issue.violatingText}"
                                            </blockquote>
                                          </div>
                                        )}
                                        
                                        {/* Regulation */}
                                        {issue.regulation && (
                                          <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-200">
                                            <h5 className="font-semibold text-sm mb-1 flex items-center gap-1 text-blue-700 dark:text-blue-400">
                                              <Shield className="w-3 h-3" />
                                              المادة القانونية المخالفة:
                                            </h5>
                                            <p className="text-sm text-muted-foreground">
                                              {issue.regulation}
                                            </p>
                                          </div>
                                        )}
                                        
                                        {/* Remediation */}
                                        <div className="bg-green-50 dark:bg-green-950/30 p-3 rounded-lg border border-green-200">
                                          <h5 className="font-semibold text-sm mb-1 flex items-center gap-1 text-green-700 dark:text-green-400">
                                            <CheckCircle className="w-3 h-3" />
                                            كيف تصلح هذه المخالفة؟
                                          </h5>
                                          <p className="text-sm text-muted-foreground">
                                            {issue.remediation}
                                          </p>
                                        </div>
                                        
                                        {/* Tags */}
                                        <div className="flex flex-wrap gap-2 pt-2">
                                          {issue.documentType && (
                                            <Badge variant="outline" className="gap-1 text-xs">
                                              <FileText className="w-3 h-3" />
                                              {getDocumentTypeLabel(issue.documentType)}
                                            </Badge>
                                          )}
                                          {issue.requirementId && (
                                            <Badge variant="secondary" className="font-mono text-xs">
                                              معرّف: {issue.requirementId}
                                            </Badge>
                                          )}
                                          {issue.affectedElement && (
                                            <Badge variant="outline" className="text-xs">
                                              العنصر: {issue.affectedElement}
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        
                        {/* Empty state for filtered tabs */}
                        {severity !== "all" && 
                          Object.entries(issuesByCategory).every(([_, categoryIssues]) => 
                            categoryIssues.filter(i => i.severity === severity).length === 0
                          ) && (
                          <div className="text-center py-8 bg-muted/30 rounded-lg">
                            <CheckCircle className="w-10 h-10 text-green-600 mx-auto mb-3" />
                            <p className="font-medium">لا توجد مخالفات من هذا النوع</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {severity === "critical" && "لا توجد مخالفات حرجة - ممتاز!"}
                              {severity === "warning" && "لا توجد تحذيرات"}
                              {severity === "suggestion" && "لا توجد اقتراحات إضافية"}
                            </p>
                          </div>
                        )}
                      </TabsContent>
                    ))}
                  </Tabs>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Failed State */}
        {scan.status === "failed" && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <XCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
                <p className="text-lg font-medium mb-2">فشل الفحص</p>
                <p className="text-sm text-muted-foreground mb-4">
                  {scan.errorMessage || "حدث خطأ أثناء محاولة فحص الموقع. يرجى التأكد من صحة الرابط والمحاولة مرة أخرى."}
                </p>
                <Button onClick={() => setLocation("/")} data-testid="button-try-again">
                  <RefreshCw className="ml-2 h-4 w-4" />
                  محاولة مرة أخرى
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}