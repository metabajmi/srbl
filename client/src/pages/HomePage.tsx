import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { insertComplianceScanSchema } from "@shared/schema";
import { useLocation } from "wouter";
import { Shield, FileSearch, AlertCircle, CheckCircle, FileText, Globe, Sparkles, BarChart } from "lucide-react";
import { z } from "zod";

export default function HomePage() {
  const [url, setUrl] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const scanMutation = useMutation({
    mutationFn: async (data: { url: string }) => {
      return apiRequest("POST", "/api/scans", data);
    },
    onSuccess: (data) => {
      toast({
        title: "بدأ الفحص بنجاح",
        description: "جاري تحليل الموقع الإلكتروني...",
      });
      setLocation(`/scan/${data.id}`);
    },
    onError: (error: any) => {
      toast({
        title: "خطأ في بدء الفحص",
        description: error.message || "حدث خطأ أثناء محاولة فحص الموقع",
        variant: "destructive",
      });
    },
  });

  const handleScan = () => {
    try {
      const validatedData = insertComplianceScanSchema.parse({ url });
      scanMutation.mutate(validatedData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "خطأ في البيانات المدخلة",
          description: error.errors[0].message,
          variant: "destructive",
        });
      }
    }
  };

  const features = [
    {
      icon: <Shield className="w-6 h-6" />,
      title: "فحص شامل للامتثال",
      description: "تحليل عميق لجميع جوانب حماية البيانات الشخصية"
    },
    {
      icon: <Sparkles className="w-6 h-6" />,
      title: "مدعوم بالذكاء الاصطناعي",
      description: "استخدام أحدث تقنيات الذكاء الاصطناعي للتحليل الدقيق"
    },
    {
      icon: <FileText className="w-6 h-6" />,
      title: "تقارير مفصلة",
      description: "تقارير شاملة مع توصيات واضحة للمعالجة"
    },
    {
      icon: <BarChart className="w-6 h-6" />,
      title: "مراجع قانونية دقيقة",
      description: "الإشارة إلى المواد المحددة من اللوائح السعودية"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary" />
            <h1 className="text-xl font-bold">أداة فحص الامتثال لحماية البيانات</h1>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container py-12 md:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <Badge className="mb-4" variant="secondary">
            متوافق مع نظام حماية البيانات الشخصية السعودي
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            افحص موقعك الإلكتروني للتأكد من
            <span className="text-primary"> الامتثال الكامل </span>
            لقوانين حماية البيانات
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            أداة متقدمة تستخدم الذكاء الاصطناعي لتحليل موقعك وتحديد مخالفات حماية البيانات الشخصية
            وتقديم توصيات مفصلة للمعالجة وفقاً للوائح السعودية
          </p>

          {/* Scan Form */}
          <Card className="mb-12">
            <CardHeader>
              <CardTitle className="text-xl">ابدأ فحص الامتثال الآن</CardTitle>
              <CardDescription>
                أدخل رابط موقعك الإلكتروني للحصول على تحليل شامل
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <div className="flex-1">
                  <Input
                    placeholder="https://example.com"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="text-left"
                    dir="ltr"
                    disabled={scanMutation.isPending}
                    data-testid="input-url"
                  />
                </div>
                <Button 
                  onClick={handleScan}
                  disabled={!url || scanMutation.isPending}
                  size="lg"
                  className="px-8"
                  data-testid="button-scan"
                >
                  {scanMutation.isPending ? (
                    <>
                      <Globe className="ml-2 h-4 w-4 animate-spin" />
                      جاري الفحص...
                    </>
                  ) : (
                    <>
                      <FileSearch className="ml-2 h-5 w-5" />
                      فحص الموقع
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Features Grid */}
        <div className="mx-auto max-w-4xl">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => (
              <Card key={index} className="text-center">
                <CardContent className="pt-6">
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    {feature.icon}
                  </div>
                  <h3 className="mb-2 font-semibold">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* How it Works */}
        <div className="mx-auto max-w-3xl mt-16">
          <h3 className="text-2xl font-bold text-center mb-8">كيف تعمل الأداة؟</h3>
          <div className="space-y-4">
            <Card>
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                  1
                </div>
                <div>
                  <h4 className="font-semibold mb-1">أدخل رابط الموقع</h4>
                  <p className="text-sm text-muted-foreground">
                    قم بإدخال رابط موقعك الإلكتروني المراد فحصه
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                  2
                </div>
                <div>
                  <h4 className="font-semibold mb-1">تحليل بالذكاء الاصطناعي</h4>
                  <p className="text-sm text-muted-foreground">
                    تقوم الأداة بفحص الموقع وتحليل محتواه باستخدام تقنيات متقدمة
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                  3
                </div>
                <div>
                  <h4 className="font-semibold mb-1">تقرير شامل</h4>
                  <p className="text-sm text-muted-foreground">
                    احصل على تقرير مفصل يحتوي على جميع المخالفات وطرق معالجتها
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Compliance Categories */}
        <div className="mx-auto max-w-4xl mt-16">
          <h3 className="text-2xl font-bold text-center mb-8">مجالات الفحص</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardContent className="flex items-start gap-3 pt-6">
                <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
                <div>
                  <h4 className="font-semibold mb-1">سياسة الخصوصية</h4>
                  <p className="text-sm text-muted-foreground">
                    التحقق من وجود سياسة خصوصية شاملة وواضحة
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-start gap-3 pt-6">
                <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
                <div>
                  <h4 className="font-semibold mb-1">الموافقة الصريحة</h4>
                  <p className="text-sm text-muted-foreground">
                    فحص آليات الحصول على موافقة المستخدم
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-start gap-3 pt-6">
                <CheckCircle className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-semibold mb-1">حقوق أصحاب البيانات</h4>
                  <p className="text-sm text-muted-foreground">
                    التأكد من توضيح حقوق الأفراد في البيانات
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-start gap-3 pt-6">
                <CheckCircle className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-semibold mb-1">أمن البيانات</h4>
                  <p className="text-sm text-muted-foreground">
                    تقييم إجراءات حماية وتأمين البيانات الشخصية
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-20 border-t">
        <div className="container py-8">
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="text-sm text-muted-foreground">
              هذه الأداة مصممة للمساعدة في تحقيق الامتثال ولا تغني عن الاستشارة القانونية المتخصصة
            </p>
            <p className="text-xs text-muted-foreground">
              © 2024 أداة فحص الامتثال - جميع الحقوق محفوظة
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}