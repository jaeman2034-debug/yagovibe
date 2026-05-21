/**
 * 🔥 참가비 요약 박스
 * 공지 상단에 참가비 기준을 명확히 표시
 * → 모든 자동화(계산/AI/FAQ)의 Single Source of Truth
 */

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Coins } from "lucide-react";

export type FeePolicy = {
  baseFee: number; // 기본 참가비
  baseTeamCount: number; // 기본 포함 팀 수 (1~baseTeamCount)
  extraFeePerTeam: number; // 추가 팀당 금액
};

interface FeeSummaryBoxProps {
  feePolicy: FeePolicy;
}

/**
 * 참가비 요약 박스 컴포넌트
 */
export function FeeSummaryBox({ feePolicy }: FeeSummaryBoxProps) {
  return (
    <Card className="border-blue-200 bg-blue-50/50">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Coins className="w-4 h-4 text-blue-600" />
          <div className="font-semibold text-blue-900">💰 참가비 안내</div>
        </div>
        <div className="text-sm text-gray-700 space-y-1">
          <div>
            기본 참가비:{" "}
            <span className="font-medium">
              {feePolicy.baseFee.toLocaleString()}원
            </span>{" "}
            <span className="text-gray-600">
              (1~{feePolicy.baseTeamCount}팀 기준)
            </span>
          </div>
          <div>
            추가 참가비:{" "}
            <span className="font-medium">
              1팀당 {feePolicy.extraFeePerTeam.toLocaleString()}원
            </span>
          </div>
        </div>
        <div className="pt-2 border-t border-blue-200">
          <Badge variant="outline" className="text-xs text-blue-700">
            ※ 동일 단체에서 {feePolicy.baseTeamCount + 1}팀 이상 참가 시 추가
            참가비가 발생합니다.
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

