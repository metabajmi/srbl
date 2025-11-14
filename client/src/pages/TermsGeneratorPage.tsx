import { ScrollText } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function TermsGeneratorPage() {
  return (
    <div className="container py-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">مُولّد الشروط والأحكام</h1>
          <p className="text-muted-foreground">
            أنشئ شروطاً وأحكاماً متوافقة مع الأنظمة السعودية
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <ScrollText className="w-6 h-6" />
              قريباً
            </CardTitle>
            <CardDescription>
              هذه الميزة قيد التطوير حالياً
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              سيتم إطلاق مُولّد الشروط والأحكام قريباً مع ميزات متقدمة لإنشاء وثائق قانونية متوافقة
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
