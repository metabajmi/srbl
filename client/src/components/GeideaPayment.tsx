import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, CreditCard, ShieldCheck, ExternalLink, Tag, X, Check } from "lucide-react";
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

interface DiscountInfo {
  code: string;
  discountType: string;
  discountValue: number;
  discountAmount: number;
  originalPrice: number;
  finalPrice: number;
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
  const [discountCodeInput, setDiscountCodeInput] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [appliedDiscount, setAppliedDiscount] = useState<DiscountInfo | null>(null);
  const [discountError, setDiscountError] = useState<string | null>(null);

  const finalAmount = appliedDiscount ? appliedDiscount.finalPrice : amount;

  const validateDiscountCode = useCallback(async () => {
    if (!discountCodeInput.trim()) return;

    setIsValidating(true);
    setDiscountError(null);

    try {
      const response = await apiRequest("POST", "/api/discount/validate", {
        code: discountCodeInput.trim(),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "كود الخصم غير صالح");
      }

      const data = await response.json();
      setAppliedDiscount(data);
      setDiscountCodeInput("");
    } catch (e: any) {
      setDiscountError(e.message || "فشل في التحقق من كود الخصم");
    } finally {
      setIsValidating(false);
    }
  }, [discountCodeInput]);

  const removeDiscount = useCallback(() => {
    setAppliedDiscount(null);
    setDiscountError(null);
    setDiscountCodeInput("");
  }, []);

  const startPayment = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiRequest("POST", "/api/geidea/session", {
        requestId,
        amount: finalAmount,
        customerEmail,
        customerName,
        discountCode: appliedDiscount?.code || undefined,
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
  }, [requestId, finalAmount, customerEmail, customerName, appliedDiscount, onError]);

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
          {appliedDiscount ? (
            <>
              <p className="text-sm text-muted-foreground line-through" data-testid="text-original-price">
                {appliedDiscount.originalPrice} ر.س
              </p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="text-payment-amount">
                {appliedDiscount.finalPrice} ر.س
              </p>
              <p className="text-sm text-green-600 dark:text-green-400" data-testid="text-discount-info">
                خصم {appliedDiscount.discountValue}{appliedDiscount.discountType === "percentage" ? "%" : " ر.س"} ({appliedDiscount.discountAmount} ر.س)
              </p>
            </>
          ) : (
            <p className="text-2xl font-bold" data-testid="text-payment-amount">{amount} ر.س</p>
          )}
          <p className="text-sm text-muted-foreground">رسوم إنشاء سياسة الخصوصية</p>
        </div>

        {!appliedDiscount ? (
          <div className="space-y-2">
            <div className="flex gap-2 items-center">
              <Input
                placeholder="أدخل كود الخصم"
                value={discountCodeInput}
                onChange={(e) => {
                  setDiscountCodeInput(e.target.value.toUpperCase());
                  setDiscountError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    validateDiscountCode();
                  }
                }}
                className="text-center"
                dir="ltr"
                data-testid="input-discount-code"
              />
              <Button
                variant="outline"
                onClick={validateDiscountCode}
                disabled={isValidating || !discountCodeInput.trim()}
                data-testid="button-apply-discount"
              >
                {isValidating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Tag className="w-4 h-4" />
                )}
              </Button>
            </div>
            {discountError && (
              <p className="text-xs text-destructive text-center" data-testid="text-discount-error">
                {discountError}
              </p>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between bg-green-50 dark:bg-green-950/30 rounded-md px-3 py-2">
            <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
              <Check className="w-4 h-4" />
              <span>كود الخصم: <strong dir="ltr">{appliedDiscount.code}</strong></span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={removeDiscount}
              className="h-7 w-7"
              data-testid="button-remove-discount"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}

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
              ادفع الآن - {finalAmount} ر.س
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
