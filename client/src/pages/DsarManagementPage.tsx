import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Edit, Trash2, UserCheck, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { DsarRequest } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const dsarFormSchema = z.object({
  requesterName: z.string().min(2, "يجب إدخال اسم مقدم الطلب"),
  requesterEmail: z.string().email("يجب إدخال بريد إلكتروني صحيح"),
  requesterPhone: z.string().optional(),
  requesterIdentification: z.string().optional(),
  requestType: z.enum(["access", "delete", "rectify", "restrict", "object", "portability"]),
  requestDetails: z.string().min(10, "يجب توضيح تفاصيل الطلب"),
  status: z.enum(["new", "in_progress", "completed", "rejected"]).optional(),
  responseNote: z.string().optional(),
  handledBy: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
});

type DsarFormValues = z.infer<typeof dsarFormSchema>;

const requestTypeLabels: Record<string, string> = {
  access: "الوصول للبيانات",
  delete: "حذف البيانات",
  rectify: "تصحيح البيانات",
  restrict: "تقييد المعالجة",
  object: "الاعتراض",
  portability: "نقل البيانات",
};

const statusLabels: Record<string, string> = {
  new: "جديد",
  in_progress: "قيد المعالجة",
  completed: "مكتمل",
  rejected: "مرفوض",
};

const statusIcons: Record<string, any> = {
  new: Clock,
  in_progress: AlertCircle,
  completed: CheckCircle2,
  rejected: XCircle,
};

const statusColors: Record<string, string> = {
  new: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  in_progress: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  completed: "bg-green-500/10 text-green-700 dark:text-green-400",
  rejected: "bg-red-500/10 text-red-700 dark:text-red-400",
};

export default function DsarManagementPage() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<DsarRequest | null>(null);
  const [deletingRequest, setDeletingRequest] = useState<DsarRequest | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Fetch DSAR requests
  const { data: requests, isLoading } = useQuery<DsarRequest[]>({
    queryKey: ["/api/dsar", statusFilter !== "all" ? { status: statusFilter } : {}],
    queryFn: async () => {
      const url = statusFilter !== "all" ? `/api/dsar?status=${statusFilter}` : "/api/dsar";
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch");
      return response.json();
    },
  });

  const form = useForm<DsarFormValues>({
    resolver: zodResolver(dsarFormSchema),
    defaultValues: {
      requesterName: "",
      requesterEmail: "",
      requesterPhone: "",
      requesterIdentification: "",
      requestType: "access",
      requestDetails: "",
      status: "new",
      responseNote: "",
      handledBy: "",
      priority: "medium",
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: DsarFormValues) => {
      const response = await apiRequest("POST", "/api/dsar", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dsar"] });
      setIsAddDialogOpen(false);
      form.reset();
      toast({
        title: "تم الإنشاء",
        description: "تم إنشاء الطلب بنجاح",
      });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "فشل في إنشاء الطلب",
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<DsarRequest> }) => {
      const response = await apiRequest("PUT", `/api/dsar/${id}`, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dsar"] });
      setEditingRequest(null);
      form.reset();
      toast({
        title: "تم التحديث",
        description: "تم تحديث الطلب بنجاح",
      });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "فشل في تحديث الطلب",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/dsar/${id}`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dsar"] });
      setDeletingRequest(null);
      toast({
        title: "تم الحذف",
        description: "تم حذف الطلب بنجاح",
      });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "فشل في حذف الطلب",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: DsarFormValues) => {
    if (editingRequest) {
      updateMutation.mutate({ id: editingRequest.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (request: DsarRequest) => {
    setEditingRequest(request);
    form.reset({
      requesterName: request.requesterName,
      requesterEmail: request.requesterEmail,
      requesterPhone: request.requesterPhone || "",
      requesterIdentification: request.requesterIdentification || "",
      requestType: request.requestType as any,
      requestDetails: request.requestDetails,
      status: request.status as any,
      responseNote: request.responseNote || "",
      handledBy: request.handledBy || "",
      priority: request.priority as any || "medium",
    });
  };

  return (
    <div className="min-h-screen p-6" style={{ direction: "rtl" }}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <UserCheck className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold" data-testid="text-page-title">
                إدارة طلبات أصحاب البيانات (DSAR)
              </h1>
              <p className="text-muted-foreground">
                استقبال ومتابعة طلبات الوصول والحذف والتصحيح
              </p>
            </div>
          </div>

          <Dialog open={isAddDialogOpen || !!editingRequest} onOpenChange={(open) => {
            if (!open) {
              setIsAddDialogOpen(false);
              setEditingRequest(null);
              form.reset();
            } else if (!editingRequest) {
              setIsAddDialogOpen(true);
            }
          }}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-request" className="hover-elevate active-elevate-2">
                <Plus className="ml-2 h-4 w-4" />
                إضافة طلب جديد
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" style={{ direction: "rtl" }}>
              <DialogHeader>
                <DialogTitle>
                  {editingRequest ? "تعديل الطلب" : "إضافة طلب جديد"}
                </DialogTitle>
                <DialogDescription>
                  {editingRequest ? "تعديل تفاصيل الطلب" : "أدخل تفاصيل طلب صاحب البيانات"}
                </DialogDescription>
              </DialogHeader>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="requesterName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>اسم مقدم الطلب</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="الاسم الكامل" data-testid="input-requester-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="requesterEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>البريد الإلكتروني</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" placeholder="example@example.com" data-testid="input-requester-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="requestType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>نوع الطلب</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-request-type">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="access">الوصول للبيانات</SelectItem>
                            <SelectItem value="delete">حذف البيانات</SelectItem>
                            <SelectItem value="rectify">تصحيح البيانات</SelectItem>
                            <SelectItem value="restrict">تقييد المعالجة</SelectItem>
                            <SelectItem value="object">الاعتراض</SelectItem>
                            <SelectItem value="portability">نقل البيانات</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="requestDetails"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>تفاصيل الطلب</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="وصف تفصيلي للطلب" rows={4} data-testid="input-request-details" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {editingRequest && (
                    <>
                      <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>الحالة</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-status">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="new">جديد</SelectItem>
                                <SelectItem value="in_progress">قيد المعالجة</SelectItem>
                                <SelectItem value="completed">مكتمل</SelectItem>
                                <SelectItem value="rejected">مرفوض</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="responseNote"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>ملاحظة الرد</FormLabel>
                            <FormControl>
                              <Textarea {...field} placeholder="الرد على الطلب" data-testid="input-response-note" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsAddDialogOpen(false);
                        setEditingRequest(null);
                        form.reset();
                      }}
                      data-testid="button-cancel"
                      className="hover-elevate active-elevate-2"
                    >
                      إلغاء
                    </Button>
                    <Button
                      type="submit"
                      disabled={createMutation.isPending || updateMutation.isPending}
                      data-testid="button-submit"
                      className="hover-elevate active-elevate-2"
                    >
                      {createMutation.isPending || updateMutation.isPending
                        ? "جاري الحفظ..."
                        : editingRequest
                        ? "تحديث"
                        : "إضافة"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Status Filter */}
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={statusFilter === "all" ? "default" : "outline"}
            onClick={() => setStatusFilter("all")}
            data-testid="filter-all"
            className="hover-elevate active-elevate-2"
          >
            الكل ({requests?.length || 0})
          </Button>
          {Object.entries(statusLabels).map(([status, label]) => {
            const Icon = statusIcons[status];
            return (
              <Button
                key={status}
                variant={statusFilter === status ? "default" : "outline"}
                onClick={() => setStatusFilter(status)}
                data-testid={`filter-${status}`}
                className="hover-elevate active-elevate-2"
              >
                <Icon className="ml-2 h-4 w-4" />
                {label}
              </Button>
            );
          })}
        </div>

        {/* Requests List */}
        {isLoading ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              جاري التحميل...
            </CardContent>
          </Card>
        ) : !requests || requests.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <UserCheck className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">لا توجد طلبات</h3>
              <p className="text-muted-foreground mb-4">
                ابدأ بإضافة أول طلب لصاحب البيانات
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {requests.map((request) => {
              const StatusIcon = statusIcons[request.status];
              const isOverdue = request.dueDate && new Date(request.dueDate) < new Date() && request.status !== "completed";

              return (
                <Card key={request.id} data-testid={`card-request-${request.id}`} className="hover-elevate">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CardTitle className="text-lg">
                            {request.requesterName}
                          </CardTitle>
                          <Badge className={statusColors[request.status]}>
                            <StatusIcon className="ml-1 h-3 w-3" />
                            {statusLabels[request.status]}
                          </Badge>
                          {isOverdue && (
                            <Badge variant="destructive">
                              متأخر
                            </Badge>
                          )}
                        </div>
                        <CardDescription>
                          النوع: {requestTypeLabels[request.requestType]} • {" "}
                          {request.submittedAt && formatDistanceToNow(new Date(request.submittedAt), { addSuffix: true, locale: ar })}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleEdit(request)}
                          data-testid={`button-edit-${request.id}`}
                          className="hover-elevate active-elevate-2"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setDeletingRequest(request)}
                          data-testid={`button-delete-${request.id}`}
                          className="hover-elevate active-elevate-2"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm mb-3">{request.requestDetails}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                      <div>البريد: {request.requesterEmail}</div>
                      {request.dueDate && (
                        <div>
                          المهلة: {new Date(request.dueDate).toLocaleDateString("ar-SA")}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Delete Confirmation */}
        <AlertDialog open={!!deletingRequest} onOpenChange={() => setDeletingRequest(null)}>
          <AlertDialogContent style={{ direction: "rtl" }}>
            <AlertDialogHeader>
              <AlertDialogTitle>
                هل أنت متأكد من الحذف؟
              </AlertDialogTitle>
              <AlertDialogDescription>
                سيتم حذف الطلب "{deletingRequest?.requesterName}" نهائياً. هذا الإجراء لا يمكن التراجع عنه.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-delete-cancel" className="hover-elevate active-elevate-2">
                إلغاء
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deletingRequest && deleteMutation.mutate(deletingRequest.id)}
                disabled={deleteMutation.isPending}
                data-testid="button-delete-confirm"
                className="bg-destructive hover:bg-destructive/90 hover-elevate active-elevate-2"
              >
                {deleteMutation.isPending ? "جاري الحذف..." : "حذف"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
