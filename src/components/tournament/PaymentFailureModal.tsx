/**
 * 🔥 결제 실패/보류 UX
 * 
 * 압박 ❌ / 관계 유지 ⭕
 */

import { X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaymentFailureModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason?: string;
}

export function PaymentFailureModal({
  isOpen,
  onClose,
  reason,
}: PaymentFailureModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-amber-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              결제가 완료되지 않았습니다.
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-6">
          {reason && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-amber-800">{reason}</p>
            </div>
          )}
          
          <p className="text-sm text-gray-600">
            필요하실 때 언제든지
            <br />
            플랜을 업그레이드하실 수 있습니다.
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1"
          >
            확인
          </Button>
          <Button
            onClick={() => {
              // TODO: 고객 지원 페이지로 이동
              onClose();
            }}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            문의하기
          </Button>
        </div>
      </div>
    </div>
  );
}
