/**
 * 🔥 이미지 기반 제목/카테고리 추천 훅 (프로덕션 배포 패키지)
 * 
 * 역할:
 * - 이미지 업로드 시 자동 추천
 * - 제목/카테고리/가격 가이드 제공
 */

import { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import type { ImagePipelineResult } from "@/utils/imagePipeline";

interface ImageRecommendation {
  title?: string;
  category?: "equipment" | "recruit" | "match";
  suggestedPrice?: { min: number; max: number; recommended: number };
  tags?: string[];
  confidence: number;
  detectedObjects?: string[];
}

/**
 * 이미지 기반 추천 훅
 */
export function useImageRecommendation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 이미지 기반 추천 (품질 분석 결과 포함)
   */
  const recommend = async (
    imageUrl: string,
    quality?: { score: number; detectedObjects?: string[] }
  ): Promise<ImageRecommendation | null> => {
    setLoading(true);
    setError(null);

    try {
      // 🔥 새로운 AI 추천 엔진 사용
      const suggestFromImage = httpsCallable(functions, "suggestFromImage");
      const result = await suggestFromImage({ imageUrl, quality });
      const data = result.data as { success: boolean; suggestion: ImageRecommendation };

      if (data.success && data.suggestion) {
        return data.suggestion;
      }

      return null;
    } catch (err: any) {
      console.error("❌ [useImageRecommendation] 추천 실패:", err);
      setError(err.message || "추천 중 오류가 발생했습니다.");
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { recommend, loading, error };
}
