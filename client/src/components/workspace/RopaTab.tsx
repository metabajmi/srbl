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
import { Plus, Edit, Trash2, FileText } from "lucide-react";

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

export default function RopaTab() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<RopaEntry | null>(null);
  const { toast } = useToast();

  const { data: entries = [] } = useQuery<RopaEntry[]>({
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
      toast({ title: "تم الإضافة بنجاح", description: "تم تسجيل المعالجة" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "خطأ", description: "فشل في الإضافة", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/ropa/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ropa"] });
      toast({ title: "تم الحذف", description: "تم حذف السجل" });
    },
    onError: () => {
      toast({ title: "خطأ", description: "فشل في الحذف", variant: "destructive" });
    },
  });

  const onSubmit = (data: RopaFormData) => createMutation.mutate(data);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>سجل المعالجة والمساءلة</CardTitle>
          <CardDescription>
            توثيق عمليات معالجة البيانات الشخصية
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="ml-2 h-4 w-4" />إضافة معالجة</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>إضافة معالجة جديدة</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField control={form.control} name="department" render={({ field }) => (
                    <FormItem>
                      <FormLabel>القسم</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="مثال: قسم التسويق" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="processingPurpose" render={({ field }) => (
                    <FormItem>
                      <FormLabel>الغرض من المعالجة</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="الغرض الرئيسي من معالجة البيانات" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="legalBasis" render={({ field }) => (
                    <FormItem>
                      <FormLabel>الأساس النظامي</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="consent">موافقة صاحب البيانات</SelectItem>
                          <SelectItem value="contract">تنفيذ العقد</SelectItem>
                          <SelectItem value="legal">التزام قانوني</SelectItem>
                          <SelectItem value="vital">حماية المصالح الحيوية</SelectItem>
                          <SelectItem value="public">مهمة من قبل جهة عامة</SelectItem>
                          <SelectItem value="legitimate">مصلحة مشروعة</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="retentionPeriod" render={({ field }) => (
                    <FormItem>
                      <FormLabel>مدة الاحتفاظ</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="مثال: سنة واحدة" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "جاري الإضافة..." : "إضافة"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>المعالجات المسجلة</CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">لم يتم تسجيل أي معالجات بعد</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>القسم</TableHead>
                    <TableHead>الغرض</TableHead>
                    <TableHead>الأساس النظامي</TableHead>
                    <TableHead>مدة الاحتفاظ</TableHead>
                    <TableHead>الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{entry.department}</TableCell>
                      <TableCell className="max-w-xs truncate">{entry.processingPurpose}</TableCell>
                      <TableCell>{entry.legalBasis}</TableCell>
                      <TableCell>{entry.retentionPeriod}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(entry.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
