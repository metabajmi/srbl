import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
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

const legalJustifications = [
  "explicit_consent",
  "contractual_obligation",
  "vital_interests",
  "public_interest",
  "legitimate_interests",
  "legal_obligation",
] as const;

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
  legalJustifications: z.array(z.string()).min(1, "يجب اختيار مسوغ نظامي واحد على الأقل"),
  dataCollectionMethods: z.string().optional(),
  indirectDataSources: z.string().optional(),
  dataUsageDetails: z.string().optional(),
  disclosureDetails: z.string().optional(),
  thirdPartyCategories: z.string().optional(),
  storageLocation: z.string().optional(),
  securityMeasures: z.string().optional(),
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
      legalJustifications: [],
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
      lastUpdatedDate: undefined,
    },
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
      legalBasis: values.legalJustifications.join(', '),
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
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-3 text-primary">نموذج تفصيلي لسياسة الخصوصية</h1>
          <div className="bg-muted/30 p-4 rounded-md border border-border">
            <p className="text-base text-foreground leading-relaxed">
              اسم الجهة
            </p>
            <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
              نبذة مختصـــرة عن مهام واختصاصــــات الجهة والخدمات المقدمة والفئة المستــــهدفة، ويمكنك التواصل معنا، عن طريق عدد من القنوات المتاحة، حسب بيانات التواصل الموضحة أدناه.
            </p>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* بيانات التواصل */}
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl text-primary">بيانات التواصل</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="responsibleDepartment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">القسم/ الفريق المختص:</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="bg-muted/40 min-h-10"
                          placeholder="                                                                                              "
                          data-testid="input-department"
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
                      <FormLabel className="text-base">العنـــــــــــــــــــــــوان:</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="bg-muted/40 min-h-10"
                          placeholder="                                                                                              "
                          data-testid="input-address"
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
                      <FormLabel className="text-base">رقــــــــــــم الهاتف:</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="bg-muted/40 min-h-10"
                          placeholder="                                                                                              "
                          dir="ltr"
                          data-testid="input-phone"
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
                      <FormLabel className="text-base">البريد الإلكـــــــــــــــتروني:</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          className="bg-muted/40 min-h-10"
                          placeholder="                                                                                              "
                          dir="ltr"
                          data-testid="input-email"
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
                      <FormLabel className="text-base">الترخيص أو السجل التجاري:</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="bg-muted/40 min-h-10"
                          placeholder="                                                                                              "
                          data-testid="input-license"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* تاريخ آخر تحديث */}
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl text-primary">تاريخ آخر تحديث</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  تم إجراء آخر تحديث على سياسة الخصوصية بتاريخ تاريخ آخر تحديث . ويمكنك الاطلاع على ســـجل التحديثات عن طريق، يمكن إضــــافة رابط أو أوراق جدول التحديثات في حال كانت السياسة وثيقة ورقية .
                </p>
                <FormField
                  control={form.control}
                  name="lastUpdatedDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>تاريخ آخر تحديث:</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-right font-normal bg-muted/40",
                                !field.value && "text-muted-foreground"
                              )}
                              data-testid="button-date-picker"
                            >
                              {field.value ? (
                                format(field.value, "PPP", { locale: ar })
                              ) : (
                                <span>اختر التاريخ</span>
                              )}
                              <Calendar className="mr-auto h-4 w-4 opacity-50" />
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
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* ما هي البيانات الشخصية التي يتم جمعها؟ */}
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl text-primary">ما هي البيانات الشخصية التي يتم جمعها؟</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  نقوم بجمع ومعالجة البيانات الشخصية التالية:
                </p>
                <FormField
                  control={form.control}
                  name="dataTypes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm text-muted-foreground">
                        أضــــف البيانات التي يتم جمعها، ويمكن تقســـــيمها إلى فئات، على سبـــيل المثال، البيانات الرئيسية، بيانات التواصل
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          className="min-h-24 bg-muted/40"
                          placeholder="مثال: الاسم، البريد الإلكتروني، رقم الهاتف، العنوان"
                          data-testid="input-data-types"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* كيف يتم جمع بياناتك الشخصية وما هو الغرض من جمعها؟ */}
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl text-primary">كيف يتم جمع بياناتك الشخصية وما هو الغرض من جمعها؟</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                    بعض البيانات الشخصـــية التي نقوم بمعالجتها يتم الحصـــول عليها عن طريقك مباشـــرة باستخدام أحد وسيلة الجمع وذلك للأغراض الآتية:
                  </p>
                  <FormField
                    control={form.control}
                    name="dataCollectionMethods"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm text-muted-foreground">
                          أضــــف الأغراض التي من أجلها يتم جمع البيانات الشخصـــية، ويمكن تقســــيمها إلى فئات حسب أنواع البيانات
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            className="min-h-24 bg-muted/40"
                            placeholder="مثال: بشكل مباشر عند التسجيل في الموقع، عند طلب الخدمة..."
                            data-testid="input-collection-methods"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                    كما نقوم بالحصول على بعض البيانات الشخصية بطريقة غير مباشرة، من المصادر الآتية:
                  </p>
                  <FormField
                    control={form.control}
                    name="indirectDataSources"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm text-muted-foreground">
                          أضـــف المصـــادر التي يتم من خلالها جمع البيانات الشخصـــية بصـــورة غير مباشـــرة، ووسيلة الجمع، مع ذكر الغرض من الجمع، كما يمكن تقسيمها إلى فئات حسب أنواع البيانات ومصادرها
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            className="min-h-24 bg-muted/40"
                            placeholder="مثال: شركاء الأعمال، وسائل التواصل الاجتماعي..."
                            data-testid="input-indirect-sources"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* كيف نستخدم بياناتك الشخصية؟ */}
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl text-primary">كيف نستخدم بياناتك الشخصية؟</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                  نستخدم البيانات الشخصية التي تم جمعها بشكل مباشر أو غير مباشر على النحو الآتي:
                </p>
                <FormField
                  control={form.control}
                  name="dataUsageDetails"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm text-muted-foreground">
                        أضف كيفية استخدامك للبيانات الشخصية
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          className="min-h-24 bg-muted/40"
                          placeholder="مثال: لتحسين الخدمات، للتواصل معك، لتحليل الاستخدام..."
                          data-testid="input-usage-details"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* كيف نفصح عن بياناتك الشخصية؟ */}
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl text-primary">كيف نفصح عن بياناتك الشخصية؟</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  لن نفصح عن بياناتك الشخصية لأي طرف آخر لأغراض التسويق المباشر أو قد نفصح عن بياناتك الشخصية مع الجهات الآتية:
                </p>
                <FormField
                  control={form.control}
                  name="disclosureDetails"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm text-muted-foreground">
                        أضـــف الجهات التي سيتم الإفصاح عن البيانات الشخصـــية إليها مع ذكر الغرض لكل نوع من أنواع البيانات
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          className="min-h-24 bg-muted/40"
                          placeholder="مثال: مزودي الخدمات، الجهات الحكومية عند الطلب..."
                          data-testid="input-disclosure-details"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* المسوغات النظامية */}
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl text-primary">المسوغات النظامية لجمع ومعالجة بياناتك الشخصية</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                  وفقاً لنظام حماية البيانات الشخصــــية، فإن المســــوغ النظامي الذي نعتمد عليه لمعالجة هذه البيانات: يمكن اختيار مسوغ نظامي واحد أو أكثر من المسوغات الموضحة أدناه
                </p>
                <FormField
                  control={form.control}
                  name="legalJustifications"
                  render={() => (
                    <FormItem>
                      <div className="space-y-3">
                        <FormField
                          control={form.control}
                          name="legalJustifications"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 bg-muted/20 p-4 rounded-md border">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes("explicit_consent")}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, "explicit_consent"])
                                      : field.onChange(field.value?.filter((value) => value !== "explicit_consent"))
                                  }}
                                  data-testid="checkbox-explicit-consent"
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none flex-1">
                                <FormLabel className="text-sm font-normal cursor-pointer">
                                  موافقتك الصــــريحة. ويمكنك العدول عن الموافقة في أي وقت على ألا يؤثر على عمليات المعالجة التي تتم بناء على مســــوغات نظامية أخرى، وللقيام بذلك يمكنك التواصل مع اسم الإدارة أو القسم المختص، أو مسؤول حماية البيانات الشخصية
                                </FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="legalJustifications"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 bg-muted/20 p-4 rounded-md border">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes("contractual_obligation")}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, "contractual_obligation"])
                                      : field.onChange(field.value?.filter((value) => value !== "contractual_obligation"))
                                  }}
                                  data-testid="checkbox-contractual-obligation"
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none flex-1">
                                <FormLabel className="text-sm font-normal cursor-pointer">
                                  تنفيذاً للالتزام تعاقدي يتم إيضـــاح هذا الالتزام وأهمية الوفاء به
                                </FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="legalJustifications"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 bg-muted/20 p-4 rounded-md border">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes("vital_interests")}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, "vital_interests"])
                                      : field.onChange(field.value?.filter((value) => value !== "vital_interests"))
                                  }}
                                  data-testid="checkbox-vital-interests"
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none flex-1">
                                <FormLabel className="text-sm font-normal cursor-pointer">
                                  حماية المصـــالح الحيوية يتم إيضـــاح كيفية حماية المصـــالح الحيوية عن طريق جمع ومعالجة البيانات الشخصية
                                </FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="legalJustifications"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 bg-muted/20 p-4 rounded-md border">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes("public_interest")}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, "public_interest"])
                                      : field.onChange(field.value?.filter((value) => value !== "public_interest"))
                                  }}
                                  data-testid="checkbox-public-interest"
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none flex-1">
                                <FormLabel className="text-sm font-normal cursor-pointer">
                                  تحقيق مصـــلحة عامة يتم إيضـــاح المصـــلحة العامة التي يتم تحقيقها عن طريق جمع ومعالجة البيانات الشخصية
                                </FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="legalJustifications"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 bg-muted/20 p-4 rounded-md border">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes("legitimate_interests")}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, "legitimate_interests"])
                                      : field.onChange(field.value?.filter((value) => value !== "legitimate_interests"))
                                  }}
                                  data-testid="checkbox-legitimate-interests"
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none flex-1">
                                <FormLabel className="text-sm font-normal cursor-pointer">
                                  تحقيق مصالح أو أهداف مشروعة يتم إيضاح الأهداف المشروعة التي لا تتعارض مع حقوق صاحب البيانات الشخصية
                                </FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="legalJustifications"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 bg-muted/20 p-4 rounded-md border">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes("legal_obligation")}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, "legal_obligation"])
                                      : field.onChange(field.value?.filter((value) => value !== "legal_obligation"))
                                  }}
                                  data-testid="checkbox-legal-obligation"
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none flex-1">
                                <FormLabel className="text-sm font-normal cursor-pointer">
                                  تنفيذاً للالتزام نظامي يتم إيضاح اسم النظام والمادة التي تخول الجهة بجمع ومعالجة البيانات الشخصية
                                </FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* كيف نقوم بتخزين بياناتك الشخصية؟ */}
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl text-primary">كيف نقوم بتخزين بياناتك الشخصية؟</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                    يتم تخزين بياناتك الشخصـــية بشكل آمن وذلك في مقر/ أو لدى مقدم خدمات الحوسبة السحابية أضف الموقع الذي يتم فيه تخزين أو استضافة البيانات الشخصية.
                  </p>
                  <FormField
                    control={form.control}
                    name="storageLocation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm text-muted-foreground">موقع التخزين:</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="bg-muted/40 min-h-10"
                            placeholder="مثال: داخل المملكة العربية السعودية"
                            data-testid="input-storage-location"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                    كما نحتفظ بـ تحديد نوع البيانات الشخصية لمدة الفترة الزمنية بالشهور. وستقوم بعد ذلك بالتخلص من هذه البيانات بطريقة آمنة لا يمكن من خلالها الاطلاع عليها أو اســــتعادتها مرة أخرى، وذلك عن طريق كيف ســــيتم إتلاف البيانات يتم تحديد فترة الاحتفاظ لكل نوع من البيانات على حدة.
                  </p>
                  <FormField
                    control={form.control}
                    name="retentionPeriod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm text-muted-foreground">مدة الاحتفاظ:</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="bg-muted/40 min-h-10"
                            placeholder="مثال: سنتان من آخر نشاط"
                            data-testid="input-retention"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div>
                  <FormField
                    control={form.control}
                    name="securityMeasures"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm text-muted-foreground">إجراءات الحماية والأمان:</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            className="min-h-24 bg-muted/40"
                            placeholder="مثال: التشفير، التحكم في الوصول، النسخ الاحتياطي..."
                            data-testid="input-security-measures"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* حقوقك فيما يتعلق بمعالجة بياناتك الشخصية */}
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl text-primary">حقوقك فيما يتعلق بمعالجة بياناتك الشخصية</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                  بموجب نظام حماية البيانات الشخصية، فإن لديك الحقوق الآتية، والتي تعتمد بشكل أساسي على الغرض من جمع ومعالجة البيانات الشخصية:
                </p>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-base font-semibold mb-2">الحق في العلم:</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      يحق لك معرفة طرق جمعاً لبياناتك الشخصـــية والمسوغ النظامي لجمعها ومعالجتها، وكيفية معالجتها وحفظها وإتلافها ومن ســــيتم الإفصـــاح عنها، ويمكنك الاطلاع على كافة التفاصيل من خلال سياسة الخصوصية أو يمكنك التواصل معنا على البيانات الموضحة أدناه. إيضاح القيود على الحق في العلم بلغة مبسطة .
                    </p>
                  </div>
                  <div>
                    <h4 className="text-base font-semibold mb-2">الحق في الوصــــول إلى بياناتك الشخصـــية:</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      يحق لك أن تطلب منا الاطلاع على بياناتك الشخصية، وذلك عن طريق الوسيلة التي يتم من خلالها الاطلاع على البيانات الشخصية . إيضاح القيود على الحق في الوصول بلغة مبسطة .
                    </p>
                  </div>
                  <div>
                    <h4 className="text-base font-semibold mb-2">الحق في طلب الحصـــول على بياناتك الشخصـــية:</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      يحق لك طلب الحصـــول على بياناتك الشخصـــية المتوفرة لدى جهة التحكم بصــــيغة مقروءة وواضحـــة متى ما كان ذلك ممكناً من الناحية التقنية، وذلك عن طريق الوســـيلة التي يتم من خلالها تزويد صاحب البيانات الشخصــــية ببياناته . إيضـــاح القيود على الحق في الحصـــول بلغة مبسطة والتي تســـري على الحصـــول، وفيما من القيود والاستثنائات، إن وجدت .
                    </p>
                  </div>
                  <div>
                    <h4 className="text-base font-semibold mb-2">الحق في تصـــحيح بياناتك الشخصـــية:</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      يحق لك أن تطلب منا تصـــحيح بياناتك الشخصـــية التي ترى أنها غير دقيقة أو غير صـــحيحة أو غير مكتملة، وذلك عن طريق الوسيلة التي من خلالها يمكن طلب التصحيح . وسيتم مراجعتها وتحديثها خلال عدد الأيام . وســــيتم إشعارك بذلك عن طريق الوســــيلة التي يتم من خلالها تمكين صاحب البيانات الشخصية من الاطلاع على بياناته .
                    </p>
                  </div>
                  <div>
                    <h4 className="text-base font-semibold mb-2">الحق في إتلاف بياناتك الشخصية:</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      يحق لك أن تطلب منا إتلاف بياناتك الشخصــــية في ظروف معينة يتم إيضـــاح الحالات الممكنة بما لا يتعارض مع المســـوغات النظامية، والقيود الواردة على الحق في الإتلاف .
                    </p>
                  </div>
                  <div>
                    <h4 className="text-base font-semibold mb-2">الحق في الرجوع عن موافقتك على معالجة بياناتك الشخصية:</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      يحق لك الرجوع عن موافقتك على معالجة بياناتك الشخصـــية -في أي وقت- ما لم تكن هناك مســـوغات نظامية تتطلب عكس ذلك.
                    </p>
                  </div>
                  <div className="bg-muted/20 p-4 rounded-md border mt-4">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      ما عدا ما هو منصوص عليه نظاماً، لن تكون مطالباً بدفع أي رسوم مقابل ممارسة هذه الحقوق. وفي حال تم تقديم طلب لممارسة أحد هذه الحقوق، سيتم الرد عليك خلال عدد الأيام من تاريخ استلام الطلب كاملاً.
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed mt-3">
                      ولمزيد من التفاصــــيل عن معالجة بياناتك الشخصــــية، وكيفية ممارســــة حقوقك، يمكنك التواصل مع مسؤول حماية البيانات الشخصية بـ الجهة ، حسب بيانات التواصل الموضحة أدناه.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* مسؤول حماية البيانات الشخصية */}
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl text-primary">مسؤول حماية البيانات الشخصية</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="dpoName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">الاســـــــــــــــــــــم:</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="bg-muted/40 min-h-10"
                          placeholder="                                                                                              "
                          data-testid="input-dpo-name"
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
                      <FormLabel className="text-base">العنـــــــــــــــــــــوان:</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="bg-muted/40 min-h-10"
                          placeholder="                                                                                              "
                          data-testid="input-dpo-address"
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
                      <FormLabel className="text-base">رقـــــــم الهاتف:</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="bg-muted/40 min-h-10"
                          placeholder="                                                                                              "
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
                  name="dpoEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">البريد الإلكتروني:</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          className="bg-muted/40 min-h-10"
                          placeholder="                                                                                              "
                          dir="ltr"
                          data-testid="input-dpo-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* كيف تقدم شكوى أو اعتراضاً؟ */}
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl text-primary">كيف تقدم شكوى أو اعتراضاً؟</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    في حال وجود بعض المخاوف أو عدم التزامنا بنظام حماية البيانات الشخصــــية، يمكنك تقديم شكـــوى إلى أضــــف اســــم الإدارة أو القســــم المختص بمعالجة الشكاوى وذلك باســــتخدام إحدى القنوات التالية أضــــف وســــيلة وبيانات التواصـــل الخاصة باستقبال الشكاوى والاستفسارات.
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    إذا لم تكن راضــــياً عن معالجتنا للشكـــوى أو في حال عدم ردنا خلال عدد الأيام، يمكنك تقديم شكــــوى إلى الجهة المختصـــة أضـــف اســــم الهيئة الســـعودية للبيانات والذكاء الاصطناعي.
                  </p>
                </div>
              </CardContent>
            </Card>


            {/* معلومات إضافية - مخفية لكن مطلوبة */}
            <div className="hidden">
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input {...field} data-testid="input-company-name" />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="websiteUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input {...field} data-testid="input-website-url" />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="businessType"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input {...field} data-testid="input-business-type" />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dataUsagePurposes"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea {...field} data-testid="input-data-usage-purposes" />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="hasThirdPartySharing"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input {...field} data-testid="input-third-party-sharing" />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-center pt-4">
              <Button
                type="submit"
                size="lg"
                disabled={generateMutation.isPending}
                className="min-w-[200px]"
                data-testid="button-generate"
              >
                {generateMutation.isPending ? (
                  <>
                    <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                    جاري التوليد...
                  </>
                ) : (
                  <>
                    <FileText className="ml-2 h-5 w-5" />
                    توليد سياسة الخصوصية
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>

        {/* Generated Policies */}
        {policies && policies.length > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>سياسات الخصوصية المُولّدة</CardTitle>
              <CardDescription>
                السياسات التي تم توليدها سابقاً
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {policies.map((policy: PolicyDocument) => (
                  <div
                    key={policy.id}
                    className="flex items-center justify-between p-4 border rounded-md hover-elevate"
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold">{policy.companyName}</h3>
                      <p className="text-sm text-muted-foreground">
                        {policy.websiteUrl}
                      </p>
                      <div className="flex gap-2 mt-2">
                        <Badge variant={
                          policy.status === "completed" ? "default" :
                          policy.status === "generating" || policy.status === "pending" ? "secondary" :
                          "destructive"
                        }>
                          {policy.status === "completed" ? "مكتمل" :
                           policy.status === "generating" ? "جاري التوليد" :
                           policy.status === "pending" ? "في الانتظار" :
                           "فشل"}
                        </Badge>
                        <Badge variant="outline">
                          {new Date(policy.createdAt!).toLocaleDateString('ar-SA')}
                        </Badge>
                      </div>
                    </div>
                    {policy.status === "completed" && policy.generatedContent && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(policy)}
                        data-testid={`button-download-${policy.id}`}
                      >
                        <Download className="ml-2 h-4 w-4" />
                        تحميل
                      </Button>
                    )}
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
