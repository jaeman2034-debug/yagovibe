// src/utils/storageService.ts
// 🔥 스토리지 서비스: 리포트 파일 저장 및 Presigned URL 생성
//
// 🎯 핵심 원칙:
// - 스토리지는 무조건 Private
// - 공유는 Presigned URL (단기 만료) 또는 앱 게이트웨이
// - 키 규칙: PII 금지, 팀/기간/버전/포맷 중심

import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import type { UploadResult } from "firebase/storage";

/**
 * 스토리지 키 규칙
 * 
 * 형식: reports/team_{teamId}/monthly/{yyyyMM}/monthly_report_v{version}.{format}
 * 
 * 예시:
 * - reports/team_abc123/monthly/2025-01/monthly_report_v1.pdf
 * - reports/team_abc123/monthly/2025-01/monthly_report_v1.csv
 */
export interface StorageKeyParams {
  teamId: string;
  yyyyMM: string;
  format: "PDF" | "CSV";
  templateVersion?: string;
}

/**
 * 스토리지 키 생성
 * 
 * @param params 키 파라미터
 * @returns 스토리지 키
 */
export function generateStorageKey(params: StorageKeyParams): string {
  const { teamId, yyyyMM, format, templateVersion = "v1" } = params;
  const extension = format.toLowerCase();
  return `reports/team_${teamId}/monthly/${yyyyMM}/monthly_report_${templateVersion}.${extension}`;
}

/**
 * 파일 업로드
 * 
 * @param key 스토리지 키
 * @param fileBuffer 파일 버퍼
 * @param mimeType MIME 타입
 * @param cacheControl 캐시 제어 (기본: 1년)
 * @returns 업로드 결과
 */
export async function uploadReportFile(
  key: string,
  fileBuffer: ArrayBuffer,
  mimeType: string,
  cacheControl: string = "public, max-age=31536000"
): Promise<UploadResult> {
  const storage = getStorage();
  const storageRef = ref(storage, key);

  await uploadBytes(storageRef, fileBuffer, {
    contentType: mimeType,
    cacheControl,
  });

  return {
    ref: storageRef,
    metadata: {
      fullPath: key,
      name: key.split("/").pop() || "",
      contentType: mimeType,
    },
  };
}

/**
 * Presigned URL 생성
 * 
 * @param key 스토리지 키
 * @param expiresIn 만료 시간 (초, 기본: 1시간)
 * @returns Presigned URL
 */
export async function generatePresignedURL(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  const storage = getStorage();
  const storageRef = ref(storage, key);

  // Firebase Storage는 getDownloadURL로 공개 URL 생성
  // 실제 Presigned URL은 Cloud Functions에서 생성해야 함
  const url = await getDownloadURL(storageRef);

  // TODO: Cloud Functions에서 실제 Presigned URL 생성
  // const functions = getFunctions();
  // const generatePresignedURL = httpsCallable(functions, 'generatePresignedURL');
  // const result = await generatePresignedURL({ key, expiresIn });
  // return result.data.url;

  return url;
}

/**
 * 파일 다운로드 URL 생성 (프록시 엔드포인트용)
 * 
 * @param artifactId Artifact ID
 * @returns 다운로드 URL
 */
export function generateDownloadURL(artifactId: string): string {
  // 앱 내부 다운로드 엔드포인트
  return `/api/reports/${artifactId}/download`;
}

