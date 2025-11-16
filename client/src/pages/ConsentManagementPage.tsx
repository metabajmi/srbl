import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Settings, 
  Code, 
  Plus, 
  Trash2, 
  Edit, 
  Save,
  Copy,
  CheckCircle2
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { BackButton } from "@/components/BackButton";

type CmpSettings = {
  id: string;
  bannerTitle: string;
  bannerDescription: string;
  privacyPolicyUrl: string;
  termsUrl: string;
  consentVersion: number;
};

type CmpScriptAPI = {
  id: string;
  name: string;
  category: "necessary" | "analytics" | "marketing" | "performance";
  scriptType: "inline" | "external";
  scriptContent: string | null;
  scriptUrl: string | null;
  scriptPosition: "head" | "body";
  enabled: "yes" | "no";
};

type CmpScript = Omit<CmpScriptAPI, "enabled"> & {
  enabled: boolean;
};

const settingsSchema = z.object({
  bannerTitle: z.string().min(1, "العنوان مطلوب"),
  bannerDescription: z.string().min(1, "الوصف مطلوب"),
  privacyPolicyUrl: z.string().url("رابط غير صحيح").optional().or(z.literal("")),
  termsUrl: z.string().url("رابط غير صحيح").optional().or(z.literal("")),
});

const scriptSchema = z.object({
  name: z.string().min(1, "الاسم مطلوب"),
  category: z.enum(["necessary", "analytics", "marketing", "performance"]),
  scriptType: z.enum(["inline", "external"]),
  scriptContent: z.string().optional(),
  scriptUrl: z.string().url("رابط غير صحيح").optional().or(z.literal("")),
  scriptPosition: z.enum(["head", "body"]),
  enabled: z.boolean(),
});

const categoryLabels: Record<string, string> = {
  necessary: "ضرورية",
  analytics: "تحليلية",
  marketing: "تسويقية",
  performance: "أداء",
};

const categoryColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  necessary: "default",
  analytics: "secondary",
  marketing: "destructive",
  performance: "outline",
};

// Helper functions for enabled conversion
const booleanToEnabled = (value: boolean): "yes" | "no" => value ? "yes" : "no";
const enabledToBoolean = (value: "yes" | "no"): boolean => value === "yes";

export default function ConsentManagementPage() {
  const { toast } = useToast();
  const [editingScript, setEditingScript] = useState<CmpScript | null>(null);
  const [isScriptDialogOpen, setIsScriptDialogOpen] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  // Fetch settings
  const { data: settings } = useQuery<CmpSettings>({
    queryKey: ["/api/cmp/settings"],
  });

  // Fetch scripts
  const { data: scriptsAPI = [] } = useQuery<CmpScriptAPI[]>({
    queryKey: ["/api/cmp/scripts"],
  });

  // Transform API response to UI format
  const scripts: CmpScript[] = scriptsAPI.map(script => ({
    ...script,
    enabled: enabledToBoolean(script.enabled),
  }));

  // Settings form
  const settingsForm = useForm({
    resolver: zodResolver(settingsSchema),
    values: settings ? {
      bannerTitle: settings.bannerTitle,
      bannerDescription: settings.bannerDescription,
      privacyPolicyUrl: settings.privacyPolicyUrl || "",
      termsUrl: settings.termsUrl || "",
    } : undefined,
  });

  // Script form
  const scriptForm = useForm<z.infer<typeof scriptSchema>>({
    resolver: zodResolver(scriptSchema),
    defaultValues: {
      name: "",
      category: "analytics",
      scriptType: "external",
      scriptContent: "",
      scriptUrl: "",
      scriptPosition: "head",
      enabled: true,
    },
  });

  const scriptType = scriptForm.watch("scriptType");

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: z.infer<typeof settingsSchema>) => {
      return apiRequest("PUT", "/api/cmp/settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cmp/settings"] });
      toast({
        title: "تم الحفظ",
        description: "تم تحديث الإعدادات بنجاح",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "فشل في الحفظ",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Create/Update script mutation
  const saveScriptMutation = useMutation({
    mutationFn: async (data: Omit<z.infer<typeof scriptSchema>, "enabled"> & { enabled: "yes" | "no" }) => {
      const isUpdate = !!editingScript;
      if (isUpdate) {
        return apiRequest("PUT", `/api/cmp/scripts/${editingScript.id}`, data);
      } else {
        return apiRequest("POST", "/api/cmp/scripts", data);
      }
    },
    onMutate: () => {
      // Save current operation type for toast messaging
      return { isUpdate: !!editingScript };
    },
    onSuccess: (_data, _variables, context) => {
      queryClient.invalidateQueries({ queryKey: ["/api/cmp/scripts"] });
      setIsScriptDialogOpen(false);
      setEditingScript(null);
      scriptForm.reset();
      toast({
        title: "تم الحفظ",
        description: context?.isUpdate ? "تم تحديث السكربت بنجاح" : "تم إضافة السكربت بنجاح",
      });
    },
    onError: (error: Error, _variables, context) => {
      toast({
        title: "فشل في الحفظ",
        description: error.message || (context?.isUpdate ? "فشل في تحديث السكربت" : "فشل في إضافة السكربت"),
        variant: "destructive",
      });
    },
  });

  // Delete script mutation
  const deleteScriptMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/cmp/scripts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cmp/scripts"] });
      toast({
        title: "تم الحذف",
        description: "تم حذف السكربت بنجاح",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "فشل في الحذف",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSettingsSubmit = (data: z.infer<typeof settingsSchema>) => {
    updateSettingsMutation.mutate(data);
  };

  const onScriptSubmit = (data: z.infer<typeof scriptSchema>) => {
    // Transform boolean to "yes"/"no" for API
    const apiData = {
      ...data,
      enabled: booleanToEnabled(data.enabled),
    };
    saveScriptMutation.mutate(apiData);
  };

  const handleEditScript = (script: CmpScript) => {
    setEditingScript(script);
    scriptForm.reset({
      name: script.name,
      category: script.category,
      scriptType: script.scriptType,
      scriptContent: script.scriptContent || "",
      scriptUrl: script.scriptUrl || "",
      scriptPosition: script.scriptPosition,
      enabled: script.enabled,
    });
    setIsScriptDialogOpen(true);
  };

  const handleAddScript = () => {
    setEditingScript(null);
    scriptForm.reset({
      name: "",
      category: "analytics",
      scriptType: "external",
      scriptContent: "",
      scriptUrl: "",
      scriptPosition: "head",
      enabled: true,
    });
    setIsScriptDialogOpen(true);
  };

  const snippetCode = `<!-- Saudi PDPL Consent Management Platform -->
<script>
  (function() {
    var script = document.createElement('script');
    script.src = '${window.location.origin}/cmp.js';
    script.async = true;
    document.head.appendChild(script);
  })();
</script>`;

  const copySnippet = () => {
    navigator.clipboard.writeText(snippetCode);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
    toast({
      title: "تم النسخ",
      description: "تم نسخ الكود للحافظة",
    });
  };

  return (
    <div className="container py-8" dir="rtl">
      <div className="mx-auto max-w-6xl space-y-8">
        <BackButton />
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold mb-2">منصة إدارة الموافقة (CMP)</h1>
          <p className="text-muted-foreground">
            إدارة موافقات المستخدمين والامتثال لنظام حماية البيانات الشخصية السعودي
          </p>
        </div>

        {/* Snippet Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Code className="w-6 h-6" />
              كود التضمين
            </CardTitle>
            <CardDescription>
              أضف هذا الكود في قسم &lt;head&gt; لموقعك لتفعيل إدارة الموافقة
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <pre className="bg-muted p-4 rounded-md overflow-x-auto text-sm" dir="ltr">
                <code>{snippetCode}</code>
              </pre>
              <Button
                variant="outline"
                size="sm"
                className="absolute top-2 left-2"
                onClick={copySnippet}
                data-testid="button-copy-snippet"
              >
                {copiedSnippet ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Settings Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Settings className="w-6 h-6" />
              الإعدادات العامة
            </CardTitle>
            <CardDescription>
              قم بتخصيص نصوص وإعدادات شريط الموافقة
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...settingsForm}>
              <form onSubmit={settingsForm.handleSubmit(onSettingsSubmit)} className="space-y-4">
                <FormField
                  control={settingsForm.control}
                  name="bannerTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>عنوان الشريط</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="نحن نستخدم ملفات تعريف الارتباط"
                          data-testid="input-banner-title"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={settingsForm.control}
                  name="bannerDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>وصف الشريط</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="نستخدم ملفات تعريف الارتباط لتحسين تجربتك..."
                          rows={3}
                          data-testid="input-banner-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={settingsForm.control}
                    name="privacyPolicyUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>رابط سياسة الخصوصية</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="url"
                            placeholder="https://example.com/privacy"
                            data-testid="input-privacy-url"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={settingsForm.control}
                    name="termsUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>رابط شروط الاستخدام</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="url"
                            placeholder="https://example.com/terms"
                            data-testid="input-terms-url"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={updateSettingsMutation.isPending}
                  data-testid="button-save-settings"
                >
                  <Save className="w-4 h-4 ml-2" />
                  {updateSettingsMutation.isPending ? "جاري الحفظ..." : "حفظ الإعدادات"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Scripts Management Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-3">
                  <Code className="w-6 h-6" />
                  إدارة السكربتات
                </CardTitle>
                <CardDescription>
                  إدارة السكربتات التي يتم حجبها حتى موافقة المستخدم
                </CardDescription>
              </div>
              <Button onClick={handleAddScript} data-testid="button-add-script">
                <Plus className="w-4 h-4 ml-2" />
                إضافة سكربت
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {scripts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                لا توجد سكربتات. أضف سكربت جديد للبدء.
              </div>
            ) : (
              <div className="space-y-4">
                {scripts.map((script) => (
                  <div
                    key={script.id}
                    className="flex items-center justify-between p-4 border rounded-md gap-4"
                    data-testid={`script-item-${script.id}`}
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-3">
                        <h4 className="font-semibold">{script.name}</h4>
                        <Badge variant={categoryColors[script.category]}>
                          {categoryLabels[script.category]}
                        </Badge>
                        <Badge variant="outline">{script.scriptType === "inline" ? "مضمّن" : "خارجي"}</Badge>
                        {script.enabled && (
                          <Badge variant="default" className="text-xs">
                            مفعّل
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {script.scriptType === "inline" 
                          ? `كود مضمّن - يتم التنفيذ في ${script.scriptPosition === "head" ? "head" : "body"}`
                          : `رابط خارجي: ${script.scriptUrl || "غير محدد"}`
                        }
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditScript(script)}
                        data-testid={`button-edit-${script.id}`}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteScriptMutation.mutate(script.id)}
                        disabled={deleteScriptMutation.isPending}
                        data-testid={`button-delete-${script.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Script Dialog */}
      <Dialog open={isScriptDialogOpen} onOpenChange={setIsScriptDialogOpen}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>
              {editingScript ? "تعديل السكربت" : "إضافة سكربت جديد"}
            </DialogTitle>
            <DialogDescription>
              أضف سكربت جديد لحجبه حتى موافقة المستخدم على الفئة المناسبة
            </DialogDescription>
          </DialogHeader>

          <Form {...scriptForm}>
            <form onSubmit={scriptForm.handleSubmit(onScriptSubmit)} className="space-y-4">
              <FormField
                control={scriptForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>اسم السكربت</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Google Analytics"
                        data-testid="input-script-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={scriptForm.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الفئة</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-script-category">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="necessary">ضرورية</SelectItem>
                          <SelectItem value="analytics">تحليلية</SelectItem>
                          <SelectItem value="marketing">تسويقية</SelectItem>
                          <SelectItem value="performance">أداء</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={scriptForm.control}
                  name="scriptType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>نوع السكربت</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-script-type">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="inline">مضمّن</SelectItem>
                          <SelectItem value="external">خارجي</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {scriptType === "inline" ? (
                <FormField
                  control={scriptForm.control}
                  name="scriptContent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>محتوى السكربت</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="console.log('مرحباً');"
                          rows={5}
                          className="font-mono text-sm"
                          dir="ltr"
                          data-testid="input-script-content"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <FormField
                  control={scriptForm.control}
                  name="scriptUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>رابط السكربت</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="url"
                          placeholder="https://example.com/script.js"
                          dir="ltr"
                          data-testid="input-script-url"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={scriptForm.control}
                name="scriptPosition"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>موقع التنفيذ</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-script-position">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="head">head</SelectItem>
                        <SelectItem value="body">body</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={scriptForm.control}
                name="enabled"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        تفعيل السكربت
                      </FormLabel>
                      <p className="text-sm text-muted-foreground">
                        سيتم حجب السكربتات المفعّلة فقط
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-script-enabled"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex gap-3 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsScriptDialogOpen(false)}
                  data-testid="button-cancel-script"
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  disabled={saveScriptMutation.isPending}
                  data-testid="button-save-script"
                >
                  <Save className="w-4 h-4 ml-2" />
                  {saveScriptMutation.isPending ? "جاري الحفظ..." : "حفظ"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
