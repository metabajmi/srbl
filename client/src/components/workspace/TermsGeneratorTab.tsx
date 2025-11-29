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
import { apiRequest } from "@/lib/queryClient";
import { FileText, Loader2, Download, AlertCircle, CheckCircle2, ArrowRight, ArrowLeft } from "lucide-react";
import { insertTermsDocumentSchema, type TermsDocument } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { z } from "zod";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

const formSchema = insertTermsDocumentSchema;
type FormValues = z.infer<typeof formSchema>;

export default function TermsGeneratorTab() {
  const { toast } = useToast();
  const [currentSection, setCurrentSection] = useState(1);
  const [generatedDocId, setGeneratedDocId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyName: "",
      websiteUrl: "",
      businessType: "ecommerce_general",
      serviceDescription: "",
      hasUserAccounts: "false",
      hasSubscriptions: "false",
      paymentMethods: [],
      governingLaw: "أنظمة المملكة العربية السعودية",
      contactEmail: "",
      contactPhone: "",
      commercialRegistration: "",
    },
  });

  const { data: generatedDoc } = useQuery({
    queryKey: ['/api/terms', generatedDocId],
    enabled: !!generatedDocId,
    queryFn: async () => {
      if (!generatedDocId) return null;
      const response = await fetch(`/api/terms/${generatedDocId}`, { credentials: 'include' });
      if (!response.ok) throw new Error(`Failed to fetch document`);
      return await response.json() as TermsDocument;
    },
    refetchInterval: (query) => {
      const doc = query.state.data;
      if (doc?.status === 'completed' || doc?.status === 'failed') return false;
      return 2000;
    },
  });

  useEffect(() => {
    if (generatedDoc?.status === 'completed') {
      setIsGenerating(false);
      toast({ title: "تم إنشاء الوثيقة بنجاح", description: "تم توليد الشروط والأحكام" });
    } else if (generatedDoc?.status === 'failed') {
      setIsGenerating(false);
      toast({ variant: "destructive", title: "فشل في التوليد", description: "حدث خطأ أثناء توليد الوثيقة" });
    }
  }, [generatedDoc?.status, toast]);

  const createTermsMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const response = await apiRequest("POST", "/api/terms", data);
      return await response.json() as TermsDocument;
    },
    onSuccess: (data) => {
      if (!data?.id) {
        toast({ variant: "destructive", title: "خطأ", description: "لم يتم إرجاع معرف الوثيقة" });
        return;
      }
      setGeneratedDocId(data.id);
      setIsGenerating(true);
      toast({ title: "جاري التوليد...", description: "يتم توليد الشروط والأحكام" });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "خطأ", description: error.message });
    },
  });

  const onSubmit = (data: FormValues) => createTermsMutation.mutate(data);

  const cleanGeneratedContent = (content: string): string => {
    return content.replace(/^```html\n?/, '').replace(/\n?```$/, '').trim();
  };

  const downloadDocument = () => {
    if (!generatedDoc?.generatedContent) return;
    const cleanContent = cleanGeneratedContent(generatedDoc.generatedContent);
    const blob = new Blob([cleanContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `terms-${generatedDoc.companyName}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ title: "تم التنزيل", description: "تم تنزيل الوثيقة بنجاح" });
  };

  const businessTypeOptions = [
    { value: "ecommerce_general", label: "تجارة إلكترونية - عام" },
    { value: "ecommerce_automotive", label: "تجارة إلكترونية - سيارات" },
    { value: "ecommerce_jewelry", label: "تجارة إلكترونية - مجوهرات" },
    { value: "ecommerce_food", label: "تجارة إلكترونية - أغذية" },
    { value: "ecommerce_electronics", label: "تجارة إلكترونية - إلكترونيات" },
    { value: "telecommunications", label: "اتصالات" },
    { value: "digital_services", label: "خدمات رقمية" },
    { value: "multi_category", label: "متعدد الفئات" },
  ];

  const paymentMethodOptions = [
    { value: "mada", label: "مدى" },
    { value: "visa", label: "فيزا" },
    { value: "mastercard", label: "ماستركارد" },
    { value: "apple_pay", label: "Apple Pay" },
    { value: "stc_pay", label: "STC Pay" },
    { value: "cash_on_delivery", label: "الدفع عند الاستلام" },
    { value: "bank_transfer", label: "تحويل بنكي" },
  ];

  if (generatedDoc?.status === 'completed' && generatedDoc.generatedContent) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">الشروط والأحكام</h2>
            <p className="text-muted-foreground">تم التوليد بنجاح</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={downloadDocument} data-testid="button-download-terms">
              <Download className="ml-2 h-4 w-4" />
              تنزيل
            </Button>
            <Button variant="outline" onClick={() => { setGeneratedDocId(null); setIsGenerating(false); form.reset(); }}>
              إنشاء وثيقة جديدة
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{generatedDoc.companyName}</CardTitle>
                <CardDescription>
                  نوع النشاط: {businessTypeOptions.find(o => o.value === generatedDoc.businessType)?.label}
                </CardDescription>
              </div>
              <Badge variant="default" className="bg-green-600">
                <CheckCircle2 className="ml-1 h-3 w-3" />
                مكتمل
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div
              className="prose prose-sm max-w-none dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: cleanGeneratedContent(generatedDoc.generatedContent) }}
              data-testid="text-generated-terms"
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isGenerating) {
    return (
      <Card className="max-w-md mx-auto">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="relative">
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
              <FileText className="h-8 w-8 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-semibold">جاري توليد الشروط والأحكام</h3>
              <p className="text-muted-foreground mt-2">
                يتم تحليل بيانات نشاطك وتوليد شروط متوافقة مع الأنظمة السعودية...
              </p>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div className="bg-primary h-2 rounded-full animate-pulse" style={{ width: '60%' }} />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          سيتم توليد الشروط والأحكام وفقاً لقوانين المملكة العربية السعودية
        </AlertDescription>
      </Alert>

      <div className="flex items-center justify-between">
        {[1, 2, 3, 4].map((step) => (
          <div key={step} className="flex items-center flex-1">
            <div className={cn(
              "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors",
              currentSection >= step ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30"
            )}>
              {step}
            </div>
            {step < 4 && <div className={cn("flex-1 h-0.5 mx-2", currentSection > step ? "bg-primary" : "bg-muted-foreground/30")} />}
          </div>
        ))}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {currentSection === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>المعلومات الأساسية</CardTitle>
                <CardDescription>أدخل المعلومات الأساسية عن نشاطك التجاري</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>اسم الشركة *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="شركة التقنية المتقدمة" data-testid="input-terms-company" />
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
                        <Input {...field} type="url" placeholder="https://example.sa" data-testid="input-terms-website" />
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-terms-business">
                            <SelectValue placeholder="اختر نوع النشاط" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {businessTypeOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end">
                  <Button type="button" onClick={() => setCurrentSection(2)} data-testid="button-terms-next-1">
                    التالي <ArrowLeft className="h-4 w-4 mr-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {currentSection === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>تفاصيل الخدمة</CardTitle>
                <CardDescription>وصف الخدمات والمنتجات</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="serviceDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>وصف الخدمة</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="وصف تفصيلي للخدمات..." rows={4} data-testid="input-terms-service" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hasUserAccounts"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>هل يتطلب الموقع إنشاء حساب؟</FormLabel>
                      <FormControl>
                        <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4">
                          <div className="flex items-center space-x-2 space-x-reverse">
                            <RadioGroupItem value="true" id="acc-yes" />
                            <Label htmlFor="acc-yes">نعم</Label>
                          </div>
                          <div className="flex items-center space-x-2 space-x-reverse">
                            <RadioGroupItem value="false" id="acc-no" />
                            <Label htmlFor="acc-no">لا</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hasSubscriptions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>هل تقدم خدمات اشتراك؟</FormLabel>
                      <FormControl>
                        <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4">
                          <div className="flex items-center space-x-2 space-x-reverse">
                            <RadioGroupItem value="true" id="sub-yes" />
                            <Label htmlFor="sub-yes">نعم</Label>
                          </div>
                          <div className="flex items-center space-x-2 space-x-reverse">
                            <RadioGroupItem value="false" id="sub-no" />
                            <Label htmlFor="sub-no">لا</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-between">
                  <Button type="button" variant="outline" onClick={() => setCurrentSection(1)}>
                    <ArrowRight className="h-4 w-4 ml-2" /> السابق
                  </Button>
                  <Button type="button" onClick={() => setCurrentSection(3)} data-testid="button-terms-next-2">
                    التالي <ArrowLeft className="h-4 w-4 mr-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {currentSection === 3 && (
            <Card>
              <CardHeader>
                <CardTitle>المعلومات القانونية</CardTitle>
                <CardDescription>طرق الدفع والقانون المطبق</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="paymentMethods"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>طرق الدفع المتاحة</FormLabel>
                      <div className="grid grid-cols-2 gap-2">
                        {paymentMethodOptions.map((option) => {
                          const currentValue = Array.isArray(field.value) ? field.value : [];
                          return (
                            <div key={option.value} className="flex items-center space-x-2 space-x-reverse">
                              <Checkbox
                                id={option.value}
                                checked={currentValue.includes(option.value)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    field.onChange([...currentValue, option.value]);
                                  } else {
                                    field.onChange(currentValue.filter((v: string) => v !== option.value));
                                  }
                                }}
                              />
                              <Label htmlFor={option.value}>{option.label}</Label>
                            </div>
                          );
                        })}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="governingLaw"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>القانون المطبق</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="أنظمة المملكة العربية السعودية" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-between">
                  <Button type="button" variant="outline" onClick={() => setCurrentSection(2)}>
                    <ArrowRight className="h-4 w-4 ml-2" /> السابق
                  </Button>
                  <Button type="button" onClick={() => setCurrentSection(4)} data-testid="button-terms-next-3">
                    التالي <ArrowLeft className="h-4 w-4 mr-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {currentSection === 4 && (
            <Card>
              <CardHeader>
                <CardTitle>معلومات التواصل</CardTitle>
                <CardDescription>بيانات التواصل والسجل التجاري</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="contactEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>البريد الإلكتروني *</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" dir="ltr" placeholder="contact@example.sa" data-testid="input-terms-email" />
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
                        <Input {...field} value={field.value ?? ""} dir="ltr" placeholder="+966 XX XXX XXXX" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="commercialRegistration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>رقم السجل التجاري</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ""} dir="ltr" placeholder="1234567890" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-between">
                  <Button type="button" variant="outline" onClick={() => setCurrentSection(3)}>
                    <ArrowRight className="h-4 w-4 ml-2" /> السابق
                  </Button>
                  <Button type="submit" disabled={createTermsMutation.isPending} data-testid="button-generate-terms">
                    {createTermsMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                        جاري التوليد...
                      </>
                    ) : (
                      <>
                        <FileText className="h-4 w-4 ml-2" />
                        توليد الشروط والأحكام
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </form>
      </Form>
    </div>
  );
}
