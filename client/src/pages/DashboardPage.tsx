import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  LogOut, 
  User,
  FileText,
  Clock,
  Download,
  Mail,
  CheckCircle2,
  FileCheck,
  Search,
  Shield,
  ChevronDown
} from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { BackButton } from "@/components/BackButton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { type PolicyDocument } from "@shared/schema";

export default function DashboardPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
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
  
  // Redirect to home if not authenticated
  useEffect(() => {
    if (!user.id) {
      navigate("/");
    }
  }, [user.id, navigate]);
  
  if (!user.id) {
    return null;
  }

  // Fetch user's policies
  const { data: policies = [], isLoading: policiesLoading } = useQuery<PolicyDocument[]>({
    queryKey: ["/api/user/policies"],
  });

  // Fetch user's activity log
  const { data: activityLog = [], isLoading: activityLoading } = useQuery<any[]>({
    queryKey: ["/api/user/activity"],
  });

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      localStorage.removeItem("user");
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "تم تسجيل الخروج",
        description: "نراك قريباً!",
      });
      window.dispatchEvent(new Event("storage"));
      navigate("/");
    } catch (error) {
      localStorage.removeItem("user");
      navigate("/");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("ar-SA", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="default" className="bg-green-500">مكتمل</Badge>;
      case "pending":
        return <Badge variant="secondary">قيد الانتظار</Badge>;
      case "processing":
        return <Badge variant="outline">جاري المعالجة</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "scan":
        return <Search className="h-4 w-4 text-primary" />;
      case "policy":
        return <FileText className="h-4 w-4 text-green-500" />;
      case "login":
        return <User className="h-4 w-4 text-blue-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const generateHtmlContent = (policy: PolicyDocument) => {
    const escapeHtml = (text: string): string => {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    };
    
    const safeCompanyName = escapeHtml(policy.companyName);
    const safeDate = escapeHtml(new Date(policy.createdAt!).toLocaleDateString('ar-SA', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }));
    
    return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>سياسة الخصوصية - ${safeCompanyName}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
        body { font-family: 'Cairo', sans-serif; line-height: 1.8; color: #1a1a1a; max-width: 900px; margin: 0 auto; padding: 40px 20px; }
        h1 { color: #16a34a; text-align: center; border-bottom: 3px solid #16a34a; padding-bottom: 20px; }
        h2 { color: #15803d; border-right: 5px solid #22c55e; padding-right: 15px; margin-top: 30px; }
        .header { text-align: center; margin-bottom: 40px; padding: 30px; background: linear-gradient(135deg, #16a34a, #22c55e); color: white; border-radius: 10px; }
        .header h1 { color: white; border-bottom: none; }
        .content { background: #fff; padding: 40px; border-radius: 10px; }
        .footer { margin-top: 50px; padding-top: 30px; border-top: 2px solid #e5e7eb; text-align: center; color: #6b7280; }
        ul { list-style-type: disc; padding-right: 20px; }
        li { margin-bottom: 8px; }
        @media print { body { padding: 20px; } .header { background: #16a34a !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    </style>
</head>
<body>
    <div class="header">
        <h1>سياسة الخصوصية</h1>
        <div>${safeCompanyName}</div>
        <div>تاريخ الإصدار: ${safeDate}</div>
    </div>
    <div class="content">${policy.generatedContent || ''}</div>
    <div class="footer">
        <p>تم توليدها وفقاً لنظام حماية البيانات الشخصية السعودي (PDPL)</p>
    </div>
</body>
</html>`;
  };

  const handleDownload = (policy: PolicyDocument, format: 'html' | 'pdf' | 'word') => {
    if (!policy.generatedContent) {
      toast({
        title: "خطأ",
        description: "لا يوجد محتوى للتحميل",
        variant: "destructive",
      });
      return;
    }
    
    const htmlContent = generateHtmlContent(policy);
    const fileName = `سياسة-الخصوصية-${policy.companyName}`;
    
    if (format === 'html') {
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileName}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else if (format === 'pdf') {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        setTimeout(() => {
          printWindow.print();
        }, 500);
      }
    } else if (format === 'word') {
      const wordContent = `
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
<meta charset="UTF-8">
<style>
body { font-family: 'Cairo', 'Arial', sans-serif; direction: rtl; text-align: right; line-height: 1.8; }
h1 { color: #16a34a; text-align: center; }
h2 { color: #15803d; border-right: 5px solid #22c55e; padding-right: 15px; }
</style>
</head>
<body dir="rtl">
<h1>سياسة الخصوصية</h1>
<p style="text-align: center; font-weight: bold;">${policy.companyName}</p>
<p style="text-align: center; color: #6b7280;">تاريخ الإصدار: ${new Date(policy.createdAt!).toLocaleDateString('ar-SA')}</p>
<hr/>
${policy.generatedContent}
</body>
</html>`;
      const blob = new Blob(['\ufeff', wordContent], { type: 'application/msword;charset=UTF-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileName}.doc`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
    
    toast({
      title: "تم التحميل",
      description: `تم تحميل الوثيقة بصيغة ${format.toUpperCase()}`,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20" dir="rtl">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Logout Button - Top Right */}
        <div className="flex justify-start">
          <Button 
            variant="destructive" 
            onClick={handleLogout}
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4 ml-2" />
            تسجيل الخروج
          </Button>
        </div>
        
        {/* Breadcrumb */}
        <BackButton />
        
        {/* Page Title */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-l from-primary to-primary/60 bg-clip-text text-transparent leading-relaxed pb-2">
                حسابي
              </h1>
              <p className="text-muted-foreground">
                إدارة حسابك ووثائقك
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6">
          {/* Card 1: Client Profile - Professional ID Card Style */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                بيانات العميل
              </CardTitle>
              <CardDescription>معلومات حسابك الشخصية</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Grid: 1 column on mobile, 2 columns on desktop */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Name Info Box */}
                <div className="bg-gray-50 dark:bg-muted/30 p-4 rounded-lg border border-gray-100 dark:border-border">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-primary/10 flex-shrink-0">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground mb-1">الاسم</p>
                      <p className="font-bold text-lg truncate" data-testid="text-user-name">
                        {user.name || "غير محدد"}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Email Info Box */}
                <div className="bg-gray-50 dark:bg-muted/30 p-4 rounded-lg border border-gray-100 dark:border-border">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-primary/10 flex-shrink-0">
                      <Mail className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground mb-1">البريد الإلكتروني</p>
                      <p className="font-bold text-lg truncate" dir="ltr" data-testid="text-user-email">
                        {user.email}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: My Documents */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                وثائقي
              </CardTitle>
              <CardDescription>الوثائق التي تم إنشاؤها</CardDescription>
            </CardHeader>
            <CardContent>
              {policiesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : policies.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileCheck className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>لا توجد وثائق بعد</p>
                  <p className="text-sm mt-1">ابدأ بفحص موقعك لإنشاء سياسة الخصوصية</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {policies.map((policy: PolicyDocument, index: number) => (
                    <div 
                      key={policy.id || index} 
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover-elevate"
                      data-testid={`row-policy-${policy.id || index}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Shield className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{policy.companyName || "سياسة الخصوصية"}</p>
                          <p className="text-sm text-muted-foreground">
                            {policy.createdAt ? formatDate(policy.createdAt.toString()) : "تاريخ غير محدد"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(policy.status || "completed")}
                        {policy.generatedContent && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                data-testid={`button-download-${policy.id || index}`}
                              >
                                <Download className="h-4 w-4 ml-1" />
                                تحميل
                                <ChevronDown className="h-3 w-3 mr-1" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem 
                                onClick={() => handleDownload(policy, 'html')}
                                data-testid={`button-download-html-${policy.id || index}`}
                              >
                                HTML
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDownload(policy, 'pdf')}
                                data-testid={`button-download-pdf-${policy.id || index}`}
                              >
                                PDF (طباعة)
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDownload(policy, 'word')}
                                data-testid={`button-download-word-${policy.id || index}`}
                              >
                                Word
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card 3: Activity Log */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                سجل النشاط
              </CardTitle>
              <CardDescription>آخر نشاطاتك على المنصة</CardDescription>
            </CardHeader>
            <CardContent>
              {activityLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : activityLog.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>لا يوجد نشاط بعد</p>
                  <p className="text-sm mt-1">ستظهر نشاطاتك هنا</p>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute top-0 bottom-0 right-[11px] w-0.5 bg-border"></div>
                  <div className="space-y-4">
                    {activityLog.slice(0, 10).map((activity: any, index: number) => (
                      <div 
                        key={activity.id || index} 
                        className="flex items-start gap-4 relative"
                        data-testid={`row-activity-${activity.id || index}`}
                      >
                        <div className="p-1.5 rounded-full bg-background border z-10">
                          {getActivityIcon(activity.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{activity.description || activity.action}</p>
                          <p className="text-xs text-muted-foreground">
                            {activity.createdAt ? `${formatDate(activity.createdAt)} - ${formatTime(activity.createdAt)}` : ""}
                          </p>
                        </div>
                        <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-1" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
