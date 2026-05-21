/**
 * 🔥 Region Select Bottom Sheet - 지역 선택 바텀시트
 * 
 * Stage 0: 진입 (3초)
 */

import { useState, useEffect } from "react";
import type { Region } from "../domain/region.types";
import { REGION_LABELS, getDefaultRegion } from "../domain/region.types";
import { requestLocationAndDetectRegion } from "../domain/region.detector";

interface RegionSelectBottomSheetProps {
  detectedRegion?: Region;
  onSelect: (region: Region) => void;
  onSkip: () => void;
}

export function RegionSelectBottomSheet({
  detectedRegion,
  onSelect,
  onSkip,
}: RegionSelectBottomSheetProps) {
  const [detecting, setDetecting] = useState(!detectedRegion);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!detectedRegion) {
      (async () => {
        setDetecting(true);
        const result = await requestLocationAndDetectRegion();
        setDetecting(false);
        
        if (result.success && result.region) {
          // 자동 선택은 하지 않고, 추천만 표시
        } else {
          setError(result.error || "위치를 감지할 수 없습니다");
        }
      })();
    }
  }, [detectedRegion]);

  const recommendedRegion = detectedRegion || getDefaultRegion();

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="w-full bg-white rounded-t-2xl p-6 pb-safe">
        <h2 className="text-xl font-bold mb-2">지역 선택</h2>
        <p className="text-gray-600 mb-6">
          {detecting
            ? "위치를 감지하는 중..."
            : error
            ? error
            : `${REGION_LABELS[recommendedRegion]}에서 시작할까요?`}
        </p>

        {/* 추천 지역 */}
        {recommendedRegion && !detecting && (
          <button
            onClick={() => onSelect(recommendedRegion)}
            className="w-full bg-emerald-600 text-white py-3 rounded-xl font-medium mb-3"
          >
            {REGION_LABELS[recommendedRegion]}에서 시작
          </button>
        )}

        {/* 다른 지역 선택 */}
        <details className="mb-3">
          <summary className="text-gray-700 cursor-pointer py-2">
            다른 지역 선택
          </summary>
          <div className="mt-2 space-y-2">
            {Object.entries(REGION_LABELS).map(([code, name]) => (
              <button
                key={code}
                onClick={() => onSelect(code as Region)}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded-lg"
              >
                {name}
              </button>
            ))}
          </div>
        </details>

        {/* 나중에 선택 */}
        <button
          onClick={onSkip}
          className="w-full text-gray-500 py-2 text-sm"
        >
          나중에 선택
        </button>
      </div>
    </div>
  );
}
