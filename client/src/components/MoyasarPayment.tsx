import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CreditCard, Smartphone } from "lucide-react";

declare global {
  interface Window {
    Moyasar: any;
  }
}

interface MoyasarPaymentProps {
  amount: number;
  description: string;
  callbackUrl: string;
  onCompleted?: (payment: any) => Promise<void>;
  onError?: (error: any) => void;
}

export default function MoyasarPayment({
  amount,
  description,
  callbackUrl,
  onCompleted,
  onError,
}: MoyasarPaymentProps) {
  const formRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const loadMoyasar = async () => {
      try {
        if (!document.getElementById("moyasar-css")) {
          const link = document.createElement("link");
          link.id = "moyasar-css";
          link.rel = "stylesheet";
          link.href = "https://cdn.moyasar.com/mpf/1.14.0/moyasar.css";
          document.head.appendChild(link);
        }

        if (!document.getElementById("moyasar-polyfill")) {
          const polyfill = document.createElement("script");
          polyfill.id = "moyasar-polyfill";
          polyfill.src = "https://polyfill.io/v3/polyfill.min.js?features=fetch";
          document.body.appendChild(polyfill);
        }

        if (!window.Moyasar) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement("script");
            script.id = "moyasar-js";
            script.src = "https://cdn.moyasar.com/mpf/1.14.0/moyasar.js";
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("Failed to load Moyasar"));
            document.body.appendChild(script);
          });
        }

        await initMoyasar();
      } catch (e) {
        console.error("Failed to load Moyasar:", e);
        setError("فشل في تحميل بوابة الدفع");
        if (onError) onError(e);
      }
    };

    const initMoyasar = async () => {
      const publishableKey = import.meta.env.VITE_MOYASAR_PUBLISHABLE_KEY;
      
      if (!publishableKey) {
        setError("مفتاح الدفع غير متوفر");
        setIsLoading(false);
        return;
      }

      if (!formRef.current) return;

      try {
        window.Moyasar.init({
          element: formRef.current,
          amount: amount,
          currency: "SAR",
          description: description,
          publishable_api_key: publishableKey,
          callback_url: callbackUrl,
          methods: ["creditcard", "applepay"],
          supported_networks: ["visa", "mastercard", "mada"],
          apple_pay: {
            country: "SA",
            label: "سِرْبَال - Sirbal",
            validate_merchant_url: "https://api.moyasar.com/v1/applepay/initiate",
          },
          on_initiating: function() {
            console.log("Payment initiating...");
          },
          on_completed: async function(payment: any) {
            console.log("Payment completed:", payment);
            if (onCompleted) {
              await onCompleted(payment);
            }
          },
          on_failure: function(error: any) {
            console.error("Payment failed:", error);
            if (onError) onError(error);
          },
        });

        setIsLoading(false);
      } catch (e) {
        console.error("Failed to init Moyasar:", e);
        setError("فشل في تهيئة بوابة الدفع");
        setIsLoading(false);
      }
    };

    loadMoyasar();
  }, [amount, description, callbackUrl, onCompleted, onError]);

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6 text-center">
          <p className="text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          الدفع الآمن
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          ندعم مدى، فيزا، ماستركارد و Apple Pay
        </p>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}
        <div 
          ref={formRef} 
          className="mysr-form" 
          data-testid="moyasar-payment-form"
          style={{ display: isLoading ? "none" : "block" }}
        />
        <div className="mt-4 flex items-center justify-center gap-4 text-muted-foreground">
          <img 
            src="https://cdn.moyasar.com/assets/brands/mada.svg" 
            alt="Mada" 
            className="h-6"
          />
          <img 
            src="https://cdn.moyasar.com/assets/brands/visa.svg" 
            alt="Visa" 
            className="h-6"
          />
          <img 
            src="https://cdn.moyasar.com/assets/brands/mastercard.svg" 
            alt="Mastercard" 
            className="h-6"
          />
          <Smartphone className="w-5 h-5" title="Apple Pay" />
        </div>
      </CardContent>
    </Card>
  );
}
