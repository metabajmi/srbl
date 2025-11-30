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
import { Shield, AlertCircle, AlertTriangle, Info, FileText, Download, ArrowRight, CheckCircle, XCircle, Globe, Home, RefreshCw, Wrench, ScrollText, Cookie, Settings } from "lucide-react";
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

            {/* Compliance Level & Score Summary */}
            <div className="grid gap-6 mb-6 md:grid-cols-2">
              {/* Compliance Level Card */}
              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="text-lg">مستوى الامتثال</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`text-5xl font-bold ${getComplianceLevelColor(scan.complianceLevel)}`}>
                      {scan.overallScore || 0}%
                    </div>
                    {getComplianceLevelBadge(scan.complianceLevel)}
                  </div>
                  <div className="grid grid-cols-3 gap-3 mt-4">
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="flex justify-center mb-1">
                        <XCircle className="w-5 h-5 text-destructive" />
                      </div>
                      <div className="text-xl font-bold">{severityCounts.critical}</div>
                      <p className="text-xs text-muted-foreground">حرجة</p>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="flex justify-center mb-1">
                        <AlertTriangle className="w-5 h-5 text-orange-500" />
                      </div>
                      <div className="text-xl font-bold">{severityCounts.warning}</div>
                      <p className="text-xs text-muted-foreground">تحذيرات</p>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="flex justify-center mb-1">
                        <Info className="w-5 h-5 text-yellow-500" />
                      </div>
                      <div className="text-xl font-bold">{severityCounts.suggestion}</div>
                      <p className="text-xs text-muted-foreground">اقتراحات</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Compliance Findings Card */}
              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="text-lg">نتائج الفحص التفصيلية</CardTitle>
                  <CardDescription>العناصر الموجودة والمفقودة في موقعك</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className={`flex items-center justify-between p-3 rounded-lg ${scan.hasPrivacyPolicy ? 'bg-green-50 dark:bg-green-950' : 'bg-destructive/10'}`}>
                      <div className="flex items-center gap-2">
                        {scan.hasPrivacyPolicy ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-destructive" />
                        )}
                        <span className="font-medium">سياسة الخصوصية</span>
                      </div>
                      {scan.hasPrivacyPolicy ? (
                        <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">موجودة</Badge>
                      ) : (
                        <Badge variant="destructive">مفقودة</Badge>
                      )}
                    </div>
                    
                    <div className={`flex items-center justify-between p-3 rounded-lg ${scan.hasTermsAndConditions ? 'bg-green-50 dark:bg-green-950' : 'bg-destructive/10'}`}>
                      <div className="flex items-center gap-2">
                        {scan.hasTermsAndConditions ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-destructive" />
                        )}
                        <span className="font-medium">شروط الاستخدام</span>
                      </div>
                      {scan.hasTermsAndConditions ? (
                        <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">موجودة</Badge>
                      ) : (
                        <Badge variant="destructive">مفقودة</Badge>
                      )}
                    </div>

                    <div className={`flex items-center justify-between p-3 rounded-lg ${scan.hasCookieBanner ? 'bg-green-50 dark:bg-green-950' : 'bg-orange-50 dark:bg-orange-950'}`}>
                      <div className="flex items-center gap-2">
                        {scan.hasCookieBanner ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <AlertTriangle className="w-5 h-5 text-orange-500" />
                        )}
                        <span className="font-medium">لافتة الكوكيز</span>
                      </div>
                      {scan.hasCookieBanner ? (
                        <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">موجودة</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300">مفقودة</Badge>
                      )}
                    </div>

                    <div className={`flex items-center justify-between p-3 rounded-lg ${scan.hasContactInfo ? 'bg-green-50 dark:bg-green-950' : 'bg-orange-50 dark:bg-orange-950'}`}>
                      <div className="flex items-center gap-2">
                        {scan.hasContactInfo ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <AlertTriangle className="w-5 h-5 text-orange-500" />
                        )}
                        <span className="font-medium">معلومات الاتصال</span>
                      </div>
                      {scan.hasContactInfo ? (
                        <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">موجودة</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300">مفقودة</Badge>
                      )}
                    </div>
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

            {/* Issues Tabs */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>المخالفات والتوصيات</CardTitle>
                  <div className="flex gap-2">
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
                      تصدير PDF
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
                      تصدير HTML
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
                      تصدير JSON
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="all" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="all" data-testid="tab-all">
                      الكل ({issues.length})
                    </TabsTrigger>
                    <TabsTrigger value="critical" data-testid="tab-critical">
                      حرج ({severityCounts.critical})
                    </TabsTrigger>
                    <TabsTrigger value="warning" data-testid="tab-warning">
                      تحذير ({severityCounts.warning})
                    </TabsTrigger>
                    <TabsTrigger value="suggestion" data-testid="tab-suggestion">
                      اقتراح ({severityCounts.suggestion})
                    </TabsTrigger>
                  </TabsList>
                  
                  {["all", "critical", "warning", "suggestion"].map((severity) => (
                    <TabsContent key={severity} value={severity} className="mt-6">
                      <Accordion type="single" collapsible className="w-full">
                        {Object.entries(issuesByCategory).map(([category, categoryIssues]) => {
                          const filteredIssues = severity === "all" 
                            ? categoryIssues 
                            : categoryIssues.filter(i => i.severity === severity);
                          
                          if (filteredIssues.length === 0) return null;
                          
                          return (
                            <AccordionItem key={category} value={category}>
                              <AccordionTrigger className="text-right">
                                <div className="flex items-center justify-between w-full pl-4">
                                  <span className="font-semibold">{getCategoryLabel(category)}</span>
                                  <Badge variant="outline">
                                    {filteredIssues.length} مخالفة
                                  </Badge>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent>
                                <div className="space-y-4">
                                  {filteredIssues.map((issue, index) => (
                                    <Card key={issue.id} data-testid={`issue-${issue.id}`}>
                                      <CardHeader>
                                        <div className="flex items-start justify-between">
                                          <div className="flex items-start gap-3">
                                            {getSeverityIcon(issue.severity)}
                                            <div>
                                              <CardTitle className="text-base">{issue.title}</CardTitle>
                                              {issue.articleReference && (
                                                <Badge variant="outline" className="mt-2">
                                                  {issue.articleReference}
                                                </Badge>
                                              )}
                                            </div>
                                          </div>
                                          {getSeverityBadge(issue.severity)}
                                        </div>
                                      </CardHeader>
                                      <CardContent>
                                        <div className="space-y-4">
                                          <div>
                                            <h4 className="font-semibold text-sm mb-2">الوصف:</h4>
                                            <p className="text-sm text-muted-foreground">
                                              {issue.description}
                                            </p>
                                          </div>
                                          {issue.violatingText && (
                                            <div>
                                              <h4 className="font-semibold text-sm mb-2 text-destructive">النص المخالف:</h4>
                                              <blockquote className="text-sm bg-destructive/10 text-destructive-foreground p-3 rounded border-r-4 border-destructive">
                                                "{issue.violatingText}"
                                              </blockquote>
                                            </div>
                                          )}
                                          {issue.regulation && (
                                            <div>
                                              <h4 className="font-semibold text-sm mb-2">اللائحة المخالفة:</h4>
                                              <p className="text-sm text-muted-foreground">
                                                {issue.regulation}
                                              </p>
                                            </div>
                                          )}
                                          <div>
                                            <h4 className="font-semibold text-sm mb-2">التوصية للمعالجة:</h4>
                                            <p className="text-sm text-muted-foreground">
                                              {issue.remediation}
                                            </p>
                                          </div>
                                          <div className="flex flex-wrap gap-2 pt-2 border-t">
                                            {issue.documentType && (
                                              <Badge variant="outline" className="gap-1">
                                                <FileText className="w-3 h-3" />
                                                {getDocumentTypeLabel(issue.documentType)}
                                              </Badge>
                                            )}
                                            {issue.requirementId && (
                                              <Badge variant="secondary" className="font-mono text-xs">
                                                {issue.requirementId}
                                              </Badge>
                                            )}
                                            {issue.affectedElement && (
                                              <Badge variant="outline" className="text-xs">
                                                {issue.affectedElement}
                                              </Badge>
                                            )}
                                          </div>
                                        </div>
                                      </CardContent>
                                    </Card>
                                  ))}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          );
                        })}
                      </Accordion>
                      
                      {Object.keys(issuesByCategory).length === 0 && (
                        <div className="text-center py-12">
                          <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
                          <p className="text-lg font-medium">لا توجد مخالفات في هذه الفئة</p>
                          <p className="text-sm text-muted-foreground mt-2">
                            الموقع متوافق في هذا الجانب
                          </p>
                        </div>
                      )}
                    </TabsContent>
                  ))}
                </Tabs>
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