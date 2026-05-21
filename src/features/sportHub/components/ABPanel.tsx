/**
 * 🔥 AB Panel - AB 실험 패널
 * 
 * variant CTR, 표본수, 승자 자동 추천, 강제 전환
 */

import { useState } from "react";
import type { ABExperimentStatus } from "../domain/dashboard.types";
import { endABExperiment } from "../data/dashboard.api";

interface ABPanelProps {
  experiments: ABExperimentStatus[];
  onUpdate?: () => void;
}

export function ABPanel({ experiments, onUpdate }: ABPanelProps) {
  const [endingExperiment, setEndingExperiment] = useState<string | null>(null);

  const handleEndExperiment = async (experimentKey: string, winner: "A" | "B") => {
    try {
      setEndingExperiment(experimentKey);
      await endABExperiment(experimentKey, winner);
      onUpdate?.();
    } catch (error) {
      console.error("AB 실험 종료 실패:", error);
    } finally {
      setEndingExperiment(null);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">AB 실험 현황</h3>
      
      {experiments.length === 0 ? (
        <p className="text-sm text-gray-500">진행 중인 실험이 없습니다</p>
      ) : (
        experiments.map((exp) => (
          <div
            key={exp.experimentKey}
            className="bg-white rounded-lg p-4 border border-gray-200"
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium">{exp.experimentKey}</h4>
              {exp.winner && (
                <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
                  승자: {exp.winner}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-3">
              {/* Variant A */}
              <div className="border rounded p-3">
                <div className="text-xs text-gray-600 mb-1">Variant A</div>
                <div className="text-lg font-bold">{exp.variantA.ctr.toFixed(2)}%</div>
                <div className="text-xs text-gray-500">
                  {exp.variantA.impressions} 노출, {exp.variantA.clicks} 클릭
                </div>
              </div>

              {/* Variant B */}
              <div className="border rounded p-3">
                <div className="text-xs text-gray-600 mb-1">Variant B</div>
                <div className="text-lg font-bold">{exp.variantB.ctr.toFixed(2)}%</div>
                <div className="text-xs text-gray-500">
                  {exp.variantB.impressions} 노출, {exp.variantB.clicks} 클릭
                </div>
              </div>
            </div>

            <div className="text-xs text-gray-600 mb-3">
              표본수: {exp.sampleSize} | 신뢰도: {exp.confidence.toFixed(1)}%
            </div>

            {exp.winner === "tie" || !exp.winner ? (
              <div className="text-xs text-yellow-600 mb-2">
                아직 승자를 결정할 수 없습니다 (표본 부족 또는 차이 없음)
              </div>
            ) : (
              <div className="text-xs text-green-600 mb-2">
                승자 추천: {exp.winner} (CTR {exp.winner === "A" ? exp.variantA.ctr : exp.variantB.ctr}%)
              </div>
            )}

            {/* 강제 전환 버튼 */}
            <div className="flex gap-2">
              <button
                onClick={() => handleEndExperiment(exp.experimentKey, "A")}
                disabled={endingExperiment === exp.experimentKey}
                className="flex-1 px-3 py-2 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50"
              >
                A로 전환
              </button>
              <button
                onClick={() => handleEndExperiment(exp.experimentKey, "B")}
                disabled={endingExperiment === exp.experimentKey}
                className="flex-1 px-3 py-2 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50"
              >
                B로 전환
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
