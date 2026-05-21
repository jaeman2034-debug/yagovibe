/**
 * 🔥 참가비 자동 계산기
 * 공지 하단에 배치: 팀 수 입력 → 즉시 총 참가비 계산
 */

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Calculator } from "lucide-react";
import type { FeePolicy } from "./FeeSummaryBox";
import { calcEntryFee, formatFeeCalculation } from "@/lib/notice/feeCalc";

interface FeeCalculatorProps {
  feePolicy: FeePolicy;
}

/**
 * 참가비 자동 계산기 컴포넌트
 */
export function FeeCalculator({ feePolicy }: FeeCalculatorProps) {
  const [teamCount, setTeamCount] = useState(1);

  // 최소값 보장
  const validTeamCount = Math.max(1, teamCount);
  const result = calcEntryFee(validTeamCount, feePolicy);

  return (
    <Card className="border-green-200 bg-green-50/50">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-green-600" />
          <div className="font-semibold text-green-900">
            🧮 참가비 자동 계산
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-700">참가 팀 수</span>
          <Input
            type="number"
            min={1}
            value={teamCount}
            onChange={(e) => {
              const value = Number(e.target.value);
              setTeamCount(isNaN(value) || value < 1 ? 1 : value);
            }}
            className="w-20"
          />
          <span className="text-sm text-gray-700">팀</span>
        </div>

        <div className="text-sm text-gray-700 space-y-1 pt-2 border-t border-green-200">
          <div className="font-medium text-green-900">
            {formatFeeCalculation(validTeamCount, result, feePolicy)}
          </div>
          {result.extraTeams > 0 && (
            <div className="text-xs text-gray-600">
              ※ 기본 {feePolicy.baseTeamCount}팀 포함, 추가{" "}
              {result.extraTeams}팀에 대한 추가 참가비가 포함되었습니다.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

