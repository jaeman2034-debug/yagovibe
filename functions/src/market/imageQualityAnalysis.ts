/**
 * 🔥 이미지 품질 분석 Cloud Function (프로덕션 배포 패키지)
 * 
 * 역할:
 * - 흐림 감지
 * - 어두움 감지
 * - 사물 인식
 * - 배경 과다 감지
 * - 품질 스코어 계산
 */

import { onCall } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import { HttpsError } from "firebase-functions/v2/https";
import { getStorage } from "firebase-admin/storage";
import { getDownloadURL } from "firebase-admin/storage";

/**
 * 이미지 품질 분석 결과
 */
interface QualityAnalysis {
  score: number; // 0 ~ 100
  blur: number; // 0 ~ 1 (높을수록 흐림)
  brightness: number; // 0 ~ 1 (낮을수록 어두움)
  hasObject: boolean; // 사물 인식 여부
  backgroundRatio: number; // 0 ~ 1 (배경 비율)
  warnings: string[]; // 경고 메시지
  suggestions: string[]; // 개선 제안
}

/**
 * 이미지 품질 분석 (간단한 휴리스틱 기반)
 * 
 * 실제 프로덕션에서는 Vision API나 ML 모델 사용 권장
 */
async function analyzeImageQualityInternal(imageUrl: string): Promise<QualityAnalysis> {
  // 🔥 실제 구현은 Vision API 또는 ML 모델 사용
  // 여기서는 기본 휴리스틱만 제공

  const warnings: string[] = [];
  const suggestions: string[] = [];
  let score = 100;

  // 🔥 TODO: 실제 이미지 분석 로직
  // - Vision API로 흐림/어두움/사물 인식
  // - 배경 비율 계산
  // - 품질 스코어 계산

  // 🔥 임시: 기본값 반환 (실제 구현 필요)
  const blur = 0.3; // 예시 값
  const brightness = 0.7; // 예시 값
  const hasObject = true; // 예시 값
  const backgroundRatio = 0.4; // 예시 값

  // 🔥 흐림 체크
  if (blur > 0.6) {
    score -= 30;
    warnings.push("사진이 흐려요");
    suggestions.push("카메라를 고정하고 촬영해주세요");
  } else if (blur > 0.4) {
    score -= 15;
    warnings.push("사진이 약간 흐려요");
  }

  // 🔥 어두움 체크
  if (brightness < 0.3) {
    score -= 25;
    warnings.push("사진이 너무 어두워요");
    suggestions.push("밝은 곳에서 촬영해주세요");
  } else if (brightness < 0.5) {
    score -= 10;
    warnings.push("사진이 약간 어두워요");
  }

  // 🔥 사물 인식 체크
  if (!hasObject) {
    score -= 20;
    warnings.push("상품이 잘 안 보여요");
    suggestions.push("상품을 중앙에 배치해주세요");
  }

  // 🔥 배경 과다 체크
  if (backgroundRatio > 0.7) {
    score -= 15;
    warnings.push("배경이 너무 많아요");
    suggestions.push("상품에 집중해서 촬영해주세요");
  }

  return {
    score: Math.max(0, score),
    blur,
    brightness,
    hasObject,
    backgroundRatio,
    warnings,
    suggestions,
  };
}

/**
 * 이미지 품질 분석 Cloud Function
 * 
 * 호출 예시:
 * ```ts
 * const analyzeImage = httpsCallable(functions, 'analyzeImageQuality');
 * const result = await analyzeImage({ imageUrl: 'https://...' });
 * ```
 */
export const analyzeImageQuality = onCall(
  {
    region: "asia-northeast3",
    cors: true,
  },
  async (request) => {
    const { imageUrl } = request.data;

    if (!imageUrl || typeof imageUrl !== "string") {
      throw new HttpsError(
        "invalid-argument",
        "imageUrl이 필요합니다."
      );
    }

    try {
      logger.info("[analyzeImageQuality] 분석 시작:", { imageUrl });

      const analysis = await analyzeImageQualityInternal(imageUrl);

      logger.info("[analyzeImageQuality] 분석 완료:", {
        imageUrl,
        score: analysis.score,
        warnings: analysis.warnings.length,
      });

      return {
        success: true,
        analysis,
      };
    } catch (error: any) {
      logger.error("[analyzeImageQuality] 분석 실패:", {
        imageUrl,
        error: error.message,
        stack: error.stack,
      });

      throw new HttpsError(
        "internal",
        "이미지 분석 중 오류가 발생했습니다.",
        { originalError: error.message }
      );
    }
  }
);
