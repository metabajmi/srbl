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
import { Shield, AlertCircle, AlertTriangle, Info, FileText, Download, ArrowRight, CheckCircle, XCircle, Globe, Home, RefreshCw } from "lucide-react";
import { ComplianceScan, ComplianceIssue } from "@shared/schema";
import { useState, useEffect } from "react";
import { BackButton } from "@/components/BackButton";

export default function ScanResultsPage() {
  const [, params] = useRoute("/scan/:id");
  const scanId = params?.id;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [autoRefresh, setAutoRefresh] = useState(true);

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

  // Refetch issues when scan completes
  useEffect(() => {
    if (scan?.status === "completed") {
      refetchIssues();
    }
  }, [scan?.status, refetchIssues]);

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
      data_collection: "جمع البيانات",
      consent: "الموافقة والإذن",
      security: "الأمان والحماية",
      data_retention: "حفظ البيانات",
      third_party: "الأطراف الثالثة",
      user_rights: "حقوق المستخدم",
      cookies: "ملفات تعريف الارتباط",
      general: "عام",
    };
    return labels[category] || category;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    if (score >= 40) return "text-orange-600";
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
            <h1 className="text-xl font-bold">نتائج فحص الامتثال</h1>
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
            {/* Score Summary */}
            <div className="grid gap-6 mb-6 md:grid-cols-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className={`text-4xl font-bold mb-2 ${getScoreColor(scan.overallScore || 0)}`}>
                      {scan.overallScore || 0}%
                    </div>
                    <p className="text-sm text-muted-foreground">نسبة الامتثال</p>
                  </div>
                </CardContent>
              </Card>
              <Card className={severityCounts.critical > 0 ? "border-destructive" : ""}>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="flex justify-center mb-2">
                      <XCircle className="w-8 h-8 text-destructive" />
                    </div>
                    <div className="text-2xl font-bold mb-1">{severityCounts.critical}</div>
                    <p className="text-sm text-muted-foreground">مخالفات حرجة</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="flex justify-center mb-2">
                      <AlertTriangle className="w-8 h-8 text-orange-500" />
                    </div>
                    <div className="text-2xl font-bold mb-1">{severityCounts.warning}</div>
                    <p className="text-sm text-muted-foreground">تحذيرات</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="flex justify-center mb-2">
                      <Info className="w-8 h-8 text-yellow-500" />
                    </div>
                    <div className="text-2xl font-bold mb-1">{severityCounts.suggestion}</div>
                    <p className="text-sm text-muted-foreground">اقتراحات</p>
                  </div>
                </CardContent>
              </Card>
            </div>

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
                      <Download className="ml-2 h-4 w-4" />
                      تصدير PDF
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => generateReportMutation.mutate("html")}
                      disabled={generateReportMutation.isPending}
                      data-testid="button-export-html"
                    >
                      <Download className="ml-2 h-4 w-4" />
                      تصدير HTML
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => generateReportMutation.mutate("json")}
                      disabled={generateReportMutation.isPending}
                      data-testid="button-export-json"
                    >
                      <Download className="ml-2 h-4 w-4" />
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
                                          {issue.affectedElement && (
                                            <div>
                                              <h4 className="font-semibold text-sm mb-2">العنصر المتأثر:</h4>
                                              <code className="text-xs bg-muted p-2 rounded block" dir="ltr">
                                                {issue.affectedElement}
                                              </code>
                                            </div>
                                          )}
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
                  حدث خطأ أثناء محاولة فحص الموقع. يرجى التأكد من صحة الرابط والمحاولة مرة أخرى.
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