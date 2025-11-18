import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Plus, Calendar, FileText } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

type ClientRequest = {
  id: number;
  userId: string;
  requestNumber: string;
  requestType: "policy_update" | "data_access" | "data_deletion" | "complaint" | "general";
  status: "pending" | "in_progress" | "resolved" | "closed";
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  createdAt: string;
  updatedAt: string;
};

const createRequestSchema = z.object({
  requestType: z.enum(["policy_update", "data_access", "data_deletion", "complaint", "general"]),
  title: z.string().min(5, "يجب أن يكون العنوان 5 أحرف على الأقل"),
  description: z.string().min(20, "يجب أن يكون الوصف 20 حرف على الأقل"),
  priority: z.enum(["low", "medium", "high"]),
});

type CreateRequestData = z.infer<typeof createRequestSchema>;

export default function MyRequestsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  // Get user from localStorage (temporary)
  let user = { id: "" };
  try {
    const userStr = localStorage.getItem("user");
    if (userStr && userStr !== "undefined" && userStr !== "null") {
      user = JSON.parse(userStr);
    }
  } catch (e) {
    console.error("Failed to parse user from localStorage", e);
  }
  const userId = user.id;

  const { data: requests, isLoading } = useQuery<ClientRequest[]>({
    queryKey: ["/api/client/requests", userId],
  });

  const form = useForm<CreateRequestData>({
    resolver: zodResolver(createRequestSchema),
    defaultValues: {
      requestType: "general",
      title: "",
      description: "",
      priority: "medium",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateRequestData) => {
      return await apiRequest("POST", "/api/client/requests", {
        ...data,
        userId, // Add userId from localStorage
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client/requests", userId] });
      toast({
        title: "✅ تم إنشاء الطلب بنجاح",
        description: "سيتم الرد على طلبك في أقرب وقت ممكن",
      });
      setDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      // Check if session expired (401)
      if (error.message?.includes("401") || error.message?.includes("غير مصرح")) {
        localStorage.removeItem("user");
        toast({
          variant: "destructive",
          title: "انتهت الجلسة",
          description: "يرجى تسجيل الدخول مرة أخرى",
        });
        navigate("/login");
      } else {
        toast({
          variant: "destructive",
          title: "❌ حدث خطأ",
          description: "فشل إنشاء الطلب. يرجى المحاولة مرة أخرى",
        });
      }
    },
  });

  const getStatusLabel = (status: string) => {
    const labels = {
      pending: "قيد الانتظار",
      in_progress: "قيد المعالجة",
      resolved: "تم الحل",
      closed: "مغلق",
    };
    return labels[status as keyof typeof labels] || status;
  };

  const getStatusVariant = (status: string) => {
    const variants = {
      pending: "secondary",
      in_progress: "default",
      resolved: "outline",
      closed: "outline",
    };
    return variants[status as keyof typeof variants] || "secondary";
  };

  const getTypeLabel = (type: string) => {
    const labels = {
      policy_update: "تحديث السياسة",
      data_access: "طلب الوصول للبيانات",
      data_deletion: "طلب حذف البيانات",
      complaint: "شكوى",
      general: "عام",
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getPriorityLabel = (priority: string) => {
    const labels = {
      low: "منخفضة",
      medium: "متوسطة",
      high: "عالية",
    };
    return labels[priority as keyof typeof labels] || priority;
  };

  const getPriorityVariant = (priority: string) => {
    const variants = {
      low: "secondary",
      medium: "default",
      high: "destructive",
    };
    return variants[priority as keyof typeof variants] || "secondary";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen p-8" dir="rtl">
        <div className="max-w-6xl mx-auto">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-muted rounded w-1/3" />
                  <div className="h-4 bg-muted rounded w-1/2 mt-2" />
                </CardHeader>
                <CardContent>
                  <div className="h-4 bg-muted rounded w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold" data-testid="text-page-title">
              طلباتي
            </h1>
            <p className="text-muted-foreground">
              إدارة وعرض جميع الطلبات والاستفسارات الخاصة بك
            </p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-request">
                <Plus className="w-4 h-4 ml-2" />
                طلب جديد
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]" dir="rtl">
              <DialogHeader>
                <DialogTitle>إنشاء طلب جديد</DialogTitle>
                <DialogDescription>
                  املأ النموذج أدناه لإنشاء طلب جديد. سيتم الرد عليك في أقرب وقت ممكن.
                </DialogDescription>
              </DialogHeader>

              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit((data) => createMutation.mutate(data))}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="requestType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>نوع الطلب</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-request-type">
                              <SelectValue placeholder="اختر نوع الطلب" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="general">عام</SelectItem>
                            <SelectItem value="policy_update">تحديث السياسة</SelectItem>
                            <SelectItem value="data_access">طلب الوصول للبيانات</SelectItem>
                            <SelectItem value="data_deletion">طلب حذف البيانات</SelectItem>
                            <SelectItem value="complaint">شكوى</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>الأولوية</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-priority">
                              <SelectValue placeholder="اختر الأولوية" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="low">منخفضة</SelectItem>
                            <SelectItem value="medium">متوسطة</SelectItem>
                            <SelectItem value="high">عالية</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>عنوان الطلب</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="مثال: طلب تحديث سياسة الخصوصية"
                            data-testid="input-title"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>الوصف</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="اشرح طلبك بالتفصيل..."
                            rows={5}
                            data-testid="textarea-description"
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
                      onClick={() => setDialogOpen(false)}
                      data-testid="button-cancel"
                    >
                      إلغاء
                    </Button>
                    <Button
                      type="submit"
                      disabled={createMutation.isPending}
                      data-testid="button-submit-request"
                    >
                      {createMutation.isPending ? "جاري الإرسال..." : "إرسال الطلب"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {!requests || requests.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 space-y-4">
              <MessageSquare className="w-16 h-16 text-muted-foreground" />
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold" data-testid="text-no-requests">
                  لا توجد طلبات بعد
                </h3>
                <p className="text-muted-foreground">
                  ابدأ بإنشاء طلب جديد للحصول على المساعدة
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {requests.map((request) => (
              <Card key={request.id} data-testid={`card-request-${request.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <MessageSquare className="w-5 h-5 text-primary" />
                        <CardTitle data-testid={`text-title-${request.id}`}>
                          {request.title}
                        </CardTitle>
                        <Badge
                          variant={getStatusVariant(request.status) as any}
                          data-testid={`badge-status-${request.id}`}
                        >
                          {getStatusLabel(request.status)}
                        </Badge>
                        <Badge
                          variant={getPriorityVariant(request.priority) as any}
                          data-testid={`badge-priority-${request.id}`}
                        >
                          {getPriorityLabel(request.priority)}
                        </Badge>
                      </div>
                      <CardDescription className="flex items-center gap-4 text-sm flex-wrap">
                        <span className="flex items-center gap-1">
                          <FileText className="w-4 h-4" />
                          {getTypeLabel(request.requestType)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {format(new Date(request.createdAt), "dd MMMM yyyy", {
                            locale: ar,
                          })}
                        </span>
                        <code
                          className="px-2 py-1 bg-muted rounded text-xs"
                          data-testid={`text-request-number-${request.id}`}
                        >
                          {request.requestNumber}
                        </code>
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <p
                    className="text-sm text-muted-foreground"
                    data-testid={`text-description-${request.id}`}
                  >
                    {request.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
