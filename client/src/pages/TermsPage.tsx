import { Shield, Mail, MapPin, ArrowRight, FileText } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TermsPage() {
  const lastUpdated = "7 يناير 2026";
  
  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="bg-gradient-to-b from-primary/15 via-primary/8 to-primary/3 border-b">
        <div className="container py-8">
          <div className="flex items-center justify-between">
            <Link href="/">
              <Button variant="ghost" size="sm" data-testid="link-back-home">
                <ArrowRight className="w-4 h-4 ml-2" />
                الرئيسية
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-primary" />
              <span className="text-2xl font-bold text-primary">سِرْبَال</span>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-12 max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4" data-testid="text-terms-title">
            الشروط والأحكام
          </h1>
          <p className="text-muted-foreground">
            آخر تحديث: {lastUpdated}
          </p>
        </div>

        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl text-primary">مقدمة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                مرحباً بكم في منصة سربال. يرجى قراءة هذه الشروط والأحكام بعناية قبل استخدام خدماتنا. 
                بمجرد استخدامك للمنصة أو التسجيل فيها، فإنك توافق على الالتزام بهذه الشروط بالكامل.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl text-primary">1. تعريف الخدمة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                منصة سربال هي منصة تقنية تقدم حلولاً لأتمتة الامتثال القانوني وفحص المواقع الإلكترونية 
                باستخدام تقنيات الذكاء الاصطناعي، وتوليد المستندات القانونية (مثل سياسات الخصوصية) 
                بناءً على المدخلات المقدمة من المستخدم.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl text-primary">2. طبيعة العلاقة القانونية</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 text-muted-foreground leading-relaxed">
              <div>
                <h3 className="font-semibold text-foreground mb-2">أداة تقنية وليست مكتب محاماة</h3>
                <p>
                  يقر المستخدم بأن "سربال" هي أداة تقنية مساندة ولا تقدم "استشارات قانونية" بمفهوم 
                  نظام المحاماة السعودي.
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold text-foreground mb-2">المخرجات</h3>
                <p>
                  الوثائق والتقارير الصادرة عن المنصة هي مخرجات مبنية على خوارزميات الذكاء الاصطناعي 
                  والبيانات المدخلة. ورغم سعينا لتحقيق أعلى درجات الدقة ومطابقة الأنظمة، إلا أن هذه 
                  المخرجات لا تغني عن مراجعة المختصين القانونيين، ولا تتحمل المنصة مسؤولية أي تبعات 
                  قانونية تنشأ عن استخدامها دون مراجعة متخصصة.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl text-primary">3. الحساب والاستخدام</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground leading-relaxed">
              <ul className="list-disc list-inside space-y-2 mr-4">
                <li>أنت مسؤول عن الحفاظ على سرية بيانات دخولك.</li>
                <li>تتعهد بأن جميع البيانات والروابط التي تقوم بإدخالها للفحص صحيحة وتملك صلاحية التعامل معها.</li>
                <li>يحظر استخدام المنصة لأي أغراض غير مشروعة أو تحايلية.</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl text-primary">4. حقوق الملكية الفكرية</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 text-muted-foreground leading-relaxed">
              <div>
                <h3 className="font-semibold text-foreground mb-2">المنصة</h3>
                <p>
                  جميع حقوق البرمجيات، الأكواد، التصاميم، والشعارات الخاصة بـ "سربال" هي ملكية حصرية 
                  للمنصة ومحمية بموجب أنظمة الملكية الفكرية في المملكة العربية السعودية.
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold text-foreground mb-2">المخرجات</h3>
                <p>
                  يمتلك المستخدم الحق الكامل في استخدام ونشر الوثائق (مثل سياسة الخصوصية) التي يتم 
                  توليدها لصالحه عبر المنصة بعد سداد الرسوم.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl text-primary">5. الاشتراك والمدفوعات</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                يلتزم المستخدم بسداد الرسوم المقررة. وتحتفظ المنصة بحق تعديل أسعار الباقات مستقبلاً 
                مع إشعار المستخدمين بذلك.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl text-primary">6. حدود المسؤولية</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                إلى الحد الأقصى الذي يسمح به النظام، لا تتحمل "سربال" أو القائمين عليها أي مسؤولية 
                عن أي أضرار مباشرة أو غير مباشرة، عرضية أو تبعية، تنشأ عن استخدام الخدمة أو تعذر 
                استخدامها، أو عن أي أخطاء في البيانات الناتجة عن الذكاء الاصطناعي.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl text-primary">7. التعديلات</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                نحتفظ بالحق في تعديل هذه الشروط في أي وقت. سيتم نشر التعديلات هنا، ويعتبر استمرارك 
                في استخدام المنصة بعد النشر موافقة ضمنية عليها.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl text-primary">8. القانون واجب التطبيق</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                تخضع هذه الشروط وتفسر وفقاً للأنظمة واللوائح المعمول بها في المملكة العربية السعودية، 
                وتختص المحاكم السعودية بالنظر في أي نزاع ينشأ حولها.
              </p>
            </CardContent>
          </Card>

          <Card className="border-primary/30 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-xl text-primary">تواصل معنا</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                إذا كانت لديك أي أسئلة حول الشروط والأحكام، تواصل معنا:
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-foreground">
                  <Mail className="w-5 h-5 text-primary" />
                  <span>support@sirbal.co</span>
                </div>
                <div className="flex items-center gap-3 text-foreground">
                  <MapPin className="w-5 h-5 text-primary" />
                  <span>المملكة العربية السعودية</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-12">
          <Link href="/">
            <Button variant="outline" data-testid="button-back-home">
              <ArrowRight className="w-4 h-4 ml-2" />
              العودة للصفحة الرئيسية
            </Button>
          </Link>
        </div>
      </main>

      <footer className="border-t bg-muted/30 mt-12">
        <div className="container py-6 text-center">
          <p className="text-sm text-muted-foreground">
            © 2026 منصة سربال - جميع الحقوق محفوظة
          </p>
        </div>
      </footer>
    </div>
  );
}
