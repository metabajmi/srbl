import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, RefreshCw, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

type ClientPolicy = {
  id: number;
  userId: string;
  policyId: number | null;
  policyType: "privacy" | "terms";
  status: "draft" | "active" | "needs_update";
  generatedAt: string;
  lastUpdated: string;
  version: number;
};

export default function MyPoliciesPage() {
  // Get user from localStorage (temporary)
  let user = { id: "" };
  try {
    const userStr = localStorage.getItem("user");
    if (userStr && userStr !== "undefined" && userStr !== "null") {
      user = JSON.parse(userStr);
    }
  } catch (e) {
    console.error("Failed to parse user from localStorage", e);
  }
  const userId = user.id;
  
  const { data: policies, isLoading } = useQuery<ClientPolicy[]>({
    queryKey: ["/api/client/policies", { userId }],
  });

  const getStatusLabel = (status: string) => {
    const labels = {
      draft: "مسودة",
      active: "نشطة",
      needs_update: "تحتاج تحديث",
    };
    return labels[status as keyof typeof labels] || status;
  };

  const getStatusVariant = (status: string) => {
    const variants = {
      draft: "secondary",
      active: "default",
      needs_update: "destructive",
    };
    return variants[status as keyof typeof variants] || "secondary";
  };

  const getTypeLabel = (type: string) => {
    return type === "privacy" ? "سياسة الخصوصية" : "الشروط والأحكام";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen p-8" dir="rtl">
        <div className="max-w-6xl mx-auto">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-muted rounded w-1/3" />
                  <div className="h-4 bg-muted rounded w-1/2 mt-2" />
                </CardHeader>
                <CardContent>
                  <div className="h-4 bg-muted rounded w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold" data-testid="text-page-title">
            سياساتي
          </h1>
          <p className="text-muted-foreground">
            إدارة وعرض جميع سياسات الخصوصية والشروط والأحكام الخاصة بك
          </p>
        </div>

        {!policies || policies.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 space-y-4">
              <FileText className="w-16 h-16 text-muted-foreground" />
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold" data-testid="text-no-policies">
                  لا توجد سياسات بعد
                </h3>
                <p className="text-muted-foreground">
                  ابدأ بإنشاء سياسة خصوصية أو شروط وأحكام جديدة
                </p>
              </div>
              <Button data-testid="button-create-first-policy">
                <FileText className="mr-2" />
                إنشاء سياسة جديدة
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {policies.map((policy) => (
              <Card key={policy.id} data-testid={`card-policy-${policy.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-primary" />
                        <CardTitle data-testid={`text-policy-type-${policy.id}`}>
                          {getTypeLabel(policy.policyType)}
                        </CardTitle>
                        <Badge
                          variant={getStatusVariant(policy.status) as any}
                          data-testid={`badge-status-${policy.id}`}
                        >
                          {getStatusLabel(policy.status)}
                        </Badge>
                      </div>
                      <CardDescription className="flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          تم الإنشاء:{" "}
                          {format(new Date(policy.generatedAt), "dd MMMM yyyy", {
                            locale: ar,
                          })}
                        </span>
                        <span data-testid={`text-version-${policy.id}`}>
                          الإصدار: {policy.version}
                        </span>
                      </CardDescription>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        data-testid={`button-download-${policy.id}`}
                      >
                        <Download className="w-4 h-4 ml-2" />
                        تنزيل
                      </Button>
                      {policy.status === "needs_update" && (
                        <Button
                          variant="default"
                          size="sm"
                          data-testid={`button-update-${policy.id}`}
                        >
                          <RefreshCw className="w-4 h-4 ml-2" />
                          طلب تحديث
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <span>آخر تحديث:</span>
                      <span data-testid={`text-last-updated-${policy.id}`}>
                        {format(new Date(policy.lastUpdated), "dd MMMM yyyy - HH:mm", {
                          locale: ar,
                        })}
                      </span>
                    </div>
                    {policy.policyId && (
                      <div className="flex items-center gap-2">
                        <span>معرف السياسة:</span>
                        <code
                          className="px-2 py-1 bg-muted rounded text-xs"
                          data-testid={`text-policy-id-${policy.id}`}
                        >
                          #{policy.policyId}
                        </code>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
