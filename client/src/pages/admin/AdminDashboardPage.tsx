import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, FileText, Inbox, Shield, LogOut, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminDashboardPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Get admin user from localStorage
  const adminUserStr = localStorage.getItem("adminUser");
  const adminUser = adminUserStr ? JSON.parse(adminUserStr) : null;

  // Redirect if not logged in
  if (!adminUser) {
    navigate("/admin/login");
    return null;
  }

  // Fetch statistics
  const { data: stats, isLoading } = useQuery<{
    totalUsers: number;
    totalPolicies: number;
    totalRequests: number;
    pendingRequests: number;
  }>({
    queryKey: ["/api/admin/stats"],
  });

  const handleLogout = () => {
    localStorage.removeItem("adminUser");
    toast({
      title: "تم تسجيل الخروج",
      description: "إلى اللقاء!",
    });
    navigate("/admin/login");
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-semibold">لوحة التحكم الإدارية</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-right">
              <div className="font-medium">{adminUser.name}</div>
              <div className="text-muted-foreground text-xs">{adminUser.role}</div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              data-testid="button-admin-logout"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Welcome Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>مرحباً، {adminUser.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              مرحباً بك في لوحة التحكم الإدارية. يمكنك إدارة المستخدمين والسياسات والطلبات من هنا.
            </p>
          </CardContent>
        </Card>

        {/* Statistics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <Card data-testid="card-stat-users">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">إجمالي المستخدمين</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-users">
                {isLoading ? "..." : stats?.totalUsers || 0}
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-policies">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">إجمالي السياسات</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-policies">
                {isLoading ? "..." : stats?.totalPolicies || 0}
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-requests">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">الطلبات المعلقة</CardTitle>
              <Inbox className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-pending-requests">
                {isLoading ? "..." : stats?.pendingRequests || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                من أصل {stats?.totalRequests || 0} طلب إجمالي
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>الإجراءات السريعة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Button
                variant="outline"
                className="h-20 flex-col gap-2"
                onClick={() => navigate("/admin/users")}
                data-testid="button-nav-users"
              >
                <Users className="w-5 h-5" />
                إدارة المستخدمين
              </Button>

              <Button
                variant="outline"
                className="h-20 flex-col gap-2"
                onClick={() => navigate("/admin/requests")}
                data-testid="button-nav-requests"
              >
                <Inbox className="w-5 h-5" />
                إدارة الطلبات
              </Button>

              <Button
                variant="outline"
                className="h-20 flex-col gap-2"
                onClick={() => navigate("/admin/policies")}
                data-testid="button-nav-policies"
              >
                <FileText className="w-5 h-5" />
                إدارة السياسات
              </Button>

              <Button
                variant="outline"
                className="h-20 flex-col gap-2"
                onClick={() => navigate("/admin/audit-logs")}
                data-testid="button-nav-audit-logs"
              >
                <Activity className="w-5 h-5" />
                سجل التدقيق
              </Button>

              <Button
                variant="outline"
                className="h-20 flex-col gap-2"
                onClick={() => navigate("/admin/admins")}
                data-testid="button-nav-admins"
              >
                <Shield className="w-5 h-5" />
                إدارة المشرفين
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
