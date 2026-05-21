/**
 * 🔥 안전결제 버튼 컴포넌트 (프로덕션 배포 패키지)
 * 
 * 역할:
 * - 결제 요청 처리
 * - 에스크로 안내
 * - 채팅 열림
 */

import { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Loader2, Shield } from "lucide-react";

interface PayButtonProps {
  postId: string;
  sellerId: string;
  amount: number;
  onPaymentSuccess?: (tradeId: string) => void;
  disabled?: boolean;
}

export default function PayButton({
  postId,
  sellerId,
  amount,
  onPaymentSuccess,
  disabled = false,
}: PayButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePayment = async () => {
    setLoading(true);
    setError(null);

    try {
      const requestPayment = httpsCallable(functions, "requestPayment");
      const result = await requestPayment({
        postId,
        sellerId,
        amount,
      });

      const data = result.data as {
        success: boolean;
        tradeId: string;
        paymentId: string;
        amount: number;
        deposit: number;
      };

      if (data.success) {
        // 🔥 결제 성공 시 콜백
        if (onPaymentSuccess) {
          onPaymentSuccess(data.tradeId);
        }
      } else {
        setError("결제 요청에 실패했습니다.");
      }
    } catch (err: any) {
      console.error("❌ [PayButton] 결제 실패:", err);
      setError(err.message || "결제 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const deposit = Math.round(amount * 0.1); // 보증금 10%

  return (
    <div className="space-y-2">
      <Button
        onClick={handlePayment}
        disabled={disabled || loading}
        className="w-full bg-green-600 hover:bg-green-700 text-white font-medium"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            결제 처리 중...
          </>
        ) : (
          <>
            <Shield className="w-4 h-4 mr-2" />
            안전결제 후 채팅 열림
          </>
        )}
      </Button>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <div className="text-xs text-gray-500 space-y-1">
        <p>💰 결제 금액: {amount.toLocaleString()}원</p>
        <p>🛡️ 보증금: {deposit.toLocaleString()}원 (10%)</p>
        <p className="text-blue-600">
          ✓ 에스크로 보관으로 안전하게 거래하세요
        </p>
      </div>
    </div>
  );
}
