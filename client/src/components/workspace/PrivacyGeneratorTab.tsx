import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { FileText, Loader2, Download, AlertCircle, CheckCircle2, Lock, CreditCard, Unlock, ChevronLeft, ChevronRight, Building2, Database, HardDrive, MessageSquare, Sparkles, X } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { type PolicyDocument } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { z } from "zod";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { useScanContext } from "@/contexts/ScanContext";
import { useLocation } from "wouter";
import MoyasarPayment from "@/components/MoyasarPayment";
import { OTPModal } from "@/components/OTPModal";

const isAuthenticated = (): boolean => {
  try {
    const userStr = localStorage.getItem("user");
    if (userStr && userStr !== "undefined" && userStr !== "null") {
      const user = JSON.parse(userStr);
      return !!user.id;
    }
  } catch (e) {
    return false;
  }
  return false;
};

const POLICY_PRICE_SAR = 99;
const POLICY_PRICE_HALALAS = POLICY_PRICE_SAR * 100;

const formSchema = z.object({
  company_name: z.string().min(2, "يجب إدخال اسم الجهة"),
  activity_type: z.enum(["ecommerce", "fintech", "health", "education", "other"], {
    required_error: "يجب تحديد نوع النشاط"
  }),
  service_description: z.string().min(10, "يجب وصف الخدمة بشكل مختصر"),
  cr_number: z.string().min(1, "يجب إدخال رقم السجل التجاري"),
  contact_address: z.string().min(5, "يجب إدخال العنوان"),
  contact_email: z.string().email("يجب إدخال بريد إلكتروني صحيح"),
  contact_phone: z.string().min(9, "يجب إدخال رقم الهاتف"),
  has_dpo: z.boolean().default(false),
  dpo_name: z.string().optional(),
  dpo_email: z.string().email("يجب إدخال بريد إلكتروني صحيح").optional().or(z.literal("")),
  dpo_phone: z.string().optional(),
  data_collected: z.array(z.string()).min(1, "يجب اختيار نوع واحد على الأقل"),
  collection_methods: z.array(z.string()).min(1, "يجب اختيار طريقة واحدة على الأقل"),
  storage_location: z.enum(["inside_ksa", "outside_ksa"], {
    required_error: "يجب تحديد موقع التخزين"
  }),
  retention_period: z.enum(["delete_immediately", "specific_period", "statutory_period"], {
    required_error: "يجب تحديد مدة الاحتفاظ"
  }),
  retention_period_value: z.string().optional(),
  data_sharing: z.enum(["no_sharing", "service_providers", "government_entities"], {
    required_error: "يجب تحديد سياسة المشاركة"
  }),
  complaint_dept: z.enum(["customer_service", "legal_dept", "compliance_dept"], {
    required_error: "يجب تحديد قسم الشكاوى"
  }),
});

type FormValues = z.infer<typeof formSchema>;

const DATA_TYPES = [
  { id: "identity", label: "بيانات الهوية", labelEn: "Identity Data" },
  { id: "contact", label: "بيانات التواصل", labelEn: "Contact Data" },
  { id: "financial", label: "بيانات مالية", labelEn: "Financial Data" },
  { id: "location", label: "بيانات الموقع", labelEn: "Location Data" },
  { id: "technical", label: "بيانات تقنية (ملفات الارتباط/IP)", labelEn: "Technical Data (Cookies/IP)" },
  { id: "sensitive", label: "بيانات حساسة/صحية", labelEn: "Sensitive/Health Data" },
];

const COLLECTION_METHODS = [
  { id: "direct", label: "مباشرة (النماذج)", labelEn: "Direct (Forms)" },
  { id: "automated", label: "آلية (ملفات الارتباط)", labelEn: "Automated (Cookies)" },
  { id: "third_party", label: "طرف ثالث", labelEn: "Third Party" },
];

type AutoFilledFields = {
  [key: string]: boolean;
};

function AutoDetectedBadge({ onClear }: { onClear?: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full mr-2">
      <Sparkles className="w-3 h-3" />
      <span>تم الكشف تلقائياً</span>
      {onClear && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            onClear();
          }}
          className="hover:bg-primary/20 rounded-full p-0.5 mr-1"
          data-testid="button-clear-autofill"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
}

const ACTIVITY_TYPES = [
  { value: "ecommerce", label: "تجارة إلكترونية" },
  { value: "fintech", label: "تقنية مالية" },
  { value: "health", label: "صحة" },
  { value: "education", label: "تعليم" },
  { value: "other", label: "أخرى" },
];

export default function PrivacyGeneratorTab() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const { scanData, hasScanData } = useScanContext();
  const [lastPreFilledScanId, setLastPreFilledScanId] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(isAuthenticated());
  const [paymentRequestId, setPaymentRequestId] = useState<string | null>(null);
  const [isPaymentComplete, setIsPaymentComplete] = useState(false);
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [autoFilledFields, setAutoFilledFields] = useState<AutoFilledFields>({});

  useEffect(() => {
    const checkAuth = () => setIsLoggedIn(isAuthenticated());
    window.addEventListener('storage', checkAuth);
    const interval = setInterval(checkAuth, 1000);
    return () => {
      window.removeEventListener('storage', checkAuth);
      clearInterval(interval);
    };
  }, []);

  const handleOTPSuccess = () => {
    setIsLoggedIn(true);
    toast({
      title: "مرحباً بك!",
      description: "يمكنك الآن إنشاء سياسة الخصوصية",
    });
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      company_name: "",
      activity_type: undefined,
      service_description: "",
      cr_number: "",
      contact_address: "",
      contact_email: "",
      contact_phone: "",
      has_dpo: false,
      dpo_name: "",
      dpo_email: "",
      dpo_phone: "",
      data_collected: [],
      collection_methods: [],
      storage_location: undefined,
      retention_period: undefined,
      retention_period_value: "",
      data_sharing: undefined,
      complaint_dept: undefined,
    },
  });

  useEffect(() => {
    if (hasScanData && scanData && scanData.scanId !== lastPreFilledScanId) {
      const newAutoFilled: AutoFilledFields = {};
      const insights = scanData.policyInsights;
      
      // Pre-fill company name
      if (scanData.companyName && !form.getValues("company_name")) {
        form.setValue("company_name", scanData.companyName);
        newAutoFilled.company_name = true;
      }
      
      // Pre-fill contact email from policy insights first, then fallback to scanData
      const detectedEmail = insights?.detectedEmails?.[0] || scanData.contactEmail;
      if (detectedEmail && !form.getValues("contact_email")) {
        form.setValue("contact_email", detectedEmail);
        newAutoFilled.contact_email = true;
      }
      
      // Pre-fill contact phone from policy insights first, then fallback to scanData
      const detectedPhone = insights?.detectedPhones?.[0] || scanData.contactPhone;
      if (detectedPhone && !form.getValues("contact_phone")) {
        form.setValue("contact_phone", detectedPhone);
        newAutoFilled.contact_phone = true;
      }
      
      // Pre-fill activity type based on businessType
      if (scanData.businessType && !form.getValues("activity_type")) {
        const businessTypeMap: { [key: string]: "ecommerce" | "fintech" | "health" | "education" | "other" } = {
          "ecommerce_general": "ecommerce",
          "financial_services": "fintech",
          "healthcare": "health",
          "education": "education",
          "digital_services": "other",
          "technology": "other",
        };
        const mappedType = businessTypeMap[scanData.businessType] || "other";
        form.setValue("activity_type", mappedType);
        newAutoFilled.activity_type = true;
      }
      
      // Pre-fill service description from policy insights
      if (insights?.serviceDescription && !form.getValues("service_description")) {
        form.setValue("service_description", insights.serviceDescription);
        newAutoFilled.service_description = true;
      }
      
      // Pre-fill collection methods from policy insights first, then fallback to basic scan findings
      let detectedMethods: string[] = [];
      if (insights?.detectedCollectionMethods && insights.detectedCollectionMethods.length > 0) {
        detectedMethods = [...insights.detectedCollectionMethods];
      } else {
        if (scanData.hasCookieBanner) detectedMethods.push("automated");
        if (scanData.hasContactInfo) detectedMethods.push("direct");
      }
      if (detectedMethods.length > 0 && form.getValues("collection_methods").length === 0) {
        form.setValue("collection_methods", detectedMethods);
        newAutoFilled.collection_methods = true;
      }
      
      // Pre-fill data collected from policy insights first, then fallback to basic scan findings
      let detectedDataTypes: string[] = [];
      if (insights?.detectedDataTypes && insights.detectedDataTypes.length > 0) {
        detectedDataTypes = [...insights.detectedDataTypes];
      } else {
        if (scanData.hasCookieBanner) detectedDataTypes.push("technical");
        if (scanData.hasContactInfo) {
          detectedDataTypes.push("contact");
          detectedDataTypes.push("identity");
        }
      }
      if (detectedDataTypes.length > 0 && form.getValues("data_collected").length === 0) {
        form.setValue("data_collected", detectedDataTypes);
        newAutoFilled.data_collected = true;
      }
      
      // Pre-fill storage location from policy insights
      if (insights?.storageLocation && !form.getValues("storage_location")) {
        form.setValue("storage_location", insights.storageLocation);
        newAutoFilled.storage_location = true;
      }
      
      // Pre-fill retention period from policy insights
      if (insights?.retentionPeriod && !form.getValues("retention_period")) {
        form.setValue("retention_period", insights.retentionPeriod);
        newAutoFilled.retention_period = true;
      }
      
      // Pre-fill data sharing from policy insights
      if (insights?.dataSharingType && !form.getValues("data_sharing")) {
        form.setValue("data_sharing", insights.dataSharingType);
        newAutoFilled.data_sharing = true;
      }
      
      // Pre-fill DPO info from policy insights
      if (insights?.hasDPO && !form.getValues("has_dpo")) {
        form.setValue("has_dpo", true);
        newAutoFilled.has_dpo = true;
        if (insights.dpoEmail) {
          form.setValue("dpo_email", insights.dpoEmail);
          newAutoFilled.dpo_email = true;
        }
      }
      
      setAutoFilledFields(newAutoFilled);
      setLastPreFilledScanId(scanData.scanId);
      
      const autoFilledCount = Object.keys(newAutoFilled).length;
      if (autoFilledCount > 0) {
        toast({
          title: "تم ملء البيانات تلقائياً من سياسة الخصوصية",
          description: `تم تعبئة ${autoFilledCount} حقول من بيانات سياسة الخصوصية لموقع ${scanData.websiteUrl}`,
        });
      }
    }
  }, [hasScanData, scanData, lastPreFilledScanId, form, toast]);

  const { data: policies } = useQuery<PolicyDocument[]>({
    queryKey: ["/api/user/policies"],
    enabled: isLoggedIn,
    refetchInterval: (query) => {
      const data = query.state.data as PolicyDocument[] | undefined;
      if (!data || !Array.isArray(data)) return false;
      const hasGenerating = data.some((p) => p.status === "generating" || p.status === "pending");
      return hasGenerating ? 2000 : false;
    },
  });

  const createPolicyRequestMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const response = await apiRequest("POST", "/api/policy-requests", {
        scanId: scanData?.scanId || null,
        intakeData: data,
      });
      return await response.json();
    },
    onSuccess: async (result) => {
      setPaymentRequestId(result.id);
      
      // ========== BYPASS MODE FOR TESTING ==========
      // Skip payment and generate directly
      setIsGenerating(true);
      try {
        const verifyResponse = await apiRequest("POST", "/api/payments/verify", {
          paymentId: "BYPASS_TEST",
          requestId: result.id,
        });
        
        if (verifyResponse.ok) {
          const generateResponse = await apiRequest("POST", `/api/policy-requests/${result.id}/generate`, {});
          
          if (generateResponse.ok) {
            toast({
              title: "جاري توليد السياسة",
              description: "سيتم توليد سياسة الخصوصية خلال لحظات...",
            });
            queryClient.invalidateQueries({ queryKey: ["/api/user/policies"] });
            form.reset();
            setCurrentStep(1);
          } else {
            throw new Error("فشل في بدء توليد السياسة");
          }
        }
      } catch (error: any) {
        toast({
          title: "خطأ",
          description: error.message || "حدث خطأ أثناء معالجة الطلب",
          variant: "destructive",
        });
      } finally {
        setIsGenerating(false);
      }
      // ========== END BYPASS MODE ==========
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ أثناء إنشاء الطلب",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: FormValues) => {
    if (!isLoggedIn) {
      setShowOTPModal(true);
      return;
    }
    
    createPolicyRequestMutation.mutate(values);
  };

  const validateStep = (step: number): boolean => {
    const values = form.getValues();
    
    switch (step) {
      case 1:
        return !!(values.company_name && values.activity_type && values.service_description && 
                  values.cr_number && values.contact_address && values.contact_email && values.contact_phone);
      case 2:
        return values.data_collected.length > 0 && values.collection_methods.length > 0;
      case 3:
        return !!(values.storage_location && values.retention_period && values.data_sharing);
      case 4:
        return !!values.complaint_dept;
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
    } else {
      toast({
        title: "أكمل البيانات المطلوبة",
        description: "يرجى ملء جميع الحقول الإلزامية",
        variant: "destructive",
      });
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
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
        h1 { color: #16a34a; text-align: center; border-bottom: 3px solid #16a34a; padding-bottom: 20px; }
        h2 { color: #15803d; border-right: 5px solid #22c55e; padding-right: 15px; margin-top: 30px; }
        .header { text-align: center; margin-bottom: 40px; padding: 30px; background: linear-gradient(135deg, #16a34a, #22c55e); color: white; border-radius: 10px; }
        .header h1 { color: white; border-bottom: none; }
        .content { background: #fff; padding: 40px; border-radius: 10px; }
        .footer { margin-top: 50px; padding-top: 30px; border-top: 2px solid #e5e7eb; text-align: center; color: #6b7280; }
        ul { list-style-type: disc; padding-right: 20px; }
        li { margin-bottom: 8px; }
        @media print { body { padding: 20px; } .header { background: #16a34a !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
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
        <p>تم توليدها وفقاً لنظام حماية البيانات الشخصية السعودي (PDPL)</p>
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
    } else if (format === 'word') {
      const wordContent = `
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
<meta charset="UTF-8">
<style>
body { font-family: 'Cairo', 'Arial', sans-serif; direction: rtl; text-align: right; line-height: 1.8; }
h1 { color: #16a34a; text-align: center; }
h2 { color: #15803d; border-right: 5px solid #22c55e; padding-right: 15px; }
</style>
</head>
<body dir="rtl">
<h1>سياسة الخصوصية</h1>
<p style="text-align: center; font-weight: bold;">${policy.companyName}</p>
<p style="text-align: center; color: #6b7280;">تاريخ الإصدار: ${new Date(policy.createdAt!).toLocaleDateString('ar-SA')}</p>
<hr/>
${policy.generatedContent}
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
    }
  };

  const watchHasDpo = form.watch("has_dpo");
  const watchRetentionPeriod = form.watch("retention_period");

  const clearAutoFill = (fieldName: string) => {
    setAutoFilledFields(prev => {
      const updated = { ...prev };
      delete updated[fieldName];
      return updated;
    });
  };

  const steps = [
    { number: 1, title: "هوية الجهة", icon: Building2 },
    { number: 2, title: "خريطة البيانات", icon: Database },
    { number: 3, title: "التخزين والمشاركة", icon: HardDrive },
    { number: 4, title: "الشكاوى", icon: MessageSquare },
  ];

  return (
    <div className="space-y-6">
      {!isLoggedIn && (
        <Card className="mb-6 border-primary/30">
          <CardContent className="pt-6">
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2">تحقق من هويتك لإنشاء سياسة خصوصية</h3>
              <p className="text-muted-foreground mb-4">
                أنشئ سياسة خصوصية متوافقة مع نظام حماية البيانات الشخصية السعودي
              </p>
              <Button 
                onClick={() => setShowOTPModal(true)} 
                size="lg" 
                className="min-w-[200px]"
                data-testid="button-unlock-policy"
              >
                <Unlock className="h-5 w-5 ml-2" />
                التحقق والمتابعة
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <OTPModal
        open={showOTPModal}
        onOpenChange={setShowOTPModal}
        onSuccess={handleOTPSuccess}
      />

      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center flex-1">
              <div 
                className={cn(
                  "flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all cursor-pointer",
                  currentStep === step.number 
                    ? "bg-primary text-primary-foreground border-primary" 
                    : currentStep > step.number
                    ? "bg-green-500 text-white border-green-500"
                    : "bg-muted text-muted-foreground border-muted-foreground/30"
                )}
                onClick={() => step.number < currentStep && setCurrentStep(step.number)}
                data-testid={`step-indicator-${step.number}`}
              >
                {currentStep > step.number ? (
                  <CheckCircle2 className="w-6 h-6" />
                ) : (
                  <step.icon className="w-5 h-5" />
                )}
              </div>
              {index < steps.length - 1 && (
                <div 
                  className={cn(
                    "flex-1 h-1 mx-2",
                    currentStep > step.number ? "bg-green-500" : "bg-muted"
                  )}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between">
          {steps.map((step) => (
            <div key={step.number} className="text-center flex-1">
              <span className={cn(
                "text-sm font-medium",
                currentStep === step.number ? "text-primary" : "text-muted-foreground"
              )}>
                {step.title}
              </span>
            </div>
          ))}
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  الخطوة ١: هوية الجهة
                </CardTitle>
                <CardDescription>
                  معلومات أساسية عن جهتك ومسؤول حماية البيانات
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="company_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          اسم الجهة *
                          {autoFilledFields.company_name && (
                            <AutoDetectedBadge onClear={() => clearAutoFill("company_name")} />
                          )}
                        </FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="الاسم الرسمي للجهة" 
                            data-testid="input-company-name"
                            className={autoFilledFields.company_name ? "border-primary/50 bg-primary/5" : ""}
                            onChange={(e) => {
                              field.onChange(e);
                              if (autoFilledFields.company_name) clearAutoFill("company_name");
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="activity_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          نوع النشاط *
                          {autoFilledFields.activity_type && (
                            <AutoDetectedBadge onClear={() => clearAutoFill("activity_type")} />
                          )}
                        </FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            if (autoFilledFields.activity_type) clearAutoFill("activity_type");
                          }} 
                          defaultValue={field.value}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger 
                              data-testid="select-activity-type"
                              className={autoFilledFields.activity_type ? "border-primary/50 bg-primary/5" : ""}
                            >
                              <SelectValue placeholder="اختر نوع النشاط" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {ACTIVITY_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="service_description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>وصف الخدمة *</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="وصف مختصر للخدمات المقدمة" data-testid="input-service-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="cr_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>رقم السجل التجاري / الترخيص *</FormLabel>
                        <FormControl>
                          <Input {...field} dir="ltr" placeholder="1010XXXXXX" data-testid="input-cr-number" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contact_phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          رقم الهاتف *
                          {autoFilledFields.contact_phone && (
                            <AutoDetectedBadge onClear={() => clearAutoFill("contact_phone")} />
                          )}
                        </FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            dir="ltr" 
                            placeholder="+966 XX XXX XXXX" 
                            data-testid="input-phone"
                            className={autoFilledFields.contact_phone ? "border-primary/50 bg-primary/5" : ""}
                            onChange={(e) => {
                              field.onChange(e);
                              if (autoFilledFields.contact_phone) clearAutoFill("contact_phone");
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="contact_address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>العنوان *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="العنوان الكامل" data-testid="input-address" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contact_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        البريد الإلكتروني *
                        {autoFilledFields.contact_email && (
                          <AutoDetectedBadge onClear={() => clearAutoFill("contact_email")} />
                        )}
                      </FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="email" 
                          dir="ltr" 
                          placeholder="email@example.com" 
                          data-testid="input-email"
                          className={autoFilledFields.contact_email ? "border-primary/50 bg-primary/5" : ""}
                          onChange={(e) => {
                            field.onChange(e);
                            if (autoFilledFields.contact_email) clearAutoFill("contact_email");
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="border rounded-lg p-4 space-y-4">
                  <FormField
                    control={form.control}
                    name="has_dpo"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-x-reverse">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-has-dpo"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>لدينا مسؤول حماية بيانات (DPO)</FormLabel>
                          <FormDescription>
                            إذا كان لديك مسؤول معين لحماية البيانات الشخصية
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  {watchHasDpo && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                      <FormField
                        control={form.control}
                        name="dpo_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>اسم المسؤول</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="الاسم الكامل" data-testid="input-dpo-name" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="dpo_email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>البريد الإلكتروني</FormLabel>
                            <FormControl>
                              <Input {...field} type="email" dir="ltr" placeholder="dpo@example.com" data-testid="input-dpo-email" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="dpo_phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>رقم الهاتف</FormLabel>
                            <FormControl>
                              <Input {...field} dir="ltr" placeholder="+966" data-testid="input-dpo-phone" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  الخطوة ٢: خريطة البيانات
                </CardTitle>
                <CardDescription>
                  حدد أنواع البيانات التي تجمعها وطرق جمعها
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="data_collected"
                  render={() => (
                    <FormItem>
                      <FormLabel className="text-base flex items-center gap-2">
                        أنواع البيانات المجمعة *
                        {autoFilledFields.data_collected && (
                          <AutoDetectedBadge onClear={() => clearAutoFill("data_collected")} />
                        )}
                      </FormLabel>
                      <FormDescription>
                        اختر جميع أنواع البيانات الشخصية التي تجمعها
                      </FormDescription>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                        {DATA_TYPES.map((type) => {
                          const isAutoDetected = autoFilledFields.data_collected && 
                            form.getValues("data_collected")?.includes(type.id);
                          return (
                            <FormField
                              key={type.id}
                              control={form.control}
                              name="data_collected"
                              render={({ field }) => (
                                <FormItem className={cn(
                                  "flex flex-row items-start space-x-3 space-x-reverse border rounded-lg p-3 hover-elevate",
                                  isAutoDetected && "border-primary/50 bg-primary/5"
                                )}>
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(type.id)}
                                      onCheckedChange={(checked) => {
                                        if (autoFilledFields.data_collected) clearAutoFill("data_collected");
                                        return checked
                                          ? field.onChange([...field.value, type.id])
                                          : field.onChange(field.value?.filter((value) => value !== type.id));
                                      }}
                                      data-testid={`checkbox-data-${type.id}`}
                                    />
                                  </FormControl>
                                  <div className="space-y-1 leading-none flex items-center gap-2">
                                    <FormLabel className="font-normal cursor-pointer">
                                      {type.label}
                                    </FormLabel>
                                    {isAutoDetected && (
                                      <Sparkles className="w-3 h-3 text-primary" />
                                    )}
                                  </div>
                                </FormItem>
                              )}
                            />
                          );
                        })}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="collection_methods"
                  render={() => (
                    <FormItem>
                      <FormLabel className="text-base flex items-center gap-2">
                        طرق جمع البيانات *
                        {autoFilledFields.collection_methods && (
                          <AutoDetectedBadge onClear={() => clearAutoFill("collection_methods")} />
                        )}
                      </FormLabel>
                      <FormDescription>
                        اختر جميع الطرق المستخدمة لجمع البيانات
                      </FormDescription>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                        {COLLECTION_METHODS.map((method) => {
                          const isAutoDetected = autoFilledFields.collection_methods && 
                            form.getValues("collection_methods")?.includes(method.id);
                          return (
                            <FormField
                              key={method.id}
                              control={form.control}
                              name="collection_methods"
                              render={({ field }) => (
                                <FormItem className={cn(
                                  "flex flex-row items-start space-x-3 space-x-reverse border rounded-lg p-3 hover-elevate",
                                  isAutoDetected && "border-primary/50 bg-primary/5"
                                )}>
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(method.id)}
                                      onCheckedChange={(checked) => {
                                        if (autoFilledFields.collection_methods) clearAutoFill("collection_methods");
                                        return checked
                                          ? field.onChange([...field.value, method.id])
                                          : field.onChange(field.value?.filter((value) => value !== method.id));
                                      }}
                                      data-testid={`checkbox-method-${method.id}`}
                                    />
                                  </FormControl>
                                  <div className="space-y-1 leading-none flex items-center gap-2">
                                    <FormLabel className="font-normal cursor-pointer">
                                      {method.label}
                                    </FormLabel>
                                    {isAutoDetected && (
                                      <Sparkles className="w-3 h-3 text-primary" />
                                    )}
                                  </div>
                                </FormItem>
                              )}
                            />
                          );
                        })}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          {currentStep === 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HardDrive className="w-5 h-5" />
                  الخطوة ٣: التخزين والمشاركة
                </CardTitle>
                <CardDescription>
                  حدد موقع تخزين البيانات ومدة الاحتفاظ وسياسة المشاركة
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="storage_location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">موقع تخزين البيانات *</FormLabel>
                      <FormControl>
                        <RadioGroup 
                          onValueChange={field.onChange} 
                          value={field.value} 
                          className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2"
                        >
                          <div className={cn(
                            "flex items-center space-x-3 space-x-reverse border rounded-lg p-4 cursor-pointer hover-elevate",
                            field.value === "inside_ksa" && "border-primary bg-primary/5"
                          )}>
                            <RadioGroupItem value="inside_ksa" id="inside_ksa" data-testid="radio-storage-inside" />
                            <Label htmlFor="inside_ksa" className="cursor-pointer flex-1">
                              داخل المملكة العربية السعودية
                            </Label>
                          </div>
                          <div className={cn(
                            "flex items-center space-x-3 space-x-reverse border rounded-lg p-4 cursor-pointer hover-elevate",
                            field.value === "outside_ksa" && "border-primary bg-primary/5"
                          )}>
                            <RadioGroupItem value="outside_ksa" id="outside_ksa" data-testid="radio-storage-outside" />
                            <Label htmlFor="outside_ksa" className="cursor-pointer flex-1">
                              خارج المملكة العربية السعودية
                            </Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="retention_period"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">مدة الاحتفاظ بالبيانات *</FormLabel>
                      <FormControl>
                        <RadioGroup 
                          onValueChange={field.onChange} 
                          value={field.value} 
                          className="space-y-3 mt-2"
                        >
                          <div className={cn(
                            "flex items-center space-x-3 space-x-reverse border rounded-lg p-4 cursor-pointer hover-elevate",
                            field.value === "delete_immediately" && "border-primary bg-primary/5"
                          )}>
                            <RadioGroupItem value="delete_immediately" id="delete_immediately" data-testid="radio-retention-immediate" />
                            <Label htmlFor="delete_immediately" className="cursor-pointer flex-1">
                              حذف فوري بعد انتهاء الغرض
                            </Label>
                          </div>
                          <div className={cn(
                            "flex items-center space-x-3 space-x-reverse border rounded-lg p-4 cursor-pointer hover-elevate",
                            field.value === "specific_period" && "border-primary bg-primary/5"
                          )}>
                            <RadioGroupItem value="specific_period" id="specific_period" data-testid="radio-retention-specific" />
                            <Label htmlFor="specific_period" className="cursor-pointer flex-1">
                              مدة محددة
                            </Label>
                          </div>
                          <div className={cn(
                            "flex items-center space-x-3 space-x-reverse border rounded-lg p-4 cursor-pointer hover-elevate",
                            field.value === "statutory_period" && "border-primary bg-primary/5"
                          )}>
                            <RadioGroupItem value="statutory_period" id="statutory_period" data-testid="radio-retention-statutory" />
                            <Label htmlFor="statutory_period" className="cursor-pointer flex-1">
                              المدة النظامية المطلوبة قانوناً
                            </Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {watchRetentionPeriod === "specific_period" && (
                  <FormField
                    control={form.control}
                    name="retention_period_value"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>حدد المدة (بالسنوات)</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" min="1" max="100" placeholder="مثال: 5" data-testid="input-retention-value" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="data_sharing"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">مشاركة البيانات مع أطراف ثالثة *</FormLabel>
                      <FormControl>
                        <RadioGroup 
                          onValueChange={field.onChange} 
                          value={field.value} 
                          className="space-y-3 mt-2"
                        >
                          <div className={cn(
                            "flex items-center space-x-3 space-x-reverse border rounded-lg p-4 cursor-pointer hover-elevate",
                            field.value === "no_sharing" && "border-primary bg-primary/5"
                          )}>
                            <RadioGroupItem value="no_sharing" id="no_sharing" data-testid="radio-sharing-none" />
                            <Label htmlFor="no_sharing" className="cursor-pointer flex-1">
                              لا نشارك البيانات مع أي طرف
                            </Label>
                          </div>
                          <div className={cn(
                            "flex items-center space-x-3 space-x-reverse border rounded-lg p-4 cursor-pointer hover-elevate",
                            field.value === "service_providers" && "border-primary bg-primary/5"
                          )}>
                            <RadioGroupItem value="service_providers" id="service_providers" data-testid="radio-sharing-providers" />
                            <Label htmlFor="service_providers" className="cursor-pointer flex-1">
                              مزودي الخدمات (الدفع، الشحن، التحليلات)
                            </Label>
                          </div>
                          <div className={cn(
                            "flex items-center space-x-3 space-x-reverse border rounded-lg p-4 cursor-pointer hover-elevate",
                            field.value === "government_entities" && "border-primary bg-primary/5"
                          )}>
                            <RadioGroupItem value="government_entities" id="government_entities" data-testid="radio-sharing-government" />
                            <Label htmlFor="government_entities" className="cursor-pointer flex-1">
                              الجهات الحكومية (عند الطلب النظامي)
                            </Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          {currentStep === 4 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  الخطوة ٤: آلية الشكاوى
                </CardTitle>
                <CardDescription>
                  حدد الجهة المسؤولة عن استقبال شكاوى حماية البيانات
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="complaint_dept"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">الجهة المسؤولة عن استقبال الشكاوى *</FormLabel>
                      <FormControl>
                        <RadioGroup 
                          onValueChange={field.onChange} 
                          value={field.value} 
                          className="space-y-3 mt-2"
                        >
                          <div className={cn(
                            "flex items-center space-x-3 space-x-reverse border rounded-lg p-4 cursor-pointer hover-elevate",
                            field.value === "customer_service" && "border-primary bg-primary/5"
                          )}>
                            <RadioGroupItem value="customer_service" id="customer_service" data-testid="radio-complaint-customer" />
                            <Label htmlFor="customer_service" className="cursor-pointer flex-1">
                              خدمة العملاء
                            </Label>
                          </div>
                          <div className={cn(
                            "flex items-center space-x-3 space-x-reverse border rounded-lg p-4 cursor-pointer hover-elevate",
                            field.value === "legal_dept" && "border-primary bg-primary/5"
                          )}>
                            <RadioGroupItem value="legal_dept" id="legal_dept" data-testid="radio-complaint-legal" />
                            <Label htmlFor="legal_dept" className="cursor-pointer flex-1">
                              الإدارة القانونية
                            </Label>
                          </div>
                          <div className={cn(
                            "flex items-center space-x-3 space-x-reverse border rounded-lg p-4 cursor-pointer hover-elevate",
                            field.value === "compliance_dept" && "border-primary bg-primary/5"
                          )}>
                            <RadioGroupItem value="compliance_dept" id="compliance_dept" data-testid="radio-complaint-compliance" />
                            <Label htmlFor="compliance_dept" className="cursor-pointer flex-1">
                              إدارة الامتثال
                            </Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Alert className="bg-green-50 border-green-200 dark:bg-green-950/20">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800 dark:text-green-200">
                    سيتم تضمين معلومات الهيئة السعودية للبيانات والذكاء الاصطناعي (سدايا) تلقائياً كجهة تنظيمية للشكاوى.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-between gap-4">
            {currentStep > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                data-testid="button-prev-step"
              >
                <ChevronRight className="ml-2 h-4 w-4" />
                السابق
              </Button>
            )}
            
            <div className="flex-1" />
            
            {currentStep < 4 ? (
              <Button
                type="button"
                onClick={nextStep}
                data-testid="button-next-step"
              >
                التالي
                <ChevronLeft className="mr-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={createPolicyRequestMutation.isPending || isGenerating}
                data-testid="button-generate-policy"
              >
                {(createPolicyRequestMutation.isPending || isGenerating) ? (
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
            )}
          </div>
        </form>
      </Form>

      {isLoggedIn && policies && policies.length > 0 && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              سياساتي السابقة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {policies.map((policy) => (
                <div 
                  key={policy.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-8 h-8 text-primary" />
                    <div>
                      <h4 className="font-medium">{policy.companyName}</h4>
                      <p className="text-sm text-muted-foreground">
                        {new Date(policy.createdAt!).toLocaleDateString('ar-SA')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={policy.status === "completed" ? "default" : "secondary"}>
                      {policy.status === "completed" ? "مكتمل" : 
                       policy.status === "generating" ? "جاري التوليد" : "قيد الانتظار"}
                    </Badge>
                    {policy.status === "completed" && policy.generatedContent && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" data-testid={`button-download-${policy.id}`}>
                            <Download className="ml-2 h-4 w-4" />
                            تحميل
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => handleDownload(policy, 'html')}>
                            HTML
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDownload(policy, 'pdf')}>
                            PDF (طباعة)
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDownload(policy, 'word')}>
                            Word
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
