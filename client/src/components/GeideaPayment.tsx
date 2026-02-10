import { useEffect, useRef, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard, Smartphone, ExternalLink } from "lucide-react";
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

const GEIDEA_HPP_BASE = "https://www.ksamerchant.geidea.net/hpp/checkout/?";
const GEIDEA_SDK_URL = "https://www.ksamerchant.geidea.net/hpp/geideaCheckout.min.js";

export default function GeideaPayment({
  amount,
  description,
  requestId,
  onCompleted,
  onError,
}: GeideaPaymentProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const sdkLoadAttempted = useRef(false);

  useEffect(() => {
    if (sdkLoadAttempted.current) return;
    sdkLoadAttempted.current = true;

    if (window.GeideaCheckout) {
      setSdkReady(true);
      return;
    }

    if (!document.getElementById("geidea-checkout-js")) {
      const script = document.createElement("script");
      script.id = "geidea-checkout-js";
      script.src = GEIDEA_SDK_URL;
      script.async = true;
      script.onload = () => {
        console.log("Geidea SDK loaded successfully");
        setSdkReady(true);
      };
      script.onerror = () => {
        console.warn("Geidea SDK failed to load, will use redirect checkout");
      };
      document.head.appendChild(script);
    }
  }, []);

  const createSession = useCallback(async () => {
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

    const data = await sessionResponse.json();
    return data.sessionId;
  }, [amount, description, requestId]);

  const openRedirectCheckout = useCallback((sid: string) => {
    const checkoutUrl = GEIDEA_HPP_BASE + sid;
    console.log("Opening Geidea redirect checkout:", checkoutUrl);
    window.location.href = checkoutUrl;
  }, []);

  const trySDKCheckout = useCallback((sid: string): boolean => {
    if (!window.GeideaCheckout) {
      console.warn("GeideaCheckout not available on window");
      return false;
    }

    try {
      const onSuccess = async (response: any) => {
        console.log("Geidea payment success:", response);
        setIsLoading(false);
        try {
          const verifyResponse = await apiRequest("POST", "/api/payments/verify", {
            paymentId: response?.order?.orderId || response?.orderId || sid,
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
          console.error("Payment verification error:", e);
          setError(e.message);
          if (onError) onError(e);
        }
      };

      const onPaymentError = (err: any) => {
        console.error("Geidea payment error:", err);
        setIsLoading(false);
        const message = err?.responseMessage || err?.detailedResponseMessage || "فشل في عملية الدفع";
        setError(message);
        if (onError) onError(err);
      };

      const onCancel = () => {
        console.log("Geidea payment cancelled");
        setIsLoading(false);
      };

      const payment = new window.GeideaCheckout(onSuccess, onPaymentError, onCancel);
      payment.startPayment(sid);
      return true;
    } catch (sdkErr) {
      console.error("Geidea SDK startPayment failed:", sdkErr);
      return false;
    }
  }, [requestId, onCompleted, onError]);

  const handlePayment = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const sid = await createSession();
      setSessionId(sid);
      console.log("Session created:", sid);

      if (sdkReady) {
        const sdkWorked = trySDKCheckout(sid);
        if (!sdkWorked) {
          console.log("SDK failed, falling back to redirect checkout");
          openRedirectCheckout(sid);
        }
      } else {
        console.log("SDK not ready, using redirect checkout");
        openRedirectCheckout(sid);
      }
    } catch (e: any) {
      console.error("Payment initiation error:", e);
      setIsLoading(false);
      setError(e.message || "فشل في تحميل بوابة الدفع");
      if (onError) onError(e);
    }
  };

  const handleRedirectFallback = () => {
    if (sessionId) {
      openRedirectCheckout(sessionId);
    }
  };

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6 text-center space-y-3">
          <p className="text-destructive">{error}</p>
          <div className="flex flex-col gap-2 items-center">
            <Button variant="outline" onClick={() => { setError(null); handlePayment(); }} data-testid="button-retry-payment">
              إعادة المحاولة
            </Button>
            {sessionId && (
              <Button variant="ghost" size="sm" onClick={handleRedirectFallback} data-testid="button-redirect-payment">
                <ExternalLink className="w-4 h-4 ml-1" />
                فتح صفحة الدفع مباشرة
              </Button>
            )}
          </div>
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
            {(amount / 100).toFixed(0)} ر.س
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
