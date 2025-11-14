import { ClipboardList } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function InternalCompliancePage() {
  return (
    <div className="container py-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">حلول الامتثال الداخلي</h1>
          <p className="text-muted-foreground">
            إدارة مهام الامتثال الداخلية لشركتك
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <ClipboardList className="w-6 h-6" />
              قريباً
            </CardTitle>
            <CardDescription>
              هذه الميزة قيد التطوير حالياً
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              سيتم إطلاق حلول الامتثال الداخلي قريباً مع نظام شامل لإدارة المهام والمراجعات
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
