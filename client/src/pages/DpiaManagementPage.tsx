import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Edit, Trash2, FileDown, AlertTriangle, Shield, X } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { DpiaAssessment } from "@shared/schema";
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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

// Form schema matching backend InsertDpiaAssessment
const dpiaFormSchema = z.object({
  projectName: z.string().min(3, "يجب إدخال اسم المشروع"),
  projectDescription: z.string().min(10, "يجب وصف المشروع"),
  department: z.string().min(2, "يجب إدخال اسم القسم"),
  dataTypes: z.array(z.object({
    name: z.string().min(1, "يجب إدخال نوع البيانات"),
    category: z.string(),
    volume: z.string(),
    sensitivity: z.enum(["low", "medium", "high"]),
  })).min(1, "يجب إدخال نوع واحد على الأقل من البيانات"),
  dataSubjects: z.string().min(3, "يجب تحديد الفئات المستهدفة"),
  necessityJustification: z.string().min(10, "يجب توضيح ضرورة المعالجة"),
  proportionalityAssessment: z.string().min(10, "يجب تقييم التناسب"),
  identifiedRisks: z.array(z.object({
    risk: z.string(),
    likelihood: z.enum(["low", "medium", "high"]),
    impact: z.enum(["low", "medium", "high"]),
    severity: z.enum(["low", "medium", "high", "critical"]),
  })).min(1, "يجب تحديد مخاطرة واحدة على الأقل"),
  mitigationMeasures: z.array(z.object({
    measure: z.string(),
    effectiveness: z.enum(["low", "medium", "high"]),
    status: z.enum(["planned", "implemented", "ongoing"]),
  })).min(1, "يجب تحديد تدبير وقائي واحد على الأقل"),
  transparencyMeasures: z.string().optional(),
  individualImpact: z.enum(["low", "medium", "high"]),
  individualImpactDetails: z.string().optional(),
  dpoConsulted: z.string().optional(),
  dpoRecommendations: z.string().optional(),
  finalDecision: z.string().optional(),
  decisionRationale: z.string().optional(),
  status: z.enum(["draft", "under_review", "completed"]).optional(),
  overallRiskLevel: z.enum(["low", "medium", "high", "critical"]).optional(),
  reviewedBy: z.string().optional(),
  approvedBy: z.string().optional(),
  attachments: z.array(z.object({
    fileName: z.string(),
    fileUrl: z.string(),
    uploadedAt: z.string(),
  })).optional(),
});

type DpiaFormValues = z.infer<typeof dpiaFormSchema>;

const statusLabels: Record<string, string> = {
  draft: "مسودة",
  under_review: "قيد المراجعة",
  completed: "مكتمل",
};

const sensitivityLabels: Record<string, string> = {
  low: "منخفضة",
  medium: "متوسطة",
  high: "عالية",
};

const likelihoodLabels: Record<string, string> = {
  low: "منخفضة",
  medium: "متوسطة",
  high: "عالية",
};

const severityLabels: Record<string, string> = {
  low: "منخفضة",
  medium: "متوسطة",
  high: "عالية",
  critical: "حرجة",
};

const effectivenessLabels: Record<string, string> = {
  low: "منخفضة",
  medium: "متوسطة",
  high: "عالية",
};

const measureStatusLabels: Record<string, string> = {
  planned: "مخطط",
  implemented: "منفذ",
  ongoing: "جاري التنفيذ",
};

const riskLevelLabels: Record<string, string> = {
  low: "منخفض",
  medium: "متوسط",
  high: "عالي",
  critical: "حرج",
};

export default function DpiaManagementPage() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<DpiaAssessment | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<DpiaAssessment | null>(null);

  // Fetch DPIA assessments
  const { data: assessments, isLoading } = useQuery<DpiaAssessment[]>({
    queryKey: ["/api/dpia"],
  });

  // Form
  const form = useForm<DpiaFormValues>({
    resolver: zodResolver(dpiaFormSchema),
    defaultValues: {
      projectName: "",
      projectDescription: "",
      department: "",
      dataTypes: [{ name: "", category: "personal", volume: "", sensitivity: "low" }],
      dataSubjects: "",
      necessityJustification: "",
      proportionalityAssessment: "",
      identifiedRisks: [{ risk: "", likelihood: "low", impact: "low", severity: "low" }],
      mitigationMeasures: [{ measure: "", effectiveness: "medium", status: "planned" }],
      transparencyMeasures: "",
      individualImpact: "low",
      individualImpactDetails: "",
      dpoConsulted: "no",
      dpoRecommendations: "",
      finalDecision: "",
      decisionRationale: "",
      status: "draft",
      overallRiskLevel: "low",
      reviewedBy: "",
      approvedBy: "",
      attachments: [],
    },
  });

  // Field arrays
  const { fields: dataTypeFields, append: appendDataType, remove: removeDataType } = useFieldArray({
    control: form.control,
    name: "dataTypes",
  });

  const { fields: riskFields, append: appendRisk, remove: removeRisk } = useFieldArray({
    control: form.control,
    name: "identifiedRisks",
  });

  const { fields: measureFields, append: appendMeasure, remove: removeMeasure } = useFieldArray({
    control: form.control,
    name: "mitigationMeasures",
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: DpiaFormValues) => {
      const response = await apiRequest("POST", "/api/dpia", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dpia"] });
      setIsAddDialogOpen(false);
      form.reset();
      toast({
        title: "تم الإنشاء",
        description: "تم إنشاء تقييم تأثير حماية البيانات بنجاح",
      });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ أثناء إنشاء التقييم",
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: DpiaFormValues }) => {
      const response = await apiRequest("PUT", `/api/dpia/${id}`, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dpia"] });
      setEditingEntry(null);
      form.reset();
      toast({
        title: "تم التحديث",
        description: "تم تحديث التقييم بنجاح",
      });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ أثناء تحديث التقييم",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/dpia/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dpia"] });
      setDeletingEntry(null);
      toast({
        title: "تم الحذف",
        description: "تم حذف التقييم بنجاح",
      });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ أثناء حذف التقييم",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: DpiaFormValues) => {
    if (editingEntry) {
      updateMutation.mutate({ id: editingEntry.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (assessment: DpiaAssessment) => {
    setEditingEntry(assessment);
    
    form.reset({
      projectName: assessment.projectName || "",
      projectDescription: assessment.projectDescription || "",
      department: assessment.department || "",
      dataTypes: assessment.dataTypes && Array.isArray(assessment.dataTypes) && assessment.dataTypes.length > 0 
        ? assessment.dataTypes as any[]
        : [{ name: "", category: "personal", volume: "", sensitivity: "low" }],
      dataSubjects: assessment.dataSubjects || "",
      necessityJustification: assessment.necessityJustification || "",
      proportionalityAssessment: assessment.proportionalityAssessment || "",
      identifiedRisks: assessment.identifiedRisks && Array.isArray(assessment.identifiedRisks) && assessment.identifiedRisks.length > 0
        ? assessment.identifiedRisks as any[]
        : [{ risk: "", likelihood: "low", impact: "low", severity: "low" }],
      mitigationMeasures: assessment.mitigationMeasures && Array.isArray(assessment.mitigationMeasures) && assessment.mitigationMeasures.length > 0
        ? assessment.mitigationMeasures as any[]
        : [{ measure: "", effectiveness: "medium", status: "planned" }],
      transparencyMeasures: assessment.transparencyMeasures || "",
      individualImpact: assessment.individualImpact as any || "low",
      individualImpactDetails: assessment.individualImpactDetails || "",
      dpoConsulted: assessment.dpoConsulted || "no",
      dpoRecommendations: assessment.dpoRecommendations || "",
      finalDecision: assessment.finalDecision || "",
      decisionRationale: assessment.decisionRationale || "",
      status: assessment.status as any || "draft",
      overallRiskLevel: assessment.overallRiskLevel as any || "low",
      reviewedBy: assessment.reviewedBy || "",
      approvedBy: assessment.approvedBy || "",
      attachments: assessment.attachments && Array.isArray(assessment.attachments) 
        ? assessment.attachments as any[]
        : [],
    });
  };

  const handleCloseDialog = () => {
    if (editingEntry) {
      setEditingEntry(null);
    } else {
      setIsAddDialogOpen(false);
    }
    form.reset();
  };

  return (
    <div className="min-h-screen p-6" style={{ direction: "rtl" }}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-orange-500/10 p-3">
              <AlertTriangle className="h-8 w-8 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h1 className="text-4xl font-bold" data-testid="text-page-title">
                تقييم تأثير حماية البيانات
              </h1>
              <p className="text-muted-foreground text-lg mt-1">
                تقييم المخاطر وفقاً للمادة (٢٥) من اللائحة التنفيذية
              </p>
            </div>
          </div>
          <Dialog open={isAddDialogOpen || !!editingEntry} onOpenChange={(open) => {
            if (!open) handleCloseDialog();
            else if (!editingEntry) setIsAddDialogOpen(true);
          }}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-assessment">
                <Plus className="ml-2 h-4 w-4" />
                إضافة تقييم جديد
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" style={{ direction: "rtl" }}>
              <DialogHeader>
                <DialogTitle data-testid="text-dialog-title">
                  {editingEntry ? "تعديل التقييم" : "إضافة تقييم جديد"}
                </DialogTitle>
                <DialogDescription>
                  قم بملء المعلومات التالية لتقييم تأثير حماية البيانات
                </DialogDescription>
              </DialogHeader>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      معلومات المشروع
                    </h3>
                    
                    <FormField
                      control={form.control}
                      name="projectName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>اسم المشروع *</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-project-name" placeholder="مثال: نظام إدارة العملاء" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="projectDescription"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>وصف المشروع *</FormLabel>
                          <FormControl>
                            <Textarea {...field} data-testid="input-project-description" placeholder="وصف تفصيلي للمشروع وأهدافه" rows={3} />
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
                          <FormLabel>القسم المسؤول *</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-department" placeholder="مثال: تقنية المعلومات" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Data Types */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">أنواع البيانات *</h3>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => appendDataType({ name: "", category: "personal", volume: "", sensitivity: "low" })}
                        data-testid="button-add-data-type"
                      >
                        <Plus className="ml-2 h-4 w-4" />
                        إضافة نوع بيانات
                      </Button>
                    </div>

                    {dataTypeFields.map((field, index) => (
                      <Card key={field.id} className="p-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <FormField
                            control={form.control}
                            name={`dataTypes.${index}.name`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>نوع البيانات</FormLabel>
                                <FormControl>
                                  <Input {...field} data-testid={`input-data-type-name-${index}`} placeholder="مثال: البيانات الشخصية" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`dataTypes.${index}.category`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>التصنيف</FormLabel>
                                <FormControl>
                                  <Input {...field} data-testid={`input-data-type-category-${index}`} placeholder="مثال: personal, sensitive" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`dataTypes.${index}.volume`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>الحجم</FormLabel>
                                <FormControl>
                                  <Input {...field} data-testid={`input-data-type-volume-${index}`} placeholder="مثال: 10,000 سجل" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`dataTypes.${index}.sensitivity`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>مستوى الحساسية</FormLabel>
                                <Select value={field.value} onValueChange={field.onChange}>
                                  <FormControl>
                                    <SelectTrigger data-testid={`select-data-type-sensitivity-${index}`}>
                                      <SelectValue />
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
                        </div>
                        {dataTypeFields.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeDataType(index)}
                            className="mt-2"
                            data-testid={`button-remove-data-type-${index}`}
                          >
                            <X className="ml-2 h-4 w-4" />
                            حذف
                          </Button>
                        )}
                      </Card>
                    ))}
                  </div>

                  {/* Data Subjects & Assessment */}
                  <FormField
                    control={form.control}
                    name="dataSubjects"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>الفئات المستهدفة *</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-data-subjects" placeholder="مثال: الموظفين، العملاء، المستفيدين" />
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
                        <FormLabel>مبرر الضرورة *</FormLabel>
                        <FormControl>
                          <Textarea {...field} data-testid="input-necessity-justification" placeholder="لماذا هذه المعالجة ضرورية؟" rows={3} />
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
                        <FormLabel>تقييم التناسب *</FormLabel>
                        <FormControl>
                          <Textarea {...field} data-testid="input-proportionality-assessment" placeholder="هل المعالجة متناسبة مع الغرض؟" rows={3} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Identified Risks */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">المخاطر المحددة *</h3>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => appendRisk({ risk: "", likelihood: "low", impact: "low", severity: "low" })}
                        data-testid="button-add-risk"
                      >
                        <Plus className="ml-2 h-4 w-4" />
                        إضافة مخاطرة
                      </Button>
                    </div>

                    {riskFields.map((field, index) => (
                      <Card key={field.id} className="p-4">
                        <div className="grid gap-4">
                          <FormField
                            control={form.control}
                            name={`identifiedRisks.${index}.risk`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>وصف المخاطرة</FormLabel>
                                <FormControl>
                                  <Textarea {...field} data-testid={`input-risk-description-${index}`} placeholder="مثال: تسرب البيانات الشخصية" rows={2} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="grid gap-4 md:grid-cols-3">
                            <FormField
                              control={form.control}
                              name={`identifiedRisks.${index}.likelihood`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>الاحتمالية</FormLabel>
                                  <Select value={field.value} onValueChange={field.onChange}>
                                    <FormControl>
                                      <SelectTrigger data-testid={`select-risk-likelihood-${index}`}>
                                        <SelectValue />
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
                              name={`identifiedRisks.${index}.impact`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>التأثير</FormLabel>
                                  <Select value={field.value} onValueChange={field.onChange}>
                                    <FormControl>
                                      <SelectTrigger data-testid={`select-risk-impact-${index}`}>
                                        <SelectValue />
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
                              name={`identifiedRisks.${index}.severity`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>الشدة</FormLabel>
                                  <Select value={field.value} onValueChange={field.onChange}>
                                    <FormControl>
                                      <SelectTrigger data-testid={`select-risk-severity-${index}`}>
                                        <SelectValue />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="low">منخفضة</SelectItem>
                                      <SelectItem value="medium">متوسطة</SelectItem>
                                      <SelectItem value="high">عالية</SelectItem>
                                      <SelectItem value="critical">حرجة</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                        {riskFields.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeRisk(index)}
                            className="mt-2"
                            data-testid={`button-remove-risk-${index}`}
                          >
                            <X className="ml-2 h-4 w-4" />
                            حذف
                          </Button>
                        )}
                      </Card>
                    ))}
                  </div>

                  {/* Mitigation Measures */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">التدابير الوقائية *</h3>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => appendMeasure({ measure: "", effectiveness: "medium", status: "planned" })}
                        data-testid="button-add-measure"
                      >
                        <Plus className="ml-2 h-4 w-4" />
                        إضافة تدبير
                      </Button>
                    </div>

                    {measureFields.map((field, index) => (
                      <Card key={field.id} className="p-4">
                        <div className="grid gap-4">
                          <FormField
                            control={form.control}
                            name={`mitigationMeasures.${index}.measure`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>التدبير الوقائي</FormLabel>
                                <FormControl>
                                  <Textarea {...field} data-testid={`input-measure-description-${index}`} placeholder="مثال: تشفير البيانات" rows={2} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="grid gap-4 md:grid-cols-2">
                            <FormField
                              control={form.control}
                              name={`mitigationMeasures.${index}.effectiveness`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>الفعالية</FormLabel>
                                  <Select value={field.value} onValueChange={field.onChange}>
                                    <FormControl>
                                      <SelectTrigger data-testid={`select-measure-effectiveness-${index}`}>
                                        <SelectValue />
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
                              name={`mitigationMeasures.${index}.status`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>الحالة</FormLabel>
                                  <Select value={field.value} onValueChange={field.onChange}>
                                    <FormControl>
                                      <SelectTrigger data-testid={`select-measure-status-${index}`}>
                                        <SelectValue />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="planned">مخطط</SelectItem>
                                      <SelectItem value="implemented">منفذ</SelectItem>
                                      <SelectItem value="ongoing">جاري التنفيذ</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                        {measureFields.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeMeasure(index)}
                            className="mt-2"
                            data-testid={`button-remove-measure-${index}`}
                          >
                            <X className="ml-2 h-4 w-4" />
                            حذف
                          </Button>
                        )}
                      </Card>
                    ))}
                  </div>

                  {/* Impact & Decision */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="individualImpact"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>التأثير على الأفراد *</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger data-testid="select-individual-impact">
                                <SelectValue />
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
                      name="overallRiskLevel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>مستوى المخاطر الإجمالي</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger data-testid="select-overall-risk">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="low">منخفض</SelectItem>
                              <SelectItem value="medium">متوسط</SelectItem>
                              <SelectItem value="high">عالي</SelectItem>
                              <SelectItem value="critical">حرج</SelectItem>
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
                        <FormLabel>تفاصيل التأثير</FormLabel>
                        <FormControl>
                          <Textarea {...field} data-testid="input-impact-details" placeholder="وصف تفصيلي للتأثير على الأفراد" rows={2} />
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
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger data-testid="select-status">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="draft">مسودة</SelectItem>
                            <SelectItem value="under_review">قيد المراجعة</SelectItem>
                            <SelectItem value="completed">مكتمل</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-3 justify-end pt-4">
                    <Button type="button" variant="outline" onClick={handleCloseDialog} data-testid="button-cancel">
                      إلغاء
                    </Button>
                    <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-submit">
                      {editingEntry ? "تحديث" : "إضافة"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Introduction Card */}
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">
              تقييم تأثير حماية البيانات (DPIA) هو عملية منهجية لتحديد وتقييم المخاطر المحتملة على حقوق وحريات الأفراد 
              الناتجة عن أنشطة معالجة البيانات الشخصية ذات المخاطر العالية، واتخاذ التدابير المناسبة للتخفيف منها.
            </p>
          </CardContent>
        </Card>

        {/* Assessments Table */}
        <Card>
          <CardHeader>
            <CardTitle>التقييمات ({assessments?.length || 0})</CardTitle>
            <CardDescription>
              قائمة جميع تقييمات تأثير حماية البيانات
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">جاري التحميل...</div>
            ) : !assessments || assessments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground" data-testid="text-no-assessments">
                لا توجد تقييمات حتى الآن. ابدأ بإضافة تقييم جديد.
              </div>
            ) : (
              <div className="space-y-4">
                {assessments.map((assessment) => (
                  <Card key={assessment.id} className="hover-elevate" data-testid={`card-assessment-${assessment.id}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <CardTitle className="text-lg mb-1">{assessment.projectName}</CardTitle>
                          <CardDescription className="text-sm">
                            {assessment.department}
                          </CardDescription>
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                            {assessment.projectDescription}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant="secondary" data-testid={`badge-status-${assessment.id}`}>
                            {statusLabels[assessment.status || "draft"]}
                          </Badge>
                          {assessment.overallRiskLevel && (
                            <Badge 
                              variant={assessment.overallRiskLevel === "critical" ? "destructive" : "outline"}
                              data-testid={`badge-risk-${assessment.id}`}
                            >
                              {riskLevelLabels[assessment.overallRiskLevel]}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                          <div>الفئات المستهدفة: {assessment.dataSubjects}</div>
                          <div className="mt-1">
                            المخاطر: {Array.isArray(assessment.identifiedRisks) ? assessment.identifiedRisks.length : 0} | 
                            التدابير: {Array.isArray(assessment.mitigationMeasures) ? assessment.mitigationMeasures.length : 0}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(assessment)}
                            data-testid={`button-edit-${assessment.id}`}
                          >
                            <Edit className="ml-2 h-4 w-4" />
                            تعديل
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeletingEntry(assessment)}
                            data-testid={`button-delete-${assessment.id}`}
                          >
                            <Trash2 className="ml-2 h-4 w-4" />
                            حذف
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deletingEntry} onOpenChange={(open) => !open && setDeletingEntry(null)}>
          <AlertDialogContent style={{ direction: "rtl" }}>
            <AlertDialogHeader>
              <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
              <AlertDialogDescription>
                هل أنت متأكد من حذف هذا التقييم؟ لا يمكن التراجع عن هذا الإجراء.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-delete">إلغاء</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deletingEntry && deleteMutation.mutate(deletingEntry.id)}
                data-testid="button-confirm-delete"
              >
                حذف
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
