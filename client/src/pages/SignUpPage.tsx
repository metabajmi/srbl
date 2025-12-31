import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";

const signUpSchema = z.object({
  name: z.string().min(2, "يجب إدخال الاسم (حرفين على الأقل)"),
  email: z.string().email("يجب إدخال بريد إلكتروني صحيح"),
  password: z.string().min(8, "يجب أن تكون كلمة المرور 8 أحرف على الأقل"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "كلمات المرور غير متطابقة",
  path: ["confirmPassword"],
});

type SignUpFormData = z.infer<typeof signUpSchema>;

export default function SignUpPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  const form = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const signUpMutation = useMutation({
    mutationFn: async (data: SignUpFormData) => {
      const result = await apiRequest("POST", "/api/auth/register", {
        name: data.name,
        email: data.email,
        password: data.password,
      });
      return result.json();
    },
    onSuccess: (data: any) => {
      // Store user in localStorage
      if (data && data.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
      }
      
      toast({
        title: "تم التسجيل بنجاح",
        description: data.claimedScanId ? "تم ربط حسابك بالفحص الأخير" : "مرحباً بك في سِرْبَال",
      });
      
      // Redirect to dashboard (which will show the claimed scan automatically)
      navigate("/dashboard");
    },
    onError: (error: any) => {
      toast({
        title: "خطأ في التسجيل",
        description: error.message || "حدث خطأ أثناء التسجيل",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SignUpFormData) => {
    signUpMutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-accent/20">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">إنشاء حساب جديد</CardTitle>
          <CardDescription>
            املأ البيانات التالية لإنشاء حساب في منصة الامتثال PDPL
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الاسم</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="أدخل اسمك الكامل"
                        data-testid="input-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
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
                        placeholder="أدخل كلمة المرور (8 أحرف على الأقل)"
                        data-testid="input-password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>تأكيد كلمة المرور</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        placeholder="أعد إدخال كلمة المرور"
                        data-testid="input-confirm-password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={signUpMutation.isPending}
                data-testid="button-submit"
              >
                {signUpMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {signUpMutation.isPending ? "جاري التسجيل..." : "إنشاء حساب"}
              </Button>
            </form>
          </Form>

          <div className="mt-4 text-center text-sm text-muted-foreground">
            لديك حساب بالفعل؟{" "}
            <Button
              variant="ghost"
              className="p-0 h-auto underline"
              onClick={() => navigate("/login")}
              data-testid="link-login"
            >
              تسجيل الدخول
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
