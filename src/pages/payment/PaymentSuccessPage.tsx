/**
 * 🔥 결제 성공 페이지
 * 
 * 역할:
 * - 토스페이먼츠 결제 성공 콜백 처리
 * - 서버 검증
 * - 결제 성공 로그
 */

import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { handlePaymentSuccess } from "@/utils/tossPayment";
import { useAuth } from "@/context/AuthProvider";

export default function PaymentSuccessPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    const processPayment = async () => {
      try {
        // 🔥 URL에서 결제 정보 추출 (토스페이먼츠 콜백)
        const orderId = params.get("orderId");
        const paymentKey = params.get("paymentKey");
        const amount = params.get("amount");

        if (!orderId || !paymentKey || !amount) {
          throw new Error("결제 정보가 올바르지 않습니다.");
        }

        // 🔥 결제 성공 처리
        await handlePaymentSuccess(orderId, paymentKey, parseInt(amount));

        setLoading(false);

        // 🔥 3초 후 홈으로 이동
        setTimeout(() => {
          navigate("/sports-hub");
        }, 3000);
      } catch (err: any) {
        console.error("❌ [PaymentSuccessPage] 결제 처리 실패:", err);
        setError(err.message || "결제 처리 중 오류가 발생했습니다.");
        setLoading(false);
      }
    };

    processPayment();
  }, [params, navigate, user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">결제를 처리하고 있습니다...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-full max-w-none rounded-lg border border-red-200 bg-red-50 p-8 text-center md:mx-auto md:max-w-3xl">
          <div className="text-red-600 text-2xl mb-4">❌</div>
          <h2 className="text-xl font-bold text-red-800 mb-2">결제 처리 실패</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => navigate("/sports-hub")}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            홈으로 이동
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-none rounded-lg border border-green-200 bg-green-50 p-8 text-center md:mx-auto md:max-w-3xl">
        <div className="text-green-600 text-4xl mb-4">✅</div>
        <h2 className="text-2xl font-bold text-green-800 mb-2">결제가 완료되었습니다!</h2>
        <p className="text-gray-600 mb-4">3초 후 홈 화면으로 이동합니다.</p>
        <button
          onClick={() => navigate("/sports-hub")}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          바로 이동
        </button>
      </div>
    </div>
  );
}
