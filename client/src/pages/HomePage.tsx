import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { insertComplianceScanSchema } from "@shared/schema";
import { useLocation, Link } from "wouter";
import { Shield, FileText, ScrollText, CheckCircle, Sparkles, FileSearch, Globe, Layers, Lock, Users, Loader2 } from "lucide-react";
import { z } from "zod";

const scanSteps = [
  "جاري الاتصال بالموقع...",
  "تحليل صفحة الخصوصية...",
  "فحص ملفات تعريف الارتباط...",
  "تحليل الشروط والأحكام...",
  "التحقق من معايير الأمان...",
  "إنشاء التقرير..."
];

export default function HomePage() {
  const [url, setUrl] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStep, setScanStep] = useState(0);

  const scanMutation = useMutation({
    mutationFn: async (data: { url: string }) => {
      const response = await apiRequest("POST", "/api/scans", data);
      return await response.json();
    },
    onSuccess: (data) => {
      setScanProgress(100);
      toast({
        title: "اكتمل الفحص بنجاح",
        description: "جاري عرض النتائج...",
      });
      setTimeout(() => setLocation(`/scan/${data.id}`), 500);
    },
    onError: (error: any) => {
      setScanProgress(0);
      toast({
        title: "خطأ في بدء الفحص",
        description: error.message || "حدث خطأ أثناء محاولة فحص الموقع",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (scanMutation.isPending) {
      setScanProgress(0);
      setScanStep(0);
      interval = setInterval(() => {
        setScanProgress(prev => {
          const increment = Math.random() * 8 + 2;
          const newProgress = Math.min(prev + increment, 95);
          const newStep = Math.min(Math.floor(newProgress / 16), scanSteps.length - 1);
          setScanStep(newStep);
          return newProgress;
        });
      }, 400);
    } else {
      setScanProgress(0);
      setScanStep(0);
    }
    return () => clearInterval(interval);
  }, [scanMutation.isPending]);

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
    <div className="page-wrapper bg-background">
      {/* Brand Header */}
      <section className="bg-gradient-to-b from-primary/15 via-primary/8 to-primary/3 border-b backdrop-blur-sm animate-fade-in">
        <div className="container py-12 md:py-16">
          <div className="flex items-center justify-center gap-4 md:gap-5">
            <div className="flex items-center justify-center animate-scale-in shrink-0">
              <Shield className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 text-primary drop-shadow-sm transition-smooth hover:drop-shadow-lg" />
            </div>
            <div className="flex flex-col items-center justify-center">
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-primary leading-tight animate-stagger-1" data-testid="text-brand-sirbal">
                سِرْبَال
              </h1>
              <p className="text-base sm:text-lg md:text-xl font-semibold text-primary/75 mt-2 md:mt-3 tracking-widest text-center animate-stagger-2">
                درع الامتثال
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"></div>

      {/* Hero Section */}
      <section className="section">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center mb-10 md:mb-12 animate-slide-up">
            <Badge className="mb-4 animate-stagger-1 inline-block" variant="secondary">
              <Shield className="w-3 h-3 ml-1" />
              متوافق مع نظام حماية البيانات الشخصية السعودي
            </Badge>
            <p className="text-base sm:text-lg text-muted-foreground mb-6 max-w-2xl mx-auto animate-stagger-2">
              كل ما تحتاجه لضمان امتثال موقعك أو تطبيقك لنظام حماية البيانات الشخصية السعودي - في مكان واحد
            </p>
          </div>

          {/* Compliance Checker Tool - PROMINENT & FREE */}
          <div className="max-w-3xl mx-auto mb-12 md:mb-16 animate-stagger-2">
            <Card className="border-2 border-primary/25 shadow-xl hover:shadow-2xl transition-smooth duration-300 bg-gradient-to-br from-white dark:from-slate-950 to-primary/2 dark:to-primary/5">
              <CardHeader className="text-center pb-4 sm:pb-6 pt-6 sm:pt-8 px-4 sm:px-6">
                <div className="mx-auto mb-4 sm:mb-6 flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-primary/12 shadow-md">
                  <FileSearch className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
                </div>
                <CardTitle className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 sm:mb-3">
                  افحص موقعك للامتثال - مجاناً
                </CardTitle>
                <CardDescription className="text-sm sm:text-base mt-2 sm:mt-3 leading-relaxed">
                  تحليل شامل باستخدام الذكاء الاصطناعي لاكتشاف مخالفات حماية البيانات الشخصية
                </CardDescription>
                <Badge variant="secondary" className="mt-3 sm:mt-4 mx-auto">
                  مجاني بالكامل - بدون تسجيل
                </Badge>
              </CardHeader>
              <CardContent className="pt-0 px-4 sm:px-6 pb-6 sm:pb-8">
                {scanMutation.isPending ? (
                  <div className="max-w-xl mx-auto space-y-4">
                    <div className="bg-primary/5 rounded-lg p-4 sm:p-6 border border-primary/20">
                      <div className="flex items-center justify-center gap-3 mb-4">
                        <Loader2 className="h-6 w-6 text-primary animate-spin" />
                        <span className="text-lg font-medium text-primary">جاري فحص الموقع</span>
                      </div>
                      <Progress value={scanProgress} className="h-3 mb-3" data-testid="progress-scan" />
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">{scanSteps[scanStep]}</span>
                        <span className="font-medium text-primary">{Math.round(scanProgress)}%</span>
                      </div>
                      <p className="text-xs text-center text-muted-foreground mt-4" dir="ltr">
                        {url}
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto">
                      <div className="flex-1">
                        <Input
                          placeholder="https://example.com"
                          value={url}
                          onChange={(e) => setUrl(e.target.value)}
                          className="text-left h-11 sm:h-12 text-sm sm:text-base"
                          dir="ltr"
                          disabled={scanMutation.isPending}
                          data-testid="input-scan-url"
                        />
                      </div>
                      <Button 
                        onClick={handleScan}
                        disabled={!url || scanMutation.isPending}
                        size="lg"
                        className="px-6 sm:px-8 h-11 sm:h-12 text-sm sm:text-base shrink-0"
                        data-testid="button-start-scan"
                      >
                        <FileSearch className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                        ابدأ الفحص
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground text-center mt-4">
                      فحص فوري • تقرير شامل • توصيات عملية
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Section Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent my-8 md:my-12"></div>

          {/* Features - Ordered as requested */}
          <div className="max-w-4xl mx-auto mb-12 md:mb-16">
            <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-3">
              {features.map((feature, index) => (
                <Card key={index} className={`text-center border border-primary/10 shadow-md hover:shadow-xl transition-smooth duration-300 bg-gradient-to-br from-primary/5 to-transparent animate-stagger-${(index % 3) + 1}`}>
                  <CardContent className="pt-6 sm:pt-8 pb-5 sm:pb-6 px-4">
                    <div className="mb-4 inline-flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-primary/15 text-primary shadow-sm">
                      {feature.icon}
                    </div>
                    <h3 className="mb-2 font-bold text-base sm:text-lg">{feature.title}</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Section Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent my-8 md:my-12"></div>

          {/* Unified Compliance Workspace - Prominent CTA */}
          <div className="max-w-3xl mx-auto mb-10 md:mb-14 animate-stagger-3">
            <Link href="/workspace">
              <Card 
                className="hover-elevate active-elevate-2 cursor-pointer border-2 border-primary/25 shadow-xl bg-gradient-to-br from-primary/8 via-transparent to-primary/4 transition-smooth duration-300"
                data-testid="card-workspace"
              >
                <CardHeader className="text-center pb-4 sm:pb-6 pt-6 sm:pt-8 px-4 sm:px-6">
                  <div className="mx-auto mb-4 sm:mb-6 flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-primary/15 shadow-md">
                    <Layers className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
                  </div>
                  <Badge variant="default" className="mx-auto mb-3 sm:mb-4">
                    موحّد في مكان واحد
                  </Badge>
                  <CardTitle className="text-xl sm:text-2xl md:text-3xl font-bold mb-3">
                    مساحة العمل الموحدة للامتثال
                  </CardTitle>
                  <CardDescription className="text-sm sm:text-base mt-2 max-w-lg mx-auto leading-relaxed">
                    أنشئ سياسة الخصوصية والشروط والأحكام وإدارة الموافقات وإعدادات الخصوصية - كلها في مكان واحد
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0 pb-6 sm:pb-8 text-center px-4 sm:px-6">
                  <div className="flex flex-wrap justify-center gap-2 mb-6 sm:mb-8">
                    <Badge variant="outline" className="text-xs px-2.5 py-1">
                      <FileText className="w-3 h-3 ml-1" />
                      سياسة الخصوصية
                    </Badge>
                    <Badge variant="outline" className="text-xs px-2.5 py-1">
                      <ScrollText className="w-3 h-3 ml-1" />
                      الشروط والأحكام
                    </Badge>
                    <Badge variant="outline" className="text-xs px-2.5 py-1">
                      <CheckCircle className="w-3 h-3 ml-1" />
                      إدارة الموافقة
                    </Badge>
                    <Badge variant="outline" className="text-xs px-2.5 py-1">
                      <Shield className="w-3 h-3 ml-1" />
                      إعدادات الخصوصية
                    </Badge>
                  </div>
                  <Button size="lg" className="px-8 h-10 sm:h-11 text-sm sm:text-base font-semibold">
                    <Layers className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                    ابدأ الآن
                  </Button>
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* Internal Compliance Workspace - Prominent CTA */}
          <div className="max-w-3xl mx-auto mb-10 md:mb-14 animate-stagger-4">
            <Link href="/internal-compliance">
              <Card 
                className="hover-elevate active-elevate-2 cursor-pointer border-2 border-accent/25 shadow-xl bg-gradient-to-br from-accent/8 via-transparent to-accent/4 transition-smooth duration-300"
                data-testid="card-internal-compliance"
              >
                <CardHeader className="text-center pb-4 sm:pb-6 pt-6 sm:pt-8 px-4 sm:px-6">
                  <div className="mx-auto mb-4 sm:mb-6 flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 shadow-lg ring-2 ring-green-500/30">
                    <Lock className="h-8 w-8 sm:h-10 sm:w-10 text-green-600 dark:text-green-400" />
                  </div>
                  <Badge variant="secondary" className="mx-auto mb-3 sm:mb-4">
                    إدارة شاملة
                  </Badge>
                  <CardTitle className="text-xl sm:text-2xl md:text-3xl font-bold mb-3">
                    مساحة العمل الموحدة للامتثال الداخلي
                  </CardTitle>
                  <CardDescription className="text-sm sm:text-base mt-2 max-w-lg mx-auto leading-relaxed">
                    إدارة سجل المعالجة (ROPA) وطلبات الوصول (DSAR) وتقييمات التأثير (DPIA) - كلها في مكان واحد
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0 pb-6 sm:pb-8 text-center px-4 sm:px-6">
                  <div className="flex flex-wrap justify-center gap-2 mb-6 sm:mb-8">
                    <Badge variant="outline" className="text-xs px-2.5 py-1">
                      <FileText className="w-3 h-3 ml-1" />
                      ROPA
                    </Badge>
                    <Badge variant="outline" className="text-xs px-2.5 py-1">
                      <Users className="w-3 h-3 ml-1" />
                      DSAR
                    </Badge>
                    <Badge variant="outline" className="text-xs px-2.5 py-1">
                      <Lock className="w-3 h-3 ml-1 text-green-600 dark:text-green-400" />
                      DPIA
                    </Badge>
                  </div>
                  <Button size="lg" className="px-8 h-10 sm:h-11 text-sm sm:text-base font-semibold bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white">
                    <Lock className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                    ابدأ الآن
                  </Button>
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* Section Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent my-8 md:my-12"></div>

          {/* Additional Services */}
          <div className="max-w-4xl mx-auto mb-10 md:mb-14">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-center mb-6 sm:mb-8 animate-slide-up">أدوات إضافية</h2>
            <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2">
              {additionalServices.map((service, index) => (
                <Link key={service.testId} href={service.href}>
                  <Card 
                    className={`hover-elevate active-elevate-2 cursor-pointer h-full transition-smooth duration-300 shadow-md hover:shadow-lg border-r-4 animate-stagger-${(index % 4) + 1}`}
                    style={{ borderRightColor: 'hsl(142 76% 36%)' }}
                    data-testid={service.testId}
                  >
                    <CardHeader className="space-y-3 sm:space-y-4 p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className={`flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-lg ${service.bgColor} ${service.color} shadow-sm`}>
                          <div className="scale-75 sm:scale-100">
                            {service.icon}
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-xs px-2 py-0.5 shrink-0">
                          {service.badge}
                        </Badge>
                      </div>
                      <div>
                        <CardTitle className="text-lg sm:text-xl font-bold mb-2">{service.title}</CardTitle>
                        <CardDescription className="text-xs sm:text-sm leading-relaxed text-muted-foreground">
                          {service.description}
                        </CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 px-4 sm:px-5 pb-4 sm:pb-5">
                      <Button variant="ghost" className="w-full justify-center text-primary font-semibold hover:bg-primary/5" size="sm">
                        ابدأ الآن
                      </Button>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>

          {/* Section Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent my-8 md:my-12"></div>

          {/* Why Choose Us */}
          <div className="max-w-3xl mx-auto animate-slide-up">
          <Card className="shadow-xl bg-gradient-to-br from-primary/10 via-primary/8 to-transparent border-2 border-primary/20 transition-smooth duration-300 hover:shadow-2xl">
            <CardHeader className="text-center pb-6 sm:pb-8">
              <CardTitle className="text-2xl sm:text-3xl md:text-4xl font-bold">لماذا تختار منصتنا؟</CardTitle>
            </CardHeader>
            <CardContent className="pb-6 sm:pb-8">
              <div className="grid gap-6 sm:gap-8 grid-cols-1 md:grid-cols-3">
                <div className="text-center space-y-2 sm:space-y-3">
                  <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-primary">100%</div>
                  <p className="text-sm sm:text-base font-semibold text-muted-foreground">متوافق مع اللوائح السعودية</p>
                </div>
                <div className="text-center space-y-2 sm:space-y-3">
                  <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-primary">AI</div>
                  <p className="text-sm sm:text-base font-semibold text-muted-foreground">تحليل ذكي بتقنية GPT-4o</p>
                </div>
                <div className="text-center space-y-2 sm:space-y-3">
                  <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-primary">دقائق</div>
                  <p className="text-sm sm:text-base font-semibold text-muted-foreground">احصل على وثائق جاهزة فوراً</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/30">
        <div className="container py-8 sm:py-10">
          <div className="flex flex-col items-center gap-4 sm:gap-5 text-center">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary shrink-0" />
              <p className="text-sm font-medium">منصة حماية البيانات الشخصية</p>
            </div>
            <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
              هذه المنصة مصممة للمساعدة في تحقيق الامتثال لنظام حماية البيانات الشخصية السعودي
              ولا تغني عن الاستشارة القانونية المتخصصة
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
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
