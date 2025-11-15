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

// Extended schema with frontend validations
const formSchema = insertTermsDocumentSchema;

type FormValues = z.infer<typeof formSchema>;

export default function TermsGeneratorPage() {
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

  // Poll for document status
  const { data: generatedDoc } = useQuery({
    queryKey: ['/api/terms', generatedDocId],
    enabled: !!generatedDocId,
    queryFn: async () => {
      if (!generatedDocId) return null;
      console.log('[TermsGenerator] Fetching document:', generatedDocId);
      const response = await fetch(`/api/terms/${generatedDocId}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch document: ${response.statusText}`);
      }
      const data = await response.json();
      console.log('[TermsGenerator] Fetched data:', {
        status: data.status,
        hasContent: !!data.generatedContent,
        id: data.id
      });
      return data as TermsDocument;
    },
    refetchInterval: (query) => {
      const doc = query.state.data;
      console.log('[TermsGenerator] Polling check:', { 
        status: doc?.status,
        hasData: !!doc,
        docId: doc?.id
      });
      if (doc?.status === 'completed' || doc?.status === 'failed') {
        console.log('[TermsGenerator] Stopping polling - status:', doc.status);
        return false;
      }
      return 2000; // Poll every 2 seconds
    },
  });

  // Stop generating when completed
  useEffect(() => {
    console.log('[TermsGenerator] useEffect triggered:', {
      status: generatedDoc?.status,
      hasContent: !!generatedDoc?.generatedContent,
      docId: generatedDoc?.id,
      isGenerating
    });
    
    if (generatedDoc?.status === 'completed') {
      console.log('[TermsGenerator] Setting isGenerating to false');
      setIsGenerating(false);
      toast({
        title: "تم إنشاء الوثيقة بنجاح",
        description: "تم توليد الشروط والأحكام وفقاً للقوانين السعودية",
      });
    } else if (generatedDoc?.status === 'failed') {
      console.log('[TermsGenerator] Generation failed');
      setIsGenerating(false);
      toast({
        variant: "destructive",
        title: "فشل في التوليد",
        description: "حدث خطأ أثناء توليد الوثيقة. يرجى المحاولة مرة أخرى.",
      });
    }
  }, [generatedDoc?.status, generatedDoc?.id, toast]);

  const createTermsMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      console.log('[TermsGenerator] Submitting form data...');
      const response = await apiRequest("POST", "/api/terms", data);
      const jsonData = await response.json();
      console.log('[TermsGenerator] Parsed JSON data:', jsonData);
      return jsonData as TermsDocument;
    },
    onSuccess: (data) => {
      console.log('[TermsGenerator] Mutation onSuccess:', { 
        id: data?.id, 
        hasId: !!data?.id,
        fullData: data
      });
      if (!data?.id) {
        console.error('[TermsGenerator] ERROR: No ID in response data!', data);
        toast({
          variant: "destructive",
          title: "خطأ",
          description: "لم يتم إرجاع معرف الوثيقة من الخادم",
        });
        return;
      }
      setGeneratedDocId(data.id);
      setIsGenerating(true);
      console.log('[TermsGenerator] Set generatedDocId to:', data.id);
      toast({
        title: "جاري التوليد...",
        description: "يتم الآن توليد الشروط والأحكام باستخدام الذكاء الاصطناعي",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "خطأ في الإنشاء",
        description: error.message || "فشل في إنشاء الوثيقة",
      });
    },
  });

  const onSubmit = (data: FormValues) => {
    createTermsMutation.mutate(data);
  };

  // Clean markdown code fences from OpenAI response
  const cleanGeneratedContent = (content: string): string => {
    // Remove markdown code fences (```html and ```)
    return content.replace(/^```html\n?/, '').replace(/\n?```$/, '').trim();
  };

  const downloadDocument = () => {
    if (!generatedDoc?.generatedContent) return;

    const cleanContent = cleanGeneratedContent(generatedDoc.generatedContent);
    const blob = new Blob([cleanContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `terms-and-conditions-${generatedDoc.companyName}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "تم التنزيل",
      description: "تم تنزيل الوثيقة بنجاح",
    });
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

  const activityScaleOptions = [
    { value: "micro", label: "منشأة صغيرة جداً" },
    { value: "smb", label: "منشأة صغيرة ومتوسطة" },
    { value: "enterprise", label: "منشأة كبيرة" },
  ];

  const nextSection = () => {
    setCurrentSection(prev => Math.min(prev + 1, 4));
  };

  const prevSection = () => {
    setCurrentSection(prev => Math.max(prev - 1, 1));
  };

  // Show generated document
  if (generatedDoc?.status === 'completed' && generatedDoc.generatedContent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-6" dir="rtl">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-l from-primary to-primary/60 bg-clip-text text-transparent">
                الشروط والأحكام
              </h1>
              <p className="text-muted-foreground mt-1">
                تم التوليد بنجاح
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={downloadDocument}
                data-testid="button-download-terms"
              >
                <Download className="ml-2 h-4 w-4" />
                تنزيل
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setGeneratedDocId(null);
                  setIsGenerating(false);
                  form.reset();
                }}
                data-testid="button-create-new"
              >
                إنشاء وثيقة جديدة
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{generatedDoc.companyName}</CardTitle>
                  <CardDescription className="mt-1">
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
                className="prose prose-sm max-w-none dark:prose-invert [&_*]:text-right [&_*]:dir-rtl"
                dangerouslySetInnerHTML={{ __html: cleanGeneratedContent(generatedDoc.generatedContent) }}
                data-testid="text-generated-content"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Show generating state
  if (isGenerating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-6 flex items-center justify-center" dir="rtl">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="relative">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
                <FileText className="h-8 w-8 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">جاري توليد الشروط والأحكام</h3>
                <p className="text-muted-foreground mt-2">
                  يتم الآن تحليل بيانات نشاطك التجاري وتوليد شروط وأحكام متوافقة مع الأنظمة السعودية...
                </p>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-primary h-2 rounded-full animate-pulse" style={{ width: '60%' }} />
              </div>
              <p className="text-sm text-muted-foreground">
                قد تستغرق هذه العملية بضع ثوانٍ
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show form
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-6" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-l from-primary to-primary/60 bg-clip-text text-transparent">
            مُوَلِّد الشروط والأحكام
          </h1>
          <p className="text-muted-foreground mt-2">
            قم بإنشاء شروط وأحكام متوافقة مع الأنظمة السعودية باستخدام الذكاء الاصطناعي
          </p>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            سيتم توليد الشروط والأحكام بناءً على بيانات نشاطك التجاري وفقاً لقوانين المملكة العربية السعودية والمصادر القانونية المعتمدة
          </AlertDescription>
        </Alert>

        {/* Progress Indicator */}
        <div className="flex items-center justify-between">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className="flex items-center flex-1">
              <div className={cn(
                "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors",
                currentSection >= step
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-muted-foreground/30 text-muted-foreground"
              )}>
                {step}
              </div>
              {step < 4 && (
                <div className={cn(
                  "flex-1 h-0.5 mx-2 transition-colors",
                  currentSection > step ? "bg-primary" : "bg-muted-foreground/30"
                )} />
              )}
            </div>
          ))}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Section 1: Basic Information */}
            {currentSection === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle>المعلومات الأساسية</CardTitle>
                  <CardDescription>
                    أدخل المعلومات الأساسية عن نشاطك التجاري
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="companyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>اسم الشركة / المنشأة *</FormLabel>
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
                        <FormLabel>رابط الموقع الإلكتروني *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="https://example.sa"
                            type="url"
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
                        <FormLabel>نوع النشاط التجاري *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-business-type">
                              <SelectValue placeholder="اختر نوع النشاط" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {businessTypeOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="activityScale"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>حجم النشاط</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || undefined}>
                          <FormControl>
                            <SelectTrigger data-testid="select-activity-scale">
                              <SelectValue placeholder="اختر حجم النشاط" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {activityScaleOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="serviceDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>وصف الخدمة / المنتج *</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="صف الخدمات أو المنتجات التي تقدمها منشأتك..."
                            rows={4}
                            data-testid="input-service-description"
                          />
                        </FormControl>
                        <FormDescription>
                          أدخل وصفاً تفصيلياً للخدمات أو المنتجات
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            )}

            {/* Section 2: Service Details */}
            {currentSection === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle>تفاصيل الخدمة</CardTitle>
                  <CardDescription>
                    حدد تفاصيل الخدمات والميزات المقدمة
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="hasUserAccounts"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>هل يوجد حسابات مستخدمين؟ *</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="flex gap-4"
                            data-testid="radio-has-user-accounts"
                          >
                            <div className="flex items-center space-x-2 space-x-reverse">
                              <RadioGroupItem value="true" id="accounts-yes" />
                              <Label htmlFor="accounts-yes">نعم</Label>
                            </div>
                            <div className="flex items-center space-x-2 space-x-reverse">
                              <RadioGroupItem value="false" id="accounts-no" />
                              <Label htmlFor="accounts-no">لا</Label>
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
                      <FormItem className="space-y-3">
                        <FormLabel>هل يوجد اشتراكات؟ *</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="flex gap-4"
                            data-testid="radio-has-subscriptions"
                          >
                            <div className="flex items-center space-x-2 space-x-reverse">
                              <RadioGroupItem value="true" id="subs-yes" />
                              <Label htmlFor="subs-yes">نعم</Label>
                            </div>
                            <div className="flex items-center space-x-2 space-x-reverse">
                              <RadioGroupItem value="false" id="subs-no" />
                              <Label htmlFor="subs-no">لا</Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="paymentMethods"
                    render={() => (
                      <FormItem>
                        <div className="mb-4">
                          <FormLabel>طرق الدفع المتاحة</FormLabel>
                          <FormDescription>
                            اختر جميع طرق الدفع المتاحة في منشأتك
                          </FormDescription>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {paymentMethodOptions.map((option) => (
                            <FormField
                              key={option.value}
                              control={form.control}
                              name="paymentMethods"
                              render={({ field }) => (
                                <FormItem
                                  className="flex items-center space-x-3 space-x-reverse space-y-0"
                                >
                                  <FormControl>
                                    <Checkbox
                                      checked={(field.value as string[])?.includes(option.value)}
                                      onCheckedChange={(checked) => {
                                        const current = (field.value as string[]) || [];
                                        const updated = checked
                                          ? [...current, option.value]
                                          : current.filter((value: string) => value !== option.value);
                                        field.onChange(updated);
                                      }}
                                      data-testid={`checkbox-payment-${option.value}`}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal cursor-pointer">
                                    {option.label}
                                  </FormLabel>
                                </FormItem>
                              )}
                            />
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            )}

            {/* Section 3: Policies */}
            {currentSection === 3 && (
              <Card>
                <CardHeader>
                  <CardTitle>السياسات والشروط</CardTitle>
                  <CardDescription>
                    حدد سياسات الاسترجاع والشحن والتسليم
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="refundPolicy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>سياسة الاسترجاع والاستبدال</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            value={field.value || ""}
                            placeholder="مثال: يمكن استرجاع المنتجات خلال 14 يوماً من تاريخ الاستلام..."
                            rows={3}
                            data-testid="input-refund-policy"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="shippingPolicy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>سياسة الشحن</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            value={field.value || ""}
                            placeholder="مثال: الشحن مجاني للطلبات فوق 200 ريال..."
                            rows={3}
                            data-testid="input-shipping-policy"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="deliveryTimeframe"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>مدة التسليم</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ""}
                            placeholder="مثال: ٢-٥ أيام عمل"
                            data-testid="input-delivery-timeframe"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="governingLaw"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>القانون الحاكم *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="أنظمة المملكة العربية السعودية"
                            data-testid="input-governing-law"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="disputeResolution"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>آلية حل النزاعات</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            value={field.value || ""}
                            placeholder="مثال: التحكيم في غرفة الرياض التجارية..."
                            rows={3}
                            data-testid="input-dispute-resolution"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            )}

            {/* Section 4: Contact & Registration */}
            {currentSection === 4 && (
              <Card>
                <CardHeader>
                  <CardTitle>معلومات التواصل والتسجيل</CardTitle>
                  <CardDescription>
                    أدخل معلومات التواصل والأرقام الرسمية
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
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
                            placeholder="info@example.sa"
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
                            value={field.value || ""}
                            placeholder="+966501234567"
                            data-testid="input-contact-phone"
                          />
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
                          <Input
                            {...field}
                            value={field.value || ""}
                            placeholder="1234567890"
                            data-testid="input-commercial-registration"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="taxNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>الرقم الضريبي</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ""}
                            placeholder="310123456789003"
                            data-testid="input-tax-number"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={prevSection}
                disabled={currentSection === 1}
                data-testid="button-prev-section"
              >
                <ArrowRight className="ml-2 h-4 w-4" />
                السابق
              </Button>

              {currentSection < 4 ? (
                <Button
                  type="button"
                  onClick={nextSection}
                  data-testid="button-next-section"
                >
                  التالي
                  <ArrowLeft className="mr-2 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={createTermsMutation.isPending}
                  data-testid="button-submit-form"
                >
                  {createTermsMutation.isPending ? (
                    <>
                      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                      جاري الإنشاء...
                    </>
                  ) : (
                    <>
                      <FileText className="ml-2 h-4 w-4" />
                      إنشاء الشروط والأحكام
                    </>
                  )}
                </Button>
              )}
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
