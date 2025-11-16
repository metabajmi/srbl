import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowRight, Loader2, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const statusLabels: Record<string, string> = {
  pending: "معلق",
  in_progress: "قيد المعالجة",
  completed: "مكتمل",
  rejected: "مرفوض",
  awaiting_info: "في انتظار معلومات",
};

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  in_progress: "default",
  completed: "outline",
  rejected: "destructive",
  awaiting_info: "secondary",
};

export default function AdminRequestsPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [newStatus, setNewStatus] = useState<string>("");
  const [staffNotes, setStaffNotes] = useState<string>("");

  const adminUserStr = localStorage.getItem("adminUser");
  const adminUser = adminUserStr ? JSON.parse(adminUserStr) : null;

  if (!adminUser) {
    navigate("/admin/login");
    return null;
  }

  const { data: requests, isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/requests"],
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      return await apiRequest(`/api/admin/requests/${id}`, {
        method: "PATCH",
        body: { ...updates, adminUserId: adminUser.id },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/requests"] });
      toast({
        title: "تم التحديث بنجاح",
        description: "تم تحديث الطلب",
      });
      setSelectedRequest(null);
      setNewStatus("");
      setStaffNotes("");
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "حدث خطأ أثناء تحديث الطلب",
      });
    },
  });

  const handleUpdate = () => {
    if (!selectedRequest || !newStatus) return;

    updateMutation.mutate({
      id: selectedRequest.id,
      updates: {
        status: newStatus,
        staffNotes: staffNotes || selectedRequest.staffNotes,
        assignedTo: adminUser.name,
      },
    });
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
            <h1 className="text-xl font-semibold">إدارة طلبات العملاء</h1>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>جميع الطلبات</CardTitle>
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
                      <TableHead className="text-right">رقم الطلب</TableHead>
                      <TableHead className="text-right">العنوان</TableHead>
                      <TableHead className="text-right">النوع</TableHead>
                      <TableHead className="text-right">الحالة</TableHead>
                      <TableHead className="text-right">التاريخ</TableHead>
                      <TableHead className="text-right">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests && requests.length > 0 ? (
                      requests.map((request) => (
                        <TableRow key={request.id} data-testid={`row-request-${request.id}`}>
                          <TableCell className="font-mono text-sm">{request.requestNumber}</TableCell>
                          <TableCell className="font-medium">{request.title}</TableCell>
                          <TableCell>{request.requestType}</TableCell>
                          <TableCell>
                            <Badge variant={statusColors[request.status] || "default"}>
                              {statusLabels[request.status] || request.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(request.createdAt).toLocaleDateString("ar-SA")}
                          </TableCell>
                          <TableCell>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setSelectedRequest(request);
                                    setNewStatus(request.status);
                                    setStaffNotes(request.staffNotes || "");
                                  }}
                                  data-testid={`button-view-request-${request.id}`}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl" dir="rtl">
                                <DialogHeader>
                                  <DialogTitle>تفاصيل الطلب #{request.requestNumber}</DialogTitle>
                                  <DialogDescription>
                                    إدارة وتحديث حالة الطلب
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <label className="text-sm font-medium">العنوان</label>
                                    <p className="text-sm text-muted-foreground mt-1">{request.title}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">الوصف</label>
                                    <p className="text-sm text-muted-foreground mt-1">{request.description || "لا يوجد"}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">الحالة</label>
                                    <Select value={newStatus} onValueChange={setNewStatus}>
                                      <SelectTrigger className="mt-1">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="pending">معلق</SelectItem>
                                        <SelectItem value="in_progress">قيد المعالجة</SelectItem>
                                        <SelectItem value="completed">مكتمل</SelectItem>
                                        <SelectItem value="rejected">مرفوض</SelectItem>
                                        <SelectItem value="awaiting_info">في انتظار معلومات</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">ملاحظات الفريق</label>
                                    <Textarea
                                      value={staffNotes}
                                      onChange={(e) => setStaffNotes(e.target.value)}
                                      placeholder="أضف ملاحظات..."
                                      className="mt-1"
                                      rows={4}
                                    />
                                  </div>
                                  <Button
                                    onClick={handleUpdate}
                                    disabled={updateMutation.isPending}
                                    className="w-full"
                                    data-testid="button-update-request"
                                  >
                                    {updateMutation.isPending ? "جاري التحديث..." : "تحديث الطلب"}
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          لا توجد طلبات
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
