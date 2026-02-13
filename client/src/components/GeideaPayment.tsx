import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard, ShieldCheck, ExternalLink } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";


interface GeideaPaymentProps {
  requestId: string;
  amount: number;
  customerEmail?: string;
  customerName?: string;
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
  onCancel?: () => void;
}

export default function GeideaPayment({
  requestId,
  amount,
  customerEmail,
  customerName,
  onSuccess,
  onError,
  onCancel,
}: GeideaPaymentProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startPayment = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiRequest("POST", "/api/geidea/session", {
        requestId,
        amount,
        customerEmail,
        customerName,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "فشل في إنشاء جلسة الدفع");
      }

      const { sessionId, checkoutUrl } = await response.json();

      if (!sessionId || !checkoutUrl) {
        throw new Error("بيانات جلسة الدفع غير مكتملة");
      }

      window.location.href = checkoutUrl;
    } catch (e: any) {
      console.error("Geidea payment error:", e);
      const msg = e.message || "فشل في بدء عملية الدفع";
      setError(msg);
      setIsLoading(false);
      if (onError) onError(msg);
    }
  }, [requestId, amount, customerEmail, customerName, onError]);

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6 text-center space-y-4">
          <p className="text-destructive" data-testid="text-payment-error">{error}</p>
          <Button
            variant="outline"
            onClick={() => {
              setError(null);
              startPayment();
            }}
            data-testid="button-retry-payment"
          >
            إعادة المحاولة
          </Button>
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
          ندعم مدى، فيزا، وماستركارد
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-muted/50 rounded-md p-4 text-center space-y-2">
          <p className="text-2xl font-bold" data-testid="text-payment-amount">{amount} ر.س</p>
          <p className="text-sm text-muted-foreground">رسوم إنشاء سياسة الخصوصية</p>
        </div>

        <Button
          onClick={startPayment}
          disabled={isLoading}
          className="w-full"
          size="lg"
          data-testid="button-start-payment"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin ml-2" />
              جاري تحميل بوابة الدفع...
            </>
          ) : (
            <>
              <ShieldCheck className="w-5 h-5 ml-2" />
              ادفع الآن - {amount} ر.س
              <ExternalLink className="w-4 h-4 mr-2" />
            </>
          )}
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          سيتم توجيهك إلى صفحة الدفع الآمنة من Geidea
        </p>

        <div className="flex items-center justify-center gap-3 pt-2">
          <img
            src="https://www.geidea.net/ksa/wp-content/themes/flavor-starter/assets/images/footer_mada.svg"
            alt="Mada"
            className="h-6"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <img
            src="https://www.geidea.net/ksa/wp-content/themes/flavor-starter/assets/images/footer_visa.svg"
            alt="Visa"
            className="h-6"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <img
            src="https://www.geidea.net/ksa/wp-content/themes/flavor-starter/assets/images/footer_master.svg"
            alt="Mastercard"
            className="h-6"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="w-3 h-3" />
          <span>مدفوعات آمنة عبر Geidea</span>
        </div>
      </CardContent>
    </Card>
  );
}
