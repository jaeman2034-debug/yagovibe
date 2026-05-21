/**
 * 🔥 참가비 요약 카드 컴포넌트
 * 
 * "왜 300,000원인지" 한눈에 보이는 실시간 요약
 * 사용자 제시 패턴 적용: 계산식 그대로 노출
 */

import { Calculator, Info } from "lucide-react";
import type { FeePolicy } from "@/components/notice/FeeSummaryBox";
import { calcEntryFee } from "@/lib/notice/feeCalc";

interface FeeSummaryCardProps {
  teamCount: number;
  feePolicy: FeePolicy;
  className?: string;
}

export function FeeSummaryCard({
  teamCount,
  feePolicy,
  className = "",
}: FeeSummaryCardProps) {
  const validTeamCount = Math.max(1, teamCount);
  
  // 참가비 계산 (feePolicy 기반)
  const feeCalc = calcEntryFee(validTeamCount, feePolicy);

  return (
    <div
      className={`p-5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200 shadow-md space-y-3 ${className}`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-blue-600" />
          <h4 className="text-base font-bold text-gray-900">참가비 요약</h4>
        </div>
        <span className="text-xs text-gray-500">팀 수에 따라 자동 계산</span>
      </div>

      {/* 계산 과정 (명확하게 - 사용자 제시 패턴) */}
      <div className="bg-white rounded-lg p-4 border border-blue-100 space-y-3">
        {/* 기본 참가비 */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">
            기본 참가비 (1~{feePolicy.baseTeamCount}팀)
          </span>
          <span className="font-semibold text-gray-900">
            {feePolicy.baseFee.toLocaleString()}원
          </span>
        </div>

        {/* 추가 참가비 (계산식 그대로 노출) */}
        {feeCalc.extraTeams > 0 && (
          <>
            <div className="h-px bg-gray-200" />
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">
                추가 참가비 ({feeCalc.extraTeams}팀 × {feePolicy.extraFeePerTeam.toLocaleString()}원)
              </span>
              <span className="font-semibold text-blue-700">
                +{feeCalc.extraFee.toLocaleString()}원
              </span>
            </div>
          </>
        )}

        {/* 구분선 */}
        <div className="h-px bg-blue-300 my-1" />

        {/* 총액 (강조) */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-base font-bold text-gray-900">총 참가비</span>
          <span className="text-2xl font-bold text-blue-600">
            {feeCalc.total.toLocaleString()}원
          </span>
        </div>
      </div>

      {/* 참가비 정책 안내 (간소화) */}
      {feeCalc.extraTeams > 0 && (
        <div className="flex items-start gap-2 text-xs text-gray-600 bg-white/50 rounded p-2">
          <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
          <p className="text-gray-700">
            {feePolicy.baseTeamCount + 1}팀부터 팀당 {feePolicy.extraFeePerTeam.toLocaleString()}원이 추가됩니다.
          </p>
        </div>
      )}
    </div>
  );
}
