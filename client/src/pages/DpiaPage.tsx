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
import { Plus, Edit, Trash2, ShieldAlert, AlertTriangle, CheckCircle2 } from "lucide-react";
import { BackButton } from "@/components/BackButton";

const dpiaFormSchema = z.object({
  projectName: z.string().min(1, "اسم المشروع مطلوب"),
  projectDescription: z.string().min(1, "وصف المشروع مطلوب"),
  department: z.string().min(1, "القسم مطلوب"),
  dataSubjects: z.string().min(1, "الفئات المستهدفة مطلوبة"),
  necessityJustification: z.string().min(1, "مبرر الضرورة مطلوب"),
  proportionalityAssessment: z.string().min(1, "تقييم التناسب مطلوب"),
  individualImpact: z.string().min(1, "التأثير على الأفراد مطلوب"),
  individualImpactDetails: z.string().optional(),
  transparencyMeasures: z.string().optional(),
  dpoConsulted: z.string().optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
});

type DpiaFormData = z.infer<typeof dpiaFormSchema>;

interface DpiaAssessment {
  id: string;
  projectName: string;
  projectDescription: string;
  department: string;
  dataSubjects: string;
  necessityJustification: string;
  proportionalityAssessment: string;
  individualImpact: string;
  individualImpactDetails?: string;
  transparencyMeasures?: string;
  dpoConsulted?: string;
  status: string;
  notes?: string;
  createdAt: string;
}

export default function DpiaPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAssessment, setEditingAssessment] = useState<DpiaAssessment | null>(null);
  const { toast } = useToast();

  const { data: assessments = [], isLoading } = useQuery<DpiaAssessment[]>({
    queryKey: ["/api/dpia"],
  });

  const form = useForm<DpiaFormData>({
    resolver: zodResolver(dpiaFormSchema),
    defaultValues: {
      projectName: "",
      projectDescription: "",
      department: "",
      dataSubjects: "",
      necessityJustification: "",
      proportionalityAssessment: "",
      individualImpact: "",
      individualImpactDetails: "",
      transparencyMeasures: "",
      dpoConsulted: "no",
      status: "draft",
      notes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: DpiaFormData) =>
      apiRequest("POST", "/api/dpia", {
        ...data,
        dataTypes: [],
        identifiedRisks: [],
        mitigationMeasures: [],
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dpia"] });
      toast({
        title: "تم الإضافة بنجاح",
        description: "تم إنشاء التقييم بنجاح",
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "فشل في إنشاء التقييم",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: DpiaFormData & { id: string }) =>
      apiRequest("PUT", `/api/dpia/${data.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dpia"] });
      toast({
        title: "تم التحديث بنجاح",
        description: "تم تحديث التقييم بنجاح",
      });
      setIsDialogOpen(false);
      setEditingAssessment(null);
      form.reset();
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "فشل في تحديث التقييم",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("DELETE", `/api/dpia/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dpia"] });
      toast({
        title: "تم الحذف بنجاح",
        description: "تم حذف التقييم بنجاح",
      });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "فشل في حذف التقييم",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: DpiaFormData) => {
    if (editingAssessment) {
      updateMutation.mutate({ ...data, id: editingAssessment.id });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (assessment: DpiaAssessment) => {
    setEditingAssessment(assessment);
    form.reset({
      projectName: assessment.projectName,
      projectDescription: assessment.projectDescription,
      department: assessment.department,
      dataSubjects: assessment.dataSubjects,
      necessityJustification: assessment.necessityJustification,
      proportionalityAssessment: assessment.proportionalityAssessment,
      individualImpact: assessment.individualImpact,
      individualImpactDetails: assessment.individualImpactDetails || "",
      transparencyMeasures: assessment.transparencyMeasures || "",
      dpoConsulted: assessment.dpoConsulted || "no",
      status: assessment.status,
      notes: assessment.notes || "",
    });
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingAssessment(null);
    form.reset();
  };

  const getImpactBadge = (impact: string) => {
    const configs: Record<string, { variant: "default" | "destructive" | "secondary", icon: any }> = {
      high: { variant: "destructive", icon: AlertTriangle },
      medium: { variant: "default", icon: ShieldAlert },
      low: { variant: "secondary", icon: CheckCircle2 },
    };
    const config = configs[impact] || configs.medium;
    const Icon = config.icon;
    
    const labels: Record<string, string> = {
      high: "عالي",
      medium: "متوسط",
      low: "منخفض",
    };
    
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="w-3 h-3" />
        {labels[impact] || impact}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "outline", label: string }> = {
      draft: { variant: "secondary", label: "مسودة" },
      in_progress: { variant: "default", label: "قيد التنفيذ" },
      completed: { variant: "outline", label: "مكتمل" },
    };
    const config = variants[status] || variants.draft;
    
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl" dir="rtl">
      <div className="mb-6">
        <BackButton />
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-lg">
            <ShieldAlert className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">تقييم تأثير حماية البيانات</h1>
            <p className="text-muted-foreground">
              إدارة تقييمات تأثير حماية البيانات (DPIA) للمشاريع عالية المخاطر
            </p>
          </div>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                setEditingAssessment(null);
                form.reset();
              }}
              data-testid="button-add-dpia"
            >
              <Plus className="w-4 h-4 ml-2" />
              إضافة تقييم جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle>
                {editingAssessment ? "تعديل التقييم" : "إضافة تقييم جديد"}
              </DialogTitle>
              <DialogDescription>
                أدخل تفاصيل تقييم تأثير حماية البيانات
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="projectName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>اسم المشروع</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="اسم المشروع أو المبادرة"
                            {...field}
                            data-testid="input-project-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="department"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>القسم</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="القسم المسؤول"
                            {...field}
                            data-testid="input-department"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="projectDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>وصف المشروع</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="وصف تفصيلي للمشروع"
                          {...field}
                          data-testid="input-project-description"
                          rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dataSubjects"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الفئات المستهدفة</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="مثل: موظفين، عملاء، أطفال، إلخ"
                          {...field}
                          data-testid="input-data-subjects"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="necessityJustification"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>مبرر الضرورة</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="لماذا هذه المعالجة ضرورية؟"
                          {...field}
                          data-testid="input-necessity"
                          rows={2}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="proportionalityAssessment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>تقييم التناسب</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="هل المعالجة متناسبة مع الغرض؟"
                          {...field}
                          data-testid="input-proportionality"
                          rows={2}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="individualImpact"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>التأثير على الأفراد</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-impact">
                              <SelectValue placeholder="اختر مستوى التأثير" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="low">منخفض</SelectItem>
                            <SelectItem value="medium">متوسط</SelectItem>
                            <SelectItem value="high">عالي</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dpoConsulted"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>استشارة مسؤول حماية البيانات</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-dpo">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="yes">نعم</SelectItem>
                            <SelectItem value="no">لا</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="individualImpactDetails"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>تفصيل التأثير (اختياري)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="تفصيل التأثير على الأفراد"
                          {...field}
                          data-testid="input-impact-details"
                          rows={2}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="transparencyMeasures"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>إجراءات الشفافية (اختياري)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="كيف سيتم إبلاغ أصحاب البيانات؟"
                          {...field}
                          data-testid="input-transparency"
                          rows={2}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>حالة التقييم</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-status">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="draft">مسودة</SelectItem>
                          <SelectItem value="in_progress">قيد التنفيذ</SelectItem>
                          <SelectItem value="completed">مكتمل</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ملاحظات إضافية (اختياري)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="أي ملاحظات أخرى"
                          {...field}
                          data-testid="input-notes"
                          rows={2}
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
                    onClick={handleDialogClose}
                    data-testid="button-cancel"
                  >
                    إلغاء
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    data-testid="button-submit-dpia"
                  >
                    {editingAssessment ? "تحديث" : "إضافة"}
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
            <ShieldAlert className="w-5 h-5" />
            التقييمات المسجلة
          </CardTitle>
          <CardDescription>
            عرض جميع تقييمات تأثير حماية البيانات
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              جارٍ التحميل...
            </div>
          ) : assessments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              لا توجد تقييمات بعد. ابدأ بإضافة تقييم جديد.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">اسم المشروع</TableHead>
                  <TableHead className="text-right">القسم</TableHead>
                  <TableHead className="text-right">مستوى التأثير</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">استشارة DPO</TableHead>
                  <TableHead className="text-right">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assessments.map((assessment) => (
                  <TableRow key={assessment.id} data-testid={`row-dpia-${assessment.id}`}>
                    <TableCell className="font-medium">{assessment.projectName}</TableCell>
                    <TableCell>{assessment.department}</TableCell>
                    <TableCell>
                      {getImpactBadge(assessment.individualImpact)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(assessment.status)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={assessment.dpoConsulted === "yes" ? "default" : "secondary"}>
                        {assessment.dpoConsulted === "yes" ? "نعم" : "لا"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(assessment)}
                          data-testid={`button-edit-${assessment.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm("هل أنت متأكد من حذف هذا التقييم؟")) {
                              deleteMutation.mutate(assessment.id);
                            }
                          }}
                          data-testid={`button-delete-${assessment.id}`}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
