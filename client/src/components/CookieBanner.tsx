import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Cookie, Settings, X } from "lucide-react";

interface CookieBannerProps {
  onAccept: (preferences: ConsentPreferences) => void;
  onReject: () => void;
  settings?: {
    bannerTitle: string;
    bannerDescription: string;
    privacyPolicyUrl: string;
    termsUrl: string;
  };
}

export interface ConsentPreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  performance: boolean;
}

const categoryLabels: Record<keyof ConsentPreferences, string> = {
  necessary: "ضرورية",
  analytics: "تحليلية",
  marketing: "تسويقية",
  performance: "أداء",
};

const categoryDescriptions: Record<keyof ConsentPreferences, string> = {
  necessary: "ضرورية لعمل الموقع بشكل صحيح ولا يمكن تعطيلها",
  analytics: "تساعدنا على فهم كيفية استخدامك للموقع لتحسين الخدمة",
  marketing: "تُستخدم لعرض إعلانات مخصصة بناءً على اهتماماتك",
  performance: "تساعد في تحسين أداء الموقع وسرعة التحميل",
};

export default function CookieBanner({ onAccept, onReject, settings }: CookieBannerProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [showCustomize, setShowCustomize] = useState(false);
  const [preferences, setPreferences] = useState<ConsentPreferences>({
    necessary: true,
    analytics: false,
    marketing: false,
    performance: false,
  });

  const defaultSettings = {
    bannerTitle: settings?.bannerTitle || "نحترم خصوصيتك",
    bannerDescription: settings?.bannerDescription || "نستخدم ملفات تعريف الارتباط (الكوكيز) لتحسين تجربتك على موقعنا. يمكنك اختيار الفئات التي توافق عليها.",
    privacyPolicyUrl: settings?.privacyPolicyUrl || "/privacy-policy",
    termsUrl: settings?.termsUrl || "/terms",
  };

  const handleAcceptAll = () => {
    const allAccepted: ConsentPreferences = {
      necessary: true,
      analytics: true,
      marketing: true,
      performance: true,
    };
    onAccept(allAccepted);
    setIsVisible(false);
  };

  const handleRejectAll = () => {
    onReject();
    setIsVisible(false);
  };

  const handleSaveCustom = () => {
    onAccept(preferences);
    setShowCustomize(false);
    setIsVisible(false);
  };

  const handleToggleCategory = (category: keyof ConsentPreferences) => {
    if (category === "necessary") return; // Cannot toggle necessary cookies
    setPreferences(prev => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  if (!isVisible) return null;

  return (
    <>
      <div
        className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6"
        style={{ direction: "rtl" }}
        data-testid="cookie-banner"
      >
        <Card className="mx-auto max-w-4xl p-6 shadow-lg">
          <div className="flex items-start gap-4">
            <div className="rounded-lg bg-primary/10 p-2">
              <Cookie className="h-6 w-6 text-primary" />
            </div>
            
            <div className="flex-1 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold" data-testid="text-banner-title">
                    {defaultSettings.bannerTitle}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground" data-testid="text-banner-description">
                    {defaultSettings.bannerDescription}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleRejectAll}
                  data-testid="button-close-banner"
                  className="hover-elevate active-elevate-2"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                <a
                  href={defaultSettings.privacyPolicyUrl}
                  className="text-primary hover:underline"
                  data-testid="link-privacy-policy"
                >
                  سياسة الخصوصية
                </a>
                <span className="text-muted-foreground">•</span>
                <a
                  href={defaultSettings.termsUrl}
                  className="text-primary hover:underline"
                  data-testid="link-terms"
                >
                  الشروط والأحكام
                </a>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={handleAcceptAll}
                  data-testid="button-accept-all"
                  className="hover-elevate active-elevate-2"
                >
                  قبول الكل
                </Button>
                <Button
                  variant="outline"
                  onClick={handleRejectAll}
                  data-testid="button-reject-all"
                  className="hover-elevate active-elevate-2"
                >
                  رفض الكل
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setShowCustomize(true)}
                  data-testid="button-customize"
                  className="hover-elevate active-elevate-2"
                >
                  <Settings className="ml-2 h-4 w-4" />
                  تخصيص
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Dialog open={showCustomize} onOpenChange={setShowCustomize}>
        <DialogContent className="max-w-2xl" style={{ direction: "rtl" }}>
          <DialogHeader>
            <DialogTitle data-testid="text-customize-title">تخصيص تفضيلات الكوكيز</DialogTitle>
            <DialogDescription data-testid="text-customize-description">
              اختر الفئات التي توافق عليها. الفئات الضرورية مطلوبة لعمل الموقع ولا يمكن تعطيلها.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {(Object.keys(preferences) as Array<keyof ConsentPreferences>).map((category) => (
              <div
                key={category}
                className="flex items-start justify-between gap-4 rounded-lg border p-4"
                data-testid={`category-${category}`}
              >
                <div className="flex-1 space-y-1">
                  <Label
                    htmlFor={`consent-${category}`}
                    className="text-base font-medium"
                    data-testid={`label-${category}`}
                  >
                    {categoryLabels[category]}
                  </Label>
                  <p className="text-sm text-muted-foreground" data-testid={`description-${category}`}>
                    {categoryDescriptions[category]}
                  </p>
                </div>
                <Switch
                  id={`consent-${category}`}
                  checked={preferences[category]}
                  onCheckedChange={() => handleToggleCategory(category)}
                  disabled={category === "necessary"}
                  data-testid={`switch-${category}`}
                />
              </div>
            ))}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowCustomize(false)}
              data-testid="button-cancel-customize"
              className="hover-elevate active-elevate-2"
            >
              إلغاء
            </Button>
            <Button
              onClick={handleSaveCustom}
              data-testid="button-save-preferences"
              className="hover-elevate active-elevate-2"
            >
              حفظ التفضيلات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
