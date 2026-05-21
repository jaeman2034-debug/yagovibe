/**
 * 🔥 Media 타입 정의
 * 
 * 역할:
 * - 경기 사진/영상
 * - 팀 사진
 * - 이벤트 갤러리
 */

import { Timestamp } from "firebase/firestore";

export type MediaType = "photo" | "video";
export type MediaEntityType = "match" | "team" | "event" | "player";

export interface Media {
  id: string;
  
  // 미디어 타입
  type: MediaType;
  
  // 연결된 엔티티
  entityType: MediaEntityType;
  entityId: string;

  /** Firestore 규칙용: team 미디어 공개 범위 (없으면 레거시로 공개 팀 허브 조회 허용) */
  visibility?: "public" | "team" | "private";

  // 파일 정보
  url: string; // 원본 파일 URL
  thumbnailUrl?: string; // 썸네일 URL (photo만)
  fileName: string;
  fileSize: number; // bytes
  mimeType: string;
  
  // 메타데이터
  title?: string;
  description?: string;
  tags?: string[];
  
  // 업로드 정보
  uploadedBy: string; // userId
  uploadedByName?: string;
  
  // 상태
  status: "processing" | "ready" | "error";
  
  // 비디오 전용
  duration?: number; // seconds (video만)
  
  // 통계
  viewCount?: number;
  likeCount?: number;
  
  // 타임스탬프
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export interface MediaUploadProgress {
  fileName: string;
  progress: number; // 0-100
  status: "uploading" | "processing" | "complete" | "error";
  error?: string;
}
