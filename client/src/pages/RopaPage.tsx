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
import { Plus, Edit, Trash2, FileText, Shield } from "lucide-react";
import { BackButton } from "@/components/BackButton";

const ropaFormSchema = z.object({
  department: z.string().min(1, "القسم مطلوب"),
  processingPurpose: z.string().min(1, "الغرض من المعالجة مطلوب"),
  legalBasis: z.string().min(1, "الأساس النظامي مطلوب"),
  retentionPeriod: z.string().min(1, "مدة الاحتفاظ مطلوبة"),
  securityMeasures: z.string().optional(),
  internationalTransfers: z.string().optional(),
  transferDetails: z.string().optional(),
  notes: z.string().optional(),
});

type RopaFormData = z.infer<typeof ropaFormSchema>;

interface RopaEntry {
  id: string;
  department: string;
  processingPurpose: string;
  legalBasis: string;
  retentionPeriod: string;
  securityMeasures?: string;
  internationalTransfers?: string;
  transferDetails?: string;
  notes?: string;
  createdAt: string;
}

export default function RopaPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<RopaEntry | null>(null);
  const { toast } = useToast();

  const { data: entries = [], isLoading } = useQuery<RopaEntry[]>({
    queryKey: ["/api/ropa"],
  });

  const form = useForm<RopaFormData>({
    resolver: zodResolver(ropaFormSchema),
    defaultValues: {
      department: "",
      processingPurpose: "",
      legalBasis: "",
      retentionPeriod: "",
      securityMeasures: "",
      internationalTransfers: "no",
      transferDetails: "",
      notes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: RopaFormData) => 
      apiRequest("POST", "/api/ropa", {
        ...data,
        dataTypes: [],
        dataRecipients: [],
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ropa"] });
      toast({
        title: "تم الإضافة بنجاح",
        description: "تم إضافة السجل بنجاح",
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "فشل في إضافة السجل",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: RopaFormData & { id: string }) =>
      apiRequest("PUT", `/api/ropa/${data.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ropa"] });
      toast({
        title: "تم التحديث بنجاح",
        description: "تم تحديث السجل بنجاح",
      });
      setIsDialogOpen(false);
      setEditingEntry(null);
      form.reset();
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "فشل في تحديث السجل",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("DELETE", `/api/ropa/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ropa"] });
      toast({
        title: "تم الحذف بنجاح",
        description: "تم حذف السجل بنجاح",
      });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "فشل في حذف السجل",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RopaFormData) => {
    if (editingEntry) {
      updateMutation.mutate({ ...data, id: editingEntry.id });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (entry: RopaEntry) => {
    setEditingEntry(entry);
    form.reset({
      department: entry.department,
      processingPurpose: entry.processingPurpose,
      legalBasis: entry.legalBasis,
      retentionPeriod: entry.retentionPeriod,
      securityMeasures: entry.securityMeasures || "",
      internationalTransfers: entry.internationalTransfers || "no",
      transferDetails: entry.transferDetails || "",
      notes: entry.notes || "",
    });
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingEntry(null);
    form.reset();
  };

  const getLegalBasisLabel = (basis: string) => {
    const labels: Record<string, string> = {
      consent: "موافقة صاحب البيانات",
      contract: "تنفيذ عقد",
      legal_obligation: "التزام نظامي",
      legitimate_interest: "مصلحة مشروعة",
    };
    return labels[basis] || basis;
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl" dir="rtl">
      <div className="mb-6">
        <BackButton />
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-lg">
            <FileText className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">سجل أنشطة المعالجة</h1>
            <p className="text-muted-foreground">
              إدارة سجل أنشطة معالجة البيانات الشخصية (ROPA)
            </p>
          </div>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                setEditingEntry(null);
                form.reset();
              }}
              data-testid="button-add-ropa"
            >
              <Plus className="w-4 h-4 ml-2" />
              إضافة سجل جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle>
                {editingEntry ? "تعديل السجل" : "إضافة سجل جديد"}
              </DialogTitle>
              <DialogDescription>
                أدخل تفاصيل نشاط معالجة البيانات الشخصية
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
                        <Input
                          placeholder="مثل: التسويق، الموارد البشرية، تقنية المعلومات"
                          {...field}
                          data-testid="input-department"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="processingPurpose"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الغرض من المعالجة</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="مثل: التوظيف، التسويق، تقديم الخدمات"
                          {...field}
                          data-testid="input-purpose"
                        />
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
                            <SelectValue placeholder="اختر الأساس النظامي" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="consent">موافقة صاحب البيانات</SelectItem>
                          <SelectItem value="contract">تنفيذ عقد</SelectItem>
                          <SelectItem value="legal_obligation">التزام نظامي</SelectItem>
                          <SelectItem value="legitimate_interest">مصلحة مشروعة</SelectItem>
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
                      <FormLabel>مدة الاحتفاظ بالبيانات</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="مثل: 5 سنوات، حتى انتهاء العقد"
                          {...field}
                          data-testid="input-retention"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="securityMeasures"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>التدابير الأمنية (اختياري)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="وصف التدابير الأمنية المطبقة"
                          {...field}
                          data-testid="input-security"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="internationalTransfers"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>النقل عبر الحدود</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-transfers">
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

                {form.watch("internationalTransfers") === "yes" && (
                  <FormField
                    control={form.control}
                    name="transferDetails"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>تفاصيل النقل</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="أدخل تفاصيل النقل عبر الحدود"
                            {...field}
                            data-testid="input-transfer-details"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

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
                    data-testid="button-submit-ropa"
                  >
                    {editingEntry ? "تحديث" : "إضافة"}
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
            <Shield className="w-5 h-5" />
            السجلات المسجلة
          </CardTitle>
          <CardDescription>
            عرض جميع أنشطة معالجة البيانات الشخصية المسجلة
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              جارٍ التحميل...
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              لا توجد سجلات بعد. ابدأ بإضافة سجل جديد.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">القسم</TableHead>
                  <TableHead className="text-right">الغرض</TableHead>
                  <TableHead className="text-right">الأساس النظامي</TableHead>
                  <TableHead className="text-right">مدة الاحتفاظ</TableHead>
                  <TableHead className="text-right">نقل دولي</TableHead>
                  <TableHead className="text-right">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id} data-testid={`row-ropa-${entry.id}`}>
                    <TableCell className="font-medium">{entry.department}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {entry.processingPurpose}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getLegalBasisLabel(entry.legalBasis)}
                      </Badge>
                    </TableCell>
                    <TableCell>{entry.retentionPeriod}</TableCell>
                    <TableCell>
                      <Badge variant={entry.internationalTransfers === "yes" ? "default" : "secondary"}>
                        {entry.internationalTransfers === "yes" ? "نعم" : "لا"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(entry)}
                          data-testid={`button-edit-${entry.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm("هل أنت متأكد من حذف هذا السجل؟")) {
                              deleteMutation.mutate(entry.id);
                            }
                          }}
                          data-testid={`button-delete-${entry.id}`}
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
