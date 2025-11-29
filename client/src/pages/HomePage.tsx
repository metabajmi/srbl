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
      <section className="bg-gradient-to-b from-primary/15 via-primary/8 to-primary/3 border-b backdrop-blur-sm">
        <div className="container py-16">
          <div className="flex items-center justify-center gap-5">
            <div className="flex items-center justify-center">
              <Shield className="w-16 h-16 text-primary drop-shadow-sm" />
            </div>
            <div className="flex flex-col items-center justify-center">
              <h1 className="text-6xl md:text-7xl font-bold text-primary leading-tight" data-testid="text-brand-sirbal">
                سِرْبَال
              </h1>
              <p className="text-xl font-semibold text-primary/75 mt-3 tracking-widest text-center">
                درع الامتثال
              </p>
            </div>
          </div>
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
        <div className="mx-auto max-w-4xl mb-20">
          <Card className="border-2 border-primary/25 shadow-xl hover:shadow-2xl transition-shadow duration-300 bg-gradient-to-br from-white dark:from-slate-950 to-primary/2 dark:to-primary/5">
            <CardHeader className="text-center pb-6 pt-8">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/12 shadow-md">
                <FileSearch className="h-10 w-10 text-primary" />
              </div>
              <CardTitle className="text-3xl md:text-4xl font-bold mb-3">
                افحص موقعك للامتثال - مجاناً
              </CardTitle>
              <CardDescription className="text-base mt-3 leading-relaxed">
                تحليل شامل باستخدام الذكاء الاصطناعي لاكتشاف مخالفات حماية البيانات الشخصية
              </CardDescription>
              <Badge variant="secondary" className="mt-4 mx-auto">
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
        <div className="mx-auto max-w-5xl mb-20">
          <div className="grid gap-8 md:grid-cols-3">
            {features.map((feature, index) => (
              <Card key={index} className="text-center border border-primary/10 shadow-md hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-primary/5 to-transparent">
                <CardContent className="pt-8 pb-6">
                  <div className="mb-5 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 text-primary shadow-sm">
                    {feature.icon}
                  </div>
                  <h3 className="mb-3 font-bold text-lg">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Unified Compliance Workspace - Prominent CTA */}
        <div className="mx-auto max-w-4xl mb-20">
          <Link href="/workspace">
            <Card 
              className="hover-elevate active-elevate-2 cursor-pointer border-2 border-primary/25 shadow-xl bg-gradient-to-br from-primary/8 via-transparent to-primary/4 transition-all duration-300"
              data-testid="card-workspace"
            >
              <CardHeader className="text-center pb-6 pt-8">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/15 shadow-md">
                  <Layers className="h-10 w-10 text-primary" />
                </div>
                <Badge variant="default" className="mx-auto mb-4">
                  موحّد في مكان واحد
                </Badge>
                <CardTitle className="text-3xl md:text-4xl font-bold mb-4">
                  مساحة العمل الموحدة للامتثال
                </CardTitle>
                <CardDescription className="text-base mt-3 max-w-xl mx-auto leading-relaxed">
                  أنشئ سياسة الخصوصية والشروط والأحكام وإدارة الموافقات وإعدادات الخصوصية - كلها في مكان واحد
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 pb-8 text-center">
                <div className="flex flex-wrap justify-center gap-2 mb-8">
                  <Badge variant="outline" className="text-xs px-3 py-1.5">
                    <FileText className="w-3 h-3 ml-1" />
                    سياسة الخصوصية
                  </Badge>
                  <Badge variant="outline" className="text-xs px-3 py-1.5">
                    <ScrollText className="w-3 h-3 ml-1" />
                    الشروط والأحكام
                  </Badge>
                  <Badge variant="outline" className="text-xs px-3 py-1.5">
                    <CheckCircle className="w-3 h-3 ml-1" />
                    إدارة الموافقة
                  </Badge>
                  <Badge variant="outline" className="text-xs px-3 py-1.5">
                    <Shield className="w-3 h-3 ml-1" />
                    إعدادات الخصوصية
                  </Badge>
                </div>
                <Button size="lg" className="px-10 h-11 text-base font-semibold">
                  <Layers className="ml-2 h-5 w-5" />
                  ابدأ الآن
                </Button>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Internal Compliance Workspace - Prominent CTA */}
        <div className="mx-auto max-w-4xl mb-20">
          <Link href="/internal-compliance">
            <Card 
              className="hover-elevate active-elevate-2 cursor-pointer border-2 border-accent/25 shadow-xl bg-gradient-to-br from-accent/8 via-transparent to-accent/4 transition-all duration-300"
              data-testid="card-internal-compliance"
            >
              <CardHeader className="text-center pb-6 pt-8">
                <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 shadow-lg ring-2 ring-green-500/30">
                  <Lock className="h-12 w-12 text-green-600 dark:text-green-400" />
                </div>
                <Badge variant="secondary" className="mx-auto mb-4">
                  إدارة شاملة
                </Badge>
                <CardTitle className="text-3xl md:text-4xl font-bold mb-4">
                  مساحة العمل الموحدة للامتثال الداخلي
                </CardTitle>
                <CardDescription className="text-base mt-3 max-w-xl mx-auto leading-relaxed">
                  إدارة سجل المعالجة (ROPA) وطلبات الوصول (DSAR) وتقييمات التأثير (DPIA) - كلها في مكان واحد
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 pb-8 text-center">
                <div className="flex flex-wrap justify-center gap-2 mb-8">
                  <Badge variant="outline" className="text-xs px-3 py-1.5">
                    <FileText className="w-3 h-3 ml-1" />
                    ROPA
                  </Badge>
                  <Badge variant="outline" className="text-xs px-3 py-1.5">
                    <Users className="w-3 h-3 ml-1" />
                    DSAR
                  </Badge>
                  <Badge variant="outline" className="text-xs px-3 py-1.5">
                    <Lock className="w-3 h-3 ml-1 text-green-600 dark:text-green-400" />
                    DPIA
                  </Badge>
                </div>
                <Button size="lg" className="px-10 h-11 text-base font-semibold bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white">
                  <Lock className="ml-2 h-5 w-5" />
                  ابدأ الآن
                </Button>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Additional Services */}
        <div className="mx-auto max-w-6xl mb-20">
          <h2 className="text-3xl font-bold text-center mb-12">أدوات إضافية</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
            {additionalServices.map((service) => (
              <Link key={service.testId} href={service.href}>
                <Card 
                  className="hover-elevate active-elevate-2 cursor-pointer h-full transition-all duration-300 shadow-md hover:shadow-lg border-l-4"
                  style={{ borderLeftColor: 'hsl(142 76% 36%)' }}
                  data-testid={service.testId}
                >
                  <CardHeader className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-lg ${service.bgColor} ${service.color} shadow-md`}>
                        {service.icon}
                      </div>
                      <Badge variant="secondary" className="text-xs px-2.5 py-0.5">
                        {service.badge}
                      </Badge>
                    </div>
                    <div>
                      <CardTitle className="text-2xl font-bold mb-3">{service.title}</CardTitle>
                      <CardDescription className="text-sm leading-relaxed text-muted-foreground">
                        {service.description}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <Button variant="ghost" className="w-full justify-center text-primary font-semibold hover:bg-primary/5" size="sm">
                      ابدأ الآن →
                    </Button>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Why Choose Us */}
        <div className="mx-auto max-w-4xl mt-16 mb-8">
          <Card className="shadow-xl bg-gradient-to-br from-primary/10 via-primary/8 to-transparent border-2 border-primary/20 transition-all duration-300">
            <CardHeader className="text-center pb-8">
              <CardTitle className="text-3xl md:text-4xl font-bold">لماذا تختار منصتنا؟</CardTitle>
            </CardHeader>
            <CardContent className="pb-8">
              <div className="grid gap-8 md:grid-cols-3">
                <div className="text-center space-y-3">
                  <div className="text-4xl md:text-5xl font-bold text-primary">100%</div>
                  <p className="text-base font-semibold text-muted-foreground">متوافق مع اللوائح السعودية</p>
                </div>
                <div className="h-auto w-0.5 bg-primary/10 hidden md:block mx-auto"></div>
                <div className="text-center space-y-3">
                  <div className="text-4xl md:text-5xl font-bold text-primary">AI</div>
                  <p className="text-base font-semibold text-muted-foreground">تحليل ذكي بتقنية GPT-4o</p>
                </div>
                <div className="h-0.5 w-full bg-primary/10 md:hidden"></div>
                <div className="text-center space-y-3">
                  <div className="text-4xl md:text-5xl font-bold text-primary">دقائق</div>
                  <p className="text-base font-semibold text-muted-foreground">احصل على وثائق جاهزة فوراً</p>
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
