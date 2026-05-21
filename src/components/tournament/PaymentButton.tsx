/**
 * 💳 참가비 결제 버튼 컴포넌트 (v2)
 * 
 * 승인된 신청에 대해 결제 요청 버튼 제공
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getFunctions, httpsCallable } from "firebase/functions";
import type { TournamentApplication } from "@/types/tournament";
import type { Payment } from "@/types/payment";
import { CreditCard, Loader2 } from "lucide-react";

interface PaymentButtonProps {
  application: TournamentApplication;
  payment?: Payment | null;
  associationId: string;
  tournamentId: string;
  onPaymentSuccess?: () => void;
}

export function PaymentButton({
  application,
  payment,
  associationId,
  tournamentId,
  onPaymentSuccess,
}: PaymentButtonProps) {
  const [processing, setProcessing] = useState(false);

  // 🔥 결제 버튼 노출 조건
  const shouldShowButton =
    application.status === "APPROVED" || application.status === "approved";

  // 🔥 결제 가능 여부
  const canPay = payment?.status === "ready";

  // 🔥 결제 완료 여부
  const isPaid = payment?.status === "paid";

  if (!shouldShowButton) {
    return null;
  }

  if (isPaid) {
    return (
      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
        <p className="text-sm text-green-700 font-medium">
          ✅ 결제 완료
        </p>
        {payment.paidAt && (
          <p className="text-xs text-green-600 mt-1">
            결제일: {payment.paidAt.toDate().toLocaleDateString("ko-KR")}
          </p>
        )}
      </div>
    );
  }

  if (!canPay) {
    return (
      <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
        <p className="text-sm text-gray-600">
          결제 정보를 준비하는 중입니다...
        </p>
      </div>
    );
  }

  const handlePayment = async () => {
    if (processing) return;

    setProcessing(true);
    const loadingToastId = toast.loading("결제를 준비하는 중입니다...");

    try {
      // 🔥 v2: 결제 요청 Cloud Function 호출
      // ⭐⭐⭐ 중요: region 명시 필수 (Callable 함수는 region이 다르면 호출 실패)
      const functions = getFunctions(undefined, "asia-northeast3");
      const createPaymentFn = httpsCallable(functions, "createPaymentRequest");

      const result = await createPaymentFn({
        associationId,
        tournamentId,
        applicationId: application.id,
      });

      const { paymentUrl, orderId } = (result.data as any) || {};

      if (!paymentUrl) {
        throw new Error("결제 URL을 받을 수 없습니다.");
      }

      // 🔥 토스페이먼츠 결제창으로 이동
      window.location.href = paymentUrl;

      // 결제 완료는 Webhook으로 처리되므로 여기서는 대기
      toast.success("결제창으로 이동합니다.", {
        id: loadingToastId,
      });
    } catch (error: any) {
      console.error("결제 요청 오류:", error);
      const errorMessage = error?.message || error?.details?.message || "알 수 없는 오류";
      toast.error(`결제 요청 실패: ${errorMessage}`, {
        id: loadingToastId,
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">참가비</span>
          <span className="text-lg font-bold text-blue-700">
            {payment.amount.toLocaleString()}원
          </span>
        </div>
        {application.feePolicySnapshot && (
          <div className="text-xs text-gray-600 mt-1">
            (기본 {application.feePolicySnapshot.baseFee.toLocaleString()}원
            {application.teamCount > application.feePolicySnapshot.baseTeamCount && (
              <>
                {" + "}
                추가 {application.teamCount - application.feePolicySnapshot.baseTeamCount}팀 ×{" "}
                {application.feePolicySnapshot.extraFeePerTeam.toLocaleString()}원
              </>
            )}
            )
          </div>
        )}
      </div>

      <Button
        onClick={handlePayment}
        disabled={processing}
        className="w-full bg-blue-600 hover:bg-blue-700"
        size="lg"
      >
        {processing ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            결제 준비 중...
          </>
        ) : (
          <>
            <CreditCard className="w-4 h-4 mr-2" />
            참가비 결제하기
          </>
        )}
      </Button>

      <p className="text-xs text-gray-500 text-center">
        결제 완료 후 선수 명단 등록이 가능합니다.
      </p>
    </div>
  );
}
