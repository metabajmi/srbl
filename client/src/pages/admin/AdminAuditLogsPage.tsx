import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Shield, Loader2 } from "lucide-react";

const actionLabels: Record<string, string> = {
  login: "تسجيل دخول",
  logout: "تسجيل خروج",
  create_user: "إنشاء مستخدم",
  update_user: "تحديث مستخدم",
  delete_user: "حذف مستخدم",
  update_request: "تحديث طلب",
  update_admin: "تحديث مشرف",
};

const actionColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  login: "outline",
  logout: "secondary",
  create_user: "default",
  update_user: "default",
  delete_user: "destructive",
  update_request: "default",
  update_admin: "default",
};

export default function AdminAuditLogsPage() {
  const [, navigate] = useLocation();

  const adminUserStr = localStorage.getItem("adminUser");
  const adminUser = adminUserStr ? JSON.parse(adminUserStr) : null;

  if (!adminUser || adminUser.role !== "admin") {
    navigate("/admin/dashboard");
    return null;
  }

  const { data: logs, isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/audit-logs"],
  });

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/admin/dashboard")}
              data-testid="button-back-dashboard"
            >
              <ArrowRight className="w-4 h-4" />
            </Button>
            <h1 className="text-xl font-semibold">سجلات التدقيق</h1>
          </div>
          <Badge variant="outline" className="gap-2">
            <Shield className="w-3 h-3" />
            للمشرفين فقط
          </Badge>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>جميع سجلات التدقيق</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">التاريخ والوقت</TableHead>
                      <TableHead className="text-right">المشرف</TableHead>
                      <TableHead className="text-right">الإجراء</TableHead>
                      <TableHead className="text-right">النوع</TableHead>
                      <TableHead className="text-right">التفاصيل</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs && logs.length > 0 ? (
                      logs.map((log) => (
                        <TableRow key={log.id} data-testid={`row-log-${log.id}`}>
                          <TableCell className="font-medium">
                            {new Date(log.createdAt).toLocaleString("ar-SA", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </TableCell>
                          <TableCell>{log.adminUserId}</TableCell>
                          <TableCell>
                            <Badge variant={actionColors[log.action] || "default"}>
                              {actionLabels[log.action] || log.action}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {log.entityType || "-"}
                          </TableCell>
                          <TableCell className="max-w-xs truncate text-muted-foreground">
                            {log.details || "-"}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          لا توجد سجلات تدقيق
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
