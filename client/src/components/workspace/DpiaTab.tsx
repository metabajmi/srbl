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
import { Plus, Trash2, ShieldAlert, AlertTriangle, CheckCircle2 } from "lucide-react";

const dpiaFormSchema = z.object({
  projectName: z.string().min(1, "اسم المشروع مطلوب"),
  projectDescription: z.string().min(1, "وصف المشروع مطلوب"),
  department: z.string().min(1, "القسم مطلوب"),
  dataSubjects: z.string().min(1, "الفئات المستهدفة مطلوبة"),
  necessityJustification: z.string().min(1, "مبرر الضرورة مطلوب"),
  proportionalityAssessment: z.string().min(1, "تقييم التناسب مطلوب"),
  individualImpact: z.string().min(1, "التأثير على الأفراد مطلوب"),
  status: z.string().optional(),
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
  status: string;
  createdAt: string;
}

const riskLevels = {
  low: { label: "منخفضة", icon: CheckCircle2, color: "text-green-600" },
  medium: { label: "متوسطة", icon: AlertTriangle, color: "text-yellow-600" },
  high: { label: "عالية", icon: ShieldAlert, color: "text-red-600" },
};

export default function DpiaTab() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: assessments = [] } = useQuery<DpiaAssessment[]>({
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
      status: "draft",
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
      toast({ title: "تم الإضافة بنجاح", description: "تم إنشاء تقييم التأثير" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "خطأ", description: "فشل في إنشاء التقييم", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/dpia/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dpia"] });
      toast({ title: "تم الحذف", description: "تم حذف التقييم" });
    },
    onError: () => {
      toast({ title: "خطأ", description: "فشل في الحذف", variant: "destructive" });
    },
  });

  const onSubmit = (data: DpiaFormData) => createMutation.mutate(data);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>تقييم التأثير على الخصوصية</CardTitle>
          <CardDescription>
            تقييم المخاطر والتأثير على حماية البيانات الشخصية
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="ml-2 h-4 w-4" />تقييم جديد</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>إنشاء تقييم تأثير جديد</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField control={form.control} name="projectName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>اسم المشروع</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="projectDescription" render={({ field }) => (
                    <FormItem>
                      <FormLabel>وصف المشروع</FormLabel>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="department" render={({ field }) => (
                    <FormItem>
                      <FormLabel>القسم</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="dataSubjects" render={({ field }) => (
                    <FormItem>
                      <FormLabel>الفئات المستهدفة</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="مثال: الموظفون، العملاء" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="necessityJustification" render={({ field }) => (
                    <FormItem>
                      <FormLabel>مبرر الضرورة</FormLabel>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="proportionalityAssessment" render={({ field }) => (
                    <FormItem>
                      <FormLabel>تقييم التناسب</FormLabel>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="individualImpact" render={({ field }) => (
                    <FormItem>
                      <FormLabel>التأثير على الأفراد</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
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
                  )} />
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "جاري الإضافة..." : "إنشاء التقييم"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>التقييمات المسجلة</CardTitle>
        </CardHeader>
        <CardContent>
          {assessments.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">لم يتم إنشاء أي تقييمات</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>اسم المشروع</TableHead>
                    <TableHead>القسم</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>التأثير</TableHead>
                    <TableHead>الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assessments.map((assessment) => (
                    <TableRow key={assessment.id}>
                      <TableCell>{assessment.projectName}</TableCell>
                      <TableCell>{assessment.department}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {assessment.status === "draft" && "مسودة"}
                          {assessment.status === "in_review" && "قيد المراجعة"}
                          {assessment.status === "approved" && "موافق عليه"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {assessment.individualImpact === "low" && "منخفض"}
                          {assessment.individualImpact === "medium" && "متوسط"}
                          {assessment.individualImpact === "high" && "عالي"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(assessment.id)}>
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
