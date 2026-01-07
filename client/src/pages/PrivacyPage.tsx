import { Shield, Mail, Phone, MapPin, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PrivacyPage() {
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
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4" data-testid="text-privacy-title">
            سياسة الخصوصية
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
                نحن في منصة سربال نقدّر خصوصيتك ونلتزم بحماية بياناتك الشخصية وفقاً لنظام حماية البيانات الشخصية 
                في المملكة العربية السعودية (PDPL). توضح هذه السياسة كيفية جمعنا واستخدامنا وحمايتنا لبياناتك 
                عند استخدامك لخدماتنا.
              </p>
              <p>
                منصة سربال هي أداة متخصصة لمساعدة المنشآت والأفراد في تحقيق الامتثال لنظام حماية البيانات الشخصية 
                السعودي من خلال فحص المواقع وتوليد الوثائق القانونية اللازمة.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl text-primary">البيانات التي نجمعها</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 text-muted-foreground leading-relaxed">
              <div>
                <h3 className="font-semibold text-foreground mb-2">1. بيانات الحساب</h3>
                <ul className="list-disc list-inside space-y-1 mr-4">
                  <li>البريد الإلكتروني (مطلوب للتسجيل وتسجيل الدخول)</li>
                  <li>الاسم (اختياري)</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold text-foreground mb-2">2. بيانات خدمة الفحص</h3>
                <ul className="list-disc list-inside space-y-1 mr-4">
                  <li>عنوان URL للموقع المراد فحصه</li>
                  <li>محتوى الصفحة المفحوصة (للتحليل التقني فقط)</li>
                  <li>نتائج تحليل الامتثال</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold text-foreground mb-2">3. بيانات مُولّد السياسات</h3>
                <ul className="list-disc list-inside space-y-1 mr-4">
                  <li>بيانات المنشأة (الاسم، نوع النشاط، الصفة القانونية)</li>
                  <li>بيانات التواصل (البريد الإلكتروني، الهاتف، العنوان)</li>
                  <li>فئات البيانات التي تجمعها منشأتك وأغراض جمعها</li>
                  <li>معلومات مسؤول حماية البيانات (إن وُجد)</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold text-foreground mb-2">4. البيانات التقنية</h3>
                <ul className="list-disc list-inside space-y-1 mr-4">
                  <li>عنوان IP (للأمان ومنع الاستخدام المسيء)</li>
                  <li>معلومات المتصفح ونوع الجهاز</li>
                  <li>ملفات تعريف الارتباط الضرورية لتشغيل الخدمة</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl text-primary">كيف نستخدم بياناتك</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground leading-relaxed">
              <p>نستخدم البيانات التي نجمعها للأغراض التالية:</p>
              <ul className="list-disc list-inside space-y-2 mr-4">
                <li><strong>تقديم خدمة الفحص:</strong> تحليل مواقعكم باستخدام الذكاء الاصطناعي لتحديد مدى الامتثال لنظام PDPL</li>
                <li><strong>توليد الوثائق:</strong> إنشاء سياسات الخصوصية والشروط والأحكام المخصصة لمنشأتكم</li>
                <li><strong>إدارة الحساب:</strong> تسجيل الدخول عبر رمز التحقق OTP وإدارة جلسات المستخدم</li>
                <li><strong>إرسال الوثائق:</strong> إرسال الوثائق المُولّدة إلى بريدكم الإلكتروني بصيغ PDF و Word</li>
                <li><strong>تحسين الخدمة:</strong> فهم كيفية استخدام الخدمة لتحسينها</li>
                <li><strong>الأمان:</strong> حماية المنصة من الاستخدام المسيء والاحتيال</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl text-primary">المسوغ النظامي للمعالجة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground leading-relaxed">
              <p>نعالج بياناتك استناداً إلى المسوغات النظامية التالية:</p>
              <ul className="list-disc list-inside space-y-2 mr-4">
                <li><strong>تنفيذ العقد:</strong> معالجة البيانات اللازمة لتقديم الخدمات التي طلبتها</li>
                <li><strong>المصلحة المشروعة:</strong> تحسين خدماتنا وحماية أمان المنصة</li>
                <li><strong>الموافقة:</strong> عند إدخال بيانات منشأتك لتوليد الوثائق</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl text-primary">مشاركة البيانات</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground leading-relaxed">
              <p>لا نبيع بياناتك الشخصية. قد نشارك بياناتك مع:</p>
              <ul className="list-disc list-inside space-y-2 mr-4">
                <li><strong>مزودي الخدمات:</strong> مثل خدمات الذكاء الاصطناعي (OpenAI) لتحليل المحتوى، وخدمات البريد الإلكتروني لإرسال الوثائق</li>
                <li><strong>الجهات الحكومية:</strong> عند وجود متطلب نظامي للإفصاح</li>
              </ul>
              <p className="mt-4">
                جميع مزودي الخدمات الذين نتعامل معهم ملتزمون بمعايير حماية البيانات المناسبة.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl text-primary">تخزين البيانات وحمايتها</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground leading-relaxed">
              <ul className="list-disc list-inside space-y-2 mr-4">
                <li>نخزن بياناتك على خوادم آمنة مع تشفير البيانات أثناء النقل والتخزين</li>
                <li>نحتفظ ببيانات الحساب طوال فترة استخدامك للخدمة</li>
                <li>نحتفظ بنتائج الفحص والوثائق المُولّدة لمدة عام واحد ما لم تطلب حذفها</li>
                <li>نستخدم إجراءات أمنية تقنية وتنظيمية لحماية بياناتك من الوصول غير المصرح به</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl text-primary">حقوقك</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground leading-relaxed">
              <p>بموجب نظام حماية البيانات الشخصية السعودي، لديك الحقوق التالية:</p>
              <ul className="list-disc list-inside space-y-2 mr-4">
                <li><strong>حق العلم:</strong> معرفة كيفية جمع ومعالجة بياناتك</li>
                <li><strong>حق الوصول:</strong> الاطلاع على بياناتك الشخصية المحفوظة لدينا</li>
                <li><strong>حق الحصول على نسخة:</strong> طلب نسخة من بياناتك بصيغة مقروءة</li>
                <li><strong>حق التصحيح:</strong> تصحيح أي بيانات غير دقيقة</li>
                <li><strong>حق الإتلاف:</strong> طلب حذف بياناتك الشخصية</li>
              </ul>
              <p className="mt-4">
                لممارسة أي من هذه الحقوق، يرجى التواصل معنا عبر البريد الإلكتروني أدناه.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl text-primary">ملفات تعريف الارتباط (الكوكيز)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground leading-relaxed">
              <p>نستخدم ملفات تعريف الارتباط الضرورية فقط لـ:</p>
              <ul className="list-disc list-inside space-y-2 mr-4">
                <li>إدارة جلسة تسجيل الدخول</li>
                <li>تذكر تفضيلات العرض (مثل الوضع الليلي)</li>
                <li>ضمان أمان الخدمة</li>
              </ul>
              <p className="mt-4">
                لا نستخدم ملفات تعريف الارتباط للتتبع أو الإعلانات.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl text-primary">التحديثات على السياسة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                قد نقوم بتحديث هذه السياسة من وقت لآخر. سنخطرك بأي تغييرات جوهرية عبر البريد الإلكتروني 
                أو من خلال إشعار واضح على المنصة. ننصحك بمراجعة هذه الصفحة بشكل دوري.
              </p>
            </CardContent>
          </Card>

          <Card className="border-primary/30 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-xl text-primary">تواصل معنا</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                إذا كانت لديك أي أسئلة حول سياسة الخصوصية أو ترغب في ممارسة حقوقك، تواصل معنا:
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-foreground">
                  <Mail className="w-5 h-5 text-primary" />
                  <span>privacy@sirbal.co</span>
                </div>
                <div className="flex items-center gap-3 text-foreground">
                  <MapPin className="w-5 h-5 text-primary" />
                  <span>المملكة العربية السعودية</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                كما يمكنك تقديم شكوى إلى الهيئة السعودية للبيانات والذكاء الاصطناعي (سدايا) إذا لم تكن راضياً عن استجابتنا.
              </p>
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
