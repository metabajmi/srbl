import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { FileText, Loader2, Download, AlertCircle, CheckCircle2, Lock, CreditCard, Unlock, ChevronLeft, ChevronRight, Building2, Database, HardDrive, MessageSquare, Sparkles, X, Scale, ClipboardList, UserCheck, Check, AlertTriangle, XCircle, CheckCircle, ChevronDown, ChevronUp, ExternalLink, Shield } from "lucide-react";
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
import GeideaPayment from "@/components/GeideaPayment";
import { OTPModal } from "@/components/OTPModal";
import {
  DATA_TYPES,
  COLLECTION_METHODS,
  COLLECTION_PURPOSES,
  DATA_USAGE_PURPOSES,
  LEGAL_BASES,
  DISCLOSURE_PARTIES,
  STORAGE_LOCATIONS,
  RETENTION_PERIODS,
  DESTRUCTION_METHODS,
  RIGHTS_EXERCISE_METHODS,
  RESPONSE_TIMEFRAMES,
  SDAIA_INFO,
} from "@/lib/policyConstants";

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

const POLICY_PRICE_SAR = 349;
const POLICY_PRICE_HALALAS = POLICY_PRICE_SAR * 100;

const ACTIVITY_TYPES = [
  { id: 'ecommerce', label: 'تجارة إلكترونية' },
  { id: 'fintech', label: 'تقنية مالية' },
  { id: 'health', label: 'خدمات صحية' },
  { id: 'education', label: 'خدمات تعليمية' },
  { id: 'technology', label: 'تقنية المعلومات' },
  { id: 'retail', label: 'تجزئة' },
  { id: 'other', label: 'أخرى' },
] as const;

const formSchema = z.object({
  company_name: z.string().min(2, "يجب إدخال اسم الجهة"),
  activity_type: z.string().min(1, "يجب اختيار نوع النشاط"),
  service_description: z.string().min(10, "يجب وصف الخدمة بشكل مختصر"),
  contact_team: z.string().min(2, "يجب إدخال القسم/الفريق المختص"),
  address: z.string().min(5, "يجب إدخال العنوان"),
  phone: z.string().min(9, "يجب إدخال رقم الهاتف"),
  email: z.string().email("يجب إدخال بريد إلكتروني صحيح"),
  cr_number: z.string().min(1, "يجب إدخال رقم السجل التجاري"),
  policy_last_update: z.string().min(1, "يجب تحديد تاريخ آخر تحديث"),
  data_collected: z.array(z.string()).min(1, "يجب اختيار نوع واحد على الأقل"),
  collection_methods_direct: z.array(z.string()).default([]),
  collection_methods_indirect: z.array(z.string()).default([]),
  collection_purposes: z.array(z.string()).min(1, "يجب اختيار غرض واحد على الأقل"),
  data_usage_purposes: z.array(z.string()).min(1, "يجب اختيار استخدام واحد على الأقل"),
  legal_bases: z.array(z.string()).min(1, "يجب اختيار مسوغ نظامي واحد على الأقل"),
  legal_bases_explanations: z.record(z.string(), z.string()).default({}),
  disclosure_parties: z.array(z.string()).min(1, "يجب تحديد جهات الإفصاح"),
  storage_location: z.string().min(1, "يجب تحديد موقع التخزين"),
  retention_period: z.string().min(1, "يجب تحديد مدة الاحتفاظ"),
  retention_purpose: z.string().optional(),
  retention_years: z.number().optional(),
  retention_custom_text: z.string().optional(),
  destruction_method: z.string().min(1, "يجب تحديد طريقة الإتلاف"),
  destruction_custom: z.string().optional(),
  rights_exercise_method: z.string().min(1, "يجب تحديد وسيلة ممارسة الحقوق"),
  rights_contact_details: z.string().optional(),
  response_days: z.number().min(1, "يجب تحديد مدة الرد"),
  has_dpo: z.boolean().default(false),
  dpo_name: z.string().optional(),
  dpo_address: z.string().optional(),
  dpo_phone: z.string().optional(),
  dpo_email: z.string().email("يجب إدخال بريد إلكتروني صحيح").optional().or(z.literal("")),
  complaint_contact: z.string().min(2, "يجب تحديد جهة استقبال الشكاوى"),
  complaint_contact_details: z.string().optional(),
  complaint_response_days: z.number().min(1, "يجب تحديد مدة الرد على الشكوى"),
});

type FormValues = z.infer<typeof formSchema>;

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

function PostPaymentScanResults({ scan, scanData }: { scan: any; scanData: any }) {
  const [auditExpanded, setAuditExpanded] = useState(false);

  const getComplianceLevelStyle = (score: number) => {
    if (score >= 70) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  };

  const getComplianceLevelLabel = (score: number) => {
    if (score >= 70) return 'مستوى امتثال مرتفع';
    if (score >= 40) return 'مستوى امتثال متوسط';
    return 'مستوى امتثال منخفض';
  };

  const displayScore = scan.overallScore || scanData.overallScore || 0;
  const displayLevel = getComplianceLevelStyle(displayScore);
  const complianceLabel = getComplianceLevelLabel(displayScore);

  const ppAudit = scan.analysisResult?.privacy_policy_audit || 
                  scan.analysisResult?.document_audits?.find((d: any) => d.type === 'privacy')?.privacyPolicyAudit;

  const getStatusIcon = (statusEn: string) => {
    switch (statusEn) {
      case 'FOUND': return <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />;
      case 'PARTIAL': return <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0" />;
      default: return <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />;
    }
  };

  const getStatusBadge = (status: string, statusEn: string) => {
    switch (statusEn) {
      case 'FOUND': return <Badge variant="outline" className="border-green-500 text-green-600 text-xs">{status}</Badge>;
      case 'PARTIAL': return <Badge variant="outline" className="border-orange-500 text-orange-600 text-xs">{status}</Badge>;
      default: return <Badge variant="destructive" className="text-xs">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Shield className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-bold">نتائج فحص الامتثال</h3>
      </div>

      {/* Compliance Score */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className={`w-24 h-24 rounded-full border-8 flex items-center justify-center flex-shrink-0 ${
              displayLevel === 'high' ? 'border-green-500 bg-green-50 dark:bg-green-950' :
              displayLevel === 'medium' ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950' :
              'border-red-500 bg-red-50 dark:bg-red-950'
            }`}>
              <div className="text-center">
                <div className={`text-2xl font-bold ${
                  displayLevel === 'high' ? 'text-green-600' :
                  displayLevel === 'medium' ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {displayScore}%
                </div>
              </div>
            </div>
            <div className="flex-1 text-center sm:text-right">
              <h2 className="text-xl font-bold mb-1">{complianceLabel}</h2>
              <p className="text-muted-foreground text-sm" dir="ltr">{scanData.websiteUrl}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Privacy Policy Status */}
      <Card className={`p-3 ${
        !scanData.hasPrivacyPolicy ? 'border-red-300 bg-red-50/50 dark:bg-red-950/20' :
        ppAudit && ppAudit.elementsMissing > 0 ? 'border-red-300 bg-red-50/50 dark:bg-red-950/20' :
        ppAudit && ppAudit.elementsPartial > 0 ? 'border-orange-300 bg-orange-50/50 dark:bg-orange-950/20' :
        'border-green-300 bg-green-50/50 dark:bg-green-950/20'
      }`} data-testid="card-status-privacy-post-payment">
        <div className="flex items-center gap-2">
          {!scanData.hasPrivacyPolicy ? <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" /> :
           ppAudit && ppAudit.elementsMissing > 0 ? <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" /> :
           ppAudit && ppAudit.elementsPartial > 0 ? <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0" /> :
           <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />}
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">سياسة الخصوصية</p>
            {scanData.hasPrivacyPolicy && scanData.privacyPolicyUrl && (
              <a href={scanData.privacyPolicyUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                <span className="truncate max-w-[100px]">عرض</span>
                <ExternalLink className="w-3 h-3 flex-shrink-0" />
              </a>
            )}
            <p className={`text-xs mt-0.5 ${
              !scanData.hasPrivacyPolicy ? 'text-red-600' :
              ppAudit && ppAudit.elementsMissing > 0 ? 'text-red-600' :
              ppAudit && ppAudit.elementsPartial > 0 ? 'text-orange-600' :
              'text-green-600'
            }`}>
              {!scanData.hasPrivacyPolicy ? 'غير موجودة' :
               ppAudit && ppAudit.elementsMissing > 0 ? 'غير مكتملة' :
               ppAudit && ppAudit.elementsPartial > 0 ? 'تحتاج تحسين' :
               'مكتملة'}
            </p>
          </div>
        </div>
      </Card>

      {/* Privacy Policy 12-Element Audit - Unlocked */}
      {ppAudit && ppAudit.elements && ppAudit.elements.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-lg flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-primary" />
                فحص عناصر سياسة الخصوصية
              </CardTitle>
              <div className="flex items-center gap-2">
                {ppAudit.isComplete ? (
                  <Badge variant="outline" className="border-green-500 text-green-600">مكتملة</Badge>
                ) : (
                  <Badge variant="destructive">غير مكتملة</Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-center">
                <div className="text-2xl font-bold text-green-600">{ppAudit.elementsFound}</div>
                <div className="text-xs text-green-700 dark:text-green-400">موجود بالكامل</div>
              </div>
              <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 text-center">
                <div className="text-2xl font-bold text-orange-600">{ppAudit.elementsPartial}</div>
                <div className="text-xs text-orange-700 dark:text-orange-400">ناقص أو غير واضح</div>
              </div>
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-center">
                <div className="text-2xl font-bold text-red-600">{ppAudit.elementsMissing}</div>
                <div className="text-xs text-red-700 dark:text-red-400">غير موجود</div>
              </div>
            </div>

            {/* Expand/Collapse */}
            <Button
              variant="outline"
              size="sm"
              className="w-full mb-3"
              onClick={() => setAuditExpanded(!auditExpanded)}
              data-testid="button-expand-audit-post-payment"
            >
              {auditExpanded ? (
                <>
                  <ChevronUp className="w-4 h-4 ml-2" />
                  إخفاء التفاصيل
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4 ml-2" />
                  عرض التفاصيل
                </>
              )}
            </Button>

            {/* Details - fully unlocked */}
            {auditExpanded && (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {ppAudit.elements.map((element: any) => (
                  <div
                    key={element.id}
                    className={`p-3 rounded-lg border ${
                      element.statusEn === 'FOUND' 
                        ? 'border-green-200 bg-green-50/50 dark:bg-green-950/20' 
                        : element.statusEn === 'PARTIAL'
                        ? 'border-orange-200 bg-orange-50/50 dark:bg-orange-950/20'
                        : 'border-red-200 bg-red-50/50 dark:bg-red-950/20'
                    }`}
                    data-testid={`audit-element-post-payment-${element.number}`}
                  >
                    <div className="flex items-start gap-2">
                      {getStatusIcon(element.statusEn)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{element.number}. {element.nameAr}</span>
                          {getStatusBadge(element.status, element.statusEn)}
                        </div>
                        {element.evidence && (
                          <p className="text-xs text-muted-foreground mt-1 bg-background/50 p-2 rounded border">
                            <span className="font-medium">الدليل:</span> {element.evidence}
                          </p>
                        )}
                        {element.notes && element.statusEn !== 'FOUND' && (
                          <p className="text-xs text-orange-700 dark:text-orange-400 mt-1">
                            {element.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

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
  const [paymentCompleted, setPaymentCompleted] = useState(false);
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get("payment");
    const returnRequestId = params.get("requestId");
    if (paymentStatus === "success" && returnRequestId && isLoggedIn) {
      setPaymentRequestId(returnRequestId);
      setIsGenerating(true);
      const verifyAndGenerate = async () => {
        try {
          const verifyRes = await apiRequest("POST", "/api/geidea/verify", { requestId: returnRequestId });
          const verifyData = await verifyRes.json();
          if (verifyData.success && verifyData.status === "paid") {
            const genRes = await apiRequest("POST", `/api/policy-requests/${returnRequestId}/generate`, {});
            if (genRes.ok) {
              queryClient.invalidateQueries({ queryKey: ["/api/user/policies"] });
            }
            setPaymentCompleted(true);
            setIsGenerating(false);
          } else {
            toast({ title: "تحقق من الدفع", description: "لم يتم تأكيد الدفع بعد. يرجى المحاولة مرة أخرى.", variant: "destructive" });
            setIsGenerating(false);
            setPaymentRequestId(null);
          }
        } catch (err) {
          console.error("Return URL payment verify error:", err);
          toast({ title: "خطأ", description: "حدث خطأ أثناء التحقق من الدفع", variant: "destructive" });
          setIsGenerating(false);
          setPaymentRequestId(null);
        } finally {
          window.history.replaceState({}, "", window.location.pathname);
        }
      };
      verifyAndGenerate();
    }
  }, [isLoggedIn, toast]);

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
      activity_type: "",
      service_description: "",
      contact_team: "",
      address: "",
      phone: "",
      email: "",
      cr_number: "",
      policy_last_update: new Date().toISOString().split('T')[0],
      data_collected: [],
      collection_methods_direct: [],
      collection_methods_indirect: [],
      collection_purposes: [],
      data_usage_purposes: [],
      legal_bases: [],
      legal_bases_explanations: {},
      disclosure_parties: [],
      storage_location: "",
      retention_period: "",
      retention_purpose: "",
      retention_years: undefined,
      retention_custom_text: "",
      destruction_method: "",
      destruction_custom: "",
      rights_exercise_method: "",
      rights_contact_details: "",
      response_days: 10,
      has_dpo: false,
      dpo_name: "",
      dpo_address: "",
      dpo_phone: "",
      dpo_email: "",
      complaint_contact: "",
      complaint_contact_details: "",
      complaint_response_days: 15,
    },
  });

  useEffect(() => {
    if (hasScanData && scanData && scanData.scanId !== lastPreFilledScanId) {
      const newAutoFilled: AutoFilledFields = {};
      const insights = scanData.policyInsights;
      
      const detectedEmail = insights?.detectedEmails?.[0] || scanData.contactEmail;
      if (detectedEmail && !form.getValues("email")) {
        form.setValue("email", detectedEmail);
        newAutoFilled.email = true;
      }
      
      const detectedPhone = insights?.detectedPhones?.[0] || scanData.contactPhone;
      if (detectedPhone && !form.getValues("phone")) {
        form.setValue("phone", detectedPhone);
        newAutoFilled.phone = true;
      }
      
      
      if (insights?.storageLocation && !form.getValues("storage_location")) {
        form.setValue("storage_location", insights.storageLocation);
        newAutoFilled.storage_location = true;
      }
      
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

  const { data: fullScanData } = useQuery<any>({
    queryKey: ["/api/scans", scanData?.scanId],
    enabled: paymentCompleted && !!scanData?.scanId,
  });

  const [showPaymentStep, setShowPaymentStep] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<FormValues | null>(null);

  const createPolicyRequestMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const response = await apiRequest("POST", "/api/policy-requests", {
        scanId: scanData?.scanId || null,
        intakeData: data,
      });
      return await response.json();
    },
    onSuccess: (result) => {
      setPaymentRequestId(result.id);
      setShowPaymentStep(true);
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ أثناء إنشاء الطلب",
        variant: "destructive",
      });
    },
  });

  const handlePaymentSuccess = async () => {
    if (!paymentRequestId) return;
    
    setIsGenerating(true);
    setShowPaymentStep(false);
    try {
      const verifyRes = await apiRequest("POST", "/api/geidea/verify", { requestId: paymentRequestId });
      const verifyData = await verifyRes.json();
      
      if (!verifyRes.ok || verifyData.status !== "paid") {
        throw new Error("لم يتم تأكيد الدفع من الخادم. يرجى المحاولة مرة أخرى.");
      }

      const generateResponse = await apiRequest("POST", `/api/policy-requests/${paymentRequestId}/generate`, {});
      
      if (generateResponse.ok) {
        queryClient.invalidateQueries({ queryKey: ["/api/user/policies"] });
        form.reset();
        setCurrentStep(1);
        setPendingFormData(null);
        setPaymentCompleted(true);
        setIsGenerating(false);
        return;
      } else {
        throw new Error("فشل في بدء توليد السياسة");
      }
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ أثناء توليد السياسة بعد الدفع",
        variant: "destructive",
      });
      setIsGenerating(false);
    }
  };

  const onSubmit = (values: FormValues) => {
    if (!isLoggedIn) {
      setShowOTPModal(true);
      return;
    }
    
    setPendingFormData(values);
    createPolicyRequestMutation.mutate(values);
  };

  const validateStep = (step: number): boolean => {
    const values = form.getValues();
    switch (step) {
      case 1: return !!(values.company_name && values.activity_type && values.policy_last_update);
      case 2: return !!(values.service_description);
      case 3: return !!(values.contact_team && values.address && values.phone && values.email && values.cr_number);
      case 4: return values.data_collected.length > 0;
      case 5: return true;
      case 6: return (values.collection_methods_direct.length > 0 || values.collection_methods_indirect.length > 0);
      case 7: return values.collection_purposes.length > 0;
      case 8: return values.data_usage_purposes.length > 0;
      case 9: return values.legal_bases.length > 0;
      case 10: return values.disclosure_parties.length > 0;
      case 11: return !!values.storage_location;
      case 12: return !!values.retention_period;
      case 13: return !!values.destruction_method;
      case 14: return !!(values.rights_exercise_method && values.response_days);
      case 15: return true;
      case 16: return !!(values.complaint_contact && values.complaint_response_days);
      default: return false;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, TOTAL_SUB_STEPS));
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
  const watchDestructionMethod = form.watch("destruction_method");
  const watchLegalBases = form.watch("legal_bases");
  const watchRightsMethod = form.watch("rights_exercise_method");

  const clearAutoFill = (fieldName: string) => {
    setAutoFilledFields(prev => {
      const updated = { ...prev };
      delete updated[fieldName];
      return updated;
    });
  };

  const TOTAL_SUB_STEPS = 16;

  const subStepInfo = [
    { number: 1, title: "معلومات أساسية", description: "اسم جهتك ونوع نشاطها", icon: Building2 },
    { number: 2, title: "مقدمة السياسة", description: "نبذة تعريفية عن جهتك وخدماتها", icon: FileText },
    { number: 3, title: "بيانات التواصل", description: "معلومات الاتصال والسجل التجاري", icon: Building2 },
    { number: 4, title: "البيانات المجمعة", description: "أنواع البيانات الشخصية التي تجمعها", icon: Database },
    { number: 5, title: "طرق الجمع المباشرة", description: "البيانات التي تُجمع مباشرة من العميل", icon: ClipboardList },
    { number: 6, title: "طرق الجمع غير المباشرة", description: "البيانات التي تُجمع بطرق غير مباشرة", icon: ClipboardList },
    { number: 7, title: "أغراض الجمع", description: "لماذا تجمع هذه البيانات؟", icon: ClipboardList },
    { number: 8, title: "استخدام البيانات", description: "كيف تستخدم البيانات المجمعة؟", icon: ClipboardList },
    { number: 9, title: "المسوغات النظامية", description: "الأساس القانوني لمعالجة البيانات", icon: Scale },
    { number: 10, title: "الإفصاح عن البيانات", description: "الجهات التي قد يُفصح لها عن البيانات", icon: Scale },
    { number: 11, title: "موقع التخزين", description: "أين يتم تخزين البيانات؟", icon: HardDrive },
    { number: 12, title: "مدة الاحتفاظ", description: "كم يتم الاحتفاظ بالبيانات؟", icon: HardDrive },
    { number: 13, title: "إتلاف البيانات", description: "كيف يتم التخلص من البيانات؟", icon: HardDrive },
    { number: 14, title: "ممارسة الحقوق", description: "كيف يمارس صاحب البيانات حقوقه؟", icon: MessageSquare },
    { number: 15, title: "مسؤول حماية البيانات", description: "هل لديك مسؤول حماية بيانات معيّن؟", icon: UserCheck },
    { number: 16, title: "آلية الشكاوى", description: "كيف يتم استقبال الشكاوى والرد عليها؟", icon: MessageSquare },
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

      {showPaymentStep && paymentRequestId && (
        <Card className="mb-6 border-primary/30">
          <CardContent className="pt-6">
            <div className="text-center mb-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <CreditCard className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2">أكمل الدفع لتوليد سياسة الخصوصية</h3>
              <p className="text-muted-foreground">
                بعد الدفع سيتم توليد سياسة خصوصية متوافقة مع نظام حماية البيانات الشخصية
              </p>
            </div>
            <GeideaPayment
              requestId={paymentRequestId}
              amount={POLICY_PRICE_SAR}
              customerEmail={pendingFormData?.email}
              customerName={pendingFormData?.company_name}
              onSuccess={handlePaymentSuccess}
              onError={(err) => {
                toast({
                  title: "خطأ في الدفع",
                  description: err,
                  variant: "destructive",
                });
              }}
              onCancel={() => {
                setShowPaymentStep(false);
                toast({
                  title: "تم إلغاء الدفع",
                  description: "يمكنك المحاولة مرة أخرى في أي وقت",
                });
              }}
            />
            <div className="text-center mt-4">
              <Button
                variant="ghost"
                onClick={() => setShowPaymentStep(false)}
                data-testid="button-cancel-payment"
              >
                العودة للنموذج
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {paymentCompleted && (
        <div className="space-y-6 mb-6" dir="rtl">
          {/* Unlocked Scan Results */}
          {scanData && fullScanData && (
            <PostPaymentScanResults scan={fullScanData} scanData={scanData} />
          )}

          {/* Policy Generation Status */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center py-8 gap-4">
                <CheckCircle className="w-12 h-12 text-green-600" />
                <h3 className="text-lg font-bold">جاري تجهيز سياسة الخصوصية الخاصة بك...</h3>
                <p className="text-muted-foreground text-center leading-relaxed max-w-md">
                  تم الدفع بنجاح.
                  <br /><br />
                  سنرسل لك سياسة الخصوصية الخاصة بك عبر البريد الإلكتروني خلال لحظات. يرجى مراجعة صندوق الوارد، والتحقق من مجلد الرسائل غير المرغوب فيها (Spam) في حال عدم وصولها.
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => {
                    setPaymentCompleted(false);
                    setPaymentRequestId(null);
                    setIsPaymentComplete(false);
                    setShowPaymentStep(false);
                    setPendingFormData(null);
                    setIsGenerating(false);
                    form.reset();
                    setCurrentStep(1);
                  }}
                  data-testid="button-new-policy"
                >
                  <FileText className="w-4 h-4 ml-2" />
                  إنشاء سياسة خصوصية جديدة
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {isGenerating && !paymentCompleted && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
              <h3 className="text-lg font-bold">جاري التحقق من الدفع...</h3>
            </div>
          </CardContent>
        </Card>
      )}

      <div className={cn("mb-8", (showPaymentStep || isGenerating || paymentCompleted) && "hidden")} dir="rtl">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-muted-foreground">
            {subStepInfo[currentStep - 1]?.title}
          </span>
          <span className="text-sm font-bold text-primary">
            {Math.round((currentStep / TOTAL_SUB_STEPS) * 100)}%
          </span>
        </div>
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
            style={{ width: `${(currentStep / TOTAL_SUB_STEPS) * 100}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          الخطوة {currentStep} من {TOTAL_SUB_STEPS}
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className={cn("space-y-6", (showPaymentStep || isGenerating || paymentCompleted) && "hidden")}>
          {currentStep === 1 && (
            <div className="animate-in fade-in slide-in-from-left-4 duration-300">
              <Card>
                <CardHeader dir="rtl">
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    معلومات أساسية
                  </CardTitle>
                  <CardDescription>اسم جهتك ونوع نشاطها</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="company_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>اسم الجهة *</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="الاسم الرسمي للجهة" 
                            data-testid="input-company-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                <SelectItem key={type.id} value={type.id}>
                                  {type.label}
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
                      name="policy_last_update"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>تاريخ آخر تحديث للسياسة *</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="date" 
                              dir="ltr" 
                              data-testid="input-policy-last-update" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {currentStep === 2 && (
            <div className="animate-in fade-in slide-in-from-left-4 duration-300">
              <Card>
                <CardHeader dir="rtl">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    مقدمة السياسة
                  </CardTitle>
                  <CardDescription>نبذة تعريفية عن جهتك وخدماتها</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="service_description"
                    render={({ field }) => {
                      const companyName = form.watch("company_name");
                      const generateSuggestedDescription = () => {
                        if (!companyName) {
                          toast({
                            title: "أدخل اسم الجهة أولاً",
                            description: "يرجى إدخال اسم الجهة لتوليد وصف مقترح",
                            variant: "destructive",
                          });
                          return;
                        }
                        const suggestedText = `نحن في ${companyName} نقدّر خصوصية عملائنا ونلتزم بحماية بياناتهم الشخصية وفقًا لنظام حماية البيانات الشخصية في المملكة العربية السعودية (PDPL) واللوائح الأخرى ذات الصلة بحماية البيانات. يوضح هذا البيان ممارساتنا المتعلقة بجمع البيانات الشخصية واستخدامها وحمايتها`;
                        field.onChange(suggestedText);
                      };
                      
                      return (
                        <FormItem>
                          <div className="flex items-center justify-between">
                            <FormLabel>
                              مقدمة سياسة الخصوصية *
                            </FormLabel>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={generateSuggestedDescription}
                              data-testid="button-generate-description"
                              className="text-xs"
                            >
                              <Sparkles className="w-3 h-3 ml-1" />
                              نص مقترح
                            </Button>
                          </div>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              placeholder="نبذة مختصرة عن مهام واختصاصات الجهة والخدمات المقدمة والفئة المستهدفة"
                              className="min-h-[100px]"
                              data-testid="input-service-description" 
                            />
                          </FormControl>
                          <FormDescription>
                            انقر على "نص مقترح" لإنشاء نص تعريفي تلقائي باسم جهتك
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                </CardContent>
              </Card>
            </div>
          )}

          {currentStep === 3 && (
            <div className="animate-in fade-in slide-in-from-left-4 duration-300">
              <Card>
                <CardHeader dir="rtl">
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    بيانات التواصل
                  </CardTitle>
                  <CardDescription>معلومات الاتصال والسجل التجاري</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="contact_team"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>القسم / الفريق المختص *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="مثال: قسم حماية البيانات" data-testid="input-contact-team" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

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
                  </div>

                  <FormField
                    control={form.control}
                    name="address"
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            رقم الهاتف *
                            {autoFilledFields.phone && (
                              <AutoDetectedBadge onClear={() => clearAutoFill("phone")} />
                            )}
                          </FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              dir="ltr" 
                              placeholder="+966 XX XXX XXXX" 
                              data-testid="input-phone"
                              className={autoFilledFields.phone ? "border-primary/50 bg-primary/5" : ""}
                              onChange={(e) => {
                                field.onChange(e);
                                if (autoFilledFields.phone) clearAutoFill("phone");
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            البريد الإلكتروني *
                            {autoFilledFields.email && (
                              <AutoDetectedBadge onClear={() => clearAutoFill("email")} />
                            )}
                          </FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="email" 
                              dir="ltr" 
                              placeholder="email@example.com" 
                              data-testid="input-email"
                              className={autoFilledFields.email ? "border-primary/50 bg-primary/5" : ""}
                              onChange={(e) => {
                                field.onChange(e);
                                if (autoFilledFields.email) clearAutoFill("email");
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {currentStep === 4 && (
            <div className="animate-in fade-in slide-in-from-left-4 duration-300">
              <Card>
                <CardHeader dir="rtl">
                  <CardTitle className="flex items-center gap-2">
                    <Database className="w-5 h-5" />
                    البيانات المجمعة
                  </CardTitle>
                  <CardDescription>أنواع البيانات الشخصية التي تجمعها</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="data_collected"
                    render={() => (
                      <FormItem>
                        <FormLabel className="text-base">
                          أنواع البيانات المجمعة *
                        </FormLabel>
                        <FormDescription>
                          اختر جميع أنواع البيانات الشخصية التي تجمعها
                        </FormDescription>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                          {DATA_TYPES.map((type) => (
                            <FormField
                              key={type.id}
                              control={form.control}
                              name="data_collected"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-x-reverse border rounded-lg p-3 hover-elevate">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(type.id)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([...field.value, type.id])
                                          : field.onChange(field.value?.filter((value) => value !== type.id));
                                      }}
                                      data-testid={`checkbox-data-${type.id}`}
                                    />
                                  </FormControl>
                                  <div className="space-y-1 leading-none flex-1">
                                    <FormLabel className="font-medium cursor-pointer">
                                      {type.label}
                                    </FormLabel>
                                    {type.description && (
                                      <p className="text-xs text-muted-foreground">{type.description}</p>
                                    )}
                                  </div>
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
            </div>
          )}

          {currentStep === 5 && (
            <div className="animate-in fade-in slide-in-from-left-4 duration-300">
              <Card>
                <CardHeader dir="rtl">
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardList className="w-5 h-5" />
                    طرق الجمع المباشرة
                  </CardTitle>
                  <CardDescription>البيانات التي تُجمع مباشرة من العميل</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormDescription>
                    البيانات التي يتم جمعها بصورة مباشرة
                  </FormDescription>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {COLLECTION_METHODS.direct.map((method) => (
                      <FormField
                        key={method.id}
                        control={form.control}
                        name="collection_methods_direct"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-x-reverse border rounded-lg p-3 hover-elevate">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(method.id)}
                                onCheckedChange={(checked) => {
                                  return checked
                                    ? field.onChange([...field.value, method.id])
                                    : field.onChange(field.value?.filter((value) => value !== method.id));
                                }}
                                data-testid={`checkbox-method-direct-${method.id}`}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none flex-1">
                              <FormLabel className="font-medium cursor-pointer">{method.label}</FormLabel>
                              {method.description && (
                                <p className="text-xs text-muted-foreground">{method.description}</p>
                              )}
                            </div>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {currentStep === 6 && (
            <div className="animate-in fade-in slide-in-from-left-4 duration-300">
              <Card>
                <CardHeader dir="rtl">
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardList className="w-5 h-5" />
                    طرق الجمع غير المباشرة
                  </CardTitle>
                  <CardDescription>البيانات التي تُجمع بطرق غير مباشرة</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormDescription>
                    البيانات التي يتم جمعها بصورة غير مباشرة
                  </FormDescription>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {COLLECTION_METHODS.indirect.map((method) => (
                      <FormField
                        key={method.id}
                        control={form.control}
                        name="collection_methods_indirect"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-x-reverse border rounded-lg p-3 hover-elevate">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(method.id)}
                                onCheckedChange={(checked) => {
                                  return checked
                                    ? field.onChange([...field.value, method.id])
                                    : field.onChange(field.value?.filter((value) => value !== method.id));
                                }}
                                data-testid={`checkbox-method-indirect-${method.id}`}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none flex-1">
                              <FormLabel className="font-medium cursor-pointer">{method.label}</FormLabel>
                              {method.description && (
                                <p className="text-xs text-muted-foreground">{method.description}</p>
                              )}
                            </div>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {currentStep === 7 && (
            <div className="animate-in fade-in slide-in-from-left-4 duration-300">
              <Card>
                <CardHeader dir="rtl">
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardList className="w-5 h-5" />
                    أغراض الجمع
                  </CardTitle>
                  <CardDescription>لماذا تجمع هذه البيانات؟</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="collection_purposes"
                    render={() => (
                      <FormItem>
                        <FormLabel className="text-base">أغراض الجمع *</FormLabel>
                        <FormDescription>
                          لماذا تجمع هذه البيانات؟
                        </FormDescription>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                          {COLLECTION_PURPOSES.map((purpose) => (
                            <FormField
                              key={purpose.id}
                              control={form.control}
                              name="collection_purposes"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-x-reverse border rounded-lg p-3 hover-elevate">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(purpose.id)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([...field.value, purpose.id])
                                          : field.onChange(field.value?.filter((value) => value !== purpose.id));
                                      }}
                                      data-testid={`checkbox-purpose-${purpose.id}`}
                                    />
                                  </FormControl>
                                  <div className="space-y-1 leading-none flex-1">
                                    <FormLabel className="font-medium cursor-pointer">{purpose.label}</FormLabel>
                                    {purpose.description && (
                                      <p className="text-xs text-muted-foreground">{purpose.description}</p>
                                    )}
                                  </div>
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
            </div>
          )}

          {currentStep === 8 && (
            <div className="animate-in fade-in slide-in-from-left-4 duration-300">
              <Card>
                <CardHeader dir="rtl">
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardList className="w-5 h-5" />
                    استخدام البيانات
                  </CardTitle>
                  <CardDescription>كيف تستخدم البيانات المجمعة؟</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="data_usage_purposes"
                    render={() => (
                      <FormItem>
                        <FormLabel className="text-base">كيفية استخدام البيانات الشخصية *</FormLabel>
                        <FormDescription>
                          أضف كيفية استخدامك للبيانات الشخصية التي جمعتها بشكل مباشر وغير مباشر
                        </FormDescription>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                          {DATA_USAGE_PURPOSES.map((usage) => (
                            <FormField
                              key={usage.id}
                              control={form.control}
                              name="data_usage_purposes"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-x-reverse border rounded-lg p-3 hover-elevate">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(usage.id)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([...field.value, usage.id])
                                          : field.onChange(field.value?.filter((value) => value !== usage.id));
                                      }}
                                      data-testid={`checkbox-usage-${usage.id}`}
                                    />
                                  </FormControl>
                                  <div className="space-y-1 leading-none flex-1">
                                    <FormLabel className="font-medium cursor-pointer">{usage.label}</FormLabel>
                                  </div>
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
            </div>
          )}

          {currentStep === 9 && (
            <div className="animate-in fade-in slide-in-from-left-4 duration-300">
              <Card>
                <CardHeader dir="rtl">
                  <CardTitle className="flex items-center gap-2">
                    <Scale className="w-5 h-5" />
                    المسوغات النظامية
                  </CardTitle>
                  <CardDescription>الأساس القانوني لمعالجة البيانات</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="legal_bases"
                    render={() => (
                      <FormItem>
                        <FormLabel className="text-base">المسوغات النظامية *</FormLabel>
                        <FormDescription>
                          وفقاً لنظام حماية البيانات الشخصية، حدد المسوغ النظامي لمعالجة البيانات
                        </FormDescription>
                        <div className="space-y-4 mt-4">
                          {LEGAL_BASES.map((basis) => {
                            const isSelected = watchLegalBases?.includes(basis.id);
                            return (
                              <div key={basis.id} className="space-y-2">
                                <FormField
                                  control={form.control}
                                  name="legal_bases"
                                  render={({ field }) => (
                                    <FormItem className={cn(
                                      "flex flex-row items-start space-x-3 space-x-reverse border rounded-lg p-4 hover-elevate",
                                      isSelected && "border-primary bg-primary/5"
                                    )}>
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value?.includes(basis.id)}
                                          onCheckedChange={(checked) => {
                                            if (checked) {
                                              field.onChange([...field.value, basis.id]);
                                            } else {
                                              field.onChange(field.value?.filter((value) => value !== basis.id));
                                              const explanations = form.getValues("legal_bases_explanations");
                                              const newExplanations = { ...explanations };
                                              delete newExplanations[basis.id];
                                              form.setValue("legal_bases_explanations", newExplanations);
                                            }
                                          }}
                                          data-testid={`checkbox-legal-${basis.id}`}
                                        />
                                      </FormControl>
                                      <div className="space-y-1 leading-none flex-1">
                                        <FormLabel className="font-medium cursor-pointer">{basis.label}</FormLabel>
                                        <p className="text-sm text-muted-foreground">{basis.description}</p>
                                      </div>
                                    </FormItem>
                                  )}
                                />
                                {isSelected && basis.requiresExplanation && (
                                  <FormField
                                    control={form.control}
                                    name={`legal_bases_explanations.${basis.id}`}
                                    render={({ field }) => (
                                      <FormItem className="mr-8 border-r-2 border-primary/30 pr-4">
                                        <FormLabel className="text-sm">توضيح {basis.label}</FormLabel>
                                        <FormControl>
                                          <Textarea
                                            {...field}
                                            placeholder={basis.explanationPlaceholder}
                                            className="min-h-[80px]"
                                            data-testid={`textarea-legal-explanation-${basis.id}`}
                                          />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </div>
          )}

          {currentStep === 10 && (
            <div className="animate-in fade-in slide-in-from-left-4 duration-300">
              <Card>
                <CardHeader dir="rtl">
                  <CardTitle className="flex items-center gap-2">
                    <Scale className="w-5 h-5" />
                    الإفصاح عن البيانات
                  </CardTitle>
                  <CardDescription>الجهات التي قد يُفصح لها عن البيانات</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="disclosure_parties"
                    render={() => (
                      <FormItem>
                        <FormLabel className="text-base">كيفية الإفصاح عن البيانات الشخصية *</FormLabel>
                        <FormDescription>
                          حدد الجهات التي قد يتم الإفصاح عن البيانات لها
                        </FormDescription>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                          {DISCLOSURE_PARTIES.map((party) => (
                            <FormField
                              key={party.id}
                              control={form.control}
                              name="disclosure_parties"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-x-reverse border rounded-lg p-3 hover-elevate">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(party.id)}
                                      onCheckedChange={(checked) => {
                                        if (party.id === 'no_disclosure' && checked) {
                                          field.onChange(['no_disclosure']);
                                        } else if (party.id !== 'no_disclosure' && checked) {
                                          const newValues = field.value?.filter(v => v !== 'no_disclosure') || [];
                                          field.onChange([...newValues, party.id]);
                                        } else {
                                          field.onChange(field.value?.filter((value) => value !== party.id));
                                        }
                                      }}
                                      data-testid={`checkbox-disclosure-${party.id}`}
                                    />
                                  </FormControl>
                                  <div className="space-y-1 leading-none flex-1">
                                    <FormLabel className="font-medium cursor-pointer">{party.label}</FormLabel>
                                    {party.description && (
                                      <p className="text-xs text-muted-foreground">{party.description}</p>
                                    )}
                                  </div>
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
            </div>
          )}

          {currentStep === 11 && (
            <div className="animate-in fade-in slide-in-from-left-4 duration-300">
              <Card>
                <CardHeader dir="rtl">
                  <CardTitle className="flex items-center gap-2">
                    <HardDrive className="w-5 h-5" />
                    موقع التخزين
                  </CardTitle>
                  <CardDescription>أين يتم تخزين البيانات؟</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="storage_location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base flex items-center gap-2">
                          موقع تخزين البيانات *
                          {autoFilledFields.storage_location && (
                            <AutoDetectedBadge onClear={() => clearAutoFill("storage_location")} />
                          )}
                        </FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            if (autoFilledFields.storage_location) clearAutoFill("storage_location");
                          }} 
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger 
                              data-testid="select-storage-location"
                              className={autoFilledFields.storage_location ? "border-primary/50 bg-primary/5" : ""}
                            >
                              <SelectValue placeholder="اختر موقع التخزين" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {STORAGE_LOCATIONS.map((location) => (
                              <SelectItem key={location.id} value={location.id}>
                                {location.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </div>
          )}

          {currentStep === 12 && (
            <div className="animate-in fade-in slide-in-from-left-4 duration-300">
              <Card>
                <CardHeader dir="rtl">
                  <CardTitle className="flex items-center gap-2">
                    <HardDrive className="w-5 h-5" />
                    مدة الاحتفاظ
                  </CardTitle>
                  <CardDescription>كم يتم الاحتفاظ بالبيانات؟</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="retention_period"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base">مدة الاحتفاظ بالبيانات *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-retention-period">
                              <SelectValue placeholder="اختر مدة الاحتفاظ" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {RETENTION_PERIODS.map((period) => (
                              <SelectItem key={period.id} value={period.id}>
                                {period.label}
                                {period.description && ` - ${period.description}`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {watchRetentionPeriod === "until_purpose" && (
                    <FormField
                      control={form.control}
                      name="retention_purpose"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ما هو الغرض من الاحتفاظ؟</FormLabel>
                          <FormControl>
                            <Input 
                              {...field}
                              placeholder="مثال: تقديم الخدمة، تنفيذ العقد، الامتثال للمتطلبات النظامية"
                              data-testid="input-retention-purpose" 
                            />
                          </FormControl>
                          <FormDescription>
                            سيتم الاحتفاظ بالبيانات حتى انتهاء هذا الغرض
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                  )}

                  {watchRetentionPeriod === "custom" && (
                    <>
                      <FormField
                        control={form.control}
                        name="retention_years"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>حدد المدة (بالسنوات)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="1" 
                                max="100" 
                                placeholder="مثال: 5"
                                value={field.value || ''}
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                                data-testid="input-retention-years" 
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <div className="flex items-center gap-3 p-4 bg-primary/5 border border-primary/20 rounded-lg text-sm flex-row-reverse">
                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                          <Check className="w-3 h-3 text-primary" />
                        </div>
                        <span className="text-muted-foreground text-right">
                          <strong className="text-foreground">سيتم تضمين</strong> ما لم تحدد الأنظمة واللوائح ذات الصلة والمتطلبات النظامية مدة احتفاظ أكثر من المدة المنصوص عليها.
                        </span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {currentStep === 13 && (
            <div className="animate-in fade-in slide-in-from-left-4 duration-300">
              <Card>
                <CardHeader dir="rtl">
                  <CardTitle className="flex items-center gap-2">
                    <HardDrive className="w-5 h-5" />
                    إتلاف البيانات
                  </CardTitle>
                  <CardDescription>كيف يتم التخلص من البيانات؟</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="destruction_method"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base">طريقة إتلاف البيانات *</FormLabel>
                        <FormDescription>
                          كيف سيتم التخلص من البيانات بطريقة آمنة بعد انتهاء فترة الاحتفاظ؟
                        </FormDescription>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-destruction-method">
                              <SelectValue placeholder="اختر طريقة الإتلاف" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {DESTRUCTION_METHODS.map((method) => (
                              <SelectItem key={method.id} value={method.id}>
                                {method.label}
                              </SelectItem>
                            ))}
                            <SelectItem value="custom">طريقة أخرى</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {watchDestructionMethod === "custom" && (
                    <FormField
                      control={form.control}
                      name="destruction_custom"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>وصف طريقة الإتلاف</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field}
                              placeholder="صف كيف سيتم إتلاف البيانات بطريقة آمنة"
                              data-testid="textarea-destruction-custom"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  )}

                  </CardContent>
              </Card>
            </div>
          )}

          {currentStep === 14 && (
            <div className="animate-in fade-in slide-in-from-left-4 duration-300">
              <Card>
                <CardHeader dir="rtl">
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    ممارسة الحقوق
                  </CardTitle>
                  <CardDescription>كيف يمارس صاحب البيانات حقوقه؟</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="rights_exercise_method"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>وسيلة ممارسة الحقوق *</FormLabel>
                        <FormDescription>
                          كيف يمكن لصاحب البيانات ممارسة حقوقه؟
                        </FormDescription>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-rights-method">
                              <SelectValue placeholder="اختر وسيلة ممارسة الحقوق" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {RIGHTS_EXERCISE_METHODS.map((method) => (
                              <SelectItem key={method.id} value={method.id}>
                                {method.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {(watchRightsMethod === "email" || watchRightsMethod === "customer_service") && (
                    <FormField
                      control={form.control}
                      name="rights_contact_details"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {watchRightsMethod === "email" ? "البريد الإلكتروني المخصص" : "بيانات التواصل مع خدمة العملاء"}
                          </FormLabel>
                          <FormControl>
                            <Input 
                              {...field}
                              placeholder={watchRightsMethod === "email" ? "privacy@example.com" : "رقم الهاتف أو وسيلة التواصل"}
                              data-testid="input-rights-contact-details" 
                            />
                          </FormControl>
                          <FormDescription>
                            {watchRightsMethod === "email" 
                              ? "البريد الإلكتروني المخصص لاستقبال طلبات ممارسة الحقوق"
                              : "رقم الهاتف أو وسيلة التواصل مع خدمة العملاء"
                            }
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={form.control}
                    name="response_days"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>مدة الرد على طلبات الحقوق *</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(parseInt(value))} 
                          value={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-response-days">
                              <SelectValue placeholder="اختر مدة الرد" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {RESPONSE_TIMEFRAMES.map((timeframe) => (
                              <SelectItem key={timeframe.id} value={timeframe.days.toString()}>
                                {timeframe.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </div>
          )}

          {currentStep === 15 && (
            <div className="animate-in fade-in slide-in-from-left-4 duration-300">
              <Card>
                <CardHeader dir="rtl">
                  <CardTitle className="flex items-center gap-2">
                    <UserCheck className="w-5 h-5" />
                    مسؤول حماية البيانات
                  </CardTitle>
                  <CardDescription>هل لديك مسؤول حماية بيانات معيّن؟</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base font-semibold">مسؤول حماية البيانات الشخصية</Label>
                      <p className="text-sm text-muted-foreground">
                        هل لديك مسؤول حماية بيانات معين؟
                      </p>
                    </div>
                    <FormField
                      control={form.control}
                      name="has_dpo"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-has-dpo"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  {watchHasDpo && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                      <FormField
                        control={form.control}
                        name="dpo_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>الاسم</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="اسم مسؤول حماية البيانات" data-testid="input-dpo-name" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="dpo_email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              البريد الإلكتروني
                              {autoFilledFields.dpo_email && (
                                <AutoDetectedBadge onClear={() => clearAutoFill("dpo_email")} />
                              )}
                            </FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                type="email" 
                                dir="ltr" 
                                placeholder="dpo@example.com" 
                                data-testid="input-dpo-email"
                                className={autoFilledFields.dpo_email ? "border-primary/50 bg-primary/5" : ""}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="dpo_address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>العنوان</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="عنوان مسؤول حماية البيانات" data-testid="input-dpo-address" />
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
                </CardContent>
              </Card>
            </div>
          )}

          {currentStep === 16 && (
            <div className="animate-in fade-in slide-in-from-left-4 duration-300">
              <Card>
                <CardHeader dir="rtl">
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    آلية الشكاوى
                  </CardTitle>
                  <CardDescription>كيف يتم استقبال الشكاوى والرد عليها؟</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="complaint_contact"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>جهة استقبال الشكاوى *</FormLabel>
                        <FormDescription>
                          الإدارة أو القسم المختص باستقبال الشكاوى
                        </FormDescription>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="مثال: قسم خدمة العملاء / الإدارة القانونية / إدارة الامتثال"
                            data-testid="input-complaint-contact"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="complaint_contact_details"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>بيانات التواصل</FormLabel>
                        <FormControl>
                          <Input 
                            value={field.value || ""}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            name={field.name}
                            ref={field.ref}
                            placeholder="البريد الإلكتروني أو رقم الهاتف للتواصل"
                            data-testid="input-complaint-contact-details"
                          />
                        </FormControl>
                        <FormDescription>
                          البريد الإلكتروني أو رقم الهاتف المخصص لاستقبال الشكاوى
                        </FormDescription>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="complaint_response_days"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>مدة الرد على الشكوى *</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(parseInt(value))} 
                          value={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-complaint-response-days">
                              <SelectValue placeholder="اختر مدة الرد على الشكوى" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {RESPONSE_TIMEFRAMES.map((timeframe) => (
                              <SelectItem key={timeframe.id} value={timeframe.days.toString()}>
                                {timeframe.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                </CardContent>
              </Card>
            </div>
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
            
            {currentStep < TOTAL_SUB_STEPS ? (
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
                {createPolicyRequestMutation.isPending ? (
                  <>
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    جاري إعداد الطلب...
                  </>
                ) : (
                  <>
                    <CreditCard className="ml-2 h-4 w-4" />
                    المتابعة للدفع - {POLICY_PRICE_SAR} ر.س
                  </>
                )}
              </Button>
            )}
          </div>
        </form>
      </Form>

      {isLoggedIn && policies && policies.length > 0 && (
        <Card className="mt-8">
          <CardHeader dir="rtl">
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
