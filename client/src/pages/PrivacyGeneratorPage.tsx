import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { FileText, Loader2, Download, Calendar } from "lucide-react";
import { insertPolicyDocumentSchema, type PolicyDocument } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { z } from "zod";

const formSchema = z.object({
  companyName: z.string().min(2, "يجب إدخال اسم الجهة"),
  websiteUrl: z.string().url("يجب إدخال رابط صحيح"),
  businessType: z.string().min(2, "يجب إدخال نوع النشاط"),
  responsibleDepartment: z.string().optional(),
  address: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email("يجب إدخال بريد إلكتروني صحيح"),
  licenseNumber: z.string().optional(),
  dataTypes: z.string().min(1, "يجب إدخال أنواع البيانات المجمعة").refine(
    (val) => val.split(',').map(s => s.trim()).filter(Boolean).length > 0,
    { message: "يجب إدخال نوع واحد على الأقل من البيانات" }
  ),
  dataUsagePurposes: z.string().min(1, "يجب إدخال أغراض استخدام البيانات").refine(
    (val) => val.split(',').map(s => s.trim()).filter(Boolean).length > 0,
    { message: "يجب إدخال غرض واحد على الأقل" }
  ),
  hasThirdPartySharing: z.string().min(1, "يجب تحديد ما إذا كانت هناك مشاركة مع جهات خارجية"),
  retentionPeriod: z.string().min(1, "يجب تحديد مدة الاحتفاظ بالبيانات"),
  
  // حقول إضافية من الصور
  dataCollectionMethods: z.string().optional(),
  indirectDataSources: z.string().optional(),
  dataUsageDetails: z.string().optional(),
  disclosureDetails: z.string().optional(),
  thirdPartyCategories: z.string().optional(),
  storageLocation: z.string().optional(),
  securityMeasures: z.string().optional(),
  
  // مسؤول حماية البيانات
  dpoName: z.string().optional(),
  dpoAddress: z.string().optional(),
  dpoPhone: z.string().optional(),
  dpoEmail: z.string().email("يجب إدخال بريد إلكتروني صحيح").optional().or(z.literal("")),
  
  lastUpdatedDate: z.date().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function PrivacyGeneratorPage() {
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyName: "",
      websiteUrl: "",
      businessType: "",
      responsibleDepartment: "",
      address: "",
      contactPhone: "",
      contactEmail: "",
      licenseNumber: "",
      dataTypes: "",
      dataUsagePurposes: "",
      hasThirdPartySharing: "no",
      retentionPeriod: "",
      dataCollectionMethods: "",
      indirectDataSources: "",
      dataUsageDetails: "",
      disclosureDetails: "",
      thirdPartyCategories: "",
      storageLocation: "",
      securityMeasures: "",
      dpoName: "",
      dpoAddress: "",
      dpoPhone: "",
      dpoEmail: "",
      lastUpdatedDate: new Date(),
    },
  });

  const { data: policies } = useQuery({
    queryKey: ["/api/policies"],
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
      form.reset({
        companyName: "",
        websiteUrl: "",
        businessType: "",
        responsibleDepartment: "",
        address: "",
        contactPhone: "",
        contactEmail: "",
        licenseNumber: "",
        dataTypes: "",
        dataUsagePurposes: "",
        hasThirdPartySharing: "no",
        retentionPeriod: "",
        dataCollectionMethods: "",
        indirectDataSources: "",
        dataUsageDetails: "",
        disclosureDetails: "",
        thirdPartyCategories: "",
        storageLocation: "",
        securityMeasures: "",
        dpoName: "",
        dpoAddress: "",
        dpoPhone: "",
        dpoEmail: "",
        lastUpdatedDate: new Date(),
      });
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
      websiteUrl: values.websiteUrl,
      businessType: values.businessType,
      contactEmail: values.contactEmail,
      dataTypes: values.dataTypes.split(',').map(s => s.trim()).filter(Boolean),
      dataUsagePurposes: values.dataUsagePurposes.split(',').map(s => s.trim()).filter(Boolean),
      hasThirdPartySharing: values.hasThirdPartySharing,
      retentionPeriod: values.retentionPeriod,
      responsibleDepartment: values.responsibleDepartment || null,
      address: values.address || null,
      contactPhone: values.contactPhone || null,
      licenseNumber: values.licenseNumber || null,
      dataCollectionMethods: values.dataCollectionMethods || null,
      indirectDataSources: values.indirectDataSources || null,
      dataUsageDetails: values.dataUsageDetails || null,
      disclosureDetails: values.disclosureDetails || null,
      thirdPartyCategories: values.thirdPartyCategories || null,
      storageLocation: values.storageLocation || null,
      securityMeasures: values.securityMeasures || null,
      dpoName: values.dpoName || null,
      dpoAddress: values.dpoAddress || null,
      dpoPhone: values.dpoPhone || null,
      dpoEmail: values.dpoEmail || null,
      lastUpdatedDate: values.lastUpdatedDate ? new Date(values.lastUpdatedDate) : null,
    };
    generateMutation.mutate(submitData);
  };

  const handleDownload = (policy: PolicyDocument) => {
    if (!policy.generatedContent) return;
    
    const blob = new Blob([policy.generatedContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `privacy-policy-${policy.companyName}-${new Date(policy.createdAt!).toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container py-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">مُولّد سياسة الخصوصية</h1>
          <p className="text-muted-foreground">
            أنشئ سياسة خصوصية متوافقة مع نظام حماية البيانات الشخصية السعودي
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>نموذج تفصيلي لسياسة الخصوصية</CardTitle>
                <CardDescription>
                  أدخل معلومات شركتك لتوليد سياسة خصوصية مخصصة
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-primary">معلومات الجهة الأساسية</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="companyName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>اسم الجهة *</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="مثال: شركة التقنية المتقدمة"
                              data-testid="input-company-name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="websiteUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>رابط الموقع *</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="url"
                              placeholder="https://example.com"
                              dir="ltr"
                              data-testid="input-website-url"
                            />
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
                            <Input
                              {...field}
                              placeholder="مثال: تجارة إلكترونية، خدمات مالية"
                              data-testid="input-business-type"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="licenseNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>الترخيص أو السجل التجاري</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="رقم السجل التجاري"
                              data-testid="input-license-number"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4 text-primary">بيانات التواصل</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="responsibleDepartment"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>القسم/ الفريق المختص</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="مثال: قسم حماية البيانات"
                              data-testid="input-department"
                            />
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
                            <Input
                              {...field}
                              type="email"
                              placeholder="privacy@example.com"
                              dir="ltr"
                              data-testid="input-contact-email"
                            />
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
                            <Input
                              {...field}
                              placeholder="+966xxxxxxxxx"
                              dir="ltr"
                              data-testid="input-contact-phone"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>العنوان</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="الرياض، المملكة العربية السعودية"
                              data-testid="input-address"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4 text-primary">البيانات الشخصية التي يتم جمعها</h3>
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="dataTypes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>أنواع البيانات المجمعة (افصل بفاصلة) *</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="مثال: الاسم، البريد الإلكتروني، رقم الهاتف، العنوان، البيانات الرئيسية، بيانات التواصل"
                              className="min-h-20"
                              data-testid="input-data-types"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="dataUsagePurposes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>أغراض استخدام البيانات (افصل بفاصلة) *</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="مثال: معالجة الطلبات، التسويق، التحليلات، تحسين الخدمات"
                              className="min-h-20"
                              data-testid="input-data-usage"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="hasThirdPartySharing"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>مشاركة البيانات مع جهات خارجية *</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger data-testid="select-third-party">
                                  <SelectValue placeholder="اختر..." />
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

                      <FormField
                        control={form.control}
                        name="retentionPeriod"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>مدة الاحتفاظ بالبيانات *</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="مثال: سنتان من آخر نشاط"
                                data-testid="input-retention-period"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4 text-primary">كيفية الجمع والمعالجة (اختياري)</h3>
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="dataCollectionMethods"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>طرق جمع البيانات</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="مثال: بشكل مباشر عند التسجيل، بطريقة غير مباشرة من خلال شركاء"
                              className="min-h-20"
                              data-testid="input-collection-methods"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="indirectDataSources"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>مصادر البيانات غير المباشرة</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="مثال: شركات التسويق، وسائل التواصل الاجتماعي، شركاء العمل"
                              className="min-h-20"
                              data-testid="input-indirect-sources"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="thirdPartyCategories"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>فئات الجهات الخارجية (إذا كانت الإجابة نعم)</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="مثال: مزودي الخدمات التقنية، شركات التسويق، الجهات الحكومية"
                              className="min-h-20"
                              data-testid="input-third-party-categories"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4 text-primary">التخزين والحماية (اختياري)</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="storageLocation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>موقع التخزين</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="مثال: خوادم آمنة في المملكة العربية السعودية"
                              data-testid="input-storage-location"
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
                          <FormLabel>إجراءات الحماية</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="مثال: تشفير SSL، جدران حماية، مراقبة دائمة"
                              data-testid="input-security-measures"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4 text-primary">مسؤول حماية البيانات (اختياري)</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="dpoName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>الاسم</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="اسم مسؤول حماية البيانات"
                              data-testid="input-dpo-name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="dpoEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>البريد الإلكتروني</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="email"
                              placeholder="dpo@example.com"
                              dir="ltr"
                              data-testid="input-dpo-email"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="dpoPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>رقم الهاتف</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="+966xxxxxxxxx"
                              dir="ltr"
                              data-testid="input-dpo-phone"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="dpoAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>العنوان</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="عنوان مسؤول حماية البيانات"
                              data-testid="input-dpo-address"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4 text-primary">تاريخ آخر تحديث</h3>
                  <FormField
                    control={form.control}
                    name="lastUpdatedDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>تاريخ آخر تحديث للسياسة</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-right font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                                data-testid="button-date-picker"
                              >
                                <Calendar className="mr-2 h-4 w-4" />
                                {field.value ? (
                                  format(field.value, "PPP", { locale: ar })
                                ) : (
                                  <span>اختر التاريخ</span>
                                )}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) =>
                                date > new Date() || date < new Date("1900-01-01")
                              }
                              initialFocus
                              locale={ar}
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={generateMutation.isPending}
                  className="w-full"
                  data-testid="button-generate"
                >
                  {generateMutation.isPending ? (
                    <>
                      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                      جاري التوليد...
                    </>
                  ) : (
                    <>
                      <FileText className="ml-2 h-5 w-5" />
                      توليد سياسة الخصوصية
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </form>
        </Form>

        <div className="space-y-4">
          <h2 className="text-2xl font-bold">سياسات الخصوصية المولّدة</h2>
          {policies && Array.isArray(policies) && policies.length > 0 ? (
            policies.map((policy: PolicyDocument) => (
              <Card key={policy.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle>{policy.companyName}</CardTitle>
                      <CardDescription className="mt-1 space-y-1">
                        <div>{policy.websiteUrl}</div>
                        <div className="flex items-center gap-2 text-xs">
                          <Calendar className="h-3 w-3" />
                          <span>
                            تم الإنشاء: {new Date(policy.createdAt!).toLocaleDateString('ar-SA')}
                          </span>
                        </div>
                      </CardDescription>
                    </div>
                    <Badge variant={
                      policy.status === "completed" ? "default" :
                      policy.status === "generating" ? "secondary" :
                      policy.status === "failed" ? "destructive" :
                      "outline"
                    }>
                      {policy.status === "completed" ? "مكتمل" :
                       policy.status === "generating" ? "قيد التوليد" :
                       policy.status === "failed" ? "فشل" :
                       "قيد الانتظار"}
                    </Badge>
                  </div>
                </CardHeader>
                {policy.status === "completed" && policy.generatedContent && (
                  <CardContent>
                    <div className="prose prose-sm max-w-none bg-muted p-4 rounded-md">
                      <pre className="whitespace-pre-wrap text-sm" dir="rtl">
                        {policy.generatedContent.substring(0, 500)}...
                      </pre>
                    </div>
                    <Button 
                      className="mt-4" 
                      variant="outline" 
                      onClick={() => handleDownload(policy)}
                      data-testid="button-download"
                    >
                      <Download className="ml-2 h-4 w-4" />
                      تحميل السياسة الكاملة
                    </Button>
                  </CardContent>
                )}
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                لا توجد سياسات مولّدة بعد
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
