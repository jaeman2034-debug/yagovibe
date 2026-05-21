/**
 * 🔥 결제 실패 페이지
 * 
 * 역할:
 * - 토스페이먼츠 결제 실패 콜백 처리
 * - 에러 메시지 표시
 */

import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";

export default function PaymentFailPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
  }, [user, navigate]);

  const errorCode = params.get("code");
  const errorMessage = params.get("message");
  const orderId = params.get("orderId");

  const getErrorMessage = (code: string | null) => {
    switch (code) {
      case "USER_CANCEL":
        return "결제가 취소되었습니다.";
      case "INVALID_CARD":
        return "유효하지 않은 카드입니다.";
      case "INSUFFICIENT_BALANCE":
        return "잔액이 부족합니다.";
      case "CARD_EXPIRED":
        return "만료된 카드입니다.";
      default:
        return errorMessage || "결제에 실패했습니다.";
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-none rounded-lg border border-red-200 bg-red-50 p-8 text-center md:mx-auto md:max-w-3xl">
        <div className="text-red-600 text-4xl mb-4">❌</div>
        <h2 className="text-2xl font-bold text-red-800 mb-2">결제에 실패했습니다</h2>
        <p className="text-red-600 mb-4">{getErrorMessage(errorCode)}</p>
        {orderId && (
          <p className="text-xs text-gray-500 mb-4">주문번호: {orderId}</p>
        )}
        <div className="flex gap-2 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            다시 시도
          </button>
          <button
            onClick={() => navigate("/sports-hub")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            홈으로 이동
          </button>
        </div>
      </div>
    </div>
  );
}
