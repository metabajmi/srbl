import { Link } from "wouter";
import { Shield, Database, UserCheck, AlertTriangle, ArrowRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function InternalCompliancePage() {
  const modules = [
    {
      title: "سجل أنشطة المعالجة",
      titleEn: "ROPA",
      description: "تسجيل وإدارة جميع عمليات معالجة البيانات الشخصية بما يتوافق مع المادة ٣١ من نظام حماية البيانات الشخصية",
      icon: Database,
      href: "/internal-compliance/ropa",
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-500/10",
      status: "متاح",
    },
    {
      title: "إدارة طلبات أصحاب البيانات",
      titleEn: "DSAR",
      description: "استقبال ومعالجة طلبات الوصول والحذف والتصحيح والاعتراض على معالجة البيانات الشخصية وفق المواد ٥ و ٦ و ٧ و ٨ من اللائحة التنفيذية لنظام حماية البيانات الشخصية",
      icon: UserCheck,
      href: "/internal-compliance/dsar",
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-500/10",
      status: "متاح",
    },
    {
      title: "تقييم تأثير حماية البيانات",
      titleEn: "DPIA",
      description: "تقييم المخاطر المرتبطة بأنشطة المعالجة ذات المخاطر العالية وفق المادة (٢٥) من اللائحة التنفيذية لنظام حماية البيانات الشخصية",
      icon: AlertTriangle,
      href: "/internal-compliance/dpia",
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-500/10",
      status: "متاح",
    },
  ];

  return (
    <div className="min-h-screen p-6" style={{ direction: "rtl" }}>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="rounded-lg bg-primary/10 p-3">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-4xl font-bold" data-testid="text-page-title">
              وحدة الامتثال الداخلي
            </h1>
            <p className="text-muted-foreground text-lg mt-1">
              أدوات شاملة لإدارة الامتثال لنظام حماية البيانات الشخصية السعودي
            </p>
          </div>
        </div>

        {/* Introduction Card */}
        <Card>
          <CardContent className="p-6">
            <div className="prose dark:prose-invert max-w-none">
              <p className="text-base leading-relaxed">
                تساعدك وحدة الامتثال الداخلي في تحقيق والحفاظ على الامتثال لمتطلبات نظام حماية البيانات الشخصية السعودي (PDPL)
                من خلال ثلاث أدوات رئيسية تغطي جميع جوانب الامتثال الداخلي:
              </p>
              <ul className="list-disc list-inside space-y-2 mt-4">
                <li>إنشاء وإدارة سجل أنشطة المعالجة الشامل</li>
                <li>معالجة طلبات أصحاب البيانات بكفاءة وشفافية</li>
                <li>تقييم وإدارة مخاطر معالجة البيانات</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Modules Grid */}
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
          {modules.map((module) => {
            const Icon = module.icon;
            const isAvailable = module.status === "متاح";

            return (
              <Card
                key={module.titleEn}
                className={`${isAvailable ? "hover-elevate" : "opacity-75"}`}
                data-testid={`card-module-${module.titleEn.toLowerCase()}`}
              >
                <CardHeader>
                  <div className={`rounded-lg ${module.bgColor} p-3 w-fit mb-3`}>
                    <Icon className={`h-6 w-6 ${module.color}`} />
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-1">
                        {module.title}
                      </CardTitle>
                      <div className="text-sm font-mono text-muted-foreground mb-2">
                        {module.titleEn}
                      </div>
                    </div>
                    {!isAvailable && (
                      <span className="text-xs bg-muted px-2 py-1 rounded">
                        {module.status}
                      </span>
                    )}
                  </div>
                  <CardDescription className="text-sm leading-relaxed">
                    {module.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isAvailable ? (
                    <Link href={module.href}>
                      <Button
                        className="w-full hover-elevate active-elevate-2"
                        data-testid={`button-open-${module.titleEn.toLowerCase()}`}
                      >
                        فتح الأداة
                        <ArrowRight className="mr-2 h-4 w-4" />
                      </Button>
                    </Link>
                  ) : (
                    <Button
                      className="w-full"
                      disabled
                      data-testid={`button-disabled-${module.titleEn.toLowerCase()}`}
                    >
                      قريباً
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Compliance Guidance */}
        <Card>
          <CardHeader>
            <CardTitle>إرشادات الامتثال</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <Database className="h-4 w-4 text-blue-600" />
                  سجل أنشطة المعالجة (ROPA)
                </h4>
                <p className="text-sm text-muted-foreground">
                  يجب على المراقب والمعالج الاحتفاظ بسجل لأنشطة المعالجة التي يقومون بها، يتضمن معلومات عن أغراض المعالجة
                  وفئات البيانات والجهات المستقبلة والتدابير الأمنية.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-green-600" />
                  طلبات أصحاب البيانات (DSAR)
                </h4>
                <p className="text-sm text-muted-foreground">
                  يحق لصاحب البيانات طلب الوصول إلى بياناته، وتصحيحها، وحذفها، والاعتراض على معالجتها. يجب الرد على
                  الطلبات خلال ٣٠ يوماً من تاريخ الاستلام.
                </p>
              </div>
              <div className="space-y-2 md:col-span-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  تقييم تأثير حماية البيانات (DPIA)
                </h4>
                <p className="text-sm text-muted-foreground">
                  عندما تشكل المعالجة مخاطر عالية على حقوق وحريات الأفراد، يجب إجراء تقييم لتأثير حماية البيانات قبل
                  البدء في المعالجة، لتحديد المخاطر واتخاذ التدابير المناسبة للتخفيف منها.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
