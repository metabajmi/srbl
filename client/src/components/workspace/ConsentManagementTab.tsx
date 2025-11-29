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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

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

type CmpScript = Omit<CmpScriptAPI, "enabled"> & { enabled: boolean };

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

const booleanToEnabled = (value: boolean): "yes" | "no" => value ? "yes" : "no";
const enabledToBoolean = (value: "yes" | "no"): boolean => value === "yes";

export default function ConsentManagementTab() {
  const { toast } = useToast();
  const [editingScript, setEditingScript] = useState<CmpScript | null>(null);
  const [isScriptDialogOpen, setIsScriptDialogOpen] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  const { data: settings } = useQuery<CmpSettings>({ queryKey: ["/api/cmp/settings"] });
  const { data: scriptsAPI = [] } = useQuery<CmpScriptAPI[]>({ queryKey: ["/api/cmp/scripts"] });

  const scripts: CmpScript[] = scriptsAPI.map(script => ({
    ...script,
    enabled: enabledToBoolean(script.enabled),
  }));

  const settingsForm = useForm({
    resolver: zodResolver(settingsSchema),
    values: settings ? {
      bannerTitle: settings.bannerTitle,
      bannerDescription: settings.bannerDescription,
      privacyPolicyUrl: settings.privacyPolicyUrl || "",
      termsUrl: settings.termsUrl || "",
    } : undefined,
  });

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

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: z.infer<typeof settingsSchema>) => apiRequest("PUT", "/api/cmp/settings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cmp/settings"] });
      toast({ title: "تم الحفظ", description: "تم تحديث الإعدادات بنجاح" });
    },
    onError: (error: Error) => toast({ title: "فشل في الحفظ", description: error.message, variant: "destructive" }),
  });

  const saveScriptMutation = useMutation({
    mutationFn: async (data: Omit<z.infer<typeof scriptSchema>, "enabled"> & { enabled: "yes" | "no" }) => {
      if (editingScript) {
        return apiRequest("PUT", `/api/cmp/scripts/${editingScript.id}`, data);
      }
      return apiRequest("POST", "/api/cmp/scripts", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cmp/scripts"] });
      setIsScriptDialogOpen(false);
      setEditingScript(null);
      scriptForm.reset();
      toast({ title: "تم الحفظ", description: editingScript ? "تم تحديث السكربت" : "تم إضافة السكربت" });
    },
    onError: (error: Error) => toast({ title: "فشل في الحفظ", description: error.message, variant: "destructive" }),
  });

  const deleteScriptMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/cmp/scripts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cmp/scripts"] });
      toast({ title: "تم الحذف", description: "تم حذف السكربت بنجاح" });
    },
    onError: (error: Error) => toast({ title: "فشل في الحذف", description: error.message, variant: "destructive" }),
  });

  const onSettingsSubmit = (data: z.infer<typeof settingsSchema>) => updateSettingsMutation.mutate(data);

  const onScriptSubmit = (data: z.infer<typeof scriptSchema>) => {
    saveScriptMutation.mutate({ ...data, enabled: booleanToEnabled(data.enabled) });
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
    toast({ title: "تم النسخ", description: "تم نسخ الكود للحافظة" });
  };

  return (
    <div className="space-y-6">
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
              {copiedSnippet ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Settings className="w-6 h-6" />
            الإعدادات العامة
          </CardTitle>
          <CardDescription>قم بتخصيص نصوص وإعدادات شريط الموافقة</CardDescription>
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
                      <Input {...field} placeholder="نحن نستخدم ملفات تعريف الارتباط" data-testid="input-consent-banner-title" />
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
                      <Textarea {...field} placeholder="نستخدم ملفات تعريف الارتباط لتحسين تجربتك..." rows={3} data-testid="input-consent-banner-desc" />
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
                        <Input {...field} type="url" placeholder="https://example.com/privacy" />
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
                        <Input {...field} type="url" placeholder="https://example.com/terms" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button type="submit" disabled={updateSettingsMutation.isPending} data-testid="button-save-consent-settings">
                <Save className="w-4 h-4 ml-2" />
                {updateSettingsMutation.isPending ? "جاري الحفظ..." : "حفظ الإعدادات"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-3">
                <Code className="w-6 h-6" />
                إدارة السكربتات
              </CardTitle>
              <CardDescription>إدارة السكربتات التي يتم حجبها حتى موافقة المستخدم</CardDescription>
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
                <div key={script.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${script.enabled ? 'bg-green-500' : 'bg-gray-400'}`} />
                    <div>
                      <p className="font-medium">{script.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={categoryColors[script.category]}>{categoryLabels[script.category]}</Badge>
                        <span className="text-xs text-muted-foreground">{script.scriptType === 'inline' ? 'مضمن' : 'خارجي'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEditScript(script)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteScriptMutation.mutate(script.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isScriptDialogOpen} onOpenChange={setIsScriptDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingScript ? "تعديل السكربت" : "إضافة سكربت جديد"}</DialogTitle>
            <DialogDescription>أدخل تفاصيل السكربت</DialogDescription>
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
                      <Input {...field} placeholder="Google Analytics" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={scriptForm.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الفئة</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر الفئة" />
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="external">خارجي (URL)</SelectItem>
                        <SelectItem value="inline">مضمن</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {scriptType === "external" ? (
                <FormField
                  control={scriptForm.control}
                  name="scriptUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>رابط السكربت</FormLabel>
                      <FormControl>
                        <Input {...field} type="url" dir="ltr" placeholder="https://example.com/script.js" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <FormField
                  control={scriptForm.control}
                  name="scriptContent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>محتوى السكربت</FormLabel>
                      <FormControl>
                        <Textarea {...field} dir="ltr" rows={4} placeholder="console.log('Hello');" />
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
                    <FormLabel>موقع التضمين</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="head">&lt;head&gt;</SelectItem>
                        <SelectItem value="body">&lt;body&gt;</SelectItem>
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
                  <FormItem className="flex items-center justify-between">
                    <FormLabel>مفعل</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsScriptDialogOpen(false)}>
                  إلغاء
                </Button>
                <Button type="submit" disabled={saveScriptMutation.isPending}>
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
