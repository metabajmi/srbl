import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, MessageSquare, Settings, LogOut } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function DashboardPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  // Get user from localStorage (temporary - will implement proper session later)
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  
  if (!user.id) {
    navigate("/login");
    return null;
  }

  const handleLogout = () => {
    localStorage.removeItem("user");
    toast({
      title: "تم تسجيل الخروج",
      description: "نراك قريباً!",
    });
    navigate("/login");
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-dashboard-title">
            مرحباً، {user.name}!
          </h1>
          <p className="text-muted-foreground mt-1">
            لوحة التحكم الخاصة بك في منصة الامتثال PDPL
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

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card data-testid="card-policies">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">سياساتي</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-policies-count">0</div>
            <p className="text-xs text-muted-foreground">سياسة نشطة</p>
          </CardContent>
        </Card>

        <Card data-testid="card-requests">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">طلباتي</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-requests-count">0</div>
            <p className="text-xs text-muted-foreground">طلب قيد المعالجة</p>
          </CardContent>
        </Card>

        <Card data-testid="card-profile">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الحساب</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-email">{user.email}</div>
            <p className="text-xs text-muted-foreground">البريد الإلكتروني</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>سياساتي</CardTitle>
            <CardDescription>
              عرض وإدارة سياسات الخصوصية والشروط والأحكام
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate("/dashboard/policies")}
              data-testid="button-view-policies"
            >
              عرض السياسات
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>طلباتي</CardTitle>
            <CardDescription>
              متابعة طلباتك والحصول على الدعم
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate("/dashboard/requests")}
              data-testid="button-view-requests"
            >
              عرض الطلبات
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
