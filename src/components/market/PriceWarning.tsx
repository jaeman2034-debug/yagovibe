/**
 * 🔥 가격 경고 컴포넌트 (프로덕션 배포 패키지)
 * 
 * 역할:
 * - 가격 이상 탐지 시 경고 UI 표시
 * - 검수 대기 안내
 */

import { AlertTriangle } from "lucide-react";

interface PriceWarningProps {
  priceAnomaly?: boolean;
  priceAnomalyReason?: string;
  priceAnomalyDeviation?: number;
}

export default function PriceWarning({
  priceAnomaly = false,
  priceAnomalyReason,
  priceAnomalyDeviation,
}: PriceWarningProps) {
  if (!priceAnomaly) return null;

  const getWarningMessage = () => {
    if (priceAnomalyReason?.includes("고가")) {
      return "등록하신 가격이 시장 평균보다 높습니다. 검수 대기 중입니다.";
    } else if (priceAnomalyReason?.includes("저가")) {
      return "등록하신 가격이 시장 평균보다 낮습니다. 검수 대기 중입니다.";
    } else if (priceAnomalyReason?.includes("가이드")) {
      return "등록하신 가격이 추천 가격 가이드를 벗어났습니다. 검수 대기 중입니다.";
    }
    return "등록하신 가격이 시장 평균과 다릅니다. 검수 대기 중입니다.";
  };

  return (
    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
      <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm font-medium text-yellow-800">
          ⚠️ 가격 이상 탐지
        </p>
        <p className="text-xs text-yellow-600 mt-1">
          {getWarningMessage()}
        </p>
        {priceAnomalyDeviation && (
          <p className="text-xs text-yellow-500 mt-1">
            편차: {((priceAnomalyDeviation * 100).toFixed(1))}%
          </p>
        )}
      </div>
    </div>
  );
}
