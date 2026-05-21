/**
 * 🔥 이미지 파이프라인 통합 함수 (프로덕션 배포 패키지)
 * 
 * 역할:
 * - 원본 → 압축 → 업로드 → 품질분석 → 태깅
 * - 전체 프로세스 자동화
 */

import { compressImage, generateThumbnail, getImageMetadata } from "./imageCompression";
import { uploadMarketImage } from "@/lib/uploadImage";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

/**
 * 이미지 파이프라인 결과
 */
export interface ImagePipelineResult {
  originalUrl: string; // 원본 이미지 URL
  thumbnailUrl?: string; // 썸네일 URL (선택)
  quality: {
    score: number;
    warnings: string[];
    suggestions: string[];
  };
  metadata: {
    width: number;
    height: number;
    size: number;
    compressedSize: number;
    compressionRatio: number;
  };
}

/**
 * 이미지 파이프라인 실행
 * 
 * @param file - 원본 이미지 파일
 * @param userId - 사용자 ID
 * @param options - 파이프라인 옵션
 * @returns 파이프라인 결과
 */
export async function processImagePipeline(
  file: File,
  userId: string,
  options: {
    generateThumbnail?: boolean;
    analyzeQuality?: boolean;
  } = {}
): Promise<ImagePipelineResult> {
  // 🔥 임시 패치: 품질 분석 기본값을 false로 변경 (업로드 우선 보장)
  const { generateThumbnail: shouldGenerateThumbnail = true, analyzeQuality = false } = options;

  // 🔥 1. 메타데이터 추출
  const metadata = await getImageMetadata(file);

  // 🔥 2. 이미지 압축
  const compressedBlob = await compressImage(file);
  const compressedFile = new File([compressedBlob], file.name, {
    type: compressedBlob.type,
    lastModified: Date.now(),
  });

  // 🔥 3. 원본 업로드 (압축된 버전)
  const originalUrl = await uploadMarketImage(compressedFile, userId);

  // 🔥 4. 썸네일 생성 및 업로드 (선택)
  let thumbnailUrl: string | undefined;
  if (shouldGenerateThumbnail) {
    try {
      const thumbnailBlob = await generateThumbnail(file);
      const thumbnailFile = new File([thumbnailBlob], `thumb_${file.name}`, {
        type: thumbnailBlob.type,
        lastModified: Date.now(),
      });
      thumbnailUrl = await uploadMarketImage(thumbnailFile, userId);
    } catch (error) {
      console.warn("⚠️ 썸네일 생성 실패:", error);
    }
  }

  // 🔥 5. 품질 분석 (선택)
  let quality = {
    score: 100,
    warnings: [] as string[],
    suggestions: [] as string[],
  };

  if (analyzeQuality) {
    // 🔥 품질 분석은 비동기로 실행하되, 타임아웃과 에러 처리를 강화
    try {
      const analyzeImageQuality = httpsCallable(functions, "analyzeImageQuality");
      
      // 🔥 타임아웃 설정 (10초)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("품질 분석 타임아웃")), 10000);
      });
      
      const result = await Promise.race([
        analyzeImageQuality({ imageUrl: originalUrl }),
        timeoutPromise,
      ]) as any;
      
      const data = result.data as { success: boolean; analysis: any };

      if (data.success && data.analysis) {
        quality = {
          score: data.analysis.score || 100,
          warnings: data.analysis.warnings || [],
          suggestions: data.analysis.suggestions || [],
        };
      }
    } catch (error: any) {
      // 🔥 품질 분석 실패는 업로드와 무관하므로 조용히 처리
      // 업로드는 이미 성공했으므로 사용자에게 에러를 표시하지 않음
      console.log("ℹ️ 품질 분석 건너뜀 (업로드는 성공):", error?.code || error?.message || "알 수 없는 오류");
      // 실패해도 계속 진행 (기본값 100점 사용)
    }
  }

  return {
    originalUrl,
    thumbnailUrl,
    quality,
    metadata: {
      ...metadata,
      compressedSize: compressedBlob.size,
      compressionRatio: (1 - compressedBlob.size / file.size) * 100,
    },
  };
}

/**
 * 여러 이미지 일괄 처리
 */
export async function processMultipleImages(
  files: File[],
  userId: string,
  options?: {
    generateThumbnail?: boolean;
    analyzeQuality?: boolean;
  }
): Promise<ImagePipelineResult[]> {
  const results = await Promise.all(
    files.map((file) => processImagePipeline(file, userId, options))
  );

  return results;
}
