import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { insertComplianceScanSchema } from "@shared/schema";
import { useLocation, Link } from "wouter";
import { Shield, FileText, ScrollText, CheckCircle, Sparkles, FileSearch, Globe, Layers, Lock, Users } from "lucide-react";
import { z } from "zod";

export default function HomePage() {
  const [url, setUrl] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const scanMutation = useMutation({
    mutationFn: async (data: { url: string }) => {
      const response = await apiRequest("POST", "/api/scans", data);
      return await response.json();
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

  const additionalServices = [
    {
      icon: <FileText className="w-10 h-10" />,
      title: "مُولّد سياسة الخصوصية",
      description: "أنشئ سياسة خصوصية متوافقة مع نظام حماية البيانات الشخصية السعودي بدقائق",
      href: "/privacy-generator",
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-500/10",
      badge: "متوافق مع PDPL",
      testId: "card-service-privacy"
    },
    {
      icon: <ScrollText className="w-10 h-10" />,
      title: "مُولّد الشروط والأحكام",
      description: "أنشئ شروطاً وأحكاماً واضحة ومتوافقة مع الأنظمة السعودية لموقعك أو تطبيقك",
      href: "/terms-generator",
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-500/10",
      badge: "احترافي",
      testId: "card-service-terms"
    },
    {
      icon: <CheckCircle className="w-10 h-10" />,
      title: "منصة إدارة الموافقة",
      description: "إدارة وتتبع موافقات المستخدمين والكوكيز بشكل متوافق مع اللوائح السعودية",
      href: "/consent-management",
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-500/10",
      badge: "CMP",
      testId: "card-service-consent"
    },
    {
      icon: <Sparkles className="w-10 h-10" />,
      title: "المساعد الذكي",
      description: "اسأل أي سؤال عن نظام حماية البيانات الشخصية واحصل على إجابات فورية ودقيقة",
      href: "/smart-assistant",
      color: "text-pink-600 dark:text-pink-400",
      bgColor: "bg-pink-500/10",
      badge: "RAG مدعوم بتقنية",
      testId: "card-service-assistant"
    }
  ];

  const features = [
    {
      icon: <Shield className="w-6 h-6" />,
      title: "متوافق 100%",
      description: "مع نظام حماية البيانات الشخصية السعودي",
    },
    {
      icon: <Sparkles className="w-6 h-6" />,
      title: "ذكاء اصطناعي متقدم",
      description: "نستخدم GPT-4o لتحليل دقيق ومتخصص",
    },
    {
      icon: <FileText className="w-6 h-6" />,
      title: "وثائق جاهزة",
      description: "احصل على سياسات وشروط احترافية فوراً",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Brand Header */}
      <section className="bg-primary/5 border-b">
        <div className="container py-6">
          <div className="flex items-center justify-center gap-3">
            <Shield className="w-10 h-10 text-primary" />
            <h1 className="text-5xl md:text-6xl font-bold text-primary" data-testid="text-brand-sirbal">
              سِرْبَال
            </h1>
          </div>
          <p className="text-center text-lg font-semibold text-primary mt-2">
            درع الامتثال
          </p>
        </div>
      </section>

      {/* Hero Section */}
      <section className="container py-12 md:py-16">
        <div className="mx-auto max-w-4xl text-center mb-12">
          <Badge className="mb-4" variant="secondary">
            <Shield className="w-3 h-3 ml-1" />
            متوافق مع نظام حماية البيانات الشخصية السعودي
          </Badge>
          <p className="text-lg text-muted-foreground mb-6 max-w-2xl mx-auto">
            كل ما تحتاجه لضمان امتثال موقعك أو تطبيقك لنظام حماية البيانات الشخصية السعودي - في مكان واحد
          </p>
        </div>

        {/* Compliance Checker Tool - PROMINENT & FREE */}
        <div className="mx-auto max-w-4xl mb-16">
          <Card className="border-2 border-primary/20 shadow-lg">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <FileSearch className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl md:text-3xl">
                افحص موقعك للامتثال - مجاناً
              </CardTitle>
              <CardDescription className="text-base mt-2">
                تحليل شامل باستخدام الذكاء الاصطناعي لاكتشاف مخالفات حماية البيانات الشخصية
              </CardDescription>
              <Badge variant="secondary" className="mt-3 mx-auto">
                مجاني بالكامل - بدون تسجيل
              </Badge>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-col sm:flex-row gap-3 max-w-2xl mx-auto">
                <div className="flex-1">
                  <Input
                    placeholder="https://example.com"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="text-left h-12 text-base"
                    dir="ltr"
                    disabled={scanMutation.isPending}
                    data-testid="input-scan-url"
                  />
                </div>
                <Button 
                  onClick={handleScan}
                  disabled={!url || scanMutation.isPending}
                  size="lg"
                  className="px-8 h-12 text-base"
                  data-testid="button-start-scan"
                >
                  {scanMutation.isPending ? (
                    <>
                      <Globe className="ml-2 h-5 w-5 animate-spin" />
                      جاري الفحص...
                    </>
                  ) : (
                    <>
                      <FileSearch className="ml-2 h-5 w-5" />
                      ابدأ الفحص
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-4">
                ✓ فحص فوري  •  ✓ تقرير شامل  •  ✓ توصيات عملية
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Features - Ordered as requested */}
        <div className="mx-auto max-w-5xl mb-16">
          <div className="grid gap-6 md:grid-cols-3">
            {features.map((feature, index) => (
              <Card key={index} className="text-center border-none shadow-none bg-muted/50">
                <CardContent className="pt-6">
                  <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
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

        {/* Unified Compliance Workspace - Prominent CTA */}
        <div className="mx-auto max-w-4xl mb-16">
          <Link href="/workspace">
            <Card 
              className="hover-elevate active-elevate-2 cursor-pointer border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-transparent to-primary/5"
              data-testid="card-workspace"
            >
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Layers className="h-8 w-8 text-primary" />
                </div>
                <Badge variant="default" className="mx-auto mb-3">
                  موحّد في مكان واحد
                </Badge>
                <CardTitle className="text-2xl md:text-3xl">
                  مساحة العمل الموحدة للامتثال
                </CardTitle>
                <CardDescription className="text-base mt-2 max-w-xl mx-auto">
                  أنشئ سياسة الخصوصية والشروط والأحكام وإدارة الموافقات وإعدادات الخصوصية - كلها في مكان واحد
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 text-center">
                <div className="flex flex-wrap justify-center gap-2 mb-4">
                  <Badge variant="outline" className="text-xs">
                    <FileText className="w-3 h-3 ml-1" />
                    سياسة الخصوصية
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    <ScrollText className="w-3 h-3 ml-1" />
                    الشروط والأحكام
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    <CheckCircle className="w-3 h-3 ml-1" />
                    إدارة الموافقة
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    <Shield className="w-3 h-3 ml-1" />
                    إعدادات الخصوصية
                  </Badge>
                </div>
                <Button size="lg" className="px-8">
                  <Layers className="ml-2 h-5 w-5" />
                  ابدأ الآن
                </Button>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Internal Compliance Workspace - Prominent CTA */}
        <div className="mx-auto max-w-4xl mb-16">
          <Link href="/internal-compliance">
            <Card 
              className="hover-elevate active-elevate-2 cursor-pointer border-2 border-accent/30 bg-gradient-to-br from-accent/5 via-transparent to-accent/5"
              data-testid="card-internal-compliance"
            >
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
                  <Lock className="h-8 w-8 text-accent" />
                </div>
                <Badge variant="secondary" className="mx-auto mb-3">
                  إدارة شاملة
                </Badge>
                <CardTitle className="text-2xl md:text-3xl">
                  مساحة العمل الموحدة للامتثال الداخلي
                </CardTitle>
                <CardDescription className="text-base mt-2 max-w-xl mx-auto">
                  إدارة سجل المعالجة (ROPA) وطلبات الوصول (DSAR) وتقييمات التأثير (DPIA) - كلها في مكان واحد
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 text-center">
                <div className="flex flex-wrap justify-center gap-2 mb-4">
                  <Badge variant="outline" className="text-xs">
                    <FileText className="w-3 h-3 ml-1" />
                    ROPA
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    <Users className="w-3 h-3 ml-1" />
                    DSAR
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    <Lock className="w-3 h-3 ml-1" />
                    DPIA
                  </Badge>
                </div>
                <Button size="lg" className="px-8">
                  <Lock className="ml-2 h-5 w-5" />
                  ابدأ الآن
                </Button>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Additional Services */}
        <div className="mx-auto max-w-6xl">
          <h2 className="text-2xl font-bold text-center mb-8">أدوات إضافية</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
            {additionalServices.map((service) => (
              <Link key={service.testId} href={service.href}>
                <Card 
                  className="hover-elevate active-elevate-2 cursor-pointer h-full transition-all duration-200"
                  data-testid={service.testId}
                >
                  <CardHeader className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl ${service.bgColor} ${service.color}`}>
                        {service.icon}
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {service.badge}
                      </Badge>
                    </div>
                    <div>
                      <CardTitle className="text-xl mb-2">{service.title}</CardTitle>
                      <CardDescription className="text-sm leading-relaxed">
                        {service.description}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Button variant="ghost" className="w-full" size="sm">
                      ابدأ الآن ←
                    </Button>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Why Choose Us */}
        <div className="mx-auto max-w-4xl mt-20">
          <Card className="bg-gradient-to-br from-primary/5 via-primary/10 to-transparent border-primary/20">
            <CardHeader>
              <CardTitle className="text-2xl text-center">لماذا تختار منصتنا؟</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center space-y-2">
                  <div className="text-3xl font-bold text-primary">100%</div>
                  <p className="text-sm text-muted-foreground">متوافق مع اللوائح السعودية</p>
                </div>
                <div className="text-center space-y-2">
                  <div className="text-3xl font-bold text-primary">AI</div>
                  <p className="text-sm text-muted-foreground">تحليل ذكي بتقنية GPT-4o</p>
                </div>
                <div className="text-center space-y-2">
                  <div className="text-3xl font-bold text-primary">دقائق</div>
                  <p className="text-sm text-muted-foreground">احصل على وثائق جاهزة فوراً</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-16 border-t">
        <div className="container py-8">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <p className="text-sm font-medium">منصة حماية البيانات الشخصية</p>
            </div>
            <p className="text-sm text-muted-foreground max-w-2xl">
              هذه المنصة مصممة للمساعدة في تحقيق الامتثال لنظام حماية البيانات الشخصية السعودي
              ولا تغني عن الاستشارة القانونية المتخصصة
            </p>
            <div className="flex items-center gap-4">
              <p className="text-xs text-muted-foreground">
                © 2024 منصة حماية البيانات - جميع الحقوق محفوظة
              </p>
              <Link href="/admin/login">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-xs text-muted-foreground hover:text-foreground"
                  data-testid="link-admin-login"
                >
                  <Shield className="w-3 h-3 ml-1" />
                  لوحة التحكم
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
