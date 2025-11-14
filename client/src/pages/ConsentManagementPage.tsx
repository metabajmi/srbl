import { CheckSquare } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function ConsentManagementPage() {
  return (
    <div className="container py-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">منصة إدارة الموافقة</h1>
          <p className="text-muted-foreground">
            إدارة موافقات المستخدمين بشكل متوافق مع القوانين
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <CheckSquare className="w-6 h-6" />
              قريباً
            </CardTitle>
            <CardDescription>
              هذه الميزة قيد التطوير حالياً
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              سيتم إطلاق منصة إدارة الموافقة قريباً مع ميزات متقدمة لتتبع وإدارة موافقات المستخدمين
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
