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
import { Shield, FileText, ScrollText, CheckCircle, Sparkles, FileSearch, Globe, Layers, Lock, Users, Clock, Scale, Mail } from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
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
      // Navigate immediately to the loading/results page
      // The scan runs in the background and the page will auto-refresh
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

  // Coming Soon services - disabled for MVP launch
  const comingSoonServices = [
    {
      icon: <CheckCircle className="w-10 h-10" />,
      title: "منصة إدارة الموافقة",
      description: "إدارة وتتبع موافقات المستخدمين والكوكيز بشكل متوافق مع اللوائح السعودية",
      color: "text-orange-600/50 dark:text-orange-400/50",
      bgColor: "bg-orange-500/5",
      testId: "card-service-consent"
    },
    {
      icon: <Sparkles className="w-10 h-10" />,
      title: "المساعد الذكي",
      description: "اسأل أي سؤال عن نظام حماية البيانات الشخصية واحصل على إجابات فورية ودقيقة",
      color: "text-pink-600/50 dark:text-pink-400/50",
      bgColor: "bg-pink-500/5",
      testId: "card-service-assistant"
    }
  ];

  const features = [
    {
      icon: <Shield className="w-6 h-6" />,
      title: "متوافق",
      description: "مع نظام حماية البيانات الشخصية السعودي",
    },
    {
      icon: <Scale className="w-6 h-6" />,
      title: "إشراف قانوني متخصص",
      description: "خوارزميات فحص مبنية ومراجعة من قبل خبراء متخصصين",
    },
    {
      icon: <FileText className="w-6 h-6" />,
      title: "وثائق جاهزة",
      description: "احصل على سياسات وشروط احترافية فوراً",
    },
  ];

  return (
    <div className="page-wrapper bg-background">
      {/* Brand Header - extends to top behind navbar */}
      <section className="bg-gradient-to-b from-primary/15 via-primary/8 to-primary/3 backdrop-blur-sm animate-fade-in">
        <div className="container pt-16 pb-12 md:pt-20 md:pb-16">
          <div className="flex items-center justify-center">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-primary leading-tight animate-stagger-1" data-testid="text-brand-sirbal">
              سِرْبَال
            </h1>
          </div>
        </div>
      </section>

      {/* Section Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"></div>

      {/* Hero Section */}
      <section className="section">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center mb-10 md:mb-12 animate-slide-up">
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
              </CardHeader>
              <CardContent className="pt-0 px-4 sm:px-6 pb-6 sm:pb-8">
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
                    {scanMutation.isPending ? (
                      <>
                        <Globe className="ml-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                        جاري الفحص...
                      </>
                    ) : (
                      <>
                        <FileSearch className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                        ابدأ الفحص
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground text-center mt-4">
                  فحص فوري • تقرير شامل • توصيات عملية
                </p>
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

          {/* ========== COMING SOON SECTIONS - Disabled for MVP ========== */}
          
          {/* Internal Compliance Workspace - DISABLED */}
          <div className="max-w-3xl mx-auto mb-10 md:mb-14 animate-stagger-4">
            <Card 
              className="relative border-2 border-muted/50 shadow-md bg-gradient-to-br from-muted/20 via-transparent to-muted/10 opacity-60 cursor-not-allowed"
              data-testid="card-internal-compliance"
            >
              {/* Coming Soon Badge - Positioned at top */}
              <div className="absolute top-4 left-4 z-10">
                <Badge variant="secondary" className="bg-amber-500/90 text-white border-0 shadow-md">
                  <Clock className="w-3 h-3 ml-1" />
                  قريباً
                </Badge>
              </div>
              <CardHeader className="text-center pb-4 sm:pb-6 pt-6 sm:pt-8 px-4 sm:px-6">
                <div className="mx-auto mb-4 sm:mb-6 flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-muted/30 shadow-md">
                  <Lock className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground/50" />
                </div>
                <Badge variant="outline" className="mx-auto mb-3 sm:mb-4 opacity-50">
                  إدارة شاملة
                </Badge>
                <CardTitle className="text-xl sm:text-2xl md:text-3xl font-bold mb-3 text-muted-foreground">
                  مساحة العمل الموحدة للامتثال
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 pb-6 sm:pb-8 text-center px-4 sm:px-6">
                <div className="flex flex-wrap justify-center gap-2 mb-6 sm:mb-8 opacity-50">
                  <Badge variant="outline" className="text-xs px-2.5 py-1">
                    <FileText className="w-3 h-3 ml-1" />
                    ROPA
                  </Badge>
                  <Badge variant="outline" className="text-xs px-2.5 py-1">
                    <Users className="w-3 h-3 ml-1" />
                    DSAR
                  </Badge>
                  <Badge variant="outline" className="text-xs px-2.5 py-1">
                    <Lock className="w-3 h-3 ml-1" />
                    DPIA
                  </Badge>
                </div>
                <Button size="lg" className="px-8 h-10 sm:h-11 text-sm sm:text-base font-semibold opacity-50" disabled>
                  <Lock className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                  قريباً
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Section Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent my-8 md:my-12"></div>

          {/* Additional Services - DISABLED for MVP */}
          <div className="max-w-4xl mx-auto mb-10 md:mb-14">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-center mb-6 sm:mb-8 animate-slide-up">أدوات إضافية</h2>
            <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2">
              {comingSoonServices.map((service, index) => (
                <Card 
                  key={service.testId}
                  className={`relative h-full transition-smooth duration-300 shadow-sm border border-muted/50 opacity-60 cursor-not-allowed animate-stagger-${(index % 4) + 1}`}
                  data-testid={service.testId}
                >
                  {/* Coming Soon Badge */}
                  <div className="absolute top-3 left-3 z-10">
                    <Badge variant="secondary" className="bg-amber-500/90 text-white border-0 shadow-sm text-xs">
                      <Clock className="w-2.5 h-2.5 ml-1" />
                      قريباً
                    </Badge>
                  </div>
                  <CardHeader className="space-y-3 sm:space-y-4 p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className={`flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-lg ${service.bgColor} ${service.color} shadow-sm`}>
                        <div className="scale-75 sm:scale-100">
                          {service.icon}
                        </div>
                      </div>
                    </div>
                    <div>
                      <CardTitle className="text-lg sm:text-xl font-bold mb-2 text-muted-foreground">{service.title}</CardTitle>
                      <CardDescription className="text-xs sm:text-sm leading-relaxed text-muted-foreground/70">
                        {service.description}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 px-4 sm:px-5 pb-4 sm:pb-5">
                    <Button variant="ghost" className="w-full justify-center text-muted-foreground font-semibold" size="sm" disabled>
                      قريباً
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Section Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent my-8 md:my-12"></div>

          {/* Why Choose Us */}
          <div className="max-w-3xl mx-auto animate-slide-up">
          <Card className="shadow-xl bg-gradient-to-br from-primary/10 via-primary/8 to-transparent border-2 border-primary/20 transition-smooth duration-300 hover:shadow-2xl">
            <CardHeader className="text-center pb-6 sm:pb-8">
              <CardTitle className="text-2xl sm:text-3xl md:text-4xl font-bold">لماذا نحن؟</CardTitle>
            </CardHeader>
            <CardContent className="pb-6 sm:pb-8">
              <div className="grid gap-6 sm:gap-8 grid-cols-1 md:grid-cols-3">
                <div className="text-center space-y-2 sm:space-y-3">
                  <Shield className="w-10 h-10 sm:w-12 sm:h-12 text-primary mx-auto" />
                  <h3 className="text-lg font-bold text-foreground">امتثال محلي كامل</h3>
                  <p className="text-sm sm:text-base text-muted-foreground">محتوى مصمم خصيصاً ليتوافق مع الأنظمة السعودية</p>
                </div>
                <div className="text-center space-y-2 sm:space-y-3">
                  <Sparkles className="w-10 h-10 sm:w-12 sm:h-12 text-primary mx-auto" />
                  <h3 className="text-lg font-bold text-foreground">تقنيات ذكية</h3>
                  <p className="text-sm sm:text-base text-muted-foreground">تعتمد المنصة على آليات فحص وتحقق لضمان دقة المحتوى وجودتها</p>
                </div>
                <div className="text-center space-y-2 sm:space-y-3">
                  <Clock className="w-10 h-10 sm:w-12 sm:h-12 text-primary mx-auto" />
                  <h3 className="text-lg font-bold text-foreground">إنجاز فوري</h3>
                  <p className="text-sm sm:text-base text-muted-foreground">لا تنتظر أياماً، احصل على مستنداتك القانونية في لحظات.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/30">
        <div className="container py-12 sm:py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 text-right">
            {/* العمود الأول — عن سربال */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 justify-end">
                <p className="text-base font-semibold">سربال</p>
                <Shield className="w-5 h-5 text-primary shrink-0" />
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                سربال هي منصة تقنية صُممت لتختصر عليك الجهد؛ حيث تقدم حلولاً وأدوات ذكية لمساعدة الجهات على تلبية متطلبات نظام حماية البيانات الشخصية بخطوات بسيطة.
              </p>
              <p className="text-xs text-muted-foreground/70">
                سجل تجاري: 7052884975
              </p>
            </div>

            {/* العمود الثاني — تواصل معنا */}
            <div className="flex flex-col gap-3 items-center text-center">
              <p className="text-base font-semibold">تواصل معنا</p>
              <div className="flex items-center gap-3">
                <a
                  href="https://wa.me/message/GBQWQIS5UIH6I1"
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="link-whatsapp"
                  className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary hover-elevate"
                  title="واتساب"
                >
                  <SiWhatsapp className="w-5 h-5" />
                </a>
                <a
                  href="mailto:support@sirbal.co"
                  data-testid="link-email"
                  className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary hover-elevate"
                  title="support@sirbal.co"
                >
                  <Mail className="w-5 h-5" />
                </a>
              </div>
              <p className="text-sm text-muted-foreground">support@sirbal.co</p>
            </div>

            {/* العمود الثالث — روابط سريعة */}
            <div className="flex flex-col gap-3 items-start">
              <p className="text-base font-semibold">روابط سريعة</p>
              <div className="flex flex-col gap-1">
                <Link href="/privacy">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-sm text-muted-foreground hover:text-foreground px-0 justify-start"
                    data-testid="link-privacy-policy"
                  >
                    سياسة الخصوصية
                  </Button>
                </Link>
                <Link href="/terms">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-sm text-muted-foreground hover:text-foreground px-0 justify-start"
                    data-testid="link-terms"
                  >
                    الشروط والأحكام
                  </Button>
                </Link>
                <Link href="/admin/login">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground/60 hover:text-foreground px-0 justify-start"
                    data-testid="link-admin-login"
                  >
                    <Shield className="w-3 h-3 ml-1" />
                    لوحة التحكم
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* شريط الحقوق */}
          <div className="border-t border-border/40 mt-10 pt-6 text-center">
            <p className="text-xs text-muted-foreground">
              © 2026 منصة سربال - جميع الحقوق محفوظة
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
