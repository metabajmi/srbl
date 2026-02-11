import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard, Smartphone } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

declare global {
  interface Window {
    GeideaCheckout: any;
  }
}

interface GeideaPaymentProps {
  amount: number;
  description: string;
  requestId: string;
  onCompleted?: (payment: any) => Promise<void>;
  onError?: (error: any) => void;
}

export default function GeideaPayment({
  amount,
  description,
  requestId,
  onCompleted,
  onError,
}: GeideaPaymentProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sdkLoaded = useRef(false);

  useEffect(() => {
    if (sdkLoaded.current) return;
    sdkLoaded.current = true;

    if (!document.getElementById("geidea-checkout-js")) {
      const script = document.createElement("script");
      script.id = "geidea-checkout-js";
      script.src = "https://www.merchant.geidea.net/hpp/geideaCheckout.min.js";
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  const handlePayment = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const sessionResponse = await apiRequest("POST", "/api/geidea/session", {
        amount,
        currency: "SAR",
        description,
        requestId,
      });

      if (!sessionResponse.ok) {
        const errData = await sessionResponse.json();
        throw new Error(errData.error || "فشل في إنشاء جلسة الدفع");
      }

      const { sessionId } = await sessionResponse.json();

      if (!window.GeideaCheckout) {
        await new Promise<void>((resolve, reject) => {
          const checkInterval = setInterval(() => {
            if (window.GeideaCheckout) {
              clearInterval(checkInterval);
              resolve();
            }
          }, 200);
          setTimeout(() => {
            clearInterval(checkInterval);
            reject(new Error("فشل في تحميل بوابة الدفع"));
          }, 10000);
        });
      }

      const onSuccess = async (response: any) => {
        setIsLoading(false);
        try {
          const verifyResponse = await apiRequest("POST", "/api/payments/verify", {
            paymentId: response?.order?.orderId || response?.orderId || sessionId,
            requestId,
            provider: "geidea",
            rawPayload: response,
          });

          if (verifyResponse.ok) {
            if (onCompleted) await onCompleted(response);
          } else {
            const errData = await verifyResponse.json();
            throw new Error(errData.error || "فشل التحقق من الدفع");
          }
        } catch (e: any) {
          setError(e.message);
          if (onError) onError(e);
        }
      };

      const onPaymentError = (err: any) => {
        setIsLoading(false);
        const message = err?.responseMessage || err?.detailedResponseMessage || "فشل في عملية الدفع";
        setError(message);
        if (onError) onError(err);
      };

      const onCancel = () => {
        setIsLoading(false);
      };

      const payment = new window.GeideaCheckout(onSuccess, onPaymentError, onCancel);
      payment.startPayment(sessionId);
    } catch (e: any) {
      setIsLoading(false);
      setError(e.message || "فشل في تحميل بوابة الدفع");
      if (onError) onError(e);
    }
  };

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6 text-center space-y-3">
          <p className="text-destructive">{error}</p>
          <Button variant="outline" onClick={() => { setError(null); handlePayment(); }} data-testid="button-retry-payment">
            إعادة المحاولة
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader dir="rtl" className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          الدفع الآمن
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          ندعم مدى، فيزا، ماستركارد و Apple Pay
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center space-y-2">
          <p className="text-2xl font-bold" data-testid="text-payment-amount">
            {(amount / 100).toFixed(2)} ر.س
          </p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>

        <Button
          className="w-full"
          size="lg"
          onClick={handlePayment}
          disabled={isLoading}
          data-testid="button-pay-geidea"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin ml-2" />
              جاري تحميل بوابة الدفع...
            </>
          ) : (
            "ادفع الآن"
          )}
        </Button>

        <div className="flex items-center justify-center gap-4 text-muted-foreground text-xs">
          <span className="font-medium border rounded px-2 py-1">مدى</span>
          <span className="font-medium border rounded px-2 py-1">Visa</span>
          <span className="font-medium border rounded px-2 py-1">Mastercard</span>
          <span className="font-medium border rounded px-2 py-1 flex items-center gap-1">
            <Smartphone className="w-3 h-3" />
            Apple Pay
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
