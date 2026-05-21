/**
 * 🔥 결제 완료 후 UX
 * 
 * 결제 성공 직후 즉시 보상 체감
 */

import { CheckCircle, Download, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TournamentPlanType } from "@/types/tournamentPlan";
import { getTournamentPlanName } from "@/types/tournamentPlan";

interface PaymentSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: TournamentPlanType;
  onUseFeature?: (feature: "excel" | "notification") => void;
}

export function PaymentSuccessModal({
  isOpen,
  onClose,
  plan,
  onUseFeature,
}: PaymentSuccessModalProps) {
  if (!isOpen) return null;

  const planName = getTournamentPlanName(plan);

  const getAvailableFeatures = () => {
    if (plan === "basic") {
      return [
        { icon: Download, label: "선수 명단 엑셀 다운로드", feature: "excel" as const },
        { icon: Bell, label: "미제출 팀 자동 알림", feature: "notification" as const },
      ];
    }
    if (plan === "pro") {
      return [
        { icon: Download, label: "선수 명단 엑셀 다운로드", feature: "excel" as const },
        { icon: Bell, label: "미제출 팀 자동 알림", feature: "notification" as const },
        { icon: CheckCircle, label: "참가비 결제 연동", feature: undefined },
        { icon: CheckCircle, label: "현장 체크인 (QR)", feature: undefined },
      ];
    }
    return [];
  };

  const features = getAvailableFeatures();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            ✅ {planName} 플랜이 활성화되었습니다.
          </h2>
          <p className="text-sm text-gray-600">
            이제 아래 기능을 사용할 수 있습니다.
          </p>
        </div>

        <div className="space-y-3 mb-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
              >
                <Icon className="w-5 h-5 text-blue-600" />
                <span className="text-sm text-gray-700 flex-1">{feature.label}</span>
                {feature.feature && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      onUseFeature?.(feature.feature!);
                      onClose();
                    }}
                  >
                    사용하기
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        <Button
          onClick={onClose}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        >
          확인
        </Button>
      </div>
    </div>
  );
}
