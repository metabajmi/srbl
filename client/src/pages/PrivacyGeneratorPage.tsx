import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { FileText, Loader2, Download } from "lucide-react";
import { insertPolicyDocumentSchema, type PolicyDocument } from "@shared/schema";
import { z } from "zod";

export default function PrivacyGeneratorPage() {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    companyName: "",
    websiteUrl: "",
    businessType: "",
    dataTypes: "",
    dataUsagePurposes: "",
    hasThirdPartySharing: "no",
    retentionPeriod: "",
    contactEmail: "",
    contactPhone: "",
  });

  const { data: policies } = useQuery({
    queryKey: ["/api/policies"],
  });

  const generateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/policies", data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "تم بدء توليد سياسة الخصوصية",
        description: "سيتم إشعارك عند اكتمال التوليد",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/policies"] });
      setFormData({
        companyName: "",
        websiteUrl: "",
        businessType: "",
        dataTypes: "",
        dataUsagePurposes: "",
        hasThirdPartySharing: "no",
        retentionPeriod: "",
        contactEmail: "",
        contactPhone: "",
      });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ في التوليد",
        description: error.message || "حدث خطأ أثناء توليد سياسة الخصوصية",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    try {
      const validatedData = insertPolicyDocumentSchema.parse({
        companyName: formData.companyName,
        websiteUrl: formData.websiteUrl,
        businessType: formData.businessType,
        dataTypes: formData.dataTypes.split(',').map((s: string) => s.trim()).filter(Boolean),
        dataUsagePurposes: formData.dataUsagePurposes.split(',').map((s: string) => s.trim()).filter(Boolean),
        hasThirdPartySharing: formData.hasThirdPartySharing,
        retentionPeriod: formData.retentionPeriod,
        contactEmail: formData.contactEmail,
        contactPhone: formData.contactPhone || null,
      });
      
      generateMutation.mutate(validatedData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "خطأ في البيانات",
          description: error.errors[0].message,
          variant: "destructive",
        });
      }
    }
  };

  return (
    <div className="container py-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">مُولّد سياسة الخصوصية</h1>
          <p className="text-muted-foreground">
            أنشئ سياسة خصوصية متوافقة مع نظام حماية البيانات الشخصية السعودي
          </p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>معلومات الشركة</CardTitle>
            <CardDescription>
              أدخل معلومات شركتك لتوليد سياسة خصوصية مخصصة
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">اسم الشركة</Label>
                <Input
                  id="companyName"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  placeholder="مثال: شركة التقنية المتقدمة"
                  data-testid="input-company-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="websiteUrl">رابط الموقع</Label>
                <Input
                  id="websiteUrl"
                  type="url"
                  value={formData.websiteUrl}
                  onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                  placeholder="https://example.com"
                  dir="ltr"
                  data-testid="input-website-url"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessType">نوع النشاط</Label>
              <Input
                id="businessType"
                value={formData.businessType}
                onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                placeholder="مثال: تجارة إلكترونية، خدمات مالية، تعليم"
                data-testid="input-business-type"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dataTypes">أنواع البيانات المجمعة (افصل بفاصلة)</Label>
              <Textarea
                id="dataTypes"
                value={formData.dataTypes}
                onChange={(e) => setFormData({ ...formData, dataTypes: e.target.value })}
                placeholder="مثال: الاسم، البريد الإلكتروني، رقم الهاتف، العنوان"
                data-testid="input-data-types"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dataUsagePurposes">أغراض استخدام البيانات (افصل بفاصلة)</Label>
              <Textarea
                id="dataUsagePurposes"
                value={formData.dataUsagePurposes}
                onChange={(e) => setFormData({ ...formData, dataUsagePurposes: e.target.value })}
                placeholder="مثال: معالجة الطلبات، التسويق، التحليلات"
                data-testid="input-data-usage"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="retentionPeriod">مدة الاحتفاظ بالبيانات</Label>
                <Input
                  id="retentionPeriod"
                  value={formData.retentionPeriod}
                  onChange={(e) => setFormData({ ...formData, retentionPeriod: e.target.value })}
                  placeholder="مثال: سنتان من آخر نشاط"
                  data-testid="input-retention-period"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactEmail">البريد الإلكتروني للتواصل</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  placeholder="info@example.com"
                  dir="ltr"
                  data-testid="input-contact-email"
                />
              </div>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={generateMutation.isPending}
              className="w-full"
              data-testid="button-generate"
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  جاري التوليد...
                </>
              ) : (
                <>
                  <FileText className="ml-2 h-5 w-5" />
                  توليد سياسة الخصوصية
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h2 className="text-2xl font-bold">سياسات الخصوصية المولّدة</h2>
          {policies && Array.isArray(policies) && policies.length > 0 ? (
            policies.map((policy: PolicyDocument) => (
              <Card key={policy.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{policy.companyName}</CardTitle>
                      <CardDescription className="mt-1">
                        {policy.websiteUrl}
                      </CardDescription>
                    </div>
                    <Badge variant={
                      policy.status === "completed" ? "default" :
                      policy.status === "generating" ? "secondary" :
                      policy.status === "failed" ? "destructive" :
                      "outline"
                    }>
                      {policy.status === "completed" ? "مكتمل" :
                       policy.status === "generating" ? "قيد التوليد" :
                       policy.status === "failed" ? "فشل" :
                       "قيد الانتظار"}
                    </Badge>
                  </div>
                </CardHeader>
                {policy.status === "completed" && policy.generatedContent && (
                  <CardContent>
                    <div className="prose prose-sm max-w-none bg-muted p-4 rounded-md">
                      <pre className="whitespace-pre-wrap text-sm" dir="rtl">
                        {policy.generatedContent.substring(0, 500)}...
                      </pre>
                    </div>
                    <Button className="mt-4" variant="outline" data-testid="button-download">
                      <Download className="ml-2 h-4 w-4" />
                      تحميل السياسة الكاملة
                    </Button>
                  </CardContent>
                )}
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                لا توجد سياسات مولّدة بعد
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
