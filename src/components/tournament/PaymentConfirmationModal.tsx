/**
 * 🔥 결제 확인 모달 (최종 방어선)
 * 
 * CTA 클릭 후 한 번 더 확인
 * 의사결정 책임 분산 → 승인률 상승
 */

import { X } from "lucide-react";
import { track } from "@/lib/analytics";
import type { TournamentPlanType } from "@/types/tournamentPlan";
import { TOURNAMENT_PLAN_PRICES, getTournamentPlanName } from "@/types/tournamentPlan";

interface PaymentConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  plan: TournamentPlanType;
  associationId?: string;
}

export function PaymentConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  plan,
  associationId,
}: PaymentConfirmationModalProps) {
  if (!isOpen) return null;

  const planName = getTournamentPlanName(plan);
  const planPrice = TOURNAMENT_PLAN_PRICES[plan];

  const getPlanDescription = () => {
    if (plan === "basic") {
      return "엑셀 다운로드와 알림 자동화를 이용할 수 있습니다.";
    }
    if (plan === "pro") {
      return "결제 연동, 현장 체크인 등 모든 기능을 이용할 수 있습니다.";
    }
    return "";
  };

  const handleConfirm = () => {
    track("tournament_payment_confirmed", {
      plan,
      associationId,
    });
    onConfirm();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            {planName} 플랜을 사용하시겠습니까?
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-lg font-bold text-gray-900 mb-2">
              {planPrice.monthly && (
                <>
                  월 {planPrice.monthly.toLocaleString()}원으로
                </>
              )}
            </p>
            <p className="text-sm text-gray-700">
              {getPlanDescription()}
            </p>
          </div>

          <div className="text-xs text-gray-500 space-y-1">
            <p>• 결제 후 즉시 기능을 사용할 수 있습니다.</p>
            <p>• 언제든지 플랜을 변경하거나 취소할 수 있습니다.</p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
          >
            확인하고 사용하기
          </button>
        </div>
      </div>
    </div>
  );
}
