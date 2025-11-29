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
import { Plus, CheckCircle, Clock, XCircle, Users } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

const dsarFormSchema = z.object({
  requesterName: z.string().min(1, "اسم مقدم الطلب مطلوب"),
  requesterEmail: z.string().email("البريد الإلكتروني غير صحيح"),
  requesterPhone: z.string().optional(),
  requestType: z.string().min(1, "نوع الطلب مطلوب"),
  requestDetails: z.string().min(1, "تفاصيل الطلب مطلوبة"),
  status: z.string().optional(),
});

type DsarFormData = z.infer<typeof dsarFormSchema>;

interface DsarRequest {
  id: string;
  requesterName: string;
  requesterEmail: string;
  requestType: string;
  requestDetails: string;
  status: string;
  submittedAt: string;
  dueDate: string;
}

const statusIcon = (status: string) => {
  switch(status) {
    case "completed": return <CheckCircle className="h-4 w-4 text-green-600" />;
    case "in_progress": return <Clock className="h-4 w-4 text-blue-600" />;
    case "rejected": return <XCircle className="h-4 w-4 text-red-600" />;
    default: return <Clock className="h-4 w-4 text-gray-600" />;
  }
};

export default function DsarTab() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: requests = [] } = useQuery<DsarRequest[]>({
    queryKey: ["/api/dsar"],
  });

  const form = useForm<DsarFormData>({
    resolver: zodResolver(dsarFormSchema),
    defaultValues: {
      requesterName: "",
      requesterEmail: "",
      requesterPhone: "",
      requestType: "",
      requestDetails: "",
      status: "new",
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: DsarFormData) => {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);
      return apiRequest("POST", "/api/dsar", { ...data, dueDate: dueDate.toISOString() });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dsar"] });
      toast({ title: "تم تسجيل الطلب", description: "تم إضافة طلب الوصول للبيانات" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "خطأ", description: "فشل في تسجيل الطلب", variant: "destructive" });
    },
  });

  const onSubmit = (data: DsarFormData) => createMutation.mutate(data);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>طلبات الوصول للبيانات</CardTitle>
          <CardDescription>
            تتبع وإدارة طلبات الوصول إلى البيانات الشخصية
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="ml-2 h-4 w-4" />إضافة طلب جديد</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>تسجيل طلب وصول جديد</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField control={form.control} name="requesterName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>اسم مقدم الطلب</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="requesterEmail" render={({ field }) => (
                    <FormItem>
                      <FormLabel>البريد الإلكتروني</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="requestType" render={({ field }) => (
                    <FormItem>
                      <FormLabel>نوع الطلب</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="access">الوصول للبيانات</SelectItem>
                          <SelectItem value="correction">تصحيح البيانات</SelectItem>
                          <SelectItem value="deletion">حذف البيانات</SelectItem>
                          <SelectItem value="portability">نقل البيانات</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="requestDetails" render={({ field }) => (
                    <FormItem>
                      <FormLabel>تفاصيل الطلب</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="تفاصيل إضافية حول الطلب" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "جاري الإضافة..." : "تسجيل الطلب"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>الطلبات المسجلة</CardTitle>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">لم يتم تسجيل أي طلبات</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>اسم مقدم الطلب</TableHead>
                    <TableHead>نوع الطلب</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>تاريخ الاستحقاق</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>{request.requesterName}</TableCell>
                      <TableCell>{request.requestType}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {statusIcon(request.status)}
                          <Badge variant="outline">
                            {request.status === "new" && "جديد"}
                            {request.status === "in_progress" && "قيد المعالجة"}
                            {request.status === "completed" && "مكتمل"}
                            {request.status === "rejected" && "مرفوض"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(new Date(request.dueDate), "dd MMMM yyyy", { locale: ar })}
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
