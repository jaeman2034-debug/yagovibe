// src/domain/report/types.ts
// 🔥 리포트 도메인 타입 정의

/**
 * 리포트 포맷
 */
export type ReportFormat = "PDF" | "CSV";

/**
 * 월간 리포트 산출물
 * 
 * 🔥 멱등성 보장:
 * - teamId + yyyyMM + format = 유니크 키
 * - 같은 키로 두 번 요청되면 이미 존재하면 그대로 반환
 */
export interface MonthlyReportArtifact {
  id: string;
  teamId: string;
  yyyyMM: string;              // "2025-01"
  format: ReportFormat;
  
  // 스토리지 정보
  storageKey: string;          // S3/Cloud Storage key
  url?: string;                 // presigned URL (단기, 7일)
  publicUrl?: string;           // 공개 URL (선택)
  
  // 메타데이터
  size?: number;                // 파일 크기 (bytes)
  mimeType?: string;           // "application/pdf" | "text/csv"
  createdAt: Date;
  expiresAt?: Date;             // presigned URL 만료 시각
}

/**
 * 리포트 생성 파라미터
 */
export interface GenerateReportParams {
  teamId: string;
  yyyyMM: string;
  format: ReportFormat;
  forceRegenerate?: boolean;   // 기존 파일 강제 재생성
}

/**
 * 리포트 생성 결과
 */
export interface GenerateReportResult {
  artifact: MonthlyReportArtifact;
  isNew: boolean;               // 새로 생성됐는지 여부
}

