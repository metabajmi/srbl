import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { BackButton } from "@/components/BackButton";
import { FileText, Shield, Sparkles, CheckCircle2 } from "lucide-react";

import PrivacyGeneratorTab from "@/components/workspace/PrivacyGeneratorTab";
import TermsGeneratorTab from "@/components/workspace/TermsGeneratorTab";

const tabs = [
  {
    id: "privacy",
    label: "سياسة الخصوصية",
    icon: Shield,
    description: "إنشاء سياسة خصوصية متوافقة مع نظام حماية البيانات الشخصية",
  },
  {
    id: "terms",
    label: "الشروط والأحكام",
    icon: FileText,
    description: "إنشاء شروط وأحكام متوافقة مع الأنظمة السعودية",
  },
];

export default function ComplianceWorkspacePage() {
  const [activeTab, setActiveTab] = useState("privacy");

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
                مساحة العمل الموحدة
              </h1>
              <p className="text-muted-foreground">
                أنشئ جميع وثائق الامتثال من مكان واحد
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <Card
                key={tab.id}
                className={`cursor-pointer transition-all hover-elevate ${
                  isActive ? "border-primary/50 bg-primary/5" : ""
                }`}
                onClick={() => setActiveTab(tab.id)}
                data-testid={`card-tab-${tab.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isActive ? "bg-primary/20" : "bg-muted"}`}>
                      <Icon className={`h-5 w-5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium truncate ${isActive ? "text-primary" : ""}`}>
                        {tab.label}
                      </p>
                    </div>
                    {isActive && (
                      <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="hidden">
            {tabs.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="privacy" className="mt-0">
            <PrivacyGeneratorTab />
          </TabsContent>

          <TabsContent value="terms" className="mt-0">
            <TermsGeneratorTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
