import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, FileText, Loader2 } from "lucide-react";

export default function AdminPoliciesPage() {
  const [, navigate] = useLocation();

  const adminUserStr = localStorage.getItem("adminUser");
  const adminUser = adminUserStr ? JSON.parse(adminUserStr) : null;

  if (!adminUser) {
    navigate("/admin/login");
    return null;
  }

  const { data: policies, isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/policies"],
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
            <h1 className="text-xl font-semibold">إدارة السياسات</h1>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>جميع سياسات الخصوصية</CardTitle>
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
                      <TableHead className="text-right">العميل</TableHead>
                      <TableHead className="text-right">الحالة</TableHead>
                      <TableHead className="text-right">تاريخ الإنشاء</TableHead>
                      <TableHead className="text-right">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {policies && policies.length > 0 ? (
                      policies.map((policy) => (
                        <TableRow key={policy.id} data-testid={`row-policy-${policy.id}`}>
                          <TableCell className="font-medium">
                            {policy.userId ? `عميل ${policy.userId}` : "غير محدد"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={policy.status === "completed" ? "outline" : "secondary"}>
                              {policy.status === "completed" ? "مكتملة" : policy.status === "generating" ? "قيد الإنشاء" : "معلقة"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(policy.createdAt).toLocaleDateString("ar-SA")}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={!policy.htmlContent}
                              data-testid={`button-view-policy-${policy.id}`}
                            >
                              <FileText className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          لا توجد سياسات
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
