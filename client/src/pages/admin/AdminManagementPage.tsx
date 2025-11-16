import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Shield, Loader2, UserCog } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const roleLabels: Record<string, string> = {
  admin: "مشرف رئيسي",
  legal: "قانوني",
  support: "دعم فني",
};

const roleColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  admin: "destructive",
  legal: "default",
  support: "secondary",
};

export default function AdminManagementPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [selectedAdmin, setSelectedAdmin] = useState<any>(null);
  const [newRole, setNewRole] = useState<string>("");
  const [newStatus, setNewStatus] = useState<boolean | null>(null);

  const adminUserStr = localStorage.getItem("adminUser");
  const adminUser = adminUserStr ? JSON.parse(adminUserStr) : null;

  if (!adminUser || adminUser.role !== "admin") {
    navigate("/admin/dashboard");
    return null;
  }

  const { data: admins, isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/admins"],
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const response = await fetch(`/api/admin/admins/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(updates),
      });
      if (!response.ok) {
        throw new Error("Failed to update admin");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/admins"] });
      toast({
        title: "تم التحديث بنجاح",
        description: "تم تحديث بيانات المشرف",
      });
      setSelectedAdmin(null);
      setNewRole("");
      setNewStatus(null);
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "حدث خطأ أثناء تحديث المشرف",
      });
    },
  });

  const handleUpdate = () => {
    if (!selectedAdmin) return;

    const updates: any = {};
    if (newRole && newRole !== selectedAdmin.role) {
      updates.role = newRole;
    }
    if (newStatus !== null && newStatus !== selectedAdmin.isActive) {
      updates.isActive = newStatus;
    }

    if (Object.keys(updates).length > 0) {
      updateMutation.mutate({ id: selectedAdmin.id, updates });
    }
  };

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
            <h1 className="text-xl font-semibold">إدارة المشرفين</h1>
          </div>
          <Badge variant="outline" className="gap-2">
            <Shield className="w-3 h-3" />
            للمشرفين الرئيسيين فقط
          </Badge>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>جميع المشرفين</CardTitle>
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
                      <TableHead className="text-right">الاسم</TableHead>
                      <TableHead className="text-right">البريد الإلكتروني</TableHead>
                      <TableHead className="text-right">الصلاحية</TableHead>
                      <TableHead className="text-right">الحالة</TableHead>
                      <TableHead className="text-right">آخر دخول</TableHead>
                      <TableHead className="text-right">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {admins && admins.length > 0 ? (
                      admins.map((admin) => (
                        <TableRow key={admin.id} data-testid={`row-admin-${admin.id}`}>
                          <TableCell className="font-medium">{admin.name}</TableCell>
                          <TableCell>{admin.email}</TableCell>
                          <TableCell>
                            <Badge variant={roleColors[admin.role]}>
                              {roleLabels[admin.role] || admin.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={admin.isActive ? "outline" : "secondary"}>
                              {admin.isActive ? "نشط" : "معطل"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {admin.lastLogin
                              ? new Date(admin.lastLogin).toLocaleDateString("ar-SA")
                              : "لم يسجل دخول"}
                          </TableCell>
                          <TableCell>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setSelectedAdmin(admin);
                                    setNewRole(admin.role);
                                    setNewStatus(admin.isActive);
                                  }}
                                  data-testid={`button-edit-admin-${admin.id}`}
                                >
                                  <UserCog className="w-4 h-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent dir="rtl">
                                <DialogHeader>
                                  <DialogTitle>تعديل صلاحيات المشرف</DialogTitle>
                                  <DialogDescription>
                                    تعديل الصلاحيات والحالة للمشرف: {admin.name}
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                  <div className="space-y-2">
                                    <label className="text-sm font-medium">الصلاحية</label>
                                    <Select value={newRole} onValueChange={setNewRole}>
                                      <SelectTrigger data-testid="select-admin-role">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="admin">مشرف رئيسي</SelectItem>
                                        <SelectItem value="legal">قانوني</SelectItem>
                                        <SelectItem value="support">دعم فني</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-2">
                                    <label className="text-sm font-medium">الحالة</label>
                                    <Select
                                      value={newStatus ? "active" : "inactive"}
                                      onValueChange={(v) => setNewStatus(v === "active")}
                                    >
                                      <SelectTrigger data-testid="select-admin-status">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="active">نشط</SelectItem>
                                        <SelectItem value="inactive">معطل</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button
                                    onClick={handleUpdate}
                                    disabled={updateMutation.isPending}
                                    data-testid="button-save-admin-changes"
                                  >
                                    {updateMutation.isPending ? (
                                      <>
                                        <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                                        جاري الحفظ...
                                      </>
                                    ) : (
                                      "حفظ التغييرات"
                                    )}
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          لا يوجد مشرفين
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
