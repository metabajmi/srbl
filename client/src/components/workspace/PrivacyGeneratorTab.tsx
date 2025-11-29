import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { FileText, Loader2, Download, Plus, Trash2, AlertCircle, CheckCircle2 } from "lucide-react";
import { insertPolicyDocumentSchema, type PolicyDocument } from "@shared/schema";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { z } from "zod";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";

const formSchema = z.object({
  companyName: z.string().min(2, "يجب إدخال اسم الجهة"),
  businessType: z.string().min(2, "يجب إدخال نوع النشاط"),
  entityType: z.enum(["government", "private", "individual"], {
    required_error: "يجب تحديد صفة الجهة"
  }),
  contactEmail: z.string().email("يجب إدخال بريد إلكتروني صحيح"),
  contactPhone: z.string().optional(),
  contactAddress: z.string().optional(),
  processesSensitiveData: z.enum(["yes", "no"]).optional(),
  dpoName: z.string().optional(),
  dpoEmail: z.string().email("يجب إدخال بريد إلكتروني صحيح").optional().or(z.literal("")),
  dpoPhone: z.string().optional(),
  dpoAddress: z.string().optional(),
  dataCategories: z.array(z.object({
    name: z.string().min(1, "يجب إدخال اسم البيان"),
    required: z.boolean(),
    purpose: z.string().min(1, "يجب إدخال الغرض"),
    legalBasis: z.enum(["consent", "contract", "legal_obligation", "legitimate_interest"]),
  })).min(1, "يجب إضافة فئة واحدة على الأقل"),
  collectionMethod: z.enum(["direct", "indirect", "both"]).optional(),
  processingMethods: z.string().optional(),
  sharesWithThirdParties: z.enum(["yes", "no"]).optional(),
  transfersDataAbroad: z.enum(["yes", "no"]).optional(),
  retentionPeriod: z.string().optional(),
  usesCookies: z.enum(["yes", "no"]).optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function PrivacyGeneratorTab() {
  const { toast } = useToast();
  const [currentSection, setCurrentSection] = useState(1);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyName: "",
      businessType: "",
      entityType: undefined,
      contactEmail: "",
      contactPhone: "",
      contactAddress: "",
      processesSensitiveData: undefined,
      dpoName: "",
      dpoEmail: "",
      dpoPhone: "",
      dpoAddress: "",
      dataCategories: [],
      collectionMethod: undefined,
      processingMethods: "",
      sharesWithThirdParties: undefined,
      transfersDataAbroad: undefined,
      retentionPeriod: "",
      usesCookies: undefined,
    },
  });

  const { fields: dataFields, append: appendData, remove: removeData } = useFieldArray({
    control: form.control,
    name: "dataCategories",
  });

  const { data: policies } = useQuery<PolicyDocument[]>({
    queryKey: ["/api/policies"],
    refetchInterval: (query) => {
      const data = query.state.data as PolicyDocument[] | undefined;
      if (!data || !Array.isArray(data)) return false;
      const hasGenerating = data.some((p) => p.status === "generating" || p.status === "pending");
      return hasGenerating ? 2000 : false;
    },
  });

  const generateMutation = useMutation({
    mutationFn: async (data: z.infer<typeof insertPolicyDocumentSchema>) => {
      const response = await apiRequest("POST", "/api/policies", data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "تم بدء توليد سياسة الخصوصية",
        description: "سيتم إشعارك عند اكتمال التوليد",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/policies"] });
      form.reset();
      setCurrentSection(1);
    },
    onError: (error: any) => {
      toast({
        title: "خطأ في التوليد",
        description: error.message || "حدث خطأ أثناء توليد سياسة الخصوصية",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: FormValues) => {
    const submitData: z.infer<typeof insertPolicyDocumentSchema> = {
      companyName: values.companyName,
      businessType: values.businessType,
      entityType: values.entityType,
      contactEmail: values.contactEmail,
      contactPhone: values.contactPhone || null,
      contactAddress: values.contactAddress || null,
      processesSensitiveData: values.processesSensitiveData || null,
      requiresDPO: values.processesSensitiveData === "yes" ? "yes" : "no",
      dpoName: values.dpoName || null,
      dpoEmail: values.dpoEmail || null,
      dpoPhone: values.dpoPhone || null,
      dpoAddress: values.dpoAddress || null,
      dataCategories: values.dataCategories,
      collectionMethod: values.collectionMethod || null,
      processingMethods: values.processingMethods || null,
      sharesWithThirdParties: values.sharesWithThirdParties || null,
      transfersDataAbroad: values.transfersDataAbroad || null,
      retentionPeriod: values.retentionPeriod || null,
      usesCookies: values.usesCookies || null,
    };
    generateMutation.mutate(submitData);
  };

  const handleDownload = (policy: PolicyDocument) => {
    if (!policy.generatedContent) return;
    
    const escapeHtml = (text: string): string => {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    };
    
    const safeCompanyName = escapeHtml(policy.companyName);
    const safeDate = escapeHtml(new Date(policy.createdAt!).toLocaleDateString('ar-SA', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }));
    
    const htmlContent = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>سياسة الخصوصية - ${safeCompanyName}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
        body { font-family: 'Cairo', sans-serif; line-height: 1.8; color: #1a1a1a; max-width: 900px; margin: 0 auto; padding: 40px 20px; }
        h1 { color: #2563eb; text-align: center; border-bottom: 3px solid #2563eb; padding-bottom: 20px; }
        h2 { color: #1e40af; border-right: 5px solid #3b82f6; padding-right: 15px; }
        .header { text-align: center; margin-bottom: 40px; padding: 30px; background: linear-gradient(135deg, #2563eb, #3b82f6); color: white; border-radius: 10px; }
        .header h1 { color: white; border-bottom: none; }
        .content { background: #fff; padding: 40px; border-radius: 10px; }
        .footer { margin-top: 50px; padding-top: 30px; border-top: 2px solid #e5e7eb; text-align: center; color: #6b7280; }
    </style>
</head>
<body>
    <div class="header">
        <h1>سياسة الخصوصية</h1>
        <div>${safeCompanyName}</div>
        <div>تاريخ الإصدار: ${safeDate}</div>
    </div>
    <div class="content">${policy.generatedContent}</div>
    <div class="footer">
        <p>تم توليده بواسطة أداة الامتثال لنظام حماية البيانات الشخصية السعودي</p>
    </div>
</body>
</html>`;
    
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `سياسة-الخصوصية-${policy.companyName}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const watchProcessesSensitiveData = form.watch("processesSensitiveData");

  return (
    <div className="space-y-6">
      <div className="mb-6 flex gap-2 justify-center flex-wrap">
        <Badge 
          variant={currentSection === 1 ? "default" : "outline"}
          className="cursor-pointer hover-elevate px-4 py-2"
          onClick={() => setCurrentSection(1)}
          data-testid="badge-privacy-section-1"
        >
          هوية الجهة
        </Badge>
        <Badge 
          variant={currentSection === 2 ? "default" : "outline"}
          className="cursor-pointer hover-elevate px-4 py-2"
          onClick={() => setCurrentSection(2)}
          data-testid="badge-privacy-section-2"
        >
          جمع البيانات
        </Badge>
        <Badge 
          variant={currentSection === 3 ? "default" : "outline"}
          className="cursor-pointer hover-elevate px-4 py-2"
          onClick={() => setCurrentSection(3)}
          data-testid="badge-privacy-section-3"
        >
          المعالجة والأمان
        </Badge>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {currentSection === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>هوية الجهة والمسؤولية</CardTitle>
                <CardDescription>
                  المعلومات الأساسية عن جهتك ومسؤولية معالجة البيانات
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>اسم الجهة *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="الاسم الرسمي للجهة" data-testid="input-privacy-company" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="businessType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>نوع النشاط *</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="وصف مختصر للنشاط" data-testid="input-privacy-business" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="entityType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>صفة الجهة *</FormLabel>
                      <FormControl>
                        <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col space-y-2">
                          <div className="flex items-center space-x-2 space-x-reverse">
                            <RadioGroupItem value="government" id="gov" />
                            <Label htmlFor="gov">جهة حكومية</Label>
                          </div>
                          <div className="flex items-center space-x-2 space-x-reverse">
                            <RadioGroupItem value="private" id="priv" />
                            <Label htmlFor="priv">شركة/مؤسسة خاصة</Label>
                          </div>
                          <div className="flex items-center space-x-2 space-x-reverse">
                            <RadioGroupItem value="individual" id="ind" />
                            <Label htmlFor="ind">فرد</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contactEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>البريد الإلكتروني *</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" dir="ltr" placeholder="email@example.com" data-testid="input-privacy-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contactPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>رقم الهاتف</FormLabel>
                      <FormControl>
                        <Input {...field} dir="ltr" placeholder="+966 XX XXX XXXX" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="processesSensitiveData"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>هل تعالج بيانات حساسة؟</FormLabel>
                      <FormDescription>
                        مثل البيانات الصحية أو البيومترية أو الجنائية
                      </FormDescription>
                      <FormControl>
                        <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4">
                          <div className="flex items-center space-x-2 space-x-reverse">
                            <RadioGroupItem value="yes" id="sens-yes" />
                            <Label htmlFor="sens-yes">نعم</Label>
                          </div>
                          <div className="flex items-center space-x-2 space-x-reverse">
                            <RadioGroupItem value="no" id="sens-no" />
                            <Label htmlFor="sens-no">لا</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {watchProcessesSensitiveData === "yes" && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      يتطلب تعيين مسؤول حماية البيانات (DPO)
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex justify-end">
                  <Button type="button" onClick={() => setCurrentSection(2)} data-testid="button-privacy-next-1">
                    التالي
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {currentSection === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>جمع البيانات</CardTitle>
                <CardDescription>
                  أنواع البيانات المجمعة وأغراض الاستخدام
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label>فئات البيانات *</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => appendData({ name: "", required: false, purpose: "", legalBasis: "consent" })}
                      data-testid="button-add-data-category"
                    >
                      <Plus className="h-4 w-4 ml-1" />
                      إضافة فئة
                    </Button>
                  </div>

                  {dataFields.map((field, index) => (
                    <Card key={field.id} className="p-4">
                      <div className="grid gap-4">
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">فئة {index + 1}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeData(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <FormField
                          control={form.control}
                          name={`dataCategories.${index}.name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>نوع البيان</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="مثال: الاسم الكامل" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`dataCategories.${index}.purpose`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>الغرض</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="مثال: التواصل مع العميل" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`dataCategories.${index}.legalBasis`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>الأساس القانوني</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="اختر الأساس القانوني" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="consent">الموافقة</SelectItem>
                                  <SelectItem value="contract">تنفيذ عقد</SelectItem>
                                  <SelectItem value="legal_obligation">التزام قانوني</SelectItem>
                                  <SelectItem value="legitimate_interest">مصلحة مشروعة</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </Card>
                  ))}

                  {dataFields.length === 0 && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        يجب إضافة فئة بيانات واحدة على الأقل
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                <FormField
                  control={form.control}
                  name="collectionMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>طريقة جمع البيانات</FormLabel>
                      <FormControl>
                        <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-wrap gap-4">
                          <div className="flex items-center space-x-2 space-x-reverse">
                            <RadioGroupItem value="direct" id="direct" />
                            <Label htmlFor="direct">مباشرة من صاحب البيانات</Label>
                          </div>
                          <div className="flex items-center space-x-2 space-x-reverse">
                            <RadioGroupItem value="indirect" id="indirect" />
                            <Label htmlFor="indirect">غير مباشرة</Label>
                          </div>
                          <div className="flex items-center space-x-2 space-x-reverse">
                            <RadioGroupItem value="both" id="both" />
                            <Label htmlFor="both">كلاهما</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-between">
                  <Button type="button" variant="outline" onClick={() => setCurrentSection(1)}>
                    السابق
                  </Button>
                  <Button type="button" onClick={() => setCurrentSection(3)} data-testid="button-privacy-next-2">
                    التالي
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {currentSection === 3 && (
            <Card>
              <CardHeader>
                <CardTitle>المعالجة والأمان</CardTitle>
                <CardDescription>
                  معلومات عن معالجة البيانات وإجراءات الحماية
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="sharesWithThirdParties"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>هل تشارك البيانات مع أطراف ثالثة؟</FormLabel>
                      <FormControl>
                        <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4">
                          <div className="flex items-center space-x-2 space-x-reverse">
                            <RadioGroupItem value="yes" id="share-yes" />
                            <Label htmlFor="share-yes">نعم</Label>
                          </div>
                          <div className="flex items-center space-x-2 space-x-reverse">
                            <RadioGroupItem value="no" id="share-no" />
                            <Label htmlFor="share-no">لا</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="transfersDataAbroad"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>هل تنقل البيانات خارج المملكة؟</FormLabel>
                      <FormControl>
                        <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4">
                          <div className="flex items-center space-x-2 space-x-reverse">
                            <RadioGroupItem value="yes" id="abroad-yes" />
                            <Label htmlFor="abroad-yes">نعم</Label>
                          </div>
                          <div className="flex items-center space-x-2 space-x-reverse">
                            <RadioGroupItem value="no" id="abroad-no" />
                            <Label htmlFor="abroad-no">لا</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="retentionPeriod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>فترة الاحتفاظ بالبيانات</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="مثال: 5 سنوات" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="usesCookies"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>هل تستخدم الكوكيز؟</FormLabel>
                      <FormControl>
                        <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4">
                          <div className="flex items-center space-x-2 space-x-reverse">
                            <RadioGroupItem value="yes" id="cookie-yes" />
                            <Label htmlFor="cookie-yes">نعم</Label>
                          </div>
                          <div className="flex items-center space-x-2 space-x-reverse">
                            <RadioGroupItem value="no" id="cookie-no" />
                            <Label htmlFor="cookie-no">لا</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-between">
                  <Button type="button" variant="outline" onClick={() => setCurrentSection(2)}>
                    السابق
                  </Button>
                  <Button type="submit" disabled={generateMutation.isPending} data-testid="button-generate-privacy">
                    {generateMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                        جاري التوليد...
                      </>
                    ) : (
                      <>
                        <FileText className="h-4 w-4 ml-2" />
                        توليد السياسة
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </form>
      </Form>

      {policies && policies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>السياسات السابقة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {policies.map((policy) => (
                <div key={policy.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{policy.companyName}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(policy.createdAt!).toLocaleDateString('ar-SA')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {policy.status === "completed" && (
                      <>
                        <Badge variant="default" className="bg-green-600">
                          <CheckCircle2 className="h-3 w-3 ml-1" />
                          مكتمل
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownload(policy)}
                          data-testid={`button-download-${policy.id}`}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    {policy.status === "generating" && (
                      <Badge variant="secondary">
                        <Loader2 className="h-3 w-3 ml-1 animate-spin" />
                        جاري التوليد
                      </Badge>
                    )}
                    {policy.status === "pending" && (
                      <Badge variant="outline">قيد الانتظار</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
