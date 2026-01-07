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
  Shield
} from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { BackButton } from "@/components/BackButton";

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
  const { data: policies = [], isLoading: policiesLoading } = useQuery<any[]>({
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20" dir="rtl">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <BackButton />
        
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-l from-primary to-primary/60 bg-clip-text text-transparent">
                حسابي
              </h1>
              <p className="text-muted-foreground">
                إدارة حسابك ووثائقك
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6">
          {/* Card 1: Client Profile */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                بيانات العميل
              </CardTitle>
              <CardDescription>معلومات حسابك الشخصية</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <User className="h-4 w-4" />
                    الاسم
                  </p>
                  <p className="font-medium" data-testid="text-user-name">
                    {user.name || "غير محدد"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    البريد الإلكتروني
                  </p>
                  <p className="font-medium text-left" dir="ltr" data-testid="text-user-email">
                    {user.email}
                  </p>
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <Button 
                  variant="destructive" 
                  onClick={handleLogout}
                  data-testid="button-logout"
                  className="w-full sm:w-auto"
                >
                  <LogOut className="h-4 w-4 ml-2" />
                  تسجيل الخروج
                </Button>
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
                  {policies.map((policy: any, index: number) => (
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
                          <p className="font-medium">{policy.title || "سياسة الخصوصية"}</p>
                          <p className="text-sm text-muted-foreground">
                            {policy.createdAt ? formatDate(policy.createdAt) : "تاريخ غير محدد"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(policy.status || "completed")}
                        {policy.downloadUrl && (
                          <Button 
                            variant="ghost" 
                            size="icon"
                            asChild
                            data-testid={`button-download-${policy.id || index}`}
                          >
                            <a href={policy.downloadUrl} download>
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
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
