import { BackButton } from "@/components/BackButton";
import { Sparkles } from "lucide-react";
import PrivacyGeneratorTab from "@/components/workspace/PrivacyGeneratorTab";

export default function ComplianceWorkspacePage() {

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20" dir="rtl">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <BackButton />
        
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-l from-primary to-primary/60 bg-clip-text text-transparent">
                مُنشئ سياسة الخصوصية
              </h1>
              <p className="text-muted-foreground">
                أكمل الخطوات التالية لإنشاء سياسة خصوصية تناسب نشاطك لضمان الامتثال وتكسب ثقة عملائك
              </p>
            </div>
          </div>
        </div>

        <PrivacyGeneratorTab />
      </div>
    </div>
  );
}
