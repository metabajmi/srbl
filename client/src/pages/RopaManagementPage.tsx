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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Edit, Trash2, FileDown, Database, Shield } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { RopaEntry } from "@shared/schema";
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

// Form schema matching backend InsertRopaEntry
const ropaFormSchema = z.object({
  department: z.string().min(2, "يجب إدخال اسم القسم"),
  dataTypes: z.array(z.object({
    name: z.string().min(1, "يجب إدخال اسم نوع البيانات"),
    category: z.string().min(1, "يجب اختيار التصنيف"),
    isSensitive: z.boolean(),
  })).min(1, "يجب إدخال نوع واحد على الأقل من البيانات"),
  processingPurpose: z.string().min(5, "يجب توضيح الغرض من المعالجة"),
  legalBasis: z.enum(["consent", "contract", "legal_obligation", "legitimate_interest"]),
  retentionPeriod: z.string().min(2, "يجب تحديد مدة الاحتفاظ"),
  dataRecipients: z.array(z.object({
    name: z.string(),
    purpose: z.string(),
    location: z.string(),
  })).optional(),
  securityMeasures: z.string().optional(),
  internationalTransfers: z.string().optional(),
  transferDetails: z.string().optional(),
  notes: z.string().optional(),
}).refine(
  (data) => {
    // If any recipient field is filled, require at least the name
    const recipient = data.dataRecipients?.[0];
    if (!recipient) return true;
    
    const hasAnyValue = recipient.purpose.trim() || recipient.location.trim();
    if (hasAnyValue && !recipient.name.trim()) {
      return false;
    }
    return true;
  },
  {
    message: "يجب إدخال اسم المستلم إذا تم إدخال غرض أو موقع",
    path: ["dataRecipients", "0", "name"],
  }
);

type RopaFormValues = z.infer<typeof ropaFormSchema>;

const legalBasisLabels: Record<string, string> = {
  consent: "الموافقة",
  contract: "العقد",
  legal_obligation: "الالتزام النظامي",
  legitimate_interest: "المصلحة المشروعة",
};

export default function RopaManagementPage() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<RopaEntry | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<RopaEntry | null>(null);

  // Fetch ROPA entries
  const { data: entries, isLoading } = useQuery<RopaEntry[]>({
    queryKey: ["/api/ropa"],
  });

  // Form
  const form = useForm<RopaFormValues>({
    resolver: zodResolver(ropaFormSchema),
    defaultValues: {
      department: "",
      dataTypes: [{ name: "بيانات شخصية", category: "personal", isSensitive: false }],
      processingPurpose: "",
      legalBasis: "consent",
      retentionPeriod: "",
      dataRecipients: [{ name: "", purpose: "", location: "" }],
      securityMeasures: "",
      internationalTransfers: "no",
      transferDetails: "",
      notes: "",
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: RopaFormValues) => {
      const response = await apiRequest("POST", "/api/ropa", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ropa"] });
      setIsAddDialogOpen(false);
      form.reset();
      toast({
        title: "تم الإنشاء",
        description: "تم إنشاء سجل المعالجة بنجاح",
      });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "فشل في إنشاء سجل المعالجة",
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<RopaEntry> }) => {
      const response = await apiRequest("PUT", `/api/ropa/${id}`, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ropa"] });
      setEditingEntry(null);
      form.reset();
      toast({
        title: "تم التحديث",
        description: "تم تحديث سجل المعالجة بنجاح",
      });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "فشل في تحديث سجل المعالجة",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/ropa/${id}`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ropa"] });
      setDeletingEntry(null);
      toast({
        title: "تم الحذف",
        description: "تم حذف سجل المعالجة بنجاح",
      });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "فشل في حذف سجل المعالجة",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RopaFormValues) => {
    // Clean up dataRecipients - filter out empty entries
    const filteredRecipients = data.dataRecipients
      ?.filter(r => r.name.trim() || r.purpose.trim() || r.location.trim())
      .filter(r => r.name.trim()); // Only keep entries with name (required by validation)
    
    const cleanedData = {
      ...data,
      dataRecipients: filteredRecipients && filteredRecipients.length > 0 
        ? filteredRecipients 
        : undefined,
    };
    
    if (editingEntry) {
      updateMutation.mutate({ id: editingEntry.id, data: cleanedData });
    } else {
      createMutation.mutate(cleanedData);
    }
  };

  const handleEdit = (entry: RopaEntry) => {
    setEditingEntry(entry);
    
    // Type-safe data extraction with proper defaults
    const dataTypes = (entry.dataTypes as unknown as Array<{name: string, category: string, isSensitive: boolean}>) || 
      [{ name: "بيانات شخصية", category: "personal", isSensitive: false }];
    
    // Preserve existing dataRecipients or use empty array (no forced placeholder)
    const existingRecipients = entry.dataRecipients as unknown as Array<{name: string, purpose: string, location: string}> | null;
    const dataRecipients = existingRecipients && existingRecipients.length > 0 
      ? existingRecipients 
      : [{ name: "", purpose: "", location: "" }];
    
    form.reset({
      department: entry.department,
      dataTypes,
      processingPurpose: entry.processingPurpose,
      legalBasis: entry.legalBasis as "consent" | "contract" | "legal_obligation" | "legitimate_interest",
      retentionPeriod: entry.retentionPeriod,
      dataRecipients,
      securityMeasures: entry.securityMeasures || "",
      internationalTransfers: entry.internationalTransfers || "no",
      transferDetails: entry.transferDetails || "",
      notes: entry.notes || "",
    });
  };

  const handleExport = () => {
    // Simple CSV export
    if (!entries || entries.length === 0) {
      toast({
        title: "تنبيه",
        description: "لا توجد سجلات للتصدير",
        variant: "destructive",
      });
      return;
    }

    const headers = ["القسم", "الغرض", "الأساس النظامي", "مدة الاحتفاظ"];
    const rows = entries.map(e => [
      e.department,
      e.processingPurpose,
      legalBasisLabels[e.legalBasis] || e.legalBasis,
      e.retentionPeriod,
    ]);

    const csv = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `ropa-register-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    toast({
      title: "تم التصدير",
      description: "تم تصدير سجل المعالجة بنجاح",
    });
  };

  return (
    <div className="min-h-screen p-6" style={{ direction: "rtl" }}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Database className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold" data-testid="text-page-title">
                سجل أنشطة المعالجة (ROPA)
              </h1>
              <p className="text-muted-foreground">
                تسجيل وإدارة جميع عمليات معالجة البيانات الشخصية
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={handleExport}
              disabled={!entries || entries.length === 0}
              data-testid="button-export"
              className="hover-elevate active-elevate-2"
            >
              <FileDown className="ml-2 h-4 w-4" />
              تصدير CSV
            </Button>

            <Dialog open={isAddDialogOpen || !!editingEntry} onOpenChange={(open) => {
              if (!open) {
                setIsAddDialogOpen(false);
                setEditingEntry(null);
                form.reset();
              } else if (!editingEntry) {
                setIsAddDialogOpen(true);
              }
            }}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-entry" className="hover-elevate active-elevate-2">
                  <Plus className="ml-2 h-4 w-4" />
                  إضافة سجل جديد
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" style={{ direction: "rtl" }}>
                <DialogHeader>
                  <DialogTitle data-testid="text-dialog-title">
                    {editingEntry ? "تعديل سجل المعالجة" : "إضافة سجل معالجة جديد"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingEntry ? "تعديل تفاصيل سجل المعالجة" : "أدخل تفاصيل نشاط معالجة البيانات"}
                  </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="department"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>القسم أو الجهة المسؤولة</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="مثل: التسويق، الموارد البشرية" data-testid="input-department" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-3 p-4 border rounded-md">
                      <FormLabel>نوع البيانات المعالجة</FormLabel>
                      
                      <FormField
                        control={form.control}
                        name="dataTypes.0.name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>اسم نوع البيانات</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="مثل: بيانات شخصية، بيانات مالية" data-testid="input-data-type" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="dataTypes.0.category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>تصنيف البيانات</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-data-category">
                                  <SelectValue placeholder="اختر التصنيف" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="personal">بيانات شخصية</SelectItem>
                                <SelectItem value="financial">بيانات مالية</SelectItem>
                                <SelectItem value="health">بيانات صحية</SelectItem>
                                <SelectItem value="biometric">بيانات بيومترية</SelectItem>
                                <SelectItem value="other">أخرى</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="dataTypes.0.isSensitive"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center gap-2 space-y-0">
                            <FormControl>
                              <input
                                type="checkbox"
                                checked={field.value}
                                onChange={field.onChange}
                                data-testid="checkbox-is-sensitive"
                                className="h-4 w-4"
                              />
                            </FormControl>
                            <FormLabel className="!m-0">بيانات حساسة</FormLabel>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="processingPurpose"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>الغرض من المعالجة</FormLabel>
                          <FormControl>
                            <Textarea {...field} placeholder="مثل: التوظيف، التسويق، تقديم الخدمات" data-testid="input-purpose" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="legalBasis"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>الأساس النظامي</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-legal-basis">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="consent">الموافقة</SelectItem>
                              <SelectItem value="contract">العقد</SelectItem>
                              <SelectItem value="legal_obligation">الالتزام النظامي</SelectItem>
                              <SelectItem value="legitimate_interest">المصلحة المشروعة</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="retentionPeriod"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>مدة الاحتفاظ</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="مثل: 5 سنوات، حتى انتهاء العقد" data-testid="input-retention" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-3 p-4 border rounded-md">
                      <FormLabel>المستلمون (اختياري)</FormLabel>
                      <p className="text-sm text-muted-foreground">أطراف ثالثة يتم مشاركة البيانات معهم</p>
                      
                      <FormField
                        control={form.control}
                        name="dataRecipients.0.name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>اسم المستلم</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="اسم الطرف الثالث" data-testid="input-recipient-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="dataRecipients.0.purpose"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>الغرض</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="غرض المشاركة" data-testid="input-recipient-purpose" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="dataRecipients.0.location"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>الموقع</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="موقع المستلم" data-testid="input-recipient-location" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="securityMeasures"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>التدابير الأمنية (اختياري)</FormLabel>
                          <FormControl>
                            <Textarea {...field} placeholder="وصف التدابير الأمنية المطبقة" data-testid="input-security" />
                          </FormControl>
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
                            <Textarea {...field} placeholder="أي ملاحظات أو تفاصيل إضافية" data-testid="input-notes" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end gap-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsAddDialogOpen(false);
                          setEditingEntry(null);
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
                          : editingEntry
                          ? "تحديث"
                          : "إضافة"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Entries List */}
        {isLoading ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              جاري التحميل...
            </CardContent>
          </Card>
        ) : !entries || entries.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Shield className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">لا توجد سجلات</h3>
              <p className="text-muted-foreground mb-4">
                ابدأ بإضافة أول سجل لأنشطة معالجة البيانات
              </p>
              <Button
                onClick={() => setIsAddDialogOpen(true)}
                data-testid="button-add-first"
                className="hover-elevate active-elevate-2"
              >
                <Plus className="ml-2 h-4 w-4" />
                إضافة سجل جديد
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {entries.map((entry) => (
              <Card key={entry.id} data-testid={`card-entry-${entry.id}`} className="hover-elevate">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="text-lg" data-testid={`text-department-${entry.id}`}>
                        {entry.department}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        الغرض: {entry.processingPurpose}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleEdit(entry)}
                        data-testid={`button-edit-${entry.id}`}
                        className="hover-elevate active-elevate-2"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeletingEntry(entry)}
                        data-testid={`button-delete-${entry.id}`}
                        className="hover-elevate active-elevate-2"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-semibold">الأساس النظامي:</span>{" "}
                      {legalBasisLabels[entry.legalBasis] || entry.legalBasis}
                    </div>
                    <div>
                      <span className="font-semibold">مدة الاحتفاظ:</span>{" "}
                      {entry.retentionPeriod}
                    </div>
                    {entry.securityMeasures && (
                      <div className="md:col-span-2">
                        <span className="font-semibold">التدابير الأمنية:</span>{" "}
                        {entry.securityMeasures}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Delete Confirmation */}
        <AlertDialog open={!!deletingEntry} onOpenChange={() => setDeletingEntry(null)}>
          <AlertDialogContent style={{ direction: "rtl" }}>
            <AlertDialogHeader>
              <AlertDialogTitle data-testid="text-delete-title">
                هل أنت متأكد من الحذف؟
              </AlertDialogTitle>
              <AlertDialogDescription data-testid="text-delete-description">
                سيتم حذف سجل المعالجة "{deletingEntry?.department}" نهائياً. هذا الإجراء لا يمكن التراجع عنه.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-delete-cancel" className="hover-elevate active-elevate-2">
                إلغاء
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deletingEntry && deleteMutation.mutate(deletingEntry.id)}
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
