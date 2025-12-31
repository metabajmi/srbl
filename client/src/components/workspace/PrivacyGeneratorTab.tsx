import { useState, useEffect } from "react";
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
import { FileText, Loader2, Download, Plus, Trash2, AlertCircle, CheckCircle2, Info, Globe, FileType, File } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { insertPolicyDocumentSchema, type PolicyDocument } from "@shared/schema";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { z } from "zod";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { useScanContext } from "@/contexts/ScanContext";

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
  const { scanData, hasScanData } = useScanContext();
  const [lastPreFilledScanId, setLastPreFilledScanId] = useState<string | null>(null);

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

  // Pre-fill form with scan data (react to new scans)
  useEffect(() => {
    if (hasScanData && scanData && scanData.scanId !== lastPreFilledScanId) {
      // Pre-fill empty fields only - don't overwrite user edits
      const currentCompanyName = form.getValues("companyName");
      const currentBusinessType = form.getValues("businessType");
      
      if (!currentCompanyName && scanData.companyName) {
        form.setValue("companyName", scanData.companyName);
      }
      
      if (!currentBusinessType && scanData.businessType) {
        form.setValue("businessType", scanData.businessType);
      }
      
      if (scanData.hasCookieBanner && !form.getValues("usesCookies")) {
        form.setValue("usesCookies", "yes");
      }
      
      setLastPreFilledScanId(scanData.scanId);
      
      toast({
        title: "بيانات الفحص متاحة",
        description: `تم تحميل بيانات من فحص ${scanData.websiteUrl} - أكمل البيانات المتبقية`,
      });
    }
  }, [hasScanData, scanData, lastPreFilledScanId, form, toast]);

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

  const generateHtmlContent = (policy: PolicyDocument) => {
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
    
    return `<!DOCTYPE html>
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
        @media print { body { padding: 20px; } .header { background: #2563eb !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
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
  };

  const handleDownload = (policy: PolicyDocument, format: 'html' | 'pdf' | 'word') => {
    if (!policy.generatedContent) return;
    
    const htmlContent = generateHtmlContent(policy);
    const fileName = `سياسة-الخصوصية-${policy.companyName}`;
    
    if (format === 'html') {
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileName}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else if (format === 'pdf') {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        setTimeout(() => {
          printWindow.print();
        }, 500);
      }
      toast({
        title: "تصدير PDF",
        description: "استخدم خيار 'حفظ كـ PDF' في نافذة الطباعة",
      });
    } else if (format === 'word') {
      const wordContent = `
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->
<style>
@font-face { font-family: 'Cairo'; src: url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap'); }
body { font-family: 'Cairo', 'Arial', sans-serif; direction: rtl; text-align: right; line-height: 1.8; }
h1 { color: #2563eb; text-align: center; }
h2 { color: #1e40af; border-right: 5px solid #3b82f6; padding-right: 15px; }
</style>
</head>
<body dir="rtl">
<h1>سياسة الخصوصية</h1>
<p style="text-align: center; font-weight: bold;">${policy.companyName}</p>
<p style="text-align: center; color: #6b7280;">تاريخ الإصدار: ${new Date(policy.createdAt!).toLocaleDateString('ar-SA')}</p>
<hr/>
${policy.generatedContent}
<hr/>
<p style="text-align: center; color: #6b7280; font-size: 12px;">تم توليده بواسطة أداة الامتثال لنظام حماية البيانات الشخصية السعودي</p>
</body>
</html>`;
      const blob = new Blob(['\ufeff', wordContent], { type: 'application/msword;charset=UTF-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileName}.doc`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({
        title: "تم التحميل",
        description: "تم تحميل الملف بصيغة Word",
      });
    }
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
                        <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-col space-y-2">
                          <div className="flex items-center space-x-2 space-x-reverse">
                            <RadioGroupItem value="government" id="gov" data-testid="radio-entity-government" />
                            <Label htmlFor="gov">جهة حكومية</Label>
                          </div>
                          <div className="flex items-center space-x-2 space-x-reverse">
                            <RadioGroupItem value="private" id="priv" data-testid="radio-entity-private" />
                            <Label htmlFor="priv">شركة/مؤسسة خاصة</Label>
                          </div>
                          <div className="flex items-center space-x-2 space-x-reverse">
                            <RadioGroupItem value="individual" id="ind" data-testid="radio-entity-individual" />
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
                        <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4">
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
                        <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-wrap gap-4">
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
                        <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4">
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
                        <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4">
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
                        <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4">
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
        <Card className="border-primary/20 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">السياسات المُنشأة</CardTitle>
                <CardDescription>
                  {policies.length} سياسة خصوصية
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {policies.map((policy) => (
                <Card 
                  key={policy.id} 
                  className={`p-4 transition-all ${
                    policy.status === "completed" 
                      ? "bg-gradient-to-l from-green-50/50 to-transparent dark:from-green-950/20 border-green-200/50 dark:border-green-800/30" 
                      : "bg-muted/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className={`p-2 rounded-lg flex-shrink-0 ${
                        policy.status === "completed" 
                          ? "bg-green-100 dark:bg-green-900/30" 
                          : "bg-muted"
                      }`}>
                        <FileText className={`h-5 w-5 ${
                          policy.status === "completed" 
                            ? "text-green-600 dark:text-green-400" 
                            : "text-muted-foreground"
                        }`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold truncate">{policy.companyName}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(policy.createdAt!).toLocaleDateString('ar-SA', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                        {policy.status === "completed" && (
                          <Badge variant="outline" className="mt-2 border-green-300 text-green-700 dark:border-green-700 dark:text-green-400">
                            <CheckCircle2 className="h-3 w-3 ml-1" />
                            جاهزة للتحميل
                          </Badge>
                        )}
                        {policy.status === "generating" && (
                          <Badge variant="secondary" className="mt-2">
                            <Loader2 className="h-3 w-3 ml-1 animate-spin" />
                            جاري التوليد...
                          </Badge>
                        )}
                        {policy.status === "pending" && (
                          <Badge variant="outline" className="mt-2">
                            قيد الانتظار
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {policy.status === "completed" && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="default" 
                            size="sm"
                            className="flex-shrink-0"
                            data-testid={`button-download-${policy.id}`}
                          >
                            <Download className="h-4 w-4 ml-2" />
                            تحميل
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem 
                            onClick={() => handleDownload(policy, 'pdf')}
                            className="cursor-pointer gap-2"
                            data-testid={`button-download-pdf-${policy.id}`}
                          >
                            <FileType className="h-4 w-4 text-red-500" />
                            <span>تحميل PDF</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDownload(policy, 'word')}
                            className="cursor-pointer gap-2"
                            data-testid={`button-download-word-${policy.id}`}
                          >
                            <File className="h-4 w-4 text-blue-500" />
                            <span>تحميل Word</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDownload(policy, 'html')}
                            className="cursor-pointer gap-2"
                            data-testid={`button-download-html-${policy.id}`}
                          >
                            <Globe className="h-4 w-4 text-orange-500" />
                            <span>تحميل HTML</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
