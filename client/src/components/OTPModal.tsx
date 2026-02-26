import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Mail, ArrowRight, CheckCircle2 } from "lucide-react";

interface OTPModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (user: any, claimedScanId?: string | null) => void;
}

type Step = "email" | "otp" | "success";

export function OTPModal({ open, onOpenChange, onSuccess }: OTPModalProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep("email");
        setEmail("");
        setName("");
        setPhone("");
        setOtp("");
        setCountdown(0);
        setAgreedToTerms(false);
      }, 300);
    }
  }, [open]);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Send OTP mutation
  const sendOtpMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/auth/otp/send", { email, name: name || undefined });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "فشل في إرسال رمز التحقق");
      }
      return response.json();
    },
    onSuccess: () => {
      setStep("otp");
      setCountdown(60); // 60 second cooldown
      toast({
        title: "تم إرسال الرمز",
        description: "تحقق من بريدك الإلكتروني",
      });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error.message || "فشل في إرسال رمز التحقق",
        variant: "destructive",
      });
    },
  });

  // Verify OTP mutation
  const verifyOtpMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/auth/otp/verify", { email, code: otp });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "رمز التحقق غير صحيح");
      }
      return response.json();
    },
    onSuccess: (data: any) => {
      // Store user in localStorage
      if (data.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
      }
      
      setStep("success");
      
      // Notify parent and close modal after brief delay
      setTimeout(() => {
        onOpenChange(false);
        if (onSuccess) {
          onSuccess(data.user, data.claimedScanId);
        }
        // Trigger storage event for auth state update
        window.dispatchEvent(new Event("storage"));
      }, 1500);
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error.message || "رمز التحقق غير صحيح",
        variant: "destructive",
      });
      setOtp("");
    },
  });

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    sendOtpMutation.mutate();
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) return;
    verifyOtpMutation.mutate();
  };

  const handleResend = () => {
    if (countdown > 0) return;
    sendOtpMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        {step === "email" && (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl">التحقق من الهوية</DialogTitle>
              <DialogDescription>
                أدخل بريدك الإلكتروني لاستلام رمز التحقق
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSendOtp} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="name">الاسم *</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="أدخل اسمك"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  data-testid="input-otp-name"
                  dir="rtl"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">رقم الجوال</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="05xxxxxxxx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  data-testid="input-otp-phone"
                  dir="ltr"
                  className="text-left"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">البريد الإلكتروني *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="example@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  data-testid="input-otp-email"
                  dir="ltr"
                  className="text-left"
                />
              </div>
              
              <div className="flex items-start gap-3">
                <Checkbox
                  id="terms-agreement"
                  checked={agreedToTerms}
                  onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
                  data-testid="checkbox-terms-agreement"
                  className="mt-1"
                />
                <Label htmlFor="terms-agreement" className="text-sm leading-relaxed cursor-pointer">
                  أوافق على{" "}
                  <a 
                    href="/privacy" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    سياسة الخصوصية
                  </a>
                  {" "}و{" "}
                  <a 
                    href="/terms" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    الشروط والأحكام
                  </a>
                </Label>
              </div>
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={!name.trim() || !email || !agreedToTerms || sendOtpMutation.isPending}
                data-testid="button-send-otp"
              >
                {sendOtpMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                ) : (
                  <Mail className="h-4 w-4 ml-2" />
                )}
                إرسال رمز التحقق
              </Button>
            </form>
          </>
        )}

        {step === "otp" && (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl">أدخل رمز التحقق</DialogTitle>
              <DialogDescription>
                تم إرسال رمز مكون من 6 أرقام إلى{" "}
                <span className="font-medium text-foreground" dir="ltr">{email}</span>
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleVerifyOtp} className="space-y-6 mt-4">
              <div className="flex justify-center" dir="ltr">
                <InputOTP
                  value={otp}
                  onChange={setOtp}
                  maxLength={6}
                  data-testid="input-otp-code"
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={otp.length !== 6 || verifyOtpMutation.isPending}
                data-testid="button-verify-otp"
              >
                {verifyOtpMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                ) : (
                  <ArrowRight className="h-4 w-4 ml-2" />
                )}
                تأكيد الرمز
              </Button>
              
              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={countdown > 0 || sendOtpMutation.isPending}
                  className="text-sm text-muted-foreground hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid="button-resend-otp"
                >
                  {countdown > 0 ? (
                    `إعادة الإرسال بعد ${countdown} ثانية`
                  ) : (
                    "لم يصلك الرمز؟ أعد الإرسال"
                  )}
                </button>
              </div>
              
              <Button 
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setStep("email")}
                data-testid="button-change-email"
              >
                تغيير البريد الإلكتروني
              </Button>
            </form>
          </>
        )}

        {step === "success" && (
          <div className="py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold mb-2">تم التحقق بنجاح!</h3>
            <p className="text-muted-foreground">جاري تحميل النتائج...</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
