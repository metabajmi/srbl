import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { FileText, Loader2, Download, Plus, Trash2, AlertCircle } from "lucide-react";
import { insertPolicyDocumentSchema, type PolicyDocument } from "@shared/schema";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { z } from "zod";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";

const formSchema = z.object({
  // القسم الأول: هوية الجهة والمسؤولية
  companyName: z.string().min(2, "يجب إدخال اسم الجهة"),
  businessType: z.string().min(2, "يجب إدخال نوع النشاط"),
  entityType: z.enum(["government", "private", "individual"], {
    required_error: "يجب تحديد صفة الجهة"
  }),
  contactEmail: z.string().email("يجب إدخال بريد إلكتروني صحيح"),
  contactPhone: z.string().optional(),
  contactAddress: z.string().optional(),
  processesSensitiveData: z.enum(["yes", "no"]).optional(),
  requiresDPO: z.string().optional(),
  dpoName: z.string().optional(),
  dpoEmail: z.string().email("يجب إدخال بريد إلكتروني صحيح").optional().or(z.literal("")),
  dpoPhone: z.string().optional(),
  dpoAddress: z.string().optional(),
  
  // القسم الثاني: جمع البيانات
  dataCategories: z.array(z.object({
    name: z.string().min(1, "يجب إدخال اسم البيان"),
    required: z.boolean(),
    purpose: z.string().min(1, "يجب إدخال الغرض"),
    legalBasis: z.enum(["consent", "contract", "legal_obligation", "legitimate_interest"]),
  })).min(1, "يجب إضافة فئة واحدة على الأقل"),
  collectionMethod: z.enum(["direct", "indirect", "both"], {
    required_error: "يجب تحديد طريقة الجمع"
  }).optional(),
  directCollectionDetails: z.string().optional(),
  indirectCollectionDetails: z.string().optional(),
  indirectDataSources: z.string().optional(),
  
  // القسم الثالث: معالجة البيانات
  processingMethods: z.string().optional(),
  sharesWithThirdParties: z.enum(["yes", "no"]).optional(),
  thirdPartyDetails: z.array(z.object({
    party: z.string(),
    purpose: z.string(),
    safeguards: z.string().optional(),
  })).optional(),
  transfersDataAbroad: z.enum(["yes", "no"]).optional(),
  transferDestinations: z.string().optional(),
  transferSafeguards: z.string().optional(),
  transferMechanism: z.string().optional(),
  
  // حقوق صاحب البيانات
  rightsExerciseMethod: z.string().optional(),
  rightsResponseTime: z.string().optional(),
  rightsContactChannel: z.string().optional(),
  accessRightDetails: z.string().optional(),
  obtainCopyDetails: z.string().optional(),
  obtainCopyFormat: z.string().optional(),
  obtainCopyLimitations: z.string().optional(),
  correctionRightDetails: z.string().optional(),
  correctionResponseTime: z.string().optional(),
  correctionNotificationMethod: z.string().optional(),
  deletionRightConditions: z.string().optional(),
  deletionExceptions: z.string().optional(),
  objectionRightDetails: z.string().optional(),
  objectionEvaluationTime: z.string().optional(),
  withdrawalConsentDetails: z.string().optional(),
  withdrawalConsentMethod: z.string().optional(),
  withdrawalConsentImpact: z.string().optional(),
  
  // التخزين والأمان
  storageLocation: z.string().optional(),
  storageLocationDetails: z.string().optional(),
  retentionPeriod: z.string().optional(),
  retentionCriteria: z.string().optional(),
  deletionMethod: z.string().optional(),
  securityMeasures: z.array(z.object({
    type: z.string(),
    description: z.string(),
  })).optional(),
  technicalMeasures: z.string().optional(),
  organizationalMeasures: z.string().optional(),
  breachNotificationProcess: z.string().optional(),
  breachNotificationTime: z.string().optional(),
  
  // الكوكيز والتحديثات
  usesCookies: z.enum(["yes", "no"]).optional(),
  cookieTypes: z.array(z.object({
    type: z.string(),
    purpose: z.string(),
    duration: z.string(),
  })).optional(),
  cookieManagementMethod: z.string().optional(),
  updateNotificationMethod: z.string().optional(),
  
  // الشكاوى
  complaintProcedure: z.string().optional(),
  complaintResponseTime: z.string().optional(),
  sdaiaContactInfo: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function PrivacyGeneratorPage() {
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
      requiresDPO: "",
      dpoName: "",
      dpoEmail: "",
      dpoPhone: "",
      dpoAddress: "",
      dataCategories: [],
      collectionMethod: undefined,
      directCollectionDetails: "",
      indirectCollectionDetails: "",
      indirectDataSources: "",
      processingMethods: "",
      sharesWithThirdParties: undefined,
      thirdPartyDetails: [],
      transfersDataAbroad: undefined,
      transferDestinations: "",
      transferSafeguards: "",
      transferMechanism: "",
      rightsExerciseMethod: "",
      rightsResponseTime: "",
      rightsContactChannel: "",
      accessRightDetails: "",
      obtainCopyDetails: "",
      obtainCopyFormat: "",
      obtainCopyLimitations: "",
      correctionRightDetails: "",
      correctionResponseTime: "",
      correctionNotificationMethod: "",
      deletionRightConditions: "",
      deletionExceptions: "",
      objectionRightDetails: "",
      objectionEvaluationTime: "",
      withdrawalConsentDetails: "",
      withdrawalConsentMethod: "",
      withdrawalConsentImpact: "",
      storageLocation: "",
      storageLocationDetails: "",
      retentionPeriod: "",
      retentionCriteria: "",
      deletionMethod: "",
      securityMeasures: [],
      technicalMeasures: "",
      organizationalMeasures: "",
      breachNotificationProcess: "",
      breachNotificationTime: "",
      usesCookies: undefined,
      cookieTypes: [],
      cookieManagementMethod: "",
      updateNotificationMethod: "",
      complaintProcedure: "",
      complaintResponseTime: "",
      sdaiaContactInfo: "",
    },
  });

  const { fields: dataFields, append: appendData, remove: removeData } = useFieldArray({
    control: form.control,
    name: "dataCategories",
  });

  const { fields: thirdPartyFields, append: appendThirdParty, remove: removeThirdParty } = useFieldArray({
    control: form.control,
    name: "thirdPartyDetails",
  });

  const { fields: securityFields, append: appendSecurity, remove: removeSecurity } = useFieldArray({
    control: form.control,
    name: "securityMeasures",
  });

  const { fields: cookieFields, append: appendCookie, remove: removeCookie } = useFieldArray({
    control: form.control,
    name: "cookieTypes",
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

  const onSubmitError = (errors: any) => {
    console.log("Form validation errors:", errors);
    
    if (errors.dataCategories) {
      toast({
        title: "خطأ في النموذج",
        description: "يجب إضافة فئة بيانات واحدة على الأقل في القسم الثاني",
        variant: "destructive",
      });
      setCurrentSection(2);
    } else if (errors.companyName || errors.businessType || errors.entityType || errors.contactEmail) {
      toast({
        title: "خطأ في النموذج",
        description: "يرجى ملء جميع الحقول المطلوبة في القسم الأول",
        variant: "destructive",
      });
      setCurrentSection(1);
    } else {
      toast({
        title: "خطأ في النموذج",
        description: "يرجى التحقق من جميع الحقول المطلوبة",
        variant: "destructive",
      });
    }
  };

  const onSubmit = (values: FormValues) => {
    console.log("onSubmit called with values:", values);
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
      directCollectionDetails: values.directCollectionDetails || null,
      indirectCollectionDetails: values.indirectCollectionDetails || null,
      indirectDataSources: values.indirectDataSources || null,
      processingMethods: values.processingMethods || null,
      sharesWithThirdParties: values.sharesWithThirdParties || null,
      thirdPartyDetails: values.thirdPartyDetails || null,
      transfersDataAbroad: values.transfersDataAbroad || null,
      transferDestinations: values.transferDestinations || null,
      transferSafeguards: values.transferSafeguards || null,
      transferMechanism: values.transferMechanism || null,
      rightsExerciseMethod: values.rightsExerciseMethod || null,
      rightsResponseTime: values.rightsResponseTime || null,
      rightsContactChannel: values.rightsContactChannel || null,
      accessRightDetails: values.accessRightDetails || null,
      obtainCopyDetails: values.obtainCopyDetails || null,
      obtainCopyFormat: values.obtainCopyFormat || null,
      obtainCopyLimitations: values.obtainCopyLimitations || null,
      correctionRightDetails: values.correctionRightDetails || null,
      correctionResponseTime: values.correctionResponseTime || null,
      correctionNotificationMethod: values.correctionNotificationMethod || null,
      deletionRightConditions: values.deletionRightConditions || null,
      deletionExceptions: values.deletionExceptions || null,
      objectionRightDetails: values.objectionRightDetails || null,
      objectionEvaluationTime: values.objectionEvaluationTime || null,
      withdrawalConsentDetails: values.withdrawalConsentDetails || null,
      withdrawalConsentMethod: values.withdrawalConsentMethod || null,
      withdrawalConsentImpact: values.withdrawalConsentImpact || null,
      storageLocation: values.storageLocation || null,
      storageLocationDetails: values.storageLocationDetails || null,
      retentionPeriod: values.retentionPeriod || null,
      retentionCriteria: values.retentionCriteria || null,
      deletionMethod: values.deletionMethod || null,
      securityMeasures: values.securityMeasures || null,
      technicalMeasures: values.technicalMeasures || null,
      organizationalMeasures: values.organizationalMeasures || null,
      breachNotificationProcess: values.breachNotificationProcess || null,
      breachNotificationTime: values.breachNotificationTime || null,
      usesCookies: values.usesCookies || null,
      cookieTypes: values.cookieTypes || null,
      cookieManagementMethod: values.cookieManagementMethod || null,
      updateNotificationMethod: values.updateNotificationMethod || null,
      lastUpdatedDate: null,
      complaintProcedure: values.complaintProcedure || null,
      complaintResponseTime: values.complaintResponseTime || null,
      sdaiaContactInfo: values.sdaiaContactInfo || null,
    };
    console.log("About to call generateMutation.mutate with:", submitData);
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

  const watchProcessesSensitiveData = form.watch("processesSensitiveData");
  const watchSharesWithThirdParties = form.watch("sharesWithThirdParties");
  const watchTransfersDataAbroad = form.watch("transfersDataAbroad");
  const watchUsesCookies = form.watch("usesCookies");

  return (
    <div className="container py-8" dir="rtl">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-3 text-primary">أداة الذكاء الاصطناعي لتوليد سياسة الخصوصية</h1>
          <p className="text-muted-foreground text-lg">
            أداة متقدمة لتوليد سياسة خصوصية متوافقة مع نظام حماية البيانات الشخصية السعودي
          </p>
        </div>

        {/* مؤشر الأقسام */}
        <div className="mb-8 flex gap-2 justify-center flex-wrap">
          <Badge 
            variant={currentSection === 1 ? "default" : "outline"}
            className="cursor-pointer hover-elevate px-4 py-2"
            onClick={() => setCurrentSection(1)}
            data-testid="badge-section-1"
          >
            القسم الأول: هوية الجهة
          </Badge>
          <Badge 
            variant={currentSection === 2 ? "default" : "outline"}
            className="cursor-pointer hover-elevate px-4 py-2"
            onClick={() => setCurrentSection(2)}
            data-testid="badge-section-2"
          >
            القسم الثاني: جمع البيانات
          </Badge>
          <Badge 
            variant={currentSection === 3 ? "default" : "outline"}
            className="cursor-pointer hover-elevate px-4 py-2"
            onClick={() => setCurrentSection(3)}
            data-testid="badge-section-3"
          >
            القسم الثالث: المعالجة والأمان
          </Badge>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit, onSubmitError)} className="space-y-6">
            {/* القسم الأول: هوية الجهة والمسؤولية */}
            {currentSection === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl text-primary">القسم الأول: هوية الجهة والمسؤولية (جهة التحكم)</CardTitle>
                  <CardDescription className="text-base">
                    هذه الأسئلة تساعد في تحديد هوية الجهة المسؤولة عن معالجة البيانات الشخصية
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* س1: اسم الجهة */}
                  <FormField
                    control={form.control}
                    name="companyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base">1. ما هو الاسم الرسمي لشركتك/منشأتك؟ <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="bg-muted/40 min-h-10"
                            placeholder="أدخل الاسم الرسمي للجهة"
                            data-testid="input-company-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* س2: طبيعة النشاط */}
                  <FormField
                    control={form.control}
                    name="businessType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base">2. ما هي طبيعة نشاطك الرئيسي أو الخدمة التي تقدمها؟ <span className="text-destructive">*</span></FormLabel>
                        <FormDescription>
                          مثال: منصة تجارة إلكترونية، تقديم خدمات مالية، تطبيق صحي
                        </FormDescription>
                        <FormControl>
                          <Textarea
                            {...field}
                            className="min-h-20 bg-muted/40"
                            placeholder="أدخل نبذة مختصرة عن مهام واختصاصات الجهة والخدمات التي تقدمها"
                            data-testid="input-business-type"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* س3: صفة الجهة */}
                  <FormField
                    control={form.control}
                    name="entityType"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel className="text-base">3. هل جهتك: <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex flex-col space-y-2"
                            data-testid="radio-entity-type"
                          >
                            <div className="flex items-center space-x-2 space-x-reverse">
                              <RadioGroupItem value="government" id="government" data-testid="radio-government" />
                              <Label htmlFor="government" className="font-normal cursor-pointer">
                                (أ) جهة حكومية
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2 space-x-reverse">
                              <RadioGroupItem value="private" id="private" data-testid="radio-private" />
                              <Label htmlFor="private" className="font-normal cursor-pointer">
                                (ب) شركة/مؤسسة خاصة
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2 space-x-reverse">
                              <RadioGroupItem value="individual" id="individual" data-testid="radio-individual" />
                              <Label htmlFor="individual" className="font-normal cursor-pointer">
                                (ج) فرد (يمارس نشاطاً يتجاوز الاستخدام الشخصي/العائلي)
                              </Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* س4: بيانات التواصل */}
                  <div className="space-y-4 p-4 bg-muted/30 rounded-md border">
                    <h3 className="font-semibold text-base">4. بيانات التواصل الرئيسية <span className="text-destructive">*</span></h3>
                    
                    <FormField
                      control={form.control}
                      name="contactEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>البريد الإلكتروني <span className="text-destructive">*</span></FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="email"
                              className="bg-background min-h-10"
                              placeholder="example@domain.com"
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
                              className="bg-background min-h-10"
                              placeholder="+966 XX XXX XXXX"
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
                      name="contactAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>العنوان البريدي</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              className="min-h-16 bg-background"
                              placeholder="أدخل العنوان الكامل"
                              data-testid="input-contact-address"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* س5: معالجة بيانات حساسة */}
                  <FormField
                    control={form.control}
                    name="processesSensitiveData"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel className="text-base">
                          5. هل نشاطك يتطلب: <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormDescription>
                          (أ) معالجة بيانات صحية أو بيومترية أو جنائية (بيانات حساسة)؟
                          <br />
                          (ب) مراقبة مستمرة أو ممنهجة لأصحاب البيانات (مثل تتبع الموقع، تحليل السلوكيات)؟
                        </FormDescription>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex flex-col space-y-2"
                            data-testid="radio-processes-sensitive"
                          >
                            <div className="flex items-center space-x-2 space-x-reverse">
                              <RadioGroupItem value="yes" id="sensitive-yes" data-testid="radio-sensitive-yes" />
                              <Label htmlFor="sensitive-yes" className="font-normal cursor-pointer">نعم</Label>
                            </div>
                            <div className="flex items-center space-x-2 space-x-reverse">
                              <RadioGroupItem value="no" id="sensitive-no" data-testid="radio-sensitive-no" />
                              <Label htmlFor="sensitive-no" className="font-normal cursor-pointer">لا</Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* معلومات مسؤول حماية البيانات (إذا كان مطلوباً) */}
                  {watchProcessesSensitiveData === "yes" && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>ملاحظة:</strong> بناءً على إجابتك، يصبح تعيين مسؤول حماية البيانات الشخصية (DPO) إلزامياً.
                        يرجى ملء البيانات التالية:
                      </AlertDescription>
                    </Alert>
                  )}

                  {watchProcessesSensitiveData === "yes" && (
                    <div className="space-y-4 p-4 bg-muted/30 rounded-md border">
                      <h3 className="font-semibold text-base">معلومات مسؤول حماية البيانات الشخصية (DPO)</h3>
                      
                      <FormField
                        control={form.control}
                        name="dpoName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>الاسم</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                className="bg-background min-h-10"
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
                                className="bg-background min-h-10"
                                placeholder="dpo@domain.com"
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
                                className="bg-background min-h-10"
                                placeholder="+966 XX XXX XXXX"
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
                              <Textarea
                                {...field}
                                className="min-h-16 bg-background"
                                placeholder="عنوان مسؤول حماية البيانات"
                                data-testid="input-dpo-address"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  <div className="flex justify-end">
                    <Button
                      type="button"
                      onClick={() => setCurrentSection(2)}
                      data-testid="button-next-section-1"
                    >
                      التالي: القسم الثاني
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* القسم الثاني: جمع البيانات والأغراض النظامية */}
            {currentSection === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl text-primary">القسم الثاني: جمع البيانات والأغراض النظامية</CardTitle>
                  <CardDescription className="text-base">
                    هذه الأسئلة تحدد فئات البيانات المجمعة والمسوغ النظامي للمعالجة
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* تنبيه مهم */}
                  <Alert className="bg-primary/5 border-primary/20" data-testid="alert-data-category-required">
                    <AlertCircle className="h-5 w-5 text-primary" />
                    <AlertDescription className="text-base font-medium">
                      يجب إضافة <span className="font-bold text-primary">فئة بيانات واحدة على الأقل</span> لتتمكن من توليد السياسة
                    </AlertDescription>
                  </Alert>

                  {/* س6-10: فئات البيانات */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-base">
                        6-10. فئات البيانات الشخصية التي يتم جمعها <span className="text-destructive">*</span>
                      </h3>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => appendData({
                          name: "",
                          required: false,
                          purpose: "",
                          legalBasis: "consent",
                        })}
                        data-testid="button-add-data-category"
                      >
                        <Plus className="h-4 w-4 ml-2" />
                        إضافة فئة بيانات
                      </Button>
                    </div>

                    <FormDescription>
                      أضف البيانات التي يتم جمعها مع تحديد: الإلزامية، الغرض، والمسوغ النظامي لكل فئة
                    </FormDescription>

                    {dataFields.map((field, index) => (
                      <div key={field.id} className="p-4 border rounded-md bg-muted/20 space-y-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">فئة البيانات #{index + 1}</h4>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeData(index)}
                            data-testid={`button-remove-data-${index}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>

                        <FormField
                          control={form.control}
                          name={`dataCategories.${index}.name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>اسم البيان (مثل: الاسم، البريد الإلكتروني، رقم الهاتف)</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  className="bg-background"
                                  placeholder="مثال: الاسم الكامل"
                                  data-testid={`input-data-name-${index}`}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`dataCategories.${index}.required`}
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-x-reverse space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  data-testid={`checkbox-data-required-${index}`}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>
                                  هذا البيان إلزامي لتنفيذ الخدمة
                                </FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`dataCategories.${index}.purpose`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>الغرض من جمع هذا البيان</FormLabel>
                              <FormControl>
                                <Textarea
                                  {...field}
                                  className="min-h-16 bg-background"
                                  placeholder="مثال: لإنشاء ملف تعريفي للعميل"
                                  data-testid={`input-data-purpose-${index}`}
                                />
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
                              <FormLabel>المسوغ النظامي للمعالجة</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger className="bg-background" data-testid={`select-data-legal-${index}`}>
                                    <SelectValue placeholder="اختر المسوغ النظامي" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="consent">
                                    (أ) موافقة العميل الصريحة
                                  </SelectItem>
                                  <SelectItem value="contract">
                                    (ب) االلتزام بـ عقد خدمة أو شروط استخدام متفق عليها
                                  </SelectItem>
                                  <SelectItem value="legal_obligation">
                                    (ج) االلتزام بنظام/قانون أو قرار رسمي صادر في المملكة
                                  </SelectItem>
                                  <SelectItem value="legitimate_interest">
                                    (د) تحقيق مصلحة مشروعة (غير حساسة وال تضر بالعميل)
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    ))}

                    {dataFields.length === 0 && (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          لم تقم بإضافة أي فئات بيانات بعد. انقر على "إضافة فئة بيانات" للبدء.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>

                  {/* س7: كيفية جمع البيانات */}
                  <FormField
                    control={form.control}
                    name="collectionMethod"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel className="text-base">7. كيف يتم جمع هذه البيانات؟</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex flex-col space-y-2"
                            data-testid="radio-collection-method"
                          >
                            <div className="flex items-center space-x-2 space-x-reverse">
                              <RadioGroupItem value="direct" id="direct" data-testid="radio-direct" />
                              <Label htmlFor="direct" className="font-normal cursor-pointer">
                                (أ) مباشرة من العميل (ملء نماذج، إدخال يدوي)
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2 space-x-reverse">
                              <RadioGroupItem value="indirect" id="indirect" data-testid="radio-indirect" />
                              <Label htmlFor="indirect" className="font-normal cursor-pointer">
                                (ب) بشكل غير مباشر (ملفات الارتباط/الكوكيز، أنظمة خارجية)
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2 space-x-reverse">
                              <RadioGroupItem value="both" id="both" data-testid="radio-both" />
                              <Label htmlFor="both" className="font-normal cursor-pointer">
                                (ج) كلاهما (مباشرة وغير مباشرة)
                              </Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* تفاصيل الجمع المباشر */}
                  {(form.watch("collectionMethod") === "direct" || form.watch("collectionMethod") === "both") && (
                    <FormField
                      control={form.control}
                      name="directCollectionDetails"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>تفاصيل الجمع المباشر ووسائله</FormLabel>
                          <FormDescription>
                            أضف الأغراض التي من أجلها يتم جمع البيانات الشخصية مباشرة
                          </FormDescription>
                          <FormControl>
                            <Textarea
                              {...field}
                              className="min-h-24 bg-muted/40"
                              placeholder="مثال: عند التسجيل في الموقع، عند طلب الخدمة، عند إجراء عملية الدفع"
                              data-testid="input-direct-collection"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {/* تفاصيل الجمع غير المباشر */}
                  {(form.watch("collectionMethod") === "indirect" || form.watch("collectionMethod") === "both") && (
                    <>
                      <FormField
                        control={form.control}
                        name="indirectDataSources"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>مصادر البيانات غير المباشرة</FormLabel>
                            <FormDescription>
                              أضف المصادر التي يتم من خلالها جمع البيانات الشخصية بصورة غير مباشرة
                            </FormDescription>
                            <FormControl>
                              <Textarea
                                {...field}
                                className="min-h-24 bg-muted/40"
                                placeholder="مثال: شركاء الأعمال، وسائل التواصل الاجتماعي، ملفات الكوكيز"
                                data-testid="input-indirect-sources"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="indirectCollectionDetails"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>تفاصيل ووسائل الجمع غير المباشر</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                className="min-h-24 bg-muted/40"
                                placeholder="أضف تفاصيل وسائل الجمع غير المباشر والغرض منها"
                                data-testid="input-indirect-details"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}

                  <div className="flex justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCurrentSection(1)}
                      data-testid="button-prev-section-2"
                    >
                      السابق
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setCurrentSection(3)}
                      data-testid="button-next-section-2"
                    >
                      التالي: القسم الثالث
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* القسم الثالث: معالجة البيانات، مشاركتها، وأمنها */}
            {currentSection === 3 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl text-primary">القسم الثالث: معالجة البيانات، مشاركتها، وأمنها</CardTitle>
                  <CardDescription className="text-base">
                    هذه الأسئلة تحدد كيفية معالجة البيانات وحمايتها ومشاركتها
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* س11: آليات معالجة البيانات */}
                  <FormField
                    control={form.control}
                    name="processingMethods"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base">
                          11. كيف يتم استخدام هذه البيانات خلال دورة حياتها (خطوات المعالجة)؟
                        </FormLabel>
                        <FormDescription>
                          مثال: تُستخدم بيانات الموقع لربطها بخدمات الطرف الثالث، ثم يتم إخفاء هويتها بعد 30 يوماً
                        </FormDescription>
                        <FormControl>
                          <Textarea
                            {...field}
                            className="min-h-24 bg-muted/40"
                            placeholder="أدخل وصف آليات معالجة البيانات بشكل دقيق وواضح"
                            data-testid="input-processing-methods"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* س12: مشاركة البيانات مع أطراف أخرى */}
                  <FormField
                    control={form.control}
                    name="sharesWithThirdParties"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel className="text-base">
                          12. هل يتم مشاركة (الإفصاح عن) البيانات مع أطراف أخرى؟
                        </FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex flex-col space-y-2"
                            data-testid="radio-third-party-sharing"
                          >
                            <div className="flex items-center space-x-2 space-x-reverse">
                              <RadioGroupItem value="yes" id="share-yes" data-testid="radio-share-yes" />
                              <Label htmlFor="share-yes" className="font-normal cursor-pointer">نعم</Label>
                            </div>
                            <div className="flex items-center space-x-2 space-x-reverse">
                              <RadioGroupItem value="no" id="share-no" data-testid="radio-share-no" />
                              <Label htmlFor="share-no" className="font-normal cursor-pointer">لا</Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* تفاصيل الأطراف الثالثة */}
                  {watchSharesWithThirdParties === "yes" && (
                    <div className="space-y-4 p-4 bg-muted/30 rounded-md border">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-base">تفاصيل الأطراف الخارجية</h3>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => appendThirdParty({
                            party: "",
                            purpose: "",
                            safeguards: "",
                          })}
                          data-testid="button-add-third-party"
                        >
                          <Plus className="h-4 w-4 ml-2" />
                          إضافة طرف خارجي
                        </Button>
                      </div>

                      {thirdPartyFields.map((field, index) => (
                        <div key={field.id} className="p-4 border rounded-md bg-background space-y-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">الطرف #{index + 1}</h4>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeThirdParty(index)}
                              data-testid={`button-remove-party-${index}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>

                          <FormField
                            control={form.control}
                            name={`thirdPartyDetails.${index}.party`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>اسم الطرف/الجهة</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    placeholder="مثال: جهات حكومية، شركات تحليل، موردو خدمات تقنية"
                                    data-testid={`input-party-name-${index}`}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`thirdPartyDetails.${index}.purpose`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>الغرض من المشاركة</FormLabel>
                                <FormControl>
                                  <Textarea
                                    {...field}
                                    className="min-h-16"
                                    placeholder="أدخل الغرض المحدد لمشاركة البيانات"
                                    data-testid={`input-party-purpose-${index}`}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`thirdPartyDetails.${index}.safeguards`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>الضمانات والإجراءات الأمنية (اختياري)</FormLabel>
                                <FormControl>
                                  <Textarea
                                    {...field}
                                    className="min-h-16"
                                    placeholder="مثال: اتفاقيات سرية، تشفير البيانات"
                                    data-testid={`input-party-safeguards-${index}`}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* س13: نقل البيانات خارج المملكة */}
                  <FormField
                    control={form.control}
                    name="transfersDataAbroad"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel className="text-base">
                          13. هل يتم نقل البيانات الشخصية خارج المملكة؟
                        </FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex flex-col space-y-2"
                            data-testid="radio-transfer-abroad"
                          >
                            <div className="flex items-center space-x-2 space-x-reverse">
                              <RadioGroupItem value="yes" id="transfer-yes" data-testid="radio-transfer-yes" />
                              <Label htmlFor="transfer-yes" className="font-normal cursor-pointer">نعم</Label>
                            </div>
                            <div className="flex items-center space-x-2 space-x-reverse">
                              <RadioGroupItem value="no" id="transfer-no" data-testid="radio-transfer-no" />
                              <Label htmlFor="transfer-no" className="font-normal cursor-pointer">لا</Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* تفاصيل نقل البيانات */}
                  {watchTransfersDataAbroad === "yes" && (
                    <div className="space-y-4 p-4 bg-muted/30 rounded-md border">
                      <h3 className="font-semibold text-base">تفاصيل نقل البيانات خارج المملكة</h3>
                      
                      <FormField
                        control={form.control}
                        name="transferDestinations"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>الدول أو المناطق المستهدفة</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="مثال: الولايات المتحدة، الاتحاد الأوروبي"
                                data-testid="input-transfer-destinations"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="transferSafeguards"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>الضمانات المتبعة</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                className="min-h-16"
                                placeholder="مثال: البنود التعاقدية النموذجية، القواعد المؤسسية الملزمة"
                                data-testid="input-transfer-safeguards"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="transferMechanism"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>الآلية المستخدمة</FormLabel>
                            <FormDescription>
                              مثال: اتفاقيات دولية، قرار من الهيئة، قواعد ملزمة للشركات
                            </FormDescription>
                            <FormControl>
                              <Textarea
                                {...field}
                                className="min-h-16"
                                placeholder="أدخل الآلية القانونية المستخدمة لنقل البيانات"
                                data-testid="input-transfer-mechanism"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  <div className="border-t pt-6 space-y-4">
                    <h3 className="text-xl font-semibold text-primary">حقوق صاحب البيانات الشخصية</h3>
                    
                    {/* س14: ممارسة الحقوق */}
                    <FormField
                      control={form.control}
                      name="rightsExerciseMethod"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base">14. كيف يمكن لصاحب البيانات ممارسة حقوقه؟</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              className="min-h-20 bg-muted/40"
                              placeholder="مثال: من خلال التواصل عبر البريد الإلكتروني أو نموذج على الموقع"
                              data-testid="input-rights-exercise"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="rightsResponseTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>مدة الرد على طلبات الحقوق (بالأيام)</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="number"
                                placeholder="مثال: 30"
                                data-testid="input-rights-response-time"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="rightsContactChannel"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>قناة التواصل الرئيسية</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="مثال: privacy@company.com"
                                data-testid="input-rights-contact"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* الحقوق الفردية (15-20) */}
                    <div className="grid grid-cols-1 gap-4">
                      <FormField
                        control={form.control}
                        name="accessRightDetails"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>15. حق الوصول إلى البيانات - التفاصيل</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                className="min-h-16 bg-muted/40"
                                placeholder="كيف يمكن للعميل الوصول إلى بياناته"
                                data-testid="input-access-right"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="space-y-4 p-4 bg-muted/20 rounded-md">
                        <h4 className="font-medium">16. حق الحصول على نسخة من البيانات</h4>
                        
                        <FormField
                          control={form.control}
                          name="obtainCopyDetails"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>التفاصيل</FormLabel>
                              <FormControl>
                                <Textarea
                                  {...field}
                                  className="min-h-16 bg-background"
                                  placeholder="كيف يمكن الحصول على نسخة"
                                  data-testid="input-obtain-copy"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="obtainCopyFormat"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>الصيغة المتاحة</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    placeholder="مثال: PDF، Word، JSON"
                                    data-testid="input-obtain-format"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="obtainCopyLimitations"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>القيود (إن وجدت)</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    placeholder="مثال: مرة واحدة كل 6 أشهر"
                                    data-testid="input-obtain-limitations"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      <div className="space-y-4 p-4 bg-muted/20 rounded-md">
                        <h4 className="font-medium">17. حق تصحيح البيانات</h4>
                        
                        <FormField
                          control={form.control}
                          name="correctionRightDetails"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>كيفية طلب التصحيح</FormLabel>
                              <FormControl>
                                <Textarea
                                  {...field}
                                  className="min-h-16 bg-background"
                                  placeholder="الإجراءات المتبعة لتصحيح البيانات"
                                  data-testid="input-correction-details"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="correctionResponseTime"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>المدة (بالأيام)</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    type="number"
                                    placeholder="مثال: 15"
                                    data-testid="input-correction-time"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="correctionNotificationMethod"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>طريقة الإشعار بالتصحيح</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    placeholder="مثال: بريد إلكتروني"
                                    data-testid="input-correction-notification"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="deletionRightConditions"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>18. حق حذف البيانات - الشروط</FormLabel>
                              <FormControl>
                                <Textarea
                                  {...field}
                                  className="min-h-20 bg-muted/40"
                                  placeholder="الشروط التي يمكن فيها حذف البيانات"
                                  data-testid="input-deletion-conditions"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="deletionExceptions"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>الاستثناءات</FormLabel>
                              <FormControl>
                                <Textarea
                                  {...field}
                                  className="min-h-20 bg-muted/40"
                                  placeholder="الحالات التي لا يمكن فيها الحذف"
                                  data-testid="input-deletion-exceptions"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="objectionRightDetails"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>19. حق الاعتراض - التفاصيل</FormLabel>
                              <FormControl>
                                <Textarea
                                  {...field}
                                  className="min-h-20 bg-muted/40"
                                  placeholder="كيفية الاعتراض على معالجة البيانات"
                                  data-testid="input-objection-details"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="objectionEvaluationTime"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>مدة تقييم الاعتراض (بالأيام)</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="number"
                                  placeholder="مثال: 30"
                                  data-testid="input-objection-time"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="space-y-4 p-4 bg-muted/20 rounded-md">
                        <h4 className="font-medium">20. حق سحب الموافقة</h4>
                        
                        <FormField
                          control={form.control}
                          name="withdrawalConsentDetails"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>تفاصيل عملية السحب</FormLabel>
                              <FormControl>
                                <Textarea
                                  {...field}
                                  className="min-h-16 bg-background"
                                  placeholder="كيف يمكن سحب الموافقة"
                                  data-testid="input-withdrawal-details"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="withdrawalConsentMethod"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>الطريقة/القناة</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    placeholder="مثال: من خلال إعدادات الحساب"
                                    data-testid="input-withdrawal-method"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="withdrawalConsentImpact"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>الأثر على الخدمات</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    placeholder="مثال: قد تتوقف بعض الخدمات"
                                    data-testid="input-withdrawal-impact"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-6 space-y-4">
                    <h3 className="text-xl font-semibold text-primary">التخزين والأمان</h3>
                    
                    {/* س21: التخزين */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="storageLocation"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>21. موقع تخزين البيانات</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-storage-location">
                                  <SelectValue placeholder="اختر موقع التخزين" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="inside_ksa">داخل المملكة</SelectItem>
                                <SelectItem value="outside_ksa">خارج المملكة</SelectItem>
                                <SelectItem value="both">كلاهما</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="storageLocationDetails"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>تفاصيل موقع التخزين</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="مثال: خوادم AWS في منطقة البحرين"
                                data-testid="input-storage-details"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="retentionPeriod"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>مدة الاحتفاظ بالبيانات</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="مثال: 5 سنوات"
                                data-testid="input-retention-period"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="retentionCriteria"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>المعايير المستخدمة</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="مثال: حسب المتطلبات النظامية"
                                data-testid="input-retention-criteria"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="deletionMethod"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>طريقة الإتلاف/الحذف</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="مثال: الحذف الآمن والنهائي"
                                data-testid="input-deletion-method"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* س22: الإجراءات الأمنية */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-base">22. الإجراءات الأمنية المتخذة</h3>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => appendSecurity({
                          type: "",
                          description: "",
                        })}
                        data-testid="button-add-security"
                      >
                        <Plus className="h-4 w-4 ml-2" />
                        إضافة إجراء أمني
                      </Button>
                    </div>

                    {securityFields.map((field, index) => (
                      <div key={field.id} className="p-4 border rounded-md bg-muted/20 space-y-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">الإجراء #{index + 1}</h4>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeSecurity(index)}
                            data-testid={`button-remove-security-${index}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <FormField
                            control={form.control}
                            name={`securityMeasures.${index}.type`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>النوع</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid={`select-security-type-${index}`}>
                                      <SelectValue placeholder="اختر النوع" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="technical">تقني</SelectItem>
                                    <SelectItem value="organizational">تنظيمي</SelectItem>
                                    <SelectItem value="physical">مادي</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`securityMeasures.${index}.description`}
                            render={({ field }) => (
                              <FormItem className="md:col-span-2">
                                <FormLabel>الوصف</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    placeholder="مثال: تشفير البيانات، التحكم في الوصول"
                                    data-testid={`input-security-desc-${index}`}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    ))}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="technicalMeasures"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>إجراءات تقنية إضافية</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                className="min-h-20 bg-muted/40"
                                placeholder="مثال: جدران الحماية، أنظمة كشف التسلل"
                                data-testid="input-technical-measures"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="organizationalMeasures"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>إجراءات تنظيمية إضافية</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                className="min-h-20 bg-muted/40"
                                placeholder="مثال: سياسات الوصول، تدريب الموظفين"
                                data-testid="input-organizational-measures"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* س23: الإخطار بانتهاك البيانات */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="breachNotificationProcess"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base">23. عملية الإخطار بانتهاك البيانات</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              className="min-h-20 bg-muted/40"
                              placeholder="كيف سيتم إخطار الأطراف المعنية في حالة الانتهاك"
                              data-testid="input-breach-process"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="breachNotificationTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>المدة الزمنية للإخطار</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="مثال: خلال 72 ساعة"
                              data-testid="input-breach-time"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* س24: ملفات الارتباط (الكوكيز) */}
                  <FormField
                    control={form.control}
                    name="usesCookies"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel className="text-base">24. هل يستخدم موقعك ملفات الارتباط (الكوكيز)؟</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex flex-col space-y-2"
                            data-testid="radio-uses-cookies"
                          >
                            <div className="flex items-center space-x-2 space-x-reverse">
                              <RadioGroupItem value="yes" id="cookies-yes" data-testid="radio-cookies-yes" />
                              <Label htmlFor="cookies-yes" className="font-normal cursor-pointer">نعم</Label>
                            </div>
                            <div className="flex items-center space-x-2 space-x-reverse">
                              <RadioGroupItem value="no" id="cookies-no" data-testid="radio-cookies-no" />
                              <Label htmlFor="cookies-no" className="font-normal cursor-pointer">لا</Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {watchUsesCookies === "yes" && (
                    <div className="space-y-4 p-4 bg-muted/30 rounded-md border">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-base">أنواع الكوكيز المستخدمة</h3>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => appendCookie({
                            type: "",
                            purpose: "",
                            duration: "",
                          })}
                          data-testid="button-add-cookie"
                        >
                          <Plus className="h-4 w-4 ml-2" />
                          إضافة نوع كوكيز
                        </Button>
                      </div>

                      {cookieFields.map((field, index) => (
                        <div key={field.id} className="p-4 border rounded-md bg-background space-y-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">النوع #{index + 1}</h4>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeCookie(index)}
                              data-testid={`button-remove-cookie-${index}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FormField
                              control={form.control}
                              name={`cookieTypes.${index}.type`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>النوع</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      placeholder="مثال: ضرورية، تحليلية، تسويقية"
                                      data-testid={`input-cookie-type-${index}`}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name={`cookieTypes.${index}.purpose`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>الغرض</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      placeholder="مثال: لحفظ تفضيلات المستخدم"
                                      data-testid={`input-cookie-purpose-${index}`}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name={`cookieTypes.${index}.duration`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>المدة</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      placeholder="مثال: 1 سنة"
                                      data-testid={`input-cookie-duration-${index}`}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      ))}

                      <FormField
                        control={form.control}
                        name="cookieManagementMethod"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>كيف يمكن إدارة الكوكيز؟</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                className="min-h-16 bg-background"
                                placeholder="مثال: من خلال إعدادات المتصفح أو إعدادات الموقع"
                                data-testid="input-cookie-management"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {/* س25: التحديثات */}
                  <FormField
                    control={form.control}
                    name="updateNotificationMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base">25. كيف سيتم إخطار المستخدمين بالتحديثات على السياسة؟</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            className="min-h-20 bg-muted/40"
                            placeholder="مثال: عبر البريد الإلكتروني، إشعار على الموقع، رسالة نصية"
                            data-testid="input-update-notification"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* س26: الشكاوى */}
                  <div className="space-y-4 p-4 bg-muted/30 rounded-md border">
                    <h3 className="font-semibold text-base">26. جهة الاختصاص والشكاوى</h3>
                    
                    <FormField
                      control={form.control}
                      name="complaintProcedure"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>إجراءات تقديم الشكاوى</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              className="min-h-20 bg-background"
                              placeholder="كيف يمكن للعميل تقديم شكوى أو اعتراض"
                              data-testid="input-complaint-procedure"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="complaintResponseTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>مدة الرد على الشكاوى (بالأيام)</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              placeholder="مثال: 30"
                              data-testid="input-complaint-time"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="sdaiaContactInfo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>معلومات التواصل مع هيئة سدايا (اختياري)</FormLabel>
                          <FormDescription>
                            سيتم تضمين معلومات التواصل الرسمية مع هيئة سدايا في السياسة تلقائياً
                          </FormDescription>
                          <FormControl>
                            <Textarea
                              {...field}
                              className="min-h-16 bg-background"
                              placeholder="يمكنك إضافة معلومات إضافية هنا إذا رغبت"
                              data-testid="input-sdaia-contact"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-between pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCurrentSection(2)}
                      data-testid="button-prev-section-3"
                    >
                      السابق
                    </Button>
                    <Button
                      type="submit"
                      disabled={generateMutation.isPending}
                      data-testid="button-submit-form"
                    >
                      {generateMutation.isPending ? (
                        <>
                          <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                          جاري التوليد...
                        </>
                      ) : (
                        <>
                          <FileText className="ml-2 h-4 w-4" />
                          توليد سياسة الخصوصية
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </form>
        </Form>

        {/* السياسات المولدة */}
        {policies && policies.length > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="text-2xl">السياسات المولدة</CardTitle>
              <CardDescription>قائمة بجميع سياسات الخصوصية التي تم توليدها</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {policies
                  .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
                  .map((policy) => (
                    <div
                      key={policy.id}
                      className="flex items-center justify-between p-4 border rounded-md hover-elevate"
                      data-testid={`card-policy-${policy.id}`}
                    >
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{policy.companyName}</h3>
                        <p className="text-sm text-muted-foreground">{policy.businessType}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(policy.createdAt!).toLocaleDateString('ar-SA')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {policy.status === "generating" || policy.status === "pending" ? (
                          <Badge variant="outline" className="gap-2">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            جاري التوليد
                          </Badge>
                        ) : policy.status === "completed" ? (
                          <>
                            <Badge variant="default">مكتمل</Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDownload(policy)}
                              data-testid={`button-download-${policy.id}`}
                            >
                              <Download className="h-4 w-4 ml-2" />
                              تنزيل
                            </Button>
                          </>
                        ) : (
                          <Badge variant="destructive">فشل</Badge>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
