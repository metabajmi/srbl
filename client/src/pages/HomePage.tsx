import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Shield, FileText, ScrollText, CheckCircle, Sparkles, FileSearch } from "lucide-react";

export default function HomePage() {
  const mainServices = [
    {
      icon: <FileSearch className="w-10 h-10" />,
      title: "فحص موقعك للامتثال",
      description: "تحليل شامل لموقعك الإلكتروني باستخدام الذكاء الاصطناعي لاكتشاف مخالفات حماية البيانات الشخصية",
      href: "/scans",
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-500/10",
      badge: "AI مدعوم بـ",
      testId: "card-service-scanner"
    },
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
      {/* Hero Section */}
      <section className="container py-12 md:py-16">
        <div className="mx-auto max-w-4xl text-center mb-12">
          <Badge className="mb-4" variant="secondary">
            <Shield className="w-3 h-3 ml-1" />
            متوافق مع نظام حماية البيانات الشخصية السعودي
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            منصة شاملة لحماية
            <span className="text-primary"> البيانات الشخصية</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-6 max-w-2xl mx-auto">
            كل ما تحتاجه لضمان امتثال موقعك أو تطبيقك لنظام حماية البيانات الشخصية السعودي - في مكان واحد
          </p>
        </div>

        {/* Features */}
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

        {/* Main Services Grid */}
        <div className="mx-auto max-w-6xl">
          <h2 className="text-2xl font-bold text-center mb-8">الخدمات والأدوات المتاحة</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
            {mainServices.map((service) => (
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
            <p className="text-xs text-muted-foreground">
              © 2024 منصة حماية البيانات - جميع الحقوق محفوظة
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
