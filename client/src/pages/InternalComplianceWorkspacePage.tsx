import { useState } from "react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Users, ShieldAlert } from "lucide-react";
import RopaTab from "@/components/workspace/RopaTab";
import DsarTab from "@/components/workspace/DsarTab";
import DpiaTab from "@/components/workspace/DpiaTab";

export default function InternalComplianceWorkspacePage() {
  const [activeTab, setActiveTab] = useState("ropa");

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <Badge variant="secondary" className="mx-auto">
            الامتثال الداخلي
          </Badge>
          <h1 className="text-4xl font-bold">مساحة العمل الموحدة للامتثال الداخلي</h1>
          <p className="text-lg text-muted-foreground">
            إدارة ROPA وطلبات الوصول وتقييمات التأثير في مكان واحد
          </p>
        </div>

        {/* Tabs */}
        <Card className="border-2 border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-center">الأدوات</CardTitle>
          </CardHeader>
          <div className="px-6 pb-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="ropa" data-testid="tab-ropa">
                  <FileText className="w-4 h-4 ml-2" />
                  <span className="hidden sm:inline">ROPA</span>
                </TabsTrigger>
                <TabsTrigger value="dsar" data-testid="tab-dsar">
                  <Users className="w-4 h-4 ml-2" />
                  <span className="hidden sm:inline">DSAR</span>
                </TabsTrigger>
                <TabsTrigger value="dpia" data-testid="tab-dpia">
                  <ShieldAlert className="w-4 h-4 ml-2" />
                  <span className="hidden sm:inline">DPIA</span>
                </TabsTrigger>
              </TabsList>

              <div className="mt-6">
                <TabsContent value="ropa" data-testid="content-ropa">
                  <RopaTab />
                </TabsContent>

                <TabsContent value="dsar" data-testid="content-dsar">
                  <DsarTab />
                </TabsContent>

                <TabsContent value="dpia" data-testid="content-dpia">
                  <DpiaTab />
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </Card>

        {/* Info Cards */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="border-none shadow-sm bg-muted/50">
            <CardHeader>
              <FileText className="h-6 w-6 text-primary mb-2" />
              <CardTitle className="text-lg">سجل المعالجة والمساءلة</CardTitle>
              <CardDescription>
                توثيق شامل لجميع عمليات معالجة البيانات الشخصية
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-none shadow-sm bg-muted/50">
            <CardHeader>
              <Users className="h-6 w-6 text-primary mb-2" />
              <CardTitle className="text-lg">طلبات الوصول للبيانات</CardTitle>
              <CardDescription>
                إدارة وتتبع طلبات حقوق صاحب البيانات المختلفة
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-none shadow-sm bg-muted/50">
            <CardHeader>
              <ShieldAlert className="h-6 w-6 text-primary mb-2" />
              <CardTitle className="text-lg">تقييم التأثير</CardTitle>
              <CardDescription>
                تقييم المخاطر والتأثير على حماية البيانات الشخصية
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </div>
  );
}
