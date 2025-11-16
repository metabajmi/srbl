import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("يجب إدخال بريد إلكتروني صحيح"),
  password: z.string().min(1, "يجب إدخال كلمة المرور"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormData) => {
      const result = await apiRequest("POST", "/api/auth/login", data);
      return result.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "مرحباً بك!",
        description: "تم تسجيل الدخول بنجاح",
      });
      // Store user in localStorage for now (will implement proper session later)
      if (data && data.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
      }
      navigate("/dashboard");
    },
    onError: (error: any) => {
      toast({
        title: "خطأ في تسجيل الدخول",
        description: error.message || "البريد الإلكتروني أو كلمة المرور غير صحيحة",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: LoginFormData) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-accent/20">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">تسجيل الدخول</CardTitle>
          <CardDescription>
            أدخل بياناتك للوصول إلى لوحة التحكم
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>البريد الإلكتروني</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder="example@domain.com"
                        data-testid="input-email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>كلمة المرور</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        placeholder="أدخل كلمة المرور"
                        data-testid="input-password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-center justify-between">
                <Button
                  type="button"
                  variant="link"
                  className="p-0 h-auto text-sm"
                  onClick={() => toast({ title: "قريباً", description: "ميزة استرجاع كلمة المرور قيد التطوير" })}
                  data-testid="link-forgot-password"
                >
                  نسيت كلمة المرور؟
                </Button>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loginMutation.isPending}
                data-testid="button-submit"
              >
                {loginMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loginMutation.isPending ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
              </Button>
            </form>
          </Form>

          <div className="mt-4 text-center text-sm text-muted-foreground">
            ليس لديك حساب؟{" "}
            <Button
              variant="link"
              className="p-0 h-auto"
              onClick={() => navigate("/signup")}
              data-testid="link-signup"
            >
              إنشاء حساب جديد
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
