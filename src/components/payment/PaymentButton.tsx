/**
 * 🔥 결제 버튼 컴포넌트 (안전 가드 포함)
 * 
 * 역할:
 * - 신뢰도 기반 결제 버튼 활성화
 * - 결제 요청 처리
 * - 로딩/에러 상태 관리
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { usePermissions } from "@/hooks/usePermissions";
import { requestTossPayment } from "@/utils/tossPayment";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { PaymentRequest } from "@/utils/tossPayment";

interface PaymentButtonProps {
  amount: number;
  orderName: string;
  itemId: string;
  metadata?: Record<string, any>;
  className?: string;
  disabled?: boolean;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function PaymentButton({
  amount,
  orderName,
  itemId,
  metadata,
  className = "",
  disabled = false,
  onSuccess,
  onError,
}: PaymentButtonProps) {
  const { user } = useAuth();
  const { canPay, loading: permissionsLoading, trustTier } = usePermissions();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handlePayment = async () => {
    if (!user) {
      navigate("/login");
      return;
    }

    if (!canPay) {
      onError?.("결제 권한이 없습니다. 프로필을 완성하고 활동을 이어가주세요.");
      return;
    }

    setLoading(true);
    try {
      // 🔥 Firestore user 데이터 조회
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.exists() ? userSnap.data() : undefined;

      // 🔥 결제 요청
      const result = await requestTossPayment(
        {
          amount,
          orderName,
          itemId,
          metadata,
        },
        user,
        userData
      );

      if (result.success) {
        onSuccess?.();
      } else {
        onError?.(result.error || "결제 요청에 실패했습니다.");
      }
    } catch (error: any) {
      console.error("❌ [PaymentButton] 결제 요청 실패:", error);
      onError?.(error.message || "결제 요청 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  if (permissionsLoading) {
    return (
      <button
        disabled
        className={`px-4 py-2 bg-gray-400 text-white rounded-lg cursor-not-allowed ${className}`}
      >
        확인 중...
      </button>
    );
  }

  if (!canPay) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-sm text-yellow-800">
          결제 기능을 사용하려면 신뢰도 등급이 필요합니다.
        </p>
        {trustTier && (
          <p className="text-xs text-yellow-600 mt-1">
            현재 등급: {trustTier} (verified 이상 필요)
          </p>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={handlePayment}
      disabled={disabled || loading}
      className={`px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {loading ? "결제 중..." : `${amount.toLocaleString()}원 결제하기`}
    </button>
  );
}
