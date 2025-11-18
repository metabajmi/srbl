import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Edit, CheckCircle, Clock, XCircle, FileText, Users } from "lucide-react";
import { BackButton } from "@/components/BackButton";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

const dsarFormSchema = z.object({
  requesterName: z.string().min(1, "اسم مقدم الطلب مطلوب"),
  requesterEmail: z.string().email("البريد الإلكتروني غير صحيح"),
  requesterPhone: z.string().optional(),
  requesterIdentification: z.string().optional(),
  requestType: z.string().min(1, "نوع الطلب مطلوب"),
  requestDetails: z.string().min(1, "تفاصيل الطلب مطلوبة"),
  status: z.string().optional(),
  responseNote: z.string().optional(),
  handledBy: z.string().optional(),
});

type DsarFormData = z.infer<typeof dsarFormSchema>;

interface DsarRequest {
  id: string;
  requesterName: string;
  requesterEmail: string;
  requesterPhone?: string;
  requesterIdentification?: string;
  requestType: string;
  requestDetails: string;
  status: string;
  submittedAt: string;
  dueDate: string;
  completedAt?: string;
  responseNote?: string;
  handledBy?: string;
}

export default function DsarPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewingRequest, setViewingRequest] = useState<DsarRequest | null>(null);
  const [isResponseDialogOpen, setIsResponseDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: requests = [], isLoading } = useQuery<DsarRequest[]>({
    queryKey: ["/api/dsar"],
  });

  const form = useForm<DsarFormData>({
    resolver: zodResolver(dsarFormSchema),
    defaultValues: {
      requesterName: "",
      requesterEmail: "",
      requesterPhone: "",
      requesterIdentification: "",
      requestType: "",
      requestDetails: "",
      status: "new",
      responseNote: "",
      handledBy: "",
    },
  });

  const responseForm = useForm({
    defaultValues: {
      status: "",
      responseNote: "",
      handledBy: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: DsarFormData) => {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);
      
      return apiRequest("POST", "/api/dsar", {
        ...data,
        dueDate: dueDate.toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dsar"] });
      toast({
        title: "تم الإضافة بنجاح",
        description: "تم تسجيل الطلب بنجاح",
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "فشل في تسجيل الطلب",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; status: string; responseNote: string; handledBy: string }) => {
      const updateData: any = {
        status: data.status,
        responseNote: data.responseNote,
        handledBy: data.handledBy,
      };
      
      if (data.status === "completed") {
        updateData.completedAt = new Date().toISOString();
      }
      
      return apiRequest("PUT", `/api/dsar/${data.id}`, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dsar"] });
      toast({
        title: "تم التحديث بنجاح",
        description: "تم تحديث الطلب بنجاح",
      });
      setIsResponseDialogOpen(false);
      setViewingRequest(null);
      responseForm.reset();
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "فشل في تحديث الطلب",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: DsarFormData) => {
    createMutation.mutate(data);
  };

  const handleRespond = (request: DsarRequest) => {
    setViewingRequest(request);
    responseForm.reset({
      status: request.status,
      responseNote: request.responseNote || "",
      handledBy: request.handledBy || "",
    });
    setIsResponseDialogOpen(true);
  };

  const onResponseSubmit = (data: any) => {
    if (!viewingRequest) return;
    updateMutation.mutate({
      id: viewingRequest.id,
      ...data,
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string, icon: any }> = {
      new: { variant: "default", label: "جديد", icon: Clock },
      in_progress: { variant: "secondary", label: "قيد المعالجة", icon: Clock },
      completed: { variant: "outline", label: "مكتمل", icon: CheckCircle },
      rejected: { variant: "destructive", label: "مرفوض", icon: XCircle },
    };
    const config = variants[status] || variants.new;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const getRequestTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      access: "الوصول للبيانات",
      delete: "حذف البيانات",
      rectify: "تصحيح البيانات",
      restrict: "تقييد المعالجة",
      object: "الاعتراض على المعالجة",
      portability: "نقل البيانات",
    };
    return labels[type] || type;
  };

  const getDaysRemaining = (dueDate: string) => {
    const due = new Date(dueDate);
    const now = new Date();
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl" dir="rtl">
      <div className="mb-6">
        <BackButton />
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-lg">
            <Users className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">إدارة طلبات أصحاب البيانات</h1>
            <p className="text-muted-foreground">
              متابعة ومعالجة طلبات الوصول والحذف والتصحيح (DSAR)
            </p>
          </div>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => form.reset()}
              data-testid="button-add-dsar"
            >
              <Plus className="w-4 h-4 ml-2" />
              تسجيل طلب جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle>تسجيل طلب جديد</DialogTitle>
              <DialogDescription>
                أدخل تفاصيل طلب صاحب البيانات
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
                        <Input
                          placeholder="الاسم الكامل"
                          {...field}
                          data-testid="input-requester-name"
                        />
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
                        <Input
                          type="email"
                          placeholder="example@email.com"
                          {...field}
                          data-testid="input-requester-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="requesterPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>رقم الهاتف (اختياري)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="+966 5X XXX XXXX"
                          {...field}
                          data-testid="input-requester-phone"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="requesterIdentification"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>رقم الهوية (للتحقق - اختياري)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="رقم الهوية الوطنية"
                          {...field}
                          data-testid="input-requester-id"
                        />
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
                            <SelectValue placeholder="اختر نوع الطلب" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="access">الوصول للبيانات</SelectItem>
                          <SelectItem value="delete">حذف البيانات</SelectItem>
                          <SelectItem value="rectify">تصحيح البيانات</SelectItem>
                          <SelectItem value="restrict">تقييد المعالجة</SelectItem>
                          <SelectItem value="object">الاعتراض على المعالجة</SelectItem>
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
                        <Textarea
                          placeholder="وصف تفصيلي للطلب"
                          {...field}
                          data-testid="input-request-details"
                          rows={4}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    data-testid="button-cancel"
                  >
                    إلغاء
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending}
                    data-testid="button-submit-dsar"
                  >
                    تسجيل الطلب
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            الطلبات المسجلة
          </CardTitle>
          <CardDescription>
            عرض جميع طلبات أصحاب البيانات ومتابعة حالتها
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              جارٍ التحميل...
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              لا توجد طلبات بعد. ابدأ بتسجيل طلب جديد.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">مقدم الطلب</TableHead>
                  <TableHead className="text-right">نوع الطلب</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">تاريخ التقديم</TableHead>
                  <TableHead className="text-right">المهلة المتبقية</TableHead>
                  <TableHead className="text-right">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => {
                  const daysRemaining = getDaysRemaining(request.dueDate);
                  return (
                    <TableRow key={request.id} data-testid={`row-dsar-${request.id}`}>
                      <TableCell>
                        <div className="font-medium">{request.requesterName}</div>
                        <div className="text-sm text-muted-foreground">
                          {request.requesterEmail}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getRequestTypeLabel(request.requestType)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(request.status)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(request.submittedAt), "dd MMMM yyyy", { locale: ar })}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={daysRemaining < 7 ? "destructive" : daysRemaining < 14 ? "default" : "secondary"}
                        >
                          {daysRemaining > 0 ? `${daysRemaining} يوم` : "متأخر"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRespond(request)}
                          data-testid={`button-respond-${request.id}`}
                        >
                          <Edit className="w-4 h-4 ml-1" />
                          الرد
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isResponseDialogOpen} onOpenChange={setIsResponseDialogOpen}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>الرد على الطلب</DialogTitle>
            <DialogDescription>
              تحديث حالة الطلب وإضافة ملاحظات الرد
            </DialogDescription>
          </DialogHeader>

          {viewingRequest && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">تفاصيل الطلب</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">مقدم الطلب:</span> {viewingRequest.requesterName}
                  </div>
                  <div>
                    <span className="font-medium">البريد:</span> {viewingRequest.requesterEmail}
                  </div>
                  <div>
                    <span className="font-medium">نوع الطلب:</span> {getRequestTypeLabel(viewingRequest.requestType)}
                  </div>
                  <div>
                    <span className="font-medium">التفاصيل:</span>
                    <p className="mt-1 text-muted-foreground">{viewingRequest.requestDetails}</p>
                  </div>
                </CardContent>
              </Card>

              <Form {...responseForm}>
                <form onSubmit={responseForm.handleSubmit(onResponseSubmit)} className="space-y-4">
                  <FormField
                    control={responseForm.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>الحالة</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-response-status">
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
                    control={responseForm.control}
                    name="responseNote"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ملاحظات الرد</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="أدخل ملاحظات الرد على الطلب"
                            {...field}
                            data-testid="input-response-note"
                            rows={4}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={responseForm.control}
                    name="handledBy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>المسؤول عن المعالجة</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="اسم الموظف المسؤول"
                            {...field}
                            data-testid="input-handled-by"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-2 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsResponseDialogOpen(false)}
                      data-testid="button-cancel-response"
                    >
                      إلغاء
                    </Button>
                    <Button
                      type="submit"
                      disabled={updateMutation.isPending}
                      data-testid="button-submit-response"
                    >
                      حفظ التحديث
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
