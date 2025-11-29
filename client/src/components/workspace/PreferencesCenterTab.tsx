import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Shield, Cookie, AlertCircle, Lock, BarChart3, Megaphone, Zap } from "lucide-react";
import type { ConsentPreferences } from "@/components/CookieBanner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const CONSENT_STORAGE_KEY = "pdpl_consent";
const ANONYMOUS_ID_KEY = "pdpl_anonymous_id";

interface StoredConsent extends ConsentPreferences {
  timestamp: number;
  version: string;
}

const categoryLabels: Record<keyof ConsentPreferences, string> = {
  necessary: "الكوكيز الضرورية",
  analytics: "الكوكيز التحليلية",
  marketing: "الكوكيز التسويقية",
  performance: "كوكيز الأداء",
};

const categoryDescriptions: Record<keyof ConsentPreferences, string> = {
  necessary: "ضرورية لتشغيل الموقع بشكل أساسي. لا يمكن تعطيل هذه الكوكيز لأن الموقع لن يعمل بدونها.",
  analytics: "تساعدنا على فهم كيفية تفاعلك مع الموقع من خلال جمع وتحليل معلومات حول استخدامك.",
  marketing: "تُستخدم لعرض إعلانات ذات صلة بك استناداً إلى اهتماماتك.",
  performance: "تساعد في تحسين أداء الموقع وسرعة التحميل.",
};

const CategoryIcons: Record<keyof ConsentPreferences, React.FC<{ className?: string }>> = {
  necessary: Lock,
  analytics: BarChart3,
  marketing: Megaphone,
  performance: Zap,
};

export default function PreferencesCenterTab() {
  const { toast } = useToast();
  const [preferences, setPreferences] = useState<ConsentPreferences>({
    necessary: true,
    analytics: false,
    marketing: false,
    performance: false,
  });
  const [hasExistingConsent, setHasExistingConsent] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (stored) {
      try {
        const consent: StoredConsent = JSON.parse(stored);
        const prefs: ConsentPreferences = {
          necessary: consent.necessary,
          analytics: consent.analytics,
          marketing: consent.marketing,
          performance: consent.performance,
        };
        setPreferences(prefs);
        setHasExistingConsent(true);
      } catch {
        // Invalid data, use defaults
      }
    }
  }, []);

  const savePreferencesMutation = useMutation({
    mutationFn: async (prefs: ConsentPreferences) => {
      const anonymousId = localStorage.getItem(ANONYMOUS_ID_KEY) || 
        `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      localStorage.setItem(ANONYMOUS_ID_KEY, anonymousId);
      
      return apiRequest("POST", "/api/cmp/consent", {
        anonymousId,
        necessaryCookies: "accepted",
        analyticsCookies: prefs.analytics ? "accepted" : "rejected",
        marketingCookies: prefs.marketing ? "accepted" : "rejected",
        performanceCookies: prefs.performance ? "accepted" : "rejected",
        consentMethod: "preferences_center",
        consentVersion: "1.0",
        ipAddress: null,
        userAgent: navigator.userAgent,
      });
    },
    onSuccess: () => {
      toast({ title: "تم الحفظ", description: "تم حفظ تفضيلات الخصوصية بنجاح" });
    },
    onError: (error: Error) => {
      toast({ title: "فشل في الحفظ", description: error.message, variant: "destructive" });
    },
  });

  const withdrawConsentMutation = useMutation({
    mutationFn: async () => {
      const anonymousId = localStorage.getItem(ANONYMOUS_ID_KEY);
      if (!anonymousId) {
        throw new Error("لا توجد موافقة سابقة لسحبها");
      }
      
      return apiRequest("POST", "/api/cmp/consent/withdraw", {
        anonymousId,
        withdrawalReason: "طلب المستخدم",
      });
    },
    onSuccess: () => {
      const onlyNecessary: ConsentPreferences = {
        necessary: true,
        analytics: false,
        marketing: false,
        performance: false,
      };
      setPreferences(onlyNecessary);
      
      const consent: StoredConsent = {
        ...onlyNecessary,
        timestamp: Date.now(),
        version: "1.0",
      };
      localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consent));
      setHasExistingConsent(false);
      
      toast({ title: "تم سحب الموافقة", description: "تم سحب جميع الموافقات ما عدا الكوكيز الضرورية" });
    },
    onError: (error: Error) => {
      toast({ title: "فشل في سحب الموافقة", description: error.message, variant: "destructive" });
    },
  });

  const handleToggleCategory = (category: keyof ConsentPreferences) => {
    if (category === "necessary") return;
    setPreferences(prev => ({ ...prev, [category]: !prev[category] }));
  };

  const handleSavePreferences = () => {
    const consent: StoredConsent = {
      ...preferences,
      timestamp: Date.now(),
      version: "1.0",
    };
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consent));
    savePreferencesMutation.mutate(preferences);
    setHasExistingConsent(true);
  };

  const handleWithdrawConsent = () => {
    withdrawConsentMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <div className="rounded-lg bg-primary/10 p-3">
          <Shield className="h-8 w-8 text-primary" />
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-bold" data-testid="text-preferences-title">
            إعدادات الخصوصية
          </h2>
          <p className="mt-2 text-muted-foreground" data-testid="text-preferences-description">
            يمكنك التحكم في تفضيلات الخصوصية الخاصة بك. نحن نحترم خياراتك ونلتزم بحماية خصوصيتك وفقاً لقانون حماية البيانات الشخصية السعودي.
          </p>
        </div>
      </div>

      <Separator />

      {hasExistingConsent && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Cookie className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">الحالة الحالية</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              لديك موافقة نشطة. يمكنك تعديل تفضيلاتك في أي وقت أو سحب الموافقة بالكامل.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        <h3 className="text-xl font-semibold" data-testid="text-categories-title">
          فئات الكوكيز
        </h3>
        
        {(Object.keys(preferences) as Array<keyof ConsentPreferences>).map((category) => {
          const Icon = CategoryIcons[category];
          return (
            <Card key={category} data-testid={`category-card-${category}`}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="rounded-lg bg-primary/10 p-1.5">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <CardTitle data-testid={`label-${category}`}>
                        {categoryLabels[category]}
                      </CardTitle>
                      {category === "necessary" && (
                        <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                          مطلوبة
                        </span>
                      )}
                    </div>
                    <CardDescription data-testid={`description-${category}`}>
                      {categoryDescriptions[category]}
                    </CardDescription>
                  </div>
                  <Switch
                    checked={preferences[category]}
                    onCheckedChange={() => handleToggleCategory(category)}
                    disabled={category === "necessary"}
                    data-testid={`switch-${category}`}
                    className="mt-1"
                  />
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3">
        <Button
          onClick={handleSavePreferences}
          disabled={savePreferencesMutation.isPending}
          data-testid="button-save-prefs"
        >
          {savePreferencesMutation.isPending ? "جاري الحفظ..." : "حفظ التفضيلات"}
        </Button>

        {hasExistingConsent && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" data-testid="button-withdraw">
                <AlertCircle className="ml-2 h-4 w-4" />
                سحب الموافقة
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent dir="rtl">
              <AlertDialogHeader>
                <AlertDialogTitle data-testid="text-withdraw-title">
                  هل أنت متأكد من سحب الموافقة؟
                </AlertDialogTitle>
                <AlertDialogDescription data-testid="text-withdraw-description">
                  سيتم سحب جميع الموافقات ما عدا الكوكيز الضرورية. هذا قد يؤثر على تجربتك في استخدام الموقع.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="gap-2">
                <AlertDialogCancel data-testid="button-cancel-withdraw">
                  إلغاء
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleWithdrawConsent}
                  disabled={withdrawConsentMutation.isPending}
                  data-testid="button-confirm-withdraw"
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {withdrawConsentMutation.isPending ? "جاري السحب..." : "تأكيد السحب"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      <Card className="border-muted">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            <strong>ملاحظة:</strong> الكوكيز الضرورية مطلوبة لعمل الموقع الأساسي ولا يمكن تعطيلها.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
