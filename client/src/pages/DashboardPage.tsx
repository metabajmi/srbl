import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText, 
  MessageSquare, 
  Settings, 
  LogOut, 
  Shield, 
  AlertCircle, 
  AlertTriangle, 
  CheckCircle, 
  Globe, 
  Search,
  Download,
  CreditCard,
  Loader2,
  FileCheck
} from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import type { ComplianceScan, ComplianceIssue, PolicyDocument } from "@shared/schema";
import MoyasarPayment from "@/components/MoyasarPayment";

export default function DashboardPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("scan");
  const [showPayment, setShowPayment] = useState(false);
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(null);
  
  // Get user from localStorage
  let user = { id: "", email: "", name: "" };
  try {
    const userStr = localStorage.getItem("user");
    if (userStr && userStr !== "undefined" && userStr !== "null") {
      user = JSON.parse(userStr);
    }
  } catch (e) {
    console.error("Failed to parse user from localStorage", e);
  }
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user.id) {
      navigate("/login");
    }
  }, [user.id, navigate]);
  
  if (!user.id) {
    return null;
  }

  // Fetch user's latest scan
  const { data: latestScan, isLoading: scanLoading, error: scanError } = useQuery<ComplianceScan>({
    queryKey: ["/api/user/scans/latest"],
    retry: false,
  });
  
  // Fetch issues for the latest scan (when authenticated)
  const { data: issues = [] } = useQuery<ComplianceIssue[]>({
    queryKey: ["/api/scans", latestScan?.id, "issues"],
    queryFn: async () => {
      const response = await fetch(`/api/scans/${latestScan?.id}/issues`);
      if (!response.ok) throw new Error("Failed to fetch issues");
      return response.json();
    },
    enabled: !!latestScan?.id && latestScan?.status === "completed",
  });
  
  // Fetch user's policies
  const { data: policies = [] } = useQuery<PolicyDocument[]>({
    queryKey: ["/api/user/policies"],
  });
  
  // Fetch user's policy requests
  const { data: policyRequests = [] } = useQuery<any[]>({
    queryKey: ["/api/policy-requests"],
  });

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      localStorage.removeItem("user");
      toast({
        title: "تم تسجيل الخروج",
        description: "نراك قريباً!",
      });
      navigate("/login");
    } catch (error) {
      localStorage.removeItem("user");
      navigate("/login");
    }
  };
  
  // Create policy request mutation
  const createRequestMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/policy-requests", {
        scanId: latestScan?.id,
        intakeData: {
          companyName: extractDomainName(latestScan?.url || ""),
          businessType: "تجارة إلكترونية",
          entityType: "private",
          contactEmail: user.email,
          dataCategories: [],
        },
      });
      return response.json();
    },
    onSuccess: (data) => {
      setCurrentRequestId(data.id);
      setShowPayment(true);
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "فشل في إنشاء طلب السياسة",
        variant: "destructive",
      });
    },
  });
  
  // Handle payment completion
  const handlePaymentComplete = async (paymentId: string) => {
    try {
      // Verify payment
      const verifyResponse = await apiRequest("POST", "/api/payments/verify", {
        paymentId,
        requestId: currentRequestId,
      });
      
      if (!verifyResponse.ok) {
        throw new Error("فشل التحقق من الدفع");
      }
      
      // Trigger policy generation
      const generateResponse = await apiRequest("POST", `/api/policy-requests/${currentRequestId}/generate`);
      
      if (!generateResponse.ok) {
        throw new Error("فشل في بدء توليد السياسة");
      }
      
      toast({
        title: "تم الدفع بنجاح",
        description: "جاري توليد سياسة الخصوصية...",
      });
      
      setShowPayment(false);
      queryClient.invalidateQueries({ queryKey: ["/api/user/policies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/policy-requests"] });
      setActiveTab("policies");
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ أثناء معالجة الدفع",
        variant: "destructive",
      });
    }
  };
  
  // Filter issues by severity
  const criticalIssues = issues.filter(i => i.severity === "critical");
  const warningIssues = issues.filter(i => i.severity === "warning");
  const suggestionIssues = issues.filter(i => i.severity === "suggestion");
  
  // Get compliance badge color
  const getComplianceBadge = (level: string | null | undefined) => {
    switch (level) {
      case "high":
        return <Badge className="bg-green-500 text-white">امتثال مرتفع</Badge>;
      case "medium":
        return <Badge className="bg-yellow-500 text-white">امتثال متوسط</Badge>;
      case "low":
        return <Badge className="bg-red-500 text-white">امتثال منخفض</Badge>;
      default:
        return <Badge variant="outline">غير محدد</Badge>;
    }
  };
  
  // Extract domain name from URL
  const extractDomainName = (url: string): string => {
    try {
      const hostname = new URL(url).hostname;
      return hostname.replace(/^www\./, "");
    } catch {
      return url;
    }
  };

  // No scan state
  const hasNoScans = !scanLoading && (scanError || !latestScan);

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-dashboard-title">
            مرحباً، {user.name}!
          </h1>
          <p className="text-muted-foreground mt-1">
            لوحة تحكم العميل - إدارة فحوصاتك وسياساتك
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleLogout}
          data-testid="button-logout"
        >
          <LogOut className="ml-2 h-4 w-4" />
          تسجيل الخروج
        </Button>
      </div>

      {/* No Scan State */}
      {hasNoScans && (
        <Card className="mb-8">
          <CardContent className="pt-6 text-center">
            <Search className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold mb-2">لا توجد فحوصات بعد</h2>
            <p className="text-muted-foreground mb-6">
              ابدأ بفحص موقعك للتحقق من امتثاله لنظام حماية البيانات الشخصية
            </p>
            <Button 
              size="lg" 
              onClick={() => navigate("/")}
              data-testid="button-start-scan"
            >
              <Globe className="ml-2 h-5 w-5" />
              بدء فحص جديد
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Main Dashboard Content */}
      {!hasNoScans && latestScan && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="scan" data-testid="tab-scan">
              <Shield className="ml-2 h-4 w-4" />
              نتائج الفحص
            </TabsTrigger>
            <TabsTrigger value="violations" data-testid="tab-violations">
              <AlertCircle className="ml-2 h-4 w-4" />
              المخالفات
            </TabsTrigger>
            <TabsTrigger value="policies" data-testid="tab-policies">
              <FileText className="ml-2 h-4 w-4" />
              سياساتي
            </TabsTrigger>
          </TabsList>

          {/* Scan Results Tab */}
          <TabsContent value="scan" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-5 w-5" />
                      {extractDomainName(latestScan.url)}
                    </CardTitle>
                    <CardDescription>
                      آخر فحص: {latestScan.completedAt ? new Date(latestScan.completedAt).toLocaleDateString("ar-SA") : "جاري الفحص..."}
                    </CardDescription>
                  </div>
                  {getComplianceBadge(latestScan.complianceLevel)}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Compliance Score */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>نسبة الامتثال</span>
                    <span className="font-bold">{latestScan.overallScore || 0}%</span>
                  </div>
                  <Progress value={latestScan.overallScore || 0} className="h-3" />
                </div>
                
                {/* Issue Counts */}
                <div className="grid grid-cols-3 gap-4">
                  <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
                    <CardContent className="pt-4 text-center">
                      <AlertCircle className="h-8 w-8 mx-auto text-red-500 mb-2" />
                      <div className="text-2xl font-bold text-red-600" data-testid="count-critical">
                        {latestScan.criticalCount || 0}
                      </div>
                      <p className="text-sm text-muted-foreground">مخالفات حرجة</p>
                    </CardContent>
                  </Card>
                  
                  <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
                    <CardContent className="pt-4 text-center">
                      <AlertTriangle className="h-8 w-8 mx-auto text-yellow-500 mb-2" />
                      <div className="text-2xl font-bold text-yellow-600" data-testid="count-warning">
                        {latestScan.warningCount || 0}
                      </div>
                      <p className="text-sm text-muted-foreground">تحذيرات</p>
                    </CardContent>
                  </Card>
                  
                  <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
                    <CardContent className="pt-4 text-center">
                      <CheckCircle className="h-8 w-8 mx-auto text-blue-500 mb-2" />
                      <div className="text-2xl font-bold text-blue-600" data-testid="count-suggestion">
                        {latestScan.suggestionCount || 0}
                      </div>
                      <p className="text-sm text-muted-foreground">اقتراحات</p>
                    </CardContent>
                  </Card>
                </div>
                
                {/* Action Buttons */}
                <div className="flex gap-4 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => navigate("/")}
                    data-testid="button-new-scan"
                  >
                    <Globe className="ml-2 h-4 w-4" />
                    فحص موقع آخر
                  </Button>
                  <Button 
                    onClick={() => setActiveTab("violations")}
                    data-testid="button-view-violations"
                  >
                    <AlertCircle className="ml-2 h-4 w-4" />
                    عرض المخالفات
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Violations Tab */}
          <TabsContent value="violations" className="space-y-6">
            {/* Generate Policy CTA */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold mb-1">تحسين سياسة الخصوصية</h3>
                    <p className="text-muted-foreground text-sm">
                      احصل على سياسة خصوصية متوافقة مع نظام حماية البيانات الشخصية
                    </p>
                  </div>
                  {!showPayment && (
                    <Button 
                      onClick={() => createRequestMutation.mutate()}
                      disabled={createRequestMutation.isPending}
                      data-testid="button-generate-policy"
                    >
                      {createRequestMutation.isPending ? (
                        <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                      ) : (
                        <CreditCard className="ml-2 h-4 w-4" />
                      )}
                      توليد السياسة (99 ر.س)
                    </Button>
                  )}
                </div>
                
                {/* Payment Modal */}
                {showPayment && currentRequestId && (
                  <div className="mt-6 p-4 bg-background rounded-lg border">
                    <h4 className="font-semibold mb-4 text-center">إتمام الدفع</h4>
                    <MoyasarPayment
                      amount={9900}
                      description={`سياسة خصوصية - ${extractDomainName(latestScan.url)}`}
                      callbackUrl={window.location.href}
                      onCompleted={async (payment) => {
                        await handlePaymentComplete(payment.id);
                      }}
                      onError={(error) => {
                        toast({
                          title: "فشل الدفع",
                          description: String(error),
                          variant: "destructive",
                        });
                        setShowPayment(false);
                      }}
                    />
                    <Button 
                      variant="ghost" 
                      className="w-full mt-4"
                      onClick={() => setShowPayment(false)}
                    >
                      إلغاء
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Issues List */}
            {issues.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">لا توجد مخالفات</h3>
                  <p className="text-muted-foreground">موقعك متوافق مع نظام حماية البيانات</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {/* Critical Issues */}
                {criticalIssues.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-semibold flex items-center gap-2 text-red-600">
                      <AlertCircle className="h-5 w-5" />
                      مخالفات حرجة ({criticalIssues.length})
                    </h3>
                    {criticalIssues.map((issue) => (
                      <Card key={issue.id} className="border-red-200">
                        <CardContent className="pt-4">
                          <div className="flex items-start gap-3">
                            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                            <div className="flex-1">
                              <h4 className="font-medium">{issue.title}</h4>
                              <p className="text-sm text-muted-foreground mt-1">{issue.description}</p>
                              {issue.regulation && (
                                <Badge variant="outline" className="mt-2">{issue.regulation}</Badge>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
                
                {/* Warning Issues */}
                {warningIssues.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-semibold flex items-center gap-2 text-yellow-600">
                      <AlertTriangle className="h-5 w-5" />
                      تحذيرات ({warningIssues.length})
                    </h3>
                    {warningIssues.map((issue) => (
                      <Card key={issue.id} className="border-yellow-200">
                        <CardContent className="pt-4">
                          <div className="flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                            <div className="flex-1">
                              <h4 className="font-medium">{issue.title}</h4>
                              <p className="text-sm text-muted-foreground mt-1">{issue.description}</p>
                              {issue.regulation && (
                                <Badge variant="outline" className="mt-2">{issue.regulation}</Badge>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
                
                {/* Suggestions */}
                {suggestionIssues.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-semibold flex items-center gap-2 text-blue-600">
                      <CheckCircle className="h-5 w-5" />
                      اقتراحات ({suggestionIssues.length})
                    </h3>
                    {suggestionIssues.map((issue) => (
                      <Card key={issue.id} className="border-blue-200">
                        <CardContent className="pt-4">
                          <div className="flex items-start gap-3">
                            <CheckCircle className="h-5 w-5 text-blue-500 mt-0.5" />
                            <div className="flex-1">
                              <h4 className="font-medium">{issue.title}</h4>
                              <p className="text-sm text-muted-foreground mt-1">{issue.description}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* Policies Tab */}
          <TabsContent value="policies" className="space-y-6">
            {policies.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">لا توجد سياسات بعد</h3>
                  <p className="text-muted-foreground mb-4">
                    احصل على سياسة خصوصية متوافقة مع نظام حماية البيانات
                  </p>
                  <Button onClick={() => setActiveTab("violations")}>
                    <CreditCard className="ml-2 h-4 w-4" />
                    توليد سياسة جديدة
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {policies.map((policy: any) => (
                  <Card key={policy.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <FileCheck className="h-5 w-5 text-green-500" />
                            {policy.companyName}
                          </CardTitle>
                          <CardDescription>
                            {policy.status === "completed" ? "جاهزة للتحميل" : "جاري التوليد..."}
                          </CardDescription>
                        </div>
                        <Badge variant={policy.status === "completed" ? "default" : "secondary"}>
                          {policy.status === "completed" ? "مكتملة" : "قيد التوليد"}
                        </Badge>
                      </div>
                    </CardHeader>
                    {policy.status === "completed" && policy.generatedContent && (
                      <CardContent>
                        <div className="bg-muted/50 p-4 rounded-lg max-h-64 overflow-y-auto mb-4 text-sm">
                          <div dangerouslySetInnerHTML={{ __html: policy.generatedContent.substring(0, 500) + "..." }} />
                        </div>
                        <Button className="w-full" onClick={() => {
                          const blob = new Blob([policy.generatedContent], { type: "text/html" });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `privacy-policy-${policy.companyName}.html`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}>
                          <Download className="ml-2 h-4 w-4" />
                          تحميل السياسة
                        </Button>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Loading State */}
      {scanLoading && (
        <Card>
          <CardContent className="pt-6 text-center">
            <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary mb-4" />
            <p className="text-lg font-medium">جاري تحميل البيانات...</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
